import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Shield, Users, MessageCircleHeart, TrendingUp, TrendingDown, Minus, Sparkles, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { MoodEntry, Alert } from '../../types';
import SoulOrb from '../../components/SoulOrb';

const EMOJIS  = ['😢','😞','😕','😐','🙂','😊','😄','🥰','🤩','✨'];
const LABELS  = ['Sangat Buruk','Buruk','Kurang Baik','Cukup','Biasa','Lumayan','Baik','Sangat Baik','Luar Biasa','Sempurna'];

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [recentMoods, setRecentMoods] = useState<MoodEntry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      supabase.from('mood_entries').select('*').eq('student_id', profile.id).order('created_at', { ascending: false }).limit(7),
      supabase.from('alerts').select('*').eq('student_id', profile.id).eq('is_read', false).order('triggered_at', { ascending: false }).limit(3),
    ]).then(([m, a]) => {
      if (m.data) setRecentMoods(m.data as MoodEntry[]);
      if (a.data) setAlerts(a.data as Alert[]);
      setLoading(false);
    });
  }, [profile]);

  const latestMood = recentMoods[0];
  const avgMood = recentMoods.length
    ? Math.round(recentMoods.reduce((s, m) => s + m.mood_score, 0) / recentMoods.length * 10) / 10
    : null;
  const trend = recentMoods.length >= 2 ? recentMoods[0].mood_score - recentMoods[1].mood_score : 0;

  const quickActions = [
    { to: '/student/mood', icon: Brain, label: 'Mood Tracker', desc: 'Catat jurnal & analisis AI', accentColor: '#7C5CFC' },
    { to: '/student/chatbot', icon: MessageCircleHeart, label: 'Curhat AI', desc: 'Bicara dengan asisten empati', accentColor: '#3ECFB2' },
    { to: '/student/report', icon: Shield, label: 'Bilik Curhat', desc: 'Laporkan perundungan anonim', accentColor: '#FF6B8A' },
    { to: '/student/safespace', icon: Users, label: 'SafeSpace', desc: 'Komunitas suportif', accentColor: '#A78BFA' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="relative">
        <SoulOrb size="md" moodScore={7} />
        <p className="text-xs font-mono font-bold tracking-widest text-accent-teal uppercase text-center mt-4 animate-pulse">Menghubungkan...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Hero Greeting & Soul Orb */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0D1424]/40 border border-cosmic-border/60 p-8 flex flex-col md:flex-row items-center justify-between gap-8 inner-glow-top">
        {/* Ambient glow inside hero */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-purple/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <div className="relative z-10 flex-1 space-y-4 text-center md:text-left">
          <p className="text-accent-teal text-xs font-mono font-bold uppercase tracking-wider">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="font-display font-bold text-3xl tracking-tight leading-tight">
            {greeting}, <span className="bg-gradient-to-r from-accent-purple to-accent-teal bg-clip-text text-transparent">{profile?.full_name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-text-secondary text-sm max-w-md leading-relaxed">
            Selamat datang di perlindungan jiwamu. Soul Orb di samping merepresentasikan keseimbangan emosionalmu saat ini.
          </p>
          {latestMood && (
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-[#121A30]/50 border border-cosmic-border/60 rounded-2xl">
              <span className="text-2xl">{EMOJIS[latestMood.mood_score - 1]}</span>
              <div className="text-left">
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Mood Terakhir</p>
                <p className="font-bold text-[#F0F4FF] text-xs">{LABELS[latestMood.mood_score - 1]}</p>
              </div>
            </div>
          )}
        </div>

        {/* Central Anchor Element: Soul Orb */}
        <div className="relative z-10 flex-shrink-0 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-accent-teal/5 rounded-full blur-2xl animate-pulse-slow" />
          <SoulOrb size="lg" moodScore={latestMood?.mood_score} />
        </div>
      </div>

      {/* Alert banner */}
      {alerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-accent-coral/10 border border-accent-coral/30 flex items-start gap-3 animate-slide-up">
          <div className="w-10 h-10 rounded-xl bg-accent-coral/20 flex items-center justify-center flex-shrink-0 border border-accent-coral/30">
            <Sparkles size={18} className="text-accent-coral" />
          </div>
          <div>
            <p className="font-bold text-accent-coral text-sm">Pesan Hangat Tim BK</p>
            <p className="text-text-secondary text-xs mt-0.5">{alerts[0].description}</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="section-title mb-4 font-bold tracking-tight">Eksplorasi Sanctuary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map(({ to, icon: Icon, label, desc, accentColor }, index) => (
            <Link key={to} to={to}
              className="group relative overflow-hidden rounded-2xl bg-[#0D1424]/75 backdrop-blur-xl border border-cosmic-border/40 p-5 cursor-pointer hover:border-accent-teal/40 transition-all duration-300 hover:-translate-y-1.5"
              style={{ boxShadow: '0 4px 20px -2px rgba(0,0,0,0.3)' }}>
              
              {/* Radial glow background on hover */}
              <div className="absolute inset-0 bg-radial-glow opacity-0 group-hover:opacity-10 transition-opacity duration-500" 
                style={{ background: `radial-gradient(circle at center, ${accentColor}33 0%, transparent 70%)` }} />
              
              <div className="w-12 h-12 rounded-xl bg-[#121A30] border border-cosmic-border flex items-center justify-center shadow-md mb-4 group-hover:border-[#3ECFB2]/50 transition-colors">
                <Icon size={20} className="text-[#7B8EC8] group-hover:text-[#3ECFB2] transition-colors" />
              </div>
              <p className="font-bold text-[#F0F4FF] text-sm group-hover:text-accent-teal transition-colors">{label}</p>
              <p className="text-text-secondary text-xs mt-1.5 leading-relaxed">{desc}</p>
              <ArrowRight size={14} className="absolute bottom-5 right-5 text-[#3D4F7A] group-hover:text-accent-teal group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </div>

      {/* Mood Trend */}
      {avgMood && recentMoods.length > 0 && (
        <div className="card p-6 border-cosmic-border/50 inner-glow-top">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title font-bold">Tren Keseimbangan (7 Hari)</h2>
            <div className={`flex items-center gap-1.5 text-xs font-bold font-mono px-3 py-1 rounded-full border ${
              trend > 0 ? 'bg-[#3ECFB2]/15 text-[#3ECFB2] border-[#3ECFB2]/30' 
              : trend < 0 ? 'bg-[#FF6B8A]/15 text-[#FF6B8A] border-[#FF6B8A]/30' 
              : 'bg-[#A78BFA]/15 text-[#A78BFA] border-[#A78BFA]/30'}`}>
              {trend > 0 ? <TrendingUp size={14} /> : trend < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
              {trend > 0 ? 'MEMBAIK' : trend < 0 ? 'MENURUN' : 'STABIL'}
            </div>
          </div>
          
          <div className="flex items-end gap-3 h-24 pt-4 border-b border-cosmic-border/40">
            {recentMoods.slice().reverse().map((m, i) => {
              const h = (m.mood_score / 10) * 100;
              const barGradient = m.mood_score <= 3 
                ? 'from-[#FF6B8A] to-[#db5371]' 
                : m.mood_score <= 5 
                ? 'from-[#A78BFA] to-[#7C5CFC]' 
                : 'from-[#3ECFB2] to-[#2bb599]';
              
              return (
                <div key={m.id} className="flex-1 flex flex-col items-center gap-2 group" title={`Skor: ${m.mood_score}`}>
                  <span className="text-[10px] font-mono font-bold text-[#3ECFB2] opacity-0 group-hover:opacity-100 transition-opacity">{m.mood_score}</span>
                  <div className="w-full flex items-end justify-center h-16">
                    <div className={`w-full max-w-[28px] rounded-t-lg bg-gradient-to-t ${barGradient} group-hover:brightness-110 transition-all duration-300 shadow-md`}
                      style={{ height: `${h}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-text-secondary font-mono">{recentMoods.length} entri terdata</span>
            <span className="text-sm font-bold font-mono text-accent-teal">Rata-rata: {avgMood}/10</span>
          </div>
        </div>
      )}

      {/* Recent Entries */}
      {recentMoods.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title font-bold">Jurnal Refleksi Terbaru</h2>
            <Link to="/student/mood" className="text-accent-teal hover:text-accent-lavender text-xs font-bold tracking-wide uppercase flex items-center gap-1 group transition-colors">
              Buka Tracker <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentMoods.slice(0, 3).map((entry, i) => (
              <div key={entry.id} className="card p-5 border-cosmic-border/40 hover:border-accent-teal/40 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all duration-300">
                <div className="text-3xl flex-shrink-0 animate-float-slow" style={{ animationDelay: `${i * 0.4}s` }}>
                  {EMOJIS[entry.mood_score - 1]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-4">
                    <span className="font-bold text-[#F0F4FF] text-sm">{LABELS[entry.mood_score - 1]}</span>
                    <span className="text-[10px] font-mono text-text-secondary">{new Date(entry.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <p className="text-text-secondary text-xs leading-relaxed line-clamp-2">{entry.journal_text}</p>
                  {entry.ai_feedback && (
                    <div className="mt-2 flex items-start gap-1 bg-[#121A30]/50 border border-cosmic-border/30 rounded-lg p-2">
                      <Sparkles size={11} className="text-accent-teal flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-accent-teal italic leading-relaxed">{entry.ai_feedback}</p>
                    </div>
                  )}
                </div>
                {entry.depression_risk_level && (
                  <span className={`badge-${entry.depression_risk_level} mt-2 sm:mt-0`}>
                    {entry.depression_risk_level}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card flex flex-col items-center justify-center py-16 text-center border-cosmic-border/50">
          <div className="w-16 h-16 rounded-2xl bg-[#121A30] border border-cosmic-border flex items-center justify-center mb-6 shadow-xl animate-float-slow">
            <Brain size={28} className="text-accent-teal" />
          </div>
          <h3 className="font-display font-bold text-[#F0F4FF] text-lg mb-2">Belum ada catatan mood</h3>
          <p className="text-text-secondary text-xs max-w-sm mb-6 leading-relaxed">Mulai catat perasaanmu hari ini. AI akan menganalisis kesehatan jiwamu secara otomatis.</p>
          <Link to="/student/mood" className="btn-primary">Catat Mood Pertamamu</Link>
        </div>
      )}
    </div>
  );
}
