import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { Car, Headphones, Train, Shield, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-12 text-center">
          
          {/* Titre principal */}
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-5xl font-bold text-gray-900"
          >
            {t("about_page.title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-gray-600 text-lg max-w-2xl mx-auto"
          >
            {t("about_page.subtitle")}
          </motion.p>

          {/* Section cartes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            {/* 1️⃣ Large choix */}
            <motion.div whileHover={{ scale: 1.03 }}>
              <Card className="w-full shadow-md hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-6 space-y-4 flex flex-col h-full">
                  <Car className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    {t("about_page.card1.title")}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed flex-grow">
                    {t("about_page.card1.text")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* 2️⃣ Conseiller dédié */}
            <motion.div whileHover={{ scale: 1.03 }}>
              <Card className="w-full shadow-md hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-6 space-y-4 flex flex-col h-full">
                  <Headphones className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    {t("about_page.card2.title")}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed flex-grow">
                    {t("about_page.card2.text")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* 3️⃣ Confort à la gare */}
            <motion.div whileHover={{ scale: 1.03 }}>
              <Card className="w-full shadow-md hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-6 space-y-4 flex flex-col h-full">
                  <Train className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    {t("about_page.card3.title")}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed flex-grow">
                    {t("about_page.card3.text")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Nouvelle section avantages supplémentaires */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 text-center">
            <motion.div whileHover={{ scale: 1.03 }}>
              <Card className="w-full shadow-md hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-6 space-y-4 flex flex-col h-full">
                  <Shield className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    {t("about_page.card4.title")}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed flex-grow">
                    {t("about_page.card4.text")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }}>
              <Card className="w-full shadow-md hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-6 space-y-4 flex flex-col h-full">
                  <Clock className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    {t("about_page.card5.title")}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed flex-grow">
                    {t("about_page.card5.text")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }}>
              <Card className="w-full shadow-md hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-6 space-y-4 flex flex-col h-full">
                  <MapPin className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    {t("about_page.card6.title")}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed flex-grow">
                    {t("about_page.card6.text")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Bouton offres */}
          <div className="pt-8">
            <Link to="/offres">
              <Button size="lg" className="px-8">
                {t("about_page.button")}
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;
