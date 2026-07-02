-- ============================================================
-- Fix: Infinite recursion in learning_assignments RLS
--
-- Root cause:
--   la_select  → EXISTS(learning_assignment_users) → triggers lau_select
--   lau_select → SELECT learning_assignments       → triggers la_select
--   → infinite loop
--
-- Fix:
--   Create a SECURITY DEFINER helper that reads learning_assignments
--   without triggering its RLS policy.  lau_ policies use this helper
--   instead of querying learning_assignments directly.
--   la_ policies can still query learning_assignment_users safely because
--   lau_select no longer joins back to learning_assignments.
-- ============================================================

-- ── Helper: bypass-RLS lookup of assignment's org ────────────────────────────
-- Runs as the postgres role (BYPASSRLS), so RLS on learning_assignments is
-- never evaluated when this function is called from lau_ policies.

create or replace function public.la_org_id(p_assignment_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select organisation_id
  from   public.learning_assignments
  where  id = p_assignment_id
$$;

-- ── Drop all existing policies so we can recreate cleanly ────────────────────

drop policy if exists "la_select" on public.learning_assignments;
drop policy if exists "la_insert" on public.learning_assignments;
drop policy if exists "la_update" on public.learning_assignments;
drop policy if exists "la_delete" on public.learning_assignments;

drop policy if exists "lau_select" on public.learning_assignment_users;
drop policy if exists "lau_insert" on public.learning_assignment_users;
drop policy if exists "lau_update" on public.learning_assignment_users;
drop policy if exists "lau_delete" on public.learning_assignment_users;

-- ── RLS: learning_assignments ─────────────────────────────────────────────────
--
-- la_select: educators/admins see all in org; referees see only their rows.
-- The EXISTS subquery against learning_assignment_users is safe here because
-- lau_select no longer joins back to learning_assignments.

create policy "la_select" on public.learning_assignments
  for select using (
    public.has_org_role(
      organisation_id,
      array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
    )
    or exists (
      select 1
      from   public.learning_assignment_users lau
      where  lau.assignment_id = learning_assignments.id
        and  lau.user_id = auth.uid()
    )
  );

create policy "la_insert" on public.learning_assignments
  for insert with check (
    public.has_org_role(
      organisation_id,
      array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
    )
  );

create policy "la_update" on public.learning_assignments
  for update using (
    public.has_org_role(
      organisation_id,
      array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
    )
  );

create policy "la_delete" on public.learning_assignments
  for delete using (
    public.has_org_role(
      organisation_id,
      array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
    )
  );

-- ── RLS: learning_assignment_users ────────────────────────────────────────────
--
-- lau_ policies use la_org_id() (SECURITY DEFINER) to look up the parent
-- assignment's org without triggering la_select again.

create policy "lau_select" on public.learning_assignment_users
  for select using (
    user_id = auth.uid()
    or public.has_org_role(
      public.la_org_id(assignment_id),
      array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
    )
  );

create policy "lau_insert" on public.learning_assignment_users
  for insert with check (
    public.has_org_role(
      public.la_org_id(assignment_id),
      array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
    )
  );

-- Assigned users can update their own status row; educators/admins can update any.
create policy "lau_update" on public.learning_assignment_users
  for update using (
    user_id = auth.uid()
    or public.has_org_role(
      public.la_org_id(assignment_id),
      array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
    )
  );

create policy "lau_delete" on public.learning_assignment_users
  for delete using (
    public.has_org_role(
      public.la_org_id(assignment_id),
      array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
    )
  );
