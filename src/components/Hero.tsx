import { SearchForm, SearchData } from "@/components/SearchForm";
import heroImage from "@/assets/hero-car.jpg";
import { useTranslation } from "react-i18next";

interface HeroProps {
  onSearch: (searchData: SearchData) => void;
}

export const Hero = ({ onSearch }: HeroProps) => {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-[70vh] flex items-center">
      {/* Background */}
      <div className="absolute inset-0 bg-[var(--hero-bg)] overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <img 
          src={heroImage} 
          alt={t('hero.image_alt')}
          className="w-full h-full object-cover opacity-30"
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center text-primary-foreground mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {t('hero.title.line1')}
            <span className="block bg-gradient-to-r from-[var(--accent-gradient)] to-[var(--accent-gradient-to)] bg-clip-text text-transparent">
              {t('hero.title.line2')}
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-primary-foreground/90 max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>
        </div>
        
        {/* Search Form */}
        <div className="max-w-6xl mx-auto">
          <SearchForm onSearch={onSearch} />
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent"></div>
    </section>
  );
};