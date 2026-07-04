export const BUSINESS_TIME_ZONE = 'America/Caracas';
export const BUSINESS_UTC_OFFSET = '-04:00';

export const getBusinessDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const businessDateStart = dateKey => new Date(`${dateKey}T00:00:00${BUSINESS_UTC_OFFSET}`);
export const businessDateEnd = dateKey => new Date(`${dateKey}T23:59:59.999${BUSINESS_UTC_OFFSET}`);

export const getBusinessDayRange = (date = new Date()) => {
  const dateKey = getBusinessDateKey(date);
  const start = businessDateStart(dateKey);
  const endExclusive = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { dateKey, start, endExclusive };
};

export const getBusinessMonthStart = (date = new Date()) => {
  const dateKey = getBusinessDateKey(date);
  return businessDateStart(`${dateKey.slice(0, 7)}-01`);
};

export const getBusinessWeekStart = (date = new Date()) => {
  const dayStart = businessDateStart(getBusinessDateKey(date));
  const dayOfWeek = dayStart.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return new Date(dayStart.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
};

export const getOperationalDate = appointment => {
  const value = appointment?.accounting_at || appointment?.completed_at || appointment?.scheduled_at || appointment?.created_at;
  return value ? new Date(value) : null;
};
