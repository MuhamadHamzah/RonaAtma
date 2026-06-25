import { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { 
  Bell, 
  Sun, 
  Moon, 
  GraduationCap, 
  AlertTriangle, 
  Shield, 
  Info, 
  Check, 
  Trash2,
  BellRing
} from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'grade' | 'alert' | 'bullying_report' | 'system';
  is_read: boolean;
  created_at: string;
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  // Notification states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching notifications:', error);
    } else if (data) {
      setNotifications(data as Notification[]);
    }
  };

  // Play a synthesized chime sound (ding-dong / G-Major bright chord)
  const playNotificationChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      
      // Tone 1 (C5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      // Tone 2 (E5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.08);
      gain2.gain.setValueAtTime(0, now + 0.08);
      gain2.gain.linearRampToValueAtTime(0.12, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.5);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.6);
    } catch (err) {
      console.error('Audio chime failed:', err);
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!profile) return;
    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`
      }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications(prev => [newNotif, ...prev.slice(0, 9)]);
        playNotificationChime();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`
      }, (payload) => {
        const updatedNotif = payload.new as Notification;
        setNotifications(prev => prev.map(n => n.id === updatedNotif.id ? updatedNotif : n));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`
      }, (payload) => {
        const deletedId = payload.old.id;
        setNotifications(prev => prev.filter(n => n.id !== deletedId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Action: Mark single notification as read
  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  // Action: Mark all as read
  const markAllAsRead = async () => {
    if (!profile || notifications.filter(n => !n.is_read).length === 0) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  // Action: Clear all notifications
  const clearNotifications = async () => {
    if (!profile || notifications.length === 0) return;
    if (!confirm('Apakah Anda yakin ingin menghapus semua notifikasi?')) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', profile.id);

      if (error) throw error;
      setNotifications([]);
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'grade':
        return <GraduationCap size={14} className="text-accent-teal" />;
      case 'alert':
        return <AlertTriangle size={14} className="text-accent-coral" />;
      case 'bullying_report':
        return <Shield size={14} className="text-accent-lavender" />;
      default:
        return <Info size={14} className="text-blue-400" />;
    }
  };

  const formatTime = (timeStr: string) => {
    const d = new Date(timeStr);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative min-h-screen bg-cosmic-bg text-[#F0F4FF] flex">
      {/* Ambient Backlight Glows */}
      <div className="absolute top-10 left-1/4 w-[400px] h-[400px] bg-accent-purple/5 rounded-full blur-[100px] pointer-events-none animate-pulse-slow z-0" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-accent-teal/5 rounded-full blur-[120px] pointer-events-none animate-pulse-slow z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-lavender/3 rounded-full blur-[150px] pointer-events-none animate-pulse-slow z-0" />

      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <main className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${collapsed ? 'md:ml-16' : 'md:ml-60'} ml-0 pb-28 md:pb-0 z-10`}>
        <header className="h-14 bg-cosmic-card-deep/70 backdrop-blur-md border-b border-cosmic-border/60 flex items-center justify-between px-6 sticky top-0 z-20 transition-all duration-300">
          <span className="font-display font-semibold text-glow-purple text-[#F0F4FF] text-sm">
            {profile?.role === 'counselor' ? 'Dashboard Guru BK' : 'Portal Siswa'}
          </span>
          
          <div className="flex items-center gap-3 relative" ref={dropdownRef}>
            {/* Notification Bell Button */}
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all relative overflow-hidden group ${
                isOpen 
                  ? 'bg-accent-purple/20 border-accent-purple/40 text-accent-teal shadow-inner' 
                  : 'bg-cosmic-card-light/80 hover:bg-[#1E2D4A]/60 text-[#7B8EC8] hover:text-[#3ECFB2] border-[#1E2D4A]'
              }`}
            >
              {unreadCount > 0 ? (
                <BellRing size={17} className="animate-wiggle text-accent-coral" />
              ) : (
                <Bell size={17} />
              )}
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#FF6B8A] rounded-full animate-ping" />
              )}
            </button>

            {/* Notification Dropdown Popover */}
            {isOpen && (
              <div 
                className="absolute right-0 top-11 w-80 rounded-2xl bg-cosmic-card-deep/95 backdrop-blur-xl border border-cosmic-border/60 p-4 shadow-2xl z-50 space-y-3 animate-slide-up"
                style={{ boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.6)' }}
              >
                <div className="flex items-center justify-between border-b border-cosmic-border/30 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-[#F0F4FF]">Notifikasi</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-accent-coral/15 text-[8px] font-bold text-accent-coral">
                        {unreadCount} Baru
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-[9px] text-accent-teal hover:underline font-bold"
                        title="Tandai semua dibaca"
                      >
                        Tandai dibaca
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button 
                        onClick={clearNotifications}
                        className="text-[9px] text-[#7B8EC8] hover:text-accent-coral transition-colors"
                        title="Hapus semua"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1 max-h-72 overflow-y-auto pr-1 divide-y divide-cosmic-border/10">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-xs text-text-secondary flex flex-col items-center gap-2">
                      <Bell size={24} className="opacity-30" />
                      <span>Tidak ada notifikasi baru</span>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id}
                        onClick={() => !n.is_read && markAsRead(n.id)}
                        className={`py-2 px-1 flex gap-3 text-left transition-all ${
                          !n.is_read ? 'cursor-pointer hover:bg-[#121A30]/30' : ''
                        }`}
                      >
                        <div className="w-6 h-6 rounded-lg bg-[#121A30] border border-cosmic-border/35 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {getNotifIcon(n.type)}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <p className={`text-[11px] truncate ${!n.is_read ? 'font-bold text-[#F0F4FF]' : 'text-text-secondary'}`}>
                            {n.title}
                          </p>
                          <p className="text-[10px] text-text-secondary leading-normal break-words line-clamp-2">
                            {n.content}
                          </p>
                          <p className="text-[8px] text-[#526895] font-mono">
                            {formatTime(n.created_at)}
                          </p>
                        </div>
                        {!n.is_read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-accent-teal mt-2.5 flex-shrink-0" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-accent-purple to-accent-teal flex items-center justify-center text-white text-xs font-bold shadow-md shadow-purple-500/10">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
          </div>
        </header>
        
        <div className="flex-1 p-4 md:p-6 animate-fade-in z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

