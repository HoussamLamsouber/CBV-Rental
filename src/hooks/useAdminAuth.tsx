// hooks/useAdminAuth.ts
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

export const useAdminAuth = () => {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const checkIfUserIsAdmin = async (user: User): Promise<boolean> => {
      try {
        // Vérifier dans la table user_roles si l'utilisateur a le rôle admin
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (error) {
          console.error('Erreur vérification rôle admin:', error);
          return false;
        }

        return !!data; // Retourne true si un enregistrement admin existe
      } catch (error) {
        console.error('Erreur vérification admin:', error);
        return false;
      }
    };

    const handleSignOut = async () => {
      try {
        await supabase.auth.signOut();
        setSession(null);
        setAdminUser(null);
        
        toast({
          title: "Accès refusé",
          description: "Vous n'avez pas les droits administrateur.",
          variant: "destructive",
        });
        
        navigate('/admin/login');
      } catch (error) {
        console.error('Erreur déconnexion admin:', error);
      }
    };

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error('Erreur récupération session admin:', error);
          await handleSignOut();
          return;
        }

        if (currentSession) {
          const isExpired = new Date(currentSession.expires_at! * 1000) < new Date();
          
          if (isExpired) {
            console.log('🔄 Session admin expirée, déconnexion automatique...');
            await handleSignOut();
            return;
          }

          // Vérifier si l'utilisateur est un admin
          const isAdmin = await checkIfUserIsAdmin(currentSession.user);
          
          if (!isAdmin) {
            console.log('🚫 Utilisateur non admin, déconnexion...');
            await handleSignOut();
            return;
          }

          setSession(currentSession);
          setAdminUser(currentSession.user);
        } else {
          setSession(null);
          setAdminUser(null);
        }
      } catch (error) {
        console.error('Erreur initialisation auth admin:', error);
        await handleSignOut();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        console.log('🔐 Événement auth admin:', event);

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setAdminUser(null);
          navigate('/admin/login');
        } 
        else if (currentSession) {
          // Vérifier le rôle admin à chaque changement
          const isAdmin = await checkIfUserIsAdmin(currentSession.user);
          
          if (!isAdmin) {
            await handleSignOut();
            return;
          }

          setSession(currentSession);
          setAdminUser(currentSession.user);
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
        description: "Vous avez été déconnecté de l'administration.",
      });
      navigate('/admin/login');
    } catch (error) {
      console.error('Erreur déconnexion admin:', error);
      toast({
        title: "Erreur de déconnexion",
        description: "Impossible de vous déconnecter.",
        variant: "destructive",
      });
    }
  };

  return {
    adminUser,
    session,
    loading,
    signOut,
    isAuthenticated: !!adminUser,
  };
};