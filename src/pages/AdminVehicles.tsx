// src/pages/AdminVehicles.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@headlessui/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Car, ArrowRight, Upload, X } from "lucide-react";
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
  const [imageUploading, setImageUploading] = useState(false);
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

  const handleImageUpload = async (file: File) => {
    try {
      setImageUploading(true);
      
      // Vérifier la taille du fichier (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "L'image ne doit pas dépasser 5MB",
          variant: "destructive",
        });
        return;
      }
  
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `vehicle-images/${fileName}`;
  
      console.log("Uploading file:", filePath);
  
      const { error: uploadError } = await supabase.storage
        .from('cars')
        .upload(filePath, file);
  
      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }
  
      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('cars')
        .getPublicUrl(filePath);
  
      console.log("Public URL:", publicUrl);
  
      setNewVehicle(prev => ({ ...prev, image_url: publicUrl }));
      
      toast({
        title: "Image téléchargée",
        description: "L'image a été téléchargée avec succès",
      });
    } catch (error: any) {
      console.error("Erreur upload image:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de télécharger l'image",
        variant: "destructive",
      });
    } finally {
      setImageUploading(false);
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

      // Reset form
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

  const resetForm = () => {
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

          {/* Create Vehicle Modal amélioré */}
          <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <Dialog.Title className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  {t('admin_vehicles.modals.create_vehicle.title')}
                </Dialog.Title>
                
                <div className="space-y-6">
                  {/* Section Informations de base */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {t('admin_vehicles.modals.create_vehicle.basic_info')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.model_name')} *
                        </Label>
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
                        <Label htmlFor="category" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.category')} *
                        </Label>
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

                      <div>
                        <Label htmlFor="price" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.price_per_day')} (MAD) *
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          value={newVehicle.price}
                          onChange={(e) => setNewVehicle({...newVehicle, price: e.target.value})}
                          placeholder="0.00"
                          className="mt-1"
                          min="0"
                          step="1"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="quantity" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.initial_stock')} *
                        </Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={newVehicle.quantity}
                          onChange={(e) => setNewVehicle({...newVehicle, quantity: e.target.value})}
                          placeholder="1"
                          className="mt-1"
                          min="1"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section Spécifications techniques */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {t('admin_vehicles.modals.create_vehicle.technical_specs')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fuel" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.fuel')}
                        </Label>
                        <select
                          id="fuel"
                          value={newVehicle.fuel}
                          onChange={(e) => setNewVehicle({...newVehicle, fuel: e.target.value})}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="fuel_gasoline">{t('admin_vehicles.fuel_types.fuel_gasoline')}</option>
                          <option value="fuel_diesel">{t('admin_vehicles.fuel_types.fuel_diesel')}</option>
                          <option value="fuel_electric">{t('admin_vehicles.fuel_types.fuel_electric')}</option>
                          <option value="fuel_hybrid">{t('admin_vehicles.fuel_types.fuel_hybrid')}</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="transmission" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.transmission')}
                        </Label>
                        <select
                          id="transmission"
                          value={newVehicle.transmission}
                          onChange={(e) => setNewVehicle({...newVehicle, transmission: e.target.value})}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="transmission_manual">{t('admin_vehicles.transmission_types.transmission_manual')}</option>
                          <option value="transmission_automatic">{t('admin_vehicles.transmission_types.transmission_automatic')}</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="seats" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.seats')}
                        </Label>
                        <Input
                          id="seats"
                          type="number"
                          value={newVehicle.seats}
                          onChange={(e) => setNewVehicle({...newVehicle, seats: e.target.value})}
                          placeholder="5"
                          className="mt-1"
                          min="1"
                          max="9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section Image */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {t('admin_vehicles.modals.create_vehicle.image_section')}
                    </h3>
                    <div className="space-y-4">
                      {newVehicle.image_url ? (
                        <div className="relative">
                          <img
                            src={newVehicle.image_url}
                            alt={t('admin_vehicles.modals.create_vehicle.image_preview_alt')}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => setNewVehicle(prev => ({ ...prev, image_url: "" }))}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <input
                            type="file"
                            id="image-upload"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file);
                            }}
                            className="hidden"
                          />
                          <label
                            htmlFor="image-upload"
                            className="cursor-pointer flex flex-col items-center justify-center"
                          >
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-gray-600">
                              {imageUploading 
                                ? t('admin_vehicles.modals.create_vehicle.uploading') 
                                : t('admin_vehicles.modals.create_vehicle.upload_image')
                              }
                            </p>
                          </label>
                        </div>
                      )}
                      
                      <div>
                        <Label htmlFor="image_url" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.or_enter_url')}
                        </Label>
                        <Input
                          id="image_url"
                          value={newVehicle.image_url}
                          onChange={(e) => setNewVehicle({...newVehicle, image_url: e.target.value})}
                          placeholder={t('admin_vehicles.modals.create_vehicle.url_placeholder')}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      resetForm();
                      setIsCreateModalOpen(false);
                    }}
                  >
                    {t('admin_vehicles.modals.create_vehicle.cancel')}
                  </Button>
                  
                  <div className="flex gap-3">
                    <Button 
                      variant="secondary" 
                      onClick={resetForm}
                      disabled={isLoading}
                    >
                      {t('admin_vehicles.modals.create_vehicle.reset')}
                    </Button>
                    <Button 
                      onClick={handleCreateVehicle} 
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoading 
                        ? t('admin_vehicles.modals.create_vehicle.creating') 
                        : t('admin_vehicles.modals.create_vehicle.create_model')
                      }
                    </Button>
                  </div>
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