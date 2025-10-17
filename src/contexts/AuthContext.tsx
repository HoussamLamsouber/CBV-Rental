import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: any;
  role: string | null;
  isUserAdmin: boolean;
  isAuthenticated: boolean;
  authLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isUserAdmin: false,
  isAuthenticated: false,
  authLoading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 🔹 Charger la session initiale
  useEffect(() => {
    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Erreur récupération session:", error);
        setAuthLoading(false);
        return;
      }

      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      setAuthLoading(false);
    };

    loadSession();

    // 🔄 Écoute des changements d'authentification
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 🧠 Charger le rôle depuis la table `profiles`
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRole(null);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) {
          console.warn("Erreur lors du chargement du rôle:", error.message);
          setRole(null);
          return;
        }

        setRole(profile?.role || null);
      } catch (err) {
        console.error("Erreur inconnue:", err);
        setRole(null);
      }
    };

    fetchUserRole();
  }, [user]);

  // 🚪 Déconnexion
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRole(null);
    } catch (err) {
      console.error("Erreur lors de la déconnexion:", err);
    }
  };

  const isUserAdmin = role?.toLowerCase() === "admin";
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isUserAdmin,
        isAuthenticated,
        authLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
