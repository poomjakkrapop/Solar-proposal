-- Version reconciled with the authoritative hosted migration history.
-- No client may read invitation hashes; only the authenticated server writer uses them.
-- This explicit deny policy documents the intentional RLS default-deny behaviour.
create policy sd_v2_invites_deny_client on public.sd_v2_invites
  for all to anon,authenticated using (false) with check (false);
