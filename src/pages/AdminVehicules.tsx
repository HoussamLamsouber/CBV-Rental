// src/pages/AdminVehicles.tsx (version internationalisée avec nouvelles valeurs)
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Footer";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@headlessui/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Car, 
  Calendar, 
  BarChart3,
  Users,
  DollarSign,
  ChevronRight,
  MapPin,
  Clock,
  ArrowRight,
  Zap
} from "lucide-react";
import { useTranslation } from "react-i18next";

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
  total_amount?: number;
}

interface DashboardStats {
  totalVehicles: number;
  availableVehicles: number;
  totalRevenue: number;
  activeRentals: number;
  monthlyGrowth: number;
  totalReservations: number;
  performanceRate: number;
}

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    availableVehicles: 0,
    totalRevenue: 0,
    activeRentals: 0,
    monthlyGrowth: 0,
    totalReservations: 0,
    performanceRate: 0
  });
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
    fetchData();
  }, []);

  const fetchData = async () => {
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
      setAllReservations((allResData as Reservation[]) || []);

      const vehiclesWithReservationCount = (carsData as Vehicle[]).map(vehicle => {
        const reservationCount = allResData?.filter(res => res.car_id === vehicle.id).length || 0;
        return {
          ...vehicle,
          reservation_count: reservationCount
        };
      });

      setVehicles(vehiclesWithReservationCount || []);

      const { data: resData, error: resError } = await supabase
        .from("reservations")
        .select("*")
        .eq("status", "accepted");

      if (resError) throw resError;
      setReservations((resData as Reservation[]) || []);

      calculateStats(vehiclesWithReservationCount || [], allResData as Reservation[] || []);

    } catch (error) {
      console.error("Erreur chargement données:", error);
      toast({
        title: t("error"),
        description: t('admin_vehicles.messages.cannot_load_data'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (vehicles: Vehicle[], allReservations: Reservation[]) => {
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(v => v.available).length;
    
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    
    const monthlyReservations = allReservations.filter(reservation => {
      const reservationDate = new Date(reservation.created_at);
      return (
        reservation.status === 'accepted' &&
        isWithinInterval(reservationDate, { start: currentMonthStart, end: currentMonthEnd })
      );
    });

    const totalRevenue = monthlyReservations.reduce((sum, reservation) => {
      if (reservation.total_amount) {
        return sum + reservation.total_amount;
      } else {
        const pickupDate = new Date(reservation.pickup_date);
        const returnDate = new Date(reservation.return_date);
        const durationDays = Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24));
        const estimatedRevenue = reservation.car_price * Math.max(1, durationDays);
        return sum + estimatedRevenue;
      }
    }, 0);

    const activeRentals = allReservations.filter(r => {
      const today = new Date();
      const pickup = new Date(r.pickup_date);
      const returnDate = new Date(r.return_date);
      return r.status === 'accepted' && today >= pickup && today <= returnDate;
    }).length;

    const performanceRate = totalVehicles > 0 
      ? Math.round((monthlyReservations.length / totalVehicles) * 100) 
      : 0;

    const totalActiveReservations = activeRentals;

    setStats({
      totalVehicles,
      availableVehicles,
      totalRevenue,
      activeRentals,
      monthlyGrowth: 12.5,
      totalReservations: totalActiveReservations,
      performanceRate
    });
  };

  const recentReservations = allReservations
    .filter(res => {
      const resDate = new Date(res.created_at);
      const sevenDaysAgo = subDays(new Date(), 7);
      return resDate >= sevenDaysAgo;
    })
    .slice(0, 5);

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
      fetchData();
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

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = "blue" }: any) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span className={`text-xs font-medium ${
                trend > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
            <span className="text-xs text-gray-500">{subtitle}</span>
          </div>
        </div>
        <div className={`p-3 rounded-xl ${
          color === 'blue' ? 'bg-blue-50' :
          color === 'green' ? 'bg-green-50' :
          color === 'purple' ? 'bg-purple-50' :
          'bg-orange-50'
        }`}>
          <Icon className={`h-6 w-6 ${
            color === 'blue' ? 'text-blue-600' :
            color === 'green' ? 'text-green-600' :
            color === 'purple' ? 'text-purple-600' :
            'text-orange-600'
          }`} />
        </div>
      </div>
    </div>
  );

  // Ajoutez cette fonction dans votre composant
  const translateLocation = (location: string) => {
    // Si c'est un aéroport (commence par "airport_")
    if (location.startsWith('airport_')) {
      const airportKey = location.replace('airport_', '');
      const translation = t(`airports.${airportKey}`);
      // Si la traduction existe, la retourner
      if (translation !== `airports.${airportKey}`) {
        return translation;
      }
    }
    
    // Si c'est une gare (commence par "station_") ou autre logique si nécessaire
    if (location.startsWith('station_')) {
      const stationKey = location.replace('station_', '');
      const translation = t(`stations.${stationKey}`);
      if (translation !== `stations.${stationKey}`) {
        return translation;
      }
    }
    
    // Essayer directement sans préfixe (au cas où)
    const airportTrans = t(`airports.${location}`);
    if (airportTrans !== `airports.${location}`) return airportTrans;
    
    const stationTrans = t(`stations.${location}`);
    if (stationTrans !== `stations.${location}`) return stationTrans;
    
    // Sinon retourner la valeur originale
    return location;
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin_vehicles.title')}</h1>
                <p className="text-gray-600">{t('admin_vehicles.subtitle')}</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title={t('admin_vehicles.stats.total_vehicles')}
                value={stats.totalVehicles}
                subtitle={t('admin_vehicles.stats.in_fleet')}
                icon={Car}
                color="blue"
              />
              <StatCard
                title={t('admin_vehicles.stats.performance')}
                value={`${stats.performanceRate}%`}
                subtitle={t('admin_vehicles.stats.reservation_ratio')}
                icon={Zap}
                trend={stats.monthlyGrowth}
                color="green"
              />
              <StatCard
                title={t('admin_vehicles.stats.total_revenue')}
                value={`${stats.totalRevenue.toLocaleString()} MAD`}
                subtitle={t('admin_vehicles.stats.this_month')}
                icon={DollarSign}
                color="purple"
              />
              <StatCard
                title={t('admin_vehicles.stats.active_reservations')}
                value={stats.totalReservations}
                subtitle={t('admin_vehicles.stats.currently_ongoing')}
                icon={Users}
                color="orange"
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Modèles de Véhicules */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Car className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('admin_vehicles.vehicle_models.title')}</h3>
                    <p className="text-sm text-gray-600">{t('admin_vehicles.vehicle_models.subtitle')}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {vehicles.length} {t('admin_vehicles.vehicle_models.model_count', { count: vehicles.length })}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicles.map((vehicle) => (
                  <Link key={vehicle.id} to={`/admin/vehicle/${vehicle.id}`} className="group">
                    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-all duration-200 border border-gray-200 group-hover:border-blue-300 group-hover:shadow-md">
                      <img
                        src={vehicle.image_url}
                        alt={vehicle.name}
                        className="w-16 h-12 object-cover rounded-lg flex-shrink-0"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                            {vehicle.name}
                          </p>
                          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 ml-2" />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
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
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{t(`admin_vehicles.transmission_types.${vehicle.transmission}`)}</span>
                          <span>•</span>
                          <span>{t(`admin_vehicles.fuel_types.${vehicle.fuel}`)}</span>
                          <span>•</span>
                          <span>{vehicle.seats} {t('admin_vehicles.messages.seats')}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                
                {vehicles.length === 0 && (
                  <div className="col-span-2 text-center py-12">
                    <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('admin_vehicles.messages.no_vehicles')}</h4>
                    <p className="text-gray-600 mb-4">{t('admin_vehicles.messages.add_first_vehicle')}</p>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('admin_vehicles.actions.add_vehicle')}
                    </Button>
                  </div>
                )}

                <div 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer group col-span-1 md:col-span-2"
                >
                  <div className="text-center">
                    <Plus className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mx-auto mb-2 transition-colors" />
                    <p className="font-medium text-gray-600 group-hover:text-blue-600 transition-colors">
                      {t('admin_vehicles.actions.add_vehicle')}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{t('admin_vehicles.messages.new_model')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Réservations Récentes */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('admin_vehicles.recent_reservations.title')}</h3>
                    <p className="text-sm text-gray-600">{t('admin_vehicles.recent_reservations.subtitle')}</p>
                  </div>
                </div>
                <Link to="/admin/reservations">
                  <Button variant="ghost" size="sm" className="text-blue-600">
                    {t('admin_vehicles.actions.see_all')} <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-4">
                {recentReservations.map((reservation) => (
                  <div key={reservation.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 text-sm">{reservation.car_name}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        reservation.status === 'accepted' 
                          ? 'bg-green-100 text-green-800'
                          : reservation.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {reservation.status === 'accepted' ? t('admin_reservations.status.accepted') : 
                         reservation.status === 'pending' ? t('admin_reservations.status.pending') : t('admin_reservations.status.refused')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(reservation.pickup_date), "dd/MM/yyyy")} - {format(new Date(reservation.return_date), "dd/MM/yyyy")}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">
                          {translateLocation(reservation.pickup_location)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {recentReservations.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">{t('admin_vehicles.messages.no_recent_reservations')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

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

                <div>
                  <Label htmlFor="price" className="text-sm font-medium">{t('admin_vehicles.modals.create_vehicle.price_per_day')} *</Label>
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
                  <Label htmlFor="quantity" className="text-sm font-medium">{t('admin_vehicles.modals.create_vehicle.initial_stock')} *</Label>
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
                  <Label htmlFor="image_url" className="text-sm font-medium">{t('admin_vehicles.modals.create_vehicle.image_url')}</Label>
                  <Input
                    id="image_url"
                    value={newVehicle.image_url}
                    onChange={(e) => setNewVehicle({...newVehicle, image_url: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="fuel" className="text-sm font-medium">{t('admin_vehicles.modals.create_vehicle.fuel')}</Label>
                  <select
                    id="fuel"
                    value={newVehicle.fuel}
                    onChange={(e) => setNewVehicle({...newVehicle, fuel: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="fuel_gasoline">{t('admin_vehicles.fuel_types.fuel_gasoline')}</option>
                    <option value="fuel_electric">{t('admin_vehicles.fuel_types.fuel_electric')}</option>
                    <option value="fuel_diesel">{t('admin_vehicles.fuel_types.fuel_diesel')}</option>
                    <option value="fuel_hybrid">{t('admin_vehicles.fuel_types.fuel_hybrid')}</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="transmission" className="text-sm font-medium">{t('admin_vehicles.modals.create_vehicle.transmission')}</Label>
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
                  <Label htmlFor="seats" className="text-sm font-medium">{t('admin_vehicles.modals.create_vehicle.seats')}</Label>
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
      <Footer />
    </>
  );
}