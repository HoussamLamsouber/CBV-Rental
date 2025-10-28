import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { CarGrid } from "@/components/CarGrid";
import { SearchData } from "@/components/SearchForm";
import { Database } from "@/integrations/supabase/types";
import { ReservationModal } from "@/components/ReservationModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type Car = Database["public"]["Tables"]["cars"]["Row"];
type Reservation = Database["public"]["Tables"]["reservations"]["Row"];

const Index = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [searchResults, setSearchResults] = useState<Car[]>([]);
  const [searchData, setSearchData] = useState<SearchData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  // Charger les voitures
  useEffect(() => {
    const fetchCars = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("cars")
          .select("*") 
          .is("is_deleted", false) as { data: Car[] | null; error: any };

        if (error) {
          console.error("Erreur fetch cars:", error);
          toast({
            title: "Erreur",
            description: "Impossible de charger les véhicules",
            variant: "destructive",
          });
        } else if (data) {
          setCars(data);
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Erreur fetchCars:", err);
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors du chargement",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCars();
  }, [toast]);

  // Authentification
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Vérifier la disponibilité
  const isDateInReservation = (
    date: string,
    pickupDate: string,
    returnDate: string
  ) => {
    const currentDate = new Date(date);
    const startDate = new Date(pickupDate);
    const endDate = new Date(returnDate);
    return currentDate >= startDate && currentDate <= endDate;
  };

  const getReservedQuantityForDate = async (
    carId: string,
    date: string
  ): Promise<number> => {
    try {
      const { data: reservations, error } = await supabase
        .from("reservations")
        .select("pickup_date, return_date")
        .eq("car_id", carId)
        .eq("status", "active") as { data: Reservation[] | null; error: any };

      if (error) {
        console.error("Erreur récupération réservations:", error);
        return 0;
      }

      const reservedQuantity = (reservations || []).filter((reservation) =>
        isDateInReservation(date, reservation.pickup_date, reservation.return_date)
      ).length;

      return reservedQuantity;
    } catch (err) {
      console.error("Erreur getReservedQuantityForDate:", err);
      return 0;
    }
  };

  const getDatesInRange = (startDate: Date, endDate: Date): Date[] => {
    const dates: Date[] = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    while (currentDate < end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  };

  const checkPeriodAvailability = async (
    carId: string,
    startDate: string,
    endDate: string
  ): Promise<boolean> => {
    try {
      const { data: car, error: carError } = await supabase
        .from("cars")
        .select("quantity")
        .eq("id", carId)
        .single() as { data: Car | null; error: any };

      if (carError || !car) {
        console.error("Erreur récupération véhicule:", carError);
        return false;
      }

      const totalQuantity = car.quantity;
      const dates = getDatesInRange(new Date(startDate), new Date(endDate));

      for (const date of dates) {
        const dateString = date.toISOString().split("T")[0];
        const reservedQuantity = await getReservedQuantityForDate(carId, dateString);
        if ((totalQuantity ?? 0) - reservedQuantity <= 0) return false;
      }

      return true;
    } catch (err) {
      console.error("Erreur checkPeriodAvailability:", err);
      return false;
    }
  };

  // Recherche
  const handleSearch = async (data: SearchData) => {
    setSearchData(data);
    setSearchLoading(true);

    const startDate = data.pickupDate?.toISOString().split("T")[0];
    const endDate = data.returnDate?.toISOString().split("T")[0];

    if (!startDate || !endDate) {
      toast({
        title: "Dates manquantes",
        description: "Veuillez sélectionner les dates de location",
        variant: "destructive",
      });
      setSearchLoading(false);
      return;
    }

    try {
      let query = supabase.from("cars").select("*").eq("available", true);

      const categoryMap: Record<string, string[]> = {
        all: ["Electique", "SUV", "SUV Urbain", "Berlin"],
        electrique: ["Electique"],
        suv: ["SUV"],
        "suv urbain": ["SUV Urbain"],
        berlin: ["Berlin"],
      };

      const { data: allCars, error } = await query as {
        data: Car[] | null;
        error: any;
      };
      
      if (error) throw error;

      // Vérifier la disponibilité pour chaque véhicule
      const availableCars = await Promise.all(
        (allCars || []).map(async (car) => ({
          ...car,
          isAvailable: await checkPeriodAvailability(
            car.id,
            startDate,
            endDate
          ),
        }))
      );

      const finalCars = availableCars.filter((car) => car.isAvailable);
      setSearchResults(finalCars);

      toast({
        title: "Recherche terminée",
        description: `${finalCars.length} véhicule(s) disponible(s) pour vos dates`,
      });
    } catch (err) {
      console.error("Erreur recherche:", err);
      toast({
        title: "Erreur de recherche",
        description: "Une erreur est survenue lors de la recherche",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleOpenReserve = (car: Car) => {
    if (!searchData?.pickupDate || !searchData?.returnDate) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez d'abord effectuer une recherche avec des dates",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner message="Chargement des véhicules..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section avec recherche */}
      <div className="relative">
        <Hero onSearch={handleSearch} />
        
        {/* Indicateur de chargement pour la recherche */}
        {searchLoading && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium text-gray-700">
                Recherche en cours...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Réservation Modal */}
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

      {/* Section résultats */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Grille des véhicules */}
          <CarGrid
            cars={searchResults}
            onReserve={handleOpenReserve}
            canReserve={isSearchReady}
          />

          {/* Message si aucun résultat */}
          {searchData && searchResults.length === 0 && !searchLoading && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucun véhicule disponible
              </h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                Aucun véhicule ne correspond à vos critères de recherche pour les dates sélectionnées.
              </p>
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Suggestions :
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Essayez des dates différentes</li>
                  <li>• Élargissez votre recherche à d'autres catégories</li>
                  <li>• Vérifiez d'autres lieux de retrait</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;