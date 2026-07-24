import test from 'node:test';
import assert from 'node:assert/strict';

import { formatNullableDate, isUsableDateValue } from '../src/domain/dateRules.js';

test('no convierte fechas nulas en diciembre de 1969', () => {
  assert.equal(isUsableDateValue(null), false);
  assert.equal(formatNullableDate(null), 'Sin fecha registrada');
  assert.equal(formatNullableDate(''), 'Sin fecha registrada');
});

test('formatea una fecha real del historial', () => {
  assert.equal(isUsableDateValue('2026-07-23T14:37:00Z'), true);
  assert.match(formatNullableDate('2026-07-23T14:37:00Z'), /2026/);
});
