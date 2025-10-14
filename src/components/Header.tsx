// components/Header.tsx - Version corrigée
import { Car, Menu, X, LogOut, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import { useToast } from "@/hooks/use-toast";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { user, signOut, loading: authLoading, isAuthenticated, role } = useAuth();
  const { isAdminMode, enterAdminMode, exitAdminMode, isUserAdmin } = useAdmin();

  console.log("🔧 Header: État complet", { 
    authLoading, 
    isAuthenticated, 
    role, 
    isUserAdmin, 
    isAdminMode,
    user: user?.email 
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la déconnexion",
        variant: "destructive",
      });
    }
  };

  const handleAdminModeToggle = () => {
    if (isAdminMode) {
      exitAdminMode();
      navigate("/");
      toast({
        title: "Mode client",
        description: "Vous êtes maintenant en mode client",
      });
    } else {
      enterAdminMode();
      navigate("/admin/vehicles");
      toast({
        title: "Mode admin",
        description: "Vous êtes maintenant en mode administrateur",
      });
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <img src="/logo-dark.webp" alt="Logo" className="h-8 md:h-16" />
        </Link>

        {/* Navigation desktop - Toujours visible */}
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === "/" ? "text-primary" : "text-muted-foreground"}`}>
            Accueil
          </Link>
          <Link to="/offres" className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === "/offres" ? "text-primary" : "text-muted-foreground"}`}>
            Offres
          </Link>
          <Link to="/ma-reservation" className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === "/ma-reservation" ? "text-primary" : "text-muted-foreground"}`}>
            Mes réservations
          </Link>

          {isAuthenticated && (
            <Link to="/mon-compte" className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === "/mon-compte" ? "text-primary" : "text-muted-foreground"}`}>
              Mon compte
            </Link>
          )}

          {isAdminMode && (
            <Link to="/admin/vehicles" className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname.startsWith("/admin") ? "text-primary" : "text-muted-foreground"}`}>
              Administration
            </Link>
          )}
        </nav>

        {/* Boutons utilisateur */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="hidden md:flex items-center gap-4">
            {authLoading ? (
              // Pendant le chargement, afficher un indicateur simple
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                Chargement...
              </div>
            ) : isAuthenticated ? (
              // Utilisateur connecté
              <>
                {isUserAdmin && (
                  <Button
                    variant={isAdminMode ? "default" : "outline"}
                    size="sm"
                    onClick={handleAdminModeToggle}
                    className="flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    {isAdminMode ? "Mode Admin" : "Mode Client"}
                  </Button>
                )}

                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">
                    {user?.user_metadata?.full_name || user?.email}
                    {isUserAdmin && " 👑"}
                  </span>
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </>
            ) : (
              // Utilisateur non connecté
              <Button asChild variant="default" className="flex items-center gap-2">
                <Link to="/auth">
                  <User className="h-4 w-4" />
                  Connexion
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};