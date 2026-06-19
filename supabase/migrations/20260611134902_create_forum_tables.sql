
CREATE TABLE forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('curhat', 'motivasi', 'tips', 'tanya_jawab', 'cerita')),
  content TEXT NOT NULL,
  title TEXT NOT NULL,
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'rejected')),
  moderation_reason TEXT,
  upvotes INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_approved_forum_posts" ON forum_posts FOR SELECT
  TO authenticated USING (moderation_status = 'approved');

CREATE POLICY "select_own_forum_posts" ON forum_posts FOR SELECT
  TO authenticated USING (author_id = auth.uid());

CREATE POLICY "insert_own_forum_posts" ON forum_posts FOR INSERT
  TO authenticated WITH CHECK (author_id = auth.uid());

CREATE POLICY "update_own_forum_posts" ON forum_posts FOR UPDATE
  TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

CREATE POLICY "delete_own_forum_posts" ON forum_posts FOR DELETE
  TO authenticated USING (author_id = auth.uid());

CREATE POLICY "counselor_read_all_forum_posts" ON forum_posts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'counselor')
  );

CREATE POLICY "counselor_update_forum_posts" ON forum_posts FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'counselor')
  );

CREATE TABLE forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  moderation_status TEXT NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'flagged', 'rejected')),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_approved_replies" ON forum_replies FOR SELECT
  TO authenticated USING (moderation_status = 'approved');

CREATE POLICY "select_own_replies" ON forum_replies FOR SELECT
  TO authenticated USING (author_id = auth.uid());

CREATE POLICY "insert_own_replies" ON forum_replies FOR INSERT
  TO authenticated WITH CHECK (author_id = auth.uid());

CREATE POLICY "update_own_replies" ON forum_replies FOR UPDATE
  TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

CREATE POLICY "delete_own_replies" ON forum_replies FOR DELETE
  TO authenticated USING (author_id = auth.uid());

CREATE TABLE forum_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE forum_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_upvotes" ON forum_upvotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_upvotes" ON forum_upvotes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete_own_upvotes" ON forum_upvotes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_forum_posts_author ON forum_posts(author_id);
CREATE INDEX idx_forum_posts_status ON forum_posts(moderation_status);
CREATE INDEX idx_forum_posts_created_at ON forum_posts(created_at DESC);
CREATE INDEX idx_forum_replies_post ON forum_replies(post_id);
