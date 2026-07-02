-- ============================================================
-- Fix: referees assigned to a playlist cannot read it
--
-- Root cause (migration 011):
--   cp_select  on clip_playlists      only allows educator/admin/super_admin.
--   cpi_select on clip_playlist_items delegates to cp_select with the same
--   hardcoded role check.
--   A referee's usePlaylists() call returns [] → activePlaylist is undefined
--   → PlaylistDetailScreen never renders.
--
-- Fix:
--   Add a SECURITY DEFINER helper that checks learning_assignment_users
--   without triggering la_select / lau_select RLS (prevents any new recursion).
--   Then update cp_select and cpi_select to OR in the learner check.
--   Write/Update/Delete policies are unchanged (referees must not modify playlists).
-- ============================================================

-- ── Helper: is the current user assigned to this playlist? ───────────────────
-- Runs as postgres (BYPASSRLS) so it reads learning_assignments and
-- learning_assignment_users directly, avoiding any RLS chain.

create or replace function public.user_is_assigned_playlist(p_playlist_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from   public.learning_assignment_users lau
    join   public.learning_assignments      la  on la.id = lau.assignment_id
    where  la.playlist_id = p_playlist_id
      and  lau.user_id    = auth.uid()
  )
$$;

-- ── clip_playlists: allow assigned learners to read ──────────────────────────

drop policy if exists "cp_select" on public.clip_playlists;

create policy "cp_select" on public.clip_playlists for select using (
  public.has_org_role(
    organisation_id,
    array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
  )
  or public.user_is_assigned_playlist(id)
);

-- ── clip_playlist_items: allow assigned learners to read ─────────────────────

drop policy if exists "cpi_select" on public.clip_playlist_items;

create policy "cpi_select" on public.clip_playlist_items for select using (
  -- Management roles: check via parent playlist's org
  exists (
    select 1 from public.clip_playlists cp
    where  cp.id = clip_playlist_items.playlist_id
      and  public.has_org_role(
             cp.organisation_id,
             array['educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role]
           )
  )
  -- Assigned learners: SECURITY DEFINER helper (no RLS chain)
  or public.user_is_assigned_playlist(playlist_id)
);
