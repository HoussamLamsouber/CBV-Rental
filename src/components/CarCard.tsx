import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Fuel, Users, Cog, Zap, Car } from "lucide-react";

type Car = Database["public"]["Tables"]["cars"]["Row"];

interface CarCardProps {
  car: Car & {
    isAvailable?: boolean; // Ajoutez cette ligne
  };
  onReserve: (car: Car) => void;
  canReserve: boolean;
}

export const CarCard = ({ car, onReserve, canReserve }: CarCardProps) => {
  // Utilisez isAvailable si fourni, sinon fallback sur car.available
  const isCarAvailable = car.isAvailable !== undefined ? car.isAvailable : car.available;

  // Fonction pour obtenir l'icône de carburant
  const getFuelIcon = (fuelType: string | null) => {
    switch (fuelType?.toLowerCase()) {
      case 'electrique':
        return <Zap className="h-4 w-4" />;
      case 'diesel':
      case 'essence':
      case 'hybride':
      default:
        return <Fuel className="h-4 w-4" />;
    }
  };

  // Fonction pour obtenir le label de carburant
  const getFuelLabel = (fuelType: string | null) => {
    switch (fuelType?.toLowerCase()) {
      case 'electrique':
        return 'Électrique';
      case 'diesel':
        return 'Diesel';
      case 'essence':
        return 'Essence';
      case 'hybride':
        return 'Hybride';
      default:
        return fuelType || 'Non spécifié';
    }
  };

  // Fonction pour obtenir le label de transmission
  const getTransmissionLabel = (transmission: string | null) => {
    switch (transmission?.toLowerCase()) {
      case 'automatic':
        return 'Automatique';
      case 'manual':
        return 'Manuelle';
      default:
        return transmission || 'Non spécifié';
    }
  };

  return (
    <div className="border rounded-lg shadow-lg overflow-hidden bg-white hover:shadow-xl transition-all duration-300">
      <div className="relative">
        <img
          src={car.image_url || "/placeholder.png"}
          alt={car.name}
          className="w-full h-48 object-cover"
        />
        {!isCarAvailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
              Non disponible
            </span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900">{car.name}</h3>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
            {car.category}
          </span>
        </div>
        
        <p className="text-2xl font-bold text-primary mb-4">
          {car.price} Dhs <span className="text-sm text-gray-500 font-normal">/ jour</span>
        </p>

        {/* Spécifications détaillées */}
        <div className="space-y-3 mb-4">
          {/* Ligne 1: Carburant et Transmission */}
          <div className="flex justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              {getFuelIcon(car.fuel)}
              <span>{getFuelLabel(car.fuel)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Cog className="h-4 w-4" />
              <span>{getTransmissionLabel(car.transmission)}</span>
            </div>
          </div>

          {/* Ligne 2: Places et Disponibilité */}
          <div className="flex justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{car.seats || 'N/A'} places</span>
            </div>
          </div>
        </div>

        <Button
          className="w-full bg-gradient-to-r from-[var(--accent-gradient)] to-[var(--accent-gradient-to)] text-white hover:shadow-[var(--glow-shadow)] transition-all duration-300 font-semibold"
          onClick={() => onReserve(car)}
          disabled={!canReserve || !isCarAvailable}
          size="lg"
        >
          {!isCarAvailable ? 'Indisponible' : 'Réserver maintenant'}
        </Button>

        {!canReserve && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Complétez la recherche pour réserver
          </p>
        )}
      </div>
    </div>
  );
};