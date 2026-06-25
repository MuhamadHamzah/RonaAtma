-- 1. Remove DELETE policies on sensitive tables (protecting evidence and Soulbound Tokens)
DROP POLICY IF EXISTS "delete_own_bullying_reports" ON bullying_reports;
DROP POLICY IF EXISTS "delete_own_badge" ON digital_badges;

-- 2. Close blockchain_audit insert from client (only server-side allowed)
DROP POLICY IF EXISTS "allow_authenticated_insert" ON blockchain_audit;

-- 3. Add ICP reference columns
ALTER TABLE bullying_reports ADD COLUMN IF NOT EXISTS icp_anchor_id TEXT;
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS icp_anchor_id TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS icp_anchor_id TEXT;
ALTER TABLE digital_badges ADD COLUMN IF NOT EXISTS icp_token_id TEXT;

-- 4. Fix alerts insert - only service role can insert (disable direct student inserts)
DROP POLICY IF EXISTS "insert_alerts" ON alerts;

-- 5. Add rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, action_type)
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No RLS policies are defined for rate_limits, so only the service role key can read/write it.
