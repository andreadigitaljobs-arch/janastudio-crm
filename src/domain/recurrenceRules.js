const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toCalendarParts = (value) => {
  if (value instanceof Date) {
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
};

export const formatLocalDateISO = (value = new Date()) => {
  const parts = toCalendarParts(value);
  if (!parts) return '';

  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');
};

export const getEstimatedVisitDate = (days, baseDate = new Date()) => {
  const normalizedDays = Number(days);
  if (!Number.isInteger(normalizedDays) || normalizedDays < 1) return '';

  const date = new Date(baseDate);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + normalizedDays);
  return formatLocalDateISO(date);
};

export const getDaysUntilEstimatedVisit = (visitDate, baseDate = new Date()) => {
  const visit = toCalendarParts(visitDate);
  const base = toCalendarParts(baseDate);
  if (!visit || !base) return 0;

  const visitUtc = Date.UTC(visit.year, visit.month - 1, visit.day);
  const baseUtc = Date.UTC(base.year, base.month - 1, base.day);
  return Math.round((visitUtc - baseUtc) / DAY_IN_MS);
};
