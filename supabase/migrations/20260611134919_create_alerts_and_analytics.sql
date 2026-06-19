
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('mood_decline', 'depression_risk', 'bullying_report', 'inactivity', 'crisis_language')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ai_score NUMERIC(4,2),
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  on_chain_tx_id TEXT,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_alerts" ON alerts FOR SELECT
  TO authenticated USING (student_id = auth.uid());

CREATE POLICY "insert_alerts" ON alerts FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "counselor_read_alerts" ON alerts FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles c
      JOIN profiles s ON s.id = alerts.student_id
      WHERE c.id = auth.uid()
        AND c.role = 'counselor'
        AND c.school_id = s.school_id
    )
  );

CREATE POLICY "counselor_update_alerts" ON alerts FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles c
      JOIN profiles s ON s.id = alerts.student_id
      WHERE c.id = auth.uid()
        AND c.role = 'counselor'
        AND c.school_id = s.school_id
    )
  );

CREATE INDEX idx_alerts_student_id ON alerts(student_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);
CREATE INDEX idx_alerts_triggered_at ON alerts(triggered_at DESC);

CREATE TABLE chatbot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  crisis_detected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chatbot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_messages" ON chatbot_messages FOR SELECT
  TO authenticated USING (student_id = auth.uid());

CREATE POLICY "insert_own_messages" ON chatbot_messages FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY "counselor_read_crisis_messages" ON chatbot_messages FOR SELECT
  TO authenticated USING (
    crisis_detected = true AND
    EXISTS (
      SELECT 1 FROM profiles c
      JOIN profiles s ON s.id = chatbot_messages.student_id
      WHERE c.id = auth.uid()
        AND c.role = 'counselor'
        AND c.school_id = s.school_id
    )
  );

CREATE INDEX idx_chatbot_messages_student ON chatbot_messages(student_id);
CREATE INDEX idx_chatbot_messages_created_at ON chatbot_messages(created_at);
