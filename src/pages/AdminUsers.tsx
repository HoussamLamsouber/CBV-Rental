// src/pages/AdminUsers.tsx (version internationalisée)
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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

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
    return <LoadingSpinner message={t('admin_users.messages.checking_permissions')} />;
  }

  if (!isUserAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('admin_users.access_denied')}</h1>
          <p className="text-muted-foreground mb-6">
            {t('admin_users.admin_required')}
          </p>
          <Button onClick={() => navigate("/")}>{t('admin_users.back_to_home')}</Button>
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
      title: t("error"),
      description: t('admin_users.messages.cannot_load_users'),
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
        title: t('admin_users.messages.promotion_success'),
        description: t('admin_users.messages.now_admin', { email: cleanEmail }),
      });
    } else {
      toast({
        title: t('admin_users.messages.no_change'),
        description: t('admin_users.messages.not_client_or_not_exists', { email: cleanEmail }),
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
      title: t("error"),
      description: t('admin_users.messages.cannot_promote_user'),
      variant: "destructive",
    });
  }
};

const handleRemoveAdmin = async (profileId: string, email: string) => {
  if (!confirm(t('admin_users.messages.confirm_remove_admin', { email }))) {
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
        title: t('admin_users.messages.rights_removed'),
        description: t('admin_users.messages.no_longer_admin', { email }),
      });
    } else {
      throw new Error(t('admin_users.messages.removal_failed'));
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
        title: t('admin_users.messages.rights_removed'),
        description: t('admin_users.messages.no_longer_admin', { email }),
      });

      await loadProfiles();

    } catch (rpcError: any) {
      toast({
        title: t("error"),
        description: t('admin_users.messages.cannot_remove_admin_rights'),
        variant: "destructive",
      });
    }
  }
};

const handleDeleteUser = async (profileId: string, email: string, userRole: string) => {
  const roleText = userRole === 'admin' ? t('admin_users.roles.admin') : t('admin_users.roles.client');
  
  if (!confirm(t('admin_users.messages.confirm_delete_user', { email, role: roleText }))) {
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
      title: t('admin_users.messages.user_deleted'),
      description: t('admin_users.messages.user_deleted_permanently', { email }),
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
        title: t('admin_users.messages.user_deleted'),
        description: t('admin_users.messages.user_deleted_permanently', { email }),
      });

      await loadProfiles();

    } catch (rpcError: any) {
      toast({
        title: t("error"),
        description: t('admin_users.messages.cannot_delete_user'),
        variant: "destructive",
      });
    }
  }
};

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return t('admin_users.messages.never');
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
              <h1 className="text-3xl font-bold text-gray-900">{t('admin_users.title')}</h1>
              <p className="text-gray-600 mt-1">
                {adminsCount} {t('admin_users.admin_count')} • {clientsCount} {t('admin_users.client_count')}
              </p>
            </div>
          </div>
          
          <Button onClick={() => setIsAddAdminModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('admin_users.actions.add_admin')}
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
              {t('admin_users.tabs.admins')} ({adminsCount})
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
              {t('admin_users.tabs.clients')} ({clientsCount})
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t('admin_users.search.placeholder')}
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
            <LoadingSpinner message={t('admin_users.messages.loading_users')} />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProfiles.map((profile) => (
              <Card key={profile.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {profile.full_name || t('admin_users.messages.not_provided')}
                        {profile.role === 'admin' && (
                          <Badge variant="default">{t('admin_users.roles.admin')}</Badge>
                        )}
                        {profile.role === 'client' && (
                          <Badge variant="secondary">{t('admin_users.roles.client')}</Badge>
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
                        title={t('admin_users.actions.view_reservations')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {/* Bouton Supprimer pour tous les utilisateurs */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(profile.id, profile.email, profile.role)}
                        title={t('admin_users.actions.delete_user', { 
                          role: profile.role === 'admin' ? t('admin_users.roles.admin') : t('admin_users.roles.client')
                        })}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                      
                      {/* Bouton Retirer admin (uniquement pour les admins) */}
                      {activeTab === 'admins' && profile.role === 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAdmin(profile.id, profile.email)}
                          title={t('admin_users.actions.remove_admin_rights')}
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
                    <span>{t('admin_users.messages.registered_on')} {formatDateTime(profile.created_at)}</span>
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
                {t('admin_users.messages.no_results_title', { 
                  type: activeTab === 'admins' ? t('admin_users.tabs.admins') : t('admin_users.tabs.clients')
                })}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? t('admin_users.messages.no_search_results') : 
                 activeTab === 'admins' ? t('admin_users.messages.no_admins_yet') : t('admin_users.messages.no_clients_yet')}
              </p>
              {activeTab === 'admins' && (
                <Button onClick={() => setIsAddAdminModalOpen(true)}>
                  {t('admin_users.actions.add_admin')}
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
                {t('admin_users.modals.add_admin.title')}
              </Dialog.Title>

              <div className="space-y-4 mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    {t('admin_users.modals.add_admin.info')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="user-select">{t('admin_users.modals.add_admin.select_client')} *</Label>
                  <select
                    id="user-select"
                    value={selectedEmail}
                    onChange={(e) => setSelectedEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">{t('admin_users.modals.add_admin.choose_client')}</option>
                    {allEmails.length === 0 ? (
                      <option value="" disabled>{t('admin_users.modals.add_admin.no_clients_available')}</option>
                    ) : (
                      allEmails.map((profile) => (
                        <option key={profile.email} value={profile.email}>
                          {profile.email} {profile.full_name ? `(${profile.full_name})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {allEmails.length} {t('admin_users.modals.add_admin.clients_available')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="full_name">{t('admin_users.modals.add_admin.new_full_name')}</Label>
                  <Input
                    id="full_name"
                    value={newAdmin.full_name}
                    onChange={(e) => setNewAdmin({...newAdmin, full_name: e.target.value})}
                    placeholder={t('admin_users.modals.add_admin.keep_current_name')}
                  />
                </div>

                <div>
                  <Label htmlFor="telephone">{t('admin_users.modals.add_admin.new_phone')}</Label>
                  <Input
                    id="telephone"
                    value={newAdmin.telephone}
                    onChange={(e) => setNewAdmin({...newAdmin, telephone: e.target.value})}
                    placeholder={t('admin_users.modals.add_admin.keep_current_phone')}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => {
                  setIsAddAdminModalOpen(false);
                  setSelectedEmail("");
                  setNewAdmin({ email: "", full_name: "", telephone: "", password: "" });
                }}>
                  {t('admin_users.modals.add_admin.cancel')}
                </Button>
                <Button 
                  onClick={handleAddAdmin}
                  disabled={!selectedEmail || allEmails.length === 0}
                >
                  {t('admin_users.modals.add_admin.promote_to_admin')}
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