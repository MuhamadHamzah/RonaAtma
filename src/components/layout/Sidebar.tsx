import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Brain, MessageCircleHeart, Shield, Users,
  Bell, AlertTriangle, BookOpen, BarChart3, LogOut, ChevronLeft, ChevronRight,
  Sparkles, Fingerprint, Heart, GraduationCap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps { collapsed: boolean; onToggle: () => void; }

const studentNav = [
  { to: '/student', icon: LayoutDashboard, label: 'Beranda', exact: true },
  { to: '/student/mood', icon: Brain, label: 'Mood' },
  { to: '/student/chatbot', icon: MessageCircleHeart, label: 'Curhat AI' },
  { to: '/student/report', icon: Shield, label: 'Bilik Curhat' },
  { to: '/student/safespace', icon: Users, label: 'SafeSpace' },
  { to: '/student/selfcare', icon: Heart, label: 'Self-Care' },
  { to: '/student/grades', icon: GraduationCap, label: 'Rapor Belajar' },
  { to: '/student/web3', icon: Sparkles, label: 'Pencapaian' },
];

const counselorNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Ringkasan', exact: true },
  { to: '/dashboard/alerts', icon: Bell, label: 'Peringatan' },
  { to: '/dashboard/reports', icon: AlertTriangle, label: 'Laporan' },
  { to: '/dashboard/moderation', icon: BookOpen, label: 'Moderasi' },
  { to: '/dashboard/analytics', icon: BarChart3, label: 'Analitik' },
  { to: '/dashboard/grades', icon: GraduationCap, label: 'Nilai Siswa' },
  { to: '/dashboard/audit', icon: Fingerprint, label: 'Audit' },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const nav = profile?.role === 'counselor' ? counselorNav : studentNav;

  async function handleSignOut() { await signOut(); navigate('/login'); }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`fixed left-0 top-0 h-full z-30 bg-cosmic-card1/90 backdrop-blur-xl border-r border-cosmic-border/60 hidden md:flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}
        style={{ boxShadow: '4px 0 24px -10px rgba(0,0,0,0.5)' }}>
        
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b border-cosmic-border/60 ${collapsed ? 'justify-center' : ''}`}>
          <img src="/RonaAtma.jpeg" alt="RonaAtma" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-cosmic-border" />
          {!collapsed && (
            <span className="font-display font-bold text-glow-purple bg-gradient-to-r from-accent-purple to-accent-teal bg-clip-text text-transparent text-base truncate">
              RonaAtma
            </span>
          )}
        </div>

        {/* Role badge */}
        {!collapsed && (
          <div className="px-4 py-3">
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold text-center bg-[#121A30]/80 border border-cosmic-border text-accent-teal">
              {profile?.role === 'counselor' ? 'Misi Kontrol BK' : 'Sanctuary Siswa'}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label, exact }) => (
            <NavLink key={to} to={to} end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 group
                ${isActive 
                  ? 'bg-gradient-to-r from-accent-purple/20 to-accent-teal/10 border border-[#7C5CFC]/30 text-[#3ECFB2] shadow-inner inner-glow-top' 
                  : 'text-[#7B8EC8] hover:bg-[#121A30]/50 hover:text-[#F0F4FF] border border-transparent'
                }
                ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? label : undefined}>
              {({ isActive }) => (
                <>
                  <Icon size={18} className={`flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-accent-teal' : 'text-[#7B8EC8]'}`} />
                  {!collapsed && <span>{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + actions */}
        <div className="border-t border-cosmic-border/60 p-3 space-y-2">
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 bg-[#121A30]/30 rounded-xl border border-cosmic-border/30">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-accent-purple to-accent-teal flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#F0F4FF] truncate">{profile?.full_name ?? 'Pengguna'}</p>
                {profile?.class_name && <p className="text-xs text-[#7B8EC8]/70 truncate">{profile.class_name}</p>}
              </div>
            </div>
          )}
          
          <button onClick={handleSignOut}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-[#7B8EC8] hover:bg-accent-coral/15 hover:text-[#FF6B8A] transition-all duration-300 ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Keluar' : undefined}>
            <LogOut size={18} />
            {!collapsed && 'Keluar'}
          </button>

          <button onClick={onToggle}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs text-[#3D4F7A] hover:text-[#7B8EC8] transition-all duration-300 ${collapsed ? 'justify-center' : ''}`}>
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Ciutkan</span></>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-cosmic-card1/85 backdrop-blur-xl border border-cosmic-border/80 rounded-2xl p-2 flex items-center gap-1 overflow-x-auto no-scrollbar shadow-2xl">
        <div className="flex items-center gap-1 w-full min-w-max px-1">
          {nav.map(({ to, icon: Icon, label, exact }) => (
            <NavLink key={to} to={to} end={exact}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-300 flex-shrink-0
                ${isActive 
                  ? 'bg-gradient-to-r from-accent-purple/20 to-accent-teal/10 border border-[#7C5CFC]/30 text-[#3ECFB2] shadow-inner' 
                  : 'text-[#7B8EC8] hover:bg-[#121A30]/50'
                }`}
              title={label}>
              <Icon size={16} className="flex-shrink-0" />
              <span className="text-[9px] font-semibold tracking-tight">{label}</span>
            </NavLink>
          ))}
          <button 
            onClick={handleSignOut} 
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold text-[#7B8EC8] hover:bg-accent-coral/15 hover:text-[#FF6B8A] transition-all duration-300 flex-shrink-0"
          >
            <LogOut size={16} />
            <span className="text-[9px] font-semibold tracking-tight">Keluar</span>
          </button>
        </div>
      </nav>
    </>
  );
}
