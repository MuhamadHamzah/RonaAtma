-- ============================================================
-- MIGRATION: Auto-Create Profile Trigger
-- Penjelasan: Secara otomatis membuat baris baru di tabel public.profiles
-- ketika user baru berhasil mendaftar (sign up) di auth.users.
-- Sangat berguna ketika email confirmation aktif sehingga user belum log in.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    school_id,
    class_name,
    pseudonymous_id,
    consent_given,
    email
  ) VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Siswa Baru'),
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    'SCHOOL_DEFAULT',
    new.raw_user_meta_data->>'class_name',
    'pending-' || new.id::text,
    true,
    new.email
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Buat trigger setelah insert ke auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
