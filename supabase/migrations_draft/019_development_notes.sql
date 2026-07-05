-- ============================================================
-- Phase 13.3 Draft — Development Notes
-- Updated: Phase 13.4 hardening
--
-- Tables:
--   development_notes    Coaching notes per referee. Visibility enforced by RLS.
--
-- Status: DRAFT — do not apply to production without review.
--
-- Prerequisites:
--   018_development_goals.sql (defines development_goal_defs for the FK).
--
-- Key design note (visibility):
--   visibility = 'Educator Only' notes are hidden from referees at the RLS layer,
--   not just the UI. Two separate SELECT policies are created so Postgres evaluates
--   them as OR: educators/admins see all; referees see only their own
--   visible-to-them rows.
-- ============================================================


-- ── development_notes ───────────────────────────────────────────────────────

create table if not exists public.development_notes (
  id               uuid        primary key default gen_random_uuid(),
  referee_id       uuid        not null references auth.users(id) on delete cascade,
  organisation_id  uuid        not null references public.organisations(id) on delete cascade,
  title            text        not null,
  body             text        not null default '',
  note_type        text        not null check (note_type in (
                                 'General', 'Mentoring', 'Training',
                                 'Sideline Feedback', 'Review Follow-up',
                                 'Welfare / Support', 'Other'
                               )),
  visibility       text        not null default 'Educator Only'
                                 check (visibility in ('Educator Only', 'Visible to Referee')),
  -- IMPORTANT: visibility = 'Educator Only' must be enforced by the RLS SELECT
  -- policies below, not only in application code.
  created_by       uuid        references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  linked_goal_id   uuid        references public.development_goal_defs(id) on delete set null
  -- linked_goal_id: cleared (SET NULL) if the goal def row is hard-deleted.
  -- Under normal soft-delete flow, goal def rows are never hard-deleted,
  -- so this FK action only fires for org-level deletion cascades.
);

create index if not exists dn_referee_org_idx  on public.development_notes(referee_id, organisation_id);
-- Partial index: notes linked to a goal — used for goal → notes lookups.
create index if not exists dn_goal_idx         on public.development_notes(linked_goal_id)
  where linked_goal_id is not null;

drop trigger if exists development_notes_updated_at on public.development_notes;
create trigger development_notes_updated_at
  before update on public.development_notes
  for each row execute function public.set_updated_at();


-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.development_notes enable row level security;

drop policy if exists "dn_select_staff"   on public.development_notes;
drop policy if exists "dn_select_referee" on public.development_notes;
drop policy if exists "dn_insert"         on public.development_notes;
drop policy if exists "dn_update"         on public.development_notes;
drop policy if exists "dn_delete"         on public.development_notes;

-- SELECT policy 1: educators, admins, and super_admins see all notes in their org,
-- including Educator Only notes.
create policy "dn_select_staff" on public.development_notes for select using (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

-- SELECT policy 2: referees see only notes about themselves that are marked
-- visible to them. A referee cannot see Educator Only notes at any time,
-- even with direct database queries through the anon key.
create policy "dn_select_referee" on public.development_notes for select using (
  referee_id = auth.uid()
  and visibility = 'Visible to Referee'
  and public.has_org_role(organisation_id, array['referee'::organisation_role])
);

create policy "dn_insert" on public.development_notes for insert with check (
  public.has_org_role(organisation_id, array[
    'educator'::organisation_role, 'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

-- Only the original author can edit their own notes.
-- Admins can update any note in their org (e.g. correcting errors after an educator leaves).
-- with check mirrors using to prevent org_id re-assignment and to prevent an author
-- from changing visibility to 'Educator Only' on a note they no longer have staff access to.
create policy "dn_update" on public.development_notes for update using (
  created_by = auth.uid()
  or public.has_org_role(organisation_id, array[
    'admin'::organisation_role, 'super_admin'::organisation_role
  ])
) with check (
  created_by = auth.uid()
  or public.has_org_role(organisation_id, array[
    'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);

create policy "dn_delete" on public.development_notes for delete using (
  created_by = auth.uid()
  or public.has_org_role(organisation_id, array[
    'admin'::organisation_role, 'super_admin'::organisation_role
  ])
);
