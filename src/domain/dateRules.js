export const isUsableDateValue = (value) => {
  if (value === null || value === undefined || value === '') return false;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime());
};

export const formatNullableDate = (
  value,
  {
    locale = 'es-VE',
    options = { day: '2-digit', month: 'long', year: 'numeric' },
    fallback = 'Sin fecha registrada',
  } = {},
) => {
  if (!isUsableDateValue(value)) return fallback;
  return new Date(value).toLocaleDateString(locale, options);
};
