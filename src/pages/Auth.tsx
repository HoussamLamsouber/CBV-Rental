// src/pages/Auth.tsx (version mobile optimisée)
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Car, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast({
        title: "Champ manquant",
        description: "Veuillez saisir votre nom complet.",
        variant: "destructive",
      });
      return;
    }

    if (!signupEmail.trim()) {
      toast({
        title: "Champ manquant",
        description: "Veuillez saisir votre adresse email.",
        variant: "destructive",
      });
      return;
    }

    if (signupPassword.length < 6) {
      toast({
        title: "Mot de passe trop court",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log("Tentative d'inscription pour:", signupEmail);
      
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword.trim(),
        options: {
          data: {
            full_name: fullName.trim(),
          },
        }
      });

      console.log("Réponse Supabase:", { data, error });

      if (error) {
        console.error("Erreur d'inscription:", error);
        
        if (error.message?.includes("already registered") || error.code === 'user_already_exists') {
          toast({
            title: "Compte existant",
            description: "Cette adresse email est déjà utilisée. Essayez de vous connecter.",
            variant: "destructive",
          });
        } else if (error.message?.includes("password")) {
          toast({
            title: "Mot de passe invalide",
            description: "Le mot de passe doit contenir au moins 6 caractères.",
            variant: "destructive",
          });
        } else if (error.message?.includes("email")) {
          toast({
            title: "Email invalide",
            description: "Veuillez saisir une adresse email valide.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erreur d'inscription",
            description: error.message || "Une erreur est survenue lors de l'inscription.",
            variant: "destructive",
          });
        }
      } else {
        console.log("Inscription réussie, données:", data);
        
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          toast({
            title: "Compte existant",
            description: "Cette adresse email est déjà utilisée. Essayez de vous connecter.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Inscription réussie !",
            description: "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.",
          });
          
          // Réinitialiser le formulaire
          setSignupEmail("");
          setSignupPassword("");
          setFullName("");
          setShowSignupPassword(false);
          
          // Basculer vers l'onglet connexion
          setTimeout(() => {
            const loginTrigger = document.querySelector('[value="login"]') as HTMLElement;
            if (loginTrigger) {
              loginTrigger.click();
            }
          }, 1000);
        }
      }
    } catch (error: any) {
      console.error("Erreur inattendue:", error);
      toast({
        title: "Erreur inattendue",
        description: error.message || "Une erreur inattendue s'est produite.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail.trim() || !loginPassword.trim()) {
      toast({
        title: "Champs manquants",
        description: "Veuillez saisir votre email et mot de passe.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log("Tentative de connexion pour:", loginEmail);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword.trim(),
      });

      console.log("Réponse connexion Supabase:", { data, error });

      if (error) {
        console.error("Erreur de connexion:", error);
        
        if (error.message?.includes("Invalid login credentials")) {
          toast({
            title: "Identifiants incorrects",
            description: "Email ou mot de passe incorrect.",
            variant: "destructive",
          });
        } else if (error.message?.includes("Email not confirmed")) {
          toast({
            title: "Email non confirmé",
            description: "Veuillez vérifier vos emails et confirmer votre compte.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erreur de connexion",
            description: error.message || "Une erreur est survenue lors de la connexion.",
            variant: "destructive",
          });
        }
      } else {
        console.log("Connexion réussie:", data);
        toast({
          title: "Connexion réussie !",
          description: `Bienvenue ${data.user?.email || ''}`,
        });
      }
    } catch (error: any) {
      console.error("Erreur inattendue:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur inattendue s'est produite.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    // Réinitialiser les champs quand on change d'onglet
    setLoginEmail("");
    setLoginPassword("");
    setSignupEmail("");
    setSignupPassword("");
    setFullName("");
    setShowLoginPassword(false);
    setShowSignupPassword(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* En-tête mobile optimisé */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Car className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-primary">CarRental</h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Connectez-vous pour réserver votre véhicule
          </p>
        </div>

        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">Authentification</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Connectez-vous ou créez un nouveau compte
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Tabs defaultValue="login" onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10 sm:h-12">
                <TabsTrigger value="login" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <LogIn className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Connexion</span>
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Inscription</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 mt-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="votre@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="text-sm"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="text-sm pr-10"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={loading}
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-10 sm:h-11" 
                    disabled={loading}
                    size="sm"
                  >
                    {loading ? "Connexion..." : "Se connecter"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4 mt-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-fullname" className="text-sm">Nom complet *</Label>
                    <Input
                      id="signup-fullname"
                      type="text"
                      placeholder="Votre nom complet"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={loading}
                      className="text-sm"
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm">Email *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="votre@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="text-sm"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm">Mot de passe *</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="Au moins 6 caractères"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={loading}
                        className="text-sm pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={loading}
                      >
                        {showSignupPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Le mot de passe doit contenir au moins 6 caractères
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-10 sm:h-11" 
                    disabled={loading}
                    size="sm"
                  >
                    {loading ? "Inscription..." : "S'inscrire"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Lien admin - Version mobile */}
        <div className="text-center mt-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Vous êtes administrateur ?{" "}
            <button
              onClick={() => navigate("/admin")}
              className="text-primary hover:underline font-medium"
            >
              Accéder au panneau admin
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;