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

// Initialisation
emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);

export const emailJSService = {
  // Email à l'admin pour nouvelle réservation
  async sendNewReservationAdminEmail(reservationData: any) {
    try {
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
          admin_url: `${window.location.origin}/admin/reservations`
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
      
      const templateParams = {
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
        // Variables pour le template conditionnel
        reservation_status: 'accepted',
        is_accepted: true,
        is_rejected: false
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
      
      const templateParams = {
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
        // Variables pour le template conditionnel
        reservation_status: 'rejected',
        is_accepted: false,
        is_rejected: true,
        rejection_reason: reservationData.rejectionReason || "Non spécifiée. Veuillez nous contacter pour plus d'informations.",
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
      emailjs.init(EMAILJS_CONFIG_CANCEL.PUBLIC_KEY);

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