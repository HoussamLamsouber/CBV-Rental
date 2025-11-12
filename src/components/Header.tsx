import { Menu, X, LogOut, ChevronDown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, authLoading, isAuthenticated, isUserAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: t("logout_success"), description: t("see_you_soon") });
      navigate("/");
    } catch {
      toast({
        title: t("error"),
        description: t("logout_error"),
        variant: "destructive",
      });
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === "fr" ? "en" : "fr";
    i18n.changeLanguage(newLang);
  };

  const navLink = (path: string, label: string) => (
    <Link
      to={path}
      className={
        location.pathname === path
          ? "text-white font-semibold"
          : "text-blue-200 hover:text-white transition"
      }
    >
      {label}
    </Link>
  );

  return (
    <header className="bg-gradient-to-br from-blue-900 to-blue-800 text-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <img src="/logo-white.webp" alt="Logo" className="h-8 md:h-16" />
        </Link>

        {/* Navigation principale */}
        <nav className="hidden md:flex items-center gap-8">
          {navLink("/", t("home"))}
          {navLink("/offres", t("offers"))}
          {navLink("/ma-reservation", t("my_reservations"))}
          {navLink("/about", t("about"))}

          {/* Menu admin */}
          {isUserAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-1 p-2 rounded-md ${
                    location.pathname.startsWith("/admin")
                      ? "text-white font-semibold"
                      : "text-blue-200 hover:text-white transition"
                  }`}
                >
                  {t("admin")}
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link to="/admin/dashboard">{t("admindashboard")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/vehicles">{t("manage_vehicles")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/reservations">
                    {t("manage_reservations")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/users">{t("manage_users")}</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        {/* Espace utilisateur + bouton langue */}
        <div className="flex items-center gap-3">

          {/* Zone utilisateur desktop */}
          {!authLoading && (
            <div className="hidden md:flex items-center">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 p-2 rounded-md text-sm text-white hover:text-blue-200 transition font-medium">
                      <Avatar className="h-8 w-8 border text-gray-700 border-gray-700">
                        <AvatarImage
                          src={
                            user?.user_metadata?.avatar_url ||
                            "/images/default-avatar.png"
                          }
                          alt="Profil"
                        />
                        <AvatarFallback>
                          {(
                            user?.user_metadata?.full_name?.[0] ||
                            user?.email?.[0] ||
                            "U"
                          ).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {user?.user_metadata?.full_name ||
                        user?.email ||
                        t("my_account")}
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/mon-compte">{t("profile")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/changer-mot-de-passe">{t("change_password")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="text-red-400 hover:bg-red-600 hover:text-white focus:bg-red-600 focus:text-white transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-2" /> {t("logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild variant="default" size="sm">
                  <Link to="/auth">{t("login")}</Link>
                </Button>
              )}
            </div>
          )}

          {/* Bouton de langue */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="flex items-center gap-2 text-blue-800 border-white hover:bg-white hover:text-blue-900 transition"
          >
            <Globe size={16} />
            {i18n.language === "fr" ? "English" : "Français"}
          </Button>

          {/* Bouton menu mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-white hover:bg-transparent hover:text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-blue-700 bg-gradient-to-br from-blue-900 to-blue-800 text-white">
          <div className="flex flex-col space-y-3 px-4 py-3">
            {navLink("/", t("home"))}
            {navLink("/offres", t("offers"))}
            {navLink("/ma-reservation", t("my_reservations"))}
            {navLink("/about", t("about"))}

            {isUserAdmin && (
              <div className="flex flex-col space-y-1">
                <span className="font-semibold text-sm text-blue-200 mt-2">
                  {t("admin")}
                </span>
                <Link to="/admin/dashboard" onClick={() => setIsMenuOpen(false)}>
                  {t("admindashboard")}
                </Link>
                <Link to="/admin/vehicles" onClick={() => setIsMenuOpen(false)}>
                  {t("manage_vehicles")}
                </Link>
                <Link
                  to="/admin/reservations"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("manage_reservations")}
                </Link>
                <Link to="/admin/users" onClick={() => setIsMenuOpen(false)}>
                  {t("manage_users")}
                </Link>
              </div>
            )}

            {!authLoading && isAuthenticated ? (
              <>
                <Link
                  to="/mon-compte"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("my_account")}
                </Link>
                <Link 
                  to="/changer-mot-de-passe"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("change_password")}
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-white border-white hover:bg-white hover:text-blue-900"
                >
                  <LogOut className="h-4 w-4" /> {t("logout")}
                </Button>
              </>
            ) : (
              <Button
                asChild
                variant="default"
                size="sm"
                onClick={() => setIsMenuOpen(false)}
              >
                <Link to="/auth">{t("login")}</Link>
              </Button>
            )}

            {/* Bouton langue mobile */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="flex items-center gap-2 text-blue-800 border-white hover:bg-white hover:text-blue-900 transition"
            >
              <Globe size={16} />
              {i18n.language === "fr" ? "English" : "Français"}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};