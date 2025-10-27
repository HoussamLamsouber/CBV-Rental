import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, X, ArrowLeft, Phone, Mail, Calendar, Car, User } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { emailJSService } from "@/services/emailJSService";
import { toast } from "@/hooks/use-toast";

export default function ReservationsAdmin() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    date: "",
    vehicleModel: "",
    status: ""
  });
  
  // 🔹 Récupérer les paramètres d'URL et navigation
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('user');

  useEffect(() => {
    fetchReservations();
  }, []);

  // 🔹 Charger les réservations avec les infos du profil associé
  async function fetchReservations() {
    setLoading(true);
    
    try {
      console.log("🔍 Début du chargement des réservations...");
      
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select("*")
        .order("created_at", { ascending: false });

      if (reservationsError) {
        console.error("❌ Erreur réservations:", reservationsError);
        throw reservationsError;
      }

      console.log("✅ Réservations chargées:", reservationsData?.length);

      if (!reservationsData || reservationsData.length === 0) {
        console.log("ℹ️ Aucune réservation trouvée");
        setReservations([]);
        return;
      }

      // Pour chaque réservation, calculer le statut métier
      const reservationsWithProfiles = await Promise.all(
        reservationsData.map(async (reservation) => {
          let profileInfo = null;
          
          if (reservation.user_id) {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("full_name, email, telephone")
                .eq("id", reservation.user_id)
                .single();

              if (!profileError && profileData) {
                profileInfo = profileData;
              }
            } catch (error) {
              console.warn(`❌ Impossible de charger le profil pour ${reservation.user_id}:`, error);
            }
          }

          // 🔥 CALCUL DU STATUT MÉTIER
          const businessStatus = calculateBusinessStatus(reservation);
          
          return {
            id: reservation.id,
            car_name: reservation.car_name,
            car_image: reservation.car_image,
            car_category: reservation.car_category,
            pickup_date: reservation.pickup_date,
            return_date: reservation.return_date,
            pickup_time: reservation.pickup_time,
            return_time: reservation.return_time,
            pickup_location: reservation.pickup_location,
            return_location: reservation.return_location,
            total_price: reservation.total_price,
            status: reservation.status, // Statut de base
            business_status: businessStatus, // Statut calculé
            guest_name: reservation.guest_name,
            guest_email: reservation.guest_email,
            guest_phone: reservation.guest_phone,
            created_at: reservation.created_at,
            user_id: reservation.user_id,
            profiles: profileInfo
          };
        })
      );

      console.log("🎯 Réservations avec statuts calculés:", reservationsWithProfiles);
      setReservations(reservationsWithProfiles);

    } catch (error: any) {
      console.error("💥 Erreur chargement réservations:", error);
    } finally {
      setLoading(false);
    }
  }

  // 🔥 NOUVELLE FONCTION : Calcul du statut métier
  function calculateBusinessStatus(reservation: any) {
    const now = new Date();
    const pickupDateTime = new Date(`${reservation.pickup_date}T${reservation.pickup_time}`);
    const returnDateTime = new Date(`${reservation.return_date}T${reservation.return_time}`);
    
    // Si la réservation est refusée ou en attente, pas de statut actif/terminé
    if (reservation.status === 'refused' || reservation.status === 'pending') {
      return reservation.status;
    }
    
    // Si acceptée, on calcule le statut métier
    if (reservation.status === 'accepted') {
      if (now < pickupDateTime) {
        return 'accepted'; // Acceptée mais pas encore commencée
      } else if (now >= pickupDateTime && now <= returnDateTime) {
        return 'active'; // En cours
      } else if (now > returnDateTime) {
        return 'completed'; // Terminée
      }
    }
    
    return reservation.status; // Par défaut
  }

  // 🔹 Si un userId est passé en paramètre, charger les infos du profil
  const [userProfile, setUserProfile] = useState(null);
  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  async function fetchUserProfile() {
    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single();

      if (!error && profileData) {
        setUserProfile(profileData);
        // Pré-remplir la recherche avec l'email du client
        setSearchTerm(profileData.email);
      }
    } catch (error) {
      console.error("Erreur chargement profil:", error);
    }
  }

  // 🔹 Mise à jour du statut
  async function handleStatusChange(id: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) {
        console.error("Erreur maj statut :", error);
        return;
      }
      
      console.log(`✅ Statut mis à jour pour la réservation ${id}: ${newStatus}`);
      await fetchReservations(); // Recharger les données
      
    } catch (error) {
      console.error("💥 Erreur lors de la mise à jour du statut:", error);
    }
  }

  // 🔥 Rafraîchissement périodique des statuts
  useEffect(() => {
    const interval = setInterval(() => {
      fetchReservations(); // Recalcule les statuts actifs/terminés
    }, 60000); // Toutes les minutes

    return () => clearInterval(interval);
  }, []);

  // 🔹 Fonction pour compter les réservations par statut (avec filtre utilisateur si applicable)
  const getReservationsCountByStatus = (status: string) => {
    let filteredReservations = reservations;
    
    // Filtre utilisateur si applicable
    if (userId) {
      filteredReservations = filteredReservations.filter(r => r.user_id === userId);
    }
    
    // Pour les statuts calculés (active, completed), utiliser business_status
    if (status === 'active' || status === 'completed') {
      return filteredReservations.filter(r => r.business_status === status).length;
    }
    
    // Pour les statuts de base, utiliser status
    return filteredReservations.filter(r => r.status === status).length;
  };

  // 🔹 Fonction de recherche et filtrage
  const filteredReservations = reservations.filter((reservation) => {

    // Déterminer quel statut utiliser pour le filtrage
    const displayStatus = ['active', 'completed'].includes(activeTab) 
      ? reservation.business_status 
      : reservation.status;

    // Filtre par onglet actif
    if (displayStatus !== activeTab) return false;

    // Si un userId est spécifié dans l'URL, filtrer uniquement ses réservations
    if (userId && reservation.user_id !== userId) {
      return false;
    }

    // Recherche texte (nom, email, modèle véhicule)
    const searchLower = searchTerm.toLowerCase();
    if (searchTerm) {
      const matchesSearch = 
        // Recherche dans les infos du profil
        (reservation.profiles?.full_name?.toLowerCase().includes(searchLower) ||
         reservation.profiles?.email?.toLowerCase().includes(searchLower) ||
         // Recherche dans les infos invité
         reservation.guest_name?.toLowerCase().includes(searchLower) ||
         reservation.guest_email?.toLowerCase().includes(searchLower) ||
         // Recherche dans les infos véhicule
         reservation.car_name?.toLowerCase().includes(searchLower) ||
         reservation.car_category?.toLowerCase().includes(searchLower) ||
         // Recherche dans les lieux
         reservation.pickup_location?.toLowerCase().includes(searchLower) ||
         reservation.return_location?.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;
    }

    // Filtre par date
    if (filters.date) {
      const filterDate = new Date(filters.date).toDateString();
      const pickupDate = new Date(reservation.pickup_date).toDateString();
      const returnDate = new Date(reservation.return_date).toDateString();
      const creationDate = new Date(reservation.created_at).toDateString();
      
      if (pickupDate !== filterDate && returnDate !== filterDate && creationDate !== filterDate) {
        return false;
      }
    }

    // Filtre par modèle de véhicule
    if (filters.vehicleModel) {
      const vehicleLower = filters.vehicleModel.toLowerCase();
      if (!reservation.car_name?.toLowerCase().includes(vehicleLower) &&
          !reservation.car_category?.toLowerCase().includes(vehicleLower)) {
        return false;
      }
    }

    // Filtre par statut supplémentaire (si différent de l'onglet actif)
    if (filters.status && filters.status !== "all" && reservation.status !== filters.status) {
      return false;
    }

    return true;
  });

  // 🔹 Réinitialiser les filtres
  const clearFilters = () => {
    setFilters({
      date: "",
      vehicleModel: "",
      status: ""
    });
    setSearchTerm("");
    // Si on était en mode filtre utilisateur, revenir à la vue normale
    if (userId) {
      navigate('/admin/reservations');
    }
  };

  // 🔹 Onglets avec compteurs adaptés au filtre utilisateur - Version mobile avec scroll
  const tabs = [
    { 
      key: "pending", 
      label: "En attente", 
      count: getReservationsCountByStatus("pending"),
      icon: "⏳"
    },
    { 
      key: "accepted", 
      label: "Acceptées", 
      count: getReservationsCountByStatus("accepted"),
      icon: "✅"
    },
    { 
      key: "active", 
      label: "Actives", 
      count: getReservationsCountByStatus("active"),
      icon: "🚗"
    },
    { 
      key: "completed", 
      label: "Terminées", 
      count: getReservationsCountByStatus("completed"),
      icon: "🏁"
    },
    { 
      key: "refused", 
      label: "Refusées", 
      count: getReservationsCountByStatus("refused"),
      icon: "❌"
    },
  ];

  // 🔹 Formater la date
  const formatDate = (dateString: string) => {
    if (!dateString) return "Non spécifié";
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // 🔹 Formater le prix
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MAD',
    }).format(price);
  };

  // 🔹 Formater la date et heure de création
  const formatDateTime = (dateString: string) => {
    if (!dateString) return "Non spécifié";
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const hasActiveFilters = searchTerm || filters.date || filters.vehicleModel || (filters.status && filters.status !== "all") || userId;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Chargement des réservations...</div>
        </div>
      </div>
    );
  }

  // Fonction pour accepter une réservation
  const handleAcceptReservation = async (reservation: any) => {
    try {
      console.log("📧 Données réservation pour acceptation:", reservation);
      
      // Mettre à jour le statut dans la base de données
      const { error } = await supabase
        .from("reservations")
        .update({ status: "accepted" })
        .eq("id", reservation.id);

      if (error) throw error;

      // Préparer les données pour l'email - CORRECTION ICI
      const emailData = {
        reservationId: reservation.id,
        clientName: reservation.guest_name || reservation.profiles?.full_name || "Utilisateur",
        clientEmail: reservation.guest_email || reservation.profiles?.email,
        clientPhone: reservation.guest_phone || reservation.profiles?.telephone || "Non renseigné",
        carName: reservation.car_name,
        carCategory: reservation.car_category,
        pickupDate: new Date(reservation.pickup_date).toLocaleDateString('fr-FR'),
        pickupTime: reservation.pickup_time || "14:00", // Valeur par défaut si manquant
        returnDate: new Date(reservation.return_date).toLocaleDateString('fr-FR'),
        returnTime: reservation.return_time || "14:00", // Valeur par défaut si manquant
        pickupLocation: reservation.pickup_location,
        returnLocation: reservation.return_location,
        totalPrice: reservation.total_price,
      };

      console.log("📨 Données email acceptation:", emailData);

      // Vérifier que l'email client existe
      if (!emailData.clientEmail) {
        throw new Error("Email du client non trouvé");
      }

      // Envoyer l'email de confirmation au client
      const emailResult = await emailJSService.sendReservationAcceptedEmail(emailData);
      
      if (!emailResult.success) {
        throw new Error("Échec de l'envoi de l'email");
      }

      toast({
        title: "Réservation acceptée",
        description: "Le client a été notifié par email.",
      });

      // Recharger les données
      fetchReservations();
    } catch (error: any) {
      console.error("❌ Erreur acceptation réservation:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'accepter la réservation.",
        variant: "destructive",
      });
    }
  };

  // Fonction pour refuser une réservation
  const handleRejectReservation = async (reservation: any) => {

    try {
      // Mettre à jour le statut dans la base de données
      const { error } = await supabase
        .from("reservations")
        .update({ status: "refused" })
        .eq("id", reservation.id);

      if (error) throw error;

      // Préparer les données pour l'email
      const emailData = {
        reservationId: reservation.id,
        clientName: reservation.guest_name || reservation.profiles?.full_name || "Utilisateur",
        clientEmail: reservation.guest_email || reservation.profiles?.email,
        clientPhone: reservation.guest_phone || reservation.profiles?.telephone || "Non renseigné",
        carName: reservation.car_name,
        carCategory: reservation.car_category,
        pickupDate: new Date(reservation.pickup_date).toLocaleDateString('fr-FR'),
        pickupTime: reservation.pickup_time,
        returnDate: new Date(reservation.return_date).toLocaleDateString('fr-FR'),
        returnTime: reservation.return_time,
        pickupLocation: reservation.pickup_location,
        returnLocation: reservation.return_location,
        totalPrice: reservation.total_price,
      };

      // Envoyer l'email de refus au client
      await emailJSService.sendReservationRejectedEmail(emailData);

      toast({
        title: "Réservation refusée",
        description: "Le client a été notifié par email.",
      });

      // Recharger les données
      fetchReservations();
    } catch (error: any) {
      console.error("Erreur refus réservation:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de refuser la réservation.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête avec bouton retour */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            {userId && (
              <button
                onClick={() => navigate('/admin/users')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Retour aux utilisateurs</span>
                <span className="sm:hidden">Retour</span>
              </button>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">
                {userId && userProfile 
                  ? `Réservations de ${userProfile.full_name || userProfile.email}`
                  : "Gestion des réservations"
                }
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                {userId 
                  ? `${getReservationsCountByStatus("pending") + getReservationsCountByStatus("accepted") + getReservationsCountByStatus("refused")} réservation(s) pour ce client`
                  : `${reservations.length} réservation(s) au total`
                }
                {hasActiveFilters && ` • ${filteredReservations.length} résultat(s)`}
              </p>
            </div>
            
            {userId && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm w-full sm:w-auto justify-center"
              >
                <X className="h-4 w-4" />
                Voir toutes les réservations
              </button>
            )}
          </div>
        </div>

        {/* 🔹 Barre de recherche et filtres (cachée si filtre utilisateur actif) */}
        {!userId && (
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Barre de recherche principale */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, modèle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Bouton filtres */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 border rounded-lg transition-colors text-sm ${
                  showFilters || hasActiveFilters
                    ? "bg-blue-50 border-blue-500 text-blue-600"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtres</span>
                {hasActiveFilters && (
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                    !
                  </span>
                )}
              </button>

              {/* Bouton réinitialiser */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Réinitialiser</span>
                  <span className="sm:hidden">Reset</span>
                </button>
              )}
            </div>

            {/* Panneau des filtres avancés */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Filtre par date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date spécifique
                  </label>
                  <input
                    type="date"
                    value={filters.date}
                    onChange={(e) => setFilters({...filters, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Date de départ, retour ou création</p>
                </div>

                {/* Filtre par modèle de véhicule */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modèle de véhicule
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Tesla, SUV, BMW..."
                    value={filters.vehicleModel}
                    onChange={(e) => setFilters({...filters, vehicleModel: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                {/* Filtre par statut (pour recherche globale) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="pending">En attente</option>
                    <option value="accepted">Acceptée</option>
                    <option value="refused">Refusée</option>
                    <option value="active">Active</option>
                    <option value="completed">Terminée</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🔹 Onglets avec compteurs adaptés - Version mobile avec scroll */}
        <div className="bg-white rounded-lg shadow-sm border mb-6 overflow-x-auto">
          <div className="flex min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`px-2 py-1 rounded-full text-xs min-w-6 ${
                  activeTab === tab.key 
                    ? "bg-blue-100 text-blue-600" 
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 🔹 Carte des réservations - Version mobile optimisée */}
        {filteredReservations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="text-gray-400 text-4xl sm:text-6xl mb-4">🔍</div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              {hasActiveFilters 
                ? userId 
                  ? "Aucune réservation pour ce client"
                  : "Aucun résultat trouvé"
                : `Aucune réservation ${tabs.find((t) => t.key === activeTab)?.label.toLowerCase()}`
              }
            </h3>
            <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto mb-4">
              {hasActiveFilters 
                ? userId
                  ? "Ce client n'a effectué aucune réservation pour le moment."
                  : "Essayez de modifier vos critères de recherche."
                : activeTab === "pending" 
                  ? "Les nouvelles réservations apparaîtront ici."
                  : "Aucune réservation dans cette catégorie."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                {userId ? "Voir toutes les réservations" : "Réinitialiser la recherche"}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReservations.map((reservation) => (
              <div key={reservation.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-4 sm:p-6">
                  {/* En-tête de la réservation - Version mobile */}
                  <div className="flex flex-col gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      {/* Image du véhicule */}
                      <div className="flex-shrink-0">
                        {reservation.car_image ? (
                          <img
                            src={reservation.car_image}
                            alt={reservation.car_name}
                            className="w-16 h-12 sm:w-20 sm:h-14 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-12 sm:w-20 sm:h-14 bg-gray-200 rounded-lg flex items-center justify-center">
                            <Car className="h-4 w-4 sm:h-6 sm:w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Informations véhicule et client */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                              {reservation.car_name}
                            </h3>
                            <p className="text-gray-600 text-sm mb-2">{reservation.car_category}</p>
                            
                            {/* Informations client compact */}
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="truncate">
                                {reservation.profiles?.full_name || reservation.guest_name || "Client non identifié"}
                              </span>
                              {reservation.guest_name && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Invité</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Statut et prix */}
                          <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              reservation.business_status === "pending" 
                                ? "bg-yellow-100 text-yellow-800"
                                : reservation.business_status === "accepted"
                                ? "bg-blue-100 text-blue-800"
                                : reservation.business_status === "active"
                                ? "bg-green-100 text-green-800"
                                : reservation.business_status === "completed"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-red-100 text-red-800"
                            }`}>
                              {reservation.business_status === "pending" && "⏳ En attente"}
                              {reservation.business_status === "accepted" && "✅ Acceptée"}
                              {reservation.business_status === "active" && "🚗 Active"}
                              {reservation.business_status === "completed" && "🏁 Terminée"}
                              {reservation.business_status === "refused" && "❌ Refusée"}
                            </div>
                            <div className="text-base sm:text-lg font-bold text-gray-900">
                              {formatPrice(reservation.total_price)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Détails de la réservation - Version mobile compacte */}
                  <div className="grid grid-cols-1 gap-3 py-4 border-t border-b">
                    {/* Lieux et dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-1 text-sm font-medium text-gray-900 mb-1">
                          <Calendar className="h-3 w-3" />
                          Départ
                        </div>
                        <p className="text-sm text-gray-600">{reservation.pickup_location}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(reservation.pickup_date)}
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1 text-sm font-medium text-gray-900 mb-1">
                          <Calendar className="h-3 w-3" />
                          Retour
                        </div>
                        <p className="text-sm text-gray-600">{reservation.return_location}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(reservation.return_date)}
                        </p>
                      </div>
                    </div>

                    {/* Contact et date réservation */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-1 text-sm font-medium text-gray-900 mb-1">
                          <Phone className="h-3 w-3" />
                          Téléphone
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {reservation.guest_phone || reservation.profiles?.telephone || "Non renseigné"}
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1 text-sm font-medium text-gray-900 mb-1">
                          <Mail className="h-3 w-3" />
                          Email
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {reservation.guest_email || reservation.profiles?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4">
                    <div className="text-xs text-gray-500 truncate">
                      ID: {reservation.id.slice(0, 8)}...
                    </div>
                    
                    {reservation.status === "pending" && (
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleAcceptReservation(reservation)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex-1 sm:flex-none text-center"
                        >
                          Accepter
                        </button>
                        <button
                          onClick={() => handleRejectReservation(reservation)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm flex-1 sm:flex-none text-center"
                        >
                          Refuser
                        </button>
                      </div>
                    )}
                    
                    {reservation.status !== "pending" && (
                      <div className="text-xs text-gray-500 italic text-center sm:text-right">
                        Réservation {reservation.status === "accepted" ? "acceptée" : "refusée"} le {formatDateTime(reservation.updated_at || reservation.created_at)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}