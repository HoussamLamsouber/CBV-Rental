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

type Car = Database["public"]["Tables"]["cars"]["Row"];
type Reservation = Database["public"]["Tables"]["reservations"]["Row"];

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
        const { data, error } = await supabase
          .from("cars")
          .select("*") as { data: Car[] | null; error: any };

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

    const startDate = data.pickupDate?.toISOString().split("T")[0];
    const endDate = data.returnDate?.toISOString().split("T")[0];

    if (!startDate || !endDate) {
      toast({
        title: "Dates manquantes",
        description: "Veuillez sélectionner les dates",
        variant: "destructive",
      });
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

      if (data.carType && data.carType.toLowerCase() !== "all") {
        const allowedCategories = categoryMap[data.carType.toLowerCase()] || [];
        query = query.in("category", allowedCategories);
      }

      if (data.transmission && data.transmission.toLowerCase() !== "all") {
        query = query.eq("transmission", data.transmission.toLowerCase());
      }

      if (data.fuel && data.fuel.toLowerCase() !== "all") {
        query = query.eq("fuel", data.fuel.toLowerCase());
      }

      const { data: allCars, error } = await query as {
        data: Car[] | null;
        error: any;
      };
      if (error) throw error;

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
        title: "Résultats",
        description: `${finalCars.length} véhicule(s) disponible(s)`,
      });
    } catch (err) {
      console.error("Erreur recherche:", err);
      toast({
        title: "Erreur de recherche",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  // ✅ Autoriser les réservations invitées
  const handleOpenReserve = (car: Car) => {
    if (!searchData?.pickupDate || !searchData?.returnDate) {
      toast({
        title: "Paramètres manquants",
        description: "Veuillez remplir toutes les informations",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Réservation invitée",
        description: "Vous pouvez réserver sans compte.",
      });
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
        onReserve={handleOpenReserve}
        canReserve={isSearchReady}
      />
      <Footer />
    </div>
  );
};

export default Index;
