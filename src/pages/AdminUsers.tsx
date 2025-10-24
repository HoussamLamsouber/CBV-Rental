// src/pages/AdminUsers.tsx (version simplifiée sans réservations)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { 
  ArrowLeft, 
  Search, 
  UserPlus, 
  Mail, 
  Phone, 
  Calendar,
  Users,
  UserCog,
  UserX
} from "lucide-react";
import { Dialog } from "@headlessui/react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  telephone: string | null;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authLoading, adminLoading, isUserAdmin, user, role } = useAuth();
  
  console.log("🔐 Auth Debug:", {
    user: user?.email,
    role,
    isUserAdmin,
    authLoading,
    adminLoading
  });

  const [activeTab, setActiveTab] = useState<'admins' | 'clients'>('admins');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: "",
    full_name: "",
    telephone: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);

  // Vérification des permissions admin
  if (authLoading || adminLoading) {
    return <LoadingSpinner message="Vérification des permissions..." />;
  }

  if (!isUserAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accès refusé</h1>
          <p className="text-muted-foreground mb-6">
            Vous devez être administrateur pour accéder à cette page.
          </p>
          <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  // Charger les profils
  useEffect(() => {
    loadProfiles();
  }, []);

  // Filtrer les profils
  useEffect(() => {
    const filtered = profiles.filter(profile => {
      const matchesSearch = 
        profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.telephone?.includes(searchTerm);

      if (activeTab === 'admins') {
        return matchesSearch && profile.role === 'admin';
      } else {
        return matchesSearch && profile.role === 'client';
      }
    });
    setFilteredProfiles(filtered);
  }, [searchTerm, profiles, activeTab]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      
      console.log("🔍 Début du chargement des profils...");
      
      // Récupérer tous les profils
      const { data: profilesData, error: profilesError, count } = await supabase
        .from("profiles")
        .select("*", { count: 'exact' })
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("❌ Erreur profiles:", profilesError);
        throw profilesError;
      }

      console.log("✅ Profils chargés:", profilesData);

      if (!profilesData || profilesData.length === 0) {
        console.log("ℹ️ Aucun profil trouvé");
        setProfiles([]);
        setFilteredProfiles([]);
        return;
      }

      setProfiles(profilesData);
      setFilteredProfiles(profilesData);

    } catch (error: any) {
      console.error("💥 Erreur chargement profils:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.email || !newAdmin.password) {
      toast({
        title: "Champs manquants",
        description: "Veuillez saisir l'email et le mot de passe.",
        variant: "destructive",
      });
      return;
    }

    if (newAdmin.password.length < 6) {
      toast({
        title: "Mot de passe trop court",
        description: "Le mot de passe doit contenir au moins 6 caractères.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Vérifier si l'utilisateur existe déjà dans profiles
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, email, full_name, telephone, role")
        .eq("email", newAdmin.email.toLowerCase())
        .single();

      if (existingProfile) {
        // Mettre à jour le rôle en admin
        const { error } = await supabase
          .from("profiles")
          .update({ 
            role: "admin",
            full_name: newAdmin.full_name || existingProfile.full_name,
            telephone: newAdmin.telephone || existingProfile.telephone
          })
          .eq("id", existingProfile.id);

        if (error) throw error;

        toast({
          title: "Administrateur ajouté",
          description: `${newAdmin.email} est maintenant administrateur.`,
        });
      } else {
        // Créer un nouvel utilisateur via l'API d'inscription standard
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: newAdmin.email,
          password: newAdmin.password,
          options: {
            data: {
              full_name: newAdmin.full_name,
              telephone: newAdmin.telephone
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          // Créer le profil avec rôle admin
          const { error: profileError } = await supabase
            .from("profiles")
            .insert([{
              id: authData.user.id,
              email: newAdmin.email.toLowerCase(),
              full_name: newAdmin.full_name || null,
              telephone: newAdmin.telephone || null,
              role: "admin"
            }]);

          if (profileError) {
            console.error("Erreur création profil:", profileError);
            // Essayer la mise à jour si l'insertion échoue
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ 
                role: "admin",
                full_name: newAdmin.full_name || null,
                telephone: newAdmin.telephone || null
              })
              .eq("id", authData.user.id);

            if (updateError) throw updateError;
          }

          toast({
            title: "Administrateur créé",
            description: `Un compte administrateur a été créé pour ${newAdmin.email}.`,
          });
        }
      }

      // Réinitialiser le formulaire
      setNewAdmin({ email: "", full_name: "", telephone: "", password: "" });
      setIsAddAdminModalOpen(false);
      
      // Recharger la liste
      await loadProfiles();

    } catch (error: any) {
      console.error("Erreur ajout admin:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter l'administrateur.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAdmin = async (profileId: string, email: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir retirer les droits administrateur à ${email} ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: "client" })
        .eq("id", profileId);

      if (error) throw error;

      toast({
        title: "Droits retirés",
        description: `${email} n'est plus administrateur.`,
      });

      await loadProfiles();

    } catch (error: any) {
      console.error("Erreur retrait admin:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de retirer les droits administrateur.",
        variant: "destructive",
      });
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Jamais";
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const adminsCount = profiles.filter(p => p.role === 'admin').length;
  const clientsCount = profiles.filter(p => p.role === 'client').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
              <p className="text-gray-600 mt-1">
                {adminsCount} admin(s) • {clientsCount} client(s)
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => setIsAddAdminModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter un admin
            </Button>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b mb-6">
          <div className="flex space-x-8">
            <button
              className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'admins'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('admins')}
            >
              <UserCog className="h-4 w-4" />
              Administrateurs ({adminsCount})
            </button>
            <button
              className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'clients'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('clients')}
            >
              <Users className="h-4 w-4" />
              Clients ({clientsCount})
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={`Rechercher par email, nom ou téléphone...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner message="Chargement des utilisateurs..." />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProfiles.map((profile) => (
              <Card key={profile.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {profile.full_name || "Non renseigné"}
                        {profile.role === 'admin' && (
                          <Badge variant="default">Admin</Badge>
                        )}
                      </CardTitle>
                    </div>
                    
                    {activeTab === 'admins' && profile.role === 'admin' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveAdmin(profile.id, profile.email)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                  
                  {profile.telephone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{profile.telephone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Inscrit le: {formatDateTime(profile.created_at)}</span>
                  </div>

                  {profile.role === 'client' && (
                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => navigate(`/admin/reservations?user=${profile.id}`)}
                      >
                        Voir ses réservations
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Message si aucun résultat */}
        {!loading && filteredProfiles.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucun {activeTab === 'admins' ? 'administrateur' : 'client'} trouvé
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? "Aucun résultat pour votre recherche." : 
                 activeTab === 'admins' ? "Commencez par ajouter un administrateur." : "Aucun client inscrit."}
              </p>
              {activeTab === 'admins' && (
                <Button onClick={() => setIsAddAdminModalOpen(true)}>
                  Ajouter un administrateur
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal d'ajout d'admin */}
        <Dialog open={isAddAdminModalOpen} onClose={() => setIsAddAdminModalOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md">
              <Dialog.Title className="text-lg font-semibold mb-4">
                Ajouter un administrateur
              </Dialog.Title>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                    placeholder="email@exemple.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">Mot de passe *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                      placeholder="Minimum 6 caractères"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Masquer" : "Afficher"}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Le mot de passe doit contenir au moins 6 caractères</p>
                </div>

                <div>
                  <Label htmlFor="full_name">Nom complet</Label>
                  <Input
                    id="full_name"
                    value={newAdmin.full_name}
                    onChange={(e) => setNewAdmin({...newAdmin, full_name: e.target.value})}
                    placeholder="Nom et prénom"
                  />
                </div>

                <div>
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    value={newAdmin.telephone}
                    onChange={(e) => setNewAdmin({...newAdmin, telephone: e.target.value})}
                    placeholder="+212 6 00 00 00 00"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => setIsAddAdminModalOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleAddAdmin}>
                  Créer l'administrateur
                </Button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </main>
      
      <Footer />
    </div>
  );
}