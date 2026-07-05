-- ============================================================
-- RefEval DEV seed data
-- ============================================================
-- FOR DEV ONLY — never run against production (rydjxihdukoretyqqfue).
--
-- PURPOSE
--   Provides the minimum data required for login to work in the DEV
--   Supabase project (eydvhyajgoiaursfhyon):
--     - 1 organisation
--     - 1 super_admin user (+ profile + membership)
--     - 1 educator user   (+ profile + membership)
--     - 1 referee user    (+ profile + membership)
--
-- ── BEFORE YOU RUN THIS ───────────────────────────────────────────────────────
--
--   Auth users cannot be created by SQL — they must be created via the
--   Supabase Dashboard first, so their UUIDs exist in auth.users before
--   profiles and organisation_members can reference them.
--
--   1. Go to: Supabase Dashboard → refeval-dev → Authentication → Users
--   2. Click "Add user" → "Create new user" (NOT invite — set password directly)
--   3. Create three users:
--        Email: super@refeval.dev      (any strong test password)
--        Email: educator@refeval.dev   (any strong test password)
--        Email: referee@refeval.dev    (any strong test password)
--   4. After creating each user, copy its UUID from the users list.
--   5. Find and replace the three placeholder UUIDs in this file:
--
--        SUPER_ADMIN_UUID_HERE  → UUID of super@refeval.dev
--        EDUCATOR_UUID_HERE     → UUID of educator@refeval.dev
--        REFEREE_UUID_HERE      → UUID of referee@refeval.dev
--
--   6. Paste the updated SQL into Dashboard → SQL Editor and run.
--
-- ── WHY PROFILES ARE NOT AUTO-CREATED ────────────────────────────────────────
--   Production has a handle_new_user trigger on auth.users that inserts a
--   profiles row on signup. That trigger is not in the migration files and is
--   not present in DEV. This seed inserts profiles manually.
--   See supabase/seed/dev_handle_new_user_trigger.sql to add the trigger
--   to DEV permanently (recommended before inviting real test users).
-- ============================================================


-- ── Organisation ─────────────────────────────────────────────────────────────

insert into public.organisations (id, name, status)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'RefEval Dev Organisation',
  'Active'
)
on conflict (id) do nothing;


-- ── Profiles ─────────────────────────────────────────────────────────────────
-- Replace SUPER_ADMIN_UUID_HERE, EDUCATOR_UUID_HERE, REFEREE_UUID_HERE
-- with the real UUIDs from Authentication → Users before running.

insert into public.profiles (id, email, name)
values
  ('SUPER_ADMIN_UUID_HERE', 'super@refeval.dev',    'Dev Super Admin'),
  ('EDUCATOR_UUID_HERE',    'educator@refeval.dev',  'Dev Educator'),
  ('REFEREE_UUID_HERE',     'referee@refeval.dev',   'Dev Referee')
on conflict (id) do update set
  email = excluded.email,
  name  = excluded.name;


-- ── Organisation members ──────────────────────────────────────────────────────
-- role must be a valid organisation_role enum value:
--   super_admin | admin | educator | referee

insert into public.organisation_members (user_id, organisation_id, role)
values
  ('SUPER_ADMIN_UUID_HERE', 'aaaaaaaa-0000-0000-0000-000000000001', 'super_admin'),
  ('EDUCATOR_UUID_HERE',    'aaaaaaaa-0000-0000-0000-000000000001', 'educator'),
  ('REFEREE_UUID_HERE',     'aaaaaaaa-0000-0000-0000-000000000001', 'referee')
on conflict (user_id, organisation_id) do update set
  role = excluded.role;


-- ── Verification ──────────────────────────────────────────────────────────────
-- After running, confirm these return the expected row counts: 1, 3, 3.

select 'organisations'       as table_name, count(*)::int as rows
  from public.organisations
  where id = 'aaaaaaaa-0000-0000-0000-000000000001'
union all
select 'profiles',           count(*)::int
  from public.profiles
  where email in ('super@refeval.dev', 'educator@refeval.dev', 'referee@refeval.dev')
union all
select 'organisation_members', count(*)::int
  from public.organisation_members
  where organisation_id = 'aaaaaaaa-0000-0000-0000-000000000001';
