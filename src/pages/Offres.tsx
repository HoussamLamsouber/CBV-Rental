import { useState, useEffect } from "react";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Car, 
  Tag, 
  Calendar, 
  X,
  ArrowRight,
  Shield,
  Clock
} from "lucide-react";

interface Car {
  id: string;
  name: string;
  category: string;
  transmission?: string;
  price: number;
  image_url: string;
  fuel?: string;
  seats?: number;
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
  const [loading, setLoading] = useState(true);

  // Charger les voitures depuis Supabase
  useEffect(() => {
    const fetchCars = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("cars")
          .select("*")
          .is("is_deleted", false)
          .eq("available", true);

        if (error) {
          console.error("Erreur fetch cars:", error);
          return;
        }
        setCars(data as Car[]);
      } catch (error) {
        console.error("Erreur lors du chargement des véhicules:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCars();
  }, []);

  // Charger les offres depuis Supabase
  useEffect(() => {
    const fetchOffers = async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .is("is_deleted", false);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des offres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-6">
        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Nos Véhicules et Offres
          </h1>
          <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto">
            Découvrez notre flotte complète et profitez de nos offres spéciales 
            pour une expérience de location exceptionnelle
          </p>
        </div>

        {/* Grille de voitures - Version mobile optimisée */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-10">
          {cars.map((car) => (
            <Card key={car.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="relative">
                <img
                  src={car.image_url}
                  alt={car.name}
                  className="w-full h-40 sm:h-48 object-cover"
                />
                {offers[car.id] && offers[car.id].length > 0 && (
                  <Badge className="absolute top-2 left-2 bg-green-600 hover:bg-green-700">
                    <Tag className="h-3 w-3 mr-1" />
                    {offers[car.id].length} offre{offers[car.id].length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg line-clamp-1">
                      {car.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {car.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {car.transmission}
                      </Badge>
                    </div>
                  </div>

                  {/* Détails du véhicule */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <span>⛽</span>
                      <span>{car.fuel || 'Essence'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>👤</span>
                      <span>{car.seats || 5} places</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">À partir de</p>
                      <p className="text-lg font-bold text-primary">
                        {car.price} Dhs/jour
                      </p>
                    </div>
                    
                    <Button
                      onClick={() => openOffersModal(car.id)}
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <span className="hidden sm:inline">Voir</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Aucun véhicule */}
        {cars.length === 0 && (
          <div className="text-center py-12">
            <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucun véhicule disponible
            </h3>
            <p className="text-gray-600 mb-6">
              Tous nos véhicules sont actuellement en location.
            </p>
            <Button onClick={() => window.location.reload()}>
              Actualiser la page
            </Button>
          </div>
        )}

        {/* Modal offres - Version mobile optimisée */}
        {selectedCarId && currentCar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              {/* En-tête du modal */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b">
                <div className="flex items-center gap-3">
                  <img
                    src={currentCar.image_url}
                    alt={currentCar.name}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">
                      {currentCar.name}
                    </h2>
                    <p className="text-gray-600 text-sm">{currentCar.category}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeOffersModal}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Contenu du modal */}
              <div className="p-4 sm:p-6">
                {/* Prix standard */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-800 font-medium">Prix standard</p>
                      <p className="text-blue-900 text-sm">Location à la journée</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-900">{currentCar.price} Dhs</p>
                      <p className="text-blue-800 text-sm">par jour</p>
                    </div>
                  </div>
                </div>

                {/* Offres spéciales */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-green-600" />
                    Offres spéciales
                  </h3>
                  
                  {currentCarOffers.length > 0 ? (
                    <div className="space-y-3">
                      {currentCarOffers.map((offer, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-900">
                              {offer.period}
                            </span>
                          </div>
                          <span className="text-lg font-bold text-green-600">
                            {offer.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                      <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 text-sm">
                        Aucune offre spéciale disponible
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        Consultez nos tarifs standards
                      </p>
                    </div>
                  )}
                </div>

                {/* Boutons d'action */}
                <div className="space-y-3">
                  <Link
                    to="/"
                    onClick={closeOffersModal}
                    className="block w-full text-center py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Réserver maintenant
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Offres;