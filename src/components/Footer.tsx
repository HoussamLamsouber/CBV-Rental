import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter } from "lucide-react";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-blue-900 to-blue-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Logo et description */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-blue-900 font-bold text-lg">CBV</span>
              </div>
              <h3 className="text-2xl font-bold text-white">CBV Rental</h3>
            </div>
            <p className="text-blue-100 text-sm leading-relaxed mb-4">
              Votre partenaire de confiance pour la location de véhicules premium à Tanger et dans tout le Maroc.
            </p>
          </div>

          {/* Navigation rapide */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white border-l-4 border-blue-400 pl-3">
              Navigation
            </h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/" 
                  className="text-blue-100 hover:text-white transition-colors duration-200 flex items-center group"
                >
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 group-hover:scale-125 transition-transform"></span>
                  Accueil
                </Link>
              </li>
              <li>
                <Link 
                  to="/offres" 
                  className="text-blue-100 hover:text-white transition-colors duration-200 flex items-center group"
                >
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 group-hover:scale-125 transition-transform"></span>
                  Nos Véhicules
                </Link>
              </li>
              <li>
                <Link 
                  to="/ma-reservation" 
                  className="text-blue-100 hover:text-white transition-colors duration-200 flex items-center group"
                >
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 group-hover:scale-125 transition-transform"></span>
                  Mes Réservations
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white border-l-4 border-blue-400 pl-3">
              Contact
            </h4>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Phone size={18} className="text-blue-300 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-blue-100 font-medium">Téléphone</p>
                  <p className="text-white text-sm">+212 6 65 29 13 14</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Mail size={18} className="text-blue-300 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-blue-100 font-medium">Email</p>
                  <p className="text-white text-sm">contact@cbvrental.com</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin size={18} className="text-blue-300 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-blue-100 font-medium">Adresse</p>
                  <p className="text-white text-sm">Gare TGV, Tanger</p>
                  <p className="text-blue-200 text-xs">Maroc</p>
                </div>
              </div>
            </div>
          </div>

          {/* Horaires d'ouverture */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white border-l-4 border-blue-400 pl-3">
              Horaires
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-blue-100">
                <span>Lun - Ven:</span>
                <span className="text-white">08:00 - 20:00</span>
              </div>
              <div className="flex justify-between text-blue-100">
                <span>Samedi:</span>
                <span className="text-white">09:00 - 18:00</span>
              </div>
              <div className="flex justify-between text-blue-100">
                <span>Dimanche:</span>
                <span className="text-white">09:00 - 16:00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section basse */}
        <div className="mt-12 pt-8 border-t border-blue-700">
          <div className="text-center">
            <p className="text-blue-200 text-sm">
              &copy; {currentYear} CBV Rental. Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};