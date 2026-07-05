import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import SoulOrb from '../../components/SoulOrb';

export default function AuthSuccess() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const [redirectSeconds, setRedirectSeconds] = useState(5);

  useEffect(() => {
    // If authenticated and profile is loaded, auto redirect after 5 seconds
    if (profile) {
      const timer = setInterval(() => {
        setRedirectSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate(profile.role === 'counselor' ? '/dashboard' : '/student', { replace: true });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [profile, navigate]);

  function handleGoToDashboard() {
    if (profile) {
      navigate(profile.role === 'counselor' ? '/dashboard' : '/student', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-[#070B14] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Cosmic Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-teal/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Soul Orb decoration */}
      <div className="mb-8 animate-web3-float">
        <SoulOrb size="lg" moodScore={9} />
      </div>

      <div className="w-full max-w-md space-y-6 z-10">
        <div className="flex items-center gap-3 justify-center mb-2">
          <img src="/RonaAtma.jpeg" alt="RonaAtma" className="w-10 h-10 rounded-xl object-cover border border-cosmic-border" />
          <span className="font-display font-bold bg-gradient-to-r from-accent-purple to-accent-teal bg-clip-text text-transparent text-xl">RonaAtma</span>
        </div>

        {loading ? (
          /* Loading Verification State */
          <div className="card-luminous p-8 text-center space-y-6 bg-cosmic-card-deep/90 backdrop-blur-xl border border-cosmic-border/50">
            <div className="flex justify-center">
              <div className="w-16 h-16 border-4 border-accent-teal/20 border-t-accent-teal rounded-full animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display font-bold text-lg text-glow-purple text-text-primary">Memverifikasi Akun Anda</h3>
              <p className="text-xs text-text-secondary">Mohon tunggu sebentar, kami sedang menyiapkan ruang aman Anda...</p>
            </div>
          </div>
        ) : profile ? (
          /* Success Verification State */
          <div className="card-luminous p-8 text-center space-y-6 bg-cosmic-card-deep/90 backdrop-blur-xl border border-accent-teal/30 relative">
            <div className="absolute top-0 right-0 p-3 opacity-20 animate-pulse text-accent-teal">
              <Sparkles size={24} />
            </div>
            
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-accent-teal/10 flex items-center justify-center border border-accent-teal/30">
                <CheckCircle2 size={40} className="text-accent-teal animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-bold text-xl text-glow-teal gradient-text-teal">Verifikasi Berhasil! 🎉</h3>
              <p className="text-sm text-[#E2E8F0] font-semibold leading-relaxed">
                Halo, {profile.full_name}!
              </p>
              <p className="text-xs text-text-secondary leading-relaxed">
                Email Anda telah dikonfirmasi secara aman di blockchain RonaAtma. Akun Anda sekarang telah aktif sepenuhnya.
              </p>
            </div>

            <div className="pt-2">
              <button onClick={handleGoToDashboard} className="btn-primary w-full justify-center py-3 text-sm tracking-wide font-bold gap-2">
                Masuk ke Dashboard
                <ArrowRight size={16} />
              </button>
            </div>

            <p className="text-[10px] text-text-secondary/60 italic animate-pulse">
              Mengalihkan Anda secara otomatis dalam {redirectSeconds} detik...
            </p>
          </div>
        ) : (
          /* Invalid/Expired Token State */
          <div className="card-luminous p-8 text-center space-y-6 bg-cosmic-card-deep/90 backdrop-blur-xl border border-accent-coral/30">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-accent-coral/10 flex items-center justify-center border border-accent-coral/30">
                <ShieldAlert size={40} className="text-accent-coral animate-shake" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-bold text-lg text-accent-coral">Tautan Kedaluwarsa</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Tautan konfirmasi tidak valid atau telah kedaluwarsa. Silakan masuk kembali ke akun Anda untuk mengirim ulang tautan konfirmasi baru.
              </p>
            </div>

            <div className="pt-2">
              <button onClick={handleGoToDashboard} className="btn-primary w-full justify-center py-3 text-sm tracking-wide font-bold bg-accent-coral hover:bg-accent-coral/80 border-accent-coral/50">
                Masuk / Login
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-[#3D4F7A]">© 2026 RonaAtma. Data aman & terenkripsi.</p>
      </div>
    </div>
  );
}
