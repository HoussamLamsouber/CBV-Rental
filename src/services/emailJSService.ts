// services/emailJSService.ts
import emailjs from '@emailjs/browser';

const EMAILJS_CONFIG = {
  PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  TEMPLATES: {
    NEW_RESERVATION_ADMIN: import.meta.env.VITE_EMAILJS_TEMPLATE_ADMIN,
    RESERVATION_STATUS: import.meta.env.VITE_EMAILJS_TEMPLATE_CLIENT_ACCEPTED,
  }
};

const EMAILJS_CONFIG_CANCEL = {
  PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY_CANCEL,
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID_CANCEL,
  TEMPLATES: {
    CANCELLATION_ADMIN: import.meta.env.VITE_EMAILJS_TEMPLATE_CANCEL_ADMIN,
    CANCELLATION_CLIENT: import.meta.env.VITE_EMAILJS_TEMPLATE_CANCEL_CLIENT,
  }
};

// Service de traduction pour les emails
const emailTranslations = {
  fr: {
    notSpecified: 'Non spécifié',
    notProvided: 'Non renseigné',
    currency: 'Dhs',
    cancellationDate: 'Date d\'annulation'
  },
  en: {
    notSpecified: 'Not specified',
    notProvided: 'Not provided', 
    currency: 'MAD',
    cancellationDate: 'Cancellation date'
  }
};

// Fonction utilitaire pour obtenir la langue
const getEmailLanguage = (clientEmail?: string) => {
  // Vous pourriez déterminer la langue basée sur l'email, le domaine, etc.
  // Pour l'instant, on utilise le français par défaut
  return 'fr';
};

// Fonction utilitaire pour formater les dates selon la langue
const formatDateForEmail = (dateString: string, language: string = 'fr') => {
  if (!dateString) return emailTranslations[language].notSpecified;
  
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };
  
  return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', options);
};

// Fonction utilitaire pour traduire les lieux
const translateLocationForEmail = (location: string, language: string = 'fr') => {
  if (!location) return emailTranslations[language].notSpecified;
  
  // Cette fonction devrait utiliser vos traductions existantes
  // Pour l'instant, on retourne la valeur originale
  return location;
};

// Initialisation
emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);

export const emailJSService = {
  // Email à l'admin pour nouvelle réservation
  async sendNewReservationAdminEmail(reservationData: any) {
    try {
      const language = getEmailLanguage(reservationData.clientEmail);
      const translations = emailTranslations[language];

      const adminResult = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATES.NEW_RESERVATION_ADMIN,
        {
          to_email: 'lamsouber.houssam@gmail.com',
          client_name: reservationData.clientName,
          client_email: reservationData.clientEmail,
          client_phone: reservationData.clientPhone || translations.notSpecified,
          car_name: reservationData.carName,
          car_category: reservationData.carCategory,
          pickup_date: formatDateForEmail(reservationData.pickupDate, language),
          pickup_time: reservationData.pickupTime,
          return_date: formatDateForEmail(reservationData.returnDate, language),
          return_time: reservationData.returnTime,
          pickup_location: translateLocationForEmail(reservationData.pickupLocation, language),
          return_location: translateLocationForEmail(reservationData.returnLocation, language),
          total_price: `${reservationData.totalPrice} ${translations.currency}`,
          reservation_id: reservationData.reservationId,
          admin_url: `${window.location.origin}/admin/reservations`,
          // Variables de langue pour le template
          language: language,
          is_french: language === 'fr',
          is_english: language === 'en'
        }
      );

      return { success: true, adminResult };
    } catch (error) {
      console.error('❌ Erreur email admin réservation:', error);
      return { success: false, error };
    }
  },

  // Email au client pour réservation acceptée
  async sendReservationAcceptedEmail(reservationData: any) {
    try {
      console.log("🚀 ENVOI EMAIL ACCEPTATION");
      
      const language = getEmailLanguage(reservationData.clientEmail);
      const translations = emailTranslations[language];

      const templateParams = {
        to_email: reservationData.clientEmail,
        to_name: reservationData.clientName,
        client_name: reservationData.clientName,
        client_email: reservationData.clientEmail,
        client_phone: reservationData.clientPhone || translations.notProvided,
        car_name: reservationData.carName,
        car_category: reservationData.carCategory,
        pickup_date: formatDateForEmail(reservationData.pickupDate, language),
        pickup_time: reservationData.pickupTime,
        return_date: formatDateForEmail(reservationData.returnDate, language),
        return_time: reservationData.returnTime,
        pickup_location: translateLocationForEmail(reservationData.pickupLocation, language),
        return_location: translateLocationForEmail(reservationData.returnLocation, language),
        total_price: `${reservationData.totalPrice} ${translations.currency}`,
        reservation_id: reservationData.reservationId,
        // Variables pour le template conditionnel
        reservation_status: 'accepted',
        is_accepted: true,
        is_rejected: false,
        // Variables de langue
        language: language,
        is_french: language === 'fr',
        is_english: language === 'en'
      };

      console.log("📤 Paramètres email acceptation:", templateParams);

      const clientResult = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATES.RESERVATION_STATUS,
        templateParams
      );

      console.log("✅ EMAIL ACCEPTATION ENVOYÉ");
      return { success: true, clientResult };
    } catch (error) {
      console.error('❌ ERREUR EMAIL ACCEPTATION:', error);
      return { success: false, error };
    }
  },

  // Email au client pour réservation refusée
  async sendReservationRejectedEmail(reservationData: any) {
    try {
      console.log("🚀 ENVOI EMAIL REFUS");
      
      const language = getEmailLanguage(reservationData.clientEmail);
      const translations = emailTranslations[language];

      const templateParams = {
        to_email: reservationData.clientEmail,
        to_name: reservationData.clientName,
        client_name: reservationData.clientName,
        client_email: reservationData.clientEmail,
        client_phone: reservationData.clientPhone || translations.notProvided,
        car_name: reservationData.carName,
        car_category: reservationData.carCategory,
        pickup_date: formatDateForEmail(reservationData.pickupDate, language),
        pickup_time: reservationData.pickupTime,
        return_date: formatDateForEmail(reservationData.returnDate, language),
        return_time: reservationData.returnTime,
        pickup_location: translateLocationForEmail(reservationData.pickupLocation, language),
        return_location: translateLocationForEmail(reservationData.returnLocation, language),
        total_price: `${reservationData.totalPrice} ${translations.currency}`,
        reservation_id: reservationData.reservationId,
        // Variables pour le template conditionnel
        reservation_status: 'rejected',
        is_accepted: false,
        is_rejected: true,
        rejection_reason: reservationData.rejectionReason || 
          (language === 'fr' 
            ? "Non spécifiée. Veuillez nous contacter pour plus d'informations."
            : "Not specified. Please contact us for more information."),
        // Variables de langue
        language: language,
        is_french: language === 'fr',
        is_english: language === 'en'
      };

      console.log("📤 Paramètres email refus:", templateParams);

      const clientResult = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATES.RESERVATION_STATUS,
        templateParams
      );

      console.log("✅ EMAIL REFUS ENVOYÉ");
      return { success: true, clientResult };
    } catch (error) {
      console.error('❌ ERREUR EMAIL REFUS:', error);
      return { success: false, error };
    }
  },

  // Fonctions d'annulation existantes
  async sendCancellationEmails(reservationData: any) {
    try {
      const language = getEmailLanguage(reservationData.clientEmail);
      const translations = emailTranslations[language];

      emailjs.init(EMAILJS_CONFIG_CANCEL.PUBLIC_KEY);

      const adminResult = await emailjs.send(
        EMAILJS_CONFIG_CANCEL.SERVICE_ID,
        EMAILJS_CONFIG_CANCEL.TEMPLATES.CANCELLATION_ADMIN,
        {
          to_email: 'lamsouber.houssam@gmail.com',
          client_name: reservationData.clientName,
          client_email: reservationData.clientEmail,
          client_phone: reservationData.clientPhone || translations.notProvided,
          car_name: reservationData.carName,
          car_category: reservationData.carCategory,
          pickup_date: formatDateForEmail(reservationData.pickupDate, language),
          return_date: formatDateForEmail(reservationData.returnDate, language),
          total_price: `${reservationData.totalPrice} ${translations.currency}`,
          reservation_id: reservationData.reservationId,
          cancellation_date: formatDateForEmail(new Date().toISOString(), language),
          // Variables de langue
          language: language,
          is_french: language === 'fr',
          is_english: language === 'en'
        }
      );

      const clientResult = await emailjs.send(
        EMAILJS_CONFIG_CANCEL.SERVICE_ID,
        EMAILJS_CONFIG_CANCEL.TEMPLATES.CANCELLATION_CLIENT,
        {
          to_email: reservationData.clientEmail,
          to_name: reservationData.clientName,
          client_name: reservationData.clientName,
          client_email: reservationData.clientEmail,
          car_name: reservationData.carName,
          car_category: reservationData.carCategory,
          pickup_date: formatDateForEmail(reservationData.pickupDate, language),
          return_date: formatDateForEmail(reservationData.returnDate, language),
          total_price: `${reservationData.totalPrice} ${translations.currency}`,
          reservation_id: reservationData.reservationId,
          cancellation_date: formatDateForEmail(new Date().toISOString(), language),
          // Variables de langue
          language: language,
          is_french: language === 'fr',
          is_english: language === 'en'
        }
      );

      return { success: true, adminResult, clientResult };
    } catch (error) {
      console.error('❌ Erreur emails annulation:', error);
      return { success: false, error };
    }
  }
};