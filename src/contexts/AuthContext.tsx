import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: any;
  role: string | null;
  isUserAdmin: boolean;
  isAuthenticated: boolean;
  authLoading: boolean;
  adminLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isUserAdmin: false,
  isAuthenticated: false,
  authLoading: true,
  adminLoading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);

  // ✅ Charger la session initiale
  useEffect(() => {
    let isMounted = true;

    const loadUserAndRole = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        const sessionUser = data?.session?.user ?? null;
        if (!isMounted) return;

        setUser(sessionUser);
        setAuthLoading(false);

        if (sessionUser) {
          setAdminLoading(true);

          // Récupérer le rôle dans la table profiles
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", sessionUser.id)
            .single();

          if (profileError) {
            console.warn("⚠️ Erreur lors du chargement du rôle:", profileError.message);
            setRole("user"); // rôle par défaut
          } else {
            setRole(profile?.role || "user");
          }

          setAdminLoading(false);
        } else {
          setRole(null);
          setAdminLoading(false);
        }
      } catch (err) {
        console.error("❌ Erreur AuthContext:", err);
        if (isMounted) {
          setAuthLoading(false);
          setAdminLoading(false);
        }
      }
    };

    loadUserAndRole();

    // 🔄 Écoute les changements d'authentification
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setAuthLoading(false);

      if (sessionUser) {
        setAdminLoading(true);
        supabase
          .from("profiles")
          .select("role")
          .eq("id", sessionUser.id)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.warn("⚠️ Erreur onAuthStateChange:", error.message);
              setRole("user");
            } else {
              setRole(data?.role || "user");
            }
            setAdminLoading(false);
          });
      } else {
        setRole(null);
        setAdminLoading(false);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

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
        adminLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
