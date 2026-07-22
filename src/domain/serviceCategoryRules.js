const DEFAULT_ICON_BY_CATEGORY = new Map([
  ['cejas', 'Brush'],
  ['pestañas', 'Sparkles'],
  ['uñas', 'NailPolish'],
  ['facial', 'Smile'],
  ['estilismo', 'Scissors'],
  ['cabello', 'Scissors'],
  ['combos', 'Crown'],
]);

const categoryKey = value => String(value || '').trim().toLocaleLowerCase('es');

export const getServiceCategoryIcon = name => (
  DEFAULT_ICON_BY_CATEGORY.get(categoryKey(name)) || 'Wind'
);

export const normalizeServiceCategories = value => {
  const categories = [];
  const seen = new Set();

  for (const item of Array.isArray(value) ? value : []) {
    const name = String(typeof item === 'string' ? item : item?.name || '').trim();
    const key = categoryKey(name);
    if (!name || seen.has(key)) continue;

    seen.add(key);
    categories.push({
      name,
      icon: String(item?.icon || getServiceCategoryIcon(name)),
    });
  }

  return categories;
};

export const inferServiceCategories = services => normalizeServiceCategories(
  (Array.isArray(services) ? services : []).map(service => ({ name: service?.category }))
);
