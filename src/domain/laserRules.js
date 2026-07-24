export const LASER_SESSION_OPTIONS = Object.freeze([1, 4, 8]);
export const LASER_INSTALLMENT_PERCENTAGES = Object.freeze([30, 40, 30]);

const asDate = value => {
  const date = value instanceof Date ? new Date(value) : new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) throw new Error('La fecha indicada no es válida.');
  return date;
};

const asMoney = value => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('El monto debe ser mayor o igual a cero.');
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

const addDays = (value, days) => {
  const result = asDate(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

export const isLaserService = service => {
  const value = `${service?.name || ''} ${service?.category || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return value.includes('laser') || value.includes('depilacion');
};

export const getLaserCatalogPrice = (service, sessions) => {
  const count = Number(sessions);
  if (!LASER_SESSION_OPTIONS.includes(count)) throw new Error('Las sesiones deben ser 1, 4 u 8.');
  const selected = count === 8
    ? service?.laser_price_8
    : count === 4
      ? service?.laser_price_4
      : service?.laser_price_single ?? service?.price;
  return asMoney(selected ?? service?.price ?? 0);
};

export const buildLaserInstallmentPlan = ({ total, sessions, financed, purchasedAt = new Date() }) => {
  const amount = asMoney(total);
  const count = Number(sessions);
  if (!LASER_SESSION_OPTIONS.includes(count)) throw new Error('Las sesiones deben ser 1, 4 u 8.');
  if (!financed || count !== 8) {
    return [{ installmentNumber: 1, percentage: 100, amount, dueAt: asDate(purchasedAt) }];
  }

  const first = asMoney(amount * 0.30);
  const second = asMoney(amount * 0.40);
  const third = asMoney(amount - first - second);
  return [
    { installmentNumber: 1, percentage: 30, allocation: 'worker', amount: first, dueAt: addDays(purchasedAt, 0) },
    { installmentNumber: 2, percentage: 40, allocation: 'partner', amount: second, dueAt: addDays(purchasedAt, 21) },
    { installmentNumber: 3, percentage: 30, allocation: 'studio', amount: third, dueAt: addDays(purchasedAt, 42) },
  ];
};

export const buildLaserTenderBreakdown = ({ amountUsd, exchangeRate, tenderMode, usdPortion = 0 }) => {
  const amount = asMoney(amountUsd);
  const rate = Number(exchangeRate);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('La tasa de cambio debe ser mayor a cero.');

  if (tenderMode === 'full_usd') {
    return { usdAmount: amount, bsAmount: 0 };
  }

  if (tenderMode === 'full_bs') {
    return { usdAmount: 0, bsAmount: asMoney(amount * rate) };
  }

  if (tenderMode !== 'mixed') throw new Error('La forma de pago no es válida.');
  const usdAmount = asMoney(usdPortion);
  if (usdAmount > amount) throw new Error('La parte en dólares no puede superar el monto a pagar.');
  return {
    usdAmount,
    bsAmount: asMoney((amount - usdAmount) * rate),
  };
};

export const allocateLaserPayment = ({ amount, allocation = 'full', workerPct = 30, partnerPct = 40, studioPct = 30 }) => {
  const paid = asMoney(amount);
  if (allocation === 'worker') return { worker: paid, partner: 0, studio: 0 };
  if (allocation === 'partner') return { worker: 0, partner: paid, studio: 0 };
  if (allocation === 'studio') return { worker: 0, partner: 0, studio: paid };
  const totalPct = Number(workerPct) + Number(partnerPct) + Number(studioPct);
  if (Math.abs(totalPct - 100) > 0.001) throw new Error('La distribución láser debe sumar 100%.');
  const worker = asMoney(paid * Number(workerPct) / 100);
  const partner = asMoney(paid * Number(partnerPct) / 100);
  return { worker, partner, studio: asMoney(paid - worker - partner) };
};

export const getLaserExpirationState = ({ expiresAt, usedSessions = 0, totalSessions = 0, now = new Date(), warningDays = 30 }) => {
  const expiry = asDate(expiresAt);
  const current = asDate(now);
  const milliseconds = expiry.getTime() - current.getTime();
  const daysRemaining = Math.ceil(milliseconds / 86_400_000);
  const expired = daysRemaining <= 0;
  return {
    expired,
    warning: !expired && daysRemaining <= Number(warningDays),
    daysRemaining: Math.max(0, daysRemaining),
    lostSessions: expired ? Math.max(0, Number(totalSessions) - Number(usedSessions)) : 0,
  };
};

export const getMinimumLaserSessionDate = (lastSessionAt, intervalDays = 21, fallback = new Date()) => (
  lastSessionAt ? addDays(lastSessionAt, Number(intervalDays) || 21) : asDate(fallback)
);
