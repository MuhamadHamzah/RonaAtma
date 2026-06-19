import { useEffect, useState } from 'react';
import { Brain, Sparkles, AlertCircle, Link2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { anchorRecord, shortHash } from '../../lib/blockchain';
import type { MoodEntry, MoodAnalysisResult } from '../../types';
import SoulOrb from '../../components/SoulOrb';

const EMOJIS  = ['😢','😞','😕','😐','🙂','😊','😄','🥰','🤩','✨'];
const LABELS  = ['Sangat Buruk','Buruk','Kurang Baik','Cukup','Biasa','Lumayan','Baik','Sangat Baik','Luar Biasa','Sempurna'];

export default function MoodTracker() {
  const { profile } = useAuth();
  const [moodScore, setMoodScore] = useState(5);
  const [journalText, setJournalText] = useState('');
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [analysis, setAnalysis] = useState<MoodAnalysisResult | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 5;

  useEffect(() => {
    if (profile) fetchEntries();
  }, [profile, page]);

  async function fetchEntries() {
    if (!profile) return;
    setFetching(true);
    
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const [entriesRes, countRes] = await Promise.all([
      supabase.from('mood_entries').select('*').eq('student_id', profile.id).order('created_at', { ascending: false }).range(start, end),
      supabase.from('mood_entries').select('*', { count: 'exact', head: true }).eq('student_id', profile.id)
    ]);

    if (entriesRes.data) setEntries(entriesRes.data as MoodEntry[]);
    if (countRes.count) setTotalPages(Math.ceil(countRes.count / limit));
    setFetching(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || journalText.length < 20) return;

    setLoading(true);
    setAnalysis(null);

    // 1. Core local fallback result
    let sentiment_score = moodScore / 10;
    let depression_risk_level: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (moodScore <= 3) depression_risk_level = 'high';
    else if (moodScore <= 5) depression_risk_level = 'medium';

    let ai_feedback = 'Terima kasih telah mencurahkan perasaanmu. Tetaplah tegar.';
    const keywords: string[] = [];
    let crisis_detected = false;

    // Call Supabase Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('analyze-mood', {
        body: { journal_text: journalText, mood_score: moodScore }
      });
      if (error || !data) {
        throw new Error(error?.message || 'Empty or invalid response from mood analysis function');
      }
      sentiment_score = data.sentiment_score;
      depression_risk_level = data.depression_risk_level;
      ai_feedback = data.ai_feedback;
      keywords.push(...(data.keywords || []));
      crisis_detected = data.crisis_detected;
    } catch (err) {
      console.warn("Using local fallback mood analysis", err);
      const textLower = journalText.toLowerCase();
      if (textLower.includes('sedih') || textLower.includes('kecewa')) keywords.push('kesedihan');
      if (textLower.includes('marah') || textLower.includes('kesal')) keywords.push('kemarahan');
      if (textLower.includes('takut') || textLower.includes('cemas')) keywords.push('kecemasan');
      if (textLower.includes('bunuh diri') || textLower.includes('mati') || textLower.includes('akhiri hidup')) {
        crisis_detected = true;
        depression_risk_level = 'critical';
        ai_feedback = 'Kamu berharga. Tolong hubungi konselor BK sekolah atau guru terdekat segera.';
      }
    }

    // 2. Cryptographic anchoring (Web 2.5 Audit Trail)
    let on_chain_hash = '';
    let blockchain_tx_id = '';
    try {
      const record = await anchorRecord({
        type: 'mood_entry',
        student_id: profile.id,
        mood_score: moodScore,
        depression_risk_level,
        sentiment_score,
      });
      on_chain_hash = record.hash;
      blockchain_tx_id = record.tx_id;
    } catch (blockchainErr) {
      console.error("Blockchain anchor failure", blockchainErr);
    }

    // 3. Save to database
    const newEntry = {
      student_id: profile.id,
      journal_text: journalText,
      mood_score: moodScore,
      ai_sentiment_score: sentiment_score,
      depression_risk_level,
      ai_feedback,
      ai_keywords: keywords,
      on_chain_hash,
      blockchain_tx_id,
    };

    const { error: insertError } = await supabase.from('mood_entries').insert(newEntry);
    if (!insertError) {
      setJournalText('');
      setAnalysis({
        sentiment_score,
        depression_risk_level,
        ai_feedback,
        keywords,
        crisis_detected
      });

      // Auto-trigger BK alert if critical
      if (crisis_detected || depression_risk_level === 'critical' || depression_risk_level === 'high') {
        await supabase.from('alerts').insert({
          student_id: profile.id,
          alert_type: crisis_detected ? 'crisis_language' : 'mood_decline',
          severity: depression_risk_level,
          title: crisis_detected ? 'Deteksi Bahasa Krisis' : 'Penurunan Mood Signifikan',
          description: `Siswa terdeteksi berisiko ${depression_risk_level.toUpperCase()} berdasarkan refleksi harian. Jurnal: "${journalText.slice(0, 60)}..."`,
          ai_score: sentiment_score,
        });
      }

      setPage(1);
      fetchEntries();
    } else {
      console.error("Database insert error", insertError);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title font-bold text-glow-purple">Mood Tracker & AI Journal</h1>
          <p className="text-text-secondary text-sm">Catat emosimu untuk melatih kesadaran diri secara mendalam.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Section - Form & Selector */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="card-luminous p-6 space-y-6">
            
            {/* Interactive Color Changing Soul Orb Selector */}
            <div className="flex flex-col items-center justify-center p-4 bg-[#121A30]/30 rounded-2xl border border-cosmic-border/30">
              <div className="mb-6 relative">
                <SoulOrb size="md" moodScore={moodScore} />
                <span className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 font-mono font-bold text-accent-teal bg-cosmic-bg px-3 py-1 rounded-full border border-cosmic-border text-xs">
                  SKOR: {moodScore}
                </span>
              </div>
              
              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs font-bold text-text-secondary">
                  <span>SANGAT BURUK</span>
                  <span>SEMPURNA</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={moodScore} 
                  onChange={e => setMoodScore(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-cosmic-bg accent-accent-teal border border-cosmic-border"
                />
                <p className="text-center font-bold text-sm text-[#F0F4FF] mt-2">
                  {EMOJIS[moodScore - 1]} {LABELS[moodScore - 1]}
                </p>
              </div>
            </div>

            {/* Reflection Text Area */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">Refleksi Hari Ini (Min 20 Karakter)</label>
              <textarea 
                value={journalText} 
                onChange={e => setJournalText(e.target.value)}
                placeholder="Bagaimana harimu? Apakah ada yang mengganggumu? Tuliskan pikiranmu secara jujur di sini..."
                rows={5}
                className="textarea border-cosmic-border/60 focus:border-accent-purple/50 focus:ring-accent-purple/30"
                required
              />
              <div className="flex justify-between text-[10px] text-text-secondary font-mono">
                <span>Data terenkripsi dan dienkapsulasi</span>
                <span>{journalText.length} karakter</span>
              </div>
            </div>

            <button type="submit" disabled={loading || journalText.length < 20} 
              className="btn-primary w-full justify-center py-3 text-xs tracking-wider uppercase font-bold">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Menganalisis Emosi...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Brain size={14} />
                  Simpan & Analisis Jurnal
                </span>
              )}
            </button>
          </form>

          {/* AI Analysis Feedback Overlay Card */}
          {analysis && (
            <div className="card p-6 border-accent-teal/40 bg-accent-teal/5 animate-slide-up relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent-teal/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-4">
                <Sparkles size={20} className="text-accent-teal" />
                <h3 className="font-display font-bold text-sm text-[#F0F4FF]">Hasil Analisis Jiwa</h3>
                <span className={`ml-auto badge-${analysis.depression_risk_level}`}>
                  Risiko: {analysis.depression_risk_level}
                </span>
              </div>
              <p className="text-sm text-[#F0F4FF] leading-relaxed italic">{analysis.ai_feedback}</p>
              
              {analysis.keywords.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-mono text-text-secondary uppercase">Kata Kunci:</span>
                  {analysis.keywords.map(kw => (
                    <span key={kw} className="px-2 py-0.5 rounded-md bg-[#121A30] border border-cosmic-border text-xs text-accent-lavender font-medium">
                      #{kw}
                    </span>
                  ))}
                </div>
              )}

              {analysis.crisis_detected && (
                <div className="mt-4 p-3 rounded-xl bg-accent-coral/20 border border-accent-coral/40 flex items-start gap-2 text-accent-coral">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-semibold leading-relaxed">
                    Sistem mendeteksi indikasi krisis emosional. Konselor sekolah telah diberikan notifikasi prioritas untuk mendampingimu. Tetap aman!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section - Log List */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="section-title font-bold">Catatan Terdahulu</h2>

          {fetching ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-transparent border-t-accent-teal rounded-full animate-spin" />
            </div>
          ) : entries.length > 0 ? (
            <div className="space-y-3">
              {entries.map((item, idx) => (
                <div key={item.id} className="card p-4 border-cosmic-border/40 hover:border-accent-purple/30 transition-all duration-300"
                  style={{ background: idx === 0 ? 'rgba(18, 26, 48, 0.6)' : 'rgba(13, 20, 36, 0.7)' }}>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{EMOJIS[item.mood_score - 1]}</span>
                    <span className="text-[10px] font-mono text-text-secondary">
                      {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  
                  <p className="text-xs text-[#F0F4FF] line-clamp-3 leading-relaxed mb-3">{item.journal_text}</p>
                  
                  {item.ai_feedback && (
                    <p className="text-[11px] text-[#7B8EC8] italic bg-cosmic-bg/60 p-2 rounded-lg border border-cosmic-border/30 mb-3">
                      {item.ai_feedback}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-cosmic-border/30 text-[9px] font-mono text-[#3D4F7A]">
                    {item.on_chain_hash ? (
                      <span className="flex items-center gap-1 text-[#3ECFB2] hover:underline cursor-pointer" title={item.on_chain_hash}>
                        <Link2 size={10} />
                        On-chain: {shortHash(item.on_chain_hash)}
                      </span>
                    ) : (
                      <span>Offline Mode</span>
                    )}
                    {item.depression_risk_level && (
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                        item.depression_risk_level === 'critical' || item.depression_risk_level === 'high' 
                          ? 'bg-accent-coral/15 text-accent-coral border border-accent-coral/20' 
                          : 'bg-[#121A30] text-accent-teal border border-cosmic-border'
                      }`}>
                        {item.depression_risk_level}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary py-2 px-3 rounded-lg disabled:opacity-30">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-mono text-text-secondary">HALAMAN {page} DARI {totalPages}</span>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary py-2 px-3 rounded-lg disabled:opacity-30">
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-8 text-center border-cosmic-border/40">
              <p className="text-text-secondary text-xs">Belum ada riwayat catatan mood yang terdaftar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
