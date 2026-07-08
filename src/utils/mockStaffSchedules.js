// ⚠️ DATOS TEMPORALES — quitar este archivo cuando exista la tabla real `staff_schedules` en Supabase.
//
// La forma de los datos (staff_id, day_of_week, is_working, start_time, end_time) es exactamente
// la forma planeada para la tabla real (ver plan de Fase 1: Lunes a sábado 9am-6pm, domingo libre
// como valor por defecto, ajustable por trabajadora). Cuando la tabla exista, basta con reemplazar
// las dos funciones de abajo por `dataService.getStaffSchedules()` / `dataService.getStaffTimeOff()`
// en cualquier lugar donde se usen — la lógica de `availability.js` que las consume no cambia.

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const getDayLabel = (dayOfWeek) => DAY_LABELS[dayOfWeek] || '';

/** Horario semanal por defecto: Lunes(1) a Sábado(6) 9:00-18:00, Domingo(0) libre. */
export const getMockStaffSchedules = (staffList = []) => {
  const rows = [];
  staffList.forEach(staff => {
    for (let day = 0; day <= 6; day++) {
      rows.push({
        staff_id: staff.id,
        day_of_week: day,
        is_working: day !== 0,
        start_time: day !== 0 ? '09:00' : null,
        end_time: day !== 0 ? '18:00' : null
      });
    }
  });
  return rows;
};

/** Sin días libres puntuales configurados por defecto. */
export const getMockStaffTimeOff = () => [];

// Persistencia local temporal (localStorage) para que la pestaña "Horario" se sienta real
// mientras se prueba el diseño — se pierde si se limpia el navegador, y se reemplaza por
// guardado real en Supabase cuando exista la tabla.
const SCHEDULES_KEY = 'jana_mock_staff_schedules_v1';
const TIME_OFF_KEY = 'jana_mock_staff_time_off_v1';

export const loadStoredSchedules = (staffList = []) => {
  try {
    const raw = localStorage.getItem(SCHEDULES_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      // Si hay trabajadoras nuevas sin horario guardado todavía, se les completa con el default
      // para que nunca "desaparezcan" de la agenda por falta de fila.
      const missing = staffList.filter(s => !stored.some(r => r.staff_id === s.id));
      const merged = missing.length ? [...stored, ...getMockStaffSchedules(missing)] : stored;
      if (missing.length) saveStoredSchedules(merged);
      return merged;
    }
  } catch { /* ignore */ }
  const seeded = getMockStaffSchedules(staffList);
  saveStoredSchedules(seeded);
  return seeded;
};

const notifyScheduleChanged = () => {
  try { window.dispatchEvent(new CustomEvent('jana:mock-schedule-changed')); } catch { /* ignore */ }
};

export const saveStoredSchedules = (rows) => {
  try {
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(rows));
  } catch { /* ignore */ }
};

export const upsertStoredScheduleRows = (staffId, weekRows) => {
  const current = (() => {
    try {
      const raw = localStorage.getItem(SCHEDULES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();
  const others = current.filter(r => r.staff_id !== staffId);
  const next = [...others, ...weekRows.map(r => ({ ...r, staff_id: staffId }))];
  saveStoredSchedules(next);
  notifyScheduleChanged();
  return next;
};

export const loadStoredTimeOff = () => {
  try {
    const raw = localStorage.getItem(TIME_OFF_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return getMockStaffTimeOff();
};

export const addStoredTimeOff = (staffId, date, reason) => {
  const current = loadStoredTimeOff();
  const entry = { id: `${staffId}_${date}`, staff_id: staffId, date, reason: reason || '' };
  const next = [...current.filter(t => !(t.staff_id === staffId && t.date === date)), entry];
  try { localStorage.setItem(TIME_OFF_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  notifyScheduleChanged();
  return next;
};

export const removeStoredTimeOff = (id) => {
  const next = loadStoredTimeOff().filter(t => t.id !== id);
  try { localStorage.setItem(TIME_OFF_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  notifyScheduleChanged();
  return next;
};
