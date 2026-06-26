-- Add optional clip/tag reference to existing review_comments table
ALTER TABLE review_comments ADD COLUMN IF NOT EXISTS tag_id text;

-- Index for efficient per-clip comment queries
CREATE INDEX IF NOT EXISTS review_comments_review_tag
  ON review_comments(review_id, tag_id);
