import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthlyClientRanking,
  buildMonthlyStaffRanking
} from '../src/domain/dashboardRankings.js';

const july = new Date('2026-07-20T12:00:00-04:00');

test('ordena estilistas por ingresos generados durante el mes', () => {
  const ranking = buildMonthlyStaffRanking([
    {
      scheduled_at: '2026-07-05T10:00:00-04:00',
      appointment_services: [
        { staff_id: 'staff-1', staff: { id: 'staff-1', name: 'Carla' }, price_paid: 18 },
        { staff_id: 'staff-2', staff: { id: 'staff-2', name: 'Daniela' }, price_paid: 35 }
      ]
    },
    {
      scheduled_at: '2026-06-30T10:00:00-04:00',
      staff_id: 'staff-1',
      staff: { id: 'staff-1', name: 'Carla' },
      total_price: 100
    }
  ], july);

  assert.equal(ranking.length, 2);
  assert.equal(ranking[0].staff.name, 'Daniela');
  assert.equal(ranking[0].earnings, 35);
  assert.equal(ranking[1].earnings, 18);
});

test('ordena clientas por dinero pagado durante el mes', () => {
  const ranking = buildMonthlyClientRanking([
    { type: 'income', client_id: 'client-1', amount: 20, created_at: '2026-07-02T10:00:00-04:00' },
    { type: 'income', client_id: 'client-1', amount: 30, created_at: '2026-07-12T10:00:00-04:00' },
    { type: 'income', client_id: 'client-2', amount: 80, created_at: '2026-07-15T10:00:00-04:00' },
    { type: 'expense', client_id: 'client-2', amount: 500, created_at: '2026-07-16T10:00:00-04:00' },
    { type: 'income', client_id: 'client-1', amount: 200, created_at: '2026-06-20T10:00:00-04:00' }
  ], [
    { id: 'client-1', name: 'Ana' },
    { id: 'client-2', name: 'María' }
  ], july);

  assert.equal(ranking[0].client.name, 'María');
  assert.equal(ranking[0].spent, 80);
  assert.equal(ranking[1].spent, 50);
  assert.equal(ranking[1].purchases, 2);
});
