import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { Database } from "@/integrations/supabase/types";
import { formatDisplayDate } from "@/utils/dateUtils";
import { emailJSService } from "@/services/emailJSService";

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

  useEffect(() => {
    let mounted = true;

    const loadReservationsWithProfiles = async () => {
      try {
        setLoading(true);

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session?.user) {
          if (mounted) {
            setReservations([]);
            toast({ 
              title: "Connexion requise", 
              description: "Connectez-vous pour voir vos réservations", 
              variant: "destructive" 
            });
            navigate("/auth");
          }
          return;
        }

        // Étape 1: Charger les réservations de l'utilisateur
        const { data: reservationsData, error: reservationsError } = await supabase
          .from("reservations")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (reservationsError) throw reservationsError;

        if (!reservationsData || reservationsData.length === 0) {
          if (mounted) {
            setReservations([]);
          }
          return;
        }

        // Étape 2: Charger le profil de l'utilisateur
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, email, telephone")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.error("Erreur chargement profil:", profileError);
        }

        if (mounted) {
          // Étape 3: Combiner les données
          const reservationsWithProfile: ReservationWithProfile[] = reservationsData.map(reservation => ({
            ...reservation,
            client_name: profileData?.full_name || session.user.email || "Non spécifié",
            client_email: profileData?.email || session.user.email,
            client_phone: profileData?.telephone
          }));

          setReservations(reservationsWithProfile);
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

    loadReservationsWithProfiles();
    return () => { mounted = false; };
  }, [toast, navigate]);

  const handleCancelReservation = async (res: ReservationWithProfile) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      
      if (!user) {
        toast({ 
          title: "Erreur", 
          description: "Utilisateur non connecté", 
          variant: "destructive" 
        });
        return;
      }
  
      const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", res.id);
  
      if (error) throw error;
  
      console.log('✅ Réservation annulée en base');
  
      // Utiliser les données combinées du profil
      const reservationData = {
        reservationId: res.id,
        clientName: res.client_name || user.email,
        clientEmail: res.client_email || user.email,
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
          <p className="text-muted-foreground">Aucune réservation pour le moment.</p>
        </div>
      );
    }

    return (
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-primary mb-8">Mes Réservations</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reservations.map(res => (
            <div key={res.id} className="border rounded-lg overflow-hidden shadow-lg bg-white">
              <img src={res.car_image} alt={res.car_name} className="w-full h-48 object-cover" />
              <div className="p-4">
                <h2 className="font-semibold text-lg">{res.car_name}</h2>
                <p className="text-sm text-muted-foreground">{res.car_category}</p>
                <p className="mt-2 text-sm">
                  Du : {formatDisplayDate(res.pickup_date)} {res.pickup_time} 
                  . Au : {formatDisplayDate(res.return_date)} {res.return_time}
                </p>
                <p className="mt-1 font-semibold">Prix total : {res.total_price} Dhs</p>
                <button
                  className="mt-4 w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
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
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
};

export default MaReservation;