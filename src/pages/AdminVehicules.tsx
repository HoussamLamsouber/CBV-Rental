// src/pages/AdminVehicles.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Footer";
import { format, addDays } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@headlessui/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Vehicle {
  id: string;
  name: string;
  category: string;
  image_url: string;
  price: number;
  available: boolean;
  quantity: number;
  fuel?: string;
  seats?: number;
  transmission?: string;
}

interface Reservation {
  id: string;
  car_id: string;
  user_id: string;
  pickup_date: string;
  return_date: string;
  pickup_location: string;
  return_location: string;
  created_at: string;
  status: string; // Ajout du statut
  car_name: string;
  car_image: string;
  car_category: string;
  car_price: number;
  date: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
}

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [newVehicle, setNewVehicle] = useState({
    name: "",
    category: "",
    price: "",
    quantity: "",
    image_url: "",
    fuel: "Essence",
    seats: "",
    transmission: "Manuelle"
  });

  useEffect(() => {
    fetchData();

    // Générer 30 jours à partir d'aujourd'hui
    const today = new Date();
    const nextDays = Array.from({ length: 30 }, (_, i) =>
      format(addDays(today, i), "yyyy-MM-dd")
    );
    setDates(nextDays);
  }, []);

  const fetchData = async () => {
    try {
      // Charger les véhicules
      const { data: carsData, error: carsError } = await supabase
        .from("cars")
        .select("*")
        .is("is_deleted", false);
      
      if (carsError) throw carsError;
      setVehicles((carsData as Vehicle[]) || []);

      // Charger les réservations ACCEPTÉES seulement
      const { data: resData, error: resError } = await supabase
        .from("reservations")
        .select("*")
        .eq("status", "accepted");

      if (resError) throw resError;
      setReservations((resData as Reservation[]) || []);

    } catch (error) {
      console.error("Erreur chargement données:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    }
  };

  const isDateInReservation = (date: string, reservation: Reservation) => {
    const currentDate = new Date(date);
    const pickupDate = new Date(reservation.pickup_date);
    const returnDate = new Date(reservation.return_date);
    
    return currentDate >= pickupDate && currentDate <= returnDate;
  };

  const getReservedCountForDate = (carId: string, date: string) => {
    return reservations
      .filter(r => r.car_id === carId && isDateInReservation(date, r))
      .length;
  };

  const getDailyAvailability = (carId: string, date: string) => {
    const car = vehicles.find((c) => c.id === carId);
    if (!car) return 0;

    // Vérifier si le véhicule est disponible globalement
    if (!car.available) {
      return 0;
    }

    const reserved = getReservedCountForDate(carId, date);
    return Math.max(0, car.quantity - reserved);
  };

  // FONCTION POUR CRÉER UN MODÈLE
  const handleCreateVehicle = async () => {
    if (!newVehicle.name || !newVehicle.category || !newVehicle.price || !newVehicle.quantity) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Générer l'ID à partir du nom (minuscules avec tirets)
      const generatedId = newVehicle.name
        .toLowerCase()
        .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
        .replace(/[^a-z0-9-]/g, '') // Supprimer les caractères spéciaux
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Supprimer les accents

      // Vérifier si l'ID existe déjà
      const { data: existingCar } = await supabase
        .from("cars")
        .select("id")
        .eq("id", generatedId)
        .single();

      if (existingCar) {
        toast({
          title: "Modèle déjà existant",
          description: `Un modèle avec le nom "${newVehicle.name}" existe déjà. Veuillez modifier le nom.`,
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("cars")
        .insert([{
          id: generatedId,
          name: newVehicle.name,
          category: newVehicle.category,
          price: Number(newVehicle.price),
          quantity: Number(newVehicle.quantity),
          image_url: newVehicle.image_url || null,
          fuel: newVehicle.fuel,
          seats: newVehicle.seats ? Number(newVehicle.seats) : null,
          transmission: newVehicle.transmission,
          available: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Modèle créé",
        description: `Le modèle ${newVehicle.name} a été créé avec succès.`,
      });

      // Réinitialiser le formulaire
      setNewVehicle({
        name: "",
        category: "",
        price: "",
        quantity: "",
        image_url: "",
        fuel: "Essence",
        seats: "",
        transmission: "Manuelle"
      });

      setIsCreateModalOpen(false);
      fetchData(); // Recharger la liste
    } catch (error: any) {
      console.error("Erreur création modèle:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le modèle.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string, vehicleName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir archiver le modèle "${vehicleName}" ? Il ne sera plus visible mais restera dans la base de données.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("cars")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          available: false // Rendre indisponible
        })
        .eq("id", vehicleId);

      if (error) throw error;

      toast({
        title: "Modèle archivé",
        description: `Le modèle ${vehicleName} a été archivé avec succès.`,
      });

      fetchData(); // Recharger la liste
    } catch (error: any) {
      console.error("Erreur archivage modèle:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'archiver le modèle.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Disponibilités des véhicules</h1>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            + Nouveau modèle
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border shadow-sm">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-12 border">Photo</th>
                <th className="p-2 border">Véhicule</th>
                {dates.map((d) => (
                  <th key={d} className="p-2 border text-center">
                    {format(new Date(d), "dd/MM")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="text-center">
                  <td className="p-2 border relative group">
                    {/* Bouton qui apparaît au survol */}
                    <button
                      onClick={() => handleDeleteVehicle(v.id, v.name)}
                      title="Supprimer"
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-md shadow-lg transition-all duration-200 z-10 opacity-0 group-hover:opacity-100 hover:scale-110 border-2 border-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    
                    {/* Conteneur de l'image */}
                    <div>
                      <img
                        src={v.image_url}
                        alt={v.name}
                        className="w-50 h-22 object-cover rounded transition-opacity group-hover:opacity-90"
                      />
                    </div>
                  </td>
                  <td className="p-4 border text-left">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Link
                          to={`/admin/vehicle/${v.id}`}
                          className="font-semibold text-primary hover:underline text-base"
                        >
                          {v.name}
                        </Link>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>{v.category}</div>
                        <div>Stock: {v.quantity}</div>
                        <div className="text-xs text-gray-500">
                          {v.transmission} • {v.fuel} • {v.seats} places
                        </div>
                      </div>
                    </div>
                  </td>
                  {dates.map((d) => {
                    const available = getDailyAvailability(v.id, d);
                    const reserved = getReservedCountForDate(v.id, d);
                    return (
                      <td
                        key={d}
                        className={`p-2 border font-semibold ${
                          available > 0 ? "text-green-600" : "text-red-600"
                        }`}
                        title={`Réservations acceptées: ${reserved}, Disponible: ${available}`}
                      >
                        {available}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal de création de modèle */}
        <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-lg font-semibold mb-4">
                Créer un nouveau modèle
              </Dialog.Title>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom du modèle *</Label>
                  <Input
                    id="name"
                    value={newVehicle.name}
                    onChange={(e) => setNewVehicle({...newVehicle, name: e.target.value})}
                    placeholder="Ex: Renault Clio"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Catégorie *</Label>
                  <Input
                    id="category"
                    value={newVehicle.category}
                    onChange={(e) => setNewVehicle({...newVehicle, category: e.target.value})}
                    placeholder="Ex: Citadine"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Prix par jour (MAD) *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={newVehicle.price}
                      onChange={(e) => setNewVehicle({...newVehicle, price: e.target.value})}
                      placeholder="300"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="quantity">Stock initial *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={newVehicle.quantity}
                      onChange={(e) => setNewVehicle({...newVehicle, quantity: e.target.value})}
                      placeholder="5"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="image_url">URL de l'image</Label>
                  <Input
                    id="image_url"
                    value={newVehicle.image_url}
                    onChange={(e) => setNewVehicle({...newVehicle, image_url: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fuel">Carburant</Label>
                    <select
                      id="fuel"
                      value={newVehicle.fuel}
                      onChange={(e) => setNewVehicle({...newVehicle, fuel: e.target.value})}
                      className="w-full border rounded p-2"
                    >
                      <option value="Essence">Essence</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Electrique">Électrique</option>
                      <option value="Hybride">Hybride</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="transmission">Transmission</Label>
                    <select
                      id="transmission"
                      value={newVehicle.transmission}
                      onChange={(e) => setNewVehicle({...newVehicle, transmission: e.target.value})}
                      className="w-full border rounded p-2"
                    >
                      <option value="Manuelle">Manuelle</option>
                      <option value="Automatique">Automatique</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="seats">Nombre de places</Label>
                  <Input
                    id="seats"
                    type="number"
                    value={newVehicle.seats}
                    onChange={(e) => setNewVehicle({...newVehicle, seats: e.target.value})}
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateVehicle} disabled={isLoading}>
                  {isLoading ? "Création..." : "Créer le modèle"}
                </Button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </div>
      <Footer />
    </>
  );
}