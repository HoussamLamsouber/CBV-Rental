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
import { ArrowLeft } from "lucide-react";

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
};

type AvailabilityRow = {
  id: string;
  car_id: string;
  date: string;
  available_quantity: number;
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

  const [vehicle, setVehicle] = useState<CarRow | null>(null);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [overrides, setOverrides] = useState<Record<string, number | "">>({});
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stockEdit, setStockEdit] = useState<number | "">("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTab, setActiveTab] = useState<'availability' | 'vehicles' | 'offers'>('availability');
  const [offers, setOffers] = useState<any[]>([]);
  const [isCreateOfferModalOpen, setIsCreateOfferModalOpen] = useState(false);
  const [newOffer, setNewOffer] = useState({
    period: "",
    price: ""
  });
  const { authLoading, isAuthenticated } = useAuth();
  const [accessDenied, setAccessDenied] = useState(false);


  // Afficher la page d'erreur si accès refusé
  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accès refusé</h1>
          <p className="text-muted-foreground mb-6">
            Vous devez être en mode administrateur pour accéder à cette page.
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

  const loadOffers = async () => {
    if (!id) return;
    
    const { data: offersData, error } = await supabase
      .from("offers")
      .select("*")
      .eq("car_id", id)
      .is("is_deleted", false) // ✅ N'afficher que les offres non supprimées
      .order("price", { ascending: true });
    
    if (error) {
      console.error("Erreur chargement offres:", error);
      return;
    }
    
    setOffers(offersData || []);
  };

  // États pour la création de véhicules individuels
  const [isCreateVehicleModalOpen, setIsCreateVehicleModalOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    matricule: "",
    obd: "",
    date_obd: format(new Date(), "yyyy-MM-dd"),
    objet: ""
  });

  // Générer les dates une seule fois
  useEffect(() => {
    const today = new Date();
    const nextDays = Array.from({ length: 30 }, (_, i) =>
      format(addDays(today, i), "yyyy-MM-dd")
    );
    setDates(nextDays);
  }, []);

  // Charger toutes les données en une seule fois
  useEffect(() => {
    if (!id || dates.length === 0) return;

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

        // 3. Charger TOUTES les réservations pour ce véhicule
        const { data: reservationsData } = await supabase
          .from("reservations")
          .select("*")
          .eq("car_id", id)
          .eq("status", "active");

        setReservations(reservationsData || []);

        // 4. Charger les overrides (vehicle_availabilities)
        const { data: oData } = await supabase
          .from("vehicle_availabilities")
          .select("*")
          .eq("car_id", id)
          .in("date", dates);

        const mapOverrides: Record<string, number | ""> = {};
        (oData || []).forEach((o: AvailabilityRow) => {
          mapOverrides[o.date] = o.available_quantity;
        });

        // 5. Charger les offres du véhicule
        await loadOffers();
        
        // Initialiser les dates manquantes
        dates.forEach(d => {
          if (mapOverrides[d] === undefined) mapOverrides[d] = "";
        });

        setOverrides(mapOverrides);

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
  }, [id, dates, toast]);

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

      // Réinitialiser le formulaire
      setNewOffer({
        period: "",
        price: ""
      });

      setIsCreateOfferModalOpen(false);
      await loadOffers(); // Recharger la liste des offres

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

  // Fonction pour supprimer une offre (soft delete)
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

      await loadOffers(); // Recharger la liste
    } catch (error: any) {
      console.error("Erreur archivage offre:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'archiver l'offre.",
        variant: "destructive",
      });
    }
  };

  // Fonction pour déterminer si une date est dans une période de réservation
  const isDateInReservation = (date: string, reservation: ReservationRow) => {
    const reservationDate = new Date(date);
    const pickupDate = new Date(reservation.pickup_date);
    const returnDate = new Date(reservation.return_date);
    
    return reservationDate >= pickupDate && reservationDate <= returnDate;
  };

  // Calculer les réservations par date
  const getReservedForDate = (date: string) => {
    return reservations
      .filter(r => isDateInReservation(date, r))
      .length;
  };

  const getAvailabilityForDate = (date: string) => {
    const override = overrides[date];
    if (override !== undefined && override !== "" && override !== null) {
      return Number(override);
    }
    
    const base = vehicle?.quantity ?? 0;
    const reserved = getReservedForDate(date);
    return Math.max(0, base - reserved);
  };

  const handleOverrideChange = (date: string, value: string) => {
    const parsed = value === "" ? "" : Number(value);
    setOverrides(prev => ({ ...prev, [date]: parsed }));
  };

  const handleSave = async () => {
    if (!id || !vehicle) return;
    setSaving(true);
    try {
      // 1) Upsert les overrides (garder cette partie)
      const toUpsert: any[] = [];
      const toDelete: string[] = [];
      
      for (const d of dates) {
        const val = overrides[d];
        if (val === "" || val === null || val === undefined) {
          toDelete.push(d);
        } else {
          toUpsert.push({
            car_id: id,
            date: d,
            available_quantity: Number(val),
          });
        }
      }
  
      if (toUpsert.length > 0) {
        const { error: upErr } = await supabase
          .from("vehicle_availabilities")
          .upsert(toUpsert, { onConflict: "car_id,date" });
        if (upErr) throw upErr;
      }
  
      for (const d of toDelete) {
        const { error: delErr } = await supabase
          .from("vehicle_availabilities")
          .delete()
          .match({ car_id: id, date: d });
        if (delErr) {
          console.warn("delete override error:", delErr);
        }
      }
  
      toast({ 
        title: "Sauvegardé", 
        description: "Disponibilités mises à jour." 
      });
    } catch (err: any) {
      console.error("Erreur save overrides:", err);
      toast({ 
        title: "Erreur", 
        description: String(err.message || err), 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  // CORRECTION : Fonction pour créer un véhicule individuel (table vehicles)
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
      // Vérifier si le matricule existe déjà
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
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();
  
      if (error) throw error;
  
      toast({
        title: "Véhicule créé",
        description: `Le véhicule ${newVehicle.matricule} a été ajouté. Le stock a été mis à jour automatiquement.`,
      });
  
      // Réinitialiser le formulaire
      setNewVehicle({
        matricule: "",
        obd: "",
        date_obd: format(new Date(), "yyyy-MM-dd"),
        objet: ""
      });
  
      setIsCreateVehicleModalOpen(false);
      
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

  // Déterminer le statut d'un véhicule individuel
  const getVehicleStatus = (vehicleItem: Vehicle) => {
    // Vérifier si le véhicule est en maintenance
    if (vehicleItem.status === 'maintenance') {
      return { 
        status: 'maintenance', 
        text: 'Maintenance', 
        color: 'bg-orange-100 text-orange-800' 
      };
    }

    // Vérifier si le véhicule est réservé
    const today = new Date().toISOString().split('T')[0];
    const isReserved = reservations.some(reservation => {
      const isActive = reservation.pickup_date <= today && reservation.return_date >= today;
      return isActive;
    });

    if (isReserved) {
      return { 
        status: 'rented', 
        text: 'Réservé', 
        color: 'bg-blue-100 text-blue-800' 
      };
    }

    return { 
      status: 'available', 
      text: 'Disponible', 
      color: 'bg-green-100 text-green-800' 
    };
  };

  // Compter les véhicules par statut
  const getVehicleStats = () => {
    const stats = {
      total: vehicles.length,
      available: 0,
      rented: 0,
      maintenance: 0
    };

    vehicles.forEach(vehicle => {
      const status = getVehicleStatus(vehicle).status;
      if (status === 'available') stats.available++;
      if (status === 'rented') stats.rented++;
      if (status === 'maintenance') stats.maintenance++;
    });

    return stats;
  };

  if (!id) return <div><main className="container mx-auto p-6">ID manquant</main><Footer/></div>;
  if (loading) return <div><main className="container mx-auto p-6">Chargement...</main><Footer/></div>;
  if (!vehicle) return <div><main className="container mx-auto p-6">Véhicule introuvable</main><Footer/></div>;

  const stats = getVehicleStats();

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

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Stock total</label>
              <div className="flex items-center gap-2">
                <Input
                  value={stockEdit}
                  onChange={(e) => setStockEdit(e.target.value === "" ? "" : Number(e.target.value))}
                  type="number"
                  min={0}
                  className="w-40"
                  disabled
                />
                <span className="text-sm text-gray-500">
                  (Synchronisé automatiquement: {vehicles.length} véhicule(s) actif(s))
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => navigate("/admin/vehicles")}>Retour</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Enregistrement..." : "Sauvegarder modifications"}
              </Button>
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
            Disponibilités par date
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
        </div>
      </div>

        {/* Contenu des onglets */}
        {activeTab === 'availability' && (
          <>
            <h2 className="text-xl font-semibold mb-3">Disponibilités (30 jours)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Saisis une valeur pour forcer la disponibilité ce jour-là (laisser vide pour utiliser stock - réservations).
            </p>

            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="p-2 border text-left">Date</th>
                    <th className="p-2 border text-left">Réservations actives</th>
                    <th className="p-2 border text-left">Override (disponible)</th>
                    <th className="p-2 border text-left">Calcul (affiché)</th>
                  </tr>
                </thead>
                <tbody>
                  {dates.map(d => {
                    const reserved = getReservedForDate(d);
                    const override = overrides[d];
                    const calc = getAvailabilityForDate(d);
                    return (
                      <tr key={d}>
                        <td className="p-2 border">{format(new Date(d), "dd/MM/yyyy (EEE)")}</td>
                        <td className="p-2 border">{reserved}</td>
                        <td className="p-2 border">
                          <Input
                            type="number"
                            min={0}
                            className="w-24"
                            value={override === "" ? "" : String(override)}
                            onChange={(e) => handleOverrideChange(d, e.target.value)}
                          />
                        </td>
                        <td className="p-2 border font-semibold">{calc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                <div className="text-sm text-gray-600">Disponibles</div>
              </div>
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{stats.rented}</div>
                <div className="text-sm text-gray-600">Réservés</div>
              </div>
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="text-2xl font-bold text-orange-600">{stats.maintenance}</div>
                <div className="text-sm text-gray-600">En maintenance</div>
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
                    <th className="p-4 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicleItem) => {
                    const statusInfo = getVehicleStatus(vehicleItem);
                    
                    return (
                      <tr key={vehicleItem.id} className="border-b">
                        <td className="p-4 font-mono font-semibold">{vehicleItem.matricule}</td>
                        <td className="p-4">{vehicleItem.obd}</td>
                        <td className="p-4">
                          {format(new Date(vehicleItem.date_obd), "dd/MM/yyyy")}
                        </td>
                        <td className="p-4">{vehicleItem.objet}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.text}
                          </span>
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
            <div className="flex justify-between items-center mb-3">
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
                  <Card key={offer.id} className="relative">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{offer.period}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-primary mb-4">
                        {offer.price} MAD
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteOffer(offer.id)}
                        className="w-full"
                      >
                        Supprimer l'offre
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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