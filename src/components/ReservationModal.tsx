import { Dialog } from "@headlessui/react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { emailJSService } from "@/services/emailJSService";

type Car = Database["public"]["Tables"]["cars"]["Row"];
type ReservationInsert = Database["public"]["Tables"]["reservations"]["Insert"];
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
  const [quantity, setQuantity] = useState(1);
  const [maxAvailable, setMaxAvailable] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    setQuantity(1);
    if (isOpen && car && searchData) {
      calculateMaxAvailable();
    }
  }, [isOpen]);

  const calculateMaxAvailable = async () => {
    if (!car || !searchData?.pickupDate || !searchData?.returnDate) return;

    const startDate = searchData.pickupDate.toISOString().split('T')[0];
    const endDate = searchData.returnDate.toISOString().split('T')[0];
    
    try {
      const { data: carData } = await supabase
        .from('cars')
        .select('quantity')
        .eq('id', car.id)
        .single();

      const { data: reservations } = await supabase
        .from('reservations')
        .select('quantity')
        .eq('car_id', car.id)
        .eq('status', 'active')
        .or(`and(pickup_date.lte.${endDate},return_date.gte.${startDate})`);

      const totalReserved = reservations?.reduce((sum, r) => sum + (r.quantity || 1), 0) || 0;
      const available = (carData?.quantity || 0) - totalReserved;
      
      setMaxAvailable(Math.max(0, available));
      
      // Ajuste automatiquement la quantité
      if (quantity > available) {
        setQuantity(Math.max(1, available));
      }
    } catch (error) {
      console.error('Erreur calcul disponibilité:', error);
    }
  };

  // 🔥 CORRECTION : Une seule fonction checkRealTimeAvailability
  const checkRealTimeAvailability = async (requestedQuantity: number): Promise<boolean> => {
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
        .select('quantity')
        .eq('car_id', car.id)
        .eq('status', 'active')
        .or(`and(pickup_date.lte.${endDate},return_date.gte.${startDate})`);

      const totalReserved = reservations?.reduce((sum, r) => sum + (r.quantity || 1), 0) || 0;
      const availableQuantity = carData.quantity - totalReserved;

      console.log(`📊 Disponibilité temps réel: ${carData.quantity} - ${totalReserved} = ${availableQuantity}`);
      
      return requestedQuantity <= availableQuantity;
      
    } catch (error) {
      console.error('Erreur vérification disponibilité:', error);
      return false;
    }
  };

  const handleConfirm = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour réserver un véhicule.",
        variant: "destructive",
      });
      return;
    }

    if (quantity < 1) {
      toast({
        title: "Quantité invalide",
        description: "La quantité doit être au moins 1.",
        variant: "destructive",
      });
      return;
    }

    // 🔥 CORRECTION : Appel correct de la fonction
    const isAvailable = await checkRealTimeAvailability(quantity);
    if (!isAvailable) {
      toast({
        title: "Quantité non disponible",
        description: "La quantité demandée n'est plus disponible. Veuillez réduire le nombre de véhicules.",
        variant: "destructive",
      });
      return;
    }
  
    try {
      // Récupérer le profil de l'utilisateur
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name, telephone, email")
        .eq("id", user.id)
        .single();
  
      // Utiliser l'email du profil s'il existe, sinon l'email de l'auth
      const clientEmail = userProfile?.email || user.email;
      const clientName = userProfile?.full_name || user.email;
      const clientPhone = userProfile?.telephone;
  
      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
  
      const pickupDateStr = formatDateForDB(searchData.pickupDate);
      const returnDateStr = formatDateForDB(searchData.returnDate);
      const totalPrice = car.price * quantity;
  
      const { data: newReservation, error } = await supabase
        .from("reservations")
        .insert([
          {
            user_id: user.id,
            car_id: car.id,
            car_name: car.name,
            car_image: car.image_url,
            car_category: car.category,
            car_price: car.price,
            pickup_location: searchData.pickupLocation,
            return_location: searchData.sameLocation
              ? searchData.pickupLocation
              : searchData.returnLocation,
            pickup_date: pickupDateStr,
            pickup_time: searchData.pickupTime,
            return_date: returnDateStr,
            return_time: searchData.returnTime,
            total_price: totalPrice,
            status: "active",
            date: new Date().toISOString(),
            quantity: quantity,
          }
        ])
        .select()
        .single();
  
      if (error) throw error;
  
      console.log('✅ Réservation créée:', newReservation);
  
      // Préparer les données pour l'email avec les bonnes informations
      const reservationData = {
        reservationId: newReservation.id,
        clientName: clientName,
        clientEmail: clientEmail,
        clientPhone: clientPhone,
        carName: car.name,
        carCategory: car.category,
        pickupDate: searchData.pickupDate.toLocaleDateString('fr-FR'),
        pickupTime: searchData.pickupTime,
        returnDate: searchData.returnDate.toLocaleDateString('fr-FR'),
        returnTime: searchData.returnTime,
        pickupLocation: searchData.pickupLocation,
        returnLocation: searchData.sameLocation ? searchData.pickupLocation : searchData.returnLocation,
        totalPrice: totalPrice
      };
  
      console.log('📧 Données pour email:', reservationData);
  
      const emailResult = await emailJSService.sendNewReservationEmails(reservationData);
      
      if (!emailResult.success) {
        console.warn('⚠️ Emails non envoyés mais réservation créée:', emailResult.error);
      }
  
      toast({
        title: "Réservation réussie",
        description: `${quantity} x ${car.name} réservé(s).`,
      });
  
      onReserved();
      onClose();
    } catch (err) {
      console.error("❌ Erreur réservation:", err);
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer la réservation.",
        variant: "destructive",
      });
    }
  };

  if (!car || !searchData) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
    >
      <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md">
        <Dialog.Title className="text-lg font-semibold mb-4">
          Réserver {car.name}
        </Dialog.Title>

        <img
          src={car.image_url}
          alt={car.name}
          className="w-full h-48 object-cover rounded mb-4"
        />

        <p className="mb-2 text-sm text-gray-600">{car.category}</p>
        <p className="mb-4 font-semibold">{car.price} MAD / jour</p>

        <label className="block mb-2 font-medium">
          Quantité {maxAvailable > 0 && `(max: ${maxAvailable})`}
        </label>
        <input
          type="number"
          min={1}
          max={maxAvailable}
          value={quantity}
          onChange={(e) => {
            const newQuantity = parseInt(e.target.value) || 1;
            setQuantity(Math.min(Math.max(1, newQuantity), maxAvailable));
          }}
          className="border rounded p-2 w-full mb-4"
        />

        {maxAvailable === 0 && (
          <p className="text-red-600 text-sm mb-4">
            Ce véhicule n'est plus disponible pour les dates sélectionnées.
          </p>
        )}

        <p className="mb-4 text-sm text-gray-700">
          Prix total: <span className="font-semibold">{car.price * quantity} MAD</span>
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={maxAvailable === 0}
          >
            {maxAvailable === 0 ? 'Indisponible' : 'Confirmer'}
          </Button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};