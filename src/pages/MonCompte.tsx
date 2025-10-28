import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Phone, MapPin, Calendar, Shield, ArrowLeft } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/LoadingSpinner";

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
  const [saving, setSaving] = useState(false);

  // Fonction utilitaire pour séparer le nom complet
  const getNames = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts.length > 1 ? parts[0] : '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    return { firstName, lastName };
  };

  // 1. DÉPLACEMENT ET MEMOIZATION DE LA FONCTION getProfile
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
  }, [navigate, toast]);

  // 2. APPEL DE getProfile au chargement
  useEffect(() => {
    getProfile();
  }, [getProfile]);

  // 3. MISE À JOUR DES DONNÉES DU PROFIL (au clic sur Sauvegarder)
  const handleSave = async () => {
    setSaving(true);
    
    // Vérification rapide pour s'assurer que l'ID est là
    if (!userInfo.id) {
        toast({ title: "Erreur", description: "ID utilisateur manquant.", variant: "destructive" });
        setSaving(false);
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
    setSaving(false);
  };
  
  // Fonction de gestion du changement des inputs (générique)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setUserInfo(prev => ({ ...prev, [id as keyof UserProfile]: value }));
  };

  // Affichage du chargement
  if (loading && !userInfo.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <LoadingSpinner message="Chargement de votre profil..." />
      </div>
    );
  }

  // --- RENDU DU COMPOSANT ---
  const { firstName, lastName } = getNames(userInfo.full_name);
  const avatarFallbackText = `${firstName?.[0] || ''}${lastName?.[0] || ''}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* En-tête du profil - Version mobile optimisée */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm sm:text-lg">
                  {avatarFallbackText || 'NC'}
                </AvatarFallback>
              </Avatar>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">
                  Mon Compte
                </h1>
                <p className="text-gray-600 text-sm sm:text-base truncate">
                  {userInfo.full_name || 'Nom complet non renseigné'}
                </p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Compte vérifié
                </Badge>
              </div>
            </div>
            
            <Button 
              onClick={() => {
                if(isEditing) {
                  getProfile(); 
                }
                setIsEditing(!isEditing)
              }}
              variant={isEditing ? "default" : "outline"}
              disabled={loading || saving}
              size="sm"
              className="w-full sm:w-auto mt-4 sm:mt-0"
            >
              {isEditing ? "Annuler" : "Modifier"}
            </Button>
          </div>

          {/* Informations personnelles - Version mobile */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Nom Complet */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm">Nom Complet</Label>
                <Input
                  id="full_name"
                  value={userInfo.full_name}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="Votre nom complet"
                  className="text-sm"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={userInfo.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="pl-10 text-sm"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <Label htmlFor="telephone" className="text-sm">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="telephone"
                    value={userInfo.telephone}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="pl-10 text-sm"
                    placeholder="+212 6 00 00 00 00"
                  />
                </div>
              </div>

              {/* Adresse */}
              <div className="space-y-2">
                <Label htmlFor="adresse" className="text-sm">Adresse</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="adresse"
                    value={userInfo.adresse}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="pl-10 text-sm"
                    placeholder="Votre adresse complète"
                  />
                </div>
              </div>

              {/* Date de naissance */}
              <div className="space-y-2">
                <Label htmlFor="dateNaissance" className="text-sm">Date de naissance</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="dateNaissance"
                    type="date"
                    value={userInfo.dateNaissance}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="pl-10 text-sm"
                  />
                </div>
              </div>

              {/* Boutons d'action - Version mobile */}
              {isEditing && (
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                  <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sauvegarde...
                      </>
                    ) : (
                      "Sauvegarder"
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MonCompte; 