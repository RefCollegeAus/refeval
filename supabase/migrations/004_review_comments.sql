-- Review discussion / comments
CREATE TABLE IF NOT EXISTS review_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  author_name text NOT NULL DEFAULT '',
  message     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;

-- Only the review educator and its assigned referees may read comments
CREATE POLICY "review_comments_select" ON review_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_comments.review_id
        AND (
          r.educator_id  = auth.uid() OR
          r.referee1_id  = auth.uid() OR
          r.referee2_id  = auth.uid() OR
          r.referee3_id  = auth.uid()
        )
    )
  );

-- Same people may insert; user_id must match caller
CREATE POLICY "review_comments_insert" ON review_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_comments.review_id
        AND (
          r.educator_id  = auth.uid() OR
          r.referee1_id  = auth.uid() OR
          r.referee2_id  = auth.uid() OR
          r.referee3_id  = auth.uid()
        )
    )
  );

-- No updates or deletes (messages are permanent)
