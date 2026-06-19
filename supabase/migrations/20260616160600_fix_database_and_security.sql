-- 1. Create blockchain_audit table
CREATE TABLE IF NOT EXISTS blockchain_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash TEXT NOT NULL UNIQUE,
  tx_id TEXT NOT NULL UNIQUE,
  payload_type TEXT NOT NULL,
  anchored_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE blockchain_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_authenticated_insert" ON blockchain_audit FOR INSERT 
  TO authenticated WITH CHECK (true);

CREATE POLICY "allow_counselor_select" ON blockchain_audit FOR SELECT 
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'counselor')
  );

-- 2. Add email column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Fix alerts RLS
DROP POLICY IF EXISTS "insert_alerts" ON alerts;

CREATE POLICY "insert_alerts" ON alerts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);

-- 4. Fix chatbot_messages RLS for counselors
DROP POLICY IF EXISTS "counselor_read_crisis_messages" ON chatbot_messages;

CREATE POLICY "counselor_read_student_messages_on_crisis" ON chatbot_messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles c
      JOIN profiles s ON s.id = chatbot_messages.student_id
      WHERE c.id = auth.uid()
        AND c.role = 'counselor'
        AND c.school_id = s.school_id
        AND EXISTS (
          SELECT 1 FROM chatbot_messages cm
          WHERE cm.student_id = s.id
            AND cm.crisis_detected = true
        )
    )
  );
