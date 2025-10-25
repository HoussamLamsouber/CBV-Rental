// src/pages/Auth.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Car, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
      
      // Inscription sans confirmation d'email pour le développement
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword.trim(),
        options: {
          // Note: emailRedirectTo est supprimé pour éviter l'erreur d'envoi d'email
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
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Car className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-primary">CarRental</h1>
            </div>
            <p className="text-muted-foreground">
              Connectez-vous pour réserver votre véhicule
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Authentification</CardTitle>
              <CardDescription>
                Connectez-vous ou créez un nouveau compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login" className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Connexion
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Inscription
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Mot de passe</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Connexion..." : "Se connecter"}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-fullname">Nom complet *</Label>
                      <Input
                        id="signup-fullname"
                        type="text"
                        placeholder="Votre nom complet"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email *</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Mot de passe *</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Au moins 6 caractères"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Le mot de passe doit contenir au moins 6 caractères
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Inscription..." : "S'inscrire"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              Vous êtes administrateur ?{" "}
              <button
                onClick={() => navigate("/admin")}
                className="text-primary hover:underline"
              >
                Accéder au panneau admin
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;