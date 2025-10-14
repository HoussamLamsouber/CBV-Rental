// components/ProtectedRoute.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('🚫 Accès non autorisé, redirection vers /auth');
      navigate('/auth');
    }

    // Vérification des droits admin
    if (!loading && isAuthenticated && adminOnly) {
      const isAdmin = user?.email === 'lamsouber.houssam@gmail.com';
      
      if (!isAdmin) {
        console.log('🚫 Accès admin refusé, redirection vers /');
        toast({
          title: "Accès refusé",
          description: "Vous n'avez pas les droits nécessaires pour accéder à cette page.",
          variant: "destructive",
        });
        navigate('/');
      }
    }
  }, [loading, isAuthenticated, user, adminOnly, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Accès non autorisé</h2>
          <p className="text-muted-foreground">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  // Vérification finale des droits admin
  if (adminOnly) {
    const isAdmin = user?.email === 'lamsouber.houssam@gmail.com';
    if (!isAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Accès refusé</h2>
            <p className="text-muted-foreground">Vous n'avez pas les droits administrateur.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};