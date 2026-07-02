-- ============================================================
-- Learning Content: add category field, revert to assignment-based RLS.
-- Only assigned users (or educators/admins) can SELECT content.
-- ============================================================

-- Add category column
alter table public.view_only_games
  add column if not exists category text not null default 'Game';

-- ── RLS: revert SELECT to assignment-based ────────────────────────────────────

drop policy if exists "vog_select" on public.view_only_games;

-- Assigned user OR educator/admin/super_admin in the same org
create policy "vog_select" on public.view_only_games
  for select using (
    public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
    or exists (
      select 1 from public.view_only_game_assignments
      where game_id = view_only_games.id
        and viewer_user_id = auth.uid()
    )
  );

-- Assignment rows: same logic — assigned user or org manager
drop policy if exists "voga_select" on public.view_only_game_assignments;

create policy "voga_select" on public.view_only_game_assignments
  for select using (
    viewer_user_id = auth.uid()
    or exists (
      select 1 from public.view_only_games
      where id = view_only_game_assignments.game_id
        and public.has_org_role(organisation_id, array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role])
    )
  );
