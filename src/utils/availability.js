import { businessDateStart } from './dateTime.js';

export const DEFAULT_WORKING_WINDOW = { startMinutes: 8 * 60, endMinutes: 18 * 60 };

// 0=domingo..6=sábado, igual que Date.getDay(), calculado en la zona horaria del negocio
// (no uses `new Date(dateKey).getDay()` directo: ese parseo es UTC y puede desfasar el día).
export const getDayOfWeek = (dateKey) => businessDateStart(dateKey).getUTCDay();

const timeToMinutes = (time) => {
  if (!time) return null;
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * ¿Trabaja tal trabajadora tal día, y en qué franja horaria?
 * Si no hay horario configurado para ese día (tabla aún no existe / fila no creada),
 * se asume disponible todo el día (mismo comportamiento de hoy) — nunca "no disponible" por falta de dato.
 * Soporta time_off con rango horario parcial (start_time/end_time) o día completo (null).
 */
export const getStaffWorkingWindow = (staffId, dateKey, schedules = [], timeOff = []) => {
  const dayTimeOffs = timeOff.filter(t => t.staff_id === staffId && t.date === dateKey);

  const dayOfWeek = getDayOfWeek(dateKey);
  const row = schedules.find(s => s.staff_id === staffId && s.day_of_week === dayOfWeek);

  let workStart, workEnd;
  let reason = 'scheduled';
  if (row && row.is_working) {
    workStart = timeToMinutes(row.start_time) ?? DEFAULT_WORKING_WINDOW.startMinutes;
    workEnd = timeToMinutes(row.end_time) ?? DEFAULT_WORKING_WINDOW.endMinutes;
  } else if (!row) {
    workStart = DEFAULT_WORKING_WINDOW.startMinutes;
    workEnd = DEFAULT_WORKING_WINDOW.endMinutes;
    reason = 'unscheduled';
  } else {
    return { isWorking: false, reason: 'day_off', startMinutes: null, endMinutes: null };
  }

  const fullDayOff = dayTimeOffs.find(t => t.start_time == null && t.end_time == null);
  if (fullDayOff) {
    return { isWorking: false, reason: 'time_off', startMinutes: null, endMinutes: null };
  }

  if (dayTimeOffs.length === 0) {
    return { isWorking: true, reason, startMinutes: workStart, endMinutes: workEnd };
  }

  const partialOffs = dayTimeOffs
    .filter(t => t.start_time != null && t.end_time != null)
    .map(t => ({ start: timeToMinutes(t.start_time), end: timeToMinutes(t.end_time) }))
    .sort((a, b) => a.start - b.start);

  return {
    isWorking: true,
    reason,
    startMinutes: workStart,
    endMinutes: workEnd,
    partialTimeOffs: partialOffs
  };
};

/** Duración real de una cita en minutos, con fallback de 60 (igual que el resto de la app). */
export const getAppointmentDuration = (appointment) =>
  Number(appointment?.services?.duration_minutes ?? appointment?.duration_minutes) || 60;

/** Intervalos ocupados (en minutos desde medianoche) de una trabajadora ese día. */
export const getStaffBusyIntervals = (staffId, appointmentsForDay = []) =>
  appointmentsForDay
    .filter(a => a.staff_id === staffId)
    .map(a => {
      const start = new Date(a.scheduled_at || a.created_at);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      return { startMinutes, endMinutes: startMinutes + getAppointmentDuration(a), appointmentId: a.id };
    });

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

/**
 * ¿Está libre tal trabajadora a partir de `candidateStartMinutes` por `durationMinutes`?
 * Toma en cuenta horario de trabajo real, solapamiento real con otras citas, y bloqueos parciales (time_off con horas).
 */
export const isStaffFreeAt = (staffId, dateKey, candidateStartMinutes, durationMinutes, { schedules = [], timeOff = [], appointmentsForDay = [] }) => {
  const window = getStaffWorkingWindow(staffId, dateKey, schedules, timeOff);
  if (!window.isWorking) {
    return { free: false, reason: window.reason };
  }

  const candidateEnd = candidateStartMinutes + durationMinutes;
  if (candidateStartMinutes < window.startMinutes || candidateEnd > window.endMinutes) {
    return { free: false, reason: 'outside_hours' };
  }

  if (window.partialTimeOffs && window.partialTimeOffs.length > 0) {
    for (const off of window.partialTimeOffs) {
      if (candidateStartMinutes < off.end && off.start < candidateEnd) {
        return { free: false, reason: 'time_off' };
      }
    }
  }

  const busy = getStaffBusyIntervals(staffId, appointmentsForDay);
  const conflict = busy.find(b => overlaps(candidateStartMinutes, candidateEnd, b.startMinutes, b.endMinutes));
  if (conflict) {
    return { free: false, reason: 'conflict', appointmentId: conflict.appointmentId };
  }

  return { free: true };
};

/** Huecos libres del día dentro del horario de trabajo, para pintar la columna de la agenda. */
export const getStaffFreeIntervals = (staffId, dateKey, { schedules = [], timeOff = [], appointmentsForDay = [] }) => {
  const window = getStaffWorkingWindow(staffId, dateKey, schedules, timeOff);
  if (!window.isWorking) return [];

  const busy = getStaffBusyIntervals(staffId, appointmentsForDay)
    .filter(b => b.endMinutes > window.startMinutes && b.startMinutes < window.endMinutes)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  if (window.partialTimeOffs && window.partialTimeOffs.length > 0) {
    const offIntervals = window.partialTimeOffs
      .filter(off => off.end > window.startMinutes && off.start < window.endMinutes)
      .map(off => ({
        startMinutes: Math.max(off.start, window.startMinutes),
        endMinutes: Math.min(off.end, window.endMinutes),
        appointmentId: 'time_off_partial'
      }));
    busy.push(...offIntervals);
    busy.sort((a, b) => a.startMinutes - b.startMinutes);
  }

  const free = [];
  let cursor = window.startMinutes;
  for (const b of busy) {
    if (b.startMinutes > cursor) free.push({ startMinutes: cursor, endMinutes: b.startMinutes });
    cursor = Math.max(cursor, b.endMinutes);
  }
  if (cursor < window.endMinutes) free.push({ startMinutes: cursor, endMinutes: window.endMinutes });
  return free;
};

/** Próximo momento libre a partir de "ahora" (o del inicio del horario si aún no ha empezado). */
export const getNextFreeMinutes = (staffId, dateKey, nowMinutes, ctx) => {
  const window = getStaffWorkingWindow(staffId, dateKey, ctx.schedules, ctx.timeOff);
  if (!window.isWorking) return null;
  const free = getStaffFreeIntervals(staffId, dateKey, ctx);
  const from = Math.max(nowMinutes, window.startMinutes);
  const current = free.find(f => from >= f.startMinutes && from < f.endMinutes);
  if (current) return from;
  const upcoming = free.find(f => f.startMinutes >= from);
  return upcoming ? upcoming.startMinutes : null;
};

export const formatMinutes = (totalMinutes) => {
  if (totalMinutes == null) return '';
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};
