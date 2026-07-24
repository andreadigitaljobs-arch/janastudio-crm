import test from 'node:test';
import assert from 'node:assert/strict';

import {
  allocateLaserPayment,
  buildLaserInstallmentPlan,
  buildLaserTenderBreakdown,
  getLaserCatalogPrice,
  getLaserExpirationState,
  getMinimumLaserSessionDate,
  isLaserService,
} from '../src/domain/laserRules.js';

test('reconoce el catálogo láser y sus precios de 1, 4 y 8 sesiones', () => {
  const service = { name: 'Axilas', category: 'Depilación Láser', price: 15, laser_price_single: 15, laser_price_4: 52, laser_price_8: 96 };
  assert.equal(isLaserService(service), true);
  assert.equal(getLaserCatalogPrice(service, 1), 15);
  assert.equal(getLaserCatalogPrice(service, 4), 52);
  assert.equal(getLaserCatalogPrice(service, 8), 96);
});

test('genera las cuotas 30/40/30 en los días 0, 21 y 42', () => {
  const plan = buildLaserInstallmentPlan({ total: 100, sessions: 8, financed: true, purchasedAt: '2026-07-22T12:00:00Z' });
  assert.deepEqual(plan.map(item => item.amount), [30, 40, 30]);
  assert.deepEqual(plan.map(item => item.allocation), ['worker', 'partner', 'studio']);
  assert.deepEqual(plan.map(item => item.dueAt.toISOString().slice(0, 10)), ['2026-07-22', '2026-08-12', '2026-09-02']);
});

test('separa el plan fraccionado de la moneda usada para pagar la cuota', () => {
  const plan = buildLaserInstallmentPlan({ total: 96, sessions: 8, financed: true, purchasedAt: '2026-07-23T12:00:00Z' });
  assert.equal(plan[0].amount, 28.8);
  assert.deepEqual(
    buildLaserTenderBreakdown({ amountUsd: plan[0].amount, exchangeRate: 737.8816, tenderMode: 'full_bs' }),
    { usdAmount: 0, bsAmount: 21250.99 },
  );
  assert.deepEqual(
    buildLaserTenderBreakdown({ amountUsd: plan[0].amount, exchangeRate: 737.8816, tenderMode: 'mixed', usdPortion: 10 }),
    { usdAmount: 10, bsAmount: 13872.17 },
  );
});

test('asigna cada cuota completa a su beneficiario y divide pagos completos', () => {
  assert.deepEqual(allocateLaserPayment({ amount: 30, allocation: 'worker' }), { worker: 30, partner: 0, studio: 0 });
  assert.deepEqual(allocateLaserPayment({ amount: 40, allocation: 'partner' }), { worker: 0, partner: 40, studio: 0 });
  assert.deepEqual(allocateLaserPayment({ amount: 30, allocation: 'studio' }), { worker: 0, partner: 0, studio: 30 });
  assert.deepEqual(allocateLaserPayment({ amount: 100, allocation: 'full' }), { worker: 30, partner: 40, studio: 30 });
});

test('calcula aviso, vencimiento y sesiones perdidas sin fijar ocho sesiones', () => {
  assert.deepEqual(
    getLaserExpirationState({ expiresAt: '2026-08-10T00:00:00Z', now: '2026-07-22T00:00:00Z', usedSessions: 1, totalSessions: 4, warningDays: 30 }),
    { expired: false, warning: true, daysRemaining: 19, lostSessions: 0 },
  );
  assert.deepEqual(
    getLaserExpirationState({ expiresAt: '2026-07-20T00:00:00Z', now: '2026-07-22T00:00:00Z', usedSessions: 2, totalSessions: 8 }),
    { expired: true, warning: false, daysRemaining: 0, lostSessions: 6 },
  );
});

test('respeta el intervalo de 21 días entre sesiones', () => {
  assert.equal(getMinimumLaserSessionDate('2026-07-22T12:00:00Z').toISOString().slice(0, 10), '2026-08-12');
});
