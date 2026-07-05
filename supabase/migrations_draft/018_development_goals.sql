-- ============================================================
-- Phase 13.3 Draft — Development Goals
-- Updated: Phase 13.4 hardening
--
-- Tables:
--   development_goal_defs               Layer 1: reusable goal templates (soft delete)
--   development_goal_assignments        Layer 2: assignment records
--   development_goal_assignment_referees  Junction: resolved referee list per assignment
--   referee_goals                       Layer 3: per-referee progress
--
-- Status: DRAFT — do not apply to production without review.
--
-- Prerequisites:
--   002_rls_policies.sql must have run (defines has_org_role, is_org_member,
--   is_super_admin, organisation_role enum).
--   017_groups.sql must have run (defines set_updated_at trigger function).
-- ============================================================


-- ── development_goal_defs ───────────────────────────────────────────────────
--
-- Reusable coaching goal templates. No progress or assignment state lives here.
-- Soft delete: set deleted_at instead of issuing DELETE.
-- Active queries must filter WHERE deleted_at IS NULL.

create table if not exists public.development_goal_defs (
  id               uuid        primary key default gen_random_uuid(),
  organisation_id  uuid        not null references public.organisations(id) on delete cascade,
  title            text        not null,
  description      text        not null default '',
  category         text        not null check (category in (
                                 'Positioning', 'Communication', 'Game Management',
                                 'Rules', 'Professionalism', 'Mechanics', 'Other'
                               )),
  priority         text        not null check (priority in ('Low', 'Medium', 'High')),
  created_by       uuid        references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
  -- NULL = active; set to now() on soft delete. Do not issue hard DELETE.
);

create index if not exists dgd_org_idx         on public.development_goal_defs(organisation_id);
-- Partial index: active goal defs only — used by the vast majority of queries.
create index if not exists dgd_org_active_idx  on public.development_goal_defs(organisation_id)
  where deleted_at is null;

drop trigger if exists development_goal_defs_updated_at on public.development_goal_defs;
create trigger development_goal_defs_updated_at
  before update on public.development_goal_defs
  for each row execute function public.set_updated_at();


-- ── development_goal_assignments ────────────────────────────────────────────
--
-- Records the act of assigning a goal to one or more referees.
-- Retained for audit / reporting (who assigned what, to whom, when).
-- assignment_type is a label recording intent; the junction table always
-- contains the resolved explicit referee list at creation time.

create table if not exists public.development_goal_assignments (
  id               uuid        primary key default gen_random_uuid(),
  goal_id          uuid        not null references public.development_goal_defs(id) on delete cascade,
  organisation_id  uuid        not null references public.organisations(id) on delete cascade,
  assignment_type  text        not null check (assignment_type in (
                                 'Individual', 'SelectedReferees', 'Everyone'
                               )),
  -- 'Everyone' means all org referees at assignment time. The junction table
  -- always contains the resolved explicit list — not resolved lazily.
  assigned_by      uuid        references auth.users(id) on delete set null,
  assigned_at      timestamptz not null default now()
);

create index if not exists dga_goal_idx on public.development_goal_assignments(goal_id);
create index if not exists dga_org_idx  on public.development_goal_assignments(organisation_id);


-- ── development_goal_assignment_referees ────────────────────────────────────
--
-- Junction: one row per referee per assignment.
-- Always populated with explicit referee IDs at creation time,
-- even for assignment_type = 'Everyone'.

create table if not exists public.development_goal_assignment_referees (
  assignment_id  uuid  not null references public.development_goal_assignments(id) on delete cascade,
  referee_id     uuid  not null references auth.users(id) on delete cascade,
  primary key (assignment_id, referee_id)
);

create index if not exists dgar_referee_idx on public.development_goal_assignment_referees(referee_id);

-- SECURITY DEFINER helper: looks up the organisation_id for a given assignment
-- without triggering RLS on development_goal_assignments.
-- Follows the same pattern as la_org_id() in 013_learning_assignments.sql.
create or replace function public.dga_org_id(p_assignment_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select organisation_id
  from   public.development_goal_assignments
  where  id = p_assignment_id
$$;


-- ── referee_goals ────────────────────────────────────────────────────────────
--
-- Per-referee progress record for a single goal definition.
-- One row per (goal_id, referee_id) pair.
-- ON DELETE RESTRICT on goal_id: soft delete is used for goal defs, so a hard
-- DELETE should never reach here. RESTRICT acts as a database-level safety net.

create table if not exists public.referee_goals (
  id                  uuid        primary key default gen_random_uuid(),
  goal_id             uuid        not null references public.development_goal_defs(id) on delete restrict,
  referee_id          uuid        not null references auth.users(id) on delete cascade,
  organisation_id     uuid        not null references public.organisations(id) on delete cascade,
  status              text        not null default 'Active'
                                    check (status in ('Active', 'Completed', 'Archived')),
  notes               text        not null default '',
  target_review_date  date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  completed_at        timestamptz,
  archived_at         timestamptz,
  unique (goal_id, referee_id)
  -- One active progress row per referee per goal def.
  -- If re-assignment after archival becomes a supported workflow,
  -- this constraint must be relaxed and a version column added.
);

create index if not exists rg_org_idx      on public.referee_goals(organisation_id);
create index if not exists rg_referee_idx  on public.referee_goals(referee_id);
-- Partial index: active + completed goals only (excludes archived).
create index if not exists rg_active_idx   on public.referee_goals(organisation_id, referee_id)
  where status != 'Archived';

drop trigger if exists referee_goals_updated_at on public.referee_goals;
create trigger referee_goals_updated_at
  before update on public.referee_goals
  for each row execute function public.set_updated_at();


-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.development_goal_defs               enable row level security;
alter table public.development_goal_assignments        enable row level security;
alter table public.development_goal_assignment_referees enable row level security;
alter table public.referee_goals                       enable row level security;


-- ── development_goal_defs policies ──────────────────────────────────────────

drop policy if exists "dgd_select" on public.development_goal_defs;
drop policy if exists "dgd_insert" on public.development_goal_defs;
drop policy if exists "dgd_update" on public.development_goal_defs;
drop policy if exists "dgd_delete" on public.development_goal_defs;

-- All org members except viewers can read goal defs (referees need this to view their assigned goals).
-- Note: application code must further filter WHERE deleted_at IS NULL for active-only views.
-- Admins may query all rows including soft-deleted ones for audit purposes.
-- viewer role is excluded: viewers are restricted to view_only_games content and
-- do not participate in the development goals workflow.
-- NOTE: 'viewer' is intentionally omitted — no existing migration uses viewer in a role array.
-- Confirm viewer exists in the organisation_role enum before adding it here.
create policy "dgd_select" on public.development_goal_defs for select using (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role,
    'super_admin'::organisation_role, 'referee'::organisation_role
  ])
);

create policy "dgd_insert" on public.development_goal_defs for insert with check (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

-- UPDATE is the mechanism for both editing and soft-deleting (setting deleted_at).
create policy "dgd_update" on public.development_goal_defs for update using (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

-- Hard DELETE is blocked at the application layer (soft delete is used instead).
-- This policy exists as a fallback safety net for admin tooling only.
create policy "dgd_delete" on public.development_goal_defs for delete using (
  public.has_org_role(organisation_id, array[
    'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);


-- ── development_goal_assignments policies ────────────────────────────────────

drop policy if exists "dga_select" on public.development_goal_assignments;
drop policy if exists "dga_insert" on public.development_goal_assignments;
drop policy if exists "dga_update" on public.development_goal_assignments;
drop policy if exists "dga_delete" on public.development_goal_assignments;

-- Referees do not read assignment records — they read their referee_goals rows.
create policy "dga_select" on public.development_goal_assignments for select using (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

create policy "dga_insert" on public.development_goal_assignments for insert with check (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

create policy "dga_update" on public.development_goal_assignments for update using (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

create policy "dga_delete" on public.development_goal_assignments for delete using (
  public.has_org_role(organisation_id, array[
    'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);


-- ── development_goal_assignment_referees policies ───────────────────────────

drop policy if exists "dgar_select" on public.development_goal_assignment_referees;
drop policy if exists "dgar_insert" on public.development_goal_assignment_referees;
drop policy if exists "dgar_delete" on public.development_goal_assignment_referees;

-- Uses dga_org_id() helper to look up org without triggering RLS recursion.
create policy "dgar_select" on public.development_goal_assignment_referees for select using (
  public.has_org_role(
    public.dga_org_id(assignment_id),
    array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
  )
);

create policy "dgar_insert" on public.development_goal_assignment_referees for insert with check (
  public.has_org_role(
    public.dga_org_id(assignment_id),
    array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
  )
);

create policy "dgar_delete" on public.development_goal_assignment_referees for delete using (
  public.has_org_role(
    public.dga_org_id(assignment_id),
    array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
  )
);


-- ── referee_goals policies ───────────────────────────────────────────────────

drop policy if exists "rg_select" on public.referee_goals;
drop policy if exists "rg_insert" on public.referee_goals;
drop policy if exists "rg_update" on public.referee_goals;
drop policy if exists "rg_delete" on public.referee_goals;

-- Educators/admins see all goals in their org.
-- Referees see only their own goals.
create policy "rg_select" on public.referee_goals for select using (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
  or (
    referee_id = auth.uid()
    and public.has_org_role(organisation_id, array['referee'::organisation_role])
  )
);

-- Only educators/admins create referee_goals rows (on behalf of referees).
create policy "rg_insert" on public.referee_goals for insert with check (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

-- Educators/admins can update any goal in their org.
-- Referees can update their own rows (status, notes). Column-level restriction
-- (only status and notes may be updated by referees) is enforced at the application layer.
-- with check mirrors using to prevent row re-assignment to a different org or referee.
create policy "rg_update" on public.referee_goals for update using (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
  or (
    referee_id = auth.uid()
    and public.has_org_role(organisation_id, array['referee'::organisation_role])
  )
) with check (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
  or (
    referee_id = auth.uid()
    and public.has_org_role(organisation_id, array['referee'::organisation_role])
  )
);

create policy "rg_delete" on public.referee_goals for delete using (
  public.has_org_role(organisation_id, array[
    'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);
