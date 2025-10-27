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
import { 
  Plus, 
  Trash2, 
  Car, 
  Calendar, 
  BarChart3,
  Search,
  Filter,
  MoreVertical
} from "lucide-react";

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
  status: string;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
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

    if (!car.available) {
      return 0;
    }

    const reserved = getReservedCountForDate(carId, date);
    return Math.max(0, car.quantity - reserved);
  };

  // Filtrage des véhicules
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || vehicle.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(vehicles.map(v => v.category))];

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
      const generatedId = newVehicle.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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
      fetchData();
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
          available: false
        })
        .eq("id", vehicleId);

      if (error) throw error;

      toast({
        title: "Modèle archivé",
        description: `Le modèle ${vehicleName} a été archivé avec succès.`,
      });

      fetchData();
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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Véhicules</h1>
                <p className="text-gray-600">Suivez la disponibilité et gérez votre flotte automobile</p>
              </div>
              <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Modèle
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Véhicules Total */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Véhicules Total</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{vehicles.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Dans la flotte</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <Car className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>
              
              {/* Taux de Disponibilité */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Disponibilité</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {vehicles.length > 0 ? Math.round((vehicles.filter(v => v.available).length / vehicles.length) * 100) : 0}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">de la flotte</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl">
                    <BarChart3 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              {/* Catégories */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Catégories</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{categories.length}</p>
                    <p className="text-xs text-gray-500 mt-1">différentes</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Réservations en Cours */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Locations Actives</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{reservations.length}</p>
                    <p className="text-xs text-gray-500 mt-1">En cours</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <Calendar className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Rechercher un véhicule ou une catégorie..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Vehicles Grid */}
          <div className="grid gap-6">
            {filteredVehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Vehicle Image and Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="relative group">
                          <img
                            src={vehicle.image_url}
                            alt={vehicle.name}
                            className="w-32 h-24 object-cover rounded-lg shadow-md"
                          />
                          <button
                            onClick={() => handleDeleteVehicle(vehicle.id, vehicle.name)}
                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110"
                            title="Archiver le véhicule"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <Link
                                to={`/admin/vehicle/${vehicle.id}`}
                                className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                              >
                                {vehicle.name}
                              </Link>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {vehicle.category}
                                </span>
                                {vehicle.available ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Disponible
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Indisponible
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{vehicle.price} MAD</p>
                              <p className="text-sm text-gray-500">par jour</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Stock:</span> {vehicle.quantity}
                            </div>
                            <div>
                              <span className="font-medium">Transmission:</span> {vehicle.transmission}
                            </div>
                            <div>
                              <span className="font-medium">Carburant:</span> {vehicle.fuel}
                            </div>
                            <div>
                              <span className="font-medium">Places:</span> {vehicle.seats || "N/A"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Availability Timeline */}
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Disponibilité sur 30 jours
                    </h4>
                    <div className="overflow-x-auto">
                      <div className="flex gap-1 min-w-max">
                        {dates.map((date) => {
                          const available = getDailyAvailability(vehicle.id, date);
                          const reserved = getReservedCountForDate(vehicle.id, date);
                          const isToday = date === format(new Date(), "yyyy-MM-dd");
                          
                          return (
                            <div
                              key={date}
                              className={`flex flex-col items-center p-2 rounded-lg border text-xs font-medium min-w-12 ${
                                available > 0 
                                  ? "bg-green-50 border-green-200 text-green-700" 
                                  : "bg-red-50 border-red-200 text-red-700"
                              } ${isToday ? "ring-2 ring-blue-500 ring-opacity-50" : ""}`}
                              title={`${format(new Date(date), "dd/MM/yyyy")}: ${available} disponible(s), ${reserved} réservé(s)`}
                            >
                              <span className="font-semibold">{format(new Date(date), "dd")}</span>
                              <span className="text-[10px] opacity-70">{format(new Date(date), "MMM")}</span>
                              <span className={`mt-1 text-xs ${
                                available > 0 ? "text-green-600" : "text-red-600"
                              }`}>
                                {available}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredVehicles.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun véhicule trouvé</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-4">
                {searchTerm || selectedCategory !== "all" 
                  ? "Aucun véhicule ne correspond à vos critères de recherche."
                  : "Commencez par ajouter votre premier véhicule à la flotte."}
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un véhicule
              </Button>
            </div>
          )}
        </div>

        {/* Create Vehicle Modal */}
        <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Car className="h-5 w-5" />
                Nouveau Modèle de Véhicule
              </Dialog.Title>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">Nom du modèle *</Label>
                  <Input
                    id="name"
                    value={newVehicle.name}
                    onChange={(e) => setNewVehicle({...newVehicle, name: e.target.value})}
                    placeholder="Ex: Renault Clio"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="text-sm font-medium">Catégorie *</Label>
                  <Input
                    id="category"
                    value={newVehicle.category}
                    onChange={(e) => setNewVehicle({...newVehicle, category: e.target.value})}
                    placeholder="Ex: Citadine"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="price" className="text-sm font-medium">Prix par jour (MAD) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={newVehicle.price}
                    onChange={(e) => setNewVehicle({...newVehicle, price: e.target.value})}
                    placeholder="300"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="quantity" className="text-sm font-medium">Stock initial *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newVehicle.quantity}
                    onChange={(e) => setNewVehicle({...newVehicle, quantity: e.target.value})}
                    placeholder="5"
                    className="mt-1"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="image_url" className="text-sm font-medium">URL de l'image</Label>
                  <Input
                    id="image_url"
                    value={newVehicle.image_url}
                    onChange={(e) => setNewVehicle({...newVehicle, image_url: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="fuel" className="text-sm font-medium">Carburant</Label>
                  <select
                    id="fuel"
                    value={newVehicle.fuel}
                    onChange={(e) => setNewVehicle({...newVehicle, fuel: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Essence">Essence</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electrique">Électrique</option>
                    <option value="Hybride">Hybride</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="transmission" className="text-sm font-medium">Transmission</Label>
                  <select
                    id="transmission"
                    value={newVehicle.transmission}
                    onChange={(e) => setNewVehicle({...newVehicle, transmission: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Manuelle">Manuelle</option>
                    <option value="Automatique">Automatique</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="seats" className="text-sm font-medium">Nombre de places</Label>
                  <Input
                    id="seats"
                    type="number"
                    value={newVehicle.seats}
                    onChange={(e) => setNewVehicle({...newVehicle, seats: e.target.value})}
                    placeholder="5"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateVehicle} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
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