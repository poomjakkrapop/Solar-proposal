-- SolarDesk-only RPC hardening; no legacy tables, records or Auth settings change.
create or replace function public.sd_v2_save_workspace(p_actor uuid,p_id uuid,p_revision integer,p_document jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare current_revision integer; current_document jsonb; member_role text;
begin
  select revision,document into current_revision,current_document
  from public.sd_v2_workspaces where id=p_id for update;
  if not found then raise exception 'not permitted' using errcode='42501'; end if;
  select role into member_role from public.sd_v2_members
  where workspace_id=p_id and user_id=p_actor and active;
  if member_role is null or member_role not in ('owner','editor') then
    raise exception 'not permitted' using errcode='42501';
  end if;
  if current_revision is distinct from p_revision then
    raise exception 'revision conflict' using errcode='40001';
  end if;
  -- Retain the existing table's shape/4 MiB bounds explicitly in this RPC as well.
  -- The original table CHECK remains in place; no constraint or grant is weakened.
  if not coalesce(
    jsonb_typeof(p_document)='object' and
    jsonb_typeof(p_document->'proposals')='array' and
    jsonb_typeof(p_document->'customers')='array' and
    jsonb_typeof(p_document->'company')='object' and
    octet_length(p_document::text) <= 4194304, false) then
    raise exception 'workspace document check constraint' using errcode='23514';
  end if;
  -- Old deployed clients strip fields they do not understand. Never erase a saved catalog.
  if current_document ? 'catalog' and not (p_document ? 'catalog') then
    raise exception 'catalog field required' using errcode='22023';
  end if;
  if member_role <> 'owner' and (p_document->'catalog') is distinct from (current_document->'catalog') then
    raise exception 'catalog owner required' using errcode='42501';
  end if;
  if p_document ? 'catalog' and not coalesce(
    jsonb_typeof(p_document->'catalog')='object' and
    (p_document->'catalog'->>'version')='1' and
    jsonb_typeof(p_document->'catalog'->'packages')='array' and
    jsonb_typeof(p_document->'catalog'->'equipment')='array', false) then
    raise exception 'invalid catalog' using errcode='22023';
  end if;
  update public.sd_v2_workspaces set document=p_document,revision=revision+1,updated_at=now()
  where id=p_id returning revision into current_revision;
  insert into public.sd_v2_audit(workspace_id,actor_id,event,revision) values(p_id,p_actor,'saved',current_revision);
  return current_revision;
end $$;
revoke all on function public.sd_v2_save_workspace(uuid,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.sd_v2_save_workspace(uuid,uuid,integer,jsonb) to service_role;
