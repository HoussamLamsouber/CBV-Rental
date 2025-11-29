import { Mail, Phone, MapPin, Clock, Facebook, Instagram } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";

export default function Contact() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-6xl mx-auto p-6 flex-1">
        <h1 className="text-3xl font-bold text-gray-800 mb-10 text-center">
          {t("contact")}
        </h1>

        {/* Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

          {/* Information Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">

            {/* Phone */}
            <div className="flex items-center space-x-3">
              <Phone className="text-blue-700" />
              <p className="text-gray-700 font-medium">+212 6 65 29 13 14</p>
            </div>

            {/* Email */}
            <div className="flex items-center space-x-3">
              <Mail className="text-blue-700" />
              <p className="text-gray-700 font-medium">contact@cbvrental.com</p>
            </div>

            {/* Address */}
            <div className="flex items-center space-x-3">
              <MapPin className="text-blue-700" />
              <p className="text-gray-700 font-medium">Gare TGV, Tanger — Maroc</p>
            </div>

            {/* Hours */}
            <div className="flex items-start space-x-3">
              <Clock className="text-blue-700 mt-1" />
              <div className="text-gray-700">
                <p>{t("monday_friday")}: <strong>08:00 - 20:00</strong></p>
                <p>{t("saturday")}: <strong>09:00 - 18:00</strong></p>
                <p>{t("sunday")}: <strong>09:00 - 16:00</strong></p>
              </div>
            </div>

            {/* Social icons */}
            <div className="flex space-x-4 pt-4 border-t">
              <a href="#" target="_blank">
                <Facebook className="text-blue-700 hover:text-blue-900 cursor-pointer" />
              </a>
              <a href="#" target="_blank">
                <Instagram className="text-blue-700 hover:text-blue-900 cursor-pointer" />
              </a>
            </div>
          </div>

          {/* Larger Map */}
          <div className="rounded-xl overflow-hidden shadow-lg">
            <iframe
              className="w-full h-[400px] md:h-[450px] lg:h-[500px]"
              loading="lazy"
              src="https://maps.google.com/maps?q=gare%20tgv%20tanger&t=&z=13&ie=UTF8&iwloc=&output=embed"
            ></iframe>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
