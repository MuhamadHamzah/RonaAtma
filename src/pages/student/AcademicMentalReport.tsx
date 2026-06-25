import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  GraduationCap, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Heart, 
  Brain, 
  AlertTriangle, 
  CheckCircle2, 
  Activity,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface Grade {
  id: string;
  subject: string;
  score: number;
  term: string;
  created_at: string;
}

interface MoodEntry {
  created_at: string;
  mood_score: number;
}

export default function AcademicMentalReport() {
  const { profile } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    async function fetchData() {
      try {
        const [gradesRes, moodsRes] = await Promise.all([
          supabase
            .from('academic_grades')
            .select('*')
            .eq('student_id', profile!.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('mood_entries')
            .select('created_at, mood_score')
            .eq('student_id', profile!.id)
            .order('created_at', { ascending: true })
        ]);

        if (gradesRes.data) setGrades(gradesRes.data as Grade[]);
        if (moodsRes.data) setMoods(moodsRes.data as MoodEntry[]);
      } catch (err) {
        console.error('Error fetching academic mental report:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [profile]);

  // 1. Calculate stats
  const totalGrades = grades.length;
  const averageGrade = totalGrades
    ? Math.round(grades.reduce((sum, g) => sum + Number(g.score), 0) / totalGrades * 10) / 10
    : 0;

  // Calculate academic trend based on latest two grades
  let gradeTrend = 0;
  if (grades.length >= 2) {
    gradeTrend = Number(grades[grades.length - 1].score) - Number(grades[grades.length - 2].score);
  }

  // 2. Prepare correlation chart data
  // We align grades with the average mood score in the week leading up to the grade's date
  const chartData = grades.map(g => {
    const gradeDate = new Date(g.created_at);
    const oneWeekAgo = new Date(g.created_at);
    oneWeekAgo.setDate(gradeDate.getDate() - 7);

    // Filter mood entries in the 7 days prior to grade entry
    const matchingMoods = moods.filter(m => {
      const moodDate = new Date(m.created_at);
      return moodDate >= oneWeekAgo && moodDate <= gradeDate;
    });

    // Average mood for this period (out of 10)
    const avgMood = matchingMoods.length
      ? matchingMoods.reduce((sum, m) => sum + m.mood_score, 0) / matchingMoods.length
      : 5; // Fallback default if no mood entry

    return {
      name: `${g.subject} (${g.term})`,
      'Nilai Akademik': Number(g.score),
      // Scale mood to 100 for visual alignment on same chart
      'Kondisi Mood (x10)': Math.round(avgMood * 10)
    };
  });

  // 3. Burnout Assessment Logic
  const calculateBurnoutAssessment = () => {
    if (grades.length === 0) {
      return {
        level: 'Belum Ada Data',
        color: 'text-text-secondary border-cosmic-border bg-[#121A30]/50',
        badge: 'bg-cosmic-border/20 text-text-secondary',
        desc: 'Silakan hubungi Guru BK Anda untuk menginput nilai akademik pertama Anda.',
        recommendation: 'Mulailah dengan mengisi Mood Tracker secara rutin agar grafik korelasi terbentuk.'
      };
    }

    const latestGradeScore = Number(grades[grades.length - 1].score);
    // Average mood of latest 5 entries
    const latestMoods = moods.slice(-5);
    const avgLatestMood = latestMoods.length
      ? latestMoods.reduce((sum, m) => sum + m.mood_score, 0) / latestMoods.length
      : 5;

    // Check if grades are dropping significantly
    const isDropping = gradeTrend < -8;

    if (avgLatestMood >= 7 && latestGradeScore >= 75 && !isDropping) {
      return {
        level: 'Kondisi Mental & Belajar Prima',
        color: 'border-accent-teal/30 bg-accent-teal/5 text-accent-teal',
        badge: 'bg-accent-teal/15 text-accent-teal',
        desc: 'Luar biasa! Anda berhasil menjaga keseimbangan antara performa akademik yang prima dengan stabilitas emosi yang sangat sehat.',
        recommendation: 'Teruskan metode belajar Anda yang seimbang. Bagikan afirmasi positif untuk teman-teman di SafeSpace.'
      };
    } else if (avgLatestMood < 5.5 && latestGradeScore >= 75) {
      return {
        level: 'Stres Belajar Tersembunyi (High-Functioning)',
        color: 'border-accent-purple/30 bg-accent-purple/5 text-[#A78BFA]',
        badge: 'bg-accent-purple/15 text-[#A78BFA]',
        desc: 'Meskipun nilai akademik Anda tetap tinggi, grafik kesehatan mental menunjukkan tingkat kecemasan atau stres yang meningkat.',
        recommendation: 'Jangan memaksakan diri secara berlebihan. Sempatkan jeda istirahat dengan teknik napas terpandu di menu Self-Care.'
      };
    } else if (isDropping && avgLatestMood < 5.5) {
      return {
        level: 'Risiko Burnout Akademik Kritis',
        color: 'border-accent-coral/30 bg-accent-coral/5 text-accent-coral',
        badge: 'bg-accent-coral/15 text-accent-coral',
        desc: 'Terdeteksi penurunan nilai akademik yang signifikan yang berkolerasi dengan memburuknya kestabilan emosi/mood Anda akhir-akhir ini.',
        recommendation: 'Ini adalah sinyal lelah yang serius. Kami sangat menyarankan Anda untuk mengambil waktu jeda dan mengobrol santai dengan Guru BK.'
      };
    } else if (latestGradeScore < 65 && avgLatestMood >= 6) {
      return {
        level: 'Butuh Penyesuaian Belajar',
        color: 'border-accent-lavender/30 bg-[#A78BFA]/5 text-[#A78BFA]',
        badge: 'bg-[#A78BFA]/15 text-[#A78BFA]',
        desc: 'Suasana hati Anda cukup stabil dan sehat, tetapi performa akademik Anda di sekolah sedang membutuhkan bantuan tambahan.',
        recommendation: 'Cobalah diskusikan metode belajar baru dengan guru BK atau guru mata pelajaran terkait agar performa Anda meningkat.'
      };
    } else {
      return {
        level: 'Keseimbangan Belajar Cukup',
        color: 'border-cosmic-border/60 bg-[#121A30]/30 text-[#F0F4FF]',
        badge: 'bg-cosmic-border/30 text-[#7B8EC8]',
        desc: 'Keseimbangan antara performa akademik dan suasana hati Anda berada pada batas wajar namun bisa ditingkatkan.',
        recommendation: 'Cobalah meluangkan waktu 5 menit sehari di pagi hari untuk meditasi pernapasan guna menjaga fokus belajar Anda.'
      };
    }
  };

  const assessment = calculateBurnoutAssessment();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-teal"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title font-bold text-glow-purple flex items-center gap-2">
            <GraduationCap className="text-[#3ECFB2]" /> Rapor Belajar & Keseimbangan Mental
          </h1>
          <p className="text-text-secondary text-sm">
            Menghubungkan performa akademik Anda secara objektif dengan kondisi kesehatan mental di sekolah.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border-cosmic-border/50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-teal/10 border border-accent-teal/30 flex items-center justify-center text-accent-teal">
            <GraduationCap size={22} />
          </div>
          <div>
            <p className="text-[10px] text-text-secondary font-mono font-bold uppercase tracking-wider">Nilai Rata-rata</p>
            <h3 className="text-2xl font-bold text-[#F0F4FF] mt-0.5">{averageGrade || '-'}</h3>
          </div>
        </div>

        <div className="card p-5 border-cosmic-border/50 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
            gradeTrend > 0 ? 'bg-[#3ECFB2]/10 border-[#3ECFB2]/30 text-[#3ECFB2]'
            : gradeTrend < 0 ? 'bg-[#FF6B8A]/10 border-[#FF6B8A]/30 text-[#FF6B8A]'
            : 'bg-accent-lavender/10 border-accent-lavender/30 text-[#A78BFA]'
          }`}>
            {gradeTrend > 0 ? <TrendingUp size={22} /> : gradeTrend < 0 ? <TrendingDown size={22} /> : <Minus size={22} />}
          </div>
          <div>
            <p className="text-[10px] text-text-secondary font-mono font-bold uppercase tracking-wider">Tren Nilai Terakhir</p>
            <h3 className={`text-lg font-bold mt-0.5 ${
              gradeTrend > 0 ? 'text-[#3ECFB2]'
              : gradeTrend < 0 ? 'text-[#FF6B8A]'
              : 'text-[#F0F4FF]'
            }`}>
              {gradeTrend > 0 ? `+${gradeTrend}` : gradeTrend < 0 ? `${gradeTrend}` : 'Stabil'}
            </h3>
          </div>
        </div>

        <div className="card p-5 border-cosmic-border/50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#A78BFA]/10 border border-[#A78BFA]/30 flex items-center justify-center text-[#A78BFA]">
            <Heart size={20} />
          </div>
          <div>
            <p className="text-[10px] text-text-secondary font-mono font-bold uppercase tracking-wider">Total Evaluasi Nilai</p>
            <h3 className="text-2xl font-bold text-[#F0F4FF] mt-0.5">{totalGrades} Mata Pelajaran</h3>
          </div>
        </div>
      </div>

      {/* Burnout Assessment Banner */}
      <div className={`border p-4 sm:p-6 rounded-2xl flex flex-col md:flex-row items-start gap-4 sm:gap-5 transition-all duration-300 ${assessment.color}`}>
        <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center flex-shrink-0 border border-current">
          <Activity size={24} />
        </div>
        <div className="space-y-2 flex-1 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <h3 className="font-bold text-sm sm:text-base">Hasil Diagnosis Keseimbangan Mental</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wide uppercase w-fit ${assessment.badge}`}>
              {assessment.level}
            </span>
          </div>
          <p className="text-text-secondary text-xs leading-relaxed">{assessment.desc}</p>
          <div className="p-3 bg-black/20 rounded-xl border border-current/10 flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 text-xs">
            <span className="font-bold flex-shrink-0">Saran BK:</span>
            <span className="text-text-secondary">{assessment.recommendation}</span>
          </div>
        </div>
      </div>

      {/* Correlation Chart & Analytics */}
      {totalGrades > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-8 card p-4 sm:p-6 border-cosmic-border/50">
            <h2 className="section-title mb-1 font-bold">Grafik Korelasi: Nilai vs Stabilitas Mood</h2>
            <p className="text-text-secondary text-xs mb-6">Memetakan hubungan performa belajar dengan rata-rata kebahagiaan mental Anda seminggu sebelum ujian.</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#526895" style={{ fontSize: 10 }} />
                  <YAxis stroke="#526895" style={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0D1424', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12 }} 
                    labelStyle={{ color: '#F0F4FF', fontWeight: 'bold', fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Line type="monotone" dataKey="Nilai Akademik" stroke="#3ECFB2" strokeWidth={3} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="Kondisi Mood (x10)" stroke="#A78BFA" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-[10px] text-text-secondary font-mono mt-3">
              *Catatan: Skor mood (skala 1-10) dikalikan 10 untuk kemudahan komparasi visual dengan skala nilai akademik (0-100).
            </p>
          </div>

          {/* Side Info Panel */}
          <div className="lg:col-span-4 space-y-4">
            <div className="card p-6 border-cosmic-border/50 h-full flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#F0F4FF] mb-3 flex items-center gap-2">
                  <Brain size={16} className="text-[#A78BFA]" /> Mengapa Korelasi Ini Penting?
                </h3>
                <p className="text-text-secondary text-xs leading-relaxed space-y-2">
                  <span>Studi psikologi pendidikan membuktikan bahwa performa belajar sangat dipengaruhi oleh kenyamanan mental.</span>
                  <br /><br />
                  <span>Kecemasan tinggi (*anxiety*), kurang tidur, serta perasaan terisolasi akibat perundungan dapat menurunkan daya konsentrasi, ingatan, dan motivasi belajar Anda secara dramatis.</span>
                </p>
              </div>

              <div className="pt-4 border-t border-cosmic-border/40 mt-4">
                <Link to="/student/selfcare" className="w-full flex items-center justify-between p-3 bg-accent-purple/10 hover:bg-accent-purple/20 border border-accent-purple/30 rounded-xl text-xs font-bold text-accent-lavender transition-all group">
                  <span className="flex items-center gap-2">
                    <BookOpen size={14} /> Butuh Tenang? Coba Self-Care
                  </span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-8 border-cosmic-border/50 text-center space-y-4">
          <GraduationCap size={48} className="mx-auto text-text-secondary" />
          <h3 className="font-bold text-lg">Belum Ada Nilai Akademik</h3>
          <p className="text-text-secondary text-sm max-w-md mx-auto">
            Halaman rapor korelasi ini akan aktif secara visual setelah Guru BK atau wali kelas memasukkan data nilai Anda ke sistem.
          </p>
        </div>
      )}

      {/* Grade Details Table & Mobile List */}
      {totalGrades > 0 && (
        <div className="card border-cosmic-border/50 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-cosmic-border/40 bg-[#121A30]/30">
            <h3 className="font-bold text-sm text-[#F0F4FF]">Riwayat Evaluasi Nilai</h3>
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-cosmic-border/40 text-text-secondary font-mono font-bold uppercase tracking-wider bg-black/10">
                  <th className="px-6 py-3.5">Mata Pelajaran</th>
                  <th className="px-6 py-3.5">Semester/Term</th>
                  <th className="px-6 py-3.5">Skor Nilai</th>
                  <th className="px-6 py-3.5">Tanggal Input</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cosmic-border/20">
                {grades.map(g => (
                  <tr key={g.id} className="hover:bg-[#121A30]/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#F0F4FF]">{g.subject}</td>
                    <td className="px-6 py-4 text-text-secondary">{g.term}</td>
                    <td className="px-6 py-4 font-bold font-mono">
                      <span className={`px-2.5 py-1 rounded-lg ${
                        g.score >= 80 ? 'text-[#3ECFB2] bg-[#3ECFB2]/10'
                        : g.score >= 65 ? 'text-[#A78BFA] bg-[#A78BFA]/10'
                        : 'text-accent-coral bg-accent-coral/10'
                      }`}>
                        {g.score}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {new Date(g.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="block sm:hidden p-4 space-y-3 divide-y divide-cosmic-border/10">
            {grades.map((g, idx) => (
              <div key={g.id} className={`pt-3 ${idx === 0 ? 'pt-0' : ''} space-y-2`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-[#F0F4FF]">{g.subject}</h4>
                    <p className="text-[10px] text-text-secondary mt-0.5">{g.term}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg font-bold font-mono text-xs ${
                    g.score >= 80 ? 'text-[#3ECFB2] bg-[#3ECFB2]/10'
                    : g.score >= 65 ? 'text-[#A78BFA] bg-[#A78BFA]/10'
                    : 'text-accent-coral bg-accent-coral/10'
                  }`}>
                    {g.score}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-text-secondary">
                  <span>Tanggal Input</span>
                  <span className="font-mono">
                    {new Date(g.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
