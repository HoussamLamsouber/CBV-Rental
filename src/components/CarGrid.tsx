import { CarCard } from "@/components/CarCard";
import { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

type Car = Database["public"]["Tables"]["cars"]["Row"] & {
  isAvailable?: boolean; // Ajoutez cette ligne
};

interface CarGridProps {
  cars: Car[];
  onReserve: (car: Car) => void;
  canReserve: boolean;
}

export const CarGrid = ({ cars, onReserve, canReserve }: CarGridProps) => {
  const [sortBy, setSortBy] = useState("price");
  const [filterBy, setFilterBy] = useState("all");

  // Utilisez isAvailable pour le comptage
  const availableCars = cars.filter(car => car.isAvailable !== undefined ? car.isAvailable : car.available);
  const totalCars = cars.length;

  const filteredCars = cars.filter(car => {
    if (filterBy === "all") return true;
    if (filterBy === "available") {
      return car.isAvailable !== undefined ? car.isAvailable : car.available;
    }
    return car.category.toLowerCase().includes(filterBy.toLowerCase());
  });

  const sortedCars = [...filteredCars].sort((a, b) => {
    switch (sortBy) {
      case "price":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold mb-2">Véhicules disponibles</h2>
            <p className="text-muted-foreground">
              {availableCars.length} véhicules disponibles sur {totalCars}
            </p>
          </div>

          {/* Filters and Sort */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrer par..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les véhicules</SelectItem>
                  <SelectItem value="available">Disponibles uniquement</SelectItem>
                  <SelectItem value="Berlin">Berlin</SelectItem>
                  <SelectItem value="Electrique">Electrique</SelectItem>
                  <SelectItem value="SUV">SUV</SelectItem>
                  <SelectItem value="SUV Urbain">SUV Urbain</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Trier par..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Prix croissant</SelectItem>
                  <SelectItem value="price-desc">Prix décroissant</SelectItem>
                  <SelectItem value="name">Nom A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Badge
            variant={filterBy === "all" ? "default" : "outline"}
            className="cursor-pointer hover:bg-accent/20 transition-colors"
            onClick={() => setFilterBy("all")}
          >
            Tous
          </Badge>
          <Badge
            variant={filterBy === "available" ? "default" : "outline"}
            className="cursor-pointer hover:bg-accent/20 transition-colors"
            onClick={() => setFilterBy("available")}
          >
            Disponibles
          </Badge>
          <Badge
            variant={filterBy === "SUV" ? "default" : "outline"}
            className="cursor-pointer hover:bg-accent/20 transition-colors"
            onClick={() => setFilterBy("SUV")}
          >
            SUV
          </Badge>
          <Badge
            variant={filterBy === "Berlin" ? "default" : "outline"}
            className="cursor-pointer hover:bg-accent/20 transition-colors"
            onClick={() => setFilterBy("Berlin")}
          >
            Berlin
          </Badge>
        </div>

        {/* Car Grid */}
        {sortedCars.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedCars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                onReserve={onReserve}
                canReserve={canReserve}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-4">
              Aucun véhicule ne correspond à vos critères
            </p>
          </div>
        )}
      </div>
    </section>
  );
};