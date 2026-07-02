-- ============================================================
-- Update view_only_games SELECT policy:
-- Any authenticated organisation member can see all games in their org.
-- (Previously required explicit assignment.)
-- Assignments table is kept for future "required viewing" tracking.
-- ============================================================

drop policy if exists "vog_select" on public.view_only_games;

create policy "vog_select" on public.view_only_games
  for select using (
    public.is_org_member(organisation_id)
  );

-- Assignment SELECT: any org member can read assignments for their org's games
-- (unchanged — already broad enough for educators; viewers/referees don't need to query it)
