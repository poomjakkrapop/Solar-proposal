-- Private sanitized document templates; no customer records or original files.
-- The application checks confirmed identity and active SolarDesk membership
-- before using its SELECT-only server client. Direct Data API access is denied.
create table public.sd_v2_document_templates (
  id text not null check (id ~ '^[a-z][a-z-]{0,50}$'),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  content_base64 text not null check (
    length(content_base64) between 4 and 13981016
    and content_base64 ~ '^[A-Za-z0-9+/]+={0,2}$'
    and octet_length(decode(content_base64, 'base64')) between 1 and 10485760
  ),
  created_at timestamptz not null default now(),
  primary key (id, sha256),
  constraint sd_v2_document_template_digest check (
    sha256 = encode(sha256(decode(content_base64, 'base64')), 'hex')
  )
);
alter table public.sd_v2_document_templates enable row level security;
alter table public.sd_v2_document_templates force row level security;
revoke all on table public.sd_v2_document_templates from public, anon, authenticated, service_role;
grant select on table public.sd_v2_document_templates to service_role;
comment on table public.sd_v2_document_templates is 'Sanitized reusable SolarDesk templates. Server SELECT after verified identity and membership only; no public policies.';
