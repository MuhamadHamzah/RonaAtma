import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: 'student' | 'counselor', className?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  async function fetchProfile(userId: string, email?: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data && mounted.current) {
      const currentProfile = data as Profile;
      setProfile(currentProfile);
    } else if (!data && mounted.current) {
      // Self-heal: profile record does not exist (created in auth but missing in profiles table)
      try {
        const emailVal = email || 'siswa@sekolah.sch.id';
        const fullName = emailVal.split('@')[0].replace(/[._-]/g, ' ');

        const newProfile = {
          id: userId,
          full_name: fullName.charAt(0).toUpperCase() + fullName.slice(1),
          role: 'student' as const, // default role
          school_id: 'SCHOOL_DEFAULT',
          pseudonymous_id: 'pending-' + userId.slice(0, 8),
          wallet_address: null,
          consent_given: true,
          email: emailVal,
        };

        const { error: insertError } = await supabase.from('profiles').insert(newProfile);
        if (!insertError) {
          setProfile(newProfile as unknown as Profile);
        } else {
          console.error("Failed to self-heal profile:", insertError);
        }
      } catch (e) {
        console.error("Exception during profile self-healing:", e);
      }
    }
  }

  useEffect(() => {
    mounted.current = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted.current) return;
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email).finally(() => { if (mounted.current) setLoading(false); });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted.current) return;
      setSession(session);
      if (session?.user) fetchProfile(session.user.id, session.user.email);
      else setProfile(null);
    });

    return () => { mounted.current = false; subscription.unsubscribe(); };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string, fullName: string, role: 'student' | 'counselor', className?: string) {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/success`,
        data: {
          full_name: fullName,
          role,
          class_name: className ?? null
        }
      }
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Pendaftaran gagal. Coba lagi.' };

    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function refreshProfile() {
    if (session?.user) await fetchProfile(session.user.id, session.user.email);
  }


  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
