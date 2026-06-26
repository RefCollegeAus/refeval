-- Lightweight read-tracking for review clip comments
CREATE TABLE IF NOT EXISTS review_comment_reads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  review_id   uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  tag_id      text NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, review_id, tag_id)
);

ALTER TABLE review_comment_reads ENABLE ROW LEVEL SECURITY;

-- Users read/write only their own records
CREATE POLICY "reads_select" ON review_comment_reads
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "reads_insert" ON review_comment_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "reads_update" ON review_comment_reads
  FOR UPDATE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS review_comment_reads_user
  ON review_comment_reads(user_id);
