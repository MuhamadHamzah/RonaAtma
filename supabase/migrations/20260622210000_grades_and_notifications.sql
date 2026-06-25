-- 1. Tabel academic_grades
CREATE TABLE IF NOT EXISTS academic_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  term TEXT NOT NULL,
  inputted_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS untuk academic_grades
ALTER TABLE academic_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_grades" ON academic_grades FOR SELECT
  TO authenticated USING (student_id = auth.uid());

CREATE POLICY "counselor_read_school_grades" ON academic_grades FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles c
      JOIN profiles s ON s.id = academic_grades.student_id
      WHERE c.id = auth.uid()
        AND c.role = 'counselor'
        AND c.school_id = s.school_id
    )
  );

CREATE POLICY "counselor_insert_school_grades" ON academic_grades FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles c
      JOIN profiles s ON s.id = student_id
      WHERE c.id = auth.uid()
        AND c.role = 'counselor'
        AND c.school_id = s.school_id
    )
  );

CREATE POLICY "counselor_update_school_grades" ON academic_grades FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles c
      JOIN profiles s ON s.id = academic_grades.student_id
      WHERE c.id = auth.uid()
        AND c.role = 'counselor'
        AND c.school_id = s.school_id
    )
  );

CREATE POLICY "counselor_delete_school_grades" ON academic_grades FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles c
      JOIN profiles s ON s.id = academic_grades.student_id
      WHERE c.id = auth.uid()
        AND c.role = 'counselor'
        AND c.school_id = s.school_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_academic_grades_student ON academic_grades(student_id);


-- 2. Tabel notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('grade', 'alert', 'bullying_report', 'system')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS untuk notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- Diperlukan jika ada penyisipan notifikasi manual dari client
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);


-- 3. Trigger otomatis untuk notifikasi

-- A. Trigger untuk perubahan nilai akademik
CREATE OR REPLACE FUNCTION fn_on_grade_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, content, type)
  VALUES (
    NEW.student_id,
    'Nilai Akademik Diperbarui',
    'Nilai untuk mata pelajaran ' || NEW.subject || ' (' || NEW.score || ') semester ' || NEW.term || ' telah diperbarui/dimasukkan oleh Guru BK.',
    'grade'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_grade_change ON academic_grades;
CREATE TRIGGER tr_on_grade_change
AFTER INSERT OR UPDATE ON academic_grades
FOR EACH ROW
EXECUTE FUNCTION fn_on_grade_change();


-- B. Trigger untuk laporan perundungan baru (ke Guru BK)
-- CATATAN: Ditempelkan ke tabel fisik 'bullying_reports_secure' karena 'bullying_reports' adalah VIEW
CREATE OR REPLACE FUNCTION fn_on_bullying_report_insert()
RETURNS TRIGGER AS $$
DECLARE
  counselor_record RECORD;
  student_school TEXT;
BEGIN
  SELECT school_id INTO student_school FROM profiles WHERE id = NEW.reporter_id;
  
  FOR counselor_record IN 
    SELECT id FROM profiles WHERE role = 'counselor' AND school_id = student_school
  LOOP
    INSERT INTO notifications (user_id, title, content, type)
    VALUES (
      counselor_record.id,
      'Laporan Perundungan Baru',
      'Ada laporan perundungan baru yang masuk. Silakan periksa modul Laporan.',
      'bullying_report'
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_bullying_report_insert ON bullying_reports_secure;
CREATE TRIGGER tr_on_bullying_report_insert
AFTER INSERT ON bullying_reports_secure
FOR EACH ROW
EXECUTE FUNCTION fn_on_bullying_report_insert();


-- C. Trigger untuk perubahan status laporan perundungan (ke siswa)
-- CATATAN: Ditempelkan ke tabel fisik 'bullying_reports_secure' karena 'bullying_reports' adalah VIEW
CREATE OR REPLACE FUNCTION fn_on_bullying_report_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, content, type)
    VALUES (
      NEW.reporter_id,
      'Pembaruan Status Laporan',
      'Status laporan perundungan Anda telah diperbarui oleh Guru BK menjadi: ' || 
        CASE NEW.status
          WHEN 'pending' THEN 'Menunggu'
          WHEN 'in_review' THEN 'Sedang Ditinjau'
          WHEN 'resolved' THEN 'Selesai Ditangani'
          WHEN 'escalated' THEN 'Ditingkatkan'
          ELSE NEW.status
        END || '.',
      'bullying_report'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_bullying_report_status_change ON bullying_reports_secure;
CREATE TRIGGER tr_on_bullying_report_status_change
AFTER UPDATE ON bullying_reports_secure
FOR EACH ROW
EXECUTE FUNCTION fn_on_bullying_report_status_change();


-- D. Trigger untuk peringatan krisis/early warning baru (ke Guru BK)
CREATE OR REPLACE FUNCTION fn_on_alert_insert()
RETURNS TRIGGER AS $$
DECLARE
  counselor_record RECORD;
  student_school TEXT;
BEGIN
  -- Hanya krisis tingkat tinggi/kritis yang dipicu notifikasi lonceng
  IF NEW.severity IN ('high', 'critical') THEN
    SELECT school_id INTO student_school FROM profiles WHERE id = NEW.student_id;
    
    FOR counselor_record IN 
      SELECT id FROM profiles WHERE role = 'counselor' AND school_id = student_school
    LOOP
      INSERT INTO notifications (user_id, title, content, type)
      VALUES (
        counselor_record.id,
        'Peringatan Krisis Baru!',
        'Terdeteksi kondisi krisis pada siswa (' || 
          CASE NEW.alert_type
            WHEN 'mood_decline' THEN 'Penurunan Mood Tajam'
            WHEN 'depression_risk' THEN 'Risiko Depresi Tinggi'
            WHEN 'bullying_report' THEN 'Perundungan Kritis'
            WHEN 'inactivity' THEN 'Ketidakaktifan Berbahaya'
            WHEN 'crisis_language' THEN 'Pernyataan Krisis'
            ELSE NEW.alert_type
          END || '). Buka menu Peringatan segera.',
        'alert'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_alert_insert ON alerts;
CREATE TRIGGER tr_on_alert_insert
AFTER INSERT ON alerts
FOR EACH ROW
EXECUTE FUNCTION fn_on_alert_insert();
