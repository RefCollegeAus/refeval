-- ============================================================
-- Phase 2A: Organisation User Permissions
--
-- Adds per-user permission overrides within an organisation.
-- Roles remain the baseline; this table stores customisations.
-- If a user has no rows here, role defaults apply.
-- One row per (org, user, permission_key). Future permissions
-- can be added by inserting rows with new permission_key values
-- — no schema change required.
-- ============================================================

create table if not exists public.organisation_user_permissions (
  id              uuid        primary key default gen_random_uuid(),
  organisation_id uuid        not null references public.organisations(id) on delete cascade,
  user_id         uuid        not null references auth.users(id) on delete cascade,
  permission_key  text        not null,
  granted         boolean     not null default true,
  created_at      timestamptz not null default now(),
  unique (organisation_id, user_id, permission_key)
);

-- Index for fast per-user lookup
create index if not exists oup_user_idx
  on public.organisation_user_permissions (organisation_id, user_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.organisation_user_permissions enable row level security;

drop policy if exists "oup_select" on public.organisation_user_permissions;
drop policy if exists "oup_insert" on public.organisation_user_permissions;
drop policy if exists "oup_update" on public.organisation_user_permissions;
drop policy if exists "oup_delete" on public.organisation_user_permissions;

-- Any user can read their own permissions;
-- admins can read all permissions in their org.
create policy "oup_select" on public.organisation_user_permissions for select using (
  user_id = auth.uid()
  or public.has_org_role(organisation_id, array['admin'::organisation_role, 'super_admin'::organisation_role])
);

-- Only admins can write permissions.
create policy "oup_insert" on public.organisation_user_permissions for insert with check (
  public.has_org_role(organisation_id, array['admin'::organisation_role, 'super_admin'::organisation_role])
);

create policy "oup_update" on public.organisation_user_permissions for update using (
  public.has_org_role(organisation_id, array['admin'::organisation_role, 'super_admin'::organisation_role])
);

create policy "oup_delete" on public.organisation_user_permissions for delete using (
  public.has_org_role(organisation_id, array['admin'::organisation_role, 'super_admin'::organisation_role])
);
