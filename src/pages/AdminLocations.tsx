// src/pages/AdminLocations.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Search, MapPin, Building, Train, Plane, ToggleLeft, ToggleRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  location_value: string;
  location_type: string;
  display_name: string;
  is_active: boolean;
  translation_key?: string;
  created_at?: string;
  updated_at?: string;
}

export default function AdminLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();
  const { t } = useTranslation();

  const [newLocation, setNewLocation] = useState({
    location_value: "",
    location_type: "airport",
    display_name: ""
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const [validation, setValidation] = useState({
    isDuplicate: false,
    isValid: true
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    filterLocations();
  }, [locations, searchTerm, filterType]);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("active_locations")
        .select("*")
        .order("location_type")
        .order("display_name");
  
      if (error) throw error;
      
      // Simplifier le typage - accepter les données telles quelles
      setLocations((data as Location[]) || []);
    } catch (error: any) {
      console.error("Erreur chargement locations:", error);
      toast({
        title: t("error"),
        description: "Impossible de charger les locations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterLocations = () => {
    let filtered = locations;

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(location => {
        const displayName = getTranslatedDisplayName(location);
        return displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               location.location_value.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filtre par type
    if (filterType !== "all") {
      filtered = filtered.filter(location => location.location_type === filterType);
    }

    setFilteredLocations(filtered);
  };

  // Fonction pour obtenir le nom affiché traduit
  const getTranslatedDisplayName = (location: Location) => {
    if (location.translation_key) {
      const translationNamespace = location.location_type === 'airport' ? 'airports' : 'stations';
      const translation = t(`${translationNamespace}.${location.translation_key}`);
      if (translation && !translation.startsWith(translationNamespace + '.')) {
        return translation;
      }
    }
    return location.display_name;
  };

  const toggleLocationActive = async (location: Location) => {
    try {
      const { error } = await supabase
        .from("active_locations")
        .update({ is_active: !location.is_active })
        .eq("id", location.id);
  
      if (error) throw error;
  
      // Mise à jour locale sans toast
      setLocations(prevLocations => 
        prevLocations.map(loc => 
          loc.id === location.id 
            ? { ...loc, is_active: !location.is_active }
            : loc
        )
      );
    } catch (error: any) {
      console.error("Erreur modification:", error);
      // Optionnel: garder le toast d'erreur seulement
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive",
      });
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.display_name) {
      toast({
        title: "Champ manquant",
        description: "Veuillez saisir un nom d'affichage",
        variant: "destructive",
      });
      return;
    }
  
    if (validation.isDuplicate) {
      toast({
        title: "Conflit détecté",
        description: "Cette valeur technique existe déjà. Veuillez modifier le nom d'affichage.",
        variant: "destructive",
      });
      return;
    }
  
    try {
      // Générer la clé de traduction
      const translationKey = newLocation.display_name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .trim();
  
      const { data, error } = await supabase
        .from("active_locations")
        .insert([{
          location_value: newLocation.location_value,
          location_type: newLocation.location_type,
          display_name: newLocation.display_name,
          translation_key: translationKey,
          is_active: true
        }])
        .select();
  
      if (error) throw error;
  
      // Accepter directement les données retournées
      const addedLocation = data?.[0] as Location;
      
      if (addedLocation) {
        setLocations(prevLocations => [...prevLocations, addedLocation]);
      }
  
      toast({
        title: "Location ajoutée",
        description: `${newLocation.display_name} a été ajouté avec succès`,
      });
  
      // Réinitialiser le formulaire
      setNewLocation({
        location_value: "",
        location_type: "airport",
        display_name: ""
      });
      setValidation({
        isDuplicate: false,
        isValid: true
      });
      setShowAddForm(false);
    } catch (error: any) {
      console.error("Erreur ajout:", error);
      
      if (error.code === '23505') {
        toast({
          title: "Duplicata",
          description: "Une location avec cette valeur technique existe déjà",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter la location",
          variant: "destructive",
        });
      }
    }
  };
  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'airport':
        return <Plane className="h-4 w-4" />;
      case 'station':
        return <Train className="h-4 w-4" />;
      default:
        return <Building className="h-4 w-4" />;
    }
  };

  const getLocationTypeLabel = (type: string) => {
    switch (type) {
      case 'airport':
        return "Aéroport";
      case 'station':
        return "Gare";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des locations...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Fonction pour générer le location_value à partir du display_name
  const generateLocationValue = (displayName: string, type: string) => {
    if (!displayName) return "";
    
    // Nettoyer le nom : minuscules, remplacer espaces par underscores, supprimer accents
    const cleanName = displayName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-z0-9\s]/g, '') // Garder seulement lettres, chiffres et espaces
      .replace(/\s+/g, '_') // Remplacer espaces par underscores
      .trim();

    // Ajouter le préfixe selon le type
    const prefix = type === 'airport' ? 'airport_' : 'station_';
    
    return prefix + cleanName;
  };

  // Fonction pour vérifier si un location_value existe déjà
  const checkLocationValueExists = async (locationValue: string): Promise<boolean> => {
    if (!locationValue) return false;
    
    try {
      const { data, error } = await supabase
        .from("active_locations")
        .select("location_value")
        .eq("location_value", locationValue)
        .single();

      return !error && data !== null;
    } catch (error) {
      return false;
    }
  };

  // Fonction pour gérer le changement du nom d'affichage
  const handleDisplayNameChange = async (displayName: string) => {
    const locationValue = generateLocationValue(displayName, newLocation.location_type);
    const isDuplicate = locationValue ? await checkLocationValueExists(locationValue) : false;

    setNewLocation(prev => ({
      ...prev, 
      display_name: displayName,
      location_value: locationValue
    }));

    setValidation({
      isDuplicate,
      isValid: !isDuplicate && !!displayName
    });
  };

  // Fonction pour gérer le changement de type
  const handleLocationTypeChange = async (type: string) => {
    const locationValue = generateLocationValue(newLocation.display_name, type);
    const isDuplicate = locationValue ? await checkLocationValueExists(locationValue) : false;

    setNewLocation(prev => ({
      ...prev, 
      location_type: type,
      location_value: locationValue
    }));

    setValidation({
      isDuplicate,
      isValid: !isDuplicate && !!newLocation.display_name
    });
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* En-tête */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Gestion des Locations
            </h1>
            <p className="text-gray-600">
              Sélectionnez les locations qui apparaîtront dans la recherche de la page d'accueil
            </p>
          </div>

          {/* Barre de recherche et filtres */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Rechercher une location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tous les types</option>
                <option value="airport">Aéroports</option>
                <option value="station">Gares</option>
              </select>

              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une location
              </Button>
            </div>

            {/* Statistiques */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span>Total: {locations.length}</span>
              <span>Actives: {locations.filter(l => l.is_active).length}</span>
              <span>Aéroports: {locations.filter(l => l.location_type === 'airport').length}</span>
              <span>Gares: {locations.filter(l => l.location_type === 'station').length}</span>
            </div>
          </div>

          {/* Formulaire d'ajout */}
          {showAddForm && (
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Ajouter une nouvelle location</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label htmlFor="location_type">Type *</Label>
                  <select
                    id="location_type"
                    value={newLocation.location_type}
                    onChange={(e) => handleLocationTypeChange(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="airport">Aéroport</option>
                    <option value="station">Gare</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="display_name">Nom d'affichage *</Label>
                  <Input
                    id="display_name"
                    value={newLocation.display_name}
                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                    placeholder="ex: Nouvel Aéroport"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Le nom qui sera affiché aux utilisateurs
                  </p>
                </div>

                <div>
                  <Label htmlFor="location_value">Valeur technique</Label>
                  <div className="relative">
                    <Input
                      id="location_value"
                      value={newLocation.location_value}
                      readOnly
                      className={cn(
                        "mt-1 pr-10",
                        validation.isDuplicate 
                          ? "bg-red-50 border-red-300 text-red-900" 
                          : "bg-gray-50 border-gray-200 text-gray-700"
                      )}
                      placeholder="Généré automatiquement"
                    />
                    {validation.isDuplicate && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className="text-red-500 text-sm">⚠️</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {validation.isDuplicate 
                      ? "Cette valeur existe déjà dans le système" 
                      : "Cette valeur est utilisée dans le système"
                    }
                  </p>
                </div>
              </div>

              {/* Aperçu en temps réel */}
              {newLocation.display_name && (
                <div className={cn(
                  "border rounded-lg p-4 mb-4",
                  validation.isDuplicate 
                    ? "bg-red-50 border-red-200" 
                    : "bg-blue-50 border-blue-200"
                )}>
                  <h4 className={cn(
                    "text-sm font-medium mb-2",
                    validation.isDuplicate ? "text-red-900" : "text-blue-900"
                  )}>
                    {validation.isDuplicate ? "⚠️ Conflit détecté" : "Aperçu"}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Nom affiché :</span>
                      <div className={cn(
                        "mt-1",
                        validation.isDuplicate ? "text-red-700" : "text-blue-700"
                      )}>
                        {newLocation.display_name}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Valeur technique :</span>
                      <div className={cn(
                        "font-mono text-xs mt-1 px-2 py-1 rounded",
                        validation.isDuplicate 
                          ? "bg-red-100 text-red-700" 
                          : "bg-blue-100 text-blue-700"
                      )}>
                        {newLocation.location_value}
                      </div>
                    </div>
                  </div>
                  {validation.isDuplicate && (
                    <p className="text-red-600 text-xs mt-2">
                      Cette valeur technique existe déjà. Veuillez modifier le nom d'affichage.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  onClick={handleAddLocation} 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!newLocation.display_name || !newLocation.location_value || validation.isDuplicate}
                >
                  Ajouter la location
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowAddForm(false);
                  setNewLocation({
                    location_value: "",
                    location_type: "airport",
                    display_name: ""
                  });
                  setValidation({
                    isDuplicate: false,
                    isValid: true
                  });
                }}>
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* Liste des locations */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valeur technique
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLocations.map((location) => {
                    const displayName = getTranslatedDisplayName(location);
                    
                    return (
                      <tr key={location.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {getLocationIcon(location.location_type)}
                            <span className="font-medium text-gray-900">
                              {displayName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            location.location_type === 'airport' 
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {getLocationTypeLabel(location.location_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                          {location.location_value}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            location.is_active 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {location.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleLocationActive(location)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              location.is_active
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {location.is_active ? (
                              <>
                                <ToggleLeft className="h-4 w-4" />
                                Désactiver
                              </>
                            ) : (
                              <>
                                <ToggleRight className="h-4 w-4" />
                                Activer
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredLocations.length === 0 && (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune location trouvée</p>
                  {searchTerm && (
                    <p className="text-gray-400 text-sm mt-2">
                      Aucun résultat pour "{searchTerm}"
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}