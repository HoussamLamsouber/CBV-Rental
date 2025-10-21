import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { isAuthenticated, isUserAdmin, authLoading, adminLoading } = useAuth();

  // ✅ Tant que Supabase charge la session → on attend
  if (authLoading || adminLoading) {
    return <LoadingSpinner message="Vérification de votre session..." />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accès non autorisé</h1>
          <p className="text-muted-foreground mb-6">
            Vous devez être connecté pour accéder à cette page.
          </p>
          <Button onClick={() => navigate("/auth/signin")}>Se connecter</Button>
        </div>
      </div>
    );
  }

  if (adminOnly && !isUserAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accès refusé</h1>
          <p className="text-muted-foreground mb-6">
            Vous n'avez pas les droits administrateur nécessaires.
          </p>
          <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
