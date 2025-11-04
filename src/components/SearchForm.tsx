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
import { useTranslation } from "react-i18next";

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
            {placeholder === "" ? "" : placeholder} {/* ou traduire si besoin */}
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

  const airports = [
    { value: "airport_agadir", label: t("airports.agadir") },
    { value: "airport_al_hoceima", label: t("airports.al_hoceima") },
    { value: "airport_beni_mellal", label: t("airports.beni_mellal") },
    { value: "airport_casablanca", label: t("airports.casablanca") },
    { value: "airport_dakhla", label: t("airports.dakhla") },
    { value: "airport_errachidia", label: t("airports.errachidia") },
    { value: "airport_essaouira", label: t("airports.essaouira") },
    { value: "airport_fes", label: t("airports.fes") },
    { value: "airport_guelmim", label: t("airports.guelmim") },
    { value: "airport_laayoune", label: t("airports.laayoune") },
    { value: "airport_marrakech", label: t("airports.marrakech") },
    { value: "airport_nador", label: t("airports.nador") },
    { value: "airport_ouarzazate", label: t("airports.ouarzazate") },
    { value: "airport_oujda", label: t("airports.oujda") },
    { value: "airport_rabat", label: t("airports.rabat") },
    { value: "airport_tanger", label: t("airports.tanger") },
    { value: "airport_tetouan", label: t("airports.tetouan") },
    { value: "airport_zagora", label: t("airports.zagora") },
    { value: "airport_tan_tan", label: t("airports.tan_tan") },
    { value: "airport_smara", label: t("airports.smara") },
    { value: "airport_bouarfa", label: t("airports.bouarfa") },
    { value: "airport_benslimane", label: t("airports.benslimane") },
    { value: "airport_ifrane", label: t("airports.ifrane") },
    { value: "airport_casablanca_tit_mellil", label: t("airports.casablanca_tit_mellil") },
  ];

  const stations = [
    { value: "station_mohammed_v", label: t("stations.mohammed_v") },
    { value: "station_agadir", label: t("stations.agadir") },
    { value: "station_assilah", label: t("stations.assilah") },
    { value: "station_ben_guerir", label: t("stations.ben_guerir") },
    { value: "station_berrechid", label: t("stations.berrechid") },
    { value: "station_kenitra", label: t("stations.kenitra") },
    { value: "station_khouribga", label: t("stations.khouribga") },
    { value: "station_marrakech", label: t("stations.marrakech") },
    { value: "station_meknes", label: t("stations.meknes") },
    { value: "station_mohammedia", label: t("stations.mohammedia") },
    { value: "station_nador_ville", label: t("stations.nador_ville") },
    { value: "station_oujda", label: t("stations.oujda") },
    { value: "station_rabat_agdal", label: t("stations.rabat_agdal") },
    { value: "station_rabat_ville", label: t("stations.rabat_ville") },
    { value: "station_sale_tabriquet", label: t("stations.sale_tabriquet") },
    { value: "station_sale_ville", label: t("stations.sale_ville") },
    { value: "station_safi", label: t("stations.safi") },
    { value: "station_tanger_ville", label: t("stations.tanger_ville") },
    { value: "station_tanger_med", label: t("stations.tanger_med") },
    { value: "station_taourirt", label: t("stations.taourirt") },
    { value: "station_temara", label: t("stations.temara") },
    { value: "station_casa_voyageurs", label: t("stations.casa_voyageurs") },
    { value: "station_casa_port", label: t("stations.casa_port") },
    { value: "station_casa_oasis", label: t("stations.casa_oasis") },
    { value: "station_casa_mers_sultan", label: t("stations.casa_mers_sultan") },
    { value: "station_el_jadida", label: t("stations.el_jadida") },
    { value: "station_settat", label: t("stations.settat") },
    { value: "station_skhirat", label: t("stations.skhirat") },
    { value: "station_bouznika", label: t("stations.bouznika") },
    { value: "station_zenata", label: t("stations.zenata") },
    { value: "station_ain_sebaa", label: t("stations.ain_sebaa") },
    { value: "station_bouskoura", label: t("stations.bouskoura") },
    { value: "station_facultes", label: t("stations.facultes") },
    { value: "station_ennassim", label: t("stations.ennassim") },
    { value: "station_sidi_kacem", label: t("stations.sidi_kacem") },
    { value: "station_sidi_slimane", label: t("stations.sidi_slimane") },
    { value: "station_sidi_yahya_el_gharb", label: t("stations.sidi_yahya_el_gharb") },
    { value: "station_ksar_el_kebir", label: t("stations.ksar_el_kebir") },
    { value: "station_souk_el_arbaa", label: t("stations.souk_el_arbaa") },
    { value: "station_melloussa", label: t("stations.melloussa") },
    { value: "station_ksar_sghir", label: t("stations.ksar_sghir") },
  ];

  const allLocations = [...airports, ...stations];

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
            items={allLocations}
            placeholder={t("searchForm.pickupPlaceholder")}
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
            title={sameLocation ? t("searchForm.returnPlaceholder") : t("searchForm.swap")}
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
                value={pickupLocation}
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
              items={allLocations}
              placeholder={t("searchForm.returnPlaceholder")}
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
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 font-semibold h-12 text-sm sm:text-base"
        size="lg"
      >
        <Search className="h-5 w-5 mr-2" />
        {t("searchForm.searchButton")}
      </Button>
    </div>
  );

};
