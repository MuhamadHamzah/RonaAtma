-- ============================================================
-- SEED: Demo Accounts for Jury Testing (RonaAtma) — v2
-- Idempotent: aman dijalankan berkali-kali
-- Jalankan di Supabase Dashboard → SQL Editor
-- ============================================================

DO $$
DECLARE
  v_student_id    UUID;
  v_counselor_id  UUID;
  v_student2_id   UUID;
  v_school_id     TEXT := 'SCHOOL_DEFAULT';
  v_password_hash TEXT;
  v_post1_id      UUID;
  v_post2_id      UUID;
  v_post3_id      UUID;
BEGIN

  -- Generate hash password yang valid untuk "JuriDemo2026!" menggunakan pgcrypto
  v_password_hash := crypt('JuriDemo2026!', gen_salt('bf'));

  -- ----------------------------------------------------------------
  -- 1. UPSERT AUTH USERS — ambil UUID yang ada, buat baru jika belum
  -- ----------------------------------------------------------------

  -- Siswa Juri
  SELECT id INTO v_student_id FROM auth.users WHERE email = 'juri.siswa@sekolah.sch.id' LIMIT 1;
  IF v_student_id IS NULL THEN
    v_student_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change, last_sign_in_at
    ) VALUES (
      v_student_id, '00000000-0000-0000-0000-000000000000',
      'juri.siswa@sekolah.sch.id', v_password_hash, now(),
      'authenticated', 'authenticated', now(), now(),
      '{"provider":"email","providers":["email"]}', '{}',
      false, '', '', '', '', now()
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
    VALUES (
      gen_random_uuid(), v_student_id,
      json_build_object('sub', v_student_id::text, 'email', 'juri.siswa@sekolah.sch.id')::jsonb,
      'email', now(), now(), now(), 'juri.siswa@sekolah.sch.id'
    ) ON CONFLICT DO NOTHING;
  ELSE
    -- Update password supaya bisa login dengan JuriDemo2026!
    UPDATE auth.users SET encrypted_password = v_password_hash, email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now()
    WHERE id = v_student_id;
  END IF;

  -- Guru BK Juri
  SELECT id INTO v_counselor_id FROM auth.users WHERE email = 'juri.guru@sekolah.sch.id' LIMIT 1;
  IF v_counselor_id IS NULL THEN
    v_counselor_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change, last_sign_in_at
    ) VALUES (
      v_counselor_id, '00000000-0000-0000-0000-000000000000',
      'juri.guru@sekolah.sch.id', v_password_hash, now(),
      'authenticated', 'authenticated', now(), now(),
      '{"provider":"email","providers":["email"]}', '{}',
      false, '', '', '', '', now()
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
    VALUES (
      gen_random_uuid(), v_counselor_id,
      json_build_object('sub', v_counselor_id::text, 'email', 'juri.guru@sekolah.sch.id')::jsonb,
      'email', now(), now(), now(), 'juri.guru@sekolah.sch.id'
    ) ON CONFLICT DO NOTHING;
  ELSE
    UPDATE auth.users SET encrypted_password = v_password_hash, email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now()
    WHERE id = v_counselor_id;
  END IF;

  -- Siswa Demo tambahan
  SELECT id INTO v_student2_id FROM auth.users WHERE email = 'siswa.demo@sekolah.sch.id' LIMIT 1;
  IF v_student2_id IS NULL THEN
    v_student2_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change, last_sign_in_at
    ) VALUES (
      v_student2_id, '00000000-0000-0000-0000-000000000000',
      'siswa.demo@sekolah.sch.id', v_password_hash, now(),
      'authenticated', 'authenticated', now(), now(),
      '{"provider":"email","providers":["email"]}', '{}',
      false, '', '', '', '', now()
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
    VALUES (
      gen_random_uuid(), v_student2_id,
      json_build_object('sub', v_student2_id::text, 'email', 'siswa.demo@sekolah.sch.id')::jsonb,
      'email', now(), now(), now(), 'siswa.demo@sekolah.sch.id'
    ) ON CONFLICT DO NOTHING;
  ELSE
    UPDATE auth.users SET encrypted_password = v_password_hash, email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now()
    WHERE id = v_student2_id;
  END IF;

  -- ----------------------------------------------------------------
  -- 2. PROFILES — upsert berdasarkan UUID yang sudah kita dapat
  -- ----------------------------------------------------------------
  INSERT INTO profiles (id, full_name, role, school_id, class_name, pseudonymous_id, consent_given, email, wallet_address, created_at, updated_at)
  VALUES
    (v_student_id,   'Juri Siswa (Demo)',         'student',   v_school_id, 'XII IPA 1', '0xjuri01' || substring(v_student_id::text, 1, 32),   true, 'juri.siswa@sekolah.sch.id',  NULL, now(), now()),
    (v_counselor_id, 'Bpk. Juri Guru BK (Demo)', 'counselor', v_school_id, NULL,        '0xjuri02' || substring(v_counselor_id::text, 1, 32), true, 'juri.guru@sekolah.sch.id',   NULL, now(), now()),
    (v_student2_id,  'Siswa Demo Lainnya',        'student',   v_school_id, 'XII IPS 2', '0xdemo03' || substring(v_student2_id::text, 1, 32),  true, 'siswa.demo@sekolah.sch.id',  NULL, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    full_name     = EXCLUDED.full_name,
    role          = EXCLUDED.role,
    school_id     = EXCLUDED.school_id,
    class_name    = EXCLUDED.class_name,
    consent_given = true,
    updated_at    = now();

  -- ----------------------------------------------------------------
  -- 3. MOOD ENTRIES (hapus dulu yang lama lalu insert ulang)
  -- ----------------------------------------------------------------
  DELETE FROM mood_entries WHERE student_id IN (v_student_id, v_student2_id);

  INSERT INTO mood_entries (student_id, journal_text, mood_score, ai_sentiment_score, depression_risk_level, ai_feedback, ai_keywords, created_at)
  VALUES
    (v_student_id, 'Hari ini cukup berat. Tugas menumpuk dan saya merasa kewalahan. Tidur tidak nyenyak semalam.', 4, -0.45, 'medium',
     'Kamu tampaknya sedang mengalami tekanan akademik. Cobalah istirahat sejenak dan bagi tugasmu menjadi bagian kecil. Kamu tidak sendirian!',
     ARRAY['kewalahan', 'tugas', 'tidur', 'tekanan'], now() - INTERVAL '6 days'),

    (v_student_id, 'Lumayan lebih baik hari ini. Berhasil menyelesaikan 2 tugas. Teman-teman di kelas sangat supportif.', 6, 0.30, 'low',
     'Bagus! Setiap kemajuan kecil itu berarti. Terus jaga semangat dan jadikan dukungan teman-temanmu sebagai motivasi.',
     ARRAY['teman', 'supportif', 'tugas', 'motivasi'], now() - INTERVAL '5 days'),

    (v_student_id, 'Ada masalah dengan teman sekelas. Merasa dikucilkan dari grup belajar. Tidak tahu harus bicara ke siapa.', 3, -0.72, 'high',
     'Perasaan dikucilkan sangat menyakitkan. Berani bicara adalah langkah hebat — pertimbangkan untuk berbagi dengan BK atau orang yang kamu percaya.',
     ARRAY['dikucilkan', 'teman', 'grup', 'kesepian'], now() - INTERVAL '4 days'),

    (v_student_id, 'Berbicara dengan guru BK tadi. Merasa sedikit lebih lega. Semoga masalah dengan teman bisa diselesaikan.', 5, 0.10, 'medium',
     'Sangat berani! Langkah berbicara dengan BK adalah tanda kekuatan, bukan kelemahan. Semoga situasinya segera membaik.',
     ARRAY['guru BK', 'lega', 'harapan', 'penyelesaian'], now() - INTERVAL '3 days'),

    (v_student_id, 'Hari ini lebih menyenangkan. Ikut ekskul musik dan sangat menikmatinya. Lupa sejenak dari masalah.', 7, 0.65, 'low',
     'Aktivitas kreatif seperti musik adalah terapi yang luar biasa! Terus jaga keseimbangan antara kesenangan dan kewajiban.',
     ARRAY['ekskul', 'musik', 'menyenangkan', 'kreatif'], now() - INTERVAL '2 days'),

    (v_student_id, 'Ujian tengah semester minggu depan. Sedikit cemas tapi sudah mulai belajar. Semangat!', 6, 0.20, 'low',
     'Kecemasan sebelum ujian itu normal! Yang penting kamu sudah mempersiapkan diri. Percaya pada kemampuanmu.',
     ARRAY['ujian', 'cemas', 'belajar', 'semangat'], now() - INTERVAL '1 day'),

    (v_student_id, 'Hari yang produktif. Belajar kelompok bersama teman-teman baru. Merasa lebih diterima di lingkungan kelas.', 8, 0.80, 'low',
     'Luar biasa! Membangun koneksi sosial yang positif sangat penting untuk kesejahteraan jiwa. Terus pertahankan!',
     ARRAY['produktif', 'belajar kelompok', 'diterima', 'positif'], now()),

    (v_student2_id, 'Merasa tertekan dengan ekspektasi orang tua. Nilai harus selalu sempurna. Takut mengecewakan mereka.', 3, -0.68, 'high',
     'Tekanan dari harapan orang lain bisa sangat berat. Ingat bahwa kamu berharga bukan hanya dari nilaimu.',
     ARRAY['tekanan', 'orang tua', 'ekspektasi', 'takut'], now() - INTERVAL '3 days'),

    (v_student2_id, 'Sedikit lebih baik. Bicara dengan kakak tentang perasaan saya. Merasa lebih ringan.', 6, 0.35, 'medium',
     'Berbagi perasaan dengan orang yang dipercaya adalah langkah luar biasa. Terus bangun support system yang kuat.',
     ARRAY['kakak', 'berbagi', 'lebih ringan', 'support'], now() - INTERVAL '1 day');

  -- ----------------------------------------------------------------
  -- 4. BULLYING REPORTS
  -- ----------------------------------------------------------------
  DELETE FROM bullying_reports WHERE reporter_id IN (v_student_id, v_student2_id);

  INSERT INTO bullying_reports (reporter_id, victim_pseudonymous_id, incident_type, description, incident_date, location, perpetrator_description, status, on_chain_hash, created_at, updated_at)
  VALUES
    (v_student_id,  '0xvictim01234567890abcdef', 'cyberbullying',
     'Teman saya diolok-olok di grup WhatsApp kelas. Banyak yang mengirim meme menghina dan menertawakannya. Ini sudah berlangsung selama 2 minggu dan korban terlihat sangat tertekan.',
     CURRENT_DATE - INTERVAL '5 days', 'Grup WhatsApp XII IPA 1',
     'Beberapa siswa kelas XII, terlihat dikoordinir oleh siswa inisial RD',
     'in_review', '0xabc123def456abc789def012abc345def678abc901def234abc567def890abc1',
     now() - INTERVAL '4 days', now() - INTERVAL '2 days'),

    (v_student2_id, '0xvictim09876543210fedcba', 'verbal_abuse',
     'Di kantin ada siswa yang terus-terusan mengejek nama panggilan saya dan teman-teman saya yang lain. Sudah terjadi hampir setiap hari. Kami merasa tidak nyaman ke kantin.',
     CURRENT_DATE - INTERVAL '2 days', 'Kantin Sekolah',
     'Siswa kelas XI, berambut pendek, sering bergerombol',
     'pending', '0xdef456abc123def789abc012def345abc678def901abc234def567abc890def1',
     now() - INTERVAL '1 day', now() - INTERVAL '1 day');

  -- ----------------------------------------------------------------
  -- 5. FORUM POSTS
  -- ----------------------------------------------------------------
  DELETE FROM forum_replies WHERE post_id IN (
    SELECT id FROM forum_posts WHERE author_id IN (v_student_id, v_student2_id)
  );
  DELETE FROM forum_posts WHERE author_id IN (v_student_id, v_student2_id);

  INSERT INTO forum_posts (id, author_id, category, title, content, moderation_status, upvotes, reply_count, is_anonymous, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_student_id, 'curhat',
     'Merasa tidak diterima di kelas baru — apakah normal?',
     'Saya baru pindah ke sekolah ini semester ini dan masih merasa kesulitan untuk masuk ke lingkaran pertemanan. Setiap kali makan siang, saya makan sendirian. Apakah ada yang pernah merasakan hal yang sama? Bagaimana cara kalian mengatasinya?',
     'approved', 12, 5, true, now() - INTERVAL '5 days', now() - INTERVAL '3 days'),

    (gen_random_uuid(), v_student2_id, 'motivasi',
     'Tips mengelola stres menjelang ujian dari pengalaman saya',
     'Setelah gagal di ujian semester lalu karena panik, saya belajar beberapa teknik: 1) Buat jadwal belajar yang realistis, 2) Teknik Pomodoro (25 menit fokus, 5 menit istirahat), 3) Tidur cukup lebih penting dari belajar semalaman. Semoga membantu!',
     'approved', 28, 8, false, now() - INTERVAL '3 days', now() - INTERVAL '1 day'),

    (gen_random_uuid(), v_student_id, 'tanya_jawab',
     'Bagaimana cara cerita ke guru BK tanpa terasa canggung?',
     'Saya punya masalah yang cukup serius tapi takut untuk bicara ke guru BK. Khawatir dianggap lebay atau malah jadi gossip. Apakah ada yang sudah pernah ke BK? Bagaimana pengalamannya?',
     'approved', 19, 11, true, now() - INTERVAL '2 days', now());

  -- ----------------------------------------------------------------
  -- 6. ALERTS
  -- ----------------------------------------------------------------
  DELETE FROM alerts WHERE student_id IN (v_student_id, v_student2_id);

  INSERT INTO alerts (student_id, alert_type, severity, title, description, ai_score, is_read, is_resolved, triggered_at)
  VALUES
    (v_student_id, 'depression_risk', 'high',
     'Risiko Depresi Terdeteksi — Perlu Perhatian',
     'AI mendeteksi pola mood menurun selama 3 hari berturut-turut (skor 3-4/10). Kata kunci: "dikucilkan", "tidak tahu harus bicara ke siapa". Disarankan untuk melakukan pendekatan langsung.',
     0.72, false, false, now() - INTERVAL '3 days'),

    (v_student2_id, 'crisis_language', 'critical',
     'Bahasa Krisis Terdeteksi dalam Jurnal',
     'AI mendeteksi ekspresi tekanan ekstrem: "takut mengecewakan", "tekanan dari ekspektasi". Diperlukan tindak lanjut segera dari konselor.',
     0.88, false, false, now() - INTERVAL '2 days'),

    (v_student_id, 'bullying_report', 'medium',
     'Laporan Bullying Baru Diterima',
     'Siswa melaporkan insiden cyberbullying yang melibatkan grup WhatsApp kelas. Status: sedang ditinjau. Hash laporan telah dianchor ke blockchain ICP.',
     0.65, true, false, now() - INTERVAL '4 days');

  -- ----------------------------------------------------------------
  -- 7. ACADEMIC GRADES
  -- ----------------------------------------------------------------
  DELETE FROM academic_grades WHERE student_id IN (v_student_id, v_student2_id);

  INSERT INTO academic_grades (student_id, subject, score, term, inputted_by, created_at, updated_at)
  VALUES
    (v_student_id, 'Matematika',       72.50, 'Semester 1 2025/2026', v_counselor_id, now() - INTERVAL '10 days', now()),
    (v_student_id, 'Bahasa Indonesia', 85.00, 'Semester 1 2025/2026', v_counselor_id, now() - INTERVAL '10 days', now()),
    (v_student_id, 'Fisika',           68.00, 'Semester 1 2025/2026', v_counselor_id, now() - INTERVAL '10 days', now()),
    (v_student_id, 'Kimia',            74.50, 'Semester 1 2025/2026', v_counselor_id, now() - INTERVAL '10 days', now()),
    (v_student_id, 'Biologi',          80.00, 'Semester 1 2025/2026', v_counselor_id, now() - INTERVAL '10 days', now()),
    (v_student_id, 'Bahasa Inggris',   88.00, 'Semester 1 2025/2026', v_counselor_id, now() - INTERVAL '10 days', now()),
    (v_student_id, 'Sejarah',          79.00, 'Semester 1 2025/2026', v_counselor_id, now() - INTERVAL '10 days', now()),
    (v_student2_id,'Matematika',       65.00, 'Semester 1 2025/2026', v_counselor_id, now() - INTERVAL '10 days', now()),
    (v_student2_id,'Bahasa Indonesia', 78.00, 'Semester 1 2025/2026', v_counselor_id, now() - INTERVAL '10 days', now()),
    (v_student2_id,'Ekonomi',          82.00, 'Semester 1 2025/2026', v_counselor_id, now() - INTERVAL '10 days', now()),
    (v_student2_id,'Sosiologi',        88.50, 'Semester 1 2025/2026', v_counselor_id, now() - INTERVAL '10 days', now()),
    (v_student2_id,'Bahasa Inggris',   75.00, 'Semester 1 2025/2026', v_counselor_id, now() - INTERVAL '10 days', now());

  -- ----------------------------------------------------------------
  -- 8. CHATBOT MESSAGES
  -- ----------------------------------------------------------------
  DELETE FROM chatbot_messages WHERE student_id = v_student_id;

  INSERT INTO chatbot_messages (student_id, role, content, crisis_detected, created_at)
  VALUES
    (v_student_id, 'user',      'Halo, saya merasa sangat stres akhir-akhir ini. Tidak tahu harus mulai dari mana.', false, now() - INTERVAL '3 days'),
    (v_student_id, 'assistant', 'Halo! Saya di sini untuk mendengarkan kamu. Stres itu wajar dialami, dan berani berbagi adalah langkah pertama yang hebat. Boleh ceritakan lebih lanjut apa yang sedang membuat kamu merasa berat?', false, now() - INTERVAL '3 days'),
    (v_student_id, 'user',      'Saya merasa dikucilkan oleh teman-teman di kelas. Setiap kali mau bergabung mereka terlihat tidak senang.', false, now() - INTERVAL '3 days'),
    (v_student_id, 'assistant', 'Perasaan dikucilkan itu sangat menyakitkan. Kamu tidak sendirian — banyak orang pernah merasakan hal ini. Ada beberapa hal yang bisa dicoba: temukan 1-2 orang yang terbuka untuk berteman; ikuti ekskul untuk menemukan teman berminat sama; dan jangan ragu untuk bicara dengan guru BK. Apakah ada seseorang di sekolah yang kamu rasa bisa dipercaya?', false, now() - INTERVAL '3 days'),
    (v_student_id, 'user',      'Mungkin guru BK ya. Tapi saya malu mau ke sana.', false, now() - INTERVAL '3 days'),
    (v_student_id, 'assistant', 'Rasa malu itu sangat normal! Tapi guru BK ada khusus untuk membantu siswa seperti kamu. Mereka terlatih mendengarkan tanpa menghakimi. Keberanian untuk mencari bantuan adalah tanda kekuatan, bukan kelemahan. Kamu sudah ambil langkah besar dengan berbicara di sini! 💙', false, now() - INTERVAL '3 days');

  -- ----------------------------------------------------------------
  -- 9. DIGITAL BADGES (SBT)
  -- ----------------------------------------------------------------
  DELETE FROM digital_badges WHERE student_id = v_student_id;

  INSERT INTO digital_badges (student_id, badge_type, minted_tx, on_chain_hash, minted_at)
  VALUES (
    v_student_id, 'resilience',
    'icp-tx-resilience-' || replace(v_student_id::text, '-', ''),
    '0xresil01hash02abc03def04abc05def06abc07def08abc09def10abc11def12' || substring(v_student_id::text, 1, 2),
    now() - INTERVAL '2 days'
  );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Seed data demo berhasil dimasukkan!';
  RAISE NOTICE 'Email Siswa Juri    : juri.siswa@sekolah.sch.id';
  RAISE NOTICE 'Email Guru BK Juri  : juri.guru@sekolah.sch.id';
  RAISE NOTICE 'Password (keduanya) : JuriDemo2026!';
  RAISE NOTICE 'Student UUID        : %', v_student_id;
  RAISE NOTICE 'Counselor UUID      : %', v_counselor_id;
  RAISE NOTICE '========================================';

END $$;
