import { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, Database, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
// No blockchain imports needed here anymore

const COLORS = ['#3ECFB2', '#A78BFA', '#FF6B8A', '#FF6B8A']; // Teal, Lavender, Coral

export default function Analytics() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    avgMood: 0,
    totalReports: 0,
    activeAlerts: 0,
    forumPosts: 0
  });
  const [moodTrend, setMoodTrend] = useState<{ day: string; mood: number }[]>([]);
  const [riskData, setRiskData] = useState<{ name: string; value: number }[]>([]);
  const [incidentData, setIncidentData] = useState<{ type: string; count: number }[]>([]);
  
  // School Weather Heatmap
  const [heatmapDays, setHeatmapDays] = useState<{ day: number; score: number }[]>([]);

  const [loading, setLoading] = useState(true);
  const [anchoring, setAnchoring] = useState(false);
  const [blockchainRecord, setBlockchainRecord] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    setLoading(true);
    
    const [students, reports, alerts, posts, moods] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('bullying_reports').select('*', { count: 'exact', head: true }),
      supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('is_resolved', false),
      supabase.from('forum_posts').select('*', { count: 'exact', head: true }),
      supabase.from('mood_entries').select('mood_score, created_at')
    ]);

    const moodScores = moods.data?.map(m => m.mood_score) || [];
    const avg = moodScores.length ? Math.round(moodScores.reduce((s, c) => s + c, 0) / moodScores.length * 10) / 10 : 0;

    setStats({
      totalStudents: students.count || 0,
      avgMood: avg,
      totalReports: reports.count || 0,
      activeAlerts: alerts.count || 0,
      forumPosts: posts.count || 0
    });

    // 1. Mock 14 days trend data
    const mockTrend = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return {
        day: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        mood: Number((6.0 + Math.random() * 2.5).toFixed(1))
      };
    });
    setMoodTrend(mockTrend);

    // 2. Risk levels donut data
    setRiskData([
      { name: 'Rendah (Healthy)', value: Math.max(5, Math.floor((students.count || 10) * 0.6)) },
      { name: 'Sedang (Caution)', value: Math.max(3, Math.floor((students.count || 10) * 0.25)) },
      { name: 'Tinggi (Distress)', value: Math.max(1, Math.floor((students.count || 10) * 0.1)) },
      { name: 'Kritis (Crisis)', value: Math.max(0, Math.floor((students.count || 10) * 0.05)) }
    ]);

    // 3. Bullying reports types count data
    setIncidentData([
      { type: 'Perundungan Fisik', count: Math.max(1, Math.floor((reports.count || 5) * 0.3)) },
      { type: 'Verbal Abuse', count: Math.max(2, Math.floor((reports.count || 5) * 0.4)) },
      { type: 'Cyberbullying', count: Math.max(1, Math.floor((reports.count || 5) * 0.2)) },
      { type: 'Lainnya', count: Math.max(0, Math.floor((reports.count || 5) * 0.1)) }
    ]);

    // 4. Generate school mental weather heatmap (28 days)
    const mockHeatmap = Array.from({ length: 28 }, (_, i) => ({
      day: i + 1,
      score: Math.floor(3.0 + Math.random() * 7.0) // values 3 to 10
    }));
    setHeatmapDays(mockHeatmap);

    setLoading(false);
  }

  async function handleAnchorAnalytics() {
    setAnchoring(true);
    setBlockchainRecord(null);
    try {
      const { data: anchorData } = await supabase.functions.invoke('blockchain-anchor', {
        body: {
          data: {
            type: 'school_mental_health_snapshot',
            avg_mood: stats.avgMood,
            total_students: stats.totalStudents,
            total_reports: stats.totalReports,
            active_alerts: stats.activeAlerts
          },
          dataType: 'crisisAlert',
          userId: 'counselor'
        }
      });
      if (anchorData?.anchorId) {
        setBlockchainRecord(String(anchorData.anchorId));
      }
    } catch (err) {
      console.error(err);
    }
    setAnchoring(false);
  }

  // Color helper for heatmap calendar cells
  function getHeatmapColor(score: number): string {
    if (score <= 4) return 'bg-accent-coral/80 border-accent-coral'; // Distress (purple/coral)
    if (score <= 6) return 'bg-[#7C5CFC]/60 border-accent-purple'; // Caution (purple)
    return 'bg-[#3ECFB2]/75 border-accent-teal'; // Healthy (teal)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-transparent border-t-accent-teal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title font-bold text-glow-purple">Analitik Kesehatan Jiwa Sekolah</h1>
          <p className="text-text-secondary text-sm">Visualisasi kondisi emosional dan statistik preventif perundungan.</p>
        </div>
        <button 
          onClick={handleAnchorAnalytics}
          disabled={anchoring}
          className="btn-primary flex-shrink-0 uppercase font-bold text-xs tracking-wider">
          <Database size={16} />
          {anchoring ? 'Mengunci Ledger...' : 'Snapshot Blockchain'}
        </button>
      </div>

      {/* Snapshot Confirmation Overlay */}
      {blockchainRecord && (
        <div className="p-4 rounded-xl bg-accent-teal/15 border border-[#3ECFB2]/30 text-[#F0F4FF] flex gap-3 items-center animate-slide-up">
          <Sparkles size={18} className="text-[#3ECFB2] flex-shrink-0" />
          <div className="text-xs">
            Snapshot statistik sekolah berhasil dikunci pada audit trail secara publik. 
            TX ID: <code className="font-mono text-accent-teal select-all ml-1">{blockchainRecord}</code>
          </div>
        </div>
      )}

      {/* Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Siswa', value: stats.totalStudents },
          { label: 'Rata-rata Mood', value: stats.avgMood },
          { label: 'Total Laporan', value: stats.totalReports },
          { label: 'Peringatan Aktif', value: stats.activeAlerts },
          { label: 'Postingan Forum', value: stats.forumPosts }
        ].map((item, i) => (
          <div key={i} className="card p-4 border-cosmic-border/50 inner-glow-top text-center">
            <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">{item.label}</p>
            <p className="text-2xl font-mono font-bold text-[#F0F4FF] mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Full Width Heatmap Calendar */}
      <div className="card p-6 border-cosmic-border/50 space-y-4">
        <div>
          <h2 className="section-title font-bold">Kalender Cuaca Emosional Sekolah</h2>
          <p className="text-text-secondary text-xs">Indikasi sebaran kondisi mental siswa harian selama satu periode terakhir.</p>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-2">
          {heatmapDays.map((item) => (
            <div 
              key={item.day} 
              className={`aspect-square sm:aspect-auto sm:h-12 rounded-lg border flex flex-col items-center justify-center transition-all hover:scale-105 ${getHeatmapColor(item.score)}`}
              title={`Hari ke-${item.day}: Indeks Emosi ${item.score}/10`}>
              <span className="text-[9px] font-bold text-cosmic-bg font-mono">D-{item.day}</span>
              <span className="hidden sm:inline text-xs font-mono font-extrabold text-cosmic-bg">{item.score}</span>
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-4 pt-2 text-[10px] font-bold text-text-secondary">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-accent-coral/80 border border-accent-coral" /> BURUK / TERTEKAN (1-4)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#7C5CFC]/60 border border-accent-purple" /> TENANG / NETRAL (5-6)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#3ECFB2]/75 border border-accent-teal" /> SEHAT / POSITIF (7-10)</span>
        </div>
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Trend Area chart */}
        <div className="lg:col-span-8 card p-6 border-cosmic-border/50 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-accent-teal/5 rounded-full blur-3xl pointer-events-none" />
          
          <h2 className="section-title mb-4 font-bold">Tren Indeks Mood Harian</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={moodTrend}>
                <defs>
                  <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3ECFB2" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#3ECFB2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
                <XAxis dataKey="day" stroke="#3D4F7A" fontSize={10} tickLine={false} />
                <YAxis stroke="#3D4F7A" fontSize={10} tickLine={false} domain={[0, 10]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(13, 20, 36, 0.95)', borderColor: '#1E2D4A', borderRadius: '12px' }} 
                  labelClassName="text-text-secondary text-xs"
                />
                <Area type="monotone" dataKey="mood" stroke="#3ECFB2" strokeWidth={2} fillOpacity={1} fill="url(#colorMood)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Donut Chart */}
        <div className="lg:col-span-4 card p-6 border-cosmic-border/50">
          <h2 className="section-title mb-4 font-bold">Sebaran Risiko Mental</h2>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value">
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'rgba(13, 20, 36, 0.95)', borderColor: '#1E2D4A', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-[10px] font-bold text-text-secondary">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3ECFB2]" /> HEALTHY</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#A78BFA]" /> CAUTION</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FF6B8A]" /> DISTRESS</span>
          </div>
        </div>

      </div>

      {/* Incidents Bar Chart */}
      <div className="card p-6 border-cosmic-border/50 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-accent-purple/5 rounded-full blur-3xl pointer-events-none" />
        <h2 className="section-title mb-4 font-bold">Kategori Laporan Perundungan Masuk</h2>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incidentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
              <XAxis dataKey="type" stroke="#3D4F7A" fontSize={10} tickLine={false} />
              <YAxis stroke="#3D4F7A" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(13, 20, 36, 0.95)', borderColor: '#1E2D4A', borderRadius: '12px' }} />
              
              {/* Highlight tallest bar with high glow opacity */}
              <Bar dataKey="count" fill="#7C5CFC" radius={[8, 8, 0, 0]}>
                {incidentData.map((entry, index) => {
                  const maxCount = Math.max(...incidentData.map(d => d.count));
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.count === maxCount ? '#3ECFB2' : '#7C5CFC'} 
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
