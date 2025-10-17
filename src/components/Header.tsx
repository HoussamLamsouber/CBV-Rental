import { Menu, X, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, authLoading, isAuthenticated, isUserAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: "Déconnexion réussie", description: "À bientôt !" });
      navigate('/');
    } catch {
      toast({ title: "Erreur", description: "Impossible de vous déconnecter", variant: "destructive" });
    }
  };

  return (
    <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <img src="/logo-dark.webp" alt="Logo" className="h-8 md:h-16" />
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className={location.pathname === '/' ? 'text-primary font-semibold' : 'text-muted-foreground'}>Accueil</Link>
          <Link to="/offres" className={location.pathname === '/offres' ? 'text-primary font-semibold' : 'text-muted-foreground'}>Offres</Link>
          <Link to="/ma-reservation" className={location.pathname === '/ma-reservation' ? 'text-primary font-semibold' : 'text-muted-foreground'}>Mes réservations</Link>
          {isAuthenticated && <Link to="/mon-compte" className={location.pathname === '/mon-compte' ? 'text-primary font-semibold' : 'text-muted-foreground'}>Mon compte</Link>}
          {isUserAdmin && <Link to="/admin/vehicles" className={location.pathname.startsWith('/admin') ? 'text-primary font-semibold' : 'text-muted-foreground'}>Administration</Link>}
        </nav>

        {/* Zone utilisateur */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="hidden md:flex items-center gap-4">
            {authLoading ? (
              <div className="text-sm text-muted-foreground animate-pulse">Chargement...</div>
            ) : isAuthenticated ? (
              <>
                <p className="text-sm text-muted-foreground font-semibold flex items-center gap-1">
                  {user?.user_metadata?.full_name || user?.email}
                  {isUserAdmin && <span title="Administrateur">👑</span>}
                </p>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" /> Déconnexion
                </Button>
              </>
            ) : (
              <Button asChild variant="default" size="sm" className="flex items-center gap-2">
                <Link to="/auth">
                  <User className="h-4 w-4" /> Connexion
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-card/95 backdrop-blur-md">
          <div className="flex flex-col space-y-3 px-4 py-3">
            <Link to="/" onClick={() => setIsMenuOpen(false)}>Accueil</Link>
            <Link to="/offres" onClick={() => setIsMenuOpen(false)}>Offres</Link>
            <Link to="/ma-reservation" onClick={() => setIsMenuOpen(false)}>Mes réservations</Link>
            {isAuthenticated && <Link to="/mon-compte" onClick={() => setIsMenuOpen(false)}>Mon compte</Link>}
            {isUserAdmin && <Link to="/admin/vehicles" onClick={() => setIsMenuOpen(false)}>Administration</Link>}

            {!authLoading && isAuthenticated ? (
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" /> Déconnexion
              </Button>
            ) : (
              <Button asChild variant="default" size="sm" onClick={() => setIsMenuOpen(false)}>
                <Link to="/auth">
                  <User className="h-4 w-4" /> Connexion
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
