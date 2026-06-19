import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SoulOrb from './SoulOrb';

export function RequireAuth() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cosmic-bg flex flex-col items-center justify-center gap-4">
        <SoulOrb size="md" moodScore={7} />
        <p className="text-[10px] font-mono font-bold tracking-widest text-[#3ECFB2] uppercase animate-pulse">Menghubungkan Sanctuary...</p>
      </div>
    );
  }

  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

export function RequireRole({ role }: { role: 'student' | 'counselor' }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cosmic-bg flex flex-col items-center justify-center gap-4">
        <SoulOrb size="md" moodScore={7} />
        <p className="text-[10px] font-mono font-bold tracking-widest text-[#3ECFB2] uppercase animate-pulse">Memuat Otorisasi...</p>
      </div>
    );
  }

  if (!profile) return <Navigate to="/login" replace />;
  return profile.role === role ? <Outlet /> : <Navigate to={profile.role === 'counselor' ? '/dashboard' : '/student'} replace />;
}

export function RedirectIfAuthed() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cosmic-bg flex flex-col items-center justify-center gap-4">
        <SoulOrb size="md" moodScore={7} />
        <p className="text-[10px] font-mono font-bold tracking-widest text-[#3ECFB2] uppercase animate-pulse">Mengarahkan...</p>
      </div>
    );
  }

  if (session && profile) {
    return <Navigate to={profile.role === 'counselor' ? '/dashboard' : '/student'} replace />;
  }

  return <Outlet />;
}
