import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, MapPinIcon, ClockIcon, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

export interface SearchData {
  pickupLocation: string;
  returnLocation: string;
  sameLocation: boolean;
  pickupDate: Date | undefined;
  returnDate: Date | undefined;
  pickupTime: string;
  returnTime: string;
  carType: string;
  transmission: string;
  fuel: string;
  passengers: string;
  sortBy: string;
}

interface SearchFormProps {
  onSearch: (searchData: SearchData) => void;
}

// Component réutilisable pour l'autocomplétion
const AutoCompleteInput = ({
  items,
  placeholder,
  value,
  onSelect
}: {
  items: { value: string; label: string }[];
  placeholder: string;
  value: string;
  onSelect: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const selectedItem = items.find((item) => item.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10"
        >
          {selectedItem ? selectedItem.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher une location..." />
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {items.map((item) => (
              <CommandItem
                key={item.value}
                value={item.label}
                onSelect={() => {
                  onSelect(item.value);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === item.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const SearchForm = ({ onSearch }: SearchFormProps) => {
  const [pickupLocation, setPickupLocation] = useState("");
  const [returnLocation, setReturnLocation] = useState("");
  const [sameLocation, setSameLocation] = useState(false); // Maintenant false par défaut
  const [pickupDate, setPickupDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState("09:00");
  const [returnTime, setReturnTime] = useState("09:00");
  const [carType, setCarType] = useState("all");
  const [transmission, setTransmission] = useState("all");
  const [fuel, setFuel] = useState("all");
  const [passengers, setPassengers] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");
  const [showFilters, setShowFilters] = useState(false);

  const locations = {
    airports: [
      { value: 'Aéroport d’Agadir-Al Massira (AGA)', label: 'Aéroport d’Agadir-Al Massira (AGA)' },
      { value: 'Aéroport d’Al Hoceïma-Cherif Al Idrissi (AHU)', label: 'Aéroport d’Al Hoceïma-Cherif Al Idrissi (AHU)' },
      { value: 'Aéroport de Béni Mellal (BEM)', label: 'Aéroport de Béni Mellal (BEM)' },
      { value: 'Aéroport de Casablanca-Mohammed V (CMN)', label: 'Aéroport de Casablanca-Mohammed V (CMN)' },
      { value: 'Aéroport de Dakhla (VIL)', label: 'Aéroport de Dakhla (VIL)' },
      { value: 'Aéroport d’Errachidia-Moulay Ali Chérif (ERH)', label: 'Aéroport d’Errachidia-Moulay Ali Chérif (ERH)' },
      { value: 'Aéroport d’Essaouira-Mogador (ESU)', label: 'Aéroport d’Essaouira-Mogador (ESU)' },
      { value: 'Aéroport de Fès-Saïss (FEZ)', label: 'Aéroport de Fès-Saïss (FEZ)' },
      { value: 'Aéroport de Guelmim (GLN)', label: 'Aéroport de Guelmim (GLN)' },
      { value: 'Aéroport de Laâyoune-Hassan I (EUN)', label: 'Aéroport de Laâyoune-Hassan I (EUN)' },
      { value: 'Aéroport de Marrakech-Ménara (RAK)', label: 'Aéroport de Marrakech-Ménara (RAK)' },
      { value: 'Aéroport de Nador-Al Aroui (NDR)', label: 'Aéroport de Nador-Al Aroui (NDR)' },
      { value: 'Aéroport d’Ouarzazate (OZZ)', label: 'Aéroport d’Ouarzazate (OZZ)' },
      { value: 'Aéroport d’Oujda-Angads (OUD)', label: 'Aéroport d’Oujda-Angads (OUD)' },
      { value: 'Aéroport de Rabat-Salé (RBA)', label: 'Aéroport de Rabat-Salé (RBA)' },
      { value: 'Aéroport de Tanger-Ibn Battouta (TNG)', label: 'Aéroport de Tanger-Ibn Battouta (TNG)' },
      { value: 'Aéroport de Tétouan-Sania Ramel (TTU)', label: 'Aéroport de Tétouan-Sania Ramel (TTU)' },
      { value: 'Aéroport de Zagora (OZG)', label: 'Aéroport de Zagora (OZG)' },
      { value: 'Aéroport de Tan Tan (TTA)', label: 'Aéroport de Tan Tan (TTA)' },
      { value: 'Aéroport de Smara (SMW)', label: 'Aéroport de Smara (SMW)' },
      { value: 'Aéroport de Bouarfa (UAR)', label: 'Aéroport de Bouarfa (UAR)' },
      { value: 'Aéroport de Benslimane (GMD)', label: 'Aéroport de Benslimane (GMD)' },
      { value: 'Aéroport d’Ifrane (IFR)', label: 'Aéroport d’Ifrane (IFR)' },
      { value: 'Aéroport de Casablanca-Tit Mellil (CAS)', label: 'Aéroport de Casablanca-Tit Mellil (CAS)' },
    ],
    stations: [
      { value: 'Gare de l\'Aéroport Mohammed V', label: 'Gare de l\'Aéroport Mohammed V' },
      { value: 'Gare d\'Agadir', label: 'Gare d\'Agadir' },
      { value: 'Gare d\'Assilah', label: 'Gare d\'Assilah' },
      { value: 'Gare de Ben Guerir', label: 'Gare de Ben Guerir' },
      { value: 'Gare de Berrechid', label: 'Gare de Berrechid' },
      { value: 'Gare de Kénitra', label: 'Gare de Kénitra' },
      { value: 'Gare de Khouribga', label: 'Gare de Khouribga' },
      { value: 'Gare de Marrakech', label: 'Gare de Marrakech' },
      { value: 'Gare de Meknès', label: 'Gare de Meknès' },
      { value: 'Gare de Mohammédia', label: 'Gare de Mohammédia' },
      { value: 'Gare de Nador-Ville', label: 'Gare de Nador-Ville' },
      { value: 'Gare d\'Oujda', label: 'Gare d\'Oujda' },
      { value: 'Gare de Rabat-Agdal', label: 'Gare de Rabat-Agdal' },
      { value: 'Gare de Rabat-Ville', label: 'Gare de Rabat-Ville' },
      { value: 'Gare de Salé-Tabriquet', label: 'Gare de Salé-Tabriquet' },
      { value: 'Gare de Salé-Ville', label: 'Gare de Salé-Ville' },
      { value: 'Gare de Safi', label: 'Gare de Safi' },
      { value: 'Gare de Tanger-Ville', label: 'Gare de Tanger-Ville' },
      { value: 'Gare de Tanger-Med', label: 'Gare de Tanger-Med' },
      { value: 'Gare de Taourirt', label: 'Gare de Taourirt' },
      { value: 'Gare de Témara', label: 'Gare de Témara' },
      { value: 'Gare de Casa-Voyageurs', label: 'Gare de Casa-Voyageurs' },
      { value: 'Gare de Casa-Port', label: 'Gare de Casa-Port' },
      { value: 'Gare de Casa-Oasis', label: 'Gare de Casa-Oasis' },
      { value: 'Gare de Casa-Mers Sultan', label: 'Gare de Casa-Mers Sultan' },
      { value: 'Gare d\'El Jadida', label: 'Gare d\'El Jadida' },
      { value: 'Gare de Settat', label: 'Gare de Settat' },
      { value: 'Gare de Skhirat', label: 'Gare de Skhirat' },
      { value: 'Gare de Bouznika', label: 'Gare de Bouznika' },
      { value: 'Gare de Zenata', label: 'Gare de Zenata' },
      { value: 'Gare d\'Aïn Sebaâ', label: 'Gare d\'Aïn Sebaâ' },
      { value: 'Gare de Bouskoura', label: 'Gare de Bouskoura' },
      { value: 'Gare des Facultés', label: 'Gare des Facultés' },
      { value: 'Gare Ennassim', label: 'Gare Ennassim' },
      { value: 'Gare de Sidi Kacem', label: 'Gare de Sidi Kacem' },
      { value: 'Gare de Sidi Slimane', label: 'Gare de Sidi Slimane' },
      { value: 'Gare de Sidi Yahya El Gharb', label: 'Gare de Sidi Yahya El Gharb' },
      { value: 'Gare de Ksar El Kebir', label: 'Gare de Ksar El Kebir' },
      { value: 'Gare de Souk El Arbaa', label: 'Gare de Souk El Arbaa' },
      { value: 'Gare de Melloussa', label: 'Gare de Melloussa' },
      { value: 'Gare de Ksar Sghir', label: 'Gare de Ksar Sghir' },
    ],
  };

  // Combinez tous les lieux en une seule liste
  const allLocations = [
    ...locations.airports,
    ...locations.stations
  ];

  const handleSearch = () => {
    onSearch({
      pickupLocation,
      returnLocation,
      sameLocation,
      pickupDate,
      returnDate,
      pickupTime,
      returnTime,
      carType,
      transmission,
      fuel,
      passengers,
      sortBy
    });
  };

  const resetFilters = () => {
    setCarType("all");
    setTransmission("all");
    setFuel("all");
    setPassengers("all");
    setSortBy("relevance");
    setSameLocation(false); // Reset à false
  };

  return (
    <div className="bg-card border shadow-[var(--card-shadow)] rounded-xl p-6 backdrop-blur-sm">
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">

        {/* Pickup Location */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="pickupLocation" className="text-sm font-medium">Lieu de départ</Label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sameLocation"
                checked={sameLocation}
                onChange={() => setSameLocation(!sameLocation)}
                className="w-4 h-4"
              />
              <Label htmlFor="sameLocation" className="text-sm font-medium">
                Même lieu
              </Label>
            </div>
          </div>
          
          <AutoCompleteInput
            items={allLocations}
            placeholder="Recherchez un aéroport ou une gare"
            value={pickupLocation}
            onSelect={setPickupLocation}
          />
        </div>

        {/* Return Location - TOUJOURS VISIBLE */}
        <div className="flex-1 space-y-1">
          <Label htmlFor="returnLocation" className="text-sm font-medium">
            {sameLocation ? "Lieu de retour (identique)" : "Lieu de retour"}
          </Label>
          
          {sameLocation ? (
            <div className="relative">
              <Input
                value={pickupLocation}
                readOnly
                className="bg-muted cursor-not-allowed opacity-70"
                placeholder="Identique au lieu de prise en charge"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm text-muted-foreground bg-background/80 px-2 rounded">
                  Identique au lieu de départ
                </span>
              </div>
            </div>
          ) : (
            <AutoCompleteInput
              items={allLocations}
              placeholder="Recherchez un aéroport ou une gare"
              value={returnLocation}
              onSelect={setReturnLocation}
            />
          )}
        </div>
      </div>

      {/* Dates et heures */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Pickup Date */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Date de départ</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !pickupDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {pickupDate ? format(pickupDate, "dd/MM/yyyy") : "Sélectionner"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={pickupDate}
                onSelect={setPickupDate}
                disabled={(date) => date < new Date()}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Pickup Time */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Heure de départ</Label>
          <div className="relative">
            <ClockIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Return Date */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Date de retour</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !returnDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {returnDate ? format(returnDate, "dd/MM/yyyy") : "Sélectionner"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={returnDate}
                onSelect={setReturnDate}
                disabled={(date) => date < (pickupDate || new Date())}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Return Time */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Heure de retour</Label>
          <div className="relative">
            <ClockIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Bouton de recherche */}
      <Button
        onClick={handleSearch}
        className="w-full bg-gradient-to-r from-[var(--accent-gradient)] to-[var(--accent-gradient-to)] text-white hover:shadow-[var(--glow-shadow)] transition-all duration-300 font-semibold"
        size="lg"
      >
        Rechercher
      </Button>

      {/* Filtres avancés */}
      {showFilters && (
        <>
          <Separator className="my-4" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Vos filtres ici */}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Réinitialiser
            </Button>
          </div>
        </>
      )}
    </div>
  );
};