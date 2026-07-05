-- ============================================================
-- Phase 15.1a Draft — Playlist Soft Delete (Archive)
--
-- Changes:
--   clip_playlists   ADD COLUMN archived_at timestamptz
--
-- Status: DRAFT — do not apply to production without review.
--
-- Rationale:
--   learning_assignments.playlist_id has ON DELETE CASCADE, so hard-
--   deleting a playlist also deletes all linked assignments and their
--   learning_assignment_users rows (referee progress). Soft-delete via
--   archived_at preserves that data while hiding the playlist from
--   active lists and new assignments.
--
-- Playlists with no assignments: hard delete is safe (no progress lost).
-- Playlists with any assignments: archive instead.
--
-- Rollback:
--   ALTER TABLE public.clip_playlists DROP COLUMN IF EXISTS archived_at;
-- ============================================================

alter table public.clip_playlists
  add column if not exists archived_at timestamptz default null;
