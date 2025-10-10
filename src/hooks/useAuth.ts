// hooks/useAuth.ts (version simplifiée)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error('Erreur récupération session:', error);
          await handleSignOut();
          return;
        }

        if (currentSession) {
          const isExpired = new Date(currentSession.expires_at! * 1000) < new Date();
          
          if (isExpired) {
            console.log('🔄 Session expirée, déconnexion automatique...');
            await handleSignOut();
            return;
          }

          setSession(currentSession);
          setUser(currentSession.user);
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Erreur initialisation auth:', error);
        await handleSignOut();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const handleSignOut = async () => {
      try {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        
        toast({
          title: "Session expirée",
          description: "Votre session a expiré. Veuillez vous reconnecter.",
          variant: "destructive",
        });
        
        navigate('/auth');
      } catch (error) {
        console.error('Erreur déconnexion:', error);
      }
    };

    // Écouter les changements d'authentification - version simplifiée
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        console.log('🔐 Événement auth:', event);

        // Tous les événements qui indiquent une déconnexion
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          navigate('/auth');
        } 
        // Tous les événements qui indiquent une connexion ou mise à jour
        else if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès.",
      });
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      toast({
        title: "Erreur de déconnexion",
        description: "Impossible de vous déconnecter.",
        variant: "destructive",
      });
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
    isAuthenticated: !!user,
  };
};