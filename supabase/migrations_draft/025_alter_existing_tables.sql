-- ============================================================
-- Phase 13.3 Draft — Alterations to Existing Tables
--
-- Changes:
--   learning_assignment_users   ADD COLUMN watched_clip_ids jsonb
--   profiles                    ADD COLUMN onboarding_dismissed boolean
--
-- Status: DRAFT — do not apply to production without review.
--
-- These are additive ALTER TABLE statements only. No existing columns are
-- modified or dropped. Both use ADD COLUMN IF NOT EXISTS so they are safe
-- to re-run if partially applied.
--
-- Rollback (if needed before hooks are updated):
--   ALTER TABLE public.learning_assignment_users DROP COLUMN IF EXISTS watched_clip_ids;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS onboarding_dismissed;
-- ============================================================


-- ── learning_assignment_users: watched_clip_ids ──────────────────────────────
--
-- Replaces: refcoach_watched_clips_{assignmentUserId} localStorage key
--           (written in PlaylistDetailScreen.tsx)
--
-- Stores an array of clip UUIDs the user has watched for this assignment.
-- Scoped to the learning_assignment_users row (not just user_id) because one
-- user can be assigned the same playlist across multiple assignments, each with
-- independent progress state.
--
-- jsonb stores a plain array: ["uuid1", "uuid2", ...]
-- Application reads/writes the full array; no partial update needed here.
--
-- If per-clip analytics are ever required (e.g. watch counts, timestamps),
-- migrate to a junction table assignment_watched_clips(assignment_user_id, clip_id, watched_at).

alter table public.learning_assignment_users
  add column if not exists watched_clip_ids jsonb not null default '[]';


-- ── profiles: onboarding_dismissed ──────────────────────────────────────────
--
-- Replaces: refcoach_onboarding_dismissed_{userId} localStorage key
--           (written in useOnboardingDismissed hook)
--
-- Simple boolean flag. When true, the onboarding panel is not shown to the user.
-- No FK or index needed.
--
-- After this column is in place and the hook is migrated (Phase 13.3 app work),
-- useOnboardingDismissed should read this value from the session profile
-- (already loaded at login) rather than localStorage.

alter table public.profiles
  add column if not exists onboarding_dismissed boolean not null default false;
