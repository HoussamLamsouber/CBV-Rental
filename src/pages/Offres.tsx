import { useState, useEffect } from "react";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface Car {
  id: string;
  name: string;
  category: string;
  transmission?: string;
  price: number;
  image_url: string;
}

interface CarOffer {
  period: string;
  price: string;
}

interface OfferRecord {
  id: string;
  car_id: string;
  period: string;
  price: number;
}

const Offres = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [offers, setOffers] = useState<Record<string, CarOffer[]>>({});
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);

  // Charger les voitures depuis Supabase
  useEffect(() => {
    const fetchCars = async () => {
      const { data, error } = await supabase.from("cars").select("*");
      if (error) {
        console.error("Erreur fetch cars:", error);
        return;
      }
      setCars(data as Car[]);
    };
    fetchCars();
  }, []);

  // Charger les offres depuis Supabase
  useEffect(() => {
    const fetchOffers = async () => {
      const { data, error } = await supabase.from("offers").select("*");
      if (error) {
        console.error("Erreur fetch offers:", error);
        return;
      }

      const records = data as OfferRecord[];
      const map: Record<string, CarOffer[]> = {};
      records.forEach((o) => {
        if (!map[o.car_id]) map[o.car_id] = [];
        map[o.car_id].push({ period: o.period, price: `${o.price} Dhs` });
      });

      setOffers(map);
    };
    fetchOffers();
  }, []);

  const openOffersModal = (carId: string) => setSelectedCarId(carId);
  const closeOffersModal = () => setSelectedCarId(null);

  const currentCarOffers = selectedCarId ? offers[selectedCarId] || [] : [];
  const currentCar = selectedCarId ? cars.find((c) => c.id === selectedCarId) : null;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-primary mb-8 text-center">
          Découvrez nos Tarifs et Offres
        </h1>

        {/* Grille de voitures */}
        <section className="mb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cars.map((car) => (
            <div
              key={car.id}
              className="bg-card text-card-foreground rounded-lg overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-border"
            >
              <img
                src={car.image_url}
                alt={car.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="text-xl font-bold">{car.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {car.category} | {car.transmission}
                </p>
                <p className="text-lg font-semibold text-gray-700">
                  À partir de {car.price} Dhs/jour
                </p>
                
                {/* MODIFICATION : Afficher le nombre d'offres disponibles */}
                {offers[car.id] && offers[car.id].length > 0 && (
                  <p className="text-sm text-green-600 font-medium mt-2">
                    ✅ {offers[car.id].length} offre{offers[car.id].length > 1 ? 's' : ''} spéciale{offers[car.id].length > 1 ? 's' : ''} disponible{offers[car.id].length > 1 ? 's' : ''}
                  </p>
                )}
                
                <button
                  onClick={() => openOffersModal(car.id)}
                  className="w-full mt-4 py-2 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  Voir les offres
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Modal offres - MODIFICATION : Accessible sans connexion */}
        {selectedCarId && currentCar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-2xl font-bold text-primary">
                  Offres pour {currentCar.name}
                </h2>
                <button
                  onClick={closeOffersModal}
                  className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {currentCarOffers.length > 0 ? (
                  currentCarOffers.map((offer, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-md border"
                    >
                      <span className="font-medium">{offer.period}</span>
                      <span className="text-xl font-bold text-green-600">
                        {offer.price}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600">
                    Aucune offre spéciale disponible pour ce véhicule pour le
                    moment.
                  </p>
                )}
              </div>

              <p className="text-sm text-center text-muted-foreground mb-4">
                Les prix sont donnés à titre indicatif et peuvent varier selon
                les dates.
              </p>

              {/* MODIFICATION : Bouton de réservation accessible à tous */}
              <Link
                to="/"
                onClick={closeOffersModal}
                className="block w-full text-center py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors"
              >
                Réserver maintenant
              </Link>
              
              {/* MODIFICATION : Message informatif */}
              <p className="text-xs text-center text-muted-foreground mt-3">
                🔒 Connexion requise uniquement pour finaliser la réservation
              </p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Offres;