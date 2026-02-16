import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";


export default function ChangePassword() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // États séparés pour la visibilité de chaque champ
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const navigate = useNavigate();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: t("error"),
        description: t("password_mismatch"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({
        title: t("success"),
        description: t("password_updated_success"),
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast({
        title: t("error"),
        description: t("password_update_error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        {/* Carte à fond bleu clair */}
        <Card className="w-full max-w-md bg-[#e8f1ff] shadow-md border border-blue-100 rounded-2xl">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="
              absolute left-4 top-4
              h-9 w-9
              flex items-center justify-center
              rounded-full
              bg-blue-700
              text-white
              hover:bg-white
              hover:text-blue-700
              outline-none ring-2 ring-blue-700
              transition
            "
            aria-label={t("back")}
          >
            <ArrowLeft size={18} />
          </button>
          <CardHeader className="text-center space-y-1 relative">
            <div className="flex justify-center mb-2">
              <Lock className="h-10 w-10 text-blue-700" />
            </div>

            <CardTitle className="text-2xl font-semibold text-blue-900">
              {t("changepassword")}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-5">
              {/* Mot de passe actuel */}
              <div>
                <label className="block mb-1 text-sm font-medium text-blue-900">
                  {t("current_password")}
                </label>
                <div className="relative">
                  <Input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="bg-white border border-gray-300 text-gray-900 pr-10 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-blue-600 transition"
                  >
                    {showCurrent ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              {/* Nouveau mot de passe */}
              <div>
                <label className="block mb-1 text-sm font-medium text-blue-900">
                  {t("new_password")}
                </label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="bg-white border border-gray-300 text-gray-900 pr-10 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-blue-600 transition"
                  >
                    {showNew ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirmation du mot de passe */}
              <div>
                <label className="block mb-1 text-sm font-medium text-blue-900">
                  {t("confirm_password")}
                </label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-white border border-gray-300 text-gray-900 pr-10 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-blue-600 transition"
                  >
                    {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              <CardFooter className="p-0 mt-4">
                <Button
                  type="submit"
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg transition-all"
                  disabled={loading}
                >
                  {loading ? t("saving") + "..." : t("update_password")}
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
