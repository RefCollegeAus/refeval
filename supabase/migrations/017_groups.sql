-- ============================================================
-- Phase 6: Groups & Cohorts
--
-- Lets organisations create named cohorts of referees.
-- A referee may belong to multiple groups.
-- Groups can be used as an assignment target, replacing or
-- supplementing individual-user selection.
-- ============================================================

-- ── Tables ───────────────────────────────────────────────────────────────────

create table if not exists public.groups (
  id              uuid        primary key default gen_random_uuid(),
  organisation_id uuid        not null references public.organisations(id) on delete cascade,
  name            text        not null,
  description     text,
  colour          text        not null default '#3b82f6',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.group_members (
  id         uuid        primary key default gen_random_uuid(),
  group_id   uuid        not null references public.groups(id) on delete cascade,
  user_id    uuid        not null references auth.users(id)    on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists grp_org_idx on public.groups(organisation_id);
create index if not exists grpm_group_idx on public.group_members(group_id);
create index if not exists grpm_user_idx  on public.group_members(user_id);

-- ── updated_at trigger ───────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists groups_updated_at on public.groups;
create trigger groups_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.groups        enable row level security;
alter table public.group_members enable row level security;

drop policy if exists "grp_select" on public.groups;
drop policy if exists "grp_insert" on public.groups;
drop policy if exists "grp_update" on public.groups;
drop policy if exists "grp_delete" on public.groups;

-- Any member of the org can read groups (needed for assignment UI).
create policy "grp_select" on public.groups for select using (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role,
    'super_admin'::organisation_role, 'referee'::organisation_role
  ])
);

-- Only admins and educators with the Groups Create permission can write.
-- We gate by org role here; fine-grained permission is enforced in the app.
create policy "grp_insert" on public.groups for insert with check (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

create policy "grp_update" on public.groups for update using (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

create policy "grp_delete" on public.groups for delete using (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

-- group_members: helper to avoid RLS recursion
create or replace function public.grp_org_id(p_group_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select organisation_id from public.groups where id = p_group_id
$$;

drop policy if exists "grpm_select" on public.group_members;
drop policy if exists "grpm_insert" on public.group_members;
drop policy if exists "grpm_delete" on public.group_members;

create policy "grpm_select" on public.group_members for select using (
  public.has_org_role(public.grp_org_id(group_id), array[
    'educator'::organisation_role, 'admin'::organisation_role,
    'super_admin'::organisation_role, 'referee'::organisation_role
  ])
);

create policy "grpm_insert" on public.group_members for insert with check (
  public.has_org_role(public.grp_org_id(group_id), array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

create policy "grpm_delete" on public.group_members for delete using (
  public.has_org_role(public.grp_org_id(group_id), array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);
