const STORAGE_KEY = 'astro_default_bday_message';

export const DEFAULT_BIRTHDAY_MESSAGE = [
  `¡Hola {name}!`,
  String.fromCodePoint(0x1F389),
  'Te deseamos un muy feliz cumpleaños de parte de todo el equipo de Astro Barbershop.',
  String.fromCodePoint(0x1F488),
  '¡Que tengas un día excelente!'
].join(' ');

const hasBrokenSurrogatePair = (value) => (
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|([^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/.test(value)
);

export const isCorruptedBirthdayMessage = (value) => {
  if (!value || typeof value !== 'string') return true;
  return (
    value.includes('\uFFFD') ||
    value.includes('�') ||
    value.includes('Ã') ||
    value.includes('Â') ||
    value.includes('ðŸ') ||
    hasBrokenSurrogatePair(value)
  );
};

export const getBirthdayMessageTemplate = () => {
  let template = localStorage.getItem(STORAGE_KEY);

  if (isCorruptedBirthdayMessage(template)) {
    template = DEFAULT_BIRTHDAY_MESSAGE;
    localStorage.setItem(STORAGE_KEY, template);
  }

  return template;
};

export const setBirthdayMessageTemplate = (template) => {
  const cleanTemplate = isCorruptedBirthdayMessage(template)
    ? DEFAULT_BIRTHDAY_MESSAGE
    : template;

  localStorage.setItem(STORAGE_KEY, cleanTemplate);
  return cleanTemplate;
};

export const buildBirthdayMessage = (name, template = getBirthdayMessageTemplate()) => (
  String(template || '').replace(/{{?\s*(?:name|nombre)\s*}}?/gi, name || '')
);
