import { Resend } from 'resend';

export const testEmail = async () => {
  const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'CBV Rental <onboarding@resend.dev>',
      to: 'votre-email@test.com',
      subject: 'Test Resend',
      html: '<p>Ceci est un test</p>',
    });

    if (error) {
      console.error('Erreur Resend:', error);
      return { success: false, error };
    }

    console.log('Email envoyé:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Erreur:', err);
    return { success: false, error: err };
  }
};