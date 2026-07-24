import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDaysUntilEstimatedVisit,
  getEstimatedVisitDate,
} from '../src/domain/recurrenceRules.js';

test('convierte los días personalizados en una fecha estimada', () => {
  const baseDate = new Date(2026, 6, 24, 12);

  assert.equal(getEstimatedVisitDate(10, baseDate), '2026-08-03');
  assert.equal(getEstimatedVisitDate(14, baseDate), '2026-08-07');
});

test('calcula la cantidad de días a partir de la fecha elegida', () => {
  const baseDate = new Date(2026, 6, 24, 12);

  assert.equal(getDaysUntilEstimatedVisit('2026-08-15', baseDate), 22);
  assert.equal(getDaysUntilEstimatedVisit('2026-07-24', baseDate), 0);
});
