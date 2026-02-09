// src/pages/AdminLocalisations.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Search, MapPin, Building, Train, Plane, ToggleLeft, ToggleRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Localisation {
  id: string;
  localisation_value: string;
  localisation_type: string;
  display_name: string;
  is_active: boolean;
  translation_key?: string;
  created_at?: string;
  updated_at?: string;
}

export default function AdminLocalisations() {
  const [localisations, setLocalisations] = useState<Localisation[]>([]);
  const [filteredLocalisations, setFilteredLocalisations] = useState<Localisation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();
  const { t } = useTranslation();

  const [newLocalisation, setNewLocalisation] = useState({
    localisation_value: "",
    localisation_type: "airport",
    display_name: ""
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const [validation, setValidation] = useState({
    isDuplicate: false,
    isValid: true
  });

  useEffect(() => {
    fetchLocalisations();
  }, []);

  useEffect(() => {
    filterLocalisations();
  }, [localisations, searchTerm, filterType]);

  const fetchLocalisations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("active_localisations")
        .select("*")
        .order("localisation_type")
        .order("display_name");
  
      if (error) throw error;
      
      // Simplifier le typage - accepter les données telles quelles
      setLocalisations((data as Localisation[]) || []);
    } catch (error: any) {
      console.error("Erreur chargement localisations:", error);
      toast({
        title: t("error"),
        description: "Impossible de charger les localisations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterLocalisations = () => {
    let filtered = localisations;

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(localisation => {
        const displayName = getTranslatedDisplayName(localisation);
        return displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               localisation.localisation_value.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filtre par type
    if (filterType !== "all") {
      filtered = filtered.filter(localisation => localisation.localisation_type === filterType);
    }

    setFilteredLocalisations(filtered);
  };

  // Fonction pour obtenir le nom affiché traduit
  const getTranslatedDisplayName = (localisation: Localisation) => {
    if (localisation.translation_key) {
      const translationNamespace = localisation.localisation_type === 'airport' ? 'airports' : 'stations';
      const translation = t(`${translationNamespace}.${localisation.translation_key}`);
      if (translation && !translation.startsWith(translationNamespace + '.')) {
        return translation;
      }
    }
    return localisation.display_name;
  };

  const toggleLocalisationActive = async (localisation: Localisation) => {
    try {
      const { error } = await supabase
        .from("active_localisations")
        .update({ is_active: !localisation.is_active })
        .eq("id", localisation.id);
  
      if (error) throw error;
  
      // Mise à jour locale sans toast
      setLocalisations(prevLocalisations => 
        prevLocalisations.map(loc => 
          loc.id === localisation.id 
            ? { ...loc, is_active: !localisation.is_active }
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

  const handleAddLocalisation = async () => {
    if (!newLocalisation.display_name) {
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
      const translationKey = newLocalisation.display_name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .trim();
  
      const { data, error } = await supabase
        .from("active_localisations")
        .insert([{
          localisation_value: newLocalisation.localisation_value,
          localisation_type: newLocalisation.localisation_type,
          display_name: newLocalisation.display_name,
          translation_key: translationKey,
          is_active: true
        }])
        .select();
  
      if (error) throw error;
  
      // Accepter directement les données retournées
      const addedLocalisation = data?.[0] as Localisation;
      
      if (addedLocalisation) {
        setLocalisations(prevLocalisations => [...prevLocalisations, addedLocalisation]);
      }
  
      toast({
        title: "Localisation ajoutée",
        description: `${newLocalisation.display_name} a été ajouté avec succès`,
      });
  
      // Réinitialiser le formulaire
      setNewLocalisation({
        localisation_value: "",
        localisation_type: "airport",
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
          description: "Une localisation avec cette valeur technique existe déjà",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter la localisation",
          variant: "destructive",
        });
      }
    }
  };
  const getLocalisationIcon = (type: string) => {
    switch (type) {
      case 'airport':
        return <Plane className="h-4 w-4" />;
      case 'station':
        return <Train className="h-4 w-4" />;
      default:
        return <Building className="h-4 w-4" />;
    }
  };

  const getLocalisationTypeLabel = (type: string) => {
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
              <p className="text-gray-600">{t('admin_localisations.messages.loading')}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Fonction pour générer le localisation_value à partir du display_name
  const generateLocalisationValue = (displayName: string, type: string) => {
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

  // Fonction pour vérifier si un localisation_value existe déjà
  const checkLocalisationValueExists = async (localisationValue: string): Promise<boolean> => {
    if (!localisationValue) return false;
    
    try {
      const { data, error } = await supabase
        .from("active_localisations")
        .select("localisation_value")
        .eq("localisation_value", localisationValue)
        .single();

      return !error && data !== null;
    } catch (error) {
      return false;
    }
  };

  // Fonction pour gérer le changement du nom d'affichage
  const handleDisplayNameChange = async (displayName: string) => {
    const localisationValue = generateLocalisationValue(displayName, newLocalisation.localisation_type);
    const isDuplicate = localisationValue ? await checkLocalisationValueExists(localisationValue) : false;

    setNewLocalisation(prev => ({
      ...prev, 
      display_name: displayName,
      localisation_value: localisationValue
    }));

    setValidation({
      isDuplicate,
      isValid: !isDuplicate && !!displayName
    });
  };

  // Fonction pour gérer le changement de type
  const handleLocalisationTypeChange = async (type: string) => {
    const localisationValue = generateLocalisationValue(newLocalisation.display_name, type);
    const isDuplicate = localisationValue ? await checkLocalisationValueExists(localisationValue) : false;

    setNewLocalisation(prev => ({
      ...prev, 
      localisation_type: type,
      localisation_value: localisationValue
    }));

    setValidation({
      isDuplicate,
      isValid: !isDuplicate && !!newLocalisation.display_name
    });
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* En-tête */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('admin_localisations.title')}
            </h1>
            <p className="text-gray-600">
              {t('admin_localisations.subtitle')}
            </p>
          </div>

          {/* Barre de recherche et filtres */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder={t('admin_localisations.search.placeholder')}
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
                <option value="all">{t('admin_localisations.filters.all_types')}</option>
                <option value="airport">{t('admin_localisations.filters.airports')}</option>
                <option value="station">{t('admin_localisations.filters.stations')}</option>
              </select>

              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('admin_localisations.actions.add_localisation')}
              </Button>
            </div>

            {/* Statistiques */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span>{t('admin_localisations.stats.total')}: {localisations.length}</span>
              <span>{t('admin_localisations.stats.active')}: {localisations.filter(l => l.is_active).length}</span>
              <span>{t('admin_localisations.stats.airports')}: {localisations.filter(l => l.localisation_type === 'airport').length}</span>
              <span>{t('admin_localisations.stats.stations')}: {localisations.filter(l => l.localisation_type === 'station').length}</span>
            </div>
          </div>

          {/* Formulaire d'ajout */}
          {showAddForm && (
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">{t('admin_localisations.add_form.title')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label htmlFor="localisation_type">{t('admin_localisations.add_form.type')} *</Label>
                  <select
                    id="localisation_type"
                    value={newLocalisation.localisation_type}
                    onChange={(e) => handleLocalisationTypeChange(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="airport">{t('admin_localisations.types.airport')}</option>
                    <option value="station">{t('admin_localisations.types.station')}</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="display_name">{t('admin_localisations.add_form.display_name')} *</Label>
                  <Input
                    id="display_name"
                    value={newLocalisation.display_name}
                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                    placeholder={t('admin_localisations.add_form.display_name_placeholder')}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('admin_localisations.add_form.display_name_help')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="localisation_value">{t('admin_localisations.add_form.technical_value')}</Label>
                  <div className="relative">
                    <Input
                      id="localisation_value"
                      value={newLocalisation.localisation_value}
                      readOnly
                      className={cn(
                        "mt-1 pr-10",
                        validation.isDuplicate 
                          ? "bg-red-50 border-red-300 text-red-900" 
                          : "bg-gray-50 border-gray-200 text-gray-700"
                      )}
                      placeholder={t('admin_localisations.add_form.technical_value_placeholder')}
                    />
                    {validation.isDuplicate && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className="text-red-500 text-sm">⚠️</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {validation.isDuplicate 
                      ? t('admin_localisations.validation.duplicate')
                      : t('admin_localisations.add_form.technical_value_help')
                    }
                  </p>
                </div>
              </div>

              {/* Aperçu en temps réel */}
              {newLocalisation.display_name && (
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
                    {validation.isDuplicate 
                      ? t('admin_localisations.add_form.conflict_detected')
                      : t('admin_localisations.add_form.preview')
                    }
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Nom affiché :</span>
                      <div className={cn(
                        "mt-1",
                        validation.isDuplicate ? "text-red-700" : "text-blue-700"
                      )}>
                        {newLocalisation.display_name}
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
                        {newLocalisation.localisation_value}
                      </div>
                    </div>
                  </div>
                  {validation.isDuplicate && (
                    <p className="text-red-600 text-xs mt-2">
                      {t('admin_localisations.add_form.conflict_message')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  onClick={handleAddLocalisation} 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!newLocalisation.display_name || !newLocalisation.localisation_value || validation.isDuplicate}
                >
                  {t('admin_localisations.actions.add')} {t('admin_localisations.add_form.technical_value')}
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowAddForm(false);
                  setNewLocalisation({
                    localisation_value: "",
                    localisation_type: "airport",
                    display_name: ""
                  });
                  setValidation({
                    isDuplicate: false,
                    isValid: true
                  });
                }}>
                  {t('admin_localisations.actions.cancel')}
                </Button>
              </div>
            </div>
          )}

          {/* Liste des localisations */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin_localisations.table.localisation')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin_localisations.table.type')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin_localisations.table.technical_value')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin_localisations.table.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin_localisations.table.action')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLocalisations.map((localisation) => {
                    const displayName = getTranslatedDisplayName(localisation);
                    
                    return (
                      <tr key={localisation.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {getLocalisationIcon(localisation.localisation_type)}
                            <span className="font-medium text-gray-900">
                              {displayName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            localisation.localisation_type === 'airport' 
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {t(`admin_localisations.types.${localisation.localisation_type}`)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                          {localisation.localisation_value}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            localisation.is_active 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {localisation.is_active 
                              ? t('admin_localisations.status.active')
                              : t('admin_localisations.status.inactive')
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleLocalisationActive(localisation)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              localisation.is_active
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {localisation.is_active ? (
                              <>
                                <ToggleLeft className="h-4 w-4" />
                                {t('admin_localisations.actions.deactivate')}
                              </>
                            ) : (
                              <>
                                <ToggleRight className="h-4 w-4" />
                                {t('admin_localisations.actions.activate')}
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredLocalisations.length === 0 && (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">{t('admin_localisations.messages.no_localisations')}</p>
                  {searchTerm && (
                    <p className="text-gray-400 text-sm mt-2">
                      {t('admin_localisations.messages.no_results', { searchTerm })}
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