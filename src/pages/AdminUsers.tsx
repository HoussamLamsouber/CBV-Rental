// src/pages/AdminUsers.tsx (version corrigée)
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
  UserX,
  Eye,
  Trash2
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
  last_sign_in_at?: string | null;
  adresse?: string | null;
  dateNaissance?: string | null;
  updated_at?: string | null;
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authLoading, adminLoading, isUserAdmin, user, role } = useAuth();

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
  const [allEmails, setAllEmails] = useState<{email: string, full_name: string | null}[]>([]);
  const [selectedEmail, setSelectedEmail] = useState("");

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
        (profile.full_name && profile.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (profile.telephone && profile.telephone.includes(searchTerm));

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
    console.log("🔄 Chargement de tous les profils...");
    
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("❌ Erreur profils:", profilesError);
      throw profilesError;
    }

    console.log("✅ Profils chargés:", profilesData);
    setProfiles(profilesData || []);
    setFilteredProfiles(profilesData || []);

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

  // Charger tous les emails au montage du composant
  useEffect(() => {
    loadAllEmails();
  }, []);

  // Modifiez la fonction loadAllEmails pour ne charger que les clients
const loadAllEmails = async () => {
  try {
    console.log("🔄 Chargement des clients...");
    
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("email, full_name, role")
      .eq("role", "client")
      .order("email");

    if (error) {
      console.error("❌ Erreur chargement clients:", error);
      throw error;
    }

    console.log("📋 Clients chargés:", profiles);
    setAllEmails(profiles || []);

  } catch (error) {
    console.error("💥 Erreur chargement emails:", error);
  }
};

const handleAddAdmin = async () => {
  if (!selectedEmail) return;

  try {
    const cleanEmail = selectedEmail.trim().toLowerCase();
    
    console.log("🔍 Promotion via fonction stockée:", cleanEmail);

    // Utiliser la fonction stockée
    const { error } = await supabase.rpc('promote_to_admin', {
      user_email: cleanEmail
    });

    if (error) {
      console.error("❌ Erreur fonction stockée:", error);
      throw error;
    }

    console.log("✅ Fonction stockée exécutée");

    // Vérifier le résultat
    const { data: verificationData } = await supabase
      .from("profiles")
      .select("role")
      .eq("email", cleanEmail)
      .single();

    console.log("🔍 Rôle après promotion:", verificationData?.role);

    if (verificationData?.role === 'admin') {
      toast({
        title: "Promotion réussie",
        description: `${cleanEmail} est maintenant administrateur.`,
      });
    } else {
      toast({
        title: "Aucun changement",
        description: `${cleanEmail} n'était pas un client ou n'existe pas.`,
        variant: "default",
      });
    }

    setSelectedEmail("");
    setIsAddAdminModalOpen(false);
    
    setTimeout(async () => {
      await loadProfiles();
      await loadAllEmails();
    }, 1000);

  } catch (error: any) {
    console.error("💥 Erreur:", error);
    toast({
      title: "Erreur",
      description: "Impossible de promouvoir l'utilisateur.",
      variant: "destructive",
    });
  }
};

const handleRemoveAdmin = async (profileId: string, email: string) => {
  if (!confirm(`Êtes-vous sûr de vouloir retirer les droits administrateur à ${email} ?`)) {
    return;
  }

  try {
    console.log("🔍 Retrait des droits admin pour:", email);

    // Approche directe d'abord
    const { error } = await supabase
      .from("profiles")
      .update({ role: "client" })
      .eq("id", profileId);

    if (error) {
      console.error("❌ Erreur retrait admin:", error);
      throw error;
    }

    // Vérification
    const { data: verificationData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", profileId)
      .single();

    console.log("🔍 Rôle après retrait:", verificationData?.role);

    if (verificationData?.role === 'client') {
      toast({
        title: "Droits retirés",
        description: `${email} n'est plus administrateur.`,
      });
    } else {
      throw new Error("Le retrait n'a pas fonctionné");
    }

    await loadProfiles();

  } catch (error: any) {
    console.error("Erreur retrait admin:", error);
    
    // Si l'approche directe échoue, utiliser une fonction stockée
    try {
      const { error: rpcError } = await supabase.rpc('demote_admin', {
        user_id: profileId
      });

      if (rpcError) throw rpcError;

      toast({
        title: "Droits retirés",
        description: `${email} n'est plus administrateur.`,
      });

      await loadProfiles();

    } catch (rpcError: any) {
      toast({
        title: "Erreur",
        description: "Impossible de retirer les droits administrateur.",
        variant: "destructive",
      });
    }
  }
};

const handleDeleteUser = async (profileId: string, email: string, userRole: string) => {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement ${email} (${userRole}) ? Cette action est irréversible.`)) {
    return;
  }

  try {
    console.log("🗑️ Suppression de l'utilisateur:", email);

    // Essayer de supprimer d'abord les réservations
    const { error: reservationsError } = await supabase
      .from("reservations")
      .delete()
      .eq("user_id", profileId);

    if (reservationsError) {
      console.warn("⚠️ Erreur suppression réservations:", reservationsError);
      // On continue quand même
    }

    // Supprimer le profil
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", profileId);

    if (profileError) {
      console.error("❌ Erreur suppression profil:", profileError);
      throw profileError;
    }

    console.log("✅ Utilisateur supprimé");

    toast({
      title: "Utilisateur supprimé",
      description: `${email} a été supprimé définitivement.`,
    });

    await loadProfiles();

  } catch (error: any) {
    console.error("Erreur suppression utilisateur:", error);
    
    // Si l'approche directe échoue, utiliser une fonction stockée
    try {
      const { error: rpcError } = await supabase.rpc('delete_user_profile', {
        user_id: profileId
      });

      if (rpcError) throw rpcError;

      toast({
        title: "Utilisateur supprimé",
        description: `${email} a été supprimé définitivement.`,
      });

      await loadProfiles();

    } catch (rpcError: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur.",
        variant: "destructive",
      });
    }
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
              <p className="text-gray-600 mt-1">
                {adminsCount} admin(s) • {clientsCount} client(s)
              </p>
            </div>
          </div>
          
          <Button onClick={() => setIsAddAdminModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Ajouter un admin
          </Button>
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
                        {profile.role === 'client' && (
                          <Badge variant="secondary">Client</Badge>
                        )}
                      </CardTitle>
                    </div>
                    
                    {/* Boutons d'actions */}
                    <div className="flex gap-1">
                      {/* Bouton Voir réservations */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/reservations?user=${profile.id}`)}
                        title="Voir les réservations"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {/* Bouton Supprimer pour tous les utilisateurs */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(profile.id, profile.email, profile.role)}
                        title={`Supprimer ${profile.role === 'admin' ? "l'administrateur" : "le client"}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                      
                      {/* Bouton Retirer admin (uniquement pour les admins) */}
                      {activeTab === 'admins' && profile.role === 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAdmin(profile.id, profile.email)}
                          title="Retirer les droits administrateur"
                        >
                          <UserX className="h-4 w-4 text-orange-600" />
                        </Button>
                      )}
                    </div>
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
        Promouvoir un client en administrateur
      </Dialog.Title>

      <div className="space-y-4 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Information :</strong> Sélectionnez un client pour lui donner les droits administrateur.
          </p>
        </div>

        <div>
          <Label htmlFor="user-select">Sélectionner un client *</Label>
          <select
            id="user-select"
            value={selectedEmail}
            onChange={(e) => setSelectedEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Choisir un client...</option>
            {allEmails.length === 0 ? (
              <option value="" disabled>Aucun client disponible</option>
            ) : (
              allEmails.map((profile) => (
                <option key={profile.email} value={profile.email}>
                  {profile.email} {profile.full_name ? `(${profile.full_name})` : ''}
                </option>
              ))
            )}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {allEmails.length} client(s) disponible(s) pour promotion
          </p>
        </div>

        <div>
          <Label htmlFor="full_name">Nouveau nom complet (optionnel)</Label>
          <Input
            id="full_name"
            value={newAdmin.full_name}
            onChange={(e) => setNewAdmin({...newAdmin, full_name: e.target.value})}
            placeholder="Laisser vide pour conserver le nom actuel"
          />
        </div>

        <div>
          <Label htmlFor="telephone">Nouveau téléphone (optionnel)</Label>
          <Input
            id="telephone"
            value={newAdmin.telephone}
            onChange={(e) => setNewAdmin({...newAdmin, telephone: e.target.value})}
            placeholder="Laisser vide pour conserver le téléphone actuel"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onClick={() => {
          setIsAddAdminModalOpen(false);
          setSelectedEmail("");
          setNewAdmin({ email: "", full_name: "", telephone: "", password: "" });
        }}>
          Annuler
        </Button>
        <Button 
          onClick={handleAddAdmin}
          disabled={!selectedEmail || allEmails.length === 0}
        >
          Promouvoir en admin
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