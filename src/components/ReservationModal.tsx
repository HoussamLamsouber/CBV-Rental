import { Dialog } from "@headlessui/react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { emailJSService } from "@/services/emailJSService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { formatDisplayDate, calculateDaysDifference, formatDateForDB } from "@/utils/dateUtils";

type Car = Database["public"]["Tables"]["cars"]["Row"];
type SearchData = {
  pickupLocation: string;
  returnLocation?: string;
  sameLocation: boolean;
  pickupDate: Date;
  returnDate: Date;
  pickupTime: string;
  returnTime: string;
  carType?: string;
  priceRange?: [number, number];
  transmission?: string;
  fuel?: string;
};

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  car: Car | null;
  searchData: SearchData | null;
  user: any;
  onReserved: () => void;
}

export const ReservationModal = ({
  isOpen,
  onClose,
  car,
  searchData,
  user,
  onReserved,
}: ReservationModalProps) => {
  const [isAvailable, setIsAvailable] = useState(true);
  const [guestInfo, setGuestInfo] = useState({
    full_name: "",
    email: "",
    telephone: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Fonction pour traduire la catégorie de voiture - SIMPLIFIÉE comme dans Offres
  const getTranslatedCategory = (category: string | null) => {
    if (!category) return t('reservation_modal.messages.not_specified');
    
    // Utilisation directe comme dans la page Offres
    const translation = t(`reservation_modal.categories.${category}`);
    return translation.startsWith('reservation_modal.categories.') ? category : translation;
  };

  // Fonction pour traduire les lieux (aéroports et gares)
  const getTranslatedLocation = (locationValue: string) => {
    // Essayer d'abord les aéroports
    const airportKey = locationValue.replace('airport_', '');
    const airportTranslation = t(`airports.${airportKey}`);
    if (airportTranslation && !airportTranslation.startsWith('airports.')) {
      return airportTranslation;
    }
    
    // Essayer ensuite les gares
    const stationKey = locationValue.replace('station_', '');
    const stationTranslation = t(`stations.${stationKey}`);
    if (stationTranslation && !stationTranslation.startsWith('stations.')) {
      return stationTranslation;
    }
    
    // Retourner la valeur originale si aucune traduction trouvée
    return locationValue;
  };

  useEffect(() => {
    if (isOpen) {
      setGuestInfo({ full_name: "", email: "", telephone: "" });
      if (car && searchData) {
        checkAvailability();
      }
    }
  }, [isOpen, car, searchData]);

  const checkAvailability = async () => {
    const available = await checkRealTimeAvailability();
    setIsAvailable(available);
  };

  const checkRealTimeAvailability = async (): Promise<boolean> => {
    if (!car || !searchData?.pickupDate || !searchData?.returnDate) return false;

    try {
      const { data: carData, error } = await supabase
        .from('cars')
        .select('available, quantity')
        .eq('id', car.id)
        .is('is_deleted', false)
        .single();

      if (error) throw error;

      if (!carData.available) {
        return false;
      }

      const startUTC = formatDateForDB(searchData.pickupDate);
      const endUTC = formatDateForDB(searchData.returnDate);

      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('id')
        .eq('car_id', car.id)
        .eq('status', 'accepted')
        .or(`and(pickup_date.lte.${endUTC},return_date.gte.${startUTC})`);

      if (reservationsError) throw reservationsError;

      const totalReserved = reservations?.length || 0;
      const availableQuantity = carData.quantity - totalReserved;

      return availableQuantity >= 1;
      
    } catch (error) {
      console.error('Erreur vérification disponibilité:', error);
      return false;
    }
  };

  const calculateTotalPrice = () => {
    if (!car || !searchData) return 0;
    const numberOfDays = calculateDaysDifference(searchData.pickupDate, searchData.returnDate);
    return car.price * numberOfDays;
  };

  const validateGuestInfo = () => {
    if (!guestInfo.full_name.trim()) {
      toast({
        title: t('reservation_modal.messages.missing_information'),
        description: t('reservation_modal.messages.enter_full_name'),
        variant: "destructive",
      });
      return false;
    }

    if (!guestInfo.email.trim()) {
      toast({
        title: t('reservation_modal.messages.missing_information'),
        description: t('reservation_modal.messages.enter_email'),
        variant: "destructive",
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestInfo.email)) {
      toast({
        title: t('reservation_modal.messages.invalid_email'),
        description: t('reservation_modal.messages.enter_valid_email'),
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleConfirm = async () => {
    if (!car || !searchData) return;

    if (!user && !validateGuestInfo()) return;

    const isAvailable = await checkRealTimeAvailability();
    if (!isAvailable) {
      toast({
        title: t('reservation_modal.messages.vehicle_unavailable'),
        description: t('reservation_modal.messages.vehicle_unavailable_description'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const pickupDateStr = formatDateForDB(searchData.pickupDate);
      const returnDateStr = formatDateForDB(searchData.returnDate);
      const totalPrice = calculateTotalPrice();

      let newReservationId;
      let clientEmail = "";
      let clientName = "";
      let clientPhone = "";

      const reservationData: any = {
        car_id: car.id,
        car_name: car.name,
        car_category: getTranslatedCategory(car.category),
        car_price: car.price,
        car_image: car.image_url || null,
        pickup_location: searchData.pickupLocation,
        return_location: searchData.sameLocation
          ? searchData.pickupLocation
          : searchData.returnLocation || searchData.pickupLocation,
        pickup_date: pickupDateStr,
        pickup_time: searchData.pickupTime,
        return_date: returnDateStr,
        return_time: searchData.returnTime,
        total_price: totalPrice,
        status: "pending",
        date: formatDateForDB(new Date()),
      };

      if (user) {
        reservationData.user_id = user.id;
        
        const { data: newReservation, error } = await supabase
          .from("reservations")
          .insert([reservationData])
          .select()
          .single();

        if (error) throw error;
        newReservationId = newReservation.id;

        const { data: userProfile } = await supabase
          .from("profiles")
          .select("full_name, telephone, email")
          .eq("id", user.id)
          .single();

        clientEmail = userProfile?.email || user.email;
        clientName = userProfile?.full_name || user.email;
        clientPhone = userProfile?.telephone || t('reservation_modal.messages.not_provided');

      } else {
        reservationData.guest_name = guestInfo.full_name;
        reservationData.guest_email = guestInfo.email.toLowerCase();
        reservationData.guest_phone = guestInfo.telephone || '';

        const { data: newReservation, error } = await supabase
          .from("reservations")
          .insert([reservationData])
          .select()
          .single();

        if (error) throw error;
        newReservationId = newReservation.id;

        clientEmail = guestInfo.email;
        clientName = guestInfo.full_name;
        clientPhone = guestInfo.telephone || t('reservation_modal.messages.not_provided');

        const guestReservations = localStorage.getItem("guest_reservations");
        const reservationsArray = guestReservations ? JSON.parse(guestReservations) : [];
        reservationsArray.push(newReservationId);
        localStorage.setItem("guest_reservations", JSON.stringify(reservationsArray));
      }

      await emailJSService.sendNewReservationAdminEmail({
        reservationId: newReservationId,
        clientName,
        clientEmail,
        clientPhone,
        carName: car.name,
        carCategory: getTranslatedCategory(car.category),
        pickupDate: formatDisplayDate(searchData.pickupDate.toString()),
        pickupTime: searchData.pickupTime,
        returnDate: formatDisplayDate(searchData.returnDate.toString()),
        returnTime: searchData.returnTime,
        pickupLocation: getTranslatedLocation(searchData.pickupLocation),
        returnLocation: searchData.sameLocation 
          ? getTranslatedLocation(searchData.pickupLocation) 
          : getTranslatedLocation(searchData.returnLocation || searchData.pickupLocation),
        totalPrice,
      });

      toast({
        title: t('reservation_modal.messages.request_sent'),
        description: t('reservation_modal.messages.request_sent_description'),
      });

      onReserved();
      onClose();
    } catch (err: any) {
      console.error("Erreur réservation:", err);
      toast({
        title: t("error"),
        description: err.message || t('reservation_modal.messages.cannot_make_reservation'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!car || !searchData) return null;

  const totalPrice = calculateTotalPrice();

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
    >
      <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <Dialog.Title className="text-lg font-semibold mb-4">
          {t('reservation_modal.title').replace('{carName}', car.name)}
        </Dialog.Title>

        <img
          src={car.image_url || "/placeholder-car.jpg"}
          alt={car.name}
          className="w-full h-48 object-cover rounded mb-4"
        />

        {/* CORRECTION : Utilisation de getTranslatedCategory pour afficher la catégorie traduite */}
        <p className="mb-2 text-sm text-gray-600">{getTranslatedCategory(car.category)}</p>
        <p className="mb-4 font-semibold">{car.price} {t('reservation_modal.currency_per_day')}</p>

        <div className="mb-4 space-y-2 text-sm">
          <p><strong>{t('reservation_modal.fields.pickup_location')}:</strong> {getTranslatedLocation(searchData.pickupLocation)}</p>
          <p><strong>{t('reservation_modal.fields.return_location')}:</strong> {getTranslatedLocation(searchData.sameLocation ? searchData.pickupLocation : (searchData.returnLocation || searchData.pickupLocation))}</p>
          <p><strong>{t('reservation_modal.fields.pickup_date')}:</strong> {formatDisplayDate(searchData.pickupDate.toString())} {t('reservation_modal.at_time')} {searchData.pickupTime}</p>
          <p><strong>{t('reservation_modal.fields.return_date')}:</strong> {formatDisplayDate(searchData.returnDate.toString())} {t('reservation_modal.at_time')} {searchData.returnTime}</p>
        </div>

        {!user && (
          <div className="mb-4 space-y-3">
            <h4 className="font-medium text-sm">{t('reservation_modal.guest_info.title')}</h4>
            <div>
              <Label htmlFor="full_name">{t('reservation_modal.fields.full_name')} *</Label>
              <Input
                id="full_name"
                value={guestInfo.full_name}
                onChange={(e) => setGuestInfo({...guestInfo, full_name: e.target.value})}
                placeholder={t('reservation_modal.placeholders.full_name')}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">{t('reservation_modal.fields.email')} *</Label>
              <Input
                id="email"
                type="email"
                value={guestInfo.email}
                onChange={(e) => setGuestInfo({...guestInfo, email: e.target.value})}
                placeholder={t('reservation_modal.placeholders.email')}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="telephone">{t('reservation_modal.fields.phone')}</Label>
              <Input
                id="telephone"
                value={guestInfo.telephone}
                onChange={(e) => setGuestInfo({...guestInfo, telephone: e.target.value})}
                placeholder={t('reservation_modal.placeholders.phone')}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {!isAvailable && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-600 text-sm">
              ⚠️ {t('reservation_modal.messages.vehicle_no_longer_available')}
            </p>
          </div>
        )}

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-blue-700 text-sm">
            <strong>{t('reservation_modal.total_price')}:</strong> <span className="font-semibold text-lg">{totalPrice} {t('reservation_modal.currency')}</span>
          </p>
          <p className="text-blue-600 text-xs mt-1">
            {t('reservation_modal.reservation_confirmation_note')}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('reservation_modal.actions.cancel')}
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!isAvailable || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading 
              ? t('reservation_modal.actions.reserving') 
              : (!isAvailable 
                  ? t('reservation_modal.actions.unavailable') 
                  : t('reservation_modal.actions.confirm_reservation')
                )
            }
          </Button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};