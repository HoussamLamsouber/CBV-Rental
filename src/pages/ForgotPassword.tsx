import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Footer } from "@/components/Footer";

export default function ForgotPassword() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "http://localhost:3000/reset-password"
      });

      if (error) throw error;

      toast({
        title: t("success"),
        description: t("reset_email_sent"),
      });

      setEmail("");
    } catch {
      toast({
        title: t("error"),
        description: t("reset_email_error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md bg-[#e8f1ff] shadow-md border border-blue-100 rounded-2xl">
          <CardHeader className="text-center space-y-1">
            <div className="flex justify-center mb-2">
              <Mail className="h-10 w-10 text-blue-700" />
            </div>
            <CardTitle className="text-2xl font-semibold text-blue-900">
              {t("forgotpassword")}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block mb-1 text-sm font-medium text-blue-900">
                  {t("email")}
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white border border-gray-300 text-gray-900"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg transition-all"
                disabled={loading}
              >
                {loading ? t("sending") + "..." : t("send_reset_link")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </>
  );
}
