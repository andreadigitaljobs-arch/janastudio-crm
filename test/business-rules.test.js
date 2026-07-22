import test from 'node:test';
import assert from 'node:assert/strict';

import { isWash } from '../src/utils/wash.js';
import {
  DEFAULT_WORKING_WINDOW,
  getStaffFreeIntervals,
  getStaffWorkingWindow,
  isStaffFreeAt,
} from '../src/utils/availability.js';
import { canAccessModule, getRoleKind } from '../src/utils/roles.js';

test('normaliza los valores históricos de lavado', () => {
  for (const value of [true, 1, '1', 'si', 'sí', 'YES', ' true ']) assert.equal(isWash(value), true);
  for (const value of [false, 0, null, '', 'no']) assert.equal(isWash(value), false);
});

test('mantiene disponible el horario por defecto si aún no fue configurado', () => {
  assert.deepEqual(getStaffWorkingWindow('staff-1', '2026-07-22'), {
    isWorking: true,
    reason: 'unscheduled',
    ...DEFAULT_WORKING_WINDOW,
  });
});

test('respeta días libres y evita solapamientos de agenda', () => {
  const dateKey = '2026-07-22';
  const schedules = [{ staff_id: 'staff-1', day_of_week: 3, is_working: true, start_time: '08:00', end_time: '18:00' }];
  const appointmentsForDay = [{
    id: 'appointment-1',
    staff_id: 'staff-1',
    scheduled_at: '2026-07-22T10:00:00-04:00',
    duration_minutes: 90,
  }];

  assert.deepEqual(
    isStaffFreeAt('staff-1', dateKey, 630, 30, { schedules, timeOff: [], appointmentsForDay }),
    { free: false, reason: 'conflict', appointmentId: 'appointment-1' },
  );
  assert.deepEqual(
    isStaffFreeAt('staff-1', dateKey, 690, 60, { schedules, timeOff: [], appointmentsForDay }),
    { free: true },
  );
  assert.deepEqual(
    getStaffFreeIntervals('staff-1', dateKey, { schedules, timeOff: [], appointmentsForDay }),
    [{ startMinutes: 480, endMinutes: 600 }, { startMinutes: 690, endMinutes: 1080 }],
  );
  assert.equal(getStaffWorkingWindow('staff-1', dateKey, schedules, [{ staff_id: 'staff-1', date: dateKey }]).isWorking, false);
});

test('los permisos distinguen recepción, caja y trabajadoras', () => {
  assert.equal(getRoleKind('Recepcionista|turno-mañana'), 'reception');
  assert.equal(canAccessModule('Recepcionista', 'scheduling'), true);
  assert.equal(canAccessModule('Caja', 'finance'), true);
  assert.equal(canAccessModule('Manicurista', 'finance'), false);
  assert.equal(canAccessModule('Admin', 'accounting'), true);
});
