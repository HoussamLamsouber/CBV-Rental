import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, X, ArrowLeft, Phone, Mail, Calendar, Car, User } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { emailJSService } from "@/services/emailJSService";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

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
  
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    reservation: null,
    reason: ""
  });
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('user');
  
  // 🔹 Gestion sécurisée des traductions
  const { t, i18n } = useTranslation();
  
  // Fonction helper pour les traductions avec fallback
  const translate = (key: string, fallback: string) => {
    try {
      const translation = t(key);
      return translation || fallback;
    } catch (error) {
      return fallback;
    }
  };

  // 🔹 Charger les réservations avec les infos du profil associé
  async function fetchReservations() {
    setLoading(true);
    
    try {
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select("*")
        .order("created_at", { ascending: false });

      if (reservationsError) {
        console.error("❌ Erreur réservations:", reservationsError);
        throw reservationsError;
      }

      if (!reservationsData || reservationsData.length === 0) {
        setReservations([]);
        setLoading(false);
        return;
      }

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
            status: reservation.status,
            business_status: businessStatus,
            guest_name: reservation.guest_name,
            guest_email: reservation.guest_email,
            guest_phone: reservation.guest_phone,
            created_at: reservation.created_at,
            user_id: reservation.user_id,
            profiles: profileInfo,
            rejection_reason: reservation.rejection_reason
          };
        })
      );

      setReservations(reservationsWithProfiles);

    } catch (error: any) {
      console.error("💥 Erreur chargement réservations:", error);
    } finally {
      setLoading(false);
    }
  }

  // 🔥 Calcul du statut métier
  function calculateBusinessStatus(reservation: any) {
    const now = new Date();
    const pickupDateTime = new Date(`${reservation.pickup_date}T${reservation.pickup_time}`);
    const returnDateTime = new Date(`${reservation.return_date}T${reservation.return_time}`);
    
    if (reservation.status === 'refused' || reservation.status === 'pending') {
      return reservation.status;
    }
    
    if (reservation.status === 'accepted') {
      if (now < pickupDateTime) {
        return 'accepted';
      } else if (now >= pickupDateTime && now <= returnDateTime) {
        return 'active';
      } else if (now > returnDateTime) {
        return 'completed';
      }
    }
    
    return reservation.status;
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
        setSearchTerm(profileData.email);
      }
    } catch (error) {
      console.error("Erreur chargement profil:", error);
    }
  }

  // 🔹 Fonction pour ouvrir la modal de refus
  const openRejectModal = (reservation: any) => {
    setRejectModal({
      isOpen: true,
      reservation: reservation,
      reason: ""
    });
  };

  // 🔹 Fonction pour fermer la modal de refus
  const closeRejectModal = () => {
    setRejectModal({
      isOpen: false,
      reservation: null,
      reason: ""
    });
  };

  // 🔹 Fonction pour refuser une réservation avec raison
  const handleRejectWithReason = async () => {
    if (!rejectModal.reservation) return;
    
    if (!rejectModal.reason.trim()) {
      toast({
        title: translate('admin_reservations.reject_modal.missing_reason', 'Raison manquante'),
        description: translate('admin_reservations.reject_modal.missing_reason_desc', 'Veuillez saisir la raison du refus.'),
        variant: "destructive",
      });
      return;
    }

    try {
      const reservation = rejectModal.reservation;
      
      const { error } = await supabase
        .from("reservations")
        .update({ 
          status: "refused",
          rejection_reason: rejectModal.reason
        })
        .eq("id", reservation.id);

      if (error) throw error;

      const emailData = {
        reservationId: reservation.id,
        clientName: reservation.guest_name || reservation.profiles?.full_name || translate('admin_reservations.reservation.unidentified', 'Client non identifié'),
        clientEmail: reservation.guest_email || reservation.profiles?.email,
        clientPhone: reservation.guest_phone || reservation.profiles?.telephone || translate('admin_reservations.reservation.not_provided', 'Non renseigné'),
        carName: reservation.car_name,
        carCategory: reservation.car_category,
        pickupDate: new Date(reservation.pickup_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
        pickupTime: reservation.pickup_time,
        returnDate: new Date(reservation.return_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
        returnTime: reservation.return_time,
        pickupLocation: reservation.pickup_location,
        returnLocation: reservation.return_location,
        totalPrice: reservation.total_price,
        rejectionReason: rejectModal.reason
      };

      await emailJSService.sendReservationRejectedEmail(emailData);

      toast({
        title: translate('admin_reservations.toast.reservation_rejected', 'Réservation refusée'),
        description: translate('admin_reservations.toast.client_notified_reason', 'Le client a été notifié avec la raison du refus.'),
      });

      closeRejectModal();
      fetchReservations();
    } catch (error: any) {
      console.error("Erreur refus réservation:", error);
      toast({
        title: translate('admin_reservations.toast.error', 'Erreur'),
        description: error.message || translate('admin_reservations.toast.update_error', 'Impossible de mettre à jour la réservation.'),
        variant: "destructive",
      });
    }
  };

  // 🔹 Fonction pour accepter une réservation
  const handleAcceptReservation = async (reservation: any) => {
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status: "accepted" })
        .eq("id", reservation.id);

      if (error) throw error;

      const emailData = {
        reservationId: reservation.id,
        clientName: reservation.guest_name || reservation.profiles?.full_name || translate('admin_reservations.reservation.unidentified', 'Client non identifié'),
        clientEmail: reservation.guest_email || reservation.profiles?.email,
        clientPhone: reservation.guest_phone || reservation.profiles?.telephone || translate('admin_reservations.reservation.not_provided', 'Non renseigné'),
        carName: reservation.car_name,
        carCategory: reservation.car_category,
        pickupDate: new Date(reservation.pickup_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
        pickupTime: reservation.pickup_time || "14:00",
        returnDate: new Date(reservation.return_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
        returnTime: reservation.return_time || "14:00",
        pickupLocation: reservation.pickup_location,
        returnLocation: reservation.return_location,
        totalPrice: reservation.total_price,
      };

      if (!emailData.clientEmail) {
        throw new Error("Email du client non trouvé");
      }

      const emailResult = await emailJSService.sendReservationAcceptedEmail(emailData);
      
      if (!emailResult.success) {
        throw new Error("Échec de l'envoi de l'email");
      }

      toast({
        title: translate('admin_reservations.toast.reservation_accepted', 'Réservation acceptée'),
        description: translate('admin_reservations.toast.client_notified', 'Le client a été notifié par email.'),
      });

      fetchReservations();
    } catch (error: any) {
      console.error("❌ Erreur acceptation réservation:", error);
      toast({
        title: translate('admin_reservations.toast.error', 'Erreur'),
        description: error.message || translate('admin_reservations.toast.update_error', 'Impossible de mettre à jour la réservation.'),
        variant: "destructive",
      });
    }
  };

  // 🔹 Rafraîchissement périodique des statuts
  useEffect(() => {
    fetchReservations();
    
    const interval = setInterval(() => {
      fetchReservations();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // 🔹 Fonction pour compter les réservations par statut
  const getReservationsCountByStatus = (status: string) => {
    let filteredReservations = reservations;
    
    if (userId) {
      filteredReservations = filteredReservations.filter(r => r.user_id === userId);
    }
    
    if (status === 'active' || status === 'completed') {
      return filteredReservations.filter(r => r.business_status === status).length;
    }
    
    return filteredReservations.filter(r => r.status === status).length;
  };

  // 🔹 Fonction de recherche et filtrage
  const filteredReservations = reservations.filter((reservation) => {
    const displayStatus = ['active', 'completed'].includes(activeTab) 
      ? reservation.business_status 
      : reservation.status;

    if (displayStatus !== activeTab) return false;

    if (userId && reservation.user_id !== userId) {
      return false;
    }

    const searchLower = searchTerm.toLowerCase();
    if (searchTerm) {
      const matchesSearch = 
        (reservation.profiles?.full_name?.toLowerCase().includes(searchLower) ||
         reservation.profiles?.email?.toLowerCase().includes(searchLower) ||
         reservation.guest_name?.toLowerCase().includes(searchLower) ||
         reservation.guest_email?.toLowerCase().includes(searchLower) ||
         reservation.car_name?.toLowerCase().includes(searchLower) ||
         reservation.car_category?.toLowerCase().includes(searchLower) ||
         reservation.pickup_location?.toLowerCase().includes(searchLower) ||
         reservation.return_location?.toLowerCase().includes(searchLower) ||
         reservation.rejection_reason?.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;
    }

    if (filters.date) {
      const filterDate = new Date(filters.date).toDateString();
      const pickupDate = new Date(reservation.pickup_date).toDateString();
      const returnDate = new Date(reservation.return_date).toDateString();
      const creationDate = new Date(reservation.created_at).toDateString();
      
      if (pickupDate !== filterDate && returnDate !== filterDate && creationDate !== filterDate) {
        return false;
      }
    }

    if (filters.vehicleModel) {
      const vehicleLower = filters.vehicleModel.toLowerCase();
      if (!reservation.car_name?.toLowerCase().includes(vehicleLower) &&
          !reservation.car_category?.toLowerCase().includes(vehicleLower)) {
        return false;
      }
    }

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
    if (userId) {
      navigate('/admin/reservations');
    }
  };

  // 🔹 Onglets avec compteurs adaptés
  const tabs = [
    { 
      key: "pending", 
      label: translate('admin_reservations.status.pending', 'En attente'), 
      count: getReservationsCountByStatus("pending"),
      icon: "⏳"
    },
    { 
      key: "accepted", 
      label: translate('admin_reservations.status.accepted', 'Acceptées'), 
      count: getReservationsCountByStatus("accepted"),
      icon: "✅"
    },
    { 
      key: "active", 
      label: translate('admin_reservations.status.active', 'Actives'), 
      count: getReservationsCountByStatus("active"),
      icon: "🚗"
    },
    { 
      key: "completed", 
      label: translate('admin_reservations.status.completed', 'Terminées'), 
      count: getReservationsCountByStatus("completed"),
      icon: "🏁"
    },
    { 
      key: "refused", 
      label: translate('admin_reservations.status.refused', 'Refusées'), 
      count: getReservationsCountByStatus("refused"),
      icon: "❌"
    },
  ];

  // 🔹 Formater la date selon la langue
  const formatDate = (dateString: string) => {
    if (!dateString) return translate('admin_reservations.reservation.not_provided', 'Non spécifié');
    return new Date(dateString).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // 🔹 Formater le prix
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: 'MAD',
    }).format(price);
  };

  // 🔹 Formater la date et heure de création
  const formatDateTime = (dateString: string) => {
    if (!dateString) return translate('admin_reservations.reservation.not_provided', 'Non spécifié');
    return new Date(dateString).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
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
          <div className="text-gray-600">{translate('admin_reservations.messages.loading', 'Chargement des réservations...')}</div>
        </div>
      </div>
    );
  }

  // Fonction utilitaire pour traduire les lieux
  const translateLocation = (location: string) => {
    if (!location) return location;
    
    // Retirer les préfixes communs
    const cleanLocation = location
      .replace('airport_', '')
      .replace('station_', '');
    
    // Essayer la traduction des aéroports
    const airportKey = `airports.${cleanLocation}`;
    const airportTrans = t(airportKey);
    if (airportTrans !== airportKey) {
      return airportTrans;
    }
    
    // Essayer la traduction des gares
    const stationKey = `stations.${cleanLocation}`;
    const stationTrans = t(stationKey);
    if (stationTrans !== stationKey) {
      return stationTrans;
    }
    
    // Fallback : retourner la valeur originale
    return location;
  };

  // Fonction utilitaire pour traduire les catégories
  const translateCategory = (category: string) => {
    if (!category) return category;
    
    // Essayer avec admin_vehicles.categories
    const categoryKey = `admin_vehicles.categories.${category}`;
    const categoryTrans = t(categoryKey);
    if (categoryTrans !== categoryKey) {
      return categoryTrans;
    }
    
    // Essayer avec categories directement
    const directCategoryKey = `categories.${category}`;
    const directCategoryTrans = t(directCategoryKey);
    if (directCategoryTrans !== directCategoryKey) {
      return directCategoryTrans;
    }
    
    // Fallback
    return category;
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
                <span className="hidden sm:inline">{translate('admin_reservations.actions.back_users', 'Retour aux utilisateurs')}</span>
                <span className="sm:hidden">{translate('admin_reservations.actions.back', 'Retour')}</span>
              </button>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">
                {userId && userProfile 
                  ? `${translate('admin_reservations.title', 'Gestion des réservations')} - ${userProfile.full_name || userProfile.email}`
                  : translate('admin_reservations.title', 'Gestion des réservations')
                }
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                {userId 
                  ? `${getReservationsCountByStatus("pending") + getReservationsCountByStatus("accepted") + getReservationsCountByStatus("refused")} ${translate('admin_reservations.client_reservations', 'réservation(s) pour ce client')}`
                  : `${reservations.length} ${translate('admin_reservations.total_reservations', 'réservation(s) au total')}`
                }
                {hasActiveFilters && ` • ${filteredReservations.length} ${translate('admin_reservations.results', 'résultat(s)')}`}
              </p>
            </div>
            
            {userId && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm w-full sm:w-auto justify-center"
              >
                <X className="h-4 w-4" />
                {translate('admin_reservations.actions.see_all', 'Voir toutes les réservations')}
              </button>
            )}
          </div>
        </div>

        {/* 🔹 Barre de recherche et filtres */}
        {!userId && (
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Barre de recherche principale */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder={translate('admin_reservations.search.placeholder', 'Rechercher par nom, email, modèle...')}
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
                <span className="hidden sm:inline">{translate('admin_reservations.filters.title', 'Filtres')}</span>
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
                  <span className="hidden sm:inline">{translate('admin_reservations.filters.reset', 'Réinitialiser')}</span>
                  <span className="sm:hidden">{translate('admin_reservations.filters.reset', 'Réinitialiser')}</span>
                </button>
              )}
            </div>

            {/* Panneau des filtres avancés */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                  
                  {/* Filtre par date */}
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {translate('admin_reservations.filters.date', 'Date spécifique')}
                    </label>
                    <div className="relative w-full">
                      <input
                        type="date"
                        value={filters.date}
                        onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                        className="block w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none sm:max-w-full overflow-hidden"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{translate('admin_reservations.filters.date_help', 'Date de départ, retour ou création')}</p>
                  </div>

                  {/* Filtre par modèle de véhicule */}
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {translate('admin_reservations.filters.vehicle_model', 'Modèle de véhicule')}
                    </label>
                    <input
                      type="text"
                      placeholder={translate('admin_reservations.filters.vehicle_placeholder', 'Ex: Tesla, SUV, BMW...')}
                      value={filters.vehicleModel}
                      onChange={(e) => setFilters({...filters, vehicleModel: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  {/* Filtre par statut */}
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {translate('admin_reservations.filters.status', 'Statut')}
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({...filters, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="all">{translate('admin_reservations.filters.all_status', 'Tous les statuts')}</option>
                      <option value="pending">{translate('admin_reservations.status.pending', 'En attente')}</option>
                      <option value="accepted">{translate('admin_reservations.status.accepted', 'Acceptée')}</option>
                      <option value="refused">{translate('admin_reservations.status.refused', 'Refusée')}</option>
                      <option value="active">{translate('admin_reservations.status.active', 'Active')}</option>
                      <option value="completed">{translate('admin_reservations.status.completed', 'Terminée')}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🔹 Onglets avec compteurs adaptés */}
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

        {/* 🔹 Carte des réservations */}
        {filteredReservations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="text-gray-400 text-4xl sm:text-6xl mb-4">🔍</div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              {hasActiveFilters 
                ? userId 
                  ? translate('admin_reservations.messages.no_client_reservations', 'Aucune réservation pour ce client')
                  : translate('admin_reservations.messages.no_results', 'Aucun résultat trouvé')
                : `${translate('admin_reservations.messages.no_reservations', 'Aucune réservation')} ${tabs.find((t) => t.key === activeTab)?.label.toLowerCase()}`
              }
            </h3>
            <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto mb-4">
              {hasActiveFilters 
                ? userId
                  ? translate('admin_reservations.messages.client_no_reservations', 'Ce client n\'a effectué aucune réservation pour le moment.')
                  : translate('admin_reservations.messages.try_search', 'Essayez de modifier vos critères de recherche.')
                : activeTab === "pending" 
                  ? translate('admin_reservations.messages.new_reservations', 'Les nouvelles réservations apparaîtront ici.')
                  : translate('admin_reservations.messages.no_category_reservations', 'Aucune réservation dans cette catégorie.')}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                {userId ? translate('admin_reservations.actions.see_all', 'Voir toutes les réservations') : translate('admin_reservations.filters.reset', 'Réinitialiser')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReservations.map((reservation) => (
              <div key={reservation.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-4 sm:p-6">
                  {/* En-tête de la réservation */}
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
                            <p className="text-gray-600 text-sm mb-2">{t(`admin_vehicles.categories.${reservation.car_category}`)}</p>
                            
                            {/* Informations client compact */}
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="truncate">
                                {reservation.profiles?.full_name || reservation.guest_name || translate('admin_reservations.reservation.unidentified', 'Client non identifié')}
                              </span>
                              {reservation.guest_name && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{translate('admin_reservations.reservation.guest', 'Invité')}</span>
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
                              {reservation.business_status === "pending" && "⏳ " + translate('admin_reservations.status.pending', 'En attente')}
                              {reservation.business_status === "accepted" && "✅ " + translate('admin_reservations.status.accepted', 'Acceptée')}
                              {reservation.business_status === "active" && "🚗 " + translate('admin_reservations.status.active', 'Active')}
                              {reservation.business_status === "completed" && "🏁 " + translate('admin_reservations.status.completed', 'Terminée')}
                              {reservation.business_status === "refused" && "❌ " + translate('admin_reservations.status.refused', 'Refusée')}
                            </div>
                            <div className="text-base sm:text-lg font-bold text-gray-900">
                              {formatPrice(reservation.total_price)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Détails de la réservation */}
                  <div className="grid grid-cols-1 gap-3 py-4 border-t border-b">
                    {/* Lieux et dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-1 text-sm font-medium text-gray-900 mb-1">
                          <Calendar className="h-3 w-3" />
                          {translate('admin_reservations.reservation.pickup', 'Départ')}
                        </div>
                        <p className="text-sm text-gray-600">{translateLocation(reservation.pickup_location)}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(reservation.pickup_date)}
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1 text-sm font-medium text-gray-900 mb-1">
                          <Calendar className="h-3 w-3" />
                          {translate('admin_reservations.reservation.return', 'Retour')}
                        </div>
                        <p className="text-sm text-gray-600">{translateLocation(reservation.return_location)}</p>
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
                          {translate('admin_reservations.reservation.phone', 'Téléphone')}
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {reservation.guest_phone || reservation.profiles?.telephone || translate('admin_reservations.reservation.not_provided', 'Non renseigné')}
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1 text-sm font-medium text-gray-900 mb-1">
                          <Mail className="h-3 w-3" />
                          {translate('admin_reservations.reservation.email', 'Email')}
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {reservation.guest_email || reservation.profiles?.email}
                        </p>
                      </div>
                    </div>

                    {/* Affichage de la raison de refus si elle existe */}
                    {reservation.rejection_reason && (
                      <div className="col-span-2">
                        <div className="flex items-center gap-1 text-sm font-medium text-red-900 mb-1">
                          ❌ {translate('admin_reservations.reject_modal.reason', 'Raison du refus')}
                        </div>
                        <p className="text-sm text-red-700 bg-red-50 p-2 rounded border border-red-200">
                          {reservation.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4">
                    <div className="text-xs text-gray-500 truncate">
                      {translate('admin_reservations.reservation.id', 'ID')}: {reservation.id.slice(0, 8)}...
                    </div>
                    
                    {reservation.status === "pending" && (
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleAcceptReservation(reservation)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex-1 sm:flex-none text-center"
                        >
                          {translate('admin_reservations.actions.accept', 'Accepter')}
                        </button>
                        <button
                          onClick={() => openRejectModal(reservation)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm flex-1 sm:flex-none text-center"
                        >
                          {translate('admin_reservations.actions.reject', 'Refuser')}
                        </button>
                      </div>
                    )}
                    
                    {reservation.status !== "pending" && (
                      <div className="text-xs text-gray-500 italic text-center sm:text-right">
                        {translate('admin_reservations.reservation.status', 'Statut')} {reservation.status === "accepted" ? translate('admin_reservations.reservation.accepted_on', 'acceptée le') : translate('admin_reservations.reservation.rejected_on', 'refusée le')} {formatDateTime(reservation.updated_at || reservation.created_at)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔹 Modal de refus avec raison */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {translate('admin_reservations.reject_modal.title', 'Refuser la réservation')}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translate('admin_reservations.reject_modal.reason', 'Raison du refus *')}
              </label>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({...rejectModal, reason: e.target.value})}
                placeholder={translate('admin_reservations.reject_modal.placeholder', 'Veuillez saisir la raison du refus (cette raison sera communiquée au client)...')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeRejectModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
              >
                {translate('admin_reservations.reject_modal.cancel', 'Annuler')}
              </button>
              <button
                onClick={handleRejectWithReason}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
              >
                {translate('admin_reservations.reject_modal.confirm', 'Confirmer le refus')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}