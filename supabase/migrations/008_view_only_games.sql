-- ============================================================
-- View-Only Games: separate table for org-wide game sharing.
-- These are NOT reviews/evaluations — no clips, comments, or analytics.
-- ============================================================

-- Main game record
create table if not exists public.view_only_games (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  title           text not null,
  game_date       date,
  video_url       text not null default '',
  created_by      uuid not null references auth.users(id),
  created_at      timestamptz not null default now()
);

-- Per-viewer assignment (kept for future "required viewing" tracking)
create table if not exists public.view_only_game_assignments (
  id              uuid primary key default gen_random_uuid(),
  game_id         uuid not null references public.view_only_games(id) on delete cascade,
  viewer_user_id  uuid not null references auth.users(id) on delete cascade,
  assigned_by     uuid not null references auth.users(id),
  assigned_at     timestamptz not null default now(),
  unique (game_id, viewer_user_id)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.view_only_games enable row level security;
alter table public.view_only_game_assignments enable row level security;

-- view_only_games SELECT: any authenticated org member can see all games in their org
create policy "vog_select" on public.view_only_games
  for select using (
    public.is_org_member(organisation_id)
  );

-- view_only_games INSERT/UPDATE/DELETE: educator / admin / super_admin only
-- has_org_role takes organisation_role[] (the enum type defined in 002_rls_policies.sql)
create policy "vog_insert" on public.view_only_games
  for insert with check (
    public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
    and created_by = auth.uid()
  );

create policy "vog_update" on public.view_only_games
  for update using (
    public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
  );

create policy "vog_delete" on public.view_only_games
  for delete using (
    public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
  );

-- view_only_game_assignments SELECT: any org member (mirrors vog_select)
create policy "voga_select" on public.view_only_game_assignments
  for select using (
    exists (
      select 1 from public.view_only_games
      where id = view_only_game_assignments.game_id
        and public.is_org_member(organisation_id)
    )
  );

-- view_only_game_assignments INSERT/DELETE: educator / admin / super_admin only
create policy "voga_insert" on public.view_only_game_assignments
  for insert with check (
    exists (
      select 1 from public.view_only_games
      where id = view_only_game_assignments.game_id
        and public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
    )
  );

create policy "voga_delete" on public.view_only_game_assignments
  for delete using (
    exists (
      select 1 from public.view_only_games
      where id = view_only_game_assignments.game_id
        and public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
    )
  );
