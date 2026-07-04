export const buildWhatsAppUrl = ({ phone = '', message = '' }) => {
  const cleanedPhone = phone.replace(/[^0-9]/g, '');
  const params = new URLSearchParams();

  if (cleanedPhone) {
    params.set('phone', cleanedPhone);
  }

  params.set('text', message);
  params.set('type', 'phone_number');
  params.set('app_absent', '0');

  return `https://api.whatsapp.com/send?${params.toString()}`;
};
