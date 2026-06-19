import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);
  
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Konfirmasi kata sandi tidak cocok.');
    }
    if (!consent) {
      return setError('Anda harus memberikan persetujuan privasi data.');
    }

    setLoading(true);
    const { error: signUpError } = await signUp(email, password, fullName, 'student', className);
    setLoading(false);
    
    if (signUpError) {
      setError(signUpError);
    } else {
      navigate('/student');
    }
  }

  return (
    <div className="min-h-screen flex bg-cosmic-bg text-[#F0F4FF] relative overflow-hidden">
      {/* Background radial ambient lights */}
      <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-accent-purple/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-accent-teal/5 rounded-full blur-[100px]" />

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-cosmic-card1/30 border-r border-cosmic-border/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src="/RonaAtma.jpeg" alt="RonaAtma" className="w-12 h-12 rounded-xl object-cover border border-cosmic-border" />
          <span className="font-display font-bold bg-gradient-to-r from-accent-purple to-accent-teal bg-clip-text text-transparent text-2xl">RonaAtma</span>
        </div>

        <div className="my-auto py-12 max-w-md space-y-6">
          <h1 className="font-display font-bold text-4xl tracking-tight leading-tight gradient-text-purple">
            Mulai Perjalanan<br />Kesehatan Jiwamu.
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            Dapatkan akses penuh ke AI mood analyzer, asisten empati real-time, forum rahasia, serta sistem pelaporan perundungan berkeamanan tinggi.
          </p>
          <div className="p-4 rounded-xl bg-[#121A30]/60 border border-[#1E2D4A] flex gap-3">
            <ShieldAlert size={20} className="text-accent-teal flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#F0F4FF] uppercase tracking-wide">Privasi Dijamin Kriptografi</p>
              <p className="text-xs text-text-secondary">Identitas aslimu disembunyikan menggunakan pseudonymous ID unik yang dienkripsi pada blockchain audit trail.</p>
            </div>
          </div>
        </div>

        <p className="text-[#3D4F7A] text-xs">© 2026 RonaAtma. Data terenkripsi & aman.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 z-10 overflow-y-auto">
        <div className="w-full max-w-md space-y-6 my-8">
          <div className="text-center lg:text-left space-y-2">
            <h2 className="font-display font-bold text-2xl tracking-tight gradient-text-teal">Buat Akun Siswa</h2>
            <p className="text-text-secondary text-sm">Lengkapi formulir di bawah untuk mendaftar</p>
          </div>

          <form onSubmit={handleSubmit} className="card-luminous p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">Nama Lengkap</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Budi Utomo" className="input" required />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">Kelas (Opsional)</label>
                <input type="text" value={className} onChange={e => setClassName(e.target.value)}
                  placeholder="XI MIPA 1" className="input" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">Email Sekolah</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="budi@sekolah.sch.id" className="input" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">Kata Sandi</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" className="input pr-10" required />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-[#3ECFB2]">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">Konfirmasi</label>
                <input type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" className="input" required />
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer mt-2">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                className="mt-1 accent-accent-teal" />
              <span className="text-[11px] text-text-secondary leading-normal">
                Saya menyetujui bahwa data mood dan laporan saya disimpan secara pseudonim untuk keperluan bimbingan konseling demi perlindungan saya.
              </span>
            </label>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-accent-coral/15 border border-accent-coral/30 text-accent-coral text-xs font-semibold">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-sm tracking-wide uppercase font-bold mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Pendaftaran...
                </span>
              ) : 'Daftar Sekarang'}
            </button>
          </form>

          <p className="text-center text-sm text-[#7B8EC8]">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-accent-teal hover:text-accent-lavender font-bold transition-colors">Masuk di sini</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
