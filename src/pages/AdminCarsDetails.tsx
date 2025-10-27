// src/pages/AdminVehicleDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog } from "@headlessui/react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ArrowLeft, Plus, Car, Calendar, Tag, Users } from "lucide-react";

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
  const [stockEdit, setStockEdit] = useState<number | "">("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTab, setActiveTab] = useState<'availability' | 'vehicles' | 'offers' | 'reservations'>('availability');
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
        setStockEdit((vData as CarRow).quantity ?? "");

        // 2. Charger les véhicules individuels
        const { data: vehiclesData } = await supabase
          .from("vehicles")
          .select("*")
          .eq("car_id", id)
          .is("is_deleted", false)
          .order("matricule");

        setVehicles(vehiclesData || []);

        // 3. Charger TOUTES les réservations - APPROCHE CORRIGÉE
        console.log("🔄 Chargement des réservations...");
        
        // Option 1: Charger sans la relation profiles d'abord
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
          
          // Option 2: Charger sans la relation si elle échoue
          const { data: simpleReservationsData } = await supabase
            .from("reservations")
            .select("*")
            .eq("car_id", id)
            .order("created_at", { ascending: false });
            
          console.log("✅ Réservations chargées (sans profiles):", simpleReservationsData?.length);
          setAllReservations(simpleReservationsData as ReservationRow[] || []);
        } else {
          console.log("✅ Réservations chargées (avec profiles):", allReservationsData?.length);
          
          // Nettoyer les données pour s'assurer qu'elles correspondent au type
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
        
        // 4. Charger les réservations acceptées
        const { data: acceptedReservations } = await supabase
          .from("reservations")
          .select("*")
          .eq("car_id", id)
          .eq("status", "accepted");

        setReservations(acceptedReservations || []);

        // 5. Charger les offres du véhicule
        await loadOffers();

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

  // Fonction pour obtenir les statistiques de réservations
  const getReservationStats = () => {
    const stats = {
      total: allReservations.length,
      accepted: allReservations.filter(r => r.status === 'accepted').length,
      pending: allReservations.filter(r => r.status === 'pending').length,
      refused: allReservations.filter(r => r.status === 'refused').length
    };
    return stats;
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
        setStockEdit(updatedVehicle.quantity);
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accès refusé</h1>
          <p className="text-muted-foreground mb-6">
            Vous devez être administrateur pour accéder à cette page.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
        setStockEdit(updatedVehicle.quantity);
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
    return <div><main className="container mx-auto p-4">ID manquant</main><Footer/></div>;
  } 
  
  if (loading) { 
    return <div><main className="container mx-auto p-4">Chargement...</main><Footer/></div>;
  }
  
  if (!vehicle) { 
    return <div><main className="container mx-auto p-4">Véhicule introuvable</main><Footer/></div>;
  }

  // Le reste du rendu JSX
  const stats = getVehicleStats();

  return (
    <>
      <main className="container mx-auto p-4">
        {/* En-tête du véhicule - Version mobile */}
        <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
          <div className="w-full sm:w-32 flex-shrink-0">
            {vehicle.image_url ? (
              <img 
                src={vehicle.image_url} 
                alt={vehicle.name} 
                className="w-full h-32 sm:h-24 object-cover rounded-lg" 
              />
            ) : (
              <div className="w-full h-32 sm:h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                <Car className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-xl font-bold truncate">{vehicle.name}</h1>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/admin/vehicles")}
                className="flex-shrink-0 ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-muted-foreground text-sm mb-2">{vehicle.category}</p>
            <p className="mb-2 text-sm">Prix: <strong>{vehicle.price} / jour</strong></p>

            <div className="mb-3">
              <label className="block text-xs text-gray-600 mb-1">Stock total</label>
              <div className="flex items-center gap-2">
                <Input
                  value={stockEdit}
                  onChange={(e) => setStockEdit(e.target.value === "" ? "" : Number(e.target.value))}
                  type="number"
                  min={0}
                  className="w-24 text-sm"
                  disabled
                />
                <span className="text-xs text-gray-500">
                  ({vehicles.length} véhicule(s) actif(s))
                </span>
              </div>
            </div>
          </div>
        </div>

        <hr className="my-4" />

        {/* Onglets - Version mobile avec scroll horizontal */}
        <div className="border-b mb-6 overflow-x-auto">
          <div className="flex space-x-4 min-w-max">
            <button
              className={`py-3 px-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'availability'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('availability')}
            >
              <Calendar className="h-4 w-4" />
              Disponibilité
            </button>
            <button
              className={`py-3 px-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'vehicles'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('vehicles')}
            >
              <Car className="h-4 w-4" />
              Véhicules ({vehicles.length})
            </button>
            <button
              className={`py-3 px-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'offers'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('offers')}
            >
              <Tag className="h-4 w-4" />
              Offres ({offers.length})
            </button>
            <button
              className={`py-3 px-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'reservations'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('reservations')}
            >
              <Users className="h-4 w-4" />
              Réservations ({allReservations.length})
            </button>
          </div>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'availability' && (
          <>
            <h2 className="text-lg font-semibold mb-4">Disponibilité en temps réel</h2>
            
            {/* Cartes de statut - Version mobile */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Card className="text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Disponibles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-green-600">
                    {vehicles.filter(v => v.status === 'available').length}
                  </div>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Réservés</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-blue-600">
                    {vehicles.filter(v => v.status === 'reserved').length}
                  </div>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Maintenance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-orange-600">
                    {vehicles.filter(v => v.status === 'maintenance').length}
                  </div>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-gray-600">
                    {vehicles.length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Statistiques des réservations - Version mobile */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Statistiques des réservations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold">{getReservationStats().total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{getReservationStats().accepted}</div>
                    <div className="text-xs text-muted-foreground">Acceptées</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">{getReservationStats().pending}</div>
                    <div className="text-xs text-muted-foreground">En attente</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{getReservationStats().refused}</div>
                    <div className="text-xs text-muted-foreground">Refusées</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start">
                <div className="text-blue-600 mr-2 mt-0.5">💡</div>
                <div>
                  <h3 className="font-semibold text-blue-800 text-sm">Nouveau système de disponibilité</h3>
                  <p className="text-blue-700 text-xs mt-1">
                    La disponibilité est maintenant gérée par le statut de chaque véhicule individuel.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'vehicles' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Véhicules individuels</h2>
              <Button 
                onClick={() => setIsCreateVehicleModalOpen(true)}
                size="sm"
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Ajouter</span>
              </Button>
            </div>
            
            {/* Statistiques rapides - Version mobile */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white p-3 rounded-lg border shadow-sm">
                <div className="text-lg font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
              <div className="bg-white p-3 rounded-lg border shadow-sm border-green-200">
                <div className="text-lg font-bold text-green-600">{stats.available}</div>
                <div className="text-xs text-gray-600">Disponibles</div>
              </div>
              <div className="bg-white p-3 rounded-lg border shadow-sm border-blue-200">
                <div className="text-lg font-bold text-blue-600">{stats.reserved}</div>
                <div className="text-xs text-gray-600">Réservés</div>
              </div>
              <div className="bg-white p-3 rounded-lg border shadow-sm border-orange-200">
                <div className="text-lg font-bold text-orange-600">{stats.maintenance}</div>
                <div className="text-xs text-gray-600">Maintenance</div>
              </div>
            </div>

            {/* Liste des véhicules - Version mobile */}
            <div className="space-y-3">
              {vehicles.map((vehicleItem) => {
                const statusInfo = getVehicleStatus(vehicleItem);
                
                return (
                  <Card key={vehicleItem.id} className="p-4">
                    <div className="space-y-3">
                      {/* En-tête avec matricule et statut */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-mono font-semibold text-lg">{vehicleItem.matricule}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.text}
                          </span>
                        </div>
                        <select 
                          value={vehicleItem.status}
                          onChange={(e) => handleChangeVehicleStatus(vehicleItem.id, e.target.value as any)}
                          className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="available">Disponible</option>
                          <option value="reserved">Réservé</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>

                      {/* Détails */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">OBD:</span>
                          <div className="font-medium">{vehicleItem.obd || '-'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Date OBD:</span>
                          <div className="font-medium">
                            {vehicleItem.date_obd ? format(new Date(vehicleItem.date_obd), "dd/MM/yy") : '-'}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">Objet:</span>
                          <div className="font-medium truncate">{vehicleItem.objet || '-'}</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end pt-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteVehicle(vehicleItem.id, vehicleItem.matricule)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {vehicles.length === 0 && (
                <Card className="p-8 text-center">
                  <div className="text-4xl mb-4">🚗</div>
                  <p className="text-muted-foreground mb-4">Aucun véhicule trouvé pour ce modèle</p>
                  <Button 
                    onClick={() => setIsCreateVehicleModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter le premier véhicule
                  </Button>
                </Card>
              )}
            </div>
          </>
        )}

        {activeTab === 'offers' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Offres spéciales</h2>
              <Button 
                onClick={() => setIsCreateOfferModalOpen(true)}
                size="sm"
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Ajouter</span>
              </Button>
            </div>

            {offers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <div className="text-4xl mb-4">🎯</div>
                  <p className="text-muted-foreground mb-4">Aucune offre spéciale pour ce modèle</p>
                  <Button 
                    onClick={() => setIsCreateOfferModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Créer la première offre
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {offers.map((offer) => (
                  <Card key={offer.id} className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{offer.period}</h3>
                        <p className="text-2xl font-bold text-primary">
                          {offer.price} MAD
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteOffer(offer.id)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Contenu de l'onglet réservations - Version mobile */}
        {activeTab === 'reservations' && (
          <>
            <h2 className="text-lg font-semibold mb-4">Toutes les réservations</h2>
            
            <div className="space-y-3">
              {allReservations.map((reservation) => {
                const clientInfo = getClientInfo(reservation);
                
                return (
                  <Card key={reservation.id} className="p-4">
                    <div className="space-y-3">
                      {/* En-tête avec ID et statut */}
                      <div className="flex justify-between items-start">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {reservation.id.slice(0, 8)}...
                        </code>
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
                      </div>

                      {/* Informations client */}
                      <div>
                        <h3 className="font-medium text-sm">{clientInfo.name}</h3>
                        <p className="text-xs text-gray-600">{clientInfo.email}</p>
                        <p className="text-xs text-gray-500">{clientInfo.type}</p>
                      </div>

                      {/* Période */}
                      <div className="text-sm">
                        <span className="text-gray-600">Période:</span>
                        <div className="font-medium">
                          {format(new Date(reservation.pickup_date), "dd/MM/yy")} - {" "}
                          {format(new Date(reservation.return_date), "dd/MM/yy")}
                        </div>
                      </div>

                      {/* Lieux */}
                      <div className="text-sm">
                        <span className="text-gray-600">Trajet:</span>
                        <div className="font-medium">
                          {reservation.pickup_location} → {reservation.return_location}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
              
              {allReservations.length === 0 && (
                <Card className="p-8 text-center">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-muted-foreground">Aucune réservation pour ce véhicule</p>
                </Card>
              )}
            </div>
          </>
        )}

        {/* Modal de création de véhicule individuel */}
        <Dialog open={isCreateVehicleModalOpen} onClose={() => setIsCreateVehicleModalOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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

              <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => setIsCreateVehicleModalOpen(false)} className="flex-1 sm:flex-none">
                  Annuler
                </Button>
                <Button onClick={handleCreateVehicle} disabled={saving} className="flex-1 sm:flex-none">
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
            <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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

              <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => setIsCreateOfferModalOpen(false)} className="flex-1 sm:flex-none">
                  Annuler
                </Button>
                <Button onClick={handleCreateOffer} disabled={saving} className="flex-1 sm:flex-none">
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