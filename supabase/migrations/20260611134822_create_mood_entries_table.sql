
CREATE TABLE mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  journal_text TEXT NOT NULL,
  mood_score INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 10),
  ai_sentiment_score NUMERIC(4,2),
  depression_risk_level TEXT CHECK (depression_risk_level IN ('low', 'medium', 'high', 'critical')),
  ai_feedback TEXT,
  ai_keywords TEXT[],
  on_chain_hash TEXT,
  blockchain_tx_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_mood_entries" ON mood_entries FOR SELECT
  TO authenticated USING (student_id = auth.uid());

CREATE POLICY "insert_own_mood_entries" ON mood_entries FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

CREATE POLICY "update_own_mood_entries" ON mood_entries FOR UPDATE
  TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

CREATE POLICY "delete_own_mood_entries" ON mood_entries FOR DELETE
  TO authenticated USING (student_id = auth.uid());

CREATE POLICY "counselor_read_school_mood_entries" ON mood_entries FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles c
      JOIN profiles s ON s.id = mood_entries.student_id
      WHERE c.id = auth.uid()
        AND c.role = 'counselor'
        AND c.school_id = s.school_id
    )
  );

CREATE INDEX idx_mood_entries_student_id ON mood_entries(student_id);
CREATE INDEX idx_mood_entries_created_at ON mood_entries(created_at DESC);
