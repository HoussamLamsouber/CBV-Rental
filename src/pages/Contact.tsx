import { Mail, Phone, MapPin, Clock, Facebook, Instagram, Twitter, Globe } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Contact() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-4 md:pt-8">
      {/* Header Section */}
      <div className="max-w-6xl mx-auto mb-10 md:mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          {t('contact.title', 'Contactez CBV Rental')}
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl">
          {t('contact.subtitle', 'Votre partenaire de confiance pour la location de voitures à Tanger')}
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        
        {/* Contact Information Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 h-full">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-blue-900 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">CBV</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">CBV Rental</h2>
            </div>
            
            <div className="space-y-6">
              {/* Address */}
              <div className="flex items-start space-x-4">
                <div className="bg-blue-50 p-3 rounded-xl">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700">{t('contact.address', 'Adresse')}</h3>
                  <p className="text-gray-600">Gare TGV, Tanger</p>
                  <p className="text-gray-500 text-sm">{t('morocco', 'Maroc')}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start space-x-4">
                <div className="bg-blue-50 p-3 rounded-xl">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700">{t('contact.phone', 'Téléphone')}</h3>
                  <a 
                    href="tel:+212665291314" 
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors text-lg"
                  >
                    +212 6 65 29 13 14
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start space-x-4">
                <div className="bg-blue-50 p-3 rounded-xl">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700">Email</h3>
                  <a 
                    href="mailto:contact@cbvrental.com" 
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors break-all"
                  >
                    contact@cbvrental.com
                  </a>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start space-x-4">
                <div className="bg-blue-50 p-3 rounded-xl">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700">{t('contact.hours', 'Horaires d\'ouverture')}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('monday_friday', 'Lundi - Vendredi')}</span>
                      <span className="text-gray-800 font-medium">08:00 - 20:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('saturday', 'Samedi')}</span>
                      <span className="text-gray-800 font-medium">09:00 - 18:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('sunday', 'Dimanche')}</span>
                      <span className="text-gray-800 font-medium">09:00 - 16:00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden h-full">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800">
                {t('contact.location', 'Notre agence à Tanger')}
              </h2>
              <p className="text-gray-600 mt-2">
                {t('contact.locationDescription', 'Située à la Gare TGV de Tanger, notre agence est facilement accessible pour vos départs et arrivées.')}
              </p>
            </div>
            
            <div className="h-[400px] md:h-[500px] lg:h-full">
              <iframe
                title={t('contact.mapTitle', 'Emplacement CBV Rental à Tanger')}
                width="100%"
                height="100%"
                loading="lazy"
                allowFullScreen
                className="border-0"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3234.0965461072135!2d-5.902518524177639!3d35.80101057245095!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd0b793b5b197351%3A0x19a1726633563973!2sGare%20Tanger%20Ville%20(TGV)!5e0!3m2!1sfr!2sma!4v1700000000000"
              />
            </div>
            
            {/* Map Instructions */}
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <p className="text-sm text-gray-500 text-center">
                {t('contact.mapHelp', 'Notre agence est située à la Gare TGV de Tanger, parfait pour vos transferts')}
              </p>
            </div>
          </div>
        </div>
      </div>
    <Footer />
    </div>
  );
}