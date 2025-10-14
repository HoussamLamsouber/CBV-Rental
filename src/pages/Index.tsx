import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { CarGrid } from "@/components/CarGrid";
import { SearchData } from "@/components/SearchForm";
import { Database } from "@/integrations/supabase/types";
import { ReservationModal } from "@/components/ReservationModal"; // 🔹 n’oublie pas d’importer

type Car = Database["public"]["Tables"]["cars"]["Row"];

const Index = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [searchResults, setSearchResults] = useState<Car[]>([]);
  const [searchData, setSearchData] = useState<SearchData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  // Charger les voitures
  useEffect(() => {
    const fetchCars = async () => {
      try {
        const { data, error } = await supabase.from("cars").select("*");
        if (error) {
          console.error("Erreur fetch cars:", error);
        } else if (data) {
          setCars(data);
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Erreur fetchCars:", err);
      }
    };

    fetchCars();
  }, []);

  useEffect(() => {
    const testAvailability = async () => {
      const testCarId = cars[0]?.id;
      if (testCarId) {
        console.log('🧪 Test de disponibilité pour:', testCarId);
        const testDate = new Date().toISOString().split('T')[0];
        const isAvailable = await checkPeriodAvailability(testCarId, testDate, testDate);
        console.log('🧪 Résultat test:', isAvailable);
      }
    };
    
    if (cars.length > 0) {
      testAvailability();
    }
  }, [cars]);

  // Gestion de l’auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Recherche
  const handleSearch = async (data: SearchData) => {
    setSearchData(data);

    try {
      // Convertir les dates en format ISO pour la requête
      const startDate = data.pickupDate?.toISOString().split('T')[0];
      const endDate = data.returnDate?.toISOString().split('T')[0];

      if (!startDate || !endDate) {
        toast({
          title: "Dates manquantes",
          description: "Veuillez sélectionner les dates de location",
          variant: "destructive",
        });
        return;
      }

      console.log('🔍 Recherche avec dates:', startDate, 'à', endDate);

      // Récupérer tous les véhicules
      let query = supabase
        .from("cars")
        .select("*")
        .eq('available', true);

      // Appliquer les filtres existants
      const categoryMap: Record<string, string[]> = {
        all: ["Electique", "SUV", "SUV Urbain", "Berlin"],
        electrique: ["Electique"],
        suv: ["SUV"],
        "suv urbain": ["SUV Urbain"],
        berlin: ["Berlin"],
      };

      if (data.carType && data.carType.toLowerCase() !== "all") {
        const allowedCategories = categoryMap[data.carType.toLowerCase()] || [];
        query = query.in('category', allowedCategories);
      }

      if (data.transmission && data.transmission.toLowerCase() !== "all") {
        query = query.eq('transmission', data.transmission.toLowerCase());
      }

      if (data.fuel && data.fuel.toLowerCase() !== "all") {
        query = query.eq('fuel', data.fuel.toLowerCase());
      }

      const { data: allCars, error } = await query;

      if (error) {
        console.error("Erreur recherche:", error);
        toast({
          title: "Erreur de recherche",
          description: "Impossible de récupérer les véhicules",
          variant: "destructive",
        });
        return;
      }

      console.log('🚗 Véhicules récupérés:', allCars?.length);

      // Filtrer pour vérifier la disponibilité sur toute la période
      const availableCars = await Promise.all(
        (allCars || []).map(async (car) => {
          const isAvailable = await checkPeriodAvailability(car.id, startDate, endDate);
          console.log(`📋 ${car.name} - disponible: ${isAvailable}`);
          return { ...car, isAvailable };
        })
      );

      const finalCars = availableCars.filter(car => car.isAvailable);

      console.log('✅ Véhicules disponibles:', finalCars.length);

      setSearchResults(finalCars);

      toast({
        title: "Réservation effectuée",
        description: `${finalCars.length} véhicule(s) disponible(s) trouvé(s)`,
      });

    } catch (err) {
      console.error("Erreur recherche:", err);
      toast({
        title: "Erreur de recherche",
        description: "Une erreur est survenue lors de la recherche",
        variant: "destructive",
      });
    }
  };

  // Fonction pour vérifier si une date est dans une période de réservation
  const isDateInReservation = (date: string, pickupDate: string, returnDate: string) => {
    const currentDate = new Date(date);
    const startDate = new Date(pickupDate);
    const endDate = new Date(returnDate);
    
    return currentDate >= startDate && currentDate <= endDate;
  };

  // Fonction pour calculer les réservations par date
  const getReservedQuantityForDate = async (carId: string, date: string): Promise<number> => {
    try {
      // Récupérer toutes les réservations actives pour ce véhicule
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select('pickup_date, return_date, quantity')
        .eq('car_id', carId)
        .eq('status', 'active');

      if (error) {
        console.error('Erreur récupération réservations:', error);
        return 0;
      }

      // Calculer le nombre de véhicules réservés pour cette date
      const reservedQuantity = (reservations || [])
        .filter(reservation => isDateInReservation(date, reservation.pickup_date, reservation.return_date))
        .reduce((sum, reservation) => sum + (reservation.quantity || 1), 0);

      return reservedQuantity;
    } catch (err) {
      console.error('Erreur getReservedQuantityForDate:', err);
      return 0;
    }
  };

  // Vérifier la disponibilité sur toute la période
  async function checkPeriodAvailability(carId: string, startDate: string, endDate: string): Promise<boolean> {
    try {
      console.log(`🔎 Vérification disponibilité véhicule ${carId} du ${startDate} au ${endDate}`);

      // Récupérer le véhicule pour connaître sa quantité totale
      const { data: car, error: carError } = await supabase
        .from('cars')
        .select('quantity')
        .eq('id', carId)
        .single();

      if (carError || !car) {
        console.error('Erreur récupération véhicule:', carError);
        return false;
      }

      const totalQuantity = car.quantity;

      // Générer toutes les dates de la période
      const dates = getDatesInRange(new Date(startDate), new Date(endDate));
      
      // Vérifier la disponibilité pour chaque date
      for (const date of dates) {
        const dateString = date.toISOString().split('T')[0];
        
        // Récupérer les réservations pour cette date
        const reservedQuantity = await getReservedQuantityForDate(carId, dateString);
        
        // Vérifier s'il reste des véhicules disponibles
        const availableQuantity = totalQuantity - reservedQuantity;
        
        console.log(`📊 ${dateString}: ${totalQuantity} - ${reservedQuantity} = ${availableQuantity} disponible(s)`);

        if (availableQuantity <= 0) {
          console.log(`❌ Plus de disponibilité le ${dateString}`);
          return false;
        }
      }

      console.log(`✅ Véhicule ${carId} disponible sur toute la période`);
      return true;

    } catch (err) {
      console.error('Erreur checkPeriodAvailability:', err);
      return false;
    }
  }

  // Fonction utilitaire pour obtenir toutes les dates dans une période
  function getDatesInRange(startDate: Date, endDate: Date): Date[] {
    const dates = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    // S'assurer qu'on inclut le dernier jour
    end.setDate(end.getDate() + 1);
    
    while (currentDate < end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }

  // 🔹 Ouverture du modal de réservation
  const handleOpenReserve = (car: Car) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour réserver un véhicule.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!searchData || !searchData.pickupDate || !searchData.returnDate) {
      toast({
        title: "Paramètres manquants",
        description: "Veuillez renseigner toutes les informations de réservation.",
        variant: "destructive",
      });
      return;
    }

    setSelectedCar(car);
    setShowModal(true);
  };

  const isSearchReady =
    !!searchData?.pickupLocation &&
    !!searchData?.pickupDate &&
    !!searchData?.returnDate &&
    (searchData.sameLocation || !!searchData?.returnLocation);

  return (
    <div className="min-h-screen bg-background">
      <Hero onSearch={handleSearch} />
      <ReservationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        car={selectedCar}
        searchData={searchData}
        user={user}
        onReserved={() => {
          setShowModal(false);
          navigate("/ma-reservation");
        }}
      />
      <CarGrid 
        cars={searchResults} 
        onReserve={(car) => {
          setSelectedCar(car);
          setShowModal(true);
        }} 
        canReserve={isSearchReady} 
      />
      <Footer />
    </div>
  );
};

export default Index;
