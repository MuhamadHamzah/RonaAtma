import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Brain, Shield, Users, Zap, Fingerprint, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import SoulOrb from '../../components/SoulOrb';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickLoginLoading, setQuickLoginLoading] = useState<'student' | 'counselor' | null>(null);

  useEffect(() => {
    // Handle "Remember Me" session checks
    const rememberFlag = localStorage.getItem('remember_me');
    const sessionActive = sessionStorage.getItem('is_session_active');

    // If remember me is unchecked and this is a new browser/tab session, force sign out to clear persisted tokens
    if (rememberFlag !== 'true' && sessionActive !== 'true') {
      supabase.auth.signOut().then(() => {
        // clear local profile and session states if any
      });
    }

    // Prefill email if "Remember Me" was enabled
    if (rememberFlag === 'true') {
      const savedEmail = localStorage.getItem('remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, []);

  useEffect(() => {
    if (profile) navigate(profile.role === 'counselor' ? '/dashboard' : '/student', { replace: true });
  }, [profile, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await signIn(email, password);
    setLoading(false);

    if (signInError) {
      setError('Email atau kata sandi salah. Silakan coba lagi.');
    } else {
      // Save or clear remembered email based on user preference
      if (rememberMe) {
        localStorage.setItem('remember_me', 'true');
        localStorage.setItem('remembered_email', email);
      } else {
        localStorage.setItem('remember_me', 'false');
        localStorage.removeItem('remembered_email');
      }
      sessionStorage.setItem('is_session_active', 'true');
    }
  }

  // Quick Login for Jury / Judges
  // Akun demo dibuat via seed SQL (migrations/20260623000000_seed_demo_accounts.sql)
  async function handleQuickLogin(role: 'student' | 'counselor') {
    setError('');
    setQuickLoginLoading(role);

    const DEMO_CREDENTIALS = {
      student:   { email: 'juri.siswa@sekolah.sch.id',  password: 'JuriDemo2026!' },
      counselor: { email: 'juri.guru@sekolah.sch.id',   password: 'JuriDemo2026!' },
    };

    const { email, password } = DEMO_CREDENTIALS[role];
    const res = await signIn(email, password);

    if (res.error) {
      setError(
        'Akun demo belum tersedia. Pastikan SQL seed sudah dijalankan di Supabase SQL Editor: ' +
        'supabase/migrations/20260623000000_seed_demo_accounts.sql'
      );
      setQuickLoginLoading(null);
      return;
    }

    localStorage.setItem('remember_me', 'true');
    localStorage.setItem('remembered_email', email);
    sessionStorage.setItem('is_session_active', 'true');
    setQuickLoginLoading(null);
  }

  return (
    <div className="min-h-screen flex bg-cosmic-bg text-[#F0F4FF] relative overflow-hidden">
      {/* Background Web3 Grid */}
      <div className="absolute inset-0 web3-grid opacity-50 pointer-events-none z-0" />

      {/* Decorative background gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent-purple/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent-teal/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Left panel - Sanctuary Visuals */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-cosmic-card1/30 border-r border-cosmic-border/40 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <img src="/RonaAtma.jpeg" alt="RonaAtma" className="w-12 h-12 rounded-xl object-cover border border-cosmic-border" />
          <span className="font-display font-bold bg-gradient-to-r from-accent-purple to-accent-teal bg-clip-text text-transparent text-2xl">RonaAtma</span>
        </div>

        <div className="my-auto py-12 flex flex-col items-center">
          <div className="mb-10 animate-web3-float">
            <SoulOrb size="hero" moodScore={8} />
          </div>
          
          <div className="text-center max-w-md space-y-4">
            <h1 className="font-display font-bold text-3xl tracking-tight leading-tight gradient-text-purple">
              Luminous Sanctuary
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed">
              Temukan ruang aman untuk menjaga kesehatan jiwamu, menceritakan perasaanmu secara anonim, dan dilindungi oleh teknologi Web3.
            </p>
          </div>

          <div className="mt-12 w-full max-w-sm space-y-3">
            {[
              { icon: Brain, text: 'AI Mood Tracker & analisis jurnal harian' },
              { icon: Shield, text: 'Laporan anonim terlindungi blockchain' },
              { icon: Users, text: 'SafeSpace Community dimoderasi AI' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={text} className="card flex items-center gap-3 p-3 inner-glow-top border-cosmic-border/40" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="w-8 h-8 rounded-lg bg-accent-purple/15 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-[#3ECFB2]" />
                </div>
                <span className="text-[#F0F4FF] text-xs font-semibold">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[#3D4F7A] text-xs">© 2026 RonaAtma. Data terenkripsi & aman.</p>
      </div>

      {/* Right panel - Form & Testing Tools */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 z-10 relative overflow-y-auto max-h-screen">
        <div className="w-full max-w-md space-y-5 sm:space-y-6 py-4 sm:py-8">
          
          <div className="flex items-center gap-3 lg:hidden justify-center mb-2">
            <img src="/RonaAtma.jpeg" alt="RonaAtma" className="w-10 h-10 rounded-xl object-cover border border-cosmic-border" />
            <span className="font-display font-bold bg-gradient-to-r from-accent-purple to-accent-teal bg-clip-text text-transparent text-xl">RonaAtma</span>
          </div>

          <div className="text-center lg:text-left space-y-1">
            <h2 className="font-display font-bold text-xl sm:text-2xl tracking-tight gradient-text-teal">Selamat datang kembali</h2>
            <p className="text-text-secondary text-xs sm:text-sm">Masuk ke akun sekolahmu untuk melanjutkan</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="card-luminous p-4 sm:p-6 space-y-4 bg-cosmic-card-deep/90 backdrop-blur-xl">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">Email Sekolah</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="nama@sekolah.sch.id" className="input" required autoComplete="email" />
            </div>
            
            <div>
              <label className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">Kata Sandi</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" className="input pr-11" required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-[#3ECFB2] transition-colors">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-cosmic-border bg-[#0D1424] text-accent-purple focus:ring-accent-purple focus:ring-offset-0 focus:ring-2"
                />
                <span className="text-xs text-text-secondary hover:text-[#F0F4FF] transition-colors">Ingat Saya</span>
              </label>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-accent-coral/15 border border-accent-coral/30 text-accent-coral text-xs font-semibold animate-pulse">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !!quickLoginLoading} className="btn-primary w-full justify-center py-3 text-sm tracking-wide uppercase font-bold mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Masuk...
                </span>
              ) : 'Masuk'}
            </button>
          </form>

          {/* Quick User Testing Box (Akses Juri) */}
          <div className="card p-4 sm:p-5 border-dashed border-accent-teal/30 bg-accent-teal/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Lock size={48} className="text-accent-teal" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-accent-teal animate-bounce" />
                <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-accent-teal">Akses Instan Pengujian Juri</h4>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Juri dapat langsung mencoba sistem kami tanpa perlu registrasi. Klik salah satu tombol di bawah untuk masuk ke akun demo instan.
              </p>
              
              <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
                {/* Student Demo Login */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('student')}
                  disabled={loading || !!quickLoginLoading}
                  className="flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl border border-accent-teal/30 bg-[#0D1424] hover:bg-accent-teal/15 hover:border-accent-teal/60 text-[10px] sm:text-xs font-bold text-accent-teal transition-all duration-300 active:scale-95 disabled:opacity-50"
                >
                  {quickLoginLoading === 'student' ? (
                    <span className="w-3.5 h-3.5 border-2 border-accent-teal/30 border-t-accent-teal rounded-full animate-spin" />
                  ) : (
                    <Fingerprint size={14} />
                  )}
                  Masuk Siswa
                </button>

                {/* Counselor Demo Login */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('counselor')}
                  disabled={loading || !!quickLoginLoading}
                  className="flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl border border-accent-purple/30 bg-[#0D1424] hover:bg-accent-purple/15 hover:border-accent-purple/60 text-[10px] sm:text-xs font-bold text-accent-purple transition-all duration-300 active:scale-95 disabled:opacity-50"
                >
                  {quickLoginLoading === 'counselor' ? (
                    <span className="w-3.5 h-3.5 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin" />
                  ) : (
                    <Shield size={14} />
                  )}
                  Masuk Guru BK
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-[#7B8EC8]">
            Belum punya akun?{' '}
            <Link to="/register" className="text-accent-teal hover:text-accent-lavender font-bold transition-colors">Daftar sekarang</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
