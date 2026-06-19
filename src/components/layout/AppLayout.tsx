import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Bell, Sun, Moon } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative min-h-screen bg-cosmic-bg text-[#F0F4FF] flex overflow-x-hidden">
      {/* Ambient Backlight Glows */}
      <div className="absolute top-10 left-1/4 w-[400px] h-[400px] bg-accent-purple/5 rounded-full blur-[100px] pointer-events-none animate-pulse-slow z-0" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-accent-teal/5 rounded-full blur-[120px] pointer-events-none animate-pulse-slow z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-lavender/3 rounded-full blur-[150px] pointer-events-none animate-pulse-slow z-0" />

      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <main className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${collapsed ? 'md:ml-16' : 'md:ml-60'} ml-0 pb-20 md:pb-0 z-10`}>
        <header className="h-14 bg-cosmic-card-deep/70 backdrop-blur-md border-b border-cosmic-border/60 flex items-center justify-between px-6 sticky top-0 z-20 transition-all duration-300">
          <span className="font-display font-semibold text-glow-purple text-[#F0F4FF] text-sm">
            {profile?.role === 'counselor' ? 'Dashboard Guru BK' : 'Portal Siswa'}
          </span>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-xl bg-cosmic-card-light/80 hover:bg-[#1E2D4A]/60 flex items-center justify-center text-[#7B8EC8] hover:text-[#3ECFB2] border border-[#1E2D4A] transition-all relative overflow-hidden group">
              <Bell size={17} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#FF6B8A] rounded-full animate-ping" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-accent-purple to-accent-teal flex items-center justify-center text-white text-xs font-bold shadow-md shadow-purple-500/10">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
