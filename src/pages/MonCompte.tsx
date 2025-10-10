import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Phone, MapPin, Calendar, Shield } from "lucide-react";
import { useState, useEffect, useCallback } from "react"; // Ajout de useCallback
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

// Définition de l'interface des données du profil
interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  adresse: string;
  telephone: string;
  dateNaissance: string;
}

const initialUserInfo: UserProfile = {
  id: "",
  email: "",
  full_name: "",
  adresse: "",
  telephone: "",
  dateNaissance: "",
};


const MonCompte = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [userInfo, setUserInfo] = useState<UserProfile>(initialUserInfo);
  const [loading, setLoading] = useState(true);

  // Fonction utilitaire pour séparer le nom complet
  const getNames = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts.length > 1 ? parts[0] : '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    return { firstName, lastName };
  };

  // 1. DÉPLACEMENT ET MEMOIZATION DE LA FONCTION getProfile
  // Utilisation de useCallback pour s'assurer que cette fonction est stable.
  const getProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({ title: "Accès non autorisé", description: "Veuillez vous connecter.", variant: "destructive" });
      navigate("/auth");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      // Mise à jour de la requête SELECT pour correspondre à vos colonnes finales
      .select(`id, email, full_name, adresse, telephone, dateNaissance`)
      .eq('id', user.id)
      .single();

    if (error) {
      console.error("Erreur de chargement du profil:", error);
      toast({ title: "Erreur", description: "Impossible de charger les données du profil.", variant: "destructive" });
    } else if (data) {
      // Hydrater l'état avec les données de Supabase
      setUserInfo({
        id: data.id,
        email: data.email || user.email || '',
        full_name: data.full_name || '',
        adresse: data.adresse || '',
        telephone: data.telephone || '',
        dateNaissance: data.dateNaissance || '',
      });
    }
    setLoading(false);
  }, [navigate, toast]); // Dépendances pour useCallback

  // 2. APPEL DE getProfile au chargement
  useEffect(() => {
    getProfile();
  }, [getProfile]); // Appel quand getProfile change (ou au premier rendu)

  // 3. MISE À JOUR DES DONNÉES DU PROFIL (au clic sur Sauvegarder)
  const handleSave = async () => {
    setLoading(true);
    
    // Vérification rapide pour s'assurer que l'ID est là
    if (!userInfo.id) {
        toast({ title: "Erreur", description: "ID utilisateur manquant.", variant: "destructive" });
        setLoading(false);
        return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: userInfo.full_name,
        email: userInfo.email,
        adresse: userInfo.adresse,
        telephone: userInfo.telephone,
        dateNaissance: userInfo.dateNaissance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userInfo.id);

    if (error) {
      console.error("Erreur de sauvegarde:", error);
      toast({ title: "Erreur", description: "Échec de la sauvegarde des informations.", variant: "destructive" });
    } else {
      toast({ title: "Profil mis à jour", description: "Vos informations ont été sauvegardées avec succès." });
      setIsEditing(false); // Sortir du mode édition après succès
    }
    setLoading(false);
  };
  
  // Fonction de gestion du changement des inputs (générique)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setUserInfo(prev => ({ ...prev, [id as keyof UserProfile]: value }));
  };

  // Affichage du chargement
  if (loading && !userInfo.id) { // Montre le chargement uniquement la première fois
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-xl text-primary">Chargement du profil...</p>
      </div>
    );
  }

  // --- RENDU DU COMPOSANT ---
  const { firstName, lastName } = getNames(userInfo.full_name);
  const avatarFallbackText = `${firstName?.[0] || ''}${lastName?.[0] || ''}`;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* En-tête du profil */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {avatarFallbackText || 'NC'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-primary">Mon Compte</h1>
                <p className="text-muted-foreground">
                  {userInfo.full_name || 'Nom complet non renseigné'}
                </p>
                <Badge variant="secondary" className="mt-1">
                  <Shield className="h-3 w-3 mr-1" />
                  Compte vérifié
                </Badge>
              </div>
            </div>
            <Button 
              onClick={() => {
                if(isEditing) {
                  // Recharger l'état du profil si l'utilisateur annule pour restaurer les valeurs initiales
                  getProfile(); 
                }
                setIsEditing(!isEditing)
              }}
              variant={isEditing ? "default" : "outline"}
              disabled={loading}
            >
              {isEditing ? "Annuler" : "Modifier le profil"}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Informations personnelles */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informations personnelles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Nom Complet */}
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nom Complet</Label>
                    <Input
                      id="full_name"
                      value={userInfo.full_name}
                      onChange={handleChange}
                      disabled={!isEditing}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={userInfo.email}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Téléphone */}
                  <div className="space-y-2">
                    <Label htmlFor="telephone">Téléphone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="telephone"
                        value={userInfo.telephone}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Adresse */}
                  <div className="space-y-2">
                    <Label htmlFor="adresse">Adresse</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="adresse"
                        value={userInfo.adresse}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date de naissance */}
                    <div className="space-y-2">
                      <Label htmlFor="dateNaissance">Date de naissance</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="dateNaissance"
                          type="date"
                          value={userInfo.dateNaissance}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSave} disabled={loading}>
                        Sauvegarder
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Annuler
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MonCompte;