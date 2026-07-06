-- Phase 16.2: Link simulator sessions to reviews for review-based event coding

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_simulator boolean NOT NULL DEFAULT false;
ALTER TABLE simulator_sessions ADD COLUMN IF NOT EXISTS review_id uuid REFERENCES reviews(id) ON DELETE SET NULL;
ALTER TABLE simulator_responses ADD COLUMN IF NOT EXISTS clip_id uuid REFERENCES clips(id);
ALTER TABLE simulator_responses ALTER COLUMN event_id DROP NOT NULL;
