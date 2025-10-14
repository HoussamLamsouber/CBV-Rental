import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import type { Database } from "@/integrations/supabase/types";
import { formatDisplayDate } from "@/utils/dateUtils";
import { emailJSService } from "@/services/emailJSService";
import { useAuth } from "@/contexts/AuthContext";

type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Type pour les réservations avec les données du profil
type ReservationWithProfile = ReservationRow & {
  client_name?: string;
  client_email?: string;
  client_phone?: string;
};

const MaReservation = () => {
  const [reservations, setReservations] = useState<ReservationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;

    const loadReservations = async () => {
      try {
        setLoading(true);

        if (user) {
          // Utilisateur connecté
          await loadUserReservations();
        } else {
          // Invité
          await loadGuestReservations();
        }
      } catch (err) {
        console.error(err);
        if (mounted) toast({ 
          title: "Erreur", 
          description: "Impossible de récupérer vos réservations", 
          variant: "destructive" 
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const loadUserReservations = async () => {
      // Étape 1: Charger les réservations de l'utilisateur
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (reservationsError) throw reservationsError;

      if (!reservationsData || reservationsData.length === 0) {
        setReservations([]);
        return;
      }

      // Étape 2: Charger le profil de l'utilisateur
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, telephone")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Erreur chargement profil:", profileError);
      }

      // Étape 3: Combiner les données
      const reservationsWithProfile: ReservationWithProfile[] = reservationsData.map(reservation => ({
        ...reservation,
        client_name: profileData?.full_name || user.email || "Non spécifié",
        client_email: profileData?.email || user.email,
        client_phone: profileData?.telephone
      }));

      setReservations(reservationsWithProfile);
    };

    const loadGuestReservations = async () => {
      // Invité : récupérer les IDs des réservations depuis le localStorage
      const guestReservations = localStorage.getItem("guest_reservations");
      if (guestReservations) {
        const reservationIds = JSON.parse(guestReservations);
        
        if (reservationIds.length > 0) {
          const { data: reservationsData, error: reservationsError } = await supabase
            .from("reservations")
            .select("*")
            .in("id", reservationIds)
            .order("created_at", { ascending: false });

          if (reservationsError) throw reservationsError;

          // Pour les invités, utiliser les données guest_*
          const reservationsWithGuestData: ReservationWithProfile[] = reservationsData.map(reservation => ({
            ...reservation,
            client_name: reservation.guest_name || "Invité",
            client_email: reservation.guest_email || "Non spécifié",
            client_phone: reservation.guest_phone
          }));

          setReservations(reservationsWithGuestData || []);
        } else {
          setReservations([]);
        }
      } else {
        setReservations([]);
      }
    };

    loadReservations();
    return () => { mounted = false; };
  }, [toast, navigate, user]);

  const handleCancelReservation = async (res: ReservationWithProfile) => {
    try {
      // Pour les invités, retirer l'ID du localStorage
      if (!user) {
        const guestReservations = localStorage.getItem("guest_reservations");
        if (guestReservations) {
          const reservationIds = JSON.parse(guestReservations);
          const updatedIds = reservationIds.filter((id: string) => id !== res.id);
          localStorage.setItem("guest_reservations", JSON.stringify(updatedIds));
        }
      }

      const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", res.id);

      if (error) throw error;

      console.log('✅ Réservation annulée en base');

      // Préparer les données pour l'email d'annulation
      const reservationData = {
        reservationId: res.id,
        clientName: res.client_name || "Invité",
        clientEmail: res.client_email || "Non spécifié",
        clientPhone: res.client_phone,
        carName: res.car_name,
        carCategory: res.car_category,
        pickupDate: formatDisplayDate(res.pickup_date),
        pickupTime: res.pickup_time,
        returnDate: formatDisplayDate(res.return_date),
        returnTime: res.return_time,
        pickupLocation: res.pickup_location,
        returnLocation: res.return_location,
        totalPrice: res.total_price
      };

      console.log('📧 Données pour email annulation:', reservationData);

      // Envoyer les emails d'annulation
      const emailResult = await emailJSService.sendCancellationEmails(reservationData);
      
      if (!emailResult.success) {
        console.warn('⚠️ Emails d\'annulation non envoyés:', emailResult.error);
      }

      toast({ 
        title: "Réservation annulée", 
        description: `Votre réservation a été annulée.` 
      });
      
      setReservations(prev => prev.filter(r => r.id !== res.id));
    } catch (err) {
      console.error("❌ Erreur annulation:", err);
      toast({ 
        title: "Erreur", 
        description: "Impossible d'annuler la réservation", 
        variant: "destructive" 
      });
    }
  };

  // Structure commune pour tous les états
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-primary mb-8">Mes Réservations</h1>
          <p>Chargement...</p>
        </div>
      );
    }

    if (!reservations.length) {
      return (
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-primary mb-8">Mes Réservations</h1>
          <p className="text-muted-foreground">
            {user ? "Aucune réservation pour le moment." : "Vous n'avez pas encore de réservation."}
          </p>
          {!user && (
            <button
              onClick={() => navigate("/offres")}
              className="mt-4 bg-primary text-white py-2 px-4 rounded hover:bg-primary/90"
            >
              Faire une réservation
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-primary mb-8">Mes Réservations</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reservations.map(res => (
            <div key={res.id} className="border rounded-lg overflow-hidden shadow-lg bg-white flex flex-col">
              <img 
                src={res.car_image || "/placeholder-car.jpg"} 
                alt={res.car_name} 
                className="w-full h-48 object-cover" 
              />
              <div className="p-4 flex-1 flex flex-col">
                <h2 className="font-semibold text-lg">{res.car_name}</h2>
                <p className="text-sm text-muted-foreground">{res.car_category}</p>
                
                <div className="mt-3 space-y-2 text-sm flex-1">
                  <p>
                    <span className="font-medium">Du :</span> {formatDisplayDate(res.pickup_date)} {res.pickup_time}
                  </p>
                  <p>
                    <span className="font-medium">Au :</span> {formatDisplayDate(res.return_date)} {res.return_time}
                  </p>
                  <p>
                    <span className="font-medium">Lieu de retrait :</span> {res.pickup_location}
                  </p>
                  {res.return_location !== res.pickup_location && (
                    <p>
                      <span className="font-medium">Lieu de retour :</span> {res.return_location}
                    </p>
                  )}
                  <p className="font-semibold text-primary">Prix total : {res.total_price} Dhs</p>
                </div>

                {/* Bouton toujours en bas de la carte */}
                <button
                  className="mt-4 w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition-colors"
                  onClick={() => handleCancelReservation(res)}
                >
                  Annuler la réservation
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container mx-auto px-4 py-8 flex-1">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
};

export default MaReservation;