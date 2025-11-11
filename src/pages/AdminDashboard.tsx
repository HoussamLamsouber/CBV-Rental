// src/pages/AdminDashboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Footer";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Car, 
  Calendar, 
  Users,
  DollarSign,
  ChevronRight,
  MapPin,
  Clock,
  Zap,
  TrendingUp
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

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

interface ChartData {
  name: string;
  value: number;
}

export default function AdminDashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
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

  // Données pour les graphiques
  const [categoryData, setCategoryData] = useState<ChartData[]>([]);
  const [revenueData, setRevenueData] = useState<ChartData[]>([]);
  const [reservationTrendData, setReservationTrendData] = useState<ChartData[]>([]);

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
      setVehicles(carsData || []);

      const { data: allResData, error: allResError } = await supabase
        .from("reservations")
        .select("*");

      if (allResError) throw allResError;
      setAllReservations((allResData as Reservation[]) || []);

      const { data: resData, error: resError } = await supabase
        .from("reservations")
        .select("*")
        .eq("status", "accepted");

      if (resError) throw resError;
      setReservations((resData as Reservation[]) || []);

      calculateStats(carsData || [], allResData as Reservation[] || []);
      prepareChartData(carsData || [], allResData as Reservation[] || []);

    } catch (error) {
      console.error("Erreur chargement données:", error);
      toast({
        title: t("error"),
        description: t('admin_dashboard.messages.cannot_load_data'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (vehicles: any[], allReservations: Reservation[]) => {
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

  const prepareChartData = (vehicles: any[], allReservations: Reservation[]) => {
    // Données pour le graphique des catégories
    const categoryStats: { [key: string]: number } = {};
    vehicles.forEach(vehicle => {
      const category = vehicle.category;
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });

    const categoryChartData = Object.keys(categoryStats).map(category => ({
      name: t(`admin_vehicles.categories.${category}`),
      value: categoryStats[category]
    }));
    setCategoryData(categoryChartData);

    // Données pour le graphique des revenus par mois (6 derniers mois)
    const monthlyRevenue: { [key: string]: number } = {};
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return date.toISOString().slice(0, 7); // Format YYYY-MM
    }).reverse();

    last6Months.forEach(month => {
      monthlyRevenue[month] = 0;
    });

    allReservations.filter(res => res.status === 'accepted').forEach(reservation => {
      const reservationMonth = reservation.created_at.slice(0, 7);
      if (monthlyRevenue.hasOwnProperty(reservationMonth)) {
        const revenue = reservation.total_amount || 
          (() => {
            const pickupDate = new Date(reservation.pickup_date);
            const returnDate = new Date(reservation.return_date);
            const durationDays = Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24));
            return reservation.car_price * Math.max(1, durationDays);
          })();
        monthlyRevenue[reservationMonth] += revenue;
      }
    });

    const revenueChartData = last6Months.map(month => ({
      name: format(new Date(month + '-01'), 'MMM yyyy'),
      value: Math.round(monthlyRevenue[month] / 100) * 100 // Arrondir aux centaines
    }));
    setRevenueData(revenueChartData);

    // Données pour la tendance des réservations
    const reservationTrend = last6Months.map(month => ({
      name: format(new Date(month + '-01'), 'MMM yyyy'),
      value: allReservations.filter(res => 
        res.created_at.slice(0, 7) === month && res.status === 'accepted'
      ).length
    }));
    setReservationTrendData(reservationTrend);
  };

  const recentReservations = allReservations
    .filter(res => {
      const resDate = new Date(res.created_at);
      const sevenDaysAgo = subDays(new Date(), 7);
      return resDate >= sevenDaysAgo;
    })
    .slice(0, 5);

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

  const translateLocation = (location: string) => {
    if (location.startsWith('airport_')) {
      const airportKey = location.replace('airport_', '');
      const translation = t(`airports.${airportKey}`);
      if (translation !== `airports.${airportKey}`) {
        return translation;
      }
    }
    
    if (location.startsWith('station_')) {
      const stationKey = location.replace('station_', '');
      const translation = t(`stations.${stationKey}`);
      if (translation !== `stations.${stationKey}`) {
        return translation;
      }
    }
    
    const airportTrans = t(`airports.${location}`);
    if (airportTrans !== `airports.${location}`) return airportTrans;
    
    const stationTrans = t(`stations.${location}`);
    if (stationTrans !== `stations.${location}`) return stationTrans;
    
    return location;
  };

  // Couleurs pour les graphiques
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin_dashboard.title')}</h1>
              <p className="text-gray-600">{t('admin_dashboard.subtitle')}</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title={t('admin_dashboard.stats.total_vehicles')}
              value={stats.totalVehicles}
              subtitle={t('admin_dashboard.stats.in_fleet')}
              icon={Car}
              color="blue"
            />
            <StatCard
              title={t('admin_dashboard.stats.performance')}
              value={`${stats.performanceRate}%`}
              subtitle={t('admin_dashboard.stats.reservation_ratio')}
              icon={Zap}
              trend={stats.monthlyGrowth}
              color="green"
            />
            <StatCard
              title={t('admin_dashboard.stats.total_revenue')}
              value={`${stats.totalRevenue.toLocaleString()} MAD`}
              subtitle={t('admin_dashboard.stats.this_month')}
              icon={DollarSign}
              color="purple"
            />
            <StatCard
              title={t('admin_dashboard.stats.active_reservations')}
              value={stats.totalReservations}
              subtitle={t('admin_dashboard.stats.currently_ongoing')}
              icon={Users}
              color="orange"
            />
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Graphique des revenus */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('admin_dashboard.charts.revenue.title')}</h3>
                    <p className="text-sm text-gray-600">{t('admin_dashboard.charts.revenue.subtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} MAD`, 'Revenu']}
                      labelFormatter={(label) => `Mois: ${label}`}
                    />
                    <Bar dataKey="value" fill="#8884d8" name="Revenu" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Graphique des catégories */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Car className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('admin_dashboard.charts.categories.title')}</h3>
                    <p className="text-sm text-gray-600">{t('admin_dashboard.charts.categories.subtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} véhicules`, 'Quantité']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Graphique des tendances de réservations */}
            <div className="bg-white rounded-xl shadow-sm border p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('admin_dashboard.charts.trends.title')}</h3>
                    <p className="text-sm text-gray-600">{t('admin_dashboard.charts.trends.subtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reservationTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} réservations`, 'Quantité']}
                      labelFormatter={(label) => `Mois: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#ff7300" 
                      strokeWidth={2}
                      name="Réservations"
                    />
                  </LineChart>
                </ResponsiveContainer>
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
                  <h3 className="text-lg font-semibold text-gray-900">{t('admin_dashboard.recent_reservations.title')}</h3>
                  <p className="text-sm text-gray-600">{t('admin_dashboard.recent_reservations.subtitle')}</p>
                </div>
              </div>
              <Link to="/admin/reservations">
                <Button variant="ghost" size="sm" className="text-blue-600">
                  {t('admin_dashboard.actions.see_all')} <ChevronRight className="h-4 w-4 ml-1" />
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
                  <p className="text-sm">{t('admin_dashboard.messages.no_recent_reservations')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}