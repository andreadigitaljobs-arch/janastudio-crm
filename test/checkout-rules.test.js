import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isCheckoutUuid,
  normalizeCheckoutPayment,
  prepareQueuedCheckout,
} from '../src/domain/checkoutRules.js';

const KEY = '018f8d7e-6c43-7c1a-8f44-5e67f3196210';
const APP = '128f8d7e-6c43-7c1a-8f44-5e67f3196210';
const PRODUCT = '228f8d7e-6c43-7c1a-8f44-5e67f3196210';

test('normaliza un cobro y elimina citas repetidas', () => {
  const result = normalizeCheckoutPayment({
    appointmentId: APP,
    appointmentIds: [APP, APP],
    totalUsd: '25',
    fixedRate: '180',
    cashUsd: 5,
    transferBs: 3600,
    totalTips: 0,
  }, KEY);

  assert.equal(result.idempotencyKey, KEY);
  assert.deepEqual(result.appointmentIds, [APP]);
  assert.equal(result.totalUsd, 25);
  assert.equal(result.fixedRate, 180);
});

test('agrupa productos repetidos y excluye extras del inventario', () => {
  const result = normalizeCheckoutPayment({
    totalUsd: 12,
    fixedRate: 180,
    cashUsd: 12,
    products: [
      { id: PRODUCT, name: 'Serum', quantity: 1, price: 4 },
      { id: PRODUCT, name: 'Serum', quantity: 2, price: 4 },
      { id: `extra_${PRODUCT}`, type: 'extra', quantity: 1, price: 2 },
    ],
  }, KEY);

  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].quantity, 3);
});

test('rechaza cobros que no pueden reconciliarse de forma segura', () => {
  assert.throws(() => normalizeCheckoutPayment({ totalUsd: -1 }, KEY), /total del cobro/);
  assert.throws(() => normalizeCheckoutPayment({ totalUsd: 10, transferBs: 100, fixedRate: 0 }, KEY), /tasa de cambio/);
  assert.throws(() => normalizeCheckoutPayment({ totalUsd: 10, cashUsd: 11 }, KEY), /distribución del pago/);
  assert.throws(() => normalizeCheckoutPayment({ totalUsd: 10, isFinanced: true, initialPaymentAmount: 11, remainingBalance: 0 }, KEY), /cuota inicial/);
  assert.throws(() => normalizeCheckoutPayment({ totalUsd: 10, cashUsd: 10 }, 'no-es-uuid'), /idempotencia/);
});

test('reconoce UUID válidos para entidades del checkout', () => {
  assert.equal(isCheckoutUuid(APP), true);
  assert.equal(isCheckoutUuid('extra_123'), false);
});

test('migra un cobro de la cola antigua y conserva la clave en reintentos', () => {
  const legacyPayment = { totalUsd: 10, cashUsd: 10 };
  const firstAttempt = prepareQueuedCheckout(legacyPayment, () => KEY);
  const retry = prepareQueuedCheckout(firstAttempt.paymentData, () => {
    throw new Error('no debe generar otra clave');
  });

  assert.equal(firstAttempt.migrated, true);
  assert.equal(firstAttempt.paymentData.idempotencyKey, KEY);
  assert.equal(retry.migrated, false);
  assert.equal(retry.paymentData.idempotencyKey, KEY);
});
