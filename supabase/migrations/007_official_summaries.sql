-- Add per-official final review summaries to the reviews table.
-- Stored as jsonb keyed by referee user_id.
-- Shape: { "<user_id>": { "positives": "...", "workOns": "...", "nextFocus": "..." } }
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS official_summaries jsonb;
