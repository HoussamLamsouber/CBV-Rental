import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import type { Database } from "@/integrations/supabase/types";
import { formatDisplayDate } from "@/utils/dateUtils";
import { emailJSService } from "@/services/emailJSService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, X } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { 
  Calendar, 
  MapPin, 
  Car, 
  User, 
  Phone, 
  Mail, 
  Clock,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTranslation } from "react-i18next";

type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type ReservationWithProfile = ReservationRow & {
  client_name?: string;
  client_email?: string;
  client_phone?: string;
};

const MaReservation = () => {
  const [reservations, setReservations] = useState<ReservationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    let mounted = true;

    const loadReservations = async () => {
      try {
        setLoading(true);

        if (user) {
          await loadUserReservations();
        } else {
          await loadGuestReservations();
        }
      } catch (err) {
        console.error(err);
        if (mounted) toast({ 
          title: t("error"), 
          description: t('ma_reservation.messages.cannot_load_reservations'), 
          variant: "destructive" 
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const loadUserReservations = async () => {
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (reservationsError) throw reservationsError;

      if (!reservationsData || reservationsData.length === 0) {
        setReservations([]);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, telephone")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Erreur chargement profil:", profileError);
      }

      const reservationsWithProfile: ReservationWithProfile[] = reservationsData.map(reservation => ({
        ...reservation,
        client_name: profileData?.full_name || user.email || t('ma_reservation.messages.not_specified'),
        client_email: profileData?.email || user.email,
        client_phone: profileData?.telephone
      }));

      setReservations(reservationsWithProfile);
    };

    const loadGuestReservations = async () => {
      const guestReservations = localStorage.getItem("guest_reservations");
      if (guestReservations) {
        const reservationIds = JSON.parse(guestReservations);
        
        if (reservationIds.length > 0) {
          const { data: reservationsData, error: reservationsError } = await supabase
            .from("reservations")
            .select("*")
            .in("id", reservationIds)
            .neq("status", "cancelled")
            .order("created_at", { ascending: false });
    
          if (reservationsError) {
            await loadGuestReservationsFallback(reservationIds);
            return;
          }
    
          const reservationsWithGuestData: ReservationWithProfile[] = (reservationsData || []).map(reservation => ({
            ...reservation,
            client_name: reservation.guest_name || t('ma_reservation.messages.guest'),
            client_email: reservation.guest_email || t('ma_reservation.messages.not_specified'),
            client_phone: reservation.guest_phone
          }));
    
          setReservations(reservationsWithGuestData);
        } else {
          setReservations([]);
        }
      } else {
        setReservations([]);
      }
    };
    
    const loadGuestReservationsFallback = async (reservationIds: string[]) => {
      try {
        const reservations: ReservationWithProfile[] = [];
        
        for (const id of reservationIds) {
          const { data: reservation, error } = await supabase
            .from("reservations")
            .select("*")
            .eq("id", id)
            .single();
    
          if (!error && reservation) {
            reservations.push({
              ...reservation,
              client_name: reservation.guest_name || t('ma_reservation.messages.guest'),
              client_email: reservation.guest_email || t('ma_reservation.messages.not_specified'),
              client_phone: reservation.guest_phone
            });
          }
        }
    
        setReservations(reservations);
      } catch (err) {
        console.error("Erreur fallback chargement réservations:", err);
        setReservations([]);
      }
    };

    loadReservations();
    return () => { mounted = false; };
  }, [toast, navigate, user, t]);

  const handleCancelReservation = async (res: ReservationWithProfile) => {
    if (!confirm(t('ma_reservation.messages.confirm_cancellation'))) {
      return;
    }
  
    try {
      setCancellingId(res.id);
  
      // 🔥 REMPLACER LA SUPPRESSION PAR UN SOFT DELETE
      const { error } = await supabase
        .from("reservations")
        .update({ 
          status: "cancelled",
          updated_at: new Date().toISOString()
        })
        .eq("id", res.id);
  
      if (error) throw error;
  
      const currentLanguage = i18n.language;
  
      console.log('📧 Tentative envoi emails annulation pour:', res.client_email);
  
      // Envoyer les emails d'annulation
      const emailResult = await emailJSService.sendCancellationEmails({
        reservationId: res.id,
        clientName: res.client_name || t('ma_reservation.messages.guest'),
        clientEmail: res.client_email || t('ma_reservation.messages.not_specified'),
        clientPhone: res.client_phone,
        carName: res.car_name,
        carCategory: getTranslatedCategory(res.car_category),
        pickupDate: formatDisplayDate(res.pickup_date),
        pickupTime: res.pickup_time,
        returnDate: formatDisplayDate(res.return_date),
        returnTime: res.return_time,
        pickupLocation: getTranslatedLocation(res.pickup_location),
        returnLocation: getTranslatedLocation(res.return_location),
        totalPrice: res.total_price,
        language: currentLanguage
      });
  
      console.log('📧 Résultat emails annulation:', emailResult);
  
      if (!emailResult.success) {
        console.warn('Emails d\'annulation non envoyés:', emailResult.error);
      } else {
        console.log('✅ Emails d\'annulation envoyés avec succès');
      }
  
      toast({ 
        title: t('ma_reservation.messages.reservation_cancelled'), 
        description: t('ma_reservation.messages.reservation_cancelled_for').replace('{carName}', res.car_name)
      });
      
      // 🔥 METTRE À JOUR LE STATUT LOCALEMENT AU LIEU DE SUPPRIMER
      setReservations(prev => prev.map(r => 
        r.id === res.id ? { ...r, status: 'cancelled' } : r
      ));
    } catch (err) {
      console.error("Erreur annulation:", err);
      toast({ 
        title: t("error"), 
        description: t('ma_reservation.messages.cannot_cancel_reservation'), 
        variant: "destructive" 
      });
    } finally {
      setCancellingId(null);
    }
  };

  const isReservationPassed = (res: ReservationWithProfile): boolean => {
    const now = new Date();
    
    // Combiner la date de retour et l'heure de retour
    const [returnHours, returnMinutes] = res.return_time.split(':').map(Number);
    const returnDateTime = new Date(res.return_date);
    returnDateTime.setHours(returnHours, returnMinutes, 0, 0);
    
    // Vérifier si la date/heure de retour est passée
    return now > returnDateTime;
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
    const categoryTranslation = t(`offers_page.categories.${category}`);
    if (categoryTranslation && !categoryTranslation.startsWith('offers_page.categories.')) {
      return categoryTranslation;
    }
    return category;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        label: t('ma_reservation.status.pending'), 
        color: "bg-yellow-100 text-yellow-800" 
      },
      accepted: { 
        label: t('ma_reservation.status.accepted'), 
        color: "bg-green-100 text-green-800" 
      },
      active: { 
        label: t('ma_reservation.status.active'), 
        color: "bg-blue-100 text-blue-800" 
      },
      completed: { 
        label: t('ma_reservation.status.completed'), 
        color: "bg-gray-100 text-gray-800" 
      },
      refused: { 
        label: t('ma_reservation.status.refused'), 
        color: "bg-red-100 text-red-800" 
      },
      cancelled: { 
        label: t('ma_reservation.status.cancelled'), 
        color: "bg-red-100 text-red-800" 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge variant="secondary" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  // 🔥 FILTRER LES RÉSERVATIONS ANNULÉES POUR NE PAS LES AFFICHER
  const activeReservations = reservations.filter(res => res.status !== 'cancelled');

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message={t('ma_reservation.messages.loading_reservations')} />
        </div>
      );
    }

    if (!reservations.length) {
      return (
        <div className="flex-1 text-center py-12">
          <div className="max-w-md mx-auto">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('ma_reservation.messages.no_reservations')}
            </h1>
            <p className="text-gray-600 mb-6">
              {user 
                ? t('ma_reservation.messages.no_reservations_user') 
                : t('ma_reservation.messages.no_reservations_guest')
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate("/")}>
                {t('ma_reservation.actions.view_vehicles')}
              </Button>
              {!user && (
                <Button variant="outline" onClick={() => navigate("/auth")}>
                  {t('auth.tabs.signup')}
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1">
        <div className="flex items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {t('ma_reservation.title')}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base mt-1">
              {t('ma_reservation.messages.reservations_found').replace('{count}', reservations.length.toString())}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6">
          {activeReservations.map(res => (
            <Card key={res.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  <div className="sm:w-48 flex-shrink-0 relative overflow-hidden rounded">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="relative group w-full h-full">
                          <img
                            src={res.car_image || "/placeholder-car.jpg"}
                            alt={res.car_name}
                            className="w-full h-40 sm:h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <ZoomIn className="text-white w-6 h-6" />
                          </div>
                        </button>
                      </DialogTrigger>

                      <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none">
                        <img
                          src={res.car_image || "/placeholder-car.jpg"}
                          alt={res.car_name}
                          className="w-full h-auto rounded-lg"
                        />
                      </DialogContent>
                    </Dialog>
                  </div>


                  
                  <div className="flex-1 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Car className="h-4 w-4 text-gray-400" />
                          <h2 className="font-semibold text-lg text-gray-900">{res.car_name}</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{t(`offers_page.categories.${res.car_category}`)}</Badge>
                          {getStatusBadge(res.status)}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{res.total_price} {t('ma_reservation.currency')}</div>
                        <div className="text-sm text-gray-500">{t('ma_reservation.total_price')}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div>
                            <div className="font-medium">
                              {t('ma_reservation.messages.from_date').replace('{date}', formatDisplayDate(res.pickup_date))}
                            </div>
                            <div className="text-gray-600">{res.pickup_time}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div>
                            <div className="font-medium">
                              {t('ma_reservation.messages.to_date').replace('{date}', formatDisplayDate(res.return_date))}
                            </div>
                            <div className="text-gray-600">{res.return_time}</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-medium">{t('ma_reservation.pickup')}</div>
                            <div className="text-gray-600">{getTranslatedLocation(res.pickup_location)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-medium">{t('ma_reservation.return')}</div>
                            <div className="text-gray-600">{getTranslatedLocation(res.return_location)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-sm">{t('ma_reservation.client_info')}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">{res.client_email}</span>
                        </div>
                        {res.client_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-600">{res.client_phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {(res.status === 'pending' || res.status === 'accepted') && !isReservationPassed(res) ? (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelReservation(res)}
                          disabled={cancellingId === res.id}
                          className="w-full sm:w-auto flex items-center gap-2"
                        >
                          {cancellingId === res.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              {t('ma_reservation.actions.cancelling')}
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              {t('ma_reservation.actions.cancel_reservation')}
                            </>
                          )}
                        </Button>
                      </div>
                    ) : res.status === 'cancelled' ? (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          {t('ma_reservation.messages.reservation_cancelled')}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <AlertTriangle className="h-4 w-4 text-gray-400" />
                          {isReservationPassed(res) 
                            ? t('ma_reservation.messages.cannot_cancel_passed')
                            : t('ma_reservation.messages.cannot_cancel')
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="container mx-auto px-4 py-6 sm:py-8 flex-1">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
};

export default MaReservation;