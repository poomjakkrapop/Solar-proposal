-- Version reconciled with the authoritative hosted migration history.
-- Additive V2 storage only. Never alters the legacy application tables or auth configuration.
create table public.sd_v2_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  owner_id uuid not null references auth.users(id),
  document jsonb not null check (
    coalesce(jsonb_typeof(document) = 'object' and
    jsonb_typeof(document->'proposals') = 'array' and
    jsonb_typeof(document->'customers') = 'array' and
    jsonb_typeof(document->'company') = 'object' and
    octet_length(document::text) <= 4194304, false)
  ),
  schema_version integer not null default 2 check (schema_version = 2),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sd_v2_workspaces_owner_idx on public.sd_v2_workspaces(owner_id);
create table public.sd_v2_members (
  workspace_id uuid not null references public.sd_v2_workspaces(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('owner','editor','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(workspace_id,user_id)
);
create index sd_v2_members_user_idx on public.sd_v2_members(user_id,workspace_id) where active;
create table public.sd_v2_audit (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.sd_v2_workspaces(id),
  actor_id uuid not null references auth.users(id),
  event text not null check (event in ('created','saved','invited','joined','role_changed')),
  revision integer not null,
  created_at timestamptz not null default now()
);
create index sd_v2_audit_workspace_idx on public.sd_v2_audit(workspace_id,created_at desc);
create table public.sd_v2_invites (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  workspace_id uuid not null references public.sd_v2_workspaces(id),
  email text not null check (length(email) between 3 and 254),
  role text not null check (role in ('editor','viewer')),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz
);
create index sd_v2_invites_workspace_idx on public.sd_v2_invites(workspace_id);
alter table public.sd_v2_workspaces enable row level security;
alter table public.sd_v2_members enable row level security;
alter table public.sd_v2_audit enable row level security;
alter table public.sd_v2_invites enable row level security;
revoke all on public.sd_v2_workspaces,public.sd_v2_members,public.sd_v2_audit,public.sd_v2_invites from public,anon,authenticated;
grant select on public.sd_v2_workspaces,public.sd_v2_members,public.sd_v2_audit to authenticated;
grant select,insert,update on public.sd_v2_workspaces,public.sd_v2_members,public.sd_v2_invites to service_role;
grant select,insert on public.sd_v2_audit to service_role;
grant usage,select on sequence public.sd_v2_audit_id_seq to service_role;
create policy sd_v2_own_membership on public.sd_v2_members for select to authenticated
  using (user_id = (select auth.uid()) and active);
create policy sd_v2_workspace_read on public.sd_v2_workspaces for select to authenticated
  using (id in (select workspace_id from public.sd_v2_members where user_id = (select auth.uid()) and active));
create policy sd_v2_audit_read on public.sd_v2_audit for select to authenticated
  using (workspace_id in (select workspace_id from public.sd_v2_members where user_id = (select auth.uid()) and active));

-- All mutations are service-role-only RPCs. The server verifies getUser() and validates
-- complete business data before calling them; the DB independently checks membership.
-- SECURITY INVOKER deliberately avoids a public SECURITY DEFINER surface.
create function public.sd_v2_create_workspace(p_actor uuid,p_name text,p_document jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare result uuid;
begin
  if p_actor is null or length(trim(p_name)) not between 1 and 200 then raise exception 'invalid request' using errcode='22023'; end if;
  if (select count(*) from public.sd_v2_workspaces where owner_id=p_actor) >= 5 then raise exception 'workspace limit' using errcode='22023'; end if;
  insert into public.sd_v2_workspaces(name,owner_id,document) values(trim(p_name),p_actor,p_document) returning id into result;
  insert into public.sd_v2_members(workspace_id,user_id,role) values(result,p_actor,'owner');
  insert into public.sd_v2_audit(workspace_id,actor_id,event,revision) values(result,p_actor,'created',1);
  return result;
end $$;
create function public.sd_v2_save_workspace(p_actor uuid,p_id uuid,p_revision integer,p_document jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare current_revision integer;
begin
  select revision into current_revision from public.sd_v2_workspaces where id=p_id for update;
  if not found or not exists(select 1 from public.sd_v2_members where workspace_id=p_id and user_id=p_actor and active and role in ('owner','editor')) then
    raise exception 'not permitted' using errcode='42501';
  end if;
  if current_revision is distinct from p_revision then raise exception 'revision conflict' using errcode='40001'; end if;
  update public.sd_v2_workspaces set document=p_document,revision=revision+1,updated_at=now() where id=p_id returning revision into current_revision;
  insert into public.sd_v2_audit(workspace_id,actor_id,event,revision) values(p_id,p_actor,'saved',current_revision);
  return current_revision;
end $$;
create function public.sd_v2_invite(p_actor uuid,p_id uuid,p_email text,p_role text,p_token_hash text)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_revision integer;
begin
  select revision into current_revision from public.sd_v2_workspaces where id=p_id and owner_id=p_actor for update;
  if not found then raise exception 'not permitted' using errcode='42501'; end if;
  if p_role not in ('editor','viewer') or length(p_email) not between 3 and 254 then raise exception 'invalid invite' using errcode='22023'; end if;
  insert into public.sd_v2_invites(token_hash,workspace_id,email,role,created_by) values(p_token_hash,p_id,lower(trim(p_email)),p_role,p_actor);
  insert into public.sd_v2_audit(workspace_id,actor_id,event,revision) values(p_id,p_actor,'invited',current_revision);
end $$;
create function public.sd_v2_accept_invite(p_actor uuid,p_email text,p_token_hash text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare invitation public.sd_v2_invites; current_revision integer;
begin
  select * into invitation from public.sd_v2_invites where token_hash=p_token_hash for update;
  if not found or invitation.accepted_at is not null or invitation.expires_at <= now() or invitation.email <> lower(trim(p_email)) then
    raise exception 'invalid invite' using errcode='42501';
  end if;
  select revision into current_revision from public.sd_v2_workspaces where id=invitation.workspace_id for update;
  if exists(select 1 from public.sd_v2_members where workspace_id=invitation.workspace_id and user_id=p_actor) then
    raise exception 'already a member' using errcode='22023';
  end if;
  insert into public.sd_v2_members(workspace_id,user_id,role) values(invitation.workspace_id,p_actor,invitation.role);
  update public.sd_v2_invites set accepted_by=p_actor,accepted_at=now() where token_hash=p_token_hash;
  insert into public.sd_v2_audit(workspace_id,actor_id,event,revision) values(invitation.workspace_id,p_actor,'joined',current_revision);
  return invitation.workspace_id;
end $$;
create function public.sd_v2_set_role(p_actor uuid,p_id uuid,p_user uuid,p_role text,p_active boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_revision integer;
begin
  select revision into current_revision from public.sd_v2_workspaces where id=p_id and owner_id=p_actor for update;
  if not found or p_actor=p_user then raise exception 'not permitted' using errcode='42501'; end if;
  if p_role not in ('editor','viewer') then raise exception 'invalid role' using errcode='22023'; end if;
  update public.sd_v2_members set role=p_role,active=p_active where workspace_id=p_id and user_id=p_user and role <> 'owner';
  if not found then raise exception 'not permitted' using errcode='42501'; end if;
  insert into public.sd_v2_audit(workspace_id,actor_id,event,revision) values(p_id,p_actor,'role_changed',current_revision);
end $$;
revoke all on function public.sd_v2_create_workspace(uuid,text,jsonb),public.sd_v2_save_workspace(uuid,uuid,integer,jsonb),public.sd_v2_invite(uuid,uuid,text,text,text),public.sd_v2_accept_invite(uuid,text,text),public.sd_v2_set_role(uuid,uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.sd_v2_create_workspace(uuid,text,jsonb),public.sd_v2_save_workspace(uuid,uuid,integer,jsonb),public.sd_v2_invite(uuid,uuid,text,text,text),public.sd_v2_accept_invite(uuid,text,text),public.sd_v2_set_role(uuid,uuid,uuid,text,boolean) to service_role;
