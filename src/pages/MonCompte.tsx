import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CalendarIcon, 
  MapPinIcon, 
  ClockIcon, 
  Check, 
  ChevronsUpDown,
  Search,
  ArrowRightLeft,
  Car
} from "lucide-react";
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
}

interface SearchFormProps {
  onSearch: (searchData: SearchData) => void;
}

// Component réutilisable pour l'autocomplétion
const AutoCompleteInput = ({
  items,
  placeholder,
  value,
  onSelect,
  icon
}: {
  items: { value: string; label: string }[];
  placeholder: string;
  value: string;
  onSelect: (value: string) => void;
  icon?: React.ReactNode;
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
          className="w-full justify-between h-12 border-gray-300 hover:border-blue-500 transition-colors min-w-0" // Ajout de min-w-0
        >
          <div className="flex items-center gap-2 flex-1 text-left min-w-0">
            {icon}
            <span className={cn("truncate", !selectedItem && "text-muted-foreground")}>
              {selectedItem ? selectedItem.label : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher une location..." />
          <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
            Aucun résultat trouvé.
          </CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {items.map((item) => (
              <CommandItem
                key={item.value}
                value={item.label}
                onSelect={() => {
                  onSelect(item.value);
                  setOpen(false);
                }}
                className="flex items-center gap-2"
              >
                <Check
                  className={cn(
                    "h-4 w-4",
                    value === item.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <MapPinIcon className="h-4 w-4 text-muted-foreground" />
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
  const [sameLocation, setSameLocation] = useState(false);
  const [pickupDate, setPickupDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState("09:00");
  const [returnTime, setReturnTime] = useState("09:00");

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
      returnTime
    });
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-2xl p-4 sm:p-6 shadow-xl shadow-blue-500/5">
      {/* Header avec titre */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Car className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Réservez votre véhicule</h2>
          <p className="text-xs sm:text-sm text-gray-600">Trouvez la voiture parfaite pour votre voyage</p>
        </div>
      </div>

      {/* Lieux - Version mobile empilée */}
      <div className="space-y-4 sm:space-y-0 sm:flex sm:items-end sm:gap-4 mb-6 sm:mb-8">
        {/* Pickup Location */}
        <div className="flex-1 space-y-3 min-w-0">
          <Label htmlFor="pickupLocation" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-blue-600" />
            Lieu de départ
          </Label>
          <AutoCompleteInput
            items={allLocations}
            placeholder="Aéroport ou gare de départ"
            value={pickupLocation}
            onSelect={setPickupLocation}
            icon={<MapPinIcon className="h-4 w-4 text-blue-600" />}
          />
        </div>

        {/* Bouton de swap - Centré verticalement sur mobile */}
        <div className="flex justify-center sm:justify-start sm:pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSameLocation(!sameLocation)}
            className={cn(
              "rounded-full p-3 border-2 transition-all duration-300",
              sameLocation 
                ? "bg-green-50 border-green-200 text-green-600" 
                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
            )}
            title={sameLocation ? "Lieux différents" : "Même lieu"}
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Return Location */}
        <div className="flex-1 space-y-3 min-w-0">
          <Label htmlFor="returnLocation" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-green-600" />
            Lieu de retour
          </Label>
          {sameLocation ? (
            <div className="relative">
              <Input
                value={pickupLocation}
                readOnly
                className="bg-green-50 border-green-200 cursor-not-allowed h-12"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs sm:text-sm text-green-700 bg-green-50/80 px-2 sm:px-3 py-1 rounded-full font-medium">
                  Identique au départ
                </span>
              </div>
            </div>
          ) : (
            <AutoCompleteInput
              items={allLocations}
              placeholder="Aéroport ou gare de retour"
              value={returnLocation}
              onSelect={setReturnLocation}
              icon={<MapPinIcon className="h-4 w-4 text-green-600" />}
            />
          )}
        </div>
      </div>

      {/* Dates et heures - Version mobile empilée */}
      <div className="space-y-6 sm:space-y-0 sm:grid sm:grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
        {/* Période de départ */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
            <h3 className="font-semibold text-gray-900">Départ</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-12 border-gray-300 hover:border-blue-500 text-sm",
                      !pickupDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {pickupDate ? format(pickupDate, "dd/MM/yy") : "Sélectionner"}
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

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-blue-600" />
                Heure
              </Label>
              <div className="relative">
                <Input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="pl-5 h-12 border-gray-300 focus:border-blue-500 cursor-pointer w-full min-w-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Période de retour */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-6 bg-green-600 rounded-full"></div>
            <h3 className="font-semibold text-gray-900">Retour</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-green-600" />
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-12 border-gray-300 hover:border-green-500 text-sm",
                      !returnDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {returnDate ? format(returnDate, "dd/MM/yy") : "Sélectionner"}
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

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-green-600" />
                Heure
              </Label>
              <div className="relative">
                <Input
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="pl-5 h-12 border-gray-300 focus:border-green-500 cursor-pointer w-full min-w-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bouton de recherche */}
      <Button
        onClick={handleSearch}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 font-semibold h-12 text-sm sm:text-base"
        size="lg"
      >
        <Search className="h-5 w-5 mr-2" />
        Rechercher des véhicules
      </Button>
    </div>
  );
};