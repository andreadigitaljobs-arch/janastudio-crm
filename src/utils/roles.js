export const getRoleName = (role = '') => String(role).split('|')[0].trim();

export const getRoleKind = (role = '') => {
  const name = getRoleName(role).toLowerCase();
  if (name === 'admin') return 'admin';
  if (name.includes('recep')) return 'reception';
  if (name.includes('caja')) return 'cashier';
  if (name.includes('manicurista') || name.includes('lashista') || name.includes('estilista') || name.includes('trabajador')) return 'worker';
  return 'other';
};

const MODULE_ROLES = {
  dashboard: ['admin', 'reception', 'cashier', 'worker'],
  'my-profile': ['admin', 'reception', 'cashier', 'worker'],
  scheduling: ['admin', 'reception', 'worker'],
  reception: ['admin', 'reception'],
  checkout: ['admin', 'reception', 'cashier'],
  clients: ['admin', 'reception', 'cashier', 'worker'],
  personnel: ['admin'],
  services: ['admin'],
  costing: ['admin'],
  inventory: ['admin', 'cashier'],
  finance: ['admin', 'cashier'],
  reports: ['admin'],
};

export const canAccessModule = (role, moduleId) => {
  const kind = getRoleKind(role);
  return (MODULE_ROLES[moduleId] || []).includes(kind);
};
