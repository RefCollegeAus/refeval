-- ============================================================
-- Phase 3: Learning Assignments
-- Assigns playlists to individual referees as learning tasks.
-- Status is stored as text + CHECK so future values can be
-- added with a single ALTER TABLE … ADD CONSTRAINT replacement
-- rather than a full enum migration.
-- ============================================================

-- ── Tables ───────────────────────────────────────────────────────────────────

create table if not exists public.learning_assignments (
  id              uuid        primary key default gen_random_uuid(),
  organisation_id uuid        not null references public.organisations(id)   on delete cascade,
  playlist_id     uuid        not null references public.clip_playlists(id)  on delete cascade,
  assigned_by     uuid        references auth.users(id) on delete set null,
  title           text        not null,
  instructions    text,
  due_date        date,
  required        boolean     not null default false,
  created_at      timestamptz not null default now()
);

create table if not exists public.learning_assignment_users (
  id            uuid        primary key default gen_random_uuid(),
  assignment_id uuid        not null references public.learning_assignments(id) on delete cascade,
  user_id       uuid        not null references auth.users(id)                  on delete cascade,
  status        text        not null default 'Assigned'
                            check (status in ('Assigned', 'Started', 'Completed')),
  assigned_at   timestamptz not null default now(),
  started_at    timestamptz,
  completed_at  timestamptz,
  unique(assignment_id, user_id)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists la_org_idx          on public.learning_assignments(organisation_id);
create index if not exists la_playlist_idx     on public.learning_assignments(playlist_id);
create index if not exists lau_assignment_idx  on public.learning_assignment_users(assignment_id);
create index if not exists lau_user_idx        on public.learning_assignment_users(user_id);

-- ── RLS helper ───────────────────────────────────────────────────────────────
--
-- SECURITY DEFINER so it runs as the postgres role (BYPASSRLS).
-- lau_ policies use this to look up the parent assignment's org_id without
-- triggering la_ RLS, which would otherwise cause infinite recursion.

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

-- ── RLS: learning_assignments ─────────────────────────────────────────────────

alter table public.learning_assignments      enable row level security;
alter table public.learning_assignment_users enable row level security;

drop policy if exists "la_select" on public.learning_assignments;
drop policy if exists "la_insert" on public.learning_assignments;
drop policy if exists "la_update" on public.learning_assignments;
drop policy if exists "la_delete" on public.learning_assignments;

-- Educators/admins see all assignments in their org.
-- Referees see only assignments they are assigned to.
-- Safe: lau_select no longer joins back to learning_assignments.
create policy "la_select" on public.learning_assignments for select using (
  public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
  or exists (
    select 1 from public.learning_assignment_users lau
    where lau.assignment_id = learning_assignments.id
      and lau.user_id = auth.uid()
  )
);

create policy "la_insert" on public.learning_assignments for insert with check (
  public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
);

create policy "la_update" on public.learning_assignments for update using (
  public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
);

create policy "la_delete" on public.learning_assignments for delete using (
  public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
);

-- ── RLS: learning_assignment_users ────────────────────────────────────────────

drop policy if exists "lau_select" on public.learning_assignment_users;
drop policy if exists "lau_insert" on public.learning_assignment_users;
drop policy if exists "lau_update" on public.learning_assignment_users;
drop policy if exists "lau_delete" on public.learning_assignment_users;

-- Users see their own rows; educators/admins see rows via la_org_id() helper.
-- la_org_id() is SECURITY DEFINER → bypasses la_select RLS → no recursion.
create policy "lau_select" on public.learning_assignment_users for select using (
  user_id = auth.uid()
  or public.has_org_role(
       public.la_org_id(assignment_id),
       array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
     )
);

create policy "lau_insert" on public.learning_assignment_users for insert with check (
  public.has_org_role(
    public.la_org_id(assignment_id),
    array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
  )
);

-- Assigned users can update their own status (Start / Complete).
-- Educators/admins can update any row in their org.
create policy "lau_update" on public.learning_assignment_users for update using (
  user_id = auth.uid()
  or public.has_org_role(
       public.la_org_id(assignment_id),
       array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
     )
);

create policy "lau_delete" on public.learning_assignment_users for delete using (
  public.has_org_role(
    public.la_org_id(assignment_id),
    array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
  )
);
