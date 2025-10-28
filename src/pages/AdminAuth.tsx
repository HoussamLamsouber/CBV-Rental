// src/pages/AdminLogin.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Car, ArrowLeft } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAdminAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/admin/vehicles");
    }
  }, [isAuthenticated, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Erreur de connexion",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        // 🔹 Vérification du rôle admin dans `profiles`
        const { data: profile, error: roleError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (roleError || !profile || profile.role !== 'admin') {
          await supabase.auth.signOut();
          toast({
            title: "Accès refusé",
            description: "Vous n'avez pas les droits administrateur.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Connexion admin réussie",
          description: "Bienvenue dans l'administration.",
        });
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Header mobile optimisé */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <Car className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-primary">CarRental Admin</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Accès réservé aux administrateurs
          </p>
        </div>

        <Card className="shadow-lg sm:shadow-xl">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
              Connexion Administration
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Utilisez vos identifiants administrateur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-sm sm:text-base">
                  Email administrateur
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@carrental.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 sm:h-12 text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-sm sm:text-base">
                  Mot de passe
                </Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 sm:h-12 text-sm sm:text-base"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium" 
                disabled={loading}
              >
                {loading ? "Connexion..." : "Se connecter à l'administration"}
              </Button>
            </form>

            <div className="pt-4 sm:pt-6 border-t">
              <Button 
                variant="outline" 
                className="w-full h-10 sm:h-11 text-sm sm:text-base"
                onClick={() => navigate('/auth')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au site client
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;