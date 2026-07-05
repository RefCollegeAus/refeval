-- ============================================================
-- Phase 13.3 Draft — Goal Links
--
-- Tables:
--   review_goal_links    Links a review session to a development goal for a referee.
--   clip_goal_links      Links an individual coded clip to a development goal.
--
-- Status: DRAFT — do not apply to production without review.
--
-- Prerequisites:
--   018_development_goals.sql (development_goal_defs FK).
--
-- Note: the TypeScript type ClipGoalLink does not currently have linked_at
-- or linked_by fields. These are added here for audit parity with
-- review_goal_links. The ClipGoalLink type in lib/types/reviewGoalLinks.ts
-- must be updated when the hook is migrated (Phase 13.3 app work).
-- ============================================================


-- ── review_goal_links ────────────────────────────────────────────────────────

create table if not exists public.review_goal_links (
  id                       uuid        primary key default gen_random_uuid(),
  organisation_id          uuid        not null references public.organisations(id) on delete cascade,
  review_id                uuid        not null references public.reviews(id) on delete cascade,
  goal_def_id              uuid        not null references public.development_goal_defs(id) on delete cascade,
  referee_id               uuid        not null references auth.users(id) on delete cascade,
  linked_at                timestamptz not null default now(),
  linked_by                uuid        references auth.users(id) on delete set null,
  created_goal_from_review boolean     not null default false,
  -- true when this link was also the event that created the goal def
  unique (review_id, goal_def_id, referee_id)
);

create index if not exists rgl_review_idx   on public.review_goal_links(review_id);
create index if not exists rgl_goal_idx     on public.review_goal_links(goal_def_id);
create index if not exists rgl_referee_idx  on public.review_goal_links(referee_id);


-- ── clip_goal_links ──────────────────────────────────────────────────────────

create table if not exists public.clip_goal_links (
  id               uuid        primary key default gen_random_uuid(),
  organisation_id  uuid        not null references public.organisations(id) on delete cascade,
  clip_id          uuid        not null references public.clips(id) on delete cascade,
  review_id        uuid        not null references public.reviews(id) on delete cascade,
  -- review_id is denormalised (derivable from clips.review_id) for query
  -- convenience; avoids an extra join when listing clips for a goal.
  goal_def_id      uuid        not null references public.development_goal_defs(id) on delete cascade,
  referee_id       uuid        not null references auth.users(id) on delete cascade,
  linked_at        timestamptz not null default now(),
  linked_by        uuid        references auth.users(id) on delete set null,
  unique (clip_id, goal_def_id, referee_id)
);

create index if not exists cgl_clip_idx     on public.clip_goal_links(clip_id);
create index if not exists cgl_goal_idx     on public.clip_goal_links(goal_def_id);
create index if not exists cgl_referee_idx  on public.clip_goal_links(referee_id);


-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.review_goal_links enable row level security;
alter table public.clip_goal_links   enable row level security;


-- ── review_goal_links policies ───────────────────────────────────────────────

drop policy if exists "rgl_select" on public.review_goal_links;
drop policy if exists "rgl_insert" on public.review_goal_links;
drop policy if exists "rgl_delete" on public.review_goal_links;

-- All org members can see links (referees need this to view their goal context).
create policy "rgl_select" on public.review_goal_links for select using (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role,
    'super_admin'::organisation_role, 'referee'::organisation_role
  ])
);

create policy "rgl_insert" on public.review_goal_links for insert with check (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

create policy "rgl_delete" on public.review_goal_links for delete using (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);


-- ── clip_goal_links policies ─────────────────────────────────────────────────

drop policy if exists "cgl_select" on public.clip_goal_links;
drop policy if exists "cgl_insert" on public.clip_goal_links;
drop policy if exists "cgl_delete" on public.clip_goal_links;

create policy "cgl_select" on public.clip_goal_links for select using (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role,
    'super_admin'::organisation_role, 'referee'::organisation_role
  ])
);

create policy "cgl_insert" on public.clip_goal_links for insert with check (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

create policy "cgl_delete" on public.clip_goal_links for delete using (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);
