import { Dialog } from "@headlessui/react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { emailJSService } from "@/services/emailJSService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

    const startDate = searchData.pickupDate.toISOString().split('T')[0];
    const endDate = searchData.returnDate.toISOString().split('T')[0];

    try {
      const { data: carData } = await supabase
        .from('cars')
        .select('quantity')
        .eq('id', car.id)
        .single();

      if (!carData) return false;

      const { data: reservations } = await supabase
        .from('reservations')
        .select('*')
        .eq('car_id', car.id)
        .eq('status', 'active')
        .or(`and(pickup_date.lte.${endDate},return_date.gte.${startDate})`);

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
    
    const startDate = new Date(searchData.pickupDate);
    const endDate = new Date(searchData.returnDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return car.price * diffDays;
  };

  const validateGuestInfo = () => {
    if (!guestInfo.full_name.trim()) {
      toast({
        title: "Information manquante",
        description: "Veuillez saisir votre nom complet.",
        variant: "destructive",
      });
      return false;
    }

    if (!guestInfo.email.trim()) {
      toast({
        title: "Information manquante",
        description: "Veuillez saisir votre adresse email.",
        variant: "destructive",
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestInfo.email)) {
      toast({
        title: "Email invalide",
        description: "Veuillez saisir une adresse email valide.",
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
        title: "Véhicule non disponible",
        description: "Ce véhicule n'est plus disponible pour les dates sélectionnées.",
        variant: "destructive",
      });
      return;
    }
  
    setIsLoading(true);
  
    try {
      const pickupDateStr = searchData.pickupDate.toISOString().split('T')[0];
      const returnDateStr = searchData.returnDate.toISOString().split('T')[0];
      const totalPrice = calculateTotalPrice();
  
      let newReservationId;
      let clientEmail = "";
      let clientName = "";
      let clientPhone = "";
  
      if (user) {
        // Utilisateur connecté - insertion normale
        const reservationData = {
          car_id: car.id,
          car_name: car.name,
          car_category: car.category || 'Non spécifié',
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
          status: "active",
          date: new Date().toISOString().split('T')[0],
          user_id: user.id,
        };
  
        const { data: newReservation, error } = await supabase
          .from("reservations")
          .insert([reservationData])
          .select()
          .single();
  
        if (error) throw error;
        newReservationId = newReservation.id;
  
        // Récupérer les infos utilisateur
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("full_name, telephone, email")
          .eq("id", user.id)
          .single();
  
        clientEmail = userProfile?.email || user.email;
        clientName = userProfile?.full_name || user.email;
        clientPhone = userProfile?.telephone || "Non renseigné";
  
      } else {
        // Utilisateur non connecté - utiliser la fonction RPC
        const { data: reservationId, error } = await supabase.rpc(
          'create_guest_reservation' as any, // Bypass TypeScript temporairement
          {
            p_car_id: car.id,
            p_car_name: car.name,
            p_car_category: car.category || 'Non spécifié',
            p_car_price: car.price,
            p_pickup_location: searchData.pickupLocation,
            p_return_location: searchData.sameLocation
              ? searchData.pickupLocation
              : searchData.returnLocation || searchData.pickupLocation,
            p_pickup_date: pickupDateStr,
            p_pickup_time: searchData.pickupTime,
            p_return_date: returnDateStr,
            p_return_time: searchData.returnTime,
            p_total_price: totalPrice,
            p_guest_email: guestInfo.email.toLowerCase(),
            p_guest_name: guestInfo.full_name,
            p_guest_phone: guestInfo.telephone || '',
            p_car_image: car.image_url || null,
            p_date: new Date().toISOString().split('T')[0]
          }
        );
  
        if (error) throw error;
        newReservationId = reservationId;
  
        clientEmail = guestInfo.email;
        clientName = guestInfo.full_name;
        clientPhone = guestInfo.telephone || "Non renseigné";
  
        // Stocker dans localStorage
        const guestReservations = localStorage.getItem("guest_reservations");
        const reservationsArray = guestReservations ? JSON.parse(guestReservations) : [];
        reservationsArray.push(newReservationId);
        localStorage.setItem("guest_reservations", JSON.stringify(reservationsArray));
      }
  
      // Envoyer l'email de confirmation
      await emailJSService.sendNewReservationEmails({
        reservationId: newReservationId,
        clientName,
        clientEmail,
        clientPhone,
        carName: car.name,
        carCategory: car.category,
        pickupDate: searchData.pickupDate.toLocaleDateString('fr-FR'),
        pickupTime: searchData.pickupTime,
        returnDate: searchData.returnDate.toLocaleDateString('fr-FR'),
        returnTime: searchData.returnTime,
        pickupLocation: searchData.pickupLocation,
        returnLocation: searchData.sameLocation ? searchData.pickupLocation : (searchData.returnLocation || searchData.pickupLocation),
        totalPrice,
      });
  
      toast({
        title: "Réservation réussie !",
        description: `${car.name} réservé avec succès.`,
      });
  
      onReserved();
      onClose();
    } catch (err: any) {
      console.error("❌ Erreur réservation:", err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'effectuer la réservation.",
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
          Réserver {car.name}
        </Dialog.Title>

        <img
          src={car.image_url || "/placeholder-car.jpg"}
          alt={car.name}
          className="w-full h-48 object-cover rounded mb-4"
        />

        <p className="mb-2 text-sm text-gray-600">{car.category}</p>
        <p className="mb-4 font-semibold">{car.price} MAD / jour</p>

        {/* Informations invité */}
        {!user && (
          <div className="mb-4 space-y-3">
            <h4 className="font-medium text-sm">Vos informations</h4>
            <div>
              <Label htmlFor="full_name">Nom complet *</Label>
              <Input
                id="full_name"
                value={guestInfo.full_name}
                onChange={(e) => setGuestInfo({...guestInfo, full_name: e.target.value})}
                placeholder="Votre nom complet"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={guestInfo.email}
                onChange={(e) => setGuestInfo({...guestInfo, email: e.target.value})}
                placeholder="votre@email.com"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                value={guestInfo.telephone}
                onChange={(e) => setGuestInfo({...guestInfo, telephone: e.target.value})}
                placeholder="Votre numéro de téléphone"
                className="mt-1"
              />
            </div>
          </div>
        )}

        {!isAvailable && (
          <p className="text-red-600 text-sm mb-4">
            Ce véhicule n'est plus disponible pour les dates sélectionnées.
          </p>
        )}

        <p className="mb-4 text-sm text-gray-700">
          Prix total: <span className="font-semibold">{totalPrice} MAD</span>
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!isAvailable || isLoading}
          >
            {isLoading ? "Réservation..." : (!isAvailable ? 'Indisponible' : 'Confirmer')}
          </Button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};