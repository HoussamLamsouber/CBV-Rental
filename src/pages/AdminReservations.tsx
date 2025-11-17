import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, X, ArrowLeft, Phone, Mail, Calendar, Car, User, Rows3, StretchHorizontal } from "lucide-react";
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
  const [viewMode, setViewMode] = useState("cards");
  
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    reservation: null,
    reason: ""
  });
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('user');
  
  const { t, i18n } = useTranslation();
  
  const translate = (key: string, fallback: string) => {
    try {
      const translation = t(key);
      return translation || fallback;
    } catch (error) {
      return fallback;
    }
  };

  async function fetchReservations() {
    setLoading(true);
    
    try {
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select("*")
        .order("created_at", { ascending: false });

      if (reservationsError) {
        console.error("Erreur réservations:", reservationsError);
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
              console.warn(`Impossible de charger le profil pour ${reservation.user_id}`);
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
            updated_at: reservation.updated_at,
            user_id: reservation.user_id,
            profiles: profileInfo,
            rejection_reason: reservation.rejection_reason
          };
        })
      );

      setReservations(reservationsWithProfiles);

    } catch (error: any) {
      console.error("Erreur chargement réservations:", error);
    } finally {
      setLoading(false);
    }
  }

  function calculateBusinessStatus(reservation: any) {
    const now = new Date();
    const pickupDateTime = new Date(`${reservation.pickup_date}T${reservation.pickup_time}`);
    
    if (reservation.status === 'pending' && now > pickupDateTime) {
      return 'expired';
    }
    
    if (reservation.status === 'refused' || reservation.status === 'pending') {
      return reservation.status;
    }
    
    if (reservation.status === 'accepted') {
      const returnDateTime = new Date(`${reservation.return_date}T${reservation.return_time}`);
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

  const checkVehicleAvailability = async (
    carName: string,
    pickupDate: Date,
    returnDate: Date,
    excludeReservationId?: string
  ): Promise<boolean> => {
    try {
      const { data: cars, error: carError } = await supabase
        .from("cars")
        .select("quantity")
        .eq("name", carName);

      if (carError || !cars || cars.length === 0) {
        return false;
      }

      const totalQuantity = cars[0].quantity || 1;

      const { data: activeReservations, error: reservationsError } = await supabase
        .from("reservations")
        .select("id, pickup_date, return_date")
        .eq("car_name", carName)
        .eq("status", "accepted");

      if (reservationsError) {
        return false;
      }

      const overlappingReservations = activeReservations?.filter(res => {
        const resPickup = new Date(res.pickup_date);
        const resReturn = new Date(res.return_date);
        return (pickupDate <= resReturn && returnDate >= resPickup);
      }) || [];

      const finalCount = excludeReservationId 
        ? overlappingReservations.filter(r => r.id !== excludeReservationId).length
        : overlappingReservations.length;

      return finalCount < totalQuantity;

    } catch (error) {
      console.error("Erreur vérification disponibilité:", error);
      return false;
    }
  };

  const openRejectModal = (reservation: any) => {
    setRejectModal({
      isOpen: true,
      reservation: reservation,
      reason: ""
    });
  };

  const closeRejectModal = () => {
    setRejectModal({
      isOpen: false,
      reservation: null,
      reason: ""
    });
  };

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
  
      if (error) {
        throw new Error(`Impossible de refuser: ${error.message}`);
      }
  
      // 🔥 ENVOYER L'EMAIL DE REFUS MANUEL
      try {
        const clientEmail = await getReservationEmail(reservation);
        
        if (clientEmail) {
          const emailData = {
            reservationId: reservation.id,
            clientName: reservation.guest_name || reservation.profiles?.full_name || translate('admin_reservations.reservation.unidentified', 'Client non identifié'),
            clientEmail: clientEmail,
            clientPhone: reservation.guest_phone || reservation.profiles?.telephone || translate('admin_reservations.reservation.not_provided', 'Non renseigné'),
            carName: reservation.car_name,
            carCategory: getTranslatedCategory(reservation.car_category),
            pickupDate: new Date(reservation.pickup_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
            pickupTime: reservation.pickup_time || "14:00",
            returnDate: new Date(reservation.return_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
            returnTime: reservation.return_time || "14:00",
            pickupLocation: getTranslatedLocation(reservation.pickup_location),
            returnLocation: getTranslatedLocation(reservation.return_location),
            totalPrice: reservation.total_price,
            rejectionReason: rejectModal.reason, // 🔥 Utiliser la raison personnalisée
            language: i18n.language
          };
  
          await emailJSService.sendReservationRejectedEmail(emailData);
        }
      } catch (emailError) {
        console.error("Erreur envoi email refus manuel:", emailError);
        // Ne pas bloquer le processus si l'email échoue
      }
  
      // Fermer la modal et rafraîchir
      closeRejectModal();
      await fetchReservations();
      
      toast({
        title: translate('admin_reservations.toast.reservation_rejected', '❌ Réservation refusée'),
      });
  
    } catch (error: any) {
      console.error("Erreur refus:", error);
      toast({
        title: translate('admin_reservations.toast.error', 'Erreur'),
        description: error.message || translate('admin_reservations.toast.update_error', 'Impossible de refuser la réservation.'),
        variant: "destructive",
      });
    }
  };

  const AUTO_REFUSE_MESSAGE = t(
    'admin_reservations.auto_reject_message', 
    'Votre réservation a été refusée car le véhicule n’est plus disponible pour cette période.'
  );

  const handleAcceptReservation = async (reservation: any) => {
    try {
      const isAvailable = await checkVehicleAvailability(
        reservation.car_name,
        new Date(reservation.pickup_date),
        new Date(reservation.return_date),
        reservation.id
      );
  
      const { error: acceptError } = await supabase
        .from("reservations")
        .update({ 
          status: "accepted"
        })
        .eq("id", reservation.id);
  
      if (acceptError) {
        throw acceptError;
      }
  
      try {
        const acceptanceEmailData = {
          reservationId: reservation.id,
          clientName: reservation.guest_name || reservation.profiles?.full_name || translate('admin_reservations.reservation.unidentified', 'Client non identifié'),
          clientEmail: reservation.guest_email || reservation.profiles?.email,
          clientPhone: reservation.guest_phone || reservation.profiles?.telephone || translate('admin_reservations.reservation.not_provided', 'Non renseigné'),
          carName: reservation.car_name,
          carCategory: getTranslatedCategory(reservation.car_category),
          pickupDate: new Date(reservation.pickup_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
          pickupTime: reservation.pickup_time || "14:00",
          returnDate: new Date(reservation.return_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
          returnTime: reservation.return_time || "14:00",
          pickupLocation: getTranslatedLocation(reservation.pickup_location),
          returnLocation: getTranslatedLocation(reservation.return_location),
          totalPrice: reservation.total_price,
          language: i18n.language
        };
  
        if (acceptanceEmailData.clientEmail) {
          await emailJSService.sendReservationAcceptedEmail(acceptanceEmailData);
        }
      } catch (emailError) {
        console.error("Erreur envoi email acceptation:", emailError);
      }
  
      const { data: allPendingReservations, error: pendingError } = await supabase
        .from("reservations")
        .select(`
          id, 
          car_name, 
          pickup_date, 
          return_date, 
          guest_name, 
          guest_email, 
          guest_phone, 
          car_category, 
          pickup_time, 
          return_time, 
          pickup_location, 
          return_location, 
          total_price,
          user_id
        `)
        .eq("car_name", reservation.car_name)
        .eq("status", "pending")
        .neq("id", reservation.id);
  
      let refusedCount = 0;
      let emailSentCount = 0;
      
      if (allPendingReservations && allPendingReservations.length > 0) {
        const reservationsToRefuse = allPendingReservations.filter(req => {
          const reqPickup = new Date(req.pickup_date);
          const reqReturn = new Date(req.return_date);
          const resPickup = new Date(reservation.pickup_date);
          const resReturn = new Date(reservation.return_date);
          
          return (reqPickup <= resReturn && reqReturn >= resPickup);
        });
  
        for (const req of reservationsToRefuse) {
          try {
            const { error: rejectError } = await supabase
              .from("reservations")
              .update({
                status: "refused",
                rejection_reason: AUTO_REFUSE_MESSAGE
              })
              .eq("id", req.id);
            
            if (!rejectError) {
              refusedCount++;
              
              const clientEmail = await getReservationEmail(req);
              
              if (clientEmail) {
                try {
                  const emailData = {
                    reservationId: req.id,
                    clientName: req.guest_name || translate('admin_reservations.reservation.unidentified', 'Client non identifié'),
                    clientEmail: clientEmail,
                    clientPhone: req.guest_phone || translate('admin_reservations.reservation.not_provided', 'Non renseigné'),
                    carName: req.car_name,
                    carCategory: getTranslatedCategory(req.car_category),
                    pickupDate: new Date(req.pickup_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
                    pickupTime: req.pickup_time || "14:00",
                    returnDate: new Date(req.return_date).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US'),
                    returnTime: req.return_time || "14:00",
                    pickupLocation: getTranslatedLocation(req.pickup_location),
                    returnLocation: getTranslatedLocation(req.return_location),
                    totalPrice: req.total_price,
                    rejectionReason: AUTO_REFUSE_MESSAGE,
                    language: i18n.language
                  };
  
                  const emailResult = await emailJSService.sendReservationRejectedEmail(emailData);
                  
                  if (emailResult.success) {
                    emailSentCount++;
                  }
                } catch (emailError) {
                  console.error(`Erreur email refus ${req.id}:`, emailError);
                }
              }
            }
          } catch (error) {
            console.error(`Erreur refus ${req.id}:`, error);
          }
        }
      }
  
      await fetchReservations();
      
      // 🔥 NOUVEAU : Toasts simplifiés et plus courts
      let title, description;
      
      if (refusedCount > 0) {
        title = t('admin_reservations.toast.accept_with_auto_reject', '✅ Acceptée + {{count}} refus auto', { count: refusedCount });
      } else {
        title = t('admin_reservations.toast.accept_success', '✅ Réservation acceptée');
        description = '';
      }

      toast({
        title,
        description,
      });

    } catch (error: any) {
      console.error("Erreur acceptation réservation:", error);
      toast({
        title: t('admin_reservations.toast.error', 'Erreur'),
        description: t('admin_reservations.toast.update_error', 'Impossible de traiter la réservation.'),
        variant: "destructive",
      });
    }
  };

  const getReservationEmail = async (reservation: any): Promise<string | null> => {
    if (reservation.guest_email) {
      return reservation.guest_email;
    }
    
    if (reservation.user_id) {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", reservation.user_id)
          .single();
        
        if (!error && profile?.email) {
          return profile.email;
        }
      } catch (error) {
        console.error("Erreur recherche profil:", error);
      }
    }
    
    return null;
  };

  const getTranslatedLocation = (locationValue: string) => {
    const airportKey = locationValue.replace('airport_', '');
    const airportTranslation = t(`airports.${airportKey}`);
    if (airportTranslation && !airportTranslation.startsWith('airports.')) {
      return airportTranslation;
    }
    
    const stationKey = locationValue.replace('station_', '');
    const stationTranslation = t(`stations.${stationKey}`);
    if (stationTranslation && !stationTranslation.startsWith('stations.')) {
      return stationTranslation;
    }
    
    return locationValue;
  };

  const getTranslatedCategory = (category: string) => {
    // Essayer d'abord les catégories spécifiques admin
    const adminCategoryTranslation = t(`admin_reservations.categories.${category}`);
    if (adminCategoryTranslation && !adminCategoryTranslation.startsWith('admin_reservations.categories.')) {
      return adminCategoryTranslation;
    }
    
    // Fallback aux catégories générales
    const categoryTranslation = t(`offers_page.categories.${category}`);
    if (categoryTranslation && !categoryTranslation.startsWith('offers_page.categories.')) {
      return categoryTranslation;
    }
    
    const adminVehiclesCategoryTranslation = t(`admin_vehicles.categories.${category}`);
    if (adminVehiclesCategoryTranslation && !adminVehiclesCategoryTranslation.startsWith('admin_vehicles.categories.')) {
      return adminVehiclesCategoryTranslation;
    }
    
    return category;
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const getReservationsCountByStatus = (status: string) => {
    let filteredReservations = reservations;
    
    if (userId) {
      filteredReservations = filteredReservations.filter(r => r.user_id === userId);
    }
    
    if (status === 'active' || status === 'completed' || status === 'expired') {
      return filteredReservations.filter(r => r.business_status === status).length;
    }
    
    if (status === 'pending') {
      return filteredReservations.filter(r => r.status === 'pending' && r.business_status !== 'expired').length;
    }
    
    // Ajouter le cas pour les réservations annulées
    if (status === 'cancelled') {
      return filteredReservations.filter(r => r.status === 'cancelled').length;
    }
    
    return filteredReservations.filter(r => r.status === status).length;
  };

  const filteredReservations = reservations.filter((reservation) => {
    let displayStatus;
    
    if (activeTab === 'expired') {
      displayStatus = reservation.business_status;
      if (displayStatus !== 'expired') return false;
    } else if (['active', 'completed'].includes(activeTab)) {
      displayStatus = reservation.business_status;
      if (displayStatus !== activeTab) return false;
    } else if (activeTab === 'cancelled') {
      displayStatus = reservation.status;
      if (displayStatus !== 'cancelled') return false;
    } else {
      displayStatus = reservation.status;
      if (displayStatus !== activeTab) return false;
      
      if (activeTab === 'pending' && reservation.business_status === 'expired') {
        return false;
      }
    }

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
      key: "expired", 
      label: translate('admin_reservations.status.expired', 'Expirées'), 
      count: getReservationsCountByStatus("expired"),
      icon: "⏱️"
    },
    { 
      key: "refused", 
      label: translate('admin_reservations.status.refused', 'Refusées'), 
      count: getReservationsCountByStatus("refused"),
      icon: "❌"
    },
    { 
      key: "cancelled", 
      label: translate('admin_reservations.status.cancelled', 'Annulées'), 
      count: getReservationsCountByStatus("cancelled"),
      icon: "🚫"
    },
  ];

  const formatDate = (dateString: string) => {
    if (!dateString) return translate('admin_reservations.reservation.not_provided', 'Non spécifié');
    return new Date(dateString).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: 'MAD',
    }).format(price);
  };

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

  const translateLocation = (location: string) => {
    if (!location) return location;
    
    const cleanLocation = location
      .replace('airport_', '')
      .replace('station_', '');
    
    const airportKey = `airports.${cleanLocation}`;
    const airportTrans = t(airportKey);
    if (airportTrans !== airportKey) {
      return airportTrans;
    }
    
    const stationKey = `stations.${cleanLocation}`;
    const stationTrans = t(stationKey);
    if (stationTrans !== stationKey) {
      return stationTrans;
    }
    
    return location;
  };

  const translateCategory = (category: string) => {
    if (!category) return category;
    
    // Essayer d'abord les catégories spécifiques admin
    const adminCategoryKey = `admin_reservations.categories.${category}`;
    const adminCategoryTrans = t(adminCategoryKey);
    if (adminCategoryTrans !== adminCategoryKey) {
      return adminCategoryTrans;
    }
    
    // Fallback aux autres namespaces
    const categoryKey = `admin_vehicles.categories.${category}`;
    const categoryTrans = t(categoryKey);
    if (categoryTrans !== categoryKey) {
      return categoryTrans;
    }
    
    const directCategoryKey = `categories.${category}`;
    const directCategoryTrans = t(directCategoryKey);
    if (directCategoryTrans !== directCategoryKey) {
      return directCategoryTrans;
    }
    
    return category;
  };

  const hasActiveFilters = searchTerm || filters.date || filters.vehicleModel || (filters.status && filters.status !== "all") || userId;

  const TableView = ({ reservations }) => (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {translate('admin_reservations.reservation.vehicle', 'Véhicule')} / {translate('admin_reservations.reservation.details', 'Client')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {translate('admin_reservations.reservation.pickup', 'Période')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {translate('admin_reservations.reservation.location', 'Lieux')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {translate('admin_reservations.reservation.contact', 'Contact')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {translate('admin_reservations.reservation.total_price', 'Prix')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {translate('admin_reservations.reservation.status', 'Statut')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {translate('admin_reservations.actions.title', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reservations.map((reservation) => (
              <tr key={reservation.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {reservation.car_image ? (
                      <img
                        src={reservation.car_image}
                        alt={reservation.car_name}
                        className="w-10 h-8 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-8 bg-gray-200 rounded flex items-center justify-center">
                        <Car className="h-3 w-3 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {reservation.car_name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {reservation.profiles?.full_name || reservation.guest_name || translate('admin_reservations.reservation.unidentified', 'Client non identifié')}
                        {reservation.guest_name && (
                          <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1 py-0.5 rounded">
                            {translate('admin_reservations.reservation.guest', 'Invité')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">
                    {formatDate(reservation.pickup_date)}
                  </div>
                  <div className="text-sm text-gray-900">
                    {formatDate(reservation.return_date)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {reservation.pickup_time} - {reservation.return_time}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">
                    {translateLocation(reservation.pickup_location)}
                  </div>
                  <div className="text-sm text-gray-900">
                    {translateLocation(reservation.return_location)}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900 truncate">
                    {reservation.guest_email || reservation.profiles?.email}
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {reservation.guest_phone || reservation.profiles?.telephone || translate('admin_reservations.reservation.not_provided', 'Non renseigné')}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatPrice(reservation.total_price)}
                  </div>
                </td>

                <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  reservation.business_status === "pending" 
                    ? "bg-yellow-100 text-yellow-800"
                    : reservation.business_status === "accepted"
                    ? "bg-blue-100 text-blue-800"
                    : reservation.business_status === "active"
                    ? "bg-green-100 text-green-800"
                    : reservation.business_status === "completed"
                    ? "bg-gray-100 text-gray-800"
                    : reservation.business_status === "expired"
                    ? "bg-orange-100 text-orange-800"
                    : reservation.status === "cancelled"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-red-100 text-red-800"
                }`}>
                  {reservation.business_status === "pending" && "⏳"}
                  {reservation.business_status === "accepted" && "✅"}
                  {reservation.business_status === "active" && "🚗"}
                  {reservation.business_status === "completed" && "🏁"}
                  {reservation.business_status === "expired" && "💀"}
                  {reservation.status === "cancelled" && "🚫"}
                  {reservation.business_status === "refused" && "❌"}
                  <span className="ml-1 hidden sm:inline">
                    {reservation.business_status === "pending" && translate('admin_reservations.status.pending', 'En attente')}
                    {reservation.business_status === "accepted" && translate('admin_reservations.status.accepted', 'Acceptée')}
                    {reservation.business_status === "active" && translate('admin_reservations.status.active', 'Active')}
                    {reservation.business_status === "completed" && translate('admin_reservations.status.completed', 'Terminée')}
                    {reservation.business_status === "expired" && translate('admin_reservations.status.expired', 'Expirée')}
                    {reservation.status === "cancelled" && translate('admin_reservations.status.cancelled', 'Annulée')}
                    {reservation.business_status === "refused" && translate('admin_reservations.status.refused', 'Refusée')}
                  </span>
                </span>
                </td>

                <td className="px-4 py-3">
                  {reservation.status === "pending" && reservation.business_status !== "expired" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptReservation(reservation)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                      >
                        {translate('admin_reservations.actions.accept', 'Accepter')}
                      </button>
                      <button
                        onClick={() => openRejectModal(reservation)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                      >
                        {translate('admin_reservations.actions.reject', 'Refuser')}
                      </button>
                    </div>
                  )}
                  {reservation.business_status === "expired" && (
                    <div className="text-xs text-orange-600 italic">
                      {translate('admin_reservations.messages.expired_reservation', 'Réservation expirée')}
                    </div>
                  )}
                  {(reservation.status !== "pending" && reservation.business_status !== "expired") && (
                    <div className="text-xs text-gray-500 italic">
                      {formatDateTime(reservation.updated_at || reservation.created_at)}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

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

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
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
                  ? `${getReservationsCountByStatus("pending") + getReservationsCountByStatus("accepted") + getReservationsCountByStatus("expired") + getReservationsCountByStatus("refused")} ${translate('admin_reservations.client_reservations', 'réservation(s) pour ce client')}`
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

        {!userId && (
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-3">
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

            {showFilters && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
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
                      <option value="cancelled">{translate('admin_reservations.status.cancelled', 'Annulée')}</option>
                      <option value="active">{translate('admin_reservations.status.active', 'Active')}</option>
                      <option value="completed">{translate('admin_reservations.status.completed', 'Terminée')}</option>
                      <option value="expired">{translate('admin_reservations.status.expired', 'Expirée')}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border overflow-x-auto flex-1">
            <div className="flex min-w-max w-full">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex-1 min-w-0 ${
                    activeTab === tab.key
                      ? "border-blue-600 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  <span className="hidden sm:inline truncate">{tab.label}</span>
                  <span className={`px-2 py-1 rounded-full text-xs min-w-6 flex-shrink-0 ${
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

          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 p-1 flex-shrink-0">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "cards" 
                  ? "bg-blue-100 text-blue-600" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
              title={translate('admin_reservations.view_mode.cards_tooltip', 'Vue cartes')}
            >
              <StretchHorizontal className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "table" 
                  ? "bg-blue-100 text-blue-600" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
              title={translate('admin_reservations.view_mode.table_tooltip', 'Vue tableau')}
            >
              <Rows3 className="h-4 w-4" />
            </button>
          </div>
        </div>

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
        ) : viewMode === "cards" ? (
          <div className="space-y-4">
            {filteredReservations.map((reservation) => (
              <div key={reservation.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4 mb-4">
                    <div className="flex items-start gap-3">
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
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                              {reservation.car_name}
                            </h3>
                            <p className="text-gray-600 text-sm mb-2">{translateCategory(reservation.car_category)}</p>
                            
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
                              : reservation.business_status === "expired"
                              ? "bg-orange-100 text-orange-800"
                              : reservation.status === "cancelled"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {reservation.business_status === "pending" && "⏳ " + translate('admin_reservations.status.pending', 'En attente')}
                            {reservation.business_status === "accepted" && "✅ " + translate('admin_reservations.status.accepted', 'Acceptée')}
                            {reservation.business_status === "active" && "🚗 " + translate('admin_reservations.status.active', 'Active')}
                            {reservation.business_status === "completed" && "🏁 " + translate('admin_reservations.status.completed', 'Terminée')}
                            {reservation.business_status === "expired" && "💀 " + translate('admin_reservations.status.expired', 'Expirée')}
                            {reservation.status === "cancelled" && "🚫 " + translate('admin_reservations.status.cancelled', 'Annulée')}
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

                  <div className="grid grid-cols-1 gap-3 py-4 border-t border-b">
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

                    {reservation.business_status === "expired" && (
                      <div className="col-span-2">
                        <div className="flex items-center gap-1 text-sm font-medium text-orange-900 mb-1">
                          ⚠️ {translate('admin_reservations.messages.expired_reservation', 'Réservation expirée')}
                        </div>
                        <p className="text-sm text-orange-700 bg-orange-50 p-2 rounded border border-orange-200">
                          {translate('admin_reservations.messages.expired_description', 'Cette réservation n\'a pas été traitée à temps et est maintenant expirée.')}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-end sm:items-end gap-3 pt-4 w-full">
                    {reservation.status === "pending" && reservation.business_status !== "expired" && (
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => handleAcceptReservation(reservation)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm text-center"
                        >
                          {translate('admin_reservations.actions.accept', 'Accepter')}
                        </button>
                        <button
                          onClick={() => openRejectModal(reservation)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm text-center"
                        >
                          {translate('admin_reservations.actions.reject', 'Refuser')}
                        </button>
                      </div>
                    )}

                    {reservation.business_status === "expired" && (
                      <div className="text-xs text-orange-600 italic text-right w-full sm:w-auto">
                        {translate('admin_reservations.messages.expired_on', 'Expirée le')} {formatDateTime(reservation.pickup_date)}
                      </div>
                    )}

                    {(reservation.status !== "pending" && reservation.business_status !== "expired") && (
                      <div className="text-xs text-gray-500 italic text-right w-full sm:w-auto">
                        {translate('admin_reservations.reservation.status', 'Statut')}{' '}
                        {reservation.status === "accepted"
                          ? translate('admin_reservations.reservation.accepted_on', 'acceptée le')
                          : translate('admin_reservations.reservation.rejected_on', 'refusée le')}{' '}
                        {formatDateTime(reservation.updated_at || reservation.created_at)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <TableView reservations={filteredReservations} />
        )}
      </div>

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