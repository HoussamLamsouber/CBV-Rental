import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Tag, Calendar, X, ArrowRight, Clock } from "lucide-react";

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
  const { t } = useTranslation();
  const [cars, setCars] = useState<Car[]>([]);
  const [offers, setOffers] = useState<Record<string, CarOffer[]>>({});
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const getTranslatedPeriod = (periodKey: string) => {
    const translation = t(`offers_page.periods.${periodKey}`);
    return translation.startsWith('offers_page.periods.') ? periodKey : translation;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t("offers_page.loadingOffers")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {t("offers_page.title")}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto">
            {t("offers_page.subtitle")}
          </p>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-10">
          {cars.map((car) => (
            <Card key={car.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="relative">
                <img src={car.image_url} alt={car.name} className="w-full h-40 sm:h-48 object-cover" />
                {offers[car.id] && offers[car.id].length > 0 && (
                  <Badge className="absolute top-2 left-2 bg-green-600 hover:bg-green-700">
                    <Tag className="h-3 w-3 mr-1" />
                    {offers[car.id].length} {t("offers_page.offers_plural", { count: offers[car.id].length })}
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
                        {t(`offers_page.categories.${car.category}`)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {t(`car_card.transmission_types.${car.transmission}`)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <span>⛽</span>
                      <span>{t(`car_card.fuel_types.${car.fuel}`)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>👤</span>
                      <span>{car.seats || 5} {t("offers_page.seats")}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{t("offers_page.startFrom")}</p>
                      <p className="text-lg font-bold text-primary">
                        {car.price} Dhs/{t("offers_page.perDay")}
                      </p>
                    </div>

                    <Button onClick={() => openOffersModal(car.id)} size="sm" className="flex items-center gap-1">
                      <span className="hidden sm:inline">{t("offers_page.view")}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {cars.length === 0 && (
          <div className="text-center py-12">
            <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("offers_page.noCarsTitle")}
            </h3>
            <p className="text-gray-600 mb-6">{t("offers_page.noCarsSubtitle")}</p>
            <Button onClick={() => window.location.reload()}>
              {t("offers_page.refresh")}
            </Button>
          </div>
        )}

        {selectedCarId && currentCar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b">
                <div className="flex items-center gap-3">
                  <img src={currentCar.image_url} alt={currentCar.name} className="w-12 h-12 object-cover rounded-lg" />
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">{currentCar.name}</h2>
                    <p className="text-gray-600 text-sm">{t(`offers_page.categories.${currentCar.category}`)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={closeOffersModal} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-4 sm:p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-800 font-medium">{t("offers_page.standardPrice")}</p>
                      <p className="text-blue-900 text-sm">{t("offers_page.dailyRental")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-900">{currentCar.price} Dhs</p>
                      <p className="text-blue-800 text-sm">{t("offers_page.perDay")}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-green-600" />
                    {t("offers_page.specialOffers")}
                  </h3>

                  {currentCarOffers.length > 0 ? (
                    <div className="space-y-3">
                      {currentCarOffers.map((offer, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-900">
                              {getTranslatedPeriod(offer.period)}
                            </span>
                          </div>
                          <span className="text-lg font-bold text-green-600">{offer.price}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                      <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 text-sm">{t("offers_page.noSpecialOffers")}</p>
                      <p className="text-gray-500 text-xs mt-1">{t("offers_page.checkStandardRates")}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Link
                    to="/"
                    onClick={closeOffersModal}
                    className="block w-full text-center py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {t("offers_page.bookNow")}
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