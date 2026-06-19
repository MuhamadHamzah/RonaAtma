-- Add wallet_address to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT UNIQUE;

-- Create digital_badges table for Soulbound Tokens (SBT)
CREATE TABLE IF NOT EXISTS digital_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('resilience', 'advocate', 'pioneer')),
  minted_tx TEXT NOT NULL UNIQUE,
  on_chain_hash TEXT NOT NULL UNIQUE,
  minted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, badge_type)
);

-- Enable RLS
ALTER TABLE digital_badges ENABLE ROW LEVEL SECURITY;

-- Policies for digital_badges
CREATE POLICY "select_all_badges" ON digital_badges FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_own_badge" ON digital_badges FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

CREATE POLICY "delete_own_badge" ON digital_badges FOR DELETE
  TO authenticated USING (auth.uid() = student_id);
