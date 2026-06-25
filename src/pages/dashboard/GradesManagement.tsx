import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  GraduationCap, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Brain, 
  Activity, 
  User,
  Heart,
  Calendar,
  AlertCircle,
  Check
} from 'lucide-react';
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

interface StudentProfile {
  id: string;
  full_name: string;
  class_name: string;
  pseudonymous_id: string;
}

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

export default function GradesManagement() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  
  // Grade list & mood for selected student
  const [grades, setGrades] = useState<Grade[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  
  // Form states
  const [subject, setSubject] = useState('');
  const [score, setScore] = useState('');
  const [term, setTerm] = useState('Ganjil 2026');
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'analysis'>('input');
  
  const SUBJECT_OPTIONS = [
    'Matematika',
    'Bahasa Indonesia',
    'Bahasa Inggris',
    'Fisika',
    'Kimia',
    'Biologi',
    'Sejarah',
    'Geografi',
    'Ekonomi',
    'Sosiologi',
    'Pendidikan Pancasila'
  ];

  const TERM_OPTIONS = [
    'UTS Ganjil 2026',
    'UAS Ganjil 2026',
    'UTS Genap 2026',
    'UAS Genap 2026'
  ];

  // Fetch student list in same school
  useEffect(() => {
    if (!profile) return;

    async function fetchStudents() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, class_name, pseudonymous_id')
          .eq('role', 'student')
          .eq('school_id', profile!.school_id)
          .order('full_name', { ascending: true });

        if (error) throw error;
        if (data) setStudents(data as StudentProfile[]);
      } catch (err) {
        console.error('Error fetching students:', err);
      } finally {
        setLoadingStudents(false);
      }
    }

    fetchStudents();
  }, [profile]);

  // Fetch selected student's grades and moods
  useEffect(() => {
    if (!selectedStudent) {
      setGrades([]);
      setMoods([]);
      return;
    }

    async function fetchStudentDetails() {
      setLoadingGrades(true);
      try {
        const [gradesRes, moodsRes] = await Promise.all([
          supabase
            .from('academic_grades')
            .select('*')
            .eq('student_id', selectedStudent!.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('mood_entries')
            .select('created_at, mood_score')
            .eq('student_id', selectedStudent!.id)
            .order('created_at', { ascending: true })
        ]);

        if (gradesRes.data) setGrades(gradesRes.data as Grade[]);
        if (moodsRes.data) setMoods(moodsRes.data as MoodEntry[]);
      } catch (err) {
        console.error('Error fetching student details:', err);
      } finally {
        setLoadingGrades(false);
      }
    }

    fetchStudentDetails();
  }, [selectedStudent]);

  // Filter students based on search
  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.class_name && s.class_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle grade submission
  async function handleSubmitGrade(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !selectedStudent || !subject || !score) return;

    const parsedScore = parseFloat(score);
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      alert('Nilai harus berupa angka antara 0 dan 100');
      return;
    }

    try {
      if (editingGradeId) {
        // Update existing grade
        const { error } = await supabase
          .from('academic_grades')
          .update({
            subject,
            score: parsedScore,
            term,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingGradeId);

        if (error) throw error;
        setGrades(grades.map(g => g.id === editingGradeId ? { ...g, subject, score: parsedScore, term } : g));
        setEditingGradeId(null);
      } else {
        // Insert new grade
        const { data, error } = await supabase
          .from('academic_grades')
          .insert({
            student_id: selectedStudent.id,
            subject,
            score: parsedScore,
            term,
            inputted_by: profile.id
          })
          .select();

        if (error) throw error;
        if (data) setGrades([...grades, data[0] as Grade]);
      }

      // Reset form
      setSubject('');
      setScore('');
    } catch (err) {
      console.error('Error saving grade:', err);
      alert('Gagal menyimpan nilai');
    }
  }

  // Handle delete grade
  async function handleDeleteGrade(id: string) {
    if (!confirm('Apakah Anda yakin ingin menghapus data nilai ini?')) return;

    try {
      const { error } = await supabase
        .from('academic_grades')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setGrades(grades.filter(g => g.id !== id));
    } catch (err) {
      console.error('Error deleting grade:', err);
      alert('Gagal menghapus nilai');
    }
  }

  // Handle edit mode
  function handleStartEdit(g: Grade) {
    setEditingGradeId(g.id);
    setSubject(g.subject);
    setScore(g.score.toString());
    setTerm(g.term);
  }

  // Prep chart data
  const chartData = grades.map(g => {
    const gradeDate = new Date(g.created_at);
    const oneWeekAgo = new Date(g.created_at);
    oneWeekAgo.setDate(gradeDate.getDate() - 7);

    const matchingMoods = moods.filter(m => {
      const moodDate = new Date(m.created_at);
      return moodDate >= oneWeekAgo && moodDate <= gradeDate;
    });

    const avgMood = matchingMoods.length
      ? matchingMoods.reduce((sum, m) => sum + m.mood_score, 0) / matchingMoods.length
      : 5;

    return {
      name: `${g.subject} (${g.term})`,
      'Nilai Akademik': Number(g.score),
      'Kondisi Mood (x10)': Math.round(avgMood * 10)
    };
  });

  // Calculate statistics
  const averageGrade = grades.length
    ? Math.round(grades.reduce((sum, g) => sum + Number(g.score), 0) / grades.length * 10) / 10
    : 0;

  let latestGradeTrend = 0;
  if (grades.length >= 2) {
    latestGradeTrend = Number(grades[grades.length - 1].score) - Number(grades[grades.length - 2].score);
  }

  // Diagnosis classification
  const getBurnoutDiagnosis = () => {
    if (grades.length === 0) return { level: 'Belum Ada Data', badge: 'bg-cosmic-border/20 text-text-secondary' };
    const latestGradeScore = Number(grades[grades.length - 1].score);
    const latestMoods = moods.slice(-5);
    const avgLatestMood = latestMoods.length
      ? latestMoods.reduce((sum, m) => sum + m.mood_score, 0) / latestMoods.length
      : 5;
    const isDropping = latestGradeTrend < -8;

    if (avgLatestMood >= 7 && latestGradeScore >= 75 && !isDropping) {
      return { level: 'Stabil & Berprestasi', badge: 'bg-accent-teal/15 text-accent-teal' };
    } else if (avgLatestMood < 5.5 && latestGradeScore >= 75) {
      return { level: 'Stres Akademis Tinggi (Hidden)', badge: 'bg-accent-purple/15 text-[#A78BFA]' };
    } else if (isDropping && avgLatestMood < 5.5) {
      return { level: 'Burnout Akademis Kritis', badge: 'bg-accent-coral/15 text-accent-coral' };
    } else if (latestGradeScore < 65 && avgLatestMood >= 6) {
      return { level: 'Butuh Bimbingan Belajar', badge: 'bg-[#A78BFA]/15 text-[#A78BFA]' };
    } else {
      return { level: 'Keseimbangan Cukup', badge: 'bg-cosmic-border/30 text-[#7B8EC8]' };
    }
  };

  const diagnosis = getBurnoutDiagnosis();

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="page-title font-bold text-glow-purple flex items-center gap-2">
          <GraduationCap className="text-[#3ECFB2]" /> Input & Evaluasi Nilai Siswa
        </h1>
        <p className="text-text-secondary text-sm">
          Kelola nilai akademik siswa untuk mendeteksi korelasi antara performa belajar dan kondisi emosional mereka.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Column: Student List Search */}
        <div className="md:col-span-4 space-y-4">
          <div className="card p-4 border-cosmic-border/50 space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-[#526895]" size={16} />
              <input 
                type="text" 
                placeholder="Cari nama atau kelas..."
                className="input pl-10 text-xs w-full"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {loadingStudents ? (
                <div className="text-center py-4 text-xs text-text-secondary">Memuat daftar siswa...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-4 text-xs text-text-secondary">Siswa tidak ditemukan</div>
              ) : (
                filteredStudents.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedStudent(s);
                      setEditingGradeId(null);
                      setSubject('');
                      setScore('');
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                      selectedStudent?.id === s.id
                        ? 'bg-gradient-to-r from-accent-purple/20 to-accent-teal/10 border-accent-teal/40 text-[#3ECFB2]'
                        : 'bg-[#0D1424]/40 border-cosmic-border/40 hover:border-cosmic-border/80 text-text-secondary hover:text-[#F0F4FF]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate">{s.full_name}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">{s.class_name || 'Tidak ada kelas'}</p>
                    </div>
                    <User size={14} className="opacity-40" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Grades and Analysis Panel */}
        <div className="md:col-span-8">
          {selectedStudent ? (
            <div className="space-y-6">
              
              {/* Student Header */}
              <div className="card p-6 border-cosmic-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-accent-teal font-mono font-bold uppercase tracking-wider">PROFIL TERPILIH</span>
                  <h3 className="font-bold text-lg text-[#F0F4FF]">{selectedStudent.full_name}</h3>
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <span>Kelas: {selectedStudent.class_name || '-'}</span>
                    <span>•</span>
                    <span>Pseudonym ID: {selectedStudent.pseudonymous_id.slice(0, 10)}…</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 p-4 bg-[#0A0E1A]/80 border border-cosmic-border/40 rounded-2xl">
                  <div className="text-right">
                    <p className="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Rata-rata Nilai</p>
                    <p className="text-xl font-bold font-mono text-accent-teal">{averageGrade || '-'}</p>
                  </div>
                  <div className="text-right border-l border-cosmic-border/30 pl-6">
                    <p className="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Diagnosis BK</p>
                    <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide mt-1 ${diagnosis.badge}`}>
                      {diagnosis.level}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-cosmic-border/40">
                <button
                  onClick={() => setActiveTab('input')}
                  className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
                    activeTab === 'input'
                      ? 'border-[#3ECFB2] text-[#3ECFB2]'
                      : 'border-transparent text-text-secondary hover:text-[#F0F4FF]'
                  }`}
                >
                  Kelola & Input Nilai
                </button>
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
                    activeTab === 'analysis'
                      ? 'border-[#3ECFB2] text-[#3ECFB2]'
                      : 'border-transparent text-text-secondary hover:text-[#F0F4FF]'
                  }`}
                >
                  Analisis Korelasi Mental
                </button>
              </div>

              {/* Tab Content 1: Manage Grades */}
              {activeTab === 'input' && (
                <div className="space-y-6">
                  {/* Grade Input Form */}
                  <div className="card p-6 border-cosmic-border/50">
                    <h4 className="font-bold text-xs text-[#F0F4FF] mb-4 uppercase tracking-wider flex items-center gap-2">
                      {editingGradeId ? <Edit3 size={14} className="text-[#3ECFB2]" /> : <Plus size={14} className="text-[#3ECFB2]" />}
                      {editingGradeId ? 'Edit Data Nilai' : 'Input Nilai Akademik Baru'}
                    </h4>
                    
                    <form onSubmit={handleSubmitGrade} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-text-secondary font-mono font-bold uppercase">Mata Pelajaran</label>
                        <select 
                          className="input text-xs w-full h-10"
                          value={subject}
                          onChange={e => setSubject(e.target.value)}
                          required
                        >
                          <option value="">Pilih Mata Pelajaran</option>
                          {SUBJECT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          <option value="Kustom">-- Lainnya --</option>
                        </select>
                      </div>

                      {subject === 'Kustom' && (
                        <div className="space-y-1.5 animate-fade-in">
                          <label className="text-[10px] text-text-secondary font-mono font-bold uppercase">Tulis Pelajaran</label>
                          <input 
                            type="text" 
                            placeholder="Mata pelajaran..."
                            className="input text-xs w-full h-10"
                            onChange={e => setSubject(e.target.value)}
                            required
                          />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-text-secondary font-mono font-bold uppercase">Skor Nilai (0 - 100)</label>
                        <input 
                          type="number" 
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="Contoh: 85.50"
                          className="input text-xs w-full h-10 font-mono"
                          value={score}
                          onChange={e => setScore(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-text-secondary font-mono font-bold uppercase">Semester / Evaluasi</label>
                        <select 
                          className="input text-xs w-full h-10"
                          value={term}
                          onChange={e => setTerm(e.target.value)}
                          required
                        >
                          {TERM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>

                      <div className="sm:col-span-3 flex justify-end gap-2 pt-2 border-t border-cosmic-border/30 mt-2">
                        {editingGradeId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGradeId(null);
                              setSubject('');
                              setScore('');
                            }}
                            className="btn bg-cosmic-card-light text-text-secondary hover:text-white px-4 py-2 text-xs"
                          >
                            Batal
                          </button>
                        )}
                        <button
                          type="submit"
                          className="btn-luminous-teal text-black font-bold px-5 py-2 text-xs flex items-center gap-1.5"
                        >
                          {editingGradeId ? <Check size={14} /> : <Plus size={14} />}
                          {editingGradeId ? 'Perbarui Nilai' : 'Simpan Nilai'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Grades Table */}
                  <div className="card border-cosmic-border/50 overflow-hidden">
                    <div className="px-6 py-4 border-b border-cosmic-border/40 bg-[#121A30]/30">
                      <h4 className="font-bold text-xs text-[#F0F4FF] uppercase tracking-wider">Riwayat Nilai</h4>
                    </div>

                    {loadingGrades ? (
                      <div className="text-center py-8 text-xs text-text-secondary">Memuat riwayat nilai...</div>
                    ) : grades.length === 0 ? (
                      <div className="text-center py-8 text-xs text-text-secondary flex flex-col items-center gap-2">
                        <AlertCircle size={28} className="text-[#526895]" />
                        <span>Belum ada data nilai untuk siswa ini</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-cosmic-border/40 text-text-secondary font-mono font-bold uppercase tracking-wider bg-black/10">
                              <th className="px-6 py-3">Mata Pelajaran</th>
                              <th className="px-6 py-3">Evaluasi / Term</th>
                              <th className="px-6 py-3">Nilai</th>
                              <th className="px-6 py-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-cosmic-border/20">
                            {grades.map(g => (
                              <tr key={g.id} className="hover:bg-[#121A30]/20 transition-colors">
                                <td className="px-6 py-3.5 font-bold text-[#F0F4FF]">{g.subject}</td>
                                <td className="px-6 py-3.5 text-text-secondary">{g.term}</td>
                                <td className="px-6 py-3.5 font-bold font-mono">
                                  <span className={`px-2 py-0.5 rounded ${
                                    g.score >= 80 ? 'text-[#3ECFB2] bg-[#3ECFB2]/10'
                                    : g.score >= 65 ? 'text-[#A78BFA] bg-[#A78BFA]/10'
                                    : 'text-accent-coral bg-accent-coral/10'
                                  }`}>
                                    {g.score}
                                  </span>
                                </td>
                                <td className="px-6 py-3.5 text-right space-x-1.5">
                                  <button
                                    onClick={() => handleStartEdit(g)}
                                    className="p-1.5 hover:bg-[#1E2D4A]/50 rounded-lg text-[#7B8EC8] hover:text-[#3ECFB2] transition-all"
                                    title="Edit"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteGrade(g.id)}
                                    className="p-1.5 hover:bg-[#FF6B8A]/10 rounded-lg text-[#7B8EC8] hover:text-accent-coral transition-all"
                                    title="Hapus"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab Content 2: Mental Health Correlation Chart */}
              {activeTab === 'analysis' && (
                <div className="space-y-6">
                  {grades.length > 0 ? (
                    <div className="card p-6 border-cosmic-border/50">
                      <h4 className="font-bold text-xs text-[#F0F4FF] mb-1 uppercase tracking-wider">Korelasi Akademis & Stabilitas Emosional</h4>
                      <p className="text-text-secondary text-[11px] mb-6">Melihat dampak kesehatan mental terhadap nilai akademik siswa. Data mood diambil dari rata-rata seminggu sebelum ujian.</p>
                      
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="#526895" style={{ fontSize: 9 }} />
                            <YAxis stroke="#526895" style={{ fontSize: 9 }} domain={[0, 100]} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0D1424', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12 }}
                              labelStyle={{ color: '#F0F4FF', fontWeight: 'bold', fontSize: 11 }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                            <Line type="monotone" dataKey="Nilai Akademik" stroke="#3ECFB2" strokeWidth={3} activeDot={{ r: 7 }} />
                            <Line type="monotone" dataKey="Kondisi Mood (x10)" stroke="#A78BFA" strokeWidth={3} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-center text-[9px] text-text-secondary font-mono mt-3">
                        *Catatan: Skor mood (1-10) dikalikan 10 untuk kemudahan visualisasi sejajar dengan nilai akademik (0-100).
                      </p>
                    </div>
                  ) : (
                    <div className="card p-8 border-cosmic-border/50 text-center text-xs text-text-secondary">
                      Belum ada data nilai untuk membuat korelasi grafik.
                    </div>
                  )}

                  <div className="card p-6 border-cosmic-border/50 space-y-4">
                    <h4 className="font-bold text-xs text-[#F0F4FF] uppercase tracking-wider flex items-center gap-2">
                      <Brain size={15} className="text-[#A78BFA]" /> Petunjuk Interpretasi Konseling
                    </h4>
                    <ul className="text-xs text-text-secondary space-y-3 list-disc pl-4 leading-relaxed">
                      <li>
                        <strong className="text-accent-teal">Korelasi Positif Sehat</strong>: Performa nilai tinggi sejalan dengan mood yang tinggi (7-10). Siswa dapat menjaga keseimbangan hidup dengan baik.
                      </li>
                      <li>
                        <strong className="text-[#A78BFA]">High-Functioning Anxiety</strong>: Nilai tetap tinggi namun mood rendah/menurun tajam. Siswa kemungkinan memaksakan diri di bawah tekanan tinggi (rentan stres akademis).
                      </li>
                      <li>
                        <strong className="text-accent-coral">Sinyal Burnout Kritis</strong>: Terjadi penurunan nilai akademik sejalan dengan mood yang berada di zona krisis (1-5). Butuh intervensi BK segera.
                      </li>
                    </ul>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="card p-12 border-cosmic-border/50 text-center flex flex-col items-center justify-center h-96 space-y-4">
              <GraduationCap size={48} className="text-[#526895] animate-pulse" />
              <h3 className="font-bold text-base text-[#F0F4FF]">Silakan Pilih Siswa</h3>
              <p className="text-text-secondary text-xs max-w-sm">
                Gunakan panel di sebelah kiri untuk mencari dan memilih siswa untuk melihat, memasukkan, atau menganalisis data nilai akademik.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
