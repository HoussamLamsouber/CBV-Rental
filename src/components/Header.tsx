import { Menu, X, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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
    <header className="bg-gradient-to-br from-blue-900 to-blue-800 text-white sticky top-0 z-50">
  <div className="container mx-auto px-4 py-4 flex items-center justify-between">
    {/* Logo */}
    <Link to="/" className="flex items-center space-x-2">
      <img src="/logo-white.webp" alt="Logo" className="h-8 md:h-16" />
    </Link>

    {/* Navigation principale */}
    <nav className="hidden md:flex items-center gap-8">
      <Link
        to="/"
        className={location.pathname === '/' ? 'text-white font-semibold' : 'text-blue-200 hover:text-white transition'}
      >
        Accueil
      </Link>
      <Link
        to="/offres"
        className={location.pathname === '/offres' ? 'text-white font-semibold' : 'text-blue-200 hover:text-white transition'}
      >
        Offres
      </Link>
      <Link
        to="/ma-reservation"
        className={location.pathname === '/ma-reservation' ? 'text-white font-semibold' : 'text-blue-200 hover:text-white transition'}
      >
        Mes réservations
      </Link>
      <Link
        to="/about"
        className={location.pathname === '/about' ? 'text-white font-semibold' : 'text-blue-200 hover:text-white transition'}
      >
        À propos
      </Link>

      {/* Menu admin */}
      {isUserAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`flex items-center gap-1 ${
                location.pathname.startsWith('/admin')
                  ? 'text-white font-semibold'
                  : 'text-blue-200 hover:text-white transition'
              }`}
            >
              Administration
              <ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem asChild>
              <Link to="/admin/vehicles">Gestion des véhicules</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/reservations">Gestion des réservations</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/users">Gestion des utilisateurs</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>

    {/* Espace utilisateur (droite) */}
    <div className="flex items-center gap-4">
      {/* Menu mobile */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden text-white"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Zone utilisateur desktop */}
      {!authLoading && (
        <div className="hidden md:flex items-center">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-sm text-white hover:text-blue-200 transition font-medium">
                  <Avatar className="h-8 w-8 border text-gray-700 border-gray-700">
                    <AvatarImage
                      src={user?.user_metadata?.avatar_url || '/images/default-avatar.png'}
                      alt="Profil"
                    />
                    <AvatarFallback>
                      {(user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {user?.user_metadata?.full_name || user?.email || "Mon compte"}
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/mon-compte">Profil</Link>
                </DropdownMenuItem>

                <DropdownMenuItem disabled>
                  Changer de mot de passe
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-400 focus:text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link to="/auth">
                Connexion
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  </div>

  {/* Menu mobile */}
  {isMenuOpen && (
    <div className="md:hidden border-t border-blue-700 bg-gradient-to-br from-blue-900 to-blue-800 text-white">
      <div className="flex flex-col space-y-3 px-4 py-3">
        <Link to="/" onClick={() => setIsMenuOpen(false)}>Accueil</Link>
        <Link to="/offres" onClick={() => setIsMenuOpen(false)}>Offres</Link>
        <Link to="/ma-reservation" onClick={() => setIsMenuOpen(false)}>Mes réservations</Link>
        <Link to="/about" onClick={() => setIsMenuOpen(false)}>À propos</Link>
        {isUserAdmin && (
          <div className="flex flex-col space-y-1">
            <span className="font-semibold text-sm text-blue-200 mt-2">Administration</span>
            <Link to="/admin/vehicles" onClick={() => setIsMenuOpen(false)}>Gestion des véhicules</Link>
            <Link to="/admin/reservations" onClick={() => setIsMenuOpen(false)}>Gestion des réservations</Link>
            <Link to="/admin/users" onClick={() => setIsMenuOpen(false)}>Gestion des utilisateurs</Link>
          </div>
        )}
        {!authLoading && isAuthenticated ? (
          <>
            <Link to="/mon-compte" onClick={() => setIsMenuOpen(false)}>Mon compte</Link>
            <span className="text-blue-200 text-sm">Changer de mot de passe</span>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="text-white border-white hover:bg-white hover:text-blue-900">
              <LogOut className="h-4 w-4" /> Déconnexion
            </Button>
          </>
        ) : (
          <Button asChild variant="default" size="sm" onClick={() => setIsMenuOpen(false)}>
            <Link to="/auth">
              Connexion
            </Link>
          </Button>
        )}
      </div>
    </div>
  )}
</header>

  );
};
