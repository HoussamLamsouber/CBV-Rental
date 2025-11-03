import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Phone, MapPin, Calendar, Shield } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useTranslation } from "react-i18next";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  adresse: string;
  telephone: string;
  dateNaissance: string;
}

const initialUserInfo: UserProfile = {
  id: "",
  email: "",
  full_name: "",
  adresse: "",
  telephone: "",
  dateNaissance: "",
};

const MonCompte = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [userInfo, setUserInfo] = useState<UserProfile>(initialUserInfo);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getNames = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts.length > 1 ? parts[0] : '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    return { firstName, lastName };
  };

  const getProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({ 
        title: t('mon_compte.messages.access_denied'), 
        description: t('mon_compte.messages.please_login'), 
        variant: "destructive" 
      });
      navigate("/auth");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(`id, email, full_name, adresse, telephone, dateNaissance`)
      .eq('id', user.id)
      .single();

    if (error) {
      console.error("Erreur de chargement du profil:", error);
      toast({ 
        title: t("error"), 
        description: t('mon_compte.messages.cannot_load_profile'), 
        variant: "destructive" 
      });
    } else if (data) {
      setUserInfo({
        id: data.id,
        email: data.email || user.email || '',
        full_name: data.full_name || '',
        adresse: data.adresse || '',
        telephone: data.telephone || '',
        dateNaissance: data.dateNaissance || '',
      });
    }
    setLoading(false);
  }, [navigate, toast, t]);

  useEffect(() => {
    getProfile();
  }, [getProfile]);

  const handleSave = async () => {
    setSaving(true);

    if (!userInfo.id) {
      toast({ 
        title: t("error"), 
        description: t('mon_compte.messages.missing_user_id'), 
        variant: "destructive" 
      });
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: userInfo.full_name,
        email: userInfo.email,
        adresse: userInfo.adresse,
        telephone: userInfo.telephone,
        dateNaissance: userInfo.dateNaissance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userInfo.id);

    if (error) {
      console.error("Erreur de sauvegarde:", error);
      toast({ 
        title: t("error"), 
        description: t('mon_compte.messages.save_failed'), 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: t('mon_compte.messages.profile_updated'), 
        description: t('mon_compte.messages.profile_saved_success') 
      });
      setIsEditing(false);
    }
    setSaving(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setUserInfo(prev => ({ ...prev, [id as keyof UserProfile]: value }));
  };

  if (loading && !userInfo.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <LoadingSpinner message={t('mon_compte.messages.loading_profile')} />
      </div>
    );
  }

  const { firstName, lastName } = getNames(userInfo.full_name);
  const avatarFallbackText = `${firstName?.[0] || ''}${lastName?.[0] || ''}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm sm:text-lg">
                  {avatarFallbackText || t('mon_compte.messages.not_configured')}
                </AvatarFallback>
              </Avatar>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">
                  {t('mon_compte.title')}
                </h1>
                <p className="text-gray-600 text-sm sm:text-base truncate">
                  {userInfo.full_name || t('mon_compte.messages.full_name_not_provided')}
                </p>
              </div>
            </div>
            
            <Button 
              onClick={() => {
                if(isEditing) {
                  getProfile(); 
                }
                setIsEditing(!isEditing)
              }}
              variant={isEditing ? "default" : "outline"}
              disabled={loading || saving}
              size="sm"
              className="w-full sm:w-auto mt-4 sm:mt-0"
            >
              {isEditing ? t('mon_compte.actions.cancel') : t('mon_compte.actions.edit')}
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                {t('mon_compte.personal_info')}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6 sm:space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Colonne de gauche */}
                <div className="space-y-4">
                  {/* Nom complet */}
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name" className="text-sm font-medium">
                      {t('mon_compte.fields.full_name')}
                    </Label>
                    <Input
                      id="full_name"
                      value={userInfo.full_name}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder={t('mon_compte.placeholders.full_name')}
                      className="text-sm h-10"
                    />
                  </div>

                  {/* Date de naissance */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dateNaissance" className="text-sm font-medium">
                      {t('mon_compte.fields.birth_date')}
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="dateNaissance"
                        type="date"
                        value={userInfo.dateNaissance}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="pl-9 text-sm h-10 appearance-none [color-scheme:light]"
                      />
                    </div>
                  </div>

                  {/* Adresse */}
                  <div className="space-y-1.5">
                    <Label htmlFor="adresse" className="text-sm font-medium">
                      {t('mon_compte.fields.address')}
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="adresse"
                        value={userInfo.adresse}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="pl-9 text-sm h-10"
                        placeholder={t('mon_compte.placeholders.address')}
                      />
                    </div>
                  </div>
                </div>

                {/* Colonne de droite */}
                <div className="space-y-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium">
                      {t('mon_compte.fields.email')}
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={userInfo.email}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="pl-9 text-sm h-10"
                        placeholder={t('mon_compte.placeholders.email')}
                      />
                    </div>
                  </div>

                  {/* Téléphone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="telephone" className="text-sm font-medium">
                      {t('mon_compte.fields.phone')}
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="telephone"
                        value={userInfo.telephone}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="pl-9 text-sm h-10"
                        placeholder={t('mon_compte.placeholders.phone')}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Boutons (affichés uniquement en édition) */}
              {isEditing && (
                <div className="flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-gray-200 mt-2">
                  <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 h-10"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {t('mon_compte.actions.saving')}
                      </>
                    ) : (
                      t('mon_compte.actions.save')
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 h-10"
                  >
                    {t('mon_compte.actions.cancel')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MonCompte;