import { useState, useEffect, useRef, useCallback } from 'react';
import { Wind, BookOpen, Brain, ChevronRight, CheckCircle2, RefreshCw, Sparkles, Heart, Shield, Users } from 'lucide-react';

// ─── BREATHING PHASE TYPES ───
type BreathPhase = 'idle' | 'inhale' | 'hold1' | 'exhale' | 'hold2';
const PHASE_DURATION = 4000; // 4 seconds per phase

const PHASE_CONFIG: Record<Exclude<BreathPhase, 'idle'>, { label: string; instruction: string; color: string }> = {
  inhale:  { label: 'TARIK NAPAS',   instruction: 'Tarik napas perlahan melalui hidung...', color: 'from-accent-teal to-[#3ECFB2]' },
  hold1:   { label: 'TAHAN',         instruction: 'Tahan napasmu dengan tenang...',         color: 'from-accent-purple to-[#A78BFA]' },
  exhale:  { label: 'HEMBUSKAN',     instruction: 'Hembuskan perlahan melalui mulut...',    color: 'from-[#60A5FA] to-accent-teal' },
  hold2:   { label: 'TAHAN',         instruction: 'Rilekskan tubuhmu sejenak...',           color: 'from-accent-lavender to-accent-purple' },
};

const PHASE_ORDER: Exclude<BreathPhase, 'idle'>[] = ['inhale', 'hold1', 'exhale', 'hold2'];

// ─── MICRO-LEARNING ARTICLES ───
const ARTICLES = [
  {
    id: 'regulasi-emosi',
    icon: Heart,
    title: 'Regulasi Emosi: Cara Meredam Ledakan',
    color: 'text-accent-coral',
    bgColor: 'bg-accent-coral/10 border-accent-coral/30',
    content: [
      { heading: '1. Kenali Pemicunya', body: 'Sebelum bisa mengontrol emosi, kamu harus tahu apa yang memicunya. Apakah itu ucapan orang lain, tekanan tugas, atau perasaan tidak dihargai? Tulis di jurnal mood RonaAtma setiap kali kamu merasa emosi naik.' },
      { heading: '2. Teknik STOP', body: 'S — Stop. Berhenti sejenak. T — Take a breath. Tarik napas dalam. O — Observe. Amati perasaanmu tanpa menghakimi. P — Proceed. Lanjutkan dengan respons yang lebih bijak.' },
      { heading: '3. Grounding 5-4-3-2-1', body: 'Sebutkan 5 hal yang kamu lihat, 4 yang kamu sentuh, 3 yang kamu dengar, 2 yang kamu cium, dan 1 yang kamu rasakan. Teknik ini menarikmu kembali ke saat ini dan meredam respons emosional berlebihan.' },
      { heading: '4. Gerakan Fisik', body: 'Emosi negatif tersimpan di tubuh. Jalan kaki 10 menit, stretching, atau bahkan mengepalkan tangan lalu melepasnya 5 kali bisa membantu melepas ketegangan fisik yang memperburuk emosi.' },
    ]
  },
  {
    id: 'bicara-asertif',
    icon: Shield,
    title: 'Bicara Asertif: Hadapi Perundung dengan Tegas',
    color: 'text-accent-teal',
    bgColor: 'bg-accent-teal/10 border-accent-teal/30',
    content: [
      { heading: 'Apa Itu Asertif?', body: 'Asertif adalah kemampuan menyatakan pikiran dan perasaanmu secara jujur tanpa menyerang orang lain. Bukan agresif (menyerang balik), bukan pasif (diam saja), tapi tegas dan bermartabat.' },
      { heading: 'Rumus I-Statement', body: '"Saya merasa [emosi] ketika kamu [perilaku spesifik], dan saya ingin [permintaan konkret]." Contoh: "Saya merasa tidak nyaman ketika kamu memanggil saya dengan sebutan itu, dan saya ingin kamu berhenti melakukannya."' },
      { heading: 'Bahasa Tubuh Asertif', body: 'Tatap mata lawan bicara dengan tenang (bukan melotot). Berdiri tegap. Bicara dengan volume sedang dan stabil. Jangan menyilangkan tangan atau menunduk — itu menunjukkan ketidakpercayaan diri.' },
      { heading: 'Kapan Harus Melapor?', body: 'Jika perundung tidak berhenti setelah kamu berbicara asertif, atau jika situasinya melibatkan ancaman fisik, segera laporkan ke guru BK melalui fitur "Bilik Curhat" di RonaAtma. Laporanmu terenkripsi dan tercatat permanen di blockchain.' },
    ]
  },
  {
    id: 'bystander-aktif',
    icon: Users,
    title: 'Menjadi Bystander Aktif: Taktik 5D',
    color: 'text-accent-lavender',
    bgColor: 'bg-accent-lavender/10 border-accent-lavender/30',
    content: [
      { heading: '1. Direct (Langsung)', body: 'Tegur pelaku secara langsung: "Hei, itu tidak lucu. Berhenti." Gunakan hanya jika kamu merasa aman dan situasinya tidak mengancam keselamatan fisik.' },
      { heading: '2. Distract (Alihkan)', body: 'Alihkan perhatian pelaku dengan cara tidak langsung. Contoh: Ajak korban pergi dengan alasan lain: "Eh, guru kelas kita tadi nyariin kamu, ayo ke sana."' },
      { heading: '3. Delegate (Delegasikan)', body: 'Minta bantuan orang dewasa yang berwenang: guru piket, satpam, atau guru BK. Kamu tidak harus menghadapi pelaku sendirian.' },
      { heading: '4. Delay (Tunda)', body: 'Jika kamu tidak bisa bertindak saat itu juga, temui korban setelahnya. Katakan: "Aku lihat tadi yang terjadi. Kamu nggak sendirian. Aku ada di sini." Ini sangat berarti bagi korban.' },
      { heading: '5. Document (Dokumentasikan)', body: 'Catat atau screenshot bukti perundungan (terutama cyberbullying). Bukti ini penting untuk pelaporan resmi. Gunakan fitur laporan di RonaAtma — semua bukti di-hash dan diamankan di blockchain sehingga tidak bisa dihapus.' },
    ]
  }
];

// ─── QUIZ DATA ───
interface QuizQuestion {
  scenario: string;
  options: { text: string; type: 'asertif' | 'pasif' | 'agresif' }[];
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    scenario: 'Temanmu terus-menerus meminjam uang jajanmu tanpa pernah mengembalikan. Hari ini dia minta lagi. Kamu akan:',
    options: [
      { text: '"Nggak apa-apa, ambil aja..." (sambil menghela napas)', type: 'pasif' },
      { text: '"Maaf, aku nggak bisa pinjamin lagi karena yang kemarin belum dikembalikan. Kalau sudah dikembalikan, aku bisa bantu lagi."', type: 'asertif' },
      { text: '"Kamu tuh ya, selalu manfaatin orang! Jangan minta-minta terus!"', type: 'agresif' },
    ]
  },
  {
    scenario: 'Ada teman sekelasmu yang sering diejek oleh sekelompok anak di kantin. Kamu melihatnya terjadi lagi hari ini. Kamu akan:',
    options: [
      { text: 'Pura-pura tidak melihat dan pergi dari kantin.', type: 'pasif' },
      { text: 'Menghampiri temanmu dan mengajaknya pergi: "Eh, yuk ke perpustakaan bareng, aku butuh bantuan tugas."', type: 'asertif' },
      { text: 'Marah-marah kepada kelompok itu dan mengancam mereka.', type: 'agresif' },
    ]
  },
  {
    scenario: 'Guru memberikan nilai rendah pada tugasmu yang menurutmu sudah dikerjakan dengan baik. Kamu merasa kecewa. Kamu akan:',
    options: [
      { text: 'Diam saja, menerima nilai tersebut meskipun merasa tidak adil.', type: 'pasif' },
      { text: 'Menemui guru setelah kelas dan bertanya: "Bu/Pak, boleh saya tahu bagian mana dari tugas saya yang perlu diperbaiki? Saya ingin belajar lebih baik."', type: 'asertif' },
      { text: 'Mengeluh keras di kelas: "Nilai saya kok jelek banget? Guru ini nggak adil!"', type: 'agresif' },
    ]
  }
];

const QUIZ_RESULTS: Record<'asertif' | 'pasif' | 'agresif', { title: string; description: string; color: string; advice: string }> = {
  asertif: {
    title: '🛡️ Komunikator Asertif',
    description: 'Kamu sudah memiliki kemampuan yang sangat baik dalam menyatakan perasaan dan kebutuhan secara jujur tanpa melukai orang lain.',
    color: 'text-accent-teal border-accent-teal/40 bg-accent-teal/10',
    advice: 'Pertahankan! Ajak teman-temanmu untuk berkomunikasi dengan cara yang sama. Kamu bisa menjadi peer advocate yang hebat.'
  },
  pasif: {
    title: '🕊️ Cenderung Pasif',
    description: 'Kamu cenderung menghindari konflik dengan mengorbankan kebutuhanmu sendiri. Ini bisa menumpuk stres jangka panjang.',
    color: 'text-accent-lavender border-accent-lavender/40 bg-accent-lavender/10',
    advice: 'Coba latih teknik I-Statement: "Saya merasa... ketika... dan saya ingin...". Mulai dari situasi kecil dan tingkatkan secara bertahap. Baca artikel "Bicara Asertif" di atas.'
  },
  agresif: {
    title: '🔥 Cenderung Agresif',
    description: 'Kamu berani menyuarakan pendapat, tetapi caranya kadang menyerang orang lain dan bisa memperburuk situasi.',
    color: 'text-accent-coral border-accent-coral/40 bg-accent-coral/10',
    advice: 'Coba praktikkan teknik STOP sebelum merespons: Stop, Take a breath, Observe, Proceed. Emosi yang kuat itu valid — cara mengekspresikannya yang perlu dipoles.'
  }
};

// ═══════════════════════════════════════════
// ─── MAIN COMPONENT ──────────────────────
// ═══════════════════════════════════════════
export default function SelfCare() {
  const [activeTab, setActiveTab] = useState<'breathing' | 'library' | 'quiz'>('breathing');

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="page-title font-bold text-glow-purple">Self-Care & Resilience Center</h1>
        <p className="text-text-secondary text-sm">Latih ketangguhan mentalmu dengan panduan pernapasan, edukasi asertivitas, dan kuis interaktif.</p>
      </div>

      {/* Tab Selection */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {([
          { key: 'breathing' as const, icon: Wind, label: 'Napas Lega' },
          { key: 'library' as const, icon: BookOpen, label: 'Pustaka Tangguh' },
          { key: 'quiz' as const, icon: Brain, label: 'Cek Resiliensi' },
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-2
              ${activeTab === key
                ? 'bg-gradient-to-r from-accent-purple/20 to-accent-teal/10 border-accent-teal/50 text-accent-teal shadow-inner'
                : 'bg-[#121A30]/50 border-cosmic-border text-[#7B8EC8] hover:text-[#F0F4FF] hover:border-cosmic-border/80'}`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'breathing' && <BreathingVisualizer />}
      {activeTab === 'library' && <ResilienceLibrary />}
      {activeTab === 'quiz' && <ResilienceQuiz />}
    </div>
  );
}

// ═══════════════════════════════════════════
// ─── BREATHING VISUALIZER ────────────────
// ═══════════════════════════════════════════
function BreathingVisualizer() {
  const [phase, setPhase] = useState<BreathPhase>('idle');
  const [cycleCount, setCycleCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    timerRef.current = null;
    progressRef.current = null;
  }, []);

  const startBreathing = useCallback(() => {
    clearTimers();
    setCycleCount(0);
    setProgress(0);

    let phaseIndex = 0;
    setPhase(PHASE_ORDER[0]);

    // Progress bar update (every 50ms)
    progressRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + (50 / PHASE_DURATION) * 100;
        return next >= 100 ? 100 : next;
      });
    }, 50);

    // Phase transition
    timerRef.current = setInterval(() => {
      phaseIndex++;
      setProgress(0);

      if (phaseIndex % 4 === 0) {
        setCycleCount(prev => prev + 1);
      }

      const nextPhase = PHASE_ORDER[phaseIndex % 4];
      setPhase(nextPhase);
    }, PHASE_DURATION);
  }, [clearTimers]);

  const stopBreathing = useCallback(() => {
    clearTimers();
    setPhase('idle');
    setProgress(0);
  }, [clearTimers]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const isActive = phase !== 'idle';
  const config = isActive ? PHASE_CONFIG[phase as Exclude<BreathPhase, 'idle'>] : null;

  // Orb scale based on phase
  const orbScale = phase === 'inhale' || phase === 'hold1' ? 'scale-110' : phase === 'exhale' || phase === 'hold2' ? 'scale-75' : 'scale-90';
  const orbGlow = phase === 'inhale' ? 'shadow-[0_0_80px_rgba(62,207,178,0.4)]' :
                  phase === 'hold1' ? 'shadow-[0_0_80px_rgba(167,139,250,0.4)]' :
                  phase === 'exhale' ? 'shadow-[0_0_60px_rgba(96,165,250,0.3)]' :
                  phase === 'hold2' ? 'shadow-[0_0_40px_rgba(167,139,250,0.2)]' : 'shadow-[0_0_30px_rgba(62,207,178,0.15)]';

  return (
    <div className="card-luminous p-4 sm:p-8 flex flex-col items-center justify-center min-h-[450px] sm:min-h-[500px] space-y-8 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl transition-all duration-[4000ms] ease-in-out
          ${isActive ? 'opacity-30' : 'opacity-10'}
          ${phase === 'inhale' ? 'bg-accent-teal' : phase === 'hold1' ? 'bg-accent-purple' : phase === 'exhale' ? 'bg-[#60A5FA]' : phase === 'hold2' ? 'bg-accent-lavender' : 'bg-accent-teal'}`} />
      </div>

      {/* Title */}
      <div className="text-center z-10">
        <h2 className="font-display font-bold text-lg text-[#F0F4FF]">Latihan Pernapasan Kotak</h2>
        <p className="text-text-secondary text-xs mt-1">Ikuti irama lingkaran untuk menenangkan pikiran dan tubuhmu.</p>
      </div>

      {/* The Breathing Orb */}
      <div className="relative z-10 flex items-center justify-center" style={{ width: 220, height: 220 }}>
        {/* Outer ring progress */}
        {isActive && (
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="100" className="stroke-cosmic-border fill-none" strokeWidth="3" />
            <circle
              cx="110" cy="110" r="100"
              className="fill-none transition-none"
              stroke={phase === 'inhale' ? '#3ECFB2' : phase === 'hold1' ? '#A78BFA' : phase === 'exhale' ? '#60A5FA' : '#A78BFA'}
              strokeWidth="3"
              strokeDasharray={628.3}
              strokeDashoffset={628.3 - (628.3 * progress / 100)}
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Inner orb */}
        <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-[4000ms] ease-in-out
          bg-gradient-to-br ${config ? config.color : 'from-accent-teal/30 to-accent-purple/20'}
          ${orbScale} ${orbGlow}`}>

          <div className="text-center">
            {isActive ? (
              <>
                <p className="text-white text-xs font-bold uppercase tracking-[0.2em] font-mono">{config?.label}</p>
                <p className="text-white/60 text-[10px] mt-1 font-mono">{Math.ceil((PHASE_DURATION - (progress / 100 * PHASE_DURATION)) / 1000)}s</p>
              </>
            ) : (
              <Wind size={32} className="text-accent-teal/60 mx-auto" />
            )}
          </div>
        </div>
      </div>

      {/* Instruction text */}
      <div className="text-center z-10 h-12 flex items-center justify-center">
        {isActive ? (
          <p className="text-text-secondary text-sm animate-fade-in">{config?.instruction}</p>
        ) : (
          <p className="text-text-secondary text-xs">Tekan tombol di bawah untuk memulai sesi pernapasan 4-4-4-4.</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 z-10">
        {isActive ? (
          <button onClick={stopBreathing} className="btn-secondary px-6 py-2.5 text-xs font-bold uppercase tracking-wider">
            Berhenti
          </button>
        ) : (
          <button onClick={startBreathing} className="btn-primary px-8 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Wind size={16} />
            Mulai Bernapas
          </button>
        )}
      </div>

      {/* Cycle counter */}
      {cycleCount > 0 && (
        <div className="text-center z-10">
          <p className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
            Siklus Selesai: <span className="text-accent-teal">{cycleCount}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// ─── RESILIENCE LIBRARY ──────────────────
// ═══════════════════════════════════════════
function ResilienceLibrary() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {ARTICLES.map((article) => {
        const Icon = article.icon;
        const isExpanded = expandedId === article.id;

        return (
          <div key={article.id} className="card border-cosmic-border/40 hover:border-accent-purple/30 transition-all duration-300 overflow-hidden">
            {/* Header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : article.id)}
              className="w-full flex items-center justify-between p-3.5 sm:p-5 text-left group">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`p-2 sm:p-2.5 rounded-xl border ${article.bgColor} flex-shrink-0`}>
                  <Icon size={16} className={article.color} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xs sm:text-sm text-[#F0F4FF] group-hover:text-accent-teal transition-colors">{article.title}</h3>
                  <p className="text-[9px] sm:text-[10px] text-text-secondary font-mono uppercase tracking-wider mt-0.5">{article.content.length} Poin Pembelajaran</p>
                </div>
              </div>
              <ChevronRight size={14} className={`text-[#3D4F7A] transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
            </button>

            {/* Content (expandable) */}
            {isExpanded && (
              <div className="px-5 pb-5 space-y-4 animate-fade-in border-t border-cosmic-border/30 pt-4">
                {article.content.map((section, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <h4 className={`text-xs font-bold ${article.color}`}>{section.heading}</h4>
                    <p className="text-text-secondary text-xs leading-relaxed">{section.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// ─── RESILIENCE QUIZ ─────────────────────
// ═══════════════════════════════════════════
function ResilienceQuiz() {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<('asertif' | 'pasif' | 'agresif')[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  function handleSelectOption(optionIndex: number) {
    setSelectedOption(optionIndex);
  }

  function handleNext() {
    if (selectedOption === null) return;

    const chosenType = QUIZ_QUESTIONS[currentQ].options[selectedOption].type;
    const newAnswers = [...answers, chosenType];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentQ + 1 < QUIZ_QUESTIONS.length) {
      setCurrentQ(currentQ + 1);
    } else {
      setShowResult(true);
    }
  }

  function handleReset() {
    setCurrentQ(0);
    setAnswers([]);
    setSelectedOption(null);
    setShowResult(false);
  }

  // Calculate dominant type
  function getDominantType(): 'asertif' | 'pasif' | 'agresif' {
    const counts: Record<string, number> = { asertif: 0, pasif: 0, agresif: 0 };
    answers.forEach(a => counts[a]++);
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as 'asertif' | 'pasif' | 'agresif';
  }

  if (showResult) {
    const dominant = getDominantType();
    const result = QUIZ_RESULTS[dominant];

    return (
      <div className="card-luminous p-8 space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <Sparkles size={28} className="text-accent-teal mx-auto" />
          <h2 className="font-display font-bold text-lg text-[#F0F4FF]">Hasil Cek Resiliensi</h2>
          <p className="text-text-secondary text-xs">Berdasarkan jawabanmu pada {QUIZ_QUESTIONS.length} situasi sosial</p>
        </div>

        {/* Result Card */}
        <div className={`p-6 rounded-2xl border ${result.color} space-y-4`}>
          <h3 className="font-display font-bold text-base text-center">{result.title}</h3>
          <p className="text-text-secondary text-xs leading-relaxed text-center">{result.description}</p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {(['asertif', 'pasif', 'agresif'] as const).map(type => {
            const count = answers.filter(a => a === type).length;
            return (
              <div key={type} className="card p-2 sm:p-3 text-center border-cosmic-border/40">
                <p className="text-sm sm:text-lg font-mono font-bold text-[#F0F4FF]">{count}/{QUIZ_QUESTIONS.length}</p>
                <p className="text-[8px] sm:text-[10px] font-bold text-text-secondary uppercase tracking-wider mt-1">{type}</p>
              </div>
            );
          })}
        </div>

        {/* Advice */}
        <div className="p-4 bg-[#121A30]/50 border border-cosmic-border rounded-xl space-y-2">
          <h4 className="text-xs font-bold text-accent-teal uppercase tracking-wider">💡 Saran Pengembangan Diri</h4>
          <p className="text-text-secondary text-xs leading-relaxed">{result.advice}</p>
        </div>

        <button onClick={handleReset} className="btn-secondary w-full justify-center py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <RefreshCw size={14} />
          Ulangi Kuis
        </button>
      </div>
    );
  }

  const question = QUIZ_QUESTIONS[currentQ];

  return (
    <div className="card-luminous p-6 sm:p-8 space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-widest">
          Pertanyaan {currentQ + 1} dari {QUIZ_QUESTIONS.length}
        </p>
        <div className="flex gap-1.5">
          {QUIZ_QUESTIONS.map((_, idx) => (
            <div key={idx} className={`w-8 h-1.5 rounded-full transition-all ${idx < currentQ ? 'bg-accent-teal' : idx === currentQ ? 'bg-accent-purple' : 'bg-cosmic-border'}`} />
          ))}
        </div>
      </div>

      {/* Scenario */}
      <div className="p-5 bg-[#121A30]/50 border border-cosmic-border rounded-xl">
        <p className="text-sm text-[#F0F4FF] leading-relaxed font-medium">{question.scenario}</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleSelectOption(idx)}
            className={`w-full text-left p-4 rounded-xl border transition-all duration-300 group
              ${selectedOption === idx
                ? 'bg-gradient-to-r from-accent-purple/15 to-accent-teal/10 border-accent-teal/50 shadow-inner'
                : 'bg-[#0D1424]/60 border-cosmic-border/40 hover:border-accent-purple/30 hover:bg-[#121A30]/50'
              }`}>
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all
                ${selectedOption === idx ? 'border-accent-teal bg-accent-teal/20' : 'border-[#3D4F7A]'}`}>
                {selectedOption === idx && <CheckCircle2 size={14} className="text-accent-teal" />}
              </div>
              <p className={`text-xs leading-relaxed transition-colors ${selectedOption === idx ? 'text-[#F0F4FF]' : 'text-text-secondary group-hover:text-[#F0F4FF]'}`}>
                {option.text}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={selectedOption === null}
        className="btn-primary w-full justify-center py-3 text-xs font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed">
        {currentQ + 1 < QUIZ_QUESTIONS.length ? 'Pertanyaan Selanjutnya' : 'Lihat Hasil'}
      </button>
    </div>
  );
}
