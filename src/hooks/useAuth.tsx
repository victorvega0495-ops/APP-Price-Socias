import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface ProfileData {
  name: string;
  phone: string;
  partner_number: string;
  metodologia: string;
  pct_reposicion: number;
  pct_ganancia: number;
  pct_ahorro: number;
  avatar_url: string | null;
  visited_finanzas: boolean;
  visited_reto: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: ProfileData | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string, partnerNumber: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('name, phone, partner_number, metodologia, pct_reposicion, pct_ganancia, pct_ahorro, avatar_url, visited_finanzas, visited_reto')
      .eq('user_id', userId)
      .single();
    if (!data) {
      await supabase.from('profiles').insert({
        user_id: userId,
        name: 'Socia',
        metodologia: null,
        pct_reposicion: 65,
        pct_ganancia: 30,
        pct_ahorro: 20,
      });
      setProfile({
        name: '',
        phone: '',
        partner_number: '',
        metodologia: null,
        pct_reposicion: 65,
        pct_ganancia: 30,
        pct_ahorro: 20,
        avatar_url: null,
        visited_finanzas: false,
        visited_reto: false,
      });
      return;
    }
    const d = data as any;
    setProfile({
      name: d.name ?? '',
      phone: d.phone ?? '',
      partner_number: d.partner_number ?? '',
      metodologia: d.metodologia ?? null,
      pct_reposicion: Number(d.pct_reposicion ?? 65),
      pct_ganancia: Number(d.pct_ganancia ?? 30),
      pct_ahorro: Number(d.pct_ahorro ?? 20),
      avatar_url: d.avatar_url ?? null,
      visited_finanzas: d.visited_finanzas ?? false,
      visited_reto: d.visited_reto ?? false,
    });
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, phone: string, partnerNumber: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    if (!error) {
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) {
        await supabase.from('profiles').update({ phone, partner_number: partnerNumber }).eq('user_id', newUser.id);
      }
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
