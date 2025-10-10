import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { format, addDays, isWithinInterval } from "date-fns";
import { Link } from "react-router-dom";

interface Vehicle {
  id: string;
  name: string;
  category: string;
  image_url: string;
  price: number;
  available: boolean;
  quantity: number;
}

interface Reservation {
  id: string;
  car_id: string;
  user_id: string;
  pickup_date: string;
  return_date: string;
  pickup_location: string;
  return_location: string;
  created_at: string;
  available: boolean;
  car_name: string;
  car_image: string;
  car_category: string;
  car_price: number;
  date: string;
  quantity: number;
}

interface AvailabilityOverride {
  id: string;
  car_id: string;
  date: string;
  available_quantity: number;
}

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    fetchData();

    // Générer 30 jours à partir d'aujourd'hui
    const today = new Date();
    const nextDays = Array.from({ length: 30 }, (_, i) =>
      format(addDays(today, i), "yyyy-MM-dd")
    );
    setDates(nextDays);
  }, []);

  const fetchData = async () => {
    const { data: carsData } = await supabase.from("cars").select("*");
    setVehicles((carsData as Vehicle[]) || []);

    // CORRECTION: Récupérer toutes les réservations sans filtre
    const { data: resData } = await supabase.from("reservations").select("*");
    setReservations((resData as Reservation[]) || []);

    const { data: overridesData } = await supabase.from("vehicle_availabilities").select("*");
    setOverrides((overridesData as AvailabilityOverride[]) || []);
  };

  // CORRECTION: Fonction pour vérifier si une date est dans une période de réservation
  const isDateInReservation = (date: string, reservation: Reservation) => {
    const currentDate = new Date(date);
    const pickupDate = new Date(reservation.pickup_date);
    const returnDate = new Date(reservation.return_date);
    
    return currentDate >= pickupDate && currentDate <= returnDate;
  };

  // CORRECTION: Nouvelle fonction pour calculer les réservations par date
  const getReservedQuantityForDate = (carId: string, date: string) => {
    return reservations
      .filter(r => r.car_id === carId && isDateInReservation(date, r))
      .reduce((sum, r) => sum + (r.quantity || 0), 0);
  };

  const getDailyAvailability = (carId: string, date: string) => {
    const car = vehicles.find((c) => c.id === carId);
    if (!car) return 0;

    let stock = car.quantity;

    const override = overrides.find((o) => o.car_id === carId && o.date === date);
    if (override) {
      stock = override.available_quantity;
    }

    // CORRECTION: Utiliser la nouvelle fonction qui prend en compte la période
    const reserved = getReservedQuantityForDate(carId, date);

    return Math.max(0, stock - reserved);
  };

  return (
    <>
      <Header />
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Disponibilités des véhicules</h1>

        <div className="overflow-x-auto rounded-lg border shadow-sm">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-12 border">Photo</th>
                <th className="p-2 border">Véhicule</th>
                {dates.map((d) => (
                  <th key={d} className="p-2 border text-center">
                    {format(new Date(d), "dd/MM")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="text-center">
                  <td className="p-2 border">
                    <img
                      src={v.image_url}
                      alt={v.name}
                      className="w-50 h-22 object-cover rounded"
                    />
                  </td>
                  <td className="p-4 border text-left">
                    <Link
                      to={`/admin/vehicle/${v.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {v.name}
                    </Link>
                    <div className="text-sm text-gray-500">{v.category}</div>
                    <div className="text-sm text-gray-500">Stock: {v.quantity}</div>
                  </td>
                  {dates.map((d) => {
                    const available = getDailyAvailability(v.id, d);
                    const reserved = getReservedQuantityForDate(v.id, d);
                    return (
                      <td
                        key={d}
                        className={`p-2 border font-semibold ${
                          available > 0 ? "text-green-600" : "text-red-600"
                        }`}
                        title={`Réservés: ${reserved}, Stock: ${v.quantity - reserved}`}
                      >
                        {available}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </>
  );
}