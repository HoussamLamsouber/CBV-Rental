// src/pages/Auth.tsx (version mobile optimisée et internationalisée)
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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast({
        title: t('auth.messages.missing_field'),
        description: t('auth.messages.enter_full_name'),
        variant: "destructive",
      });
      return;
    }

    if (!signupEmail.trim()) {
      toast({
        title: t('auth.messages.missing_field'),
        description: t('auth.messages.enter_email'),
        variant: "destructive",
      });
      return;
    }

    if (signupPassword.length < 6) {
      toast({
        title: t('auth.messages.password_too_short'),
        description: t('auth.messages.password_min_length'),
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
            title: t('auth.messages.existing_account'),
            description: t('auth.messages.email_already_used'),
            variant: "destructive",
          });
        } else if (error.message?.includes("password")) {
          toast({
            title: t('auth.messages.invalid_password'),
            description: t('auth.messages.password_min_length'),
            variant: "destructive",
          });
        } else if (error.message?.includes("email")) {
          toast({
            title: t('auth.messages.invalid_email'),
            description: t('auth.messages.enter_valid_email'),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('auth.messages.signup_error'),
            description: error.message || t('auth.messages.unexpected_error'),
            variant: "destructive",
          });
        }
      } else {
        console.log("Inscription réussie, données:", data);
        
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          toast({
            title: t('auth.messages.existing_account'),
            description: t('auth.messages.email_already_used'),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('auth.messages.signup_success'),
            description: t('auth.messages.account_created_success'),
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
        title: t('auth.messages.unexpected_error_title'),
        description: error.message || t('auth.messages.unexpected_error'),
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
        title: t('auth.messages.missing_fields'),
        description: t('auth.messages.enter_email_password'),
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
            title: t('auth.messages.invalid_credentials'),
            description: t('auth.messages.incorrect_email_password'),
            variant: "destructive",
          });
        } else if (error.message?.includes("Email not confirmed")) {
          toast({
            title: t('auth.messages.email_not_confirmed'),
            description: t('auth.messages.verify_email'),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('auth.messages.login_error'),
            description: error.message || t('auth.messages.unexpected_error'),
            variant: "destructive",
          });
        }
      } else {
        console.log("Connexion réussie:", data);
        toast({
          title: t('auth.messages.login_success'),
          description: t('auth.messages.welcome', { email: data.user?.email || '' }),
        });
      }
    } catch (error: any) {
      console.error("Erreur inattendue:", error);
      toast({
        title: t("error"),
        description: error.message || t('auth.messages.unexpected_error'),
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
            <h1 className="text-xl sm:text-2xl font-bold text-primary">{t('auth.brand_name')}</h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t('auth.subtitle')}
          </p>
        </div>

        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">{t('auth.title')}</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {t('auth.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Tabs defaultValue="login" onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10 sm:h-12">
                <TabsTrigger value="login" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <LogIn className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{t('auth.tabs.login')}</span>
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{t('auth.tabs.signup')}</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 mt-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm">{t('auth.fields.email')}</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder={t('auth.placeholders.email')}
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="text-sm"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm">{t('auth.fields.password')}</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder={t('auth.placeholders.password')}
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
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="text-xs text-primary hover:underline focus:outline-none"
                    >
                      {t("forgot_password")}
                    </button>
                  </div>


                  <Button 
                    type="submit" 
                    className="w-full h-10 sm:h-11" 
                    disabled={loading}
                    size="sm"
                  >
                    {loading ? t('auth.buttons.logging_in') : t('auth.buttons.login')}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4 mt-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-fullname" className="text-sm">{t('auth.fields.full_name')} *</Label>
                    <Input
                      id="signup-fullname"
                      type="text"
                      placeholder={t('auth.placeholders.full_name')}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={loading}
                      className="text-sm"
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm">{t('auth.fields.email')} *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t('auth.placeholders.email')}
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="text-sm"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm">{t('auth.fields.password')} *</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder={t('auth.placeholders.password_min_length')}
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
                      {t('auth.messages.password_min_length')}
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-10 sm:h-11" 
                    disabled={loading}
                    size="sm"
                  >
                    {loading ? t('auth.buttons.signing_up') : t('auth.buttons.signup')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Lien admin - Version mobile */}
        <div className="text-center mt-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('auth.admin_link.text')}{" "}
            <button
              onClick={() => navigate("/admin")}
              className="text-primary hover:underline font-medium"
            >
              {t('auth.admin_link.button')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;