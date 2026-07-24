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

export const getAverageIntervalDays = (values) => {
  const dates = values
    .filter(isUsableDateValue)
    .map((value) => new Date(value))
    .sort((a, b) => a - b);
  if (dates.length < 2) return null;
  const intervals = dates.slice(1).map((date, index) => (
    Math.max(0, Math.round((date.getTime() - dates[index].getTime()) / 86_400_000))
  ));
  return Math.round(intervals.reduce((sum, days) => sum + days, 0) / intervals.length);
};
