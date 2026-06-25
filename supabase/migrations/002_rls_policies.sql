-- ============================================================
-- Phase 7: Row Level Security Policies
-- ============================================================
-- Run this in the Supabase SQL editor.
-- Safe to run multiple times (idempotent).
--
-- Strategy: SECURITY DEFINER helper functions query
-- organisation_members without triggering RLS, eliminating
-- the infinite recursion that occurs with self-referential
-- organisation_members policies.
--
-- Note: organisation_members.role is a custom enum type
-- (organisation_role), so all role comparisons use
-- organisation_role casts, not plain text.
-- ============================================================

-- ============================================================
-- Step 1: Drop existing policies on all affected tables
-- ============================================================
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
    and tablename in ('profiles', 'organisations', 'organisation_members', 'reviews', 'clips')
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end;
$$;

-- ============================================================
-- Step 2: Drop and recreate SECURITY DEFINER helper functions
-- ============================================================

-- Returns true if the current user has the 'super_admin' role in any organisation.
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.organisation_members
    where user_id = auth.uid()
    and role = 'super_admin'::organisation_role
  );
$$;

-- Returns true if the current user is a member of the given organisation (any role).
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.organisation_members
    where user_id = auth.uid()
    and organisation_id = org_id
  );
$$;

-- Returns true if the current user holds any of the given roles in the given organisation.
-- roles parameter uses the organisation_role enum type.
create or replace function public.has_org_role(org_id uuid, roles organisation_role[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.organisation_members
    where user_id = auth.uid()
    and organisation_id = org_id
    and role = any(roles)
  );
$$;

-- Grant execute to authenticated users (required for use inside policies)
grant execute on function public.is_super_admin()                        to authenticated;
grant execute on function public.is_org_member(uuid)                     to authenticated;
grant execute on function public.has_org_role(uuid, organisation_role[]) to authenticated;

-- ============================================================
-- Step 3: Policies
-- ============================================================

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------

-- Any authenticated user can read profiles.
-- Required for getMembersForOrganisation() which joins profiles
-- to resolve member names and emails.
create policy "profiles_select"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only update their own profile.
create policy "profiles_update"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ------------------------------------------------------------
-- organisations
-- ------------------------------------------------------------

-- Users can read organisations they belong to.
-- Super admins can read all organisations.
create policy "organisations_select"
  on public.organisations for select
  to authenticated
  using (
    is_org_member(organisations.id)
    or is_super_admin()
  );

-- ------------------------------------------------------------
-- organisation_members
-- ------------------------------------------------------------
-- Uses helper functions to avoid self-referential recursion.

create policy "organisation_members_select"
  on public.organisation_members for select
  to authenticated
  using (
    -- Own membership row is always visible
    user_id = auth.uid()
    or
    -- Any member of the same org can see all org members
    -- (needed for referee dropdowns in the educator coding screen)
    is_org_member(organisation_members.organisation_id)
    or
    -- Super admins can see members across all orgs
    is_super_admin()
  );

-- ------------------------------------------------------------
-- reviews
-- ------------------------------------------------------------

-- SELECT
--   Super admin:  all reviews.
--   Admin:        all reviews in their organisation.
--   Educator:     only reviews they personally created, within their organisation.
--   Referee:      only completed reviews where they are assigned.
create policy "reviews_select"
  on public.reviews for select
  to authenticated
  using (
    is_super_admin()
    or has_org_role(reviews.organisation_id, array['admin'::organisation_role])
    or (has_org_role(reviews.organisation_id, array['educator'::organisation_role]) and reviews.educator_id = auth.uid())
    or (
      reviews.status = 'completed'
      and (
        reviews.referee1_id = auth.uid()
        or reviews.referee2_id = auth.uid()
        or reviews.referee3_id = auth.uid()
      )
    )
  );

-- INSERT: educators and admins can create reviews for their own org.
-- Super admins can create reviews in any org.
create policy "reviews_insert"
  on public.reviews for insert
  to authenticated
  with check (
    is_super_admin()
    or has_org_role(reviews.organisation_id, array['educator'::organisation_role, 'admin'::organisation_role])
  );

-- UPDATE: the creating educator can update their own reviews.
-- Admins and super admins can update any review in the org.
create policy "reviews_update"
  on public.reviews for update
  to authenticated
  using (
    is_super_admin()
    or has_org_role(reviews.organisation_id, array['admin'::organisation_role])
    or reviews.educator_id = auth.uid()
  )
  with check (
    is_super_admin()
    or has_org_role(reviews.organisation_id, array['admin'::organisation_role])
    or reviews.educator_id = auth.uid()
  );

-- DELETE: same rights as UPDATE.
create policy "reviews_delete"
  on public.reviews for delete
  to authenticated
  using (
    is_super_admin()
    or has_org_role(reviews.organisation_id, array['admin'::organisation_role])
    or reviews.educator_id = auth.uid()
  );

-- ------------------------------------------------------------
-- clips
-- ------------------------------------------------------------
-- All clip policies join to the parent review to derive permissions,
-- mirroring the reviews policies above.
-- This also handles older clips where clips.organisation_id may be null.

-- SELECT
create policy "clips_select"
  on public.clips for select
  to authenticated
  using (
    is_super_admin()
    or exists (
      select 1 from public.reviews r
      where r.id = clips.review_id
      and (
        -- Admin: any review in their org
        has_org_role(r.organisation_id, array['admin'::organisation_role])
        or
        -- Educator: only reviews they personally created
        r.educator_id = auth.uid()
        or
        -- Referee: completed reviews they are assigned to
        (
          r.status = 'completed'
          and (
            r.referee1_id = auth.uid()
            or r.referee2_id = auth.uid()
            or r.referee3_id = auth.uid()
          )
        )
      )
    )
  );

-- INSERT: admin/super_admin for any org review; educator only for their own reviews.
create policy "clips_insert"
  on public.clips for insert
  to authenticated
  with check (
    exists (
      select 1 from public.reviews r
      where r.id = clips.review_id
      and (
        is_super_admin()
        or has_org_role(r.organisation_id, array['admin'::organisation_role])
        or (r.educator_id = auth.uid() and has_org_role(r.organisation_id, array['educator'::organisation_role]))
      )
    )
  );

-- UPDATE
create policy "clips_update"
  on public.clips for update
  to authenticated
  using (
    exists (
      select 1 from public.reviews r
      where r.id = clips.review_id
      and (
        is_super_admin()
        or has_org_role(r.organisation_id, array['admin'::organisation_role])
        or (r.educator_id = auth.uid() and has_org_role(r.organisation_id, array['educator'::organisation_role]))
      )
    )
  )
  with check (
    exists (
      select 1 from public.reviews r
      where r.id = clips.review_id
      and (
        is_super_admin()
        or has_org_role(r.organisation_id, array['admin'::organisation_role])
        or (r.educator_id = auth.uid() and has_org_role(r.organisation_id, array['educator'::organisation_role]))
      )
    )
  );

-- DELETE
create policy "clips_delete"
  on public.clips for delete
  to authenticated
  using (
    exists (
      select 1 from public.reviews r
      where r.id = clips.review_id
      and (
        is_super_admin()
        or has_org_role(r.organisation_id, array['admin'::organisation_role])
        or (r.educator_id = auth.uid() and has_org_role(r.organisation_id, array['educator'::organisation_role]))
      )
    )
  );
