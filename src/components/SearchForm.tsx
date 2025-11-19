// src/components/SearchForm.tsx
import { useState, useEffect } from "react";
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
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

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
          className="w-full justify-between h-12 border-gray-300 hover:border-blue-500 transition-colors min-w-0"
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
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[60vh] overflow-y-auto" 
        align="start"
        side="bottom"
      >
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
            Aucune location trouvée
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

// Composant réutilisable pour les sélecteurs de date
const DatePickerField = ({
  label,
  date,
  onDateChange,
  icon,
  color = "blue",
  disabledCondition
}: {
  label: string;
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  icon: React.ReactNode;
  color?: "blue" | "green";
  disabledCondition?: (date: Date) => boolean;
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        {icon}
        {label}
      </Label>
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-12 border-gray-300 text-sm relative",
              color === "blue" 
                ? "hover:border-blue-500 focus:border-blue-500" 
                : "hover:border-green-500 focus:border-green-500",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "dd/MM/yy") : "Sélectionner"}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 mx-4 sm:mx-0" 
          align="center"
          side="bottom"
          avoidCollisions={true}
          collisionPadding={16}
        >
          <div className="max-h-[80vh] overflow-y-auto">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(selectedDate) => {
                onDateChange(selectedDate);
                setIsCalendarOpen(false);
              }}
              disabled={disabledCondition}
              initialFocus
              className="pointer-events-auto"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const TimePickerField = ({
  label,
  value,
  onChange,
  color = "blue",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  color?: string;
}) => {
  const [open, setOpen] = useState(false);
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = ["00","05","10","15","20","25","30","35","40","45","50","55"];

  return (
    <div className="space-y-3 ml-20">
      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <ClockIcon className={`h-4 w-4 text-${color}-600`} />
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`h-12 w-32 justify-start text-left text-gray-800 border-gray-300 focus:border-${color}-500 cursor-pointer`}
          >
            {value || "Sélectionner l'heure"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Heure</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {hours.map((h) => (
                  <Button
                    key={h}
                    variant={value.startsWith(h) ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      const m = value.split(":")[1] || "00";
                      onChange(`${h}:${m}`);
                    }}
                  >
                    {h}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Minutes</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {minutes.map((m) => (
                  <Button
                    key={m}
                    variant={value.endsWith(m) ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      const h = value.split(":")[0] || "00";
                      onChange(`${h}:${m}`);
                      setOpen(false);
                    }}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export const SearchForm = ({ onSearch }: SearchFormProps) => {
  const { t } = useTranslation();

  const [pickupLocation, setPickupLocation] = useState("");
  const [returnLocation, setReturnLocation] = useState("");
  const [sameLocation, setSameLocation] = useState(false);
  const [pickupDate, setPickupDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState("09:00");
  const [returnTime, setReturnTime] = useState("09:00");
  const [activeLocations, setActiveLocations] = useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les locations actives depuis Supabase
  useEffect(() => {
    fetchActiveLocations();
  }, []);

  const fetchActiveLocations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("active_locations" as any)
        .select("location_value, display_name, location_type, translation_key")
        .eq("is_active", true)
        .order("location_type")
        .order("display_name");

      if (error) throw error;

      // Transformer les données pour le composant d'autocomplétion avec traductions
      const formattedLocations = data?.map((location: any) => {
        let translatedLabel = location.display_name;
        
        if (location.translation_key) {
          const translationNamespace = location.location_type === 'airport' ? 'airports' : 'stations';
          const translation = t(`${translationNamespace}.${location.translation_key}`);
          if (translation && !translation.startsWith(translationNamespace + '.')) {
            translatedLabel = translation;
          }
        }

        return {
          value: location.location_value,
          label: translatedLabel,
          type: location.location_type
        };
      }) || [];

      setActiveLocations(formattedLocations);
    } catch (error) {
      console.error("Erreur chargement locations actives:", error);
      setActiveLocations(getFallbackLocations());
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback en cas d'erreur de chargement
  const getFallbackLocations = () => {
    const airports = [
      { value: "airport_agadir", label: t("airports.agadir") },
      { value: "airport_casablanca", label: t("airports.casablanca") },
      { value: "airport_marrakech", label: t("airports.marrakech") },
      { value: "airport_rabat", label: t("airports.rabat") },
      { value: "airport_tanger", label: t("airports.tanger") },
    ];

    const stations = [
      { value: "station_casa_voyageurs", label: t("stations.casa_voyageurs") },
      { value: "station_rabat_agdal", label: t("stations.rabat_agdal") },
      { value: "station_marrakech", label: t("stations.marrakech") },
    ];

    return [...airports, ...stations];
  };

  // Fonction pour obtenir le label d'une location
  const getLocationLabel = (value: string) => {
    const location = activeLocations.find(item => item.value === value);
    return location ? location.label : value;
  };

  const handleSearch = () => {
    if (!pickupLocation || !pickupDate || !returnDate) {
      // Vous pouvez ajouter une notification d'erreur ici
      console.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    onSearch({
      pickupLocation,
      returnLocation: sameLocation ? pickupLocation : returnLocation,
      sameLocation,
      pickupDate,
      returnDate,
      pickupTime,
      returnTime
    });
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-2xl p-4 sm:p-6 shadow-xl shadow-blue-500/5 relative overflow-visible">
      {/* Header avec titre */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Car className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            {t("searchForm.title")}
          </h2>
        </div>
      </div>

      {/* Lieux */}
      <div className="space-y-4 sm:space-y-0 sm:flex sm:items-end sm:gap-4 mb-6 sm:mb-8">
        <div className="flex-1 space-y-3 min-w-0">
          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-blue-600" />
            {t("searchForm.pickupPlaceholder")}
          </Label>
          <AutoCompleteInput
            items={activeLocations}
            placeholder={isLoading ? "Chargement..." : t("searchForm.pickupPlaceholder")}
            value={pickupLocation}
            onSelect={setPickupLocation}
            icon={<MapPinIcon className="h-4 w-4 text-blue-600" />}
          />
        </div>

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
            title={sameLocation ? t("searchForm.swap") : t("searchForm.swap")}
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-3 min-w-0">
          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-green-600" />
            {t("searchForm.returnPlaceholder")}
          </Label>
          {sameLocation ? (
            <div className="relative">
              <Input
                value={getLocationLabel(pickupLocation)}
                readOnly
                className="bg-green-50 border-green-200 cursor-not-allowed h-12"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs sm:text-sm text-green-700 bg-green-50/80 px-2 sm:px-3 py-1 rounded-full font-medium">
                  {t("searchForm.swap")}
                </span>
              </div>
            </div>
          ) : (
            <AutoCompleteInput
              items={activeLocations}
              placeholder={isLoading ? "Chargement..." : t("searchForm.returnPlaceholder")}
              value={returnLocation}
              onSelect={setReturnLocation}
              icon={<MapPinIcon className="h-4 w-4 text-green-600" />}
            />
          )}
        </div>
      </div>

      {/* Dates et heures */}
      <div className="space-y-6 sm:space-y-0 sm:grid sm:grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
            <h3 className="font-semibold text-gray-900">{t("searchForm.pickupDate")}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <DatePickerField
              label={t("searchForm.pickupDate")}
              date={pickupDate}
              onDateChange={setPickupDate}
              icon={<CalendarIcon className="h-4 w-4 text-blue-600" />}
              color="blue"
              disabledCondition={(date) => date < new Date()}
            />
            <TimePickerField
              label={t("searchForm.pickupTime")}
              value={pickupTime}
              onChange={setPickupTime}
              color="blue"
            />
          </div>
        </div>

        <div className="space-y-4 ml-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-6 bg-green-600 rounded-full"></div>
            <h3 className="font-semibold text-gray-900">{t("searchForm.returnDate")}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <DatePickerField
              label={t("searchForm.returnDate")}
              date={returnDate}
              onDateChange={setReturnDate}
              icon={<CalendarIcon className="h-4 w-4 text-green-600" />}
              color="green"
              disabledCondition={(date) => date < (pickupDate || new Date())}
            />
            <TimePickerField
              label={t("searchForm.returnTime")}
              value={returnTime}
              onChange={setReturnTime}
              color="green"
            />
          </div>
        </div>
      </div>

      {/* Bouton de recherche */}
      <Button
        onClick={handleSearch}
        disabled={isLoading || !pickupLocation || !pickupDate || !returnDate}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 font-semibold h-12 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
        size="lg"
      >
        <Search className="h-5 w-5 mr-2" />
        {isLoading ? "Chargement..." : t("searchForm.searchButton")}
      </Button>
    </div>
  );
};