
CREATE TABLE bullying_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  victim_pseudonymous_id TEXT NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('bullying', 'verbal_abuse', 'physical_violence', 'sexual_harassment', 'cyberbullying', 'other')),
  description TEXT NOT NULL,
  incident_date DATE NOT NULL,
  location TEXT,
  perpetrator_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'escalated')),
  bk_notes TEXT,
  on_chain_hash TEXT,
  blockchain_tx_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bullying_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_bullying_reports" ON bullying_reports FOR SELECT
  TO authenticated USING (reporter_id = auth.uid());

CREATE POLICY "insert_own_bullying_reports" ON bullying_reports FOR INSERT
  TO authenticated WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "update_own_bullying_reports" ON bullying_reports FOR UPDATE
  TO authenticated USING (reporter_id = auth.uid()) WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "delete_own_bullying_reports" ON bullying_reports FOR DELETE
  TO authenticated USING (reporter_id = auth.uid());

CREATE POLICY "counselor_read_school_reports" ON bullying_reports FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles c
      JOIN profiles s ON s.id = bullying_reports.reporter_id
      WHERE c.id = auth.uid()
        AND c.role = 'counselor'
        AND c.school_id = s.school_id
    )
  );

CREATE POLICY "counselor_update_school_reports" ON bullying_reports FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles c
      JOIN profiles s ON s.id = bullying_reports.reporter_id
      WHERE c.id = auth.uid()
        AND c.role = 'counselor'
        AND c.school_id = s.school_id
    )
  );

CREATE INDEX idx_bullying_reports_reporter_id ON bullying_reports(reporter_id);
CREATE INDEX idx_bullying_reports_status ON bullying_reports(status);
CREATE INDEX idx_bullying_reports_created_at ON bullying_reports(created_at DESC);
