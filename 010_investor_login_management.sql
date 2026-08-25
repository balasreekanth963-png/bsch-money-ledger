-- ============================================================================
-- SODHARA INVESTMENTS — Investor Login / Temporary Password Management
--
-- Adds exactly one column. No new tables, no duplicate investor/auth
-- tables — this reuses the existing profiles <-> Supabase Auth link
-- (profiles.auth_user_id) that investors/route.ts already relies on.
--
-- No password of any kind is stored here or anywhere else. Passwords
-- live only inside Supabase Auth, managed via the Admin API from
-- server-side route handlers (see app/api/investors/[id]/manage-login
-- and app/api/account/complete-password-change).
--
-- No RLS policy changes are required:
--   - Reads: profiles already has a "select own row" policy (the app
--     already depends on this for every dashboard page load). Adding a
--     column doesn't need a new policy — Postgres RLS is per-row, not
--     per-column.
--   - Writes: this column is only ever written from server routes using
--     the service-role admin client (see lib/supabase/admin.ts), which
--     bypasses RLS entirely. Regular investor/admin sessions never write
--     it directly.
-- ============================================================================

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

comment on column public.profiles.must_change_password is
  'True right after an admin generates/resets a temporary password, or forces a change. Investor is gated to /dashboard/change-password until they set a new password themselves. Never store the password itself here or anywhere else.';
