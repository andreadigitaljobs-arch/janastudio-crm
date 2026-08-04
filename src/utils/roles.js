export const getRoleName = (role = '') => String(role).split('|')[0].trim();

export const getRoleKind = (role = '') => {
  const name = getRoleName(role).toLowerCase();
  if (name === 'admin') return 'admin';
  if (name.includes('recep')) return 'reception';
  if (name.includes('caja')) return 'cashier';
  if (
    name.includes('manicurista') ||
    name.includes('lashista') ||
    name.includes('pestañ') ||
    name.includes('pestan') ||
    name.includes('cejas') ||
    name.includes('láser') ||
    name.includes('laser') ||
    name.includes('uñas') ||
    name.includes('unas') ||
    name.includes('estilista') ||
    name.includes('trabajador') ||
    name.includes('especialista')
  ) return 'worker';
  return 'other';
};

const MODULE_ROLES = {
  dashboard: ['admin', 'reception', 'cashier'],
  'my-profile': ['worker'],
  'stylist-panel': ['worker'],
  history: ['worker'],
  scheduling: ['admin', 'reception', 'worker'],
  reception: ['admin', 'reception'],
  checkout: ['admin', 'reception', 'cashier'],
  clients: ['admin', 'reception', 'cashier'],
  diagnosis: ['admin', 'reception'],
  personnel: ['admin'],
  services: ['admin'],
  costing: ['admin'],
  inventory: ['admin', 'cashier'],
  finance: ['admin', 'cashier'],
  accounting: ['admin'],
  laser: ['admin', 'reception'],
  reports: ['admin'],
  promotions: ['admin'],
  settings: ['admin'],
  notifications: ['admin', 'reception', 'cashier', 'worker'],
};

export const canAccessModule = (role, moduleId, customModules = null) => {
  const kind = getRoleKind(role);
  if ((MODULE_ROLES[moduleId] || []).includes(kind)) return true;
  if (customModules?.modules?.includes(moduleId)) return true;
  return false;
};
