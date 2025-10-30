// src/pages/AdminVehicleDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog } from "@headlessui/react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ArrowLeft, Calendar, Trash2 } from "lucide-react";

type CarRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean | null;
  created_at: string;
  updated_at: string;
  quantity: number;
  image_url: string | null;
  fuel?: string | null;
  seats?: number | null;
  transmission?: string | null;
};

type ReservationRow = {
  id: string;
  car_id: string;
  pickup_date: string;
  return_date: string;
  status: string;
  pickup_location: string;
  return_location: string;
  car_name: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
    email: string;
  } | null;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  car_category?: string;
  car_price?: number;
  car_image?: string | null;
  pickup_time?: string;
  return_time?: string;
  total_price?: number;
  date?: string;
  created_at?: string;
};

type Vehicle = {
  id: string;
  car_id: string;
  matricule: string;
  obd: string;
  date_obd: string;
  objet: string;
  status?: string;
  created_at: string;
};

export default function AdminVehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authLoading, adminLoading, isUserAdmin } = useAuth();
  
  const [vehicle, setVehicle] = useState<CarRow | null>(null);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTab, setActiveTab] = useState<'availability' | 'vehicles' | 'offers' | 'reservations' | 'calendar'>('availability');
  const [offers, setOffers] = useState<any[]>([]);
  const [isCreateOfferModalOpen, setIsCreateOfferModalOpen] = useState(false);
  const [isCreateVehicleModalOpen, setIsCreateVehicleModalOpen] = useState(false);
  const [newOffer, setNewOffer] = useState({ period: "", price: "" });
  const [newVehicle, setNewVehicle] = useState({
    matricule: "",
    obd: "",
    date_obd: format(new Date(), "yyyy-MM-dd"),
    objet: "",
    status: "available" as 'available' | 'reserved' | 'maintenance'
  });
  const [allReservations, setAllReservations] = useState<ReservationRow[]>([]);
  
  // Nouvelles variables pour le calendrier
  const [dates, setDates] = useState<string[]>([]);
  const [acceptedReservations, setAcceptedReservations] = useState<ReservationRow[]>([]);

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // 1. Charger le modèle de véhicule
        const { data: vData, error: vErr } = await supabase
          .from("cars")
          .select("*")
          .eq("id", id)
          .single();

        if (vErr) throw vErr;
        if (!mounted) return;
        
        setVehicle(vData as CarRow);

        // 2. Charger les véhicules individuels
        const { data: vehiclesData } = await supabase
          .from("vehicles")
          .select("*")
          .eq("car_id", id)
          .is("is_deleted", false)
          .order("matricule");

        setVehicles(vehiclesData || []);

        // 3. Charger TOUTES les réservations
        console.log("🔄 Chargement des réservations...");
        
        const { data: allReservationsData, error: reservationsError } = await supabase
          .from("reservations")
          .select(`
            *,
            profiles:user_id (
              full_name,
              email
            )
          `)
          .eq("car_id", id)
          .order("created_at", { ascending: false });

        if (reservationsError) {
          console.error("❌ Erreur avec jointure profiles:", reservationsError);
          
          const { data: simpleReservationsData } = await supabase
            .from("reservations")
            .select("*")
            .eq("car_id", id)
            .order("created_at", { ascending: false });
            
          console.log("✅ Réservations chargées (sans profiles):", simpleReservationsData?.length);
          setAllReservations(simpleReservationsData as ReservationRow[] || []);
        } else {
          console.log("✅ Réservations chargées (avec profiles):", allReservationsData?.length);
          
          const cleanedReservations = allReservationsData?.map(reservation => ({
            id: reservation.id,
            car_id: reservation.car_id,
            pickup_date: reservation.pickup_date,
            return_date: reservation.return_date,
            status: reservation.status,
            pickup_location: reservation.pickup_location,
            return_location: reservation.return_location,
            car_name: reservation.car_name,
            user_id: reservation.user_id,
            profiles: reservation.profiles && !('error' in reservation.profiles) 
              ? reservation.profiles 
              : null,
            guest_name: reservation.guest_name,
            guest_email: reservation.guest_email,
            guest_phone: reservation.guest_phone,
            car_category: reservation.car_category,
            car_price: reservation.car_price,
            car_image: reservation.car_image,
            pickup_time: reservation.pickup_time,
            return_time: reservation.return_time,
            total_price: reservation.total_price,
            date: reservation.date,
            created_at: reservation.created_at
          })) as ReservationRow[];
          
          setAllReservations(cleanedReservations || []);
        }
        
        // 4. Charger les réservations acceptées pour le calendrier
        const { data: acceptedReservationsData } = await supabase
          .from("reservations")
          .select("*")
          .eq("car_id", id)
          .eq("status", "accepted");

        setAcceptedReservations(acceptedReservationsData || []);
        setReservations(acceptedReservationsData || []);

        // 5. Charger les offres du véhicule
        await loadOffers();

        // 6. Générer les dates pour le calendrier (30 jours)
        const today = new Date();
        const nextDays = Array.from({ length: 30 }, (_, i) =>
          format(addDays(today, i), "yyyy-MM-dd")
        );
        setDates(nextDays);

      } catch (err: any) {
        console.error("Erreur load vehicle detail:", err);
        toast({ 
          title: "Erreur", 
          description: String(err.message || err), 
          variant: "destructive" 
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [id, toast]);

  const loadOffers = async () => {
    if (!id) return;
    
    const { data: offersData, error } = await supabase
      .from("offers")
      .select("*")
      .eq("car_id", id)
      .is("is_deleted", false)
      .order("price", { ascending: true });
    
    if (error) {
      console.error("Erreur chargement offres:", error);
      return;
    }
    
    setOffers(offersData || []);
  };

  // Fonctions pour le calendrier de disponibilité
  const isDateInReservation = (date: string, reservation: ReservationRow) => {
    const currentDate = new Date(date);
    const pickupDate = new Date(reservation.pickup_date);
    const returnDate = new Date(reservation.return_date);
    
    return currentDate >= pickupDate && currentDate <= returnDate;
  };

  const getReservedCountForDate = (date: string) => {
    return acceptedReservations
      .filter(r => isDateInReservation(date, r))
      .length;
  };

  const getDailyAvailability = (date: string) => {
    if (!vehicle) return 0;

    if (!vehicle.available) {
      return 0;
    }

    const reserved = getReservedCountForDate(date);
    return Math.max(0, vehicle.quantity - reserved);
  };

  // Fonction pour obtenir les informations du client
  const getClientInfo = (reservation: ReservationRow) => {
    if (reservation.profiles) {
      return {
        name: reservation.profiles.full_name || "Non renseigné",
        email: reservation.profiles.email,
        type: "Utilisateur enregistré"
      };
    }
    
    if (reservation.guest_name || reservation.guest_email) {
      return {
        name: reservation.guest_name || "Non renseigné",
        email: reservation.guest_email || "Non renseigné",
        type: "Invité"
      };
    }
    
    return {
      name: "Non spécifié",
      email: "Non spécifié",
      type: "Inconnu"
    };
  };

  const handleCreateVehicle = async () => {
    if (!newVehicle.matricule) {
      toast({
        title: "Champ manquant",
        description: "Le matricule est obligatoire.",
        variant: "destructive",
      });
      return;
    }
  
    setSaving(true);
    try {
      const { data: existingVehicle } = await supabase
        .from("vehicles")
        .select("matricule")
        .eq("matricule", newVehicle.matricule)
        .single();
  
      if (existingVehicle) {
        toast({
          title: "Matricule déjà existant",
          description: `Un véhicule avec le matricule "${newVehicle.matricule}" existe déjà.`,
          variant: "destructive",
        });
        return;
      }
  
      const { data, error } = await supabase
        .from("vehicles")
        .insert([{
          car_id: id,
          matricule: newVehicle.matricule,
          obd: newVehicle.obd || null,
          date_obd: newVehicle.date_obd,
          objet: newVehicle.objet || null,
          status: newVehicle.status,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();
  
      if (error) throw error;
  
      toast({
        title: "Véhicule créé",
        description: `Le véhicule ${newVehicle.matricule} a été ajouté.`,
      });
  
      setNewVehicle({
        matricule: "",
        obd: "",
        date_obd: format(new Date(), "yyyy-MM-dd"),
        objet: "",
        status: "available"
      });
  
      setIsCreateVehicleModalOpen(false);
      
      const { data: vehiclesData } = await supabase
        .from("vehicles")
        .select("*")
        .eq("car_id", id)
        .is("is_deleted", false)
        .order("matricule");
      setVehicles(vehiclesData || []);
  
      const { data: updatedVehicle } = await supabase
        .from("cars")
        .select("quantity")
        .eq("id", id)
        .single();
      
      if (updatedVehicle) {
        setVehicle(prev => prev ? { ...prev, quantity: updatedVehicle.quantity } : prev);
      }
  
    } catch (error: any) {
      console.error("Erreur création véhicule:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le véhicule.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Afficher un spinner pendant le chargement de l'authentification
  if (authLoading || adminLoading) {
    return (
      <LoadingSpinner message="Vérification des permissions administrateur..." />
    );
  }

  // Vérifier les droits admin
  if (!isUserAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accès refusé</h1>
          <p className="text-muted-foreground mb-6">
            Vous devez être administrateur pour accéder à cette page.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate("/admin/vehicles")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux véhicules
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Fonction pour déterminer le statut d'un véhicule
  const getVehicleStatus = (vehicleItem: Vehicle) => {
    const statusConfig = {
      available: { 
        text: 'Disponible', 
        color: 'bg-green-100 text-green-800 border border-green-200',
        icon: '✅'
      },
      reserved: { 
        text: 'Réservé', 
        color: 'bg-blue-100 text-blue-800 border border-blue-200',
        icon: '🚗'
      },
      maintenance: { 
        text: 'En Maintenance', 
        color: 'bg-orange-100 text-orange-800 border border-orange-200',
        icon: '🔧'
      }
    };

    return statusConfig[vehicleItem.status as keyof typeof statusConfig] || statusConfig.available;
  };

  // Fonction utilitaire pour obtenir le texte du statut
  const getStatusText = (status: string) => {
    const statusMap = {
      available: 'Disponible',
      reserved: 'Réservé', 
      maintenance: 'En Maintenance'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  // Compter les véhicules par statut
  const getVehicleStats = () => {
    const stats = {
      total: vehicles.length,
      available: vehicles.filter(v => v.status === 'available').length,
      reserved: vehicles.filter(v => v.status === 'reserved').length,
      maintenance: vehicles.filter(v => v.status === 'maintenance').length
    };
    return stats;
  };

  const handleDeleteVehicle = async (vehicleId: string, matricule: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir archiver le véhicule "${matricule}" ? Il ne sera plus visible mais restera dans la base de données.`)) {
      return;
    }
  
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq("id", vehicleId);
  
      if (error) throw error;
  
      toast({
        title: "Véhicule archivé",
        description: `Le véhicule ${matricule} a été archivé. Le stock a été mis à jour automatiquement.`,
      });
  
      // Recharger la liste des véhicules
      const { data: vehiclesData } = await supabase
        .from("vehicles")
        .select("*")
        .eq("car_id", id)
        .is("is_deleted", false)
        .order("matricule");
      setVehicles(vehiclesData || []);
  
      // Recharger les données du véhicule pour avoir la quantité mise à jour
      const { data: updatedVehicle } = await supabase
        .from("cars")
        .select("quantity")
        .eq("id", id)
        .single();
      
      if (updatedVehicle) {
        setVehicle(prev => prev ? { ...prev, quantity: updatedVehicle.quantity } : prev);
      }
  
    } catch (error: any) {
      console.error("Erreur archivage véhicule:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'archiver le véhicule.",
        variant: "destructive",
      });
    }
  };

  // Fonction pour changer le statut d'un véhicule
  const handleChangeVehicleStatus = async (vehicleId: string, newStatus: 'available' | 'reserved' | 'maintenance') => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", vehicleId);

      if (error) throw error;

      // Mettre à jour l'état local
      setVehicles(prev => 
        prev.map(vehicle => 
          vehicle.id === vehicleId 
            ? { ...vehicle, status: newStatus }
            : vehicle
        )
      );

      toast({
        title: "Statut mis à jour",
        description: `Le véhicule est maintenant ${getStatusText(newStatus).toLowerCase()}.`,
      });

    } catch (error: any) {
      console.error("Erreur changement statut:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de changer le statut.",
        variant: "destructive",
      });
    }
  };

  // Fonction pour créer une offre
  const handleCreateOffer = async () => {
    if (!newOffer.period || !newOffer.price) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs de l'offre.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("offers")
        .insert([{
          car_id: id,
          period: newOffer.period,
          price: Number(newOffer.price),
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Offre créée",
        description: `L'offre a été ajoutée avec succès.`,
      });

      setNewOffer({ period: "", price: "" });
      setIsCreateOfferModalOpen(false);
      await loadOffers();

    } catch (error: any) {
      console.error("Erreur création offre:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'offre.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Fonction pour supprimer une offre
  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir archiver cette offre ?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("offers")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq("id", offerId);

      if (error) throw error;

      toast({
        title: "Offre archivée",
        description: "L'offre a été archivée avec succès.",
      });

      await loadOffers();
    } catch (error: any) {
      console.error("Erreur archivage offre:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'archiver l'offre.",
        variant: "destructive",
      });
    }
  };

  // RETOURS CONDITIONNELS FINAUX
  if (!id) { 
    return <div><main className="container mx-auto p-6">ID manquant</main><Footer/></div>;
  } 
  
  if (loading) { 
    return <div><main className="container mx-auto p-6">Chargement...</main><Footer/></div>;
  }
  
  if (!vehicle) { 
    return <div><main className="container mx-auto p-6">Véhicule introuvable</main><Footer/></div>;
  }

  // Le reste du rendu JSX
  const stats = getVehicleStats();

  return (
    <>
      <main className="container mx-auto p-6">
        {/* En-tête du véhicule */}
        <div className="flex items-start gap-6 mb-6">
          <div className="w-48">
            {vehicle.image_url ? (
              <img src={vehicle.image_url} alt={vehicle.name} className="w-full h-auto object-cover rounded-lg" />
            ) : (
              <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">No image</div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold">{vehicle.name}</h1>
            <p className="text-muted-foreground mb-2">{vehicle.category}</p>
            <p className="mb-2">Prix: <strong>{vehicle.price} / jour</strong></p>

            {/* Stock affiché simplement sans input */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Stock total</label>
              <div className="flex items-center gap-2">
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium min-w-20">
                  {vehicle.quantity}
                </div>
                <span className="text-sm text-gray-500">
                  (Synchronisé automatiquement: {vehicles.length} véhicule(s) actif(s))
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => navigate("/admin/vehicles")}>Retour</Button>
            </div>
          </div>
        </div>

        <hr className="my-4" />

        {/* Onglets */}
        <div className="border-b mb-6">
          <div className="flex space-x-8">
            <button
              className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'availability'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('availability')}
            >
              Disponibilité aujourd'hui
            </button>
            <button
              className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'vehicles'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('vehicles')}
            >
              Véhicules individuels ({vehicles.length})
            </button>
            <button
              className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'offers'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('offers')}
            >
              Offres spéciales ({offers.length})
            </button>
            <button
              className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'reservations'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('reservations')}
            >
              Toutes les réservations ({allReservations.length})
            </button>
            <button
              className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'calendar'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('calendar')}
            >
              Calendrier (30j)
            </button>
          </div>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'availability' && (
          <>
            <h2 className="text-xl font-semibold mb-3">Disponibilité aujourd'hui</h2>
            
            {/* Cartes de statut */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Véhicules disponibles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {vehicles.filter(v => v.status === 'available').length}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Prêts à être réservés
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Véhicules réservés</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {vehicles.filter(v => v.status === 'reserved').length}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Actuellement en location
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">En maintenance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    {vehicles.filter(v => v.status === 'maintenance').length}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Indisponibles temporairement
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {activeTab === 'vehicles' && (
          <>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold">Véhicules individuels</h2>
              <Button onClick={() => setIsCreateVehicleModalOpen(true)}>
                + Ajouter un véhicule
              </Button>
            </div>
            
            {/* Statistiques rapides */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total véhicules</div>
              </div>
              <div className="bg-white p-4 rounded-lg border shadow-sm border-green-200">
                <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                <div className="text-sm text-gray-600">Disponibles</div>
                <div className="text-xs text-green-600 mt-1">✅ Prêts à être réservés</div>
              </div>
              <div className="bg-white p-4 rounded-lg border shadow-sm border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{stats.reserved}</div>
                <div className="text-sm text-gray-600">Réservés</div>
                <div className="text-xs text-blue-600 mt-1">🚗 En location</div>
              </div>
              <div className="bg-white p-4 rounded-lg border shadow-sm border-orange-200">
                <div className="text-2xl font-bold text-orange-600">{stats.maintenance}</div>
                <div className="text-sm text-gray-600">En maintenance</div>
                <div className="text-xs text-orange-600 mt-1">🔧 Indisponibles</div>
              </div>
            </div>

            {/* Tableau des véhicules */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-left font-semibold">Matricule</th>
                    <th className="p-4 text-left font-semibold">OBD</th>
                    <th className="p-4 text-left font-semibold">Date OBD</th>
                    <th className="p-4 text-left font-semibold">Objet</th>
                    <th className="p-4 text-left font-semibold">Statut</th>
                    <th className="p-4 text-left font-semibold">Changer statut</th>
                    <th className="p-4 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicleItem) => {
                    const statusInfo = getVehicleStatus(vehicleItem);
                    
                    return (
                      <tr key={vehicleItem.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-mono font-semibold">{vehicleItem.matricule}</td>
                        <td className="p-4">{vehicleItem.obd || '-'}</td>
                        <td className="p-4">
                          {vehicleItem.date_obd ? format(new Date(vehicleItem.date_obd), "dd/MM/yyyy") : '-'}
                        </td>
                        <td className="p-4">{vehicleItem.objet || '-'}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.icon} {statusInfo.text}
                          </span>
                        </td>
                        <td className="p-4">
                          <select 
                            value={vehicleItem.status}
                            onChange={(e) => handleChangeVehicleStatus(vehicleItem.id, e.target.value as any)}
                            className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="available">Disponible</option>
                            <option value="reserved">Réservé</option>
                            <option value="maintenance">Maintenance</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteVehicle(vehicleItem.id, vehicleItem.matricule)}
                          >
                            Supprimer
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {vehicles.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-4">🚗</div>
                  <p>Aucun véhicule trouvé pour ce modèle</p>
                  <Button 
                    onClick={() => setIsCreateVehicleModalOpen(true)}
                    className="mt-4"
                  >
                    Ajouter le premier véhicule
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'offers' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Offres spéciales</h2>
              <Button onClick={() => setIsCreateOfferModalOpen(true)}>
                + Ajouter une offre
              </Button>
            </div>

            {offers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <div className="text-4xl mb-4">🎯</div>
                  <p className="text-muted-foreground mb-4">Aucune offre spéciale pour ce modèle</p>
                  <Button onClick={() => setIsCreateOfferModalOpen(true)}>
                    Créer la première offre
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {offers.map((offer) => (
                  <Card key={offer.id} className="relative group hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        {offer.period}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteOffer(offer.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-primary">
                        {offer.price} MAD
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Prix spécial pour {offer.period.toLowerCase()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Contenu de l'onglet réservations */}
        {activeTab === 'reservations' && (
          <>
            <h2 className="text-xl font-semibold mb-3">Toutes les réservations</h2>
            
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-left">ID</th>
                    <th className="p-4 text-left">Client</th>
                    <th className="p-4 text-left">Période</th>
                    <th className="p-4 text-left">Statut</th>
                    <th className="p-4 text-left">Lieux</th>
                  </tr>
                </thead>
                <tbody>
                  {allReservations.map((reservation) => {
                    const clientInfo = getClientInfo(reservation);
                    
                    return (
                      <tr key={reservation.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-mono text-sm">{reservation.id.slice(0, 8)}...</td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="font-medium">{clientInfo.name}</div>
                            <div className="text-sm text-gray-600">{clientInfo.email}</div>
                            <div className="text-xs text-gray-500">{clientInfo.type}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          {format(new Date(reservation.pickup_date), "dd/MM/yyyy")} - {" "}
                          {format(new Date(reservation.return_date), "dd/MM/yyyy")}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            reservation.status === 'accepted' 
                              ? 'bg-green-100 text-green-800' 
                              : reservation.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {reservation.status === 'accepted' ? '✅ Acceptée' : 
                            reservation.status === 'pending' ? '⏳ En attente' : 
                            '❌ Refusée'}
                          </span>
                        </td>
                        <td className="p-4 text-sm">
                          {reservation.pickup_location} → {reservation.return_location}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {allReservations.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  Aucune réservation pour ce véhicule
                </div>
              )}
            </div>
          </>
        )}

        {/* Nouvel onglet Calendrier */}
// Section du calendrier modifiée
{activeTab === 'calendar' && (
  <>
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-semibold">Calendrier de disponibilité - 30 jours</h2>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Calendar className="h-4 w-4" />
        <span>Disponibilité sur {dates.length} jours</span>
      </div>
    </div>

    {/* Timeline de disponibilité améliorée */}
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Calendrier des réservations
        </h4>
        <div className="text-sm text-gray-500">
          Stock total: {vehicle.quantity} véhicules
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {dates.map((date) => {
            const available = getDailyAvailability(date);
            const reserved = getReservedCountForDate(date);
            const isToday = date === format(new Date(), "yyyy-MM-dd");
            const isFullyBooked = available === 0;
            const isPartiallyAvailable = available > 0 && available < vehicle.quantity;
            const isFullyAvailable = available === vehicle.quantity;
            
            return (
              <div
                key={date}
                className={`flex flex-col items-center p-2 rounded-lg border text-xs font-medium min-w-12 transition-all duration-200 ${
                  isFullyBooked 
                    ? "bg-red-50 border-red-200 text-red-700" 
                    : isPartiallyAvailable
                    ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                    : "bg-green-50 border-green-200 text-green-700"
                } ${isToday ? "ring-2 ring-blue-500 ring-opacity-50 transform scale-105" : ""}`}
                title={`${format(new Date(date), "dd/MM/yyyy")}
${available} véhicule(s) disponible(s)
${reserved} véhicule(s) réservé(s)
Stock total: ${vehicle.quantity} véhicules`}
              >
                <span className="font-semibold">{format(new Date(date), "dd")}</span>
                <span className="text-[10px] opacity-70">{format(new Date(date), "MMM")}</span>
                <div className="mt-1 flex flex-col items-center space-y-0.5">
                  {/* Indicateur visuel simple */}
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-bold ${
                      isFullyBooked ? "text-red-600" :
                      isPartiallyAvailable ? "text-yellow-600" :
                      "text-green-600"
                    }`}>
                      {available}
                    </span>
                    <span className="text-[10px] text-gray-500">dispo</span>
                  </div>
                  
                  {/* Barre de progression visuelle */}
                  <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        isFullyBooked ? "bg-red-400" :
                        isPartiallyAvailable ? "bg-yellow-400" :
                        "bg-green-400"
                      }`}
                      style={{ 
                        width: `${vehicle.quantity > 0 ? (available / vehicle.quantity) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Légende simplifiée */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
          <span>Disponible ({vehicle.quantity} véhicules)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
          <span>Partiellement disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
          <span>Complet (0 disponible)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 ring-2 ring-blue-500 ring-opacity-50 rounded"></div>
          <span>Aujourd'hui</span>
        </div>
      </div>

      {/* Explication du système */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800 text-center">
          <strong>Comment lire le calendrier :</strong> Le nombre indique les véhicules disponibles sur le stock total de {vehicle.quantity}. 
          La barre montre le taux de disponibilité.
        </p>
      </div>
    </div>

    {/* Statistiques de réservation */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Véhicules disponibles aujourd'hui</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {getDailyAvailability(format(new Date(), "yyyy-MM-dd"))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            sur {vehicle.quantity} au total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Réservations en cours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {acceptedReservations.length}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Réservations acceptées
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Taux d'occupation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {vehicle.quantity > 0 
              ? `${Math.round((acceptedReservations.length / vehicle.quantity) * 100)}%`
              : '0%'
            }
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Moyenne globale
          </p>
        </CardContent>
      </Card>
    </div>
  </>
)}

        {/* Modal de création de véhicule individuel */}
        <Dialog open={isCreateVehicleModalOpen} onClose={() => setIsCreateVehicleModalOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md">
              <Dialog.Title className="text-lg font-semibold mb-4">
                Ajouter un véhicule
              </Dialog.Title>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="matricule">Matricule *</Label>
                  <Input
                    id="matricule"
                    value={newVehicle.matricule}
                    onChange={(e) => setNewVehicle({...newVehicle, matricule: e.target.value})}
                    placeholder="Ex: ABC-123"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="obd">Code OBD</Label>
                  <Input
                    id="obd"
                    value={newVehicle.obd}
                    onChange={(e) => setNewVehicle({...newVehicle, obd: e.target.value})}
                    placeholder="Code OBD"
                  />
                </div>

                <div>
                  <Label htmlFor="date_obd">Date OBD</Label>
                  <Input
                    id="date_obd"
                    type="date"
                    value={newVehicle.date_obd}
                    onChange={(e) => setNewVehicle({...newVehicle, date_obd: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="objet">Objet</Label>
                  <Input
                    id="objet"
                    value={newVehicle.objet}
                    onChange={(e) => setNewVehicle({...newVehicle, objet: e.target.value})}
                    placeholder="Informations supplémentaires"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => setIsCreateVehicleModalOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateVehicle} disabled={saving}>
                  {saving ? "Création..." : "Ajouter le véhicule"}
                </Button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Modal de création d'offre */}
        <Dialog open={isCreateOfferModalOpen} onClose={() => setIsCreateOfferModalOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md">
              <Dialog.Title className="text-lg font-semibold mb-4">
                Ajouter une offre spéciale
              </Dialog.Title>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="period">Période *</Label>
                  <Input
                    id="period"
                    value={newOffer.period}
                    onChange={(e) => setNewOffer({...newOffer, period: e.target.value})}
                    placeholder="Ex: 3 jours, 1 semaine, 1 mois..."
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="price">Prix (MAD) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={newOffer.price}
                    onChange={(e) => setNewOffer({...newOffer, price: e.target.value})}
                    placeholder="Prix pour la période"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => setIsCreateOfferModalOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateOffer} disabled={saving}>
                  {saving ? "Création..." : "Créer l'offre"}
                </Button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </main>
      <Footer />
    </>
  );
}