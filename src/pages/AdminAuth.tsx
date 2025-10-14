// src/pages/AdminLogin.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Car } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAdminAuth();

  // Rediriger si déjà connecté en tant qu'admin
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

      // Vérifier si l'utilisateur est un admin via user_roles
      if (data.user) {
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'admin')
          .single();

        if (roleError || !userRole) {
          // Déconnecter l'utilisateur non admin
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
        navigate("/admin/vehicles");
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Car className="h-8 w-8 text-primary" />
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">CarRental Admin</h1>
          </div>
          <p className="text-muted-foreground">
            Accès réservé aux administrateurs
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Connexion Administration
            </CardTitle>
            <CardDescription>
              Utilisez vos identifiants administrateur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email administrateur</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@carrental.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Mot de passe</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
                variant="default"
              >
                {loading ? "Connexion..." : "Se connecter à l'administration"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                ← Retour au site client
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;