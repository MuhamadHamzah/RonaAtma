-- 1. Enable pgcrypto if not enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Migrate mood_entries to mood_entries_secure and create transparent view
ALTER TABLE mood_entries RENAME TO mood_entries_secure;

-- Add the encrypted column
ALTER TABLE mood_entries_secure ADD COLUMN encrypted_journal_text TEXT;

-- Encrypt existing plaintext data
UPDATE mood_entries_secure 
SET encrypted_journal_text = encode(pgp_sym_encrypt(journal_text, 'ronaatma_secret_key_2026'), 'base64');

-- Make it NOT NULL after population (if it has existing records)
ALTER TABLE mood_entries_secure ALTER COLUMN encrypted_journal_text SET NOT NULL;

-- Drop the original column
ALTER TABLE mood_entries_secure DROP COLUMN journal_text;

-- Create the transparent view (inherits invoker RLS permissions via security_invoker = true)
CREATE OR REPLACE VIEW mood_entries WITH (security_invoker = true) AS
SELECT
  id,
  student_id,
  CASE
    WHEN auth.role() = 'service_role' OR auth.role() = 'superuser' THEN
      pgp_sym_decrypt(decode(encrypted_journal_text, 'base64'), 'ronaatma_secret_key_2026')
    WHEN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'counselor') THEN
      pgp_sym_decrypt(decode(encrypted_journal_text, 'base64'), 'ronaatma_secret_key_2026')
    WHEN student_id = auth.uid() THEN
      pgp_sym_decrypt(decode(encrypted_journal_text, 'base64'), 'ronaatma_secret_key_2026')
    ELSE
      '***ENCRYPTED***'
  END AS journal_text,
  mood_score,
  ai_sentiment_score,
  depression_risk_level,
  ai_feedback,
  ai_keywords,
  on_chain_hash,
  blockchain_tx_id,
  icp_anchor_id,
  created_at
FROM mood_entries_secure;

-- Create trigger functions for view writes (transparent view behavior)
CREATE OR REPLACE FUNCTION insert_mood_entry_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO mood_entries_secure (
    id, student_id, mood_score, ai_sentiment_score, depression_risk_level,
    ai_feedback, ai_keywords, on_chain_hash, blockchain_tx_id, icp_anchor_id, created_at,
    encrypted_journal_text
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.student_id,
    NEW.mood_score,
    NEW.ai_sentiment_score,
    NEW.depression_risk_level,
    NEW.ai_feedback,
    NEW.ai_keywords,
    NEW.on_chain_hash,
    NEW.blockchain_tx_id,
    NEW.icp_anchor_id,
    COALESCE(NEW.created_at, now()),
    encode(pgp_sym_encrypt(NEW.journal_text, 'ronaatma_secret_key_2026'), 'base64')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mood_entries_insert_trigger
INSTEAD OF INSERT ON mood_entries
FOR EACH ROW EXECUTE FUNCTION insert_mood_entry_trigger();

CREATE OR REPLACE FUNCTION update_mood_entry_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mood_entries_secure SET
    mood_score = NEW.mood_score,
    ai_sentiment_score = NEW.ai_sentiment_score,
    depression_risk_level = NEW.depression_risk_level,
    ai_feedback = NEW.ai_feedback,
    ai_keywords = NEW.ai_keywords,
    on_chain_hash = NEW.on_chain_hash,
    blockchain_tx_id = NEW.blockchain_tx_id,
    icp_anchor_id = NEW.icp_anchor_id,
    encrypted_journal_text = CASE 
      WHEN NEW.journal_text IS DISTINCT FROM OLD.journal_text 
      THEN encode(pgp_sym_encrypt(NEW.journal_text, 'ronaatma_secret_key_2026'), 'base64')
      ELSE encrypted_journal_text
    END
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mood_entries_update_trigger
INSTEAD OF UPDATE ON mood_entries
FOR EACH ROW EXECUTE FUNCTION update_mood_entry_trigger();

CREATE OR REPLACE FUNCTION delete_mood_entry_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM mood_entries_secure WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mood_entries_delete_trigger
INSTEAD OF DELETE ON mood_entries
FOR EACH ROW EXECUTE FUNCTION delete_mood_entry_trigger();


-- 3. Migrate bullying_reports to bullying_reports_secure and create transparent view
ALTER TABLE bullying_reports RENAME TO bullying_reports_secure;

-- Add the encrypted column
ALTER TABLE bullying_reports_secure ADD COLUMN encrypted_description TEXT;

-- Encrypt existing plaintext data
UPDATE bullying_reports_secure 
SET encrypted_description = encode(pgp_sym_encrypt(description, 'ronaatma_secret_key_2026'), 'base64');

-- Make it NOT NULL after population (if it has existing records)
ALTER TABLE bullying_reports_secure ALTER COLUMN encrypted_description SET NOT NULL;

-- Drop the original column
ALTER TABLE bullying_reports_secure DROP COLUMN description;

-- Create the transparent view
CREATE OR REPLACE VIEW bullying_reports WITH (security_invoker = true) AS
SELECT
  id,
  reporter_id,
  victim_pseudonymous_id,
  incident_type,
  CASE
    WHEN auth.role() = 'service_role' OR auth.role() = 'superuser' THEN
      pgp_sym_decrypt(decode(encrypted_description, 'base64'), 'ronaatma_secret_key_2026')
    WHEN EXISTS (
      SELECT 1 FROM profiles c
      JOIN profiles s ON s.id = reporter_id
      WHERE c.id = auth.uid()
        AND c.role = 'counselor'
        AND c.school_id = s.school_id
    ) THEN
      pgp_sym_decrypt(decode(encrypted_description, 'base64'), 'ronaatma_secret_key_2026')
    WHEN reporter_id = auth.uid() THEN
      pgp_sym_decrypt(decode(encrypted_description, 'base64'), 'ronaatma_secret_key_2026')
    ELSE
      '***ENCRYPTED***'
  END AS description,
  incident_date,
  location,
  perpetrator_description,
  status,
  bk_notes,
  on_chain_hash,
  blockchain_tx_id,
  icp_anchor_id,
  created_at,
  updated_at
FROM bullying_reports_secure;

-- Create trigger functions for view writes (transparent view behavior)
CREATE OR REPLACE FUNCTION insert_bullying_report_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO bullying_reports_secure (
    id, reporter_id, victim_pseudonymous_id, incident_type,
    incident_date, location, perpetrator_description, status,
    bk_notes, on_chain_hash, blockchain_tx_id, icp_anchor_id,
    created_at, updated_at, encrypted_description
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.reporter_id,
    NEW.victim_pseudonymous_id,
    NEW.incident_type,
    NEW.incident_date,
    NEW.location,
    NEW.perpetrator_description,
    NEW.status,
    NEW.bk_notes,
    NEW.on_chain_hash,
    NEW.blockchain_tx_id,
    NEW.icp_anchor_id,
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.updated_at, now()),
    encode(pgp_sym_encrypt(NEW.description, 'ronaatma_secret_key_2026'), 'base64')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bullying_reports_insert_trigger
INSTEAD OF INSERT ON bullying_reports
FOR EACH ROW EXECUTE FUNCTION insert_bullying_report_trigger();

CREATE OR REPLACE FUNCTION update_bullying_report_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bullying_reports_secure SET
    reporter_id = NEW.reporter_id,
    victim_pseudonymous_id = NEW.victim_pseudonymous_id,
    incident_type = NEW.incident_type,
    incident_date = NEW.incident_date,
    location = NEW.location,
    perpetrator_description = NEW.perpetrator_description,
    status = NEW.status,
    bk_notes = NEW.bk_notes,
    on_chain_hash = NEW.on_chain_hash,
    blockchain_tx_id = NEW.blockchain_tx_id,
    icp_anchor_id = NEW.icp_anchor_id,
    updated_at = COALESCE(NEW.updated_at, now()),
    encrypted_description = CASE 
      WHEN NEW.description IS DISTINCT FROM OLD.description 
      THEN encode(pgp_sym_encrypt(NEW.description, 'ronaatma_secret_key_2026'), 'base64')
      ELSE encrypted_description
    END
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bullying_reports_update_trigger
INSTEAD OF UPDATE ON bullying_reports
FOR EACH ROW EXECUTE FUNCTION update_bullying_report_trigger();

CREATE OR REPLACE FUNCTION delete_bullying_report_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM bullying_reports_secure WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bullying_reports_delete_trigger
INSTEAD OF DELETE ON bullying_reports
FOR EACH ROW EXECUTE FUNCTION delete_bullying_report_trigger();


-- 4. Create forum_posts_view to handle anonymity securely at the DB level
CREATE OR REPLACE VIEW forum_posts_view WITH (security_invoker = true) AS
SELECT
  id,
  CASE WHEN is_anonymous = true THEN NULL ELSE author_id END as author_id,
  category,
  content,
  title,
  moderation_status,
  moderation_reason,
  upvotes,
  reply_count,
  is_anonymous,
  created_at,
  updated_at
FROM forum_posts;


-- 5. Set up secure database-level rate limiting function and triggers
CREATE OR REPLACE FUNCTION enforce_rate_limit(p_user_id UUID, p_action_type TEXT, p_max_count INT, p_error_msg TEXT)
RETURNS VOID AS $$
DECLARE
  v_limit_id UUID;
  v_count INT;
  v_window_start TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Select existing limit
  SELECT id, count, window_start INTO v_limit_id, v_count, v_window_start
  FROM rate_limits
  WHERE user_id = p_user_id AND action_type = p_action_type;

  IF v_limit_id IS NOT NULL THEN
    IF v_window_start > (v_now - INTERVAL '1 hour') THEN
      IF v_count >= p_max_count THEN
        RAISE EXCEPTION '%', p_error_msg;
      ELSE
        UPDATE rate_limits SET count = count + 1 WHERE id = v_limit_id;
      END IF;
    ELSE
      UPDATE rate_limits SET count = 1, window_start = v_now WHERE id = v_limit_id;
    END IF;
  ELSE
    INSERT INTO rate_limits (user_id, action_type, count, window_start)
    VALUES (p_user_id, p_action_type, 1, v_now);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for forum posts
CREATE OR REPLACE FUNCTION check_forum_post_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only rate limit student users (counselors shouldn't be rate limited)
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student') THEN
    PERFORM enforce_rate_limit(
      auth.uid(),
      'forum_post_create',
      5,
      'Batas pembuatan postingan terlampaui (maksimal 5 postingan per jam). Silakan coba lagi nanti.'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER forum_posts_rate_limit_trigger
BEFORE INSERT ON forum_posts
FOR EACH ROW EXECUTE FUNCTION check_forum_post_rate_limit();

-- Trigger for bullying reports
CREATE OR REPLACE FUNCTION check_bullying_report_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only rate limit student users
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student') THEN
    PERFORM enforce_rate_limit(
      auth.uid(),
      'bullying_report_submit',
      3,
      'Batas pelaporan bullying terlampaui (maksimal 3 laporan per jam). Silakan coba lagi nanti.'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER bullying_reports_rate_limit_trigger
BEFORE INSERT ON bullying_reports_secure
FOR EACH ROW EXECUTE FUNCTION check_bullying_report_rate_limit();
