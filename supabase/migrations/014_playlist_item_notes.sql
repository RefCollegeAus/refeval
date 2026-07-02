-- Add per-item creator note to playlist items
ALTER TABLE clip_playlist_items ADD COLUMN IF NOT EXISTS creator_note text;
