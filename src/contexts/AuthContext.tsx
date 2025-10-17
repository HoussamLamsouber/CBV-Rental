import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useAuthCleanup } from '@/hooks/useAuthCleanup';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  authLoading: boolean;
  isAuthenticated: boolean;
  isUserAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useAuthCleanup(); // nettoie l'ancienne clé

  const fetchUserRole = async (userId: string, supabaseUser?: User) => {
    try {
      // Si le user a déjà un champ role (comme dans auth.user.role), tu peux l'utiliser directement
      const roleFromAuth = supabaseUser?.role;
      if (roleFromAuth) {
        setRole(roleFromAuth);
        return;
      }

      // Sinon on récupère depuis profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erreur récupération rôle:', error);
        setRole(null);
      } else {
        setRole(data?.role ?? null);
      }
    } catch (err) {
      console.error('Erreur lors du fetch du rôle:', err);
      setRole(null);
    }
  };



  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) console.error(error);

        setSession(session ?? null);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserRole(session.user.id, session.user);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    initAuth();

    // ⚡ Timeout fallback : si Supabase prend trop de temps
    const fallbackTimeout = setTimeout(() => {
      if (mounted) setAuthLoading(false);
    }, 5000); // 5 secondes max de chargement

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setSession(session ?? null);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserRole(session.user.id, session.user);
      } else {
        setRole(null);
      }

      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const isAuthenticated = !!user && !!session;
  const isUserAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        authLoading,
        isAuthenticated,
        isUserAdmin,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
