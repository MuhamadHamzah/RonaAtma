import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Bell, AlertTriangle, MessageSquare, Brain, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Alert } from '../../types';

export default function CounselorOverview() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeAlerts: 0,
    pendingReports: 0,
    flaggedPosts: 0,
    avgMood: 0,
    resolvedToday: 0
  });
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('is_resolved', false),
      supabase.from('bullying_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('forum_posts').select('*', { count: 'exact', head: true }).eq('moderation_status', 'flagged'),
      supabase.from('mood_entries').select('mood_score'),
      supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('is_resolved', true).gte('resolved_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
      supabase.from('alerts').select('*, student:profiles(*)').eq('is_resolved', false).order('triggered_at', { ascending: false }).limit(4)
    ]).then(([st, al, rep, mod, moods, res, recentAl]) => {
      const moodScores = moods.data?.map(m => m.mood_score) || [];
      const avg = moodScores.length ? Math.round(moodScores.reduce((s, c) => s + c, 0) / moodScores.length * 10) / 10 : 0;
      
      setStats({
        totalStudents: st.count || 0,
        activeAlerts: al.count || 0,
        pendingReports: rep.count || 0,
        flaggedPosts: mod.count || 0,
        avgMood: avg,
        resolvedToday: res.count || 0
      });
      if (recentAl.data) setRecentAlerts(recentAl.data as Alert[]);
      setLoading(false);
    });
  }, []);

  const healthIndex = stats.avgMood;
  const healthLabel = healthIndex >= 7.0 ? 'BAIK' : healthIndex >= 5.0 ? 'PERLU PERHATIAN' : 'KRITIS';
  const healthColor = healthIndex >= 7.0 ? 'text-accent-teal border-[#3ECFB2]/30 bg-[#3ECFB2]/5' : healthIndex >= 5.0 ? 'text-accent-lavender border-[#A78BFA]/30 bg-[#A78BFA]/5' : 'text-accent-coral border-[#FF6B8A]/30 bg-[#FF6B8A]/5';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-transparent border-t-accent-teal rounded-full animate-spin" />
      </div>
    );
  }

  // Stat card templates
  const cardItems = [
    { title: 'Total Siswa Terdaftar', value: stats.totalStudents, icon: Users, color: 'text-accent-lavender' },
    { title: 'Peringatan Early Warning', value: stats.activeAlerts, icon: Bell, color: 'text-accent-coral' },
    { title: 'Laporan Perundungan Baru', value: stats.pendingReports, icon: AlertTriangle, color: 'text-accent-coral' },
    { title: 'Moderasi Forum', value: stats.flaggedPosts, icon: MessageSquare, color: 'text-accent-lavender' },
    { title: 'Rata-rata Mood Jurnal', value: `${stats.avgMood}/10`, icon: Brain, color: 'text-accent-teal' },
    { title: 'Kasus Ditangani Hari Ini', value: stats.resolvedToday, icon: ShieldCheck, color: 'text-accent-teal' }
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="page-title font-bold text-glow-purple">Ringkasan Misi Konseling</h1>
        <p className="text-text-secondary text-sm">Dashboard pemantauan terpadu bimbingan konseling RonaAtma.</p>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cardItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="card p-4 border-cosmic-border/50 flex flex-col justify-between hover:border-accent-purple/30 transition-all duration-300 inner-glow-top">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider leading-snug">{item.title}</span>
                <Icon size={14} className={item.color} />
              </div>
              <span className="text-xl font-mono font-bold text-[#F0F4FF] tracking-tight">{item.value}</span>
            </div>
          );
        })}
      </div>

      {/* Donut Mental Health Index & Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left - Health index donut */}
        <div className="lg:col-span-4 card p-6 border-cosmic-border/50 flex flex-col items-center justify-center text-center">
          <h2 className="section-title mb-6 font-bold">Mental Health Index</h2>
          
          <div className="relative w-40 h-40 mb-6 flex items-center justify-center">
            {/* SVG Donut */}
            <svg className="w-full h-full -rotate-90">
              <circle cx="80" cy="80" r="70" className="stroke-cosmic-border fill-none" strokeWidth="12" />
              <circle 
                cx="80" 
                cy="80" 
                r="70" 
                className="stroke-accent-teal fill-none transition-all duration-1000" 
                strokeWidth="12" 
                strokeDasharray="439.8" 
                strokeDashoffset={439.8 - (439.8 * (stats.avgMood / 10))}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-mono font-bold text-[#F0F4FF]">{stats.avgMood}</span>
              <span className="text-[10px] text-text-secondary font-mono">DARI 10</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-text-secondary uppercase font-bold tracking-widest font-mono">STATUS KESEHATAN SEKOLAH</p>
            <div className={`px-4 py-1.5 rounded-xl border text-xs font-bold font-mono tracking-wider ${healthColor}`}>
              {healthLabel}
            </div>
          </div>
        </div>

        {/* Right - Recent early warning list */}
        <div className="lg:col-span-8 card p-6 border-cosmic-border/50 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title font-bold">Peringatan Berisiko Terkini</h2>
            <Link to="/dashboard/alerts" className="text-accent-teal hover:text-accent-lavender text-xs font-bold uppercase tracking-wider flex items-center gap-1 group">
              Kelola Peringatan <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {recentAlerts.length > 0 ? (
            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="p-4 bg-[#121A30]/40 border border-cosmic-border/40 hover:border-accent-purple/30 rounded-xl flex items-start justify-between gap-4 transition-all duration-300">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-1 flex-shrink-0 relative">
                      {alert.severity === 'critical' ? (
                        <div className="w-2.5 h-2.5 bg-accent-coral rounded-full animate-ping absolute" />
                      ) : null}
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        alert.severity === 'critical' || alert.severity === 'high' 
                          ? 'bg-accent-coral' 
                          : alert.severity === 'medium' 
                          ? 'bg-accent-lavender' 
                          : 'bg-accent-teal'
                      }`} />
                    </div>
                    
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-bold text-[#F0F4FF] truncate">{alert.title}</p>
                      <p className="text-[11px] text-text-secondary line-clamp-1">{alert.description}</p>
                      <p className="text-[10px] text-text-muted font-bold">
                        SISWA: {alert.student?.full_name?.split(' ')[0] || 'Anonim'} — {alert.student?.class_name || 'BK'}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider flex-shrink-0 uppercase ${
                    alert.severity === 'critical' 
                      ? 'bg-accent-coral/20 text-accent-coral border border-accent-coral/30' 
                      : alert.severity === 'high' 
                      ? 'bg-accent-coral/15 text-accent-coral border border-accent-coral/20'
                      : alert.severity === 'medium' 
                      ? 'bg-accent-lavender/15 text-accent-lavender border border-accent-lavender/20' 
                      : 'bg-accent-teal/15 text-accent-teal border border-accent-teal/20'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <ShieldAlert size={28} className="text-accent-teal mb-3" />
              <p className="text-xs text-text-secondary">Tidak ada peringatan aktif. Semua kondisi siswa stabil hari ini.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
