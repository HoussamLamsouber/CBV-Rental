// src/pages/AdminVehicles.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@headlessui/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Car, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";

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
  reservation_count?: number;
}

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const [newVehicle, setNewVehicle] = useState({
    name: "",
    category: "",
    price: "",
    quantity: "",
    image_url: "",
    fuel: "fuel_gasoline",
    seats: "",
    transmission: "transmission_manual"
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      const { data: carsData, error: carsError } = await supabase
        .from("cars")
        .select("*")
        .is("is_deleted", false);

      if (carsError) throw carsError;

      const { data: allResData, error: allResError } = await supabase
        .from("reservations")
        .select("*");

      if (allResError) throw allResError;

      const vehiclesWithReservationCount = (carsData as Vehicle[]).map(vehicle => {
        const reservationCount = allResData?.filter(res => res.car_id === vehicle.id).length || 0;
        return { ...vehicle, reservation_count: reservationCount };
      });

      setVehicles(vehiclesWithReservationCount || []);
    } catch (error) {
      console.error("Erreur chargement véhicules:", error);
      toast({
        title: t("error"),
        description: t('admin_vehicles.messages.cannot_load_data'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVehicle = async () => {
    if (!newVehicle.name || !newVehicle.category || !newVehicle.price || !newVehicle.quantity) {
      toast({
        title: t('admin_vehicles.messages.missing_fields'),
        description: t('admin_vehicles.messages.fill_required_fields'),
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
          title: t('admin_vehicles.messages.duplicate_model'),
          description: t('admin_vehicles.messages.model_already_exists', { name: newVehicle.name }),
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
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
        }]);

      if (error) throw error;

      toast({
        title: t('admin_vehicles.messages.model_created'),
        description: t('admin_vehicles.messages.model_created_success', { name: newVehicle.name }),
      });

      setNewVehicle({
        name: "",
        category: "",
        price: "",
        quantity: "",
        image_url: "",
        fuel: "fuel_gasoline",
        seats: "",
        transmission: "transmission_manual"
      });

      setIsCreateModalOpen(false);
      fetchVehicles();
    } catch (error: any) {
      console.error("Erreur création modèle:", error);
      toast({
        title: t("error"),
        description: error.message || t('admin_vehicles.messages.cannot_create_model'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Barre de titre dynamique */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin_vehicles.title')}</h1>
            <p className="text-gray-600">{t('admin_vehicles.subtitle')}</p>
          </div>

          {/* Loader central */}
          {isLoading ? (
            <div className="text-center py-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('admin_vehicles.messages.loading')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map(vehicle => (
                <motion.div
                  key={vehicle.id}
                  whileHover={{ scale: 1.03, boxShadow: "0px 4px 15px rgba(0,0,0,0.1)" }}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all"
                >
                  <Link to={`/admin/vehicle/${vehicle.id}`}>
                    <img
                      src={vehicle.image_url || "/placeholder-car.jpg"}
                      alt={vehicle.name}
                      className="w-full h-40 object-cover"
                    />
                    <div className="p-4">
                      <h2 className="text-lg font-semibold text-gray-900 truncate">{vehicle.name}</h2>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {t(`admin_vehicles.categories.${vehicle.category}`)}
                        </span>
                        {vehicle.available ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {t('admin_vehicles.status.available')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {t('admin_vehicles.status.unavailable')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
                        <span>{vehicle.seats} {t('admin_vehicles.messages.seats')}</span>
                        <span>{vehicle.price} MAD</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}

              {/* Card pour ajouter un nouveau véhicule */}
              <motion.div
                onClick={() => setIsCreateModalOpen(true)}
                whileHover={{ scale: 1.03, backgroundColor: "#ebf8ff" }}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer transition-colors"
              >
                <Plus className="h-8 w-8 text-blue-400 mb-2" />
                <p className="text-gray-600 font-medium">{t('admin_vehicles.actions.add_vehicle')}</p>
              </motion.div>
            </div>
          )}

          {/* Create Vehicle Modal */}
          <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <Dialog.Title className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  {t('admin_vehicles.modals.create_vehicle.title')}
                </Dialog.Title>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium">{t('admin_vehicles.modals.create_vehicle.model_name')} *</Label>
                    <Input
                      id="name"
                      value={newVehicle.name}
                      onChange={(e) => setNewVehicle({...newVehicle, name: e.target.value})}
                      placeholder={t('admin_vehicles.modals.create_vehicle.model_name_placeholder')}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category" className="text-sm font-medium">{t('admin_vehicles.modals.create_vehicle.category')} *</Label>
                    <select
                      id="category"
                      value={newVehicle.category}
                      onChange={(e) => setNewVehicle({...newVehicle, category: e.target.value})}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="category_electric">{t('admin_vehicles.categories.category_electric')}</option>
                      <option value="category_suv">{t('admin_vehicles.categories.category_suv')}</option>
                      <option value="category_urban_suv">{t('admin_vehicles.categories.category_urban_suv')}</option>
                      <option value="category_sedan">{t('admin_vehicles.categories.category_sedan')}</option>
                    </select>
                  </div>
                  {/* Les autres champs restent identiques */}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                    {t('admin_vehicles.modals.create_vehicle.cancel')}
                  </Button>
                  <Button onClick={handleCreateVehicle} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                    {isLoading ? t('admin_vehicles.modals.create_vehicle.creating') : t('admin_vehicles.modals.create_vehicle.create_model')}
                  </Button>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        </div>
      </div>
      <Footer />
    </>
  );
}
