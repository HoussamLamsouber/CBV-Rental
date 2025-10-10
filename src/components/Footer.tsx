import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-blue-900 text-white mt-auto border-t border-blue-900"> {/* 🔹 Changé mt-12 en mt-auto */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary">CBV Rental</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-primary transition-colors">Accueil</Link></li>
              <li><Link to="/offres" className="hover:text-primary transition-colors">Offres</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary">Nous Contacter</h3>
            <p className="text-sm">
              Téléphone : +212 6 65 29 13 14 <br />
              Email : contact@cbvrental.com <br />
              Adresse : Gare TGV, Tanger 
            </p>
          </div>
        </div>
        
        <div className="mt-8 pt-4 border-t border-white text-center">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} CBV Rental. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};