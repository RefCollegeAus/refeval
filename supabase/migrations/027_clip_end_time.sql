-- Phase 18.12: Add start_time_seconds and end_time_seconds to clips.
--
-- Canonical timing semantics (all new clips):
--   adjusted_seconds   = incident timestamp (the moment the educator tagged)
--   start_time_seconds = max(incident - 10, 0)  — deterministic 10 s pre-roll
--   end_time_seconds   = educator-selected end, or null for default
--
-- Legacy clips (start_time_seconds IS NULL) are handled in resolveClipBounds:
--   video mode  → start = adjusted_seconds - 5  (historical 5 s pre-roll)
--   non-video   → start = adjusted_seconds       (old path baked -10 into adjusted_seconds)
ALTER TABLE clips ADD COLUMN IF NOT EXISTS start_time_seconds double precision;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS end_time_seconds   double precision;
