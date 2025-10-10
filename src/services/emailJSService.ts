import emailjs from '@emailjs/browser';

// Configuration Premier compte (réservations)
const EMAILJS_CONFIG = {
    PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
    SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID,
    TEMPLATES: {
      NEW_RESERVATION_ADMIN: import.meta.env.VITE_EMAILJS_TEMPLATE_ADMIN,
      CONFIRMATION_CLIENT: import.meta.env.VITE_EMAILJS_TEMPLATE_CLIENT,
    }
  };
  
  // Configuration Deuxième compte (annulations)
  const EMAILJS_CONFIG_CANCEL = {
    PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY_CANCEL,
    SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID_CANCEL,
    TEMPLATES: {
      CANCELLATION_ADMIN: import.meta.env.VITE_EMAILJS_TEMPLATE_CANCEL_ADMIN,
      CANCELLATION_CLIENT: import.meta.env.VITE_EMAILJS_TEMPLATE_CANCEL_CLIENT,
    }
  };

// Initialisation des deux comptes
emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
// Le deuxième compte sera initialisé dans les fonctions d'annulation

export const emailJSService = {
  async sendNewReservationEmails(reservationData: any) {
    // Utilise le PREMIER compte (réservations)
    try {
      // Email admin
      const adminResult = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATES.NEW_RESERVATION_ADMIN,
        {
          to_email: 'lamsouber.houssam@gmail.com',
          client_name: reservationData.clientName,
          client_email: reservationData.clientEmail,
          client_phone: reservationData.clientPhone || 'Non spécifié',
          car_name: reservationData.carName,
          car_category: reservationData.carCategory,
          pickup_date: reservationData.pickupDate,
          pickup_time: reservationData.pickupTime,
          return_date: reservationData.returnDate,
          return_time: reservationData.returnTime,
          pickup_location: reservationData.pickupLocation,
          return_location: reservationData.returnLocation,
          total_price: `${reservationData.totalPrice} Dhs`,
          reservation_id: reservationData.reservationId,
        }
      );

      // Email client
      const clientResult = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATES.CONFIRMATION_CLIENT,
        {
          to_email: reservationData.clientEmail,
          to_name: reservationData.clientName,
          client_name: reservationData.clientName,
          client_email: reservationData.clientEmail,
          client_phone: reservationData.clientPhone || 'Non spécifié',
          car_name: reservationData.carName,
          car_category: reservationData.carCategory,
          pickup_date: reservationData.pickupDate,
          pickup_time: reservationData.pickupTime,
          return_date: reservationData.returnDate,
          return_time: reservationData.returnTime,
          pickup_location: reservationData.pickupLocation,
          return_location: reservationData.returnLocation,
          total_price: `${reservationData.totalPrice} Dhs`,
          reservation_id: reservationData.reservationId,
        }
      );

      return { success: true, adminResult, clientResult };
    } catch (error) {
      console.error('❌ Erreur emails réservation:', error);
      return { success: false, error };
    }
  },

  async sendCancellationEmails(reservationData: any) {
    // Utilise le DEUXIÈME compte (annulations)
    try {
      // Initialisation du deuxième compte
      emailjs.init(EMAILJS_CONFIG_CANCEL.PUBLIC_KEY);

      // Email annulation admin
      const adminResult = await emailjs.send(
        EMAILJS_CONFIG_CANCEL.SERVICE_ID,
        EMAILJS_CONFIG_CANCEL.TEMPLATES.CANCELLATION_ADMIN,
        {
          to_email: 'lamsouber.houssam@gmail.com',
          client_name: reservationData.clientName,
          client_email: reservationData.clientEmail,
          client_phone: reservationData.clientPhone || 'Non renseigné',
          car_name: reservationData.carName,
          car_category: reservationData.carCategory,
          pickup_date: reservationData.pickupDate,
          return_date: reservationData.returnDate,
          total_price: `${reservationData.totalPrice} Dhs`,
          reservation_id: reservationData.reservationId,
          cancellation_date: new Date().toLocaleDateString('fr-FR')
        }
      );

      // Email annulation client
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
          pickup_date: reservationData.pickupDate,
          return_date: reservationData.returnDate,
          total_price: `${reservationData.totalPrice} Dhs`,
          reservation_id: reservationData.reservationId,
          cancellation_date: new Date().toLocaleDateString('fr-FR')
        }
      );

      return { success: true, adminResult, clientResult };
    } catch (error) {
      console.error('❌ Erreur emails annulation:', error);
      return { success: false, error };
    }
  }
};