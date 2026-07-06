-- ============================================================
-- Phase 15.3a Draft — Nullable playlist_id for standalone quizzes
--
-- Changes:
--   learning_assignments  ALTER COLUMN playlist_id DROP NOT NULL
--
-- Status: DRAFT — do not apply to production without review.
-- ============================================================

-- Allow learning_assignments to exist without a playlist.
-- NULL playlist_id = standalone quiz assignment.
-- Non-null playlist_id = existing playlist-backed assignment (unchanged).
--
-- The la_playlist_idx index remains valid on a nullable column.
-- RLS policies are unaffected (they check organisation_id, not playlist_id).

alter table public.learning_assignments
  alter column playlist_id drop not null;
