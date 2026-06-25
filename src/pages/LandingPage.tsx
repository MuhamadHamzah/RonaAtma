import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SoulOrb from '../components/SoulOrb';
import { 
  Brain, 
  Shield, 
  Users, 
  Award, 
  ArrowRight, 
  Heart, 
  Sparkles, 
  Activity, 
  Lock, 
  ChevronRight, 
  CheckCircle,
  Database,
  Fingerprint,
  Zap,
  Globe
} from 'lucide-react';

// ScrollReveal Component using IntersectionObserver
function ScrollReveal({ 
  children, 
  className = '', 
  delay = 0,
  direction = 'up' 
}: { 
  children: React.ReactNode, 
  className?: string, 
  delay?: number,
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade'
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  const getDirectionClass = () => {
    if (isVisible) return 'opacity-100 translate-x-0 translate-y-0 scale-100';
    
    switch (direction) {
      case 'up': return 'opacity-0 translate-y-12';
      case 'down': return 'opacity-0 -translate-y-12';
      case 'left': return 'opacity-0 translate-x-12';
      case 'right': return 'opacity-0 -translate-x-12';
      case 'fade': default: return 'opacity-0';
    }
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${getDirectionClass()} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const { session, profile } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  const dashboardPath = profile?.role === 'counselor' ? '/dashboard' : '/student';

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-cosmic-bg text-[#F0F4FF] relative overflow-clip font-sans pt-20">
      
      {/* Web3 Cosmic Grid Background */}
      <div className="absolute inset-0 web3-grid opacity-75 pointer-events-none z-0" />
      
      {/* Glowing Neon Lights */}
      <div className="absolute top-[-10%] left-[-15%] w-[600px] h-[600px] bg-accent-purple/20 rounded-full blur-[140px] pointer-events-none z-0 animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[600px] h-[600px] bg-accent-teal/20 rounded-full blur-[140px] pointer-events-none z-0 animate-pulse-slow" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[30%] left-[25%] w-[400px] h-[400px] bg-accent-coral/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[60%] right-[10%] w-[500px] h-[500px] bg-accent-lavender/10 rounded-full blur-[130px] pointer-events-none z-0" />

      {/* Floating Mini Web3 Particles */}
      <div className="absolute top-[15%] left-[8%] w-3 h-3 rounded-full bg-accent-teal/60 blur-[1px] animate-web3-float z-0" style={{ animationDuration: '8s' }} />
      <div className="absolute top-[45%] right-[8%] w-4 h-4 rounded-full bg-accent-purple/50 blur-[2px] animate-web3-float z-0" style={{ animationDuration: '12s', animationDelay: '1s' }} />
      <div className="absolute bottom-[20%] left-[12%] w-3 h-3 rounded-full bg-accent-coral/60 blur-[1px] animate-web3-float z-0" style={{ animationDuration: '10s', animationDelay: '3s' }} />

      {/* Fixed Web 3.0 Header/Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-cosmic-bg/85 backdrop-blur-2xl border-b border-cosmic-border/60 py-3 sm:py-4 shadow-[0_10px_30px_rgba(0,0,0,0.7)]' 
          : 'bg-transparent border-b border-transparent py-4 sm:py-6'
      }`}>
        {/* Animated Glow Line on Scroll */}
        <div className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent-purple/50 to-transparent transition-opacity duration-500 ${
          scrolled ? 'opacity-100' : 'opacity-0'
        }`} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-accent-purple to-accent-teal rounded-xl blur-[4px] opacity-75 group-hover:opacity-100 transition-opacity duration-300" />
              <img src="/RonaAtma.jpeg" alt="RonaAtma Logo" className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover border border-cosmic-border/60" />
            </div>
            <span className="font-display font-bold bg-gradient-to-r from-accent-purple via-accent-lavender to-accent-teal bg-clip-text text-transparent text-lg sm:text-xl tracking-tight">
              RonaAtma
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-text-secondary">
            <a href="#features" className="hover:text-near-white hover:text-glow-teal transition-all duration-200">Fitur Utama</a>
            <a href="#technology" className="hover:text-near-white hover:text-glow-purple transition-all duration-200">Teknologi</a>
            <a href="#about" className="hover:text-near-white transition-all duration-200">Sanctuary</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            {session && profile ? (
              <Link to={dashboardPath} className="btn-primary group relative px-3 sm:px-5 py-2 sm:py-2.5">
                <span className="absolute -inset-0.5 bg-gradient-to-r from-accent-purple to-accent-teal rounded-xl blur-[6px] opacity-50 group-hover:opacity-90 transition-opacity duration-300" />
                <span className="relative flex items-center gap-1.5 text-xs sm:text-sm">Dashboard <ArrowRight size={14} /></span>
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-xs sm:text-sm font-bold text-[#F0F4FF] hover:text-accent-teal transition-all duration-200 px-2 sm:px-4 py-2">
                  Masuk
                </Link>
                <Link to="/register" className="btn-primary group relative px-3 sm:px-5 py-2 sm:py-2.5">
                  <span className="absolute -inset-0.5 bg-gradient-to-r from-accent-purple to-accent-teal rounded-xl blur-[6px] opacity-50 group-hover:opacity-90 transition-opacity duration-300" />
                  <span className="relative flex items-center gap-1 text-xs sm:text-sm">
                    Daftar<span className="hidden sm:inline"> Sekarang</span> <ArrowRight size={14} />
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-8 pb-20 md:py-32 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center z-10">
        <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
          
          <ScrollReveal direction="down">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-purple/15 to-accent-teal/15 border border-accent-purple/35 text-accent-lavender text-xs font-semibold animate-pulse-slow">
              <Sparkles size={13} className="text-accent-teal" />
              <span>Integrasi AI & Web3 Sanctuary</span>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <h1 className="font-display text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.08] text-near-white">
              Ruang Aman untuk <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-accent-teal via-accent-lavender to-accent-purple bg-clip-text text-transparent">
                Jiwa yang Bercahaya
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={200}>
            <p className="text-text-secondary text-sm sm:text-base md:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              RonaAtma menggabungkan <strong>Kecerdasan Buatan (AI)</strong> untuk analisis emosi harian dan <strong>Blockchain (ICP)</strong> untuk memastikan privasi total serta perlindungan absolut atas laporan perundungan siswa.
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={300}>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start pt-2">
              {session && profile ? (
                <Link to={dashboardPath} className="btn-primary px-6 sm:px-8 py-3 text-sm sm:text-base justify-center relative group">
                  <span className="absolute -inset-0.5 bg-gradient-to-r from-accent-purple to-accent-teal rounded-xl blur-[8px] opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center gap-2">Kembali ke Dashboard <ArrowRight size={18} /></span>
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn-primary px-6 sm:px-8 py-3 text-sm sm:text-base justify-center relative group">
                    <span className="absolute -inset-0.5 bg-gradient-to-r from-accent-purple to-accent-teal rounded-xl blur-[8px] opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative flex items-center gap-2">Mulai Perjalanan Jiwa <ArrowRight size={18} /></span>
                  </Link>
                  <Link to="/login" className="btn-secondary px-6 sm:px-8 py-3 text-sm sm:text-base justify-center border-cosmic-purple/30 hover:border-accent-purple/80 hover:shadow-[0_0_15px_rgba(124,92,252,0.15)] transition-all">
                    Masuk ke Sanctuary
                  </Link>
                </>
              )}
            </div>
          </ScrollReveal>

          <ScrollReveal direction="fade" delay={450}>
            <div className="pt-6 grid grid-cols-3 gap-4 sm:gap-8 max-w-lg mx-auto lg:mx-0 border-t border-cosmic-border/30">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-accent-teal text-glow-teal font-display">100%</div>
                <div className="text-[10px] uppercase font-mono tracking-widest text-text-muted">Anonimitas</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-accent-purple text-glow-purple font-display">Web3</div>
                <div className="text-[10px] uppercase font-mono tracking-widest text-text-muted">Security (ICP)</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-accent-coral font-display">24/7</div>
                <div className="text-[10px] uppercase font-mono tracking-widest text-text-muted">Dukungan AI</div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Hero Visual */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <ScrollReveal direction="left" delay={150}>
            <div className="relative animate-web3-float">
              {/* Ambient glowing radial behind core */}
              <div className="absolute inset-0 bg-gradient-to-tr from-accent-teal/30 via-accent-purple/30 to-accent-coral/20 rounded-full blur-[80px] scale-110 opacity-70 animate-pulse" />
              <div className="relative">
                <SoulOrb size="hero" moodScore={8} />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="py-28 border-t border-cosmic-border/30 relative bg-[#090E1A]/40 z-10">
        <div className="max-w-7xl mx-auto px-6">
          
          <ScrollReveal direction="up">
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-24">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-teal/10 border border-accent-teal/20 text-accent-teal text-xs font-semibold">
                <Zap size={12} />
                <span>Teknologi Web 3.0</span>
              </div>
              <h2 className="font-display text-4xl sm:text-5xl font-bold text-near-white">
                Pilar Utama Perlindungan RonaAtma
              </h2>
              <p className="text-text-secondary text-base max-w-2xl mx-auto leading-relaxed">
                Membangun ekosistem kesehatan mental sekolah yang transparan, aman dari kebocoran data, dan responsif terhadap kondisi darurat.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Feature 1 */}
            <ScrollReveal direction="up" delay={50} className="h-full">
              <div className="card web3-card-glow p-6 flex flex-col justify-between group h-full">
                <div className="space-y-5">
                  <div className="w-12 h-12 rounded-xl bg-accent-teal/10 flex items-center justify-center border border-accent-teal/20 group-hover:bg-accent-teal/25 group-hover:scale-110 transition-all duration-300">
                    <Brain className="text-accent-teal" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-near-white group-hover:text-accent-teal transition-colors">AI Mood Analyzer</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Catat suasana hati harian Anda dengan jurnal bebas. Kecerdasan buatan akan mendeteksi tingkat stres, kesedihan, atau kestabilan emosi secara berkala secara private.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-accent-teal tracking-wider uppercase mt-8 block">Mood & AI Analytics</span>
              </div>
            </ScrollReveal>

            {/* Feature 2 */}
            <ScrollReveal direction="up" delay={150} className="h-full">
              <div className="card web3-card-glow p-6 flex flex-col justify-between group h-full">
                <div className="space-y-5">
                  <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center border border-accent-purple/20 group-hover:bg-accent-purple/25 group-hover:scale-110 transition-all duration-300">
                    <Shield className="text-accent-purple" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-near-white group-hover:text-accent-purple transition-colors">Blockchain Audit Trail</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Semua bukti laporan bullying di-hash dan di-anchor ke blockchain Internet Computer Protocol (ICP). Laporan aman, permanen, dan anti-tamper.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-accent-purple tracking-wider uppercase mt-8 block">Web3 & Audit Trail</span>
              </div>
            </ScrollReveal>

            {/* Feature 3 */}
            <ScrollReveal direction="up" delay={250} className="h-full">
              <div className="card web3-card-glow p-6 flex flex-col justify-between group h-full">
                <div className="space-y-5">
                  <div className="w-12 h-12 rounded-xl bg-accent-coral/10 flex items-center justify-center border border-accent-coral/20 group-hover:bg-accent-coral/25 group-hover:scale-110 transition-all duration-300">
                    <Users className="text-accent-coral" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-near-white group-hover:text-accent-coral transition-colors">SafeSpace Community</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Tempat berbagi cerita secara anonim dengan sesama siswa. Didukung moderasi konten otomatis berbasis AI untuk mencegah ujaran kebencian & bullying.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-accent-coral tracking-wider uppercase mt-8 block">AI Moderated Forum</span>
              </div>
            </ScrollReveal>

            {/* Feature 4 */}
            <ScrollReveal direction="up" delay={350} className="h-full">
              <div className="card web3-card-glow p-6 flex flex-col justify-between group h-full">
                <div className="space-y-5">
                  <div className="w-12 h-12 rounded-xl bg-accent-lavender/10 flex items-center justify-center border border-accent-lavender/20 group-hover:bg-accent-lavender/25 group-hover:scale-110 transition-all duration-300">
                    <Award className="text-accent-lavender" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-near-white group-hover:text-accent-lavender transition-colors">Soulbound Tokens (SBT)</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Dapatkan lencana penghargaan digital non-transferable yang di-mint langsung di blockchain ICP atas ketahanan mental & keberanian Anda.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-accent-lavender tracking-wider uppercase mt-8 block">Decentralized Badges</span>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Tech Stack / Deep Dive */}
      <section id="technology" className="py-28 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center z-10">
        
        <div className="lg:col-span-5 space-y-6">
          <ScrollReveal direction="right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-teal/10 border border-accent-teal/20 text-accent-teal text-xs font-semibold">
              <Lock size={12} />
              <span>Teknologi Keamanan Kelas Dunia</span>
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="right" delay={100}>
            <h2 className="font-display text-4xl font-bold text-near-white">
              Bagaimana Kami Melindungi Jiwa & Identitas Anda?
            </h2>
          </ScrollReveal>

          <ScrollReveal direction="right" delay={200}>
            <p className="text-text-secondary text-sm leading-relaxed">
              Kepercayaan Anda adalah prioritas kami. RonaAtma memanfaatkan perpaduan database modern dan sistem desentralisasi Web3 untuk menciptakan sanctuary terbaik:
            </p>
          </ScrollReveal>

          <div className="space-y-5 pt-2">
            {[
              { title: 'Kriptografi & Pseudonim', desc: 'Identitas asli Anda disamarkan menggunakan fungsi hash satu arah yang unik (Pseudonymous ID). Konselor pun hanya melihat pseudonim kecuali Anda memberikan izin.' },
              { title: 'Sensor Real-Time Groq AI', desc: 'Curahan hati di SafeSpace dan jurnal dimoderasi AI untuk mencegah cyberbullying dan self-harm dengan respon secepat kilat.' },
              { title: 'Canister Motoko Blockchain ICP', desc: 'Smart contract kami tertanam di jaringan ICP, memastikan data log kepatuhan (Audit Trail) terdesentralisasi sepenuhnya.' },
            ].map(({ title, desc }, idx) => (
              <ScrollReveal direction="right" delay={250 + idx * 50} key={title}>
                <div className="flex gap-4">
                  <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-accent-teal/10 flex items-center justify-center border border-accent-teal/25">
                    <CheckCircle size={15} className="text-accent-teal" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-near-white">{title}</h4>
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ScrollReveal direction="left" delay={50}>
            <div className="card p-6 space-y-3 bg-cosmic-card-deep/80 border-cosmic-border/50 hover:shadow-[0_0_25px_rgba(124,92,252,0.1)] transition-all">
              <div className="text-[10px] font-mono text-accent-purple uppercase tracking-wider">Mekanisme Anonimitas</div>
              <h3 className="text-lg font-bold text-near-white">Pseudonymous ID</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Setiap user mendapatkan kode hex unik berdasarkan ID rahasia dan salt. ID ini digunakan di blockchain untuk melindungi identitas Anda dari publik.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="left" delay={150}>
            <div className="card p-6 space-y-3 bg-cosmic-card-deep/80 border-cosmic-border/50 hover:shadow-[0_0_25px_rgba(62,207,178,0.1)] transition-all">
              <div className="text-[10px] font-mono text-accent-teal uppercase tracking-wider">Deteksi Krisis</div>
              <h3 className="text-lg font-bold text-near-white">Alert Otomatis untuk BK</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Jika AI mendeteksi pesan jurnal siswa yang mengandung pesan darurat mental/darurat perundungan, sistem secara real-time mengirimkan notifikasi khusus ke konselor.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="left" delay={250}>
            <div className="card p-6 space-y-3 bg-cosmic-card-deep/80 border-cosmic-border/50 hover:shadow-[0_0_25px_rgba(255,107,138,0.1)] transition-all">
              <div className="text-[10px] font-mono text-accent-coral uppercase tracking-wider">Integritas Laporan</div>
              <h3 className="text-lg font-bold text-near-white">Anti-Tamper Audit Trail</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Begitu laporan diinput, hash dari berkas tersebut langsung masuk ke blok ICP. Pihak sekolah tidak dapat menghapus bukti laporan bullying siswa jika terbukti ada kelalaian.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="left" delay={350}>
            <div className="card p-6 space-y-3 bg-cosmic-card-deep/80 border-cosmic-border/50 hover:shadow-[0_0_25px_rgba(167,139,250,0.1)] transition-all">
              <div className="text-[10px] font-mono text-accent-lavender uppercase tracking-wider">Decentralized Badge</div>
              <h3 className="text-lg font-bold text-near-white">Soulbound Minting</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Minting token penghargaan digital non-transferable langsung ke alamat akun blockchain pengguna sebagai apresiasi ketahanan jiwanya.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA Section */}
      <section id="about" className="py-32 border-t border-cosmic-border/30 relative overflow-hidden bg-gradient-to-b from-[#070B14] to-[#0A1224] z-10">
        
        {/* Ambient radial glow behind CTA */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative z-10">
          <ScrollReveal direction="up">
            <h2 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-near-white leading-tight">
              Siap Menghubungkan Jiwa <br />
              Dengan Kedamaian?
            </h2>
          </ScrollReveal>
          
          <ScrollReveal direction="up" delay={100}>
            <p className="text-text-secondary text-base max-w-xl mx-auto leading-relaxed">
              RonaAtma dirancang khusus untuk menciptakan lingkungan sekolah yang bebas dari bullying, ramah kesehatan mental, serta didukung oleh privasi total.
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={200}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              {session && profile ? (
                <Link to={dashboardPath} className="btn-primary px-8 py-3.5 text-base justify-center relative group">
                  <span className="absolute -inset-0.5 bg-gradient-to-r from-accent-purple to-accent-teal rounded-xl blur-[8px] opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center gap-2 font-bold">Buka Dashboard <ArrowRight size={18} /></span>
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn-primary px-8 py-3.5 text-base justify-center relative group">
                    <span className="absolute -inset-0.5 bg-gradient-to-r from-accent-purple to-accent-teal rounded-xl blur-[8px] opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative flex items-center gap-2 font-bold font-sans">Daftar Sekarang <ArrowRight size={18} /></span>
                  </Link>
                </>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cosmic-border/30 bg-[#060A12] text-text-muted py-16 z-10 relative">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <ScrollReveal direction="right">
            <div className="flex items-center gap-3">
              <img src="/RonaAtma.jpeg" alt="RonaAtma Logo" className="w-8 h-8 rounded-lg object-cover grayscale opacity-70" />
              <span className="font-display font-bold text-text-secondary tracking-tight text-base">
                RonaAtma
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="left">
            <div className="text-center md:text-right space-y-2">
              <p className="text-xs text-[#3D4F7A]">
                © 2026 RonaAtma. Dipersembahkan untuk kesehatan mental siswa terlindungi Web3.
              </p>
              <p className="text-[10px] text-text-muted font-mono">
                Powered by DFINITY (ICP Blockchain Canister), Supabase Database & Groq Llama-3 AI.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </footer>
    </div>
  );
}
