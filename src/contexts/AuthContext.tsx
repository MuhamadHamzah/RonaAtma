import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { generatePseudonymousId, generateDeterministicWallet } from '../lib/blockchain';
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
  linkExternalWallet: (address: string) => Promise<{ error: string | null }>;
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
      // Auto-generate a wallet address if it doesn't exist for students
      if (!currentProfile.wallet_address && currentProfile.role === 'student') {
        const derivedWallet = await generateDeterministicWallet(userId);
        // Best effort background update
        void supabase.from('profiles').update({ wallet_address: derivedWallet }).eq('id', userId);
        currentProfile.wallet_address = derivedWallet;
      }
      setProfile(currentProfile);
    } else if (!data && mounted.current) {
      // Self-heal: profile record does not exist (created in auth but missing in profiles table)
      try {
        const emailVal = email || 'siswa@sekolah.sch.id';
        const fullName = emailVal.split('@')[0].replace(/[._-]/g, ' ');
        const pseudonymousId = await generatePseudonymousId(userId, 'SCHOOL_DEFAULT');
        const derivedWallet = await generateDeterministicWallet(userId);

        const newProfile = {
          id: userId,
          full_name: fullName.charAt(0).toUpperCase() + fullName.slice(1),
          role: 'student' as const, // default role
          school_id: 'SCHOOL_DEFAULT',
          pseudonymous_id: pseudonymousId,
          wallet_address: derivedWallet,
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
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Pendaftaran gagal. Coba lagi.' };

    const pseudonymousId = await generatePseudonymousId(data.user.id, 'SCHOOL_DEFAULT');
    const derivedWallet = role === 'student' ? await generateDeterministicWallet(data.user.id) : null;

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: fullName,
      role,
      school_id: 'SCHOOL_DEFAULT',
      class_name: className ?? null,
      pseudonymous_id: pseudonymousId,
      wallet_address: derivedWallet,
      consent_given: true,
      email,
    });

    if (profileError) return { error: profileError.message };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function refreshProfile() {
    if (session?.user) await fetchProfile(session.user.id, session.user.email);
  }

  async function linkExternalWallet(address: string) {
    if (!session?.user) return { error: 'Pengguna tidak terautentikasi' };
    const { error } = await supabase.from('profiles').update({ wallet_address: address }).eq('id', session.user.id);
    if (error) return { error: error.message };
    await fetchProfile(session.user.id, session.user.email);
    return { error: null };
  }


  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signIn, signUp, signOut, refreshProfile, linkExternalWallet }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

