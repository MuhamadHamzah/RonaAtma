import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Brain, Shield, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import SoulOrb from '../../components/SoulOrb';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) navigate(profile.role === 'counselor' ? '/dashboard' : '/student', { replace: true });
  }, [profile, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setError('Email atau kata sandi salah. Silakan coba lagi.');
  }

  return (
    <div className="min-h-screen flex bg-cosmic-bg text-[#F0F4FF] relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent-purple/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent-teal/5 rounded-full blur-[100px]" />

      {/* Left panel - Sanctuary Visuals */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-cosmic-card1/30 border-r border-cosmic-border/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src="/RonaAtma.jpeg" alt="RonaAtma" className="w-12 h-12 rounded-xl object-cover border border-cosmic-border" />
          <span className="font-display font-bold bg-gradient-to-r from-accent-purple to-accent-teal bg-clip-text text-transparent text-2xl">RonaAtma</span>
        </div>

        <div className="my-auto py-12 flex flex-col items-center">
          <div className="mb-10 animate-float-slow">
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

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3 lg:hidden justify-center mb-8">
            <img src="/RonaAtma.jpeg" alt="RonaAtma" className="w-10 h-10 rounded-xl object-cover border border-cosmic-border" />
            <span className="font-display font-bold bg-gradient-to-r from-accent-purple to-accent-teal bg-clip-text text-transparent text-xl">RonaAtma</span>
          </div>

          <div className="text-center lg:text-left space-y-2">
            <h2 className="font-display font-bold text-2xl tracking-tight gradient-text-teal">Selamat datang kembali</h2>
            <p className="text-text-secondary text-sm">Masuk ke akunmu untuk melanjutkan</p>
          </div>

          <form onSubmit={handleSubmit} className="card-luminous p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">Email Sekolah</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="nama@sekolah.sch.id" className="input" required autoComplete="email" />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">Kata Sandi</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" className="input pr-11" required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-[#3ECFB2] transition-colors">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-accent-coral/15 border border-accent-coral/30 text-accent-coral text-xs font-semibold animate-pulse">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-sm tracking-wide uppercase font-bold mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Masuk...
                </span>
              ) : 'Masuk'}
            </button>
          </form>

          <p className="text-center text-sm text-[#7B8EC8]">
            Belum punya akun?{' '}
            <Link to="/register" className="text-accent-teal hover:text-accent-lavender font-bold transition-colors">Daftar sekarang</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
