import { Car, Menu, X, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut, loading } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Déconnexion réussie", description: "À bientôt !" });
    navigate("/");
  };

  return (
    <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <img src="/logo-dark.webp" alt="Logo" className="h-8 md:h-16" />
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === "/" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Accueil
          </Link>
          <Link
            to="/offres"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === "/offres" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Offres
          </Link>
          {user && (
            <>
              <Link
                to="/ma-reservation"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === "/ma-reservation" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Ma réservation
              </Link>
              <Link
                to="/mon-compte"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === "/mon-compte" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Mon compte
              </Link>
              {role === "admin" && (
                <Link
                  to="/admin/vehicles"
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname === "/admin/vehicles" ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  Vehicules
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Boutons */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="hidden md:flex items-center gap-4">
            {loading ? (
              <div className="animate-pulse bg-muted h-9 w-20 rounded-md" />
            ) : user ? (
              <>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">
                    {user.user_metadata.full_name || user.email}
                  </span>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" /> Déconnexion
                </Button>
              </>
            ) : (
              <Button asChild variant="default" className="flex items-center gap-2">
                <Link to="/auth">
                  <User className="h-4 w-4" /> Connexion
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Menu mobile */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b shadow-lg">
            <nav className="flex flex-col p-4 space-y-4">
              <Link to="/" onClick={() => setIsMenuOpen(false)}>Accueil</Link>
              <Link to="/offres" onClick={() => setIsMenuOpen(false)}>Offres</Link>
              {user && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold">{user.user_metadata.full_name || user.email}</span>
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
                </div>
              )}
              {user && (
                <>
                  <Link to="/ma-reservation" onClick={() => setIsMenuOpen(false)}>Ma réservation</Link>
                  <Link to="/mon-compte" onClick={() => setIsMenuOpen(false)}>Mon compte</Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleSignOut();
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4" /> Déconnexion
                  </Button>
                </>
              )}
              {!user && (
                <Button asChild variant="default" onClick={() => setIsMenuOpen(false)}>
                  <Link to="/auth">Connexion</Link>
                </Button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
