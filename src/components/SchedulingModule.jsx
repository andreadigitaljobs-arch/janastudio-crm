import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon, Clock, User, Plus, ChevronLeft, ChevronRight,
  ChevronDown, Search, Pencil,
  CheckCircle2, Users,
  CalendarDays, StickyNote, BarChart3, XCircle
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { getRoleKind } from '../utils/roles';
import {
  getStaffWorkingWindow, getStaffBusyIntervals,
  getNextFreeMinutes, getAppointmentDuration, formatMinutes
} from '../utils/availability';
import { loadStoredSchedules, loadStoredTimeOff } from '../utils/mockStaffSchedules';
import { getBusinessDateKey } from '../utils/dateTime';
import ScheduleModal from './ScheduleModal';
import NewClientModal from './NewClientModal';
import { normalizeForSearch } from '../utils/stringUtils';

const STATUS_COLORS = {
  'Confirmada': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', leftBorder: '#22c55e' },
  'Pendiente': { bg: '#fffbeb', text: '#d97706', border: '#fde68a', leftBorder: '#f59e0b' },
  'En proceso': { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd', leftBorder: '#0ea5e9' },
  'Agendado': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', leftBorder: '#22c55e' },
  'En Silla': { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd', leftBorder: '#0ea5e9' },
  'En Tratamiento': { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd', leftBorder: '#0ea5e9' },
  'Por Pagar': { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd', leftBorder: '#0ea5e9' },
  'Completado': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', leftBorder: '#22c55e' },
  'Cancelada': { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', leftBorder: '#ef4444' },
};

// Ventana visible de la grilla del día (7:00 AM a 8:00 PM)
const VIEW_START_MIN = 7 * 60;
const VIEW_END_MIN = 20 * 60;
const PX_PER_MIN = 1; // 60px por hora
const GRID_HEIGHT = (VIEW_END_MIN - VIEW_START_MIN) * PX_PER_MIN;
const minutesToY = (minutes) => Math.max(0, (minutes - VIEW_START_MIN) * PX_PER_MIN);

const HOUR_MARKS = [];
for (let m = VIEW_START_MIN; m <= VIEW_END_MIN; m += 60) HOUR_MARKS.push(m);

const CalendarComponent = ({ selectedDate, onSelectDate }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, currentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, currentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, currentMonth: false });
  }

  const today = new Date();
  const isToday = (day) => day.currentMonth && day.day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isSelected = (day) => day.currentMonth && day.day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();

  const handlePrev = () => setViewDate(new Date(year, month - 1, 1));
  const handleNext = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="agenda-glass-card" style={{ padding: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4a3036', margin: 0, textTransform: 'capitalize' }}>
          {monthName}
        </h3>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={handlePrev} style={{
            width: '30px', height: '30px', borderRadius: '10px', border: '1px solid rgba(223,178,140,0.3)',
            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#c97282', transition: 'all 0.2s'
          }} className="btn-hover-scale"><ChevronLeft size={15} /></button>
          <button onClick={handleNext} style={{
            width: '30px', height: '30px', borderRadius: '10px', border: '1px solid rgba(223,178,140,0.3)',
            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#c97282', transition: 'all 0.2s'
          }} className="btn-hover-scale"><ChevronRight size={15} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '5px', textAlign: 'center' }}>
        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
          <div key={i} style={{ fontSize: '0.68rem', fontWeight: 700, color: '#c97282', opacity: 0.8, padding: '4px 0' }}>{d}</div>
        ))}
        {days.map((d, i) => {
          const selected = isSelected(d);
          const todayMark = isToday(d);
          return (
            <button
              key={i}
              onClick={() => d.currentMonth && onSelectDate(new Date(year, month, d.day))}
              disabled={!d.currentMonth}
              style={{
                width: '100%',
                maxWidth: '32px',
                aspectRatio: '1 / 1',
                borderRadius: '10px',
                border: 'none',
                background: selected
                  ? 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)'
                  : todayMark
                    ? 'rgba(232, 162, 169, 0.15)'
                    : 'transparent',
                color: selected
                  ? '#fff'
                  : todayMark
                    ? '#db8c95'
                    : d.currentMonth
                      ? '#4a3036'
                      : '#e2d7d9',
                fontWeight: selected || todayMark ? 700 : 500,
                fontSize: '0.75rem',
                cursor: d.currentMonth ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                transition: 'all 0.2s ease',
                opacity: d.currentMonth ? 1 : 0.3
              }}
              className={d.currentMonth ? "btn-hover-scale" : ""}
            >{d.day}</button>
          );
        })}
      </div>
    </div>
  );
};

/** Columna de un día para una trabajadora: grilla de horas + bloques de citas posicionados por hora/duración real. */
const StaffDayColumn = ({ staffMember, dayAppointments, workingWindow, isToday, nowMinutes, onSlotClick, onAppointmentClick, compact }) => {
  const initial = (staffMember.name || '?').charAt(0).toUpperCase();
  const busy = getStaffBusyIntervals(staffMember.id, dayAppointments);

  const handleColumnClick = (e) => {
    if (!workingWindow.isWorking) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const clickedMinutes = Math.round((VIEW_START_MIN + y / PX_PER_MIN) / 30) * 30;
    // Ignora clicks encima de una cita existente (el bloque ya maneja su propio click)
    const onExisting = busy.some(b => clickedMinutes >= b.startMinutes && clickedMinutes < b.endMinutes);
    if (onExisting) return;
    onSlotClick(staffMember, clickedMinutes);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: compact ? '100%' : '190px', flex: compact ? 'none' : '1 1 190px' }}>
      {/* Encabezado de la trabajadora */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', marginBottom: '8px',
        borderRadius: '12px', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(223,178,140,0.2)'
      }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: '0.72rem'
        }}>{initial}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4a3036', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {staffMember.name}
          </div>
          <div style={{ fontSize: '0.62rem', color: '#a07880', fontWeight: 500 }}>
            {workingWindow.isWorking ? `${formatMinutes(workingWindow.startMinutes)} – ${formatMinutes(workingWindow.endMinutes)}` : 'Día libre'}
          </div>
        </div>
      </div>

      {/* Grilla del día */}
      <div
        onClick={handleColumnClick}
        style={{
          position: 'relative',
          height: `${GRID_HEIGHT}px`,
          borderRadius: '14px',
          border: '1px solid rgba(223,178,140,0.18)',
          background: workingWindow.isWorking
            ? 'repeating-linear-gradient(180deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 59px, rgba(223,178,140,0.12) 60px)'
            : 'repeating-linear-gradient(45deg, rgba(200,190,192,0.08) 0px, rgba(200,190,192,0.08) 8px, rgba(200,190,192,0.15) 8px, rgba(200,190,192,0.15) 16px)',
          cursor: workingWindow.isWorking ? 'pointer' : 'default',
          overflow: 'hidden'
        }}
      >
        {!workingWindow.isWorking && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            fontSize: '0.7rem', fontWeight: 700, color: '#a0848a', background: 'rgba(255,255,255,0.85)',
            padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(223,178,140,0.3)', whiteSpace: 'nowrap'
          }}>
            Día libre
          </div>
        )}

        {/* Franjas fuera del horario de trabajo, sombreadas */}
        {workingWindow.isWorking && workingWindow.startMinutes > VIEW_START_MIN && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${minutesToY(workingWindow.startMinutes)}px`, background: 'rgba(200,190,192,0.1)', pointerEvents: 'none' }} />
        )}
        {workingWindow.isWorking && workingWindow.endMinutes < VIEW_END_MIN && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${GRID_HEIGHT - minutesToY(workingWindow.endMinutes)}px`, background: 'rgba(200,190,192,0.1)', pointerEvents: 'none' }} />
        )}

        {/* Línea de "ahora" */}
        {isToday && nowMinutes >= VIEW_START_MIN && nowMinutes <= VIEW_END_MIN && (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: `${minutesToY(nowMinutes)}px`,
            height: '2px', background: '#db8c95', zIndex: 5, boxShadow: '0 0 4px rgba(219,140,149,0.6)'
          }} />
        )}

        {/* Bloques de citas */}
        {dayAppointments.filter(a => a.staff_id === staffMember.id).map(app => {
          const start = new Date(app.scheduled_at || app.created_at);
          const startMinutes = start.getHours() * 60 + start.getMinutes();
          const duration = getAppointmentDuration(app);
          const top = minutesToY(startMinutes);
          const height = Math.max(22, duration * PX_PER_MIN - 2);
          const colors = STATUS_COLORS[app.status] || STATUS_COLORS.Agendado;
          const clientName = app.clients?.name || 'Cliente';
          return (
            <div
              key={app.id}
              onClick={(e) => { e.stopPropagation(); onAppointmentClick(app); }}
              title={`${clientName} · ${app.services?.name || 'Servicio'} · ${formatMinutes(startMinutes)}`}
              style={{
                position: 'absolute', top: `${top}px`, left: '3px', right: '3px', height: `${height}px`,
                background: '#fff', borderRadius: '8px', borderLeft: `3px solid ${colors.leftBorder}`,
                boxShadow: '0 2px 6px rgba(167,102,115,0.1)', padding: '3px 6px', cursor: 'pointer',
                overflow: 'hidden', zIndex: 2, transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.zIndex = '3'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '2'; }}
            >
              <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#4a3036', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clientName}</div>
              {height > 32 && <div style={{ fontSize: '0.58rem', color: '#a07880', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.services?.name || 'Servicio'}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SchedulingModule = ({ isMobile, rates, openScheduleModal = false, modalKey = null }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const [appointments, setAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [timeOff, setTimeOff] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleModalPreset, setScheduleModalPreset] = useState(null);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('day');
  const [filterStaffId, setFilterStaffId] = useState('all');
  const [mobileStaffId, setMobileStaffId] = useState(null);

  const roleKind = getRoleKind(user?.role);
  const isWorkerView = roleKind === 'worker';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadFilteredAppointments();
  }, [selectedDate, filterType]);

  useEffect(() => {
    const refreshOnAppointmentChange = (event) => {
      if (event.detail?.table === 'appointments') {
        loadFilteredAppointments();
      }
    };
    const refreshOnScheduleChange = () => {
      setSchedules(loadStoredSchedules(staff));
      setTimeOff(loadStoredTimeOff());
    };
    window.addEventListener('jana:data-changed', refreshOnAppointmentChange);
    window.addEventListener('jana:mock-schedule-changed', refreshOnScheduleChange);
    return () => {
      window.removeEventListener('jana:data-changed', refreshOnAppointmentChange);
      window.removeEventListener('jana:mock-schedule-changed', refreshOnScheduleChange);
    };
  }, [selectedDate, filterType, staff]);

  useEffect(() => {
    if (openScheduleModal) {
      setShowScheduleModal(true);
    }
  }, [openScheduleModal, modalKey]);

  const loadData = async () => {
    try {
      const [st, cl, sv] = await Promise.all([
        dataService.getStaff(),
        dataService.getClients(),
        dataService.getServices()
      ]);
      setStaff(st);
      setClients(cl);
      setServices(sv);
      setSchedules(loadStoredSchedules(st));
      setTimeOff(loadStoredTimeOff());
    } catch (err) {
      console.error(err);
    }
  };

  const loadFilteredAppointments = async () => {
    try {
      setLoading(true);
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      let end = new Date(start);
      if (filterType === 'day') end.setDate(start.getDate() + 1);
      else if (filterType === 'week') { end.setDate(start.getDate() + 7); }
      else if (filterType === 'month') { start.setDate(1); end = new Date(start.getFullYear(), start.getMonth() + 1, 0); end.setHours(23, 59, 59, 999); }
      const endQuery = new Date(end.getTime() - 1);
      const data = await dataService.getAppointments(start.toISOString(), endQuery.toISOString());
      setAppointments(data.filter(a => a.status !== 'Cancelada' && a.status !== 'Cancelado'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const dateKey = getBusinessDateKey(selectedDate);
  const todayKey = getBusinessDateKey(new Date());
  const isToday = dateKey === todayKey;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const visibleStaff = useMemo(() => {
    if (isWorkerView) return staff.filter(s => s.id === user?.id);
    if (filterStaffId === 'all') return staff;
    return staff.filter(s => s.id === filterStaffId);
  }, [staff, isWorkerView, user?.id, filterStaffId]);

  const dayApps = useMemo(() => {
    const term = searchTerm ? normalizeForSearch(searchTerm) : '';
    return appointments.filter(app => {
      const appDate = new Date(app.scheduled_at || app.created_at);
      if (getBusinessDateKey(appDate) !== dateKey) return false;
      if (!term) return true;
      return normalizeForSearch(app.clients?.name || '').includes(term) || normalizeForSearch(app.clients?.phone || '').includes(term);
    });
  }, [appointments, dateKey, searchTerm]);

  const availabilityCtx = { schedules, timeOff, appointmentsForDay: dayApps };

  const staffStats = useMemo(() => visibleStaff.map(s => {
    const window = getStaffWorkingWindow(s.id, dateKey, schedules, timeOff);
    const busy = window.isWorking ? getStaffBusyIntervals(s.id, dayApps).filter(b => b.endMinutes > window.startMinutes && b.startMinutes < window.endMinutes) : [];
    const busyMinutes = busy.reduce((sum, b) => sum + (Math.min(b.endMinutes, window.endMinutes) - Math.max(b.startMinutes, window.startMinutes)), 0);
    const totalWindowMinutes = window.isWorking ? window.endMinutes - window.startMinutes : 0;
    return { staff: s, window, busyMinutes, freeMinutes: Math.max(0, totalWindowMinutes - busyMinutes) };
  }), [visibleStaff, dateKey, schedules, timeOff, dayApps]);

  const totalCitas = dayApps.length;
  const confirmadas = dayApps.filter(a => a.status === 'Agendado' || a.status === 'Completado').length;
  const pendientes = dayApps.filter(a => a.status === 'En Silla' || a.status === 'En Tratamiento').length;
  const enProceso = dayApps.filter(a => a.status === 'Por Pagar').length;
  const nextAppointment = [...dayApps].sort((a, b) => new Date(a.scheduled_at || a.created_at) - new Date(b.scheduled_at || b.created_at))[0];
  const nextAppTime = nextAppointment ? new Date(nextAppointment.scheduled_at || nextAppointment.created_at).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true }) : null;

  const totalBusyMinutes = staffStats.reduce((sum, s) => sum + s.busyMinutes, 0);
  const totalFreeMinutes = staffStats.reduce((sum, s) => sum + s.freeMinutes, 0);
  const occupancyPct = (totalBusyMinutes + totalFreeMinutes) ? Math.round((totalBusyMinutes / (totalBusyMinutes + totalFreeMinutes)) * 100) : 0;
  const confirmedPercent = totalCitas ? Math.round(confirmadas / totalCitas * 100) : 0;

  const formatHM = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const dayName = selectedDate.toLocaleDateString('es-VE', { weekday: 'long' });
  const dayNum = selectedDate.getDate();
  const monthName = selectedDate.toLocaleDateString('es-VE', { month: 'long' });

  const openScheduleFor = (staffMember, minutes) => {
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    setScheduleModalPreset({ staff: staffMember, initialTime: `${hh}:${mm}` });
    setShowScheduleModal(true);
  };

  const openScheduleForAppointment = () => {
    // Placeholder de edición: por ahora, el flujo de click en una cita solo confirma cuál es (Fase 1 = ver, no editar in-line todavía)
    showToast?.('Abrir detalle de la cita — próximamente edición rápida aquí', 'info');
  };

  const handleSlotClick = (staffMember, minutes) => {
    openScheduleFor(staffMember, minutes);
  };

  // Cuando la trabajadora que ve solo su propia agenda está de día libre, avisamos por qué no puede reservar
  useEffect(() => {
    if (isWorkerView && visibleStaff.length === 1) {
      const w = getStaffWorkingWindow(visibleStaff[0].id, dateKey, schedules, timeOff);
      if (!w.isWorking && dayApps.length === 0) {
        // silencioso: el badge "Día libre" en la columna ya lo comunica visualmente
      }
    }
  }, [isWorkerView, visibleStaff, dateKey, schedules, timeOff, dayApps]);

  const mobileSelectedStaff = isMobile
    ? (visibleStaff.find(s => s.id === mobileStaffId) || visibleStaff[0])
    : null;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile ? 'calc(100px + env(safe-area-inset-bottom, 12px))' : '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 700, color: '#4a3036', margin: 0, fontFamily: 'Playfair Display, serif' }}>
            {isWorkerView ? 'Mi ' : 'Agenda '}<span className="text-gradient">{isWorkerView ? 'Agenda' : 'Jana'}</span>
          </h1>
          {!isMobile && <p style={{ fontSize: '0.8rem', color: '#a07880', margin: '4px 0 0 0', fontWeight: 500 }}>
            {isWorkerView ? 'Tus citas del día, de un vistazo.' : 'Gestión inteligente de citas y disponibilidad.'}
          </p>}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {!isMobile && !isWorkerView && <button onClick={() => setShowNewClientModal(true)} style={{
            padding: '10px 18px', borderRadius: '12px', border: '1px solid rgba(223,178,140,0.4)',
            background: '#fff', color: '#6b4a52', fontSize: '0.8rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
          }} className="btn-hover-scale"><User size={16} /> Nuevo Cliente</button>}
          {!isWorkerView && <button onClick={() => { setScheduleModalPreset(null); setShowScheduleModal(true); }} style={{
            padding: isMobile ? '10px 14px' : '10px 18px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)',
            color: '#fff', fontSize: isMobile ? '0.75rem' : '0.8rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 4px 15px rgba(219,140,149,0.25)', transition: 'all 0.2s', whiteSpace: 'nowrap'
          }} className="btn-hover-scale"><Plus size={16} /> Agendar</button>}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? '8px' : '16px', marginBottom: '20px' }}>
        {[
          { icon: CalendarDays, label: 'Citas', value: totalCitas, sub: nextAppTime ? `Sig: ${nextAppTime}` : 'Sin citas' },
          { icon: Clock, label: 'Libres', value: formatHM(totalFreeMinutes), sub: 'hoy' },
          { icon: CheckCircle2, label: 'OK', value: confirmadas, sub: `${confirmedPercent}%` },
        ].map((stat, idx) => (
          <div key={idx} className="agenda-glass-card" style={{
            padding: isMobile ? '12px 8px' : '18px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            gap: isMobile ? '4px' : '16px',
            textAlign: isMobile ? 'center' : 'left'
          }}>
            {!isMobile && <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(232,162,169,0.15) 0%, rgba(223,178,140,0.15) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <stat.icon size={20} color="#db8c95" />
            </div>}
            {isMobile && <stat.icon size={16} color="#db8c95" />}
            <div>
              <div style={{ fontSize: isMobile ? '0.58rem' : '0.72rem', color: '#a07880', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{stat.label}</div>
              <div style={{ fontSize: isMobile ? '1.1rem' : '1.4rem', fontWeight: 700, color: '#4a3036', lineHeight: 1.1, marginTop: '2px' }}>{stat.value}</div>
              {!isMobile && <div style={{ fontSize: '0.68rem', color: '#8c767b', marginTop: '4px' }}>{stat.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Calendar + Timeline + Sidebar */}
      <div className="agenda-main-container">
        {/* Left: Calendar + Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <CalendarComponent selectedDate={selectedDate} onSelectDate={setSelectedDate} />

          <div className="agenda-glass-card" style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3036', margin: '0 0 14px 0', borderBottom: '1px solid rgba(223,178,140,0.2)', paddingBottom: '8px' }}>Filtros de vista</h4>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', background: 'rgba(232,162,169,0.06)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(223,178,140,0.15)' }}>
              {[
                { id: 'day', label: 'Hoy / Día' },
                { id: 'week', label: 'Semana' },
                { id: 'month', label: 'Mes' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`agenda-view-tab ${filterType === f.id ? 'active' : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {!isWorkerView && (
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <select
                  value={filterStaffId}
                  onChange={(e) => setFilterStaffId(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid rgba(223,178,140,0.3)',
                    background: '#fff', color: '#6b4a52', fontSize: '0.72rem', fontWeight: 500,
                    outline: 'none', cursor: 'pointer', appearance: 'none'
                  }}
                >
                  <option value="all">Todas las especialistas</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown size={13} color="#c97282" style={{ position: 'absolute', right: '12px', top: '12px', pointerEvents: 'none' }} />
              </div>
            )}

            {!isWorkerView && filterStaffId !== 'all' && (
              <button onClick={() => setFilterStaffId('all')} style={{
                width: '100%', padding: '9px', borderRadius: '10px', border: '1px solid rgba(196,139,159,0.2)',
                background: 'rgba(196,139,159,0.06)', color: '#c97282', fontSize: '0.72rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s'
              }} className="btn-hover-scale">
                <XCircle size={13} /> Ver todas
              </button>
            )}
          </div>
        </div>

        {/* Center: Grid por trabajadora */}
        <div className="agenda-glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#4a3036', margin: 0, textTransform: 'capitalize', fontFamily: 'Playfair Display, serif' }}>
              {dayName}, {dayNum} de {monthName}
            </h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1))} style={{
                width: '30px', height: '30px', borderRadius: '10px', border: '1px solid rgba(223,178,140,0.3)',
                background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', transition: 'all 0.2s'
              }} className="btn-hover-scale"><ChevronLeft size={15} /></button>
              <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1))} style={{
                width: '30px', height: '30px', borderRadius: '10px', border: '1px solid rgba(223,178,140,0.3)',
                background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', transition: 'all 0.2s'
              }} className="btn-hover-scale"><ChevronRight size={15} /></button>
            </div>
          </div>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
            borderRadius: '12px', border: '1px solid rgba(223,178,140,0.25)', background: '#fff',
            marginBottom: '18px', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.01)'
          }}>
            <Search size={16} color="#db8c95" />
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1, border: 'none', background: 'none', outline: 'none',
                fontSize: '0.8rem', color: '#4a3036'
              }}
            />
          </div>

          {filterType !== 'day' ? (
            <div style={{
              padding: '48px 20px', textAlign: 'center', borderRadius: '16px',
              border: '1px dashed rgba(223,178,140,0.35)', background: 'rgba(255,255,255,0.4)'
            }}>
              <CalendarIcon size={28} color="#db8c95" style={{ marginBottom: '10px' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4a3036', marginBottom: '4px' }}>
                Vista de {filterType === 'week' ? 'semana' : 'mes'} — próximamente
              </div>
              <div style={{ fontSize: '0.75rem', color: '#a07880' }}>
                Por ahora, usa la vista de día para ver la agenda de todo el equipo.
              </div>
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#a07880', fontSize: '0.8rem' }}>Cargando agenda...</div>
          ) : visibleStaff.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#a07880', fontSize: '0.8rem' }}>No hay especialistas para mostrar.</div>
          ) : isMobile ? (
            <div>
              {/* Selector de especialista (chips) */}
              {!isWorkerView && (
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '14px', paddingBottom: '4px' }}>
                  {visibleStaff.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setMobileStaffId(s.id)}
                      style={{
                        flexShrink: 0, padding: '7px 14px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600,
                        border: (mobileSelectedStaff?.id === s.id) ? 'none' : '1px solid rgba(223,178,140,0.3)',
                        background: (mobileSelectedStaff?.id === s.id) ? 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)' : '#fff',
                        color: (mobileSelectedStaff?.id === s.id) ? '#fff' : '#6b4a52', cursor: 'pointer'
                      }}
                    >
                      {s.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}
              {mobileSelectedStaff && (
                <StaffDayColumn
                  staffMember={mobileSelectedStaff}
                  dayAppointments={dayApps}
                  workingWindow={getStaffWorkingWindow(mobileSelectedStaff.id, dateKey, schedules, timeOff)}
                  isToday={isToday}
                  nowMinutes={nowMinutes}
                  onSlotClick={handleSlotClick}
                  onAppointmentClick={openScheduleForAppointment}
                  compact
                />
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
              {/* Eje de horas */}
              <div style={{ flexShrink: 0, width: '46px', paddingTop: '46px' }}>
                <div style={{ position: 'relative', height: `${GRID_HEIGHT}px` }}>
                  {HOUR_MARKS.map(m => (
                    <div key={m} style={{
                      position: 'absolute', top: `${minutesToY(m) - 6}px`, right: 0,
                      fontSize: '0.62rem', color: '#a07880', fontWeight: 600, fontVariantNumeric: 'tabular-nums'
                    }}>
                      {formatMinutes(m)}
                    </div>
                  ))}
                </div>
              </div>

              {visibleStaff.map(s => (
                <StaffDayColumn
                  key={s.id}
                  staffMember={s}
                  dayAppointments={dayApps}
                  workingWindow={getStaffWorkingWindow(s.id, dateKey, schedules, timeOff)}
                  isToday={isToday}
                  nowMinutes={nowMinutes}
                  onSlotClick={handleSlotClick}
                  onAppointmentClick={openScheduleForAppointment}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Summary + Specialists + Notes */}
        <div className="agenda-sidebar-right" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Resumen del Día */}
          <div className="agenda-glass-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3036', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={15} color="#db8c95" /> Resumen del Día
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Total de citas', value: totalCitas },
                { label: 'Confirmadas', value: confirmadas, pct: `${totalCitas ? Math.round(confirmadas / totalCitas * 100) : 0}%`, color: '#16a34a' },
                { label: 'Pendientes', value: pendientes, pct: `${totalCitas ? Math.round(pendientes / totalCitas * 100) : 0}%`, color: '#d97706' },
                { label: 'En proceso', value: enProceso, pct: `${totalCitas ? Math.round(enProceso / totalCitas * 100) : 0}%`, color: '#0284c7' },
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ color: '#8c767b', fontWeight: 500 }}>{item.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#4a3036' }}>{item.value}</span>
                    {item.pct && <span style={{ color: item.color, fontWeight: 700, fontSize: '0.68rem' }}>({item.pct})</span>}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid rgba(223, 178, 140, 0.25)', paddingTop: '10px', marginTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                  <span style={{ color: '#8c767b', fontWeight: 500 }}>Horas ocupadas</span>
                  <span style={{ fontWeight: 700, color: '#4a3036' }}>{formatHM(totalBusyMinutes)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '8px' }}>
                  <span style={{ color: '#8c767b', fontWeight: 500 }}>Disponibilidad</span>
                  <span style={{ fontWeight: 700, color: '#4a3036' }}>{formatHM(totalFreeMinutes)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ color: '#8c767b', fontWeight: 500 }}>Ocupación del equipo</span>
                  <span style={{ fontWeight: 800, color: '#db8c95' }}>{occupancyPct}%</span>
                </div>
                <div style={{ marginTop: '8px', height: '6px', borderRadius: '4px', background: 'rgba(232, 162, 169, 0.12)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${occupancyPct}%`, borderRadius: '4px', background: 'linear-gradient(90deg, #e8a2a9, #db8c95)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Especialistas del Día — disponibilidad real */}
          {!isWorkerView && (
            <div className="agenda-glass-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3036', margin: 0 }}>Especialistas</h4>
                <Users size={15} color="#db8c95" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {staffStats.map(({ staff: s, window, busyMinutes }) => {
                  const initial = (s.name || '?').charAt(0).toUpperCase();
                  let statusLabel, statusColor;
                  if (!window.isWorking) {
                    statusLabel = 'Día libre';
                    statusColor = '#a0848a';
                  } else {
                    const busyNow = isToday && getStaffBusyIntervals(s.id, dayApps).some(b => nowMinutes >= b.startMinutes && nowMinutes < b.endMinutes);
                    if (busyNow) {
                      statusLabel = 'Ocupada';
                      statusColor = '#d97706';
                    } else {
                      const nextFree = isToday ? getNextFreeMinutes(s.id, dateKey, nowMinutes, availabilityCtx) : window.startMinutes;
                      statusLabel = nextFree != null ? `Libre ${formatMinutes(nextFree)}` : 'Sin huecos';
                      statusColor = '#16a34a';
                    }
                  }
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0
                      }}>{initial}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: '#4a3036', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                        <div style={{ fontSize: '0.68rem', color: '#a07880', fontWeight: 500 }}>{busyMinutes > 0 ? `${formatHM(busyMinutes)} ocupada` : 'Sin citas hoy'}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: statusColor }}>{statusLabel}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notas Rápidas */}
          <div className="agenda-glass-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3036', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StickyNote size={15} color="#db8c95" /> Notas rápidas
              </h4>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#db8c95' }}>
                <Pencil size={13} />
              </button>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6b4a52', lineHeight: '1.6', fontWeight: 500 }}>
              <p style={{ margin: '0 0 8px 0', borderLeft: '2px solid #e8a2a9', paddingLeft: '8px' }}>Recordar promoción de hidratación capilar.</p>
              <p style={{ margin: 0, borderLeft: '2px solid #db8c95', paddingLeft: '8px' }}>Revisar stock de productos de coloración.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showScheduleModal && (
        <ScheduleModal
          isOpen={showScheduleModal}
          onClose={() => { setShowScheduleModal(false); setScheduleModalPreset(null); }}
          clients={clients}
          services={services}
          staff={scheduleModalPreset?.staff || (isWorkerView ? visibleStaff[0] : staff)}
          rates={rates}
          defaultDate={selectedDate}
          initialTime={scheduleModalPreset?.initialTime}
          onSave={() => { setShowScheduleModal(false); setScheduleModalPreset(null); loadFilteredAppointments(); }}
        />
      )}
      {showNewClientModal && (
        <NewClientModal
          isOpen={showNewClientModal}
          onClose={() => setShowNewClientModal(false)}
          onClientCreated={(c) => { setClients(prev => [...prev, c]); setShowNewClientModal(false); }}
        />
      )}
    </div>
  );
};

export default SchedulingModule;
