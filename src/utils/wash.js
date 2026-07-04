const TRUE_WASH_VALUES = new Set(['1', 'si', 'sí', 'yes', 'true']);

export function isWash(value) {
  if (value === true || value === 1) return true;
  if (typeof value !== 'string') return false;
  return TRUE_WASH_VALUES.has(value.trim().toLowerCase());
}
