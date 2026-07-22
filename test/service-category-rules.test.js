import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getServiceCategoryIcon,
  inferServiceCategories,
  normalizeServiceCategories,
} from '../src/domain/serviceCategoryRules.js';

test('infiere las categorías usadas por los servicios sin duplicarlas', () => {
  const categories = inferServiceCategories([
    { category: 'Cejas' },
    { category: 'Uñas' },
    { category: 'Cejas' },
    { category: 'Pestañas' },
    { category: '  ' },
  ]);

  assert.deepEqual(categories.map(category => category.name), ['Cejas', 'Uñas', 'Pestañas']);
});

test('normaliza configuraciones antiguas y asigna iconos conocidos', () => {
  const categories = normalizeServiceCategories(['Cejas', { name: 'Uñas' }, { name: 'cejas' }]);

  assert.equal(categories.length, 2);
  assert.equal(categories[0].icon, 'Brush');
  assert.equal(categories[1].icon, 'NailPolish');
  assert.equal(getServiceCategoryIcon('Pestañas'), 'Sparkles');
});
