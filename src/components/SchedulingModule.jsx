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
const StaffDayColumn = ({ 
  staffMember, 
  dayAppointments, 
  workingWindow, 
  isToday, 
  nowMinutes, 
  onSlotClick, 
  onAppointmentClick, 
  compact,
  checkingTime,
  multipleBookingActive,
  multipleBookedSlots = [],
  onMultipleSlotToggle
}) => {
  const initial = (staffMember.name || '?').charAt(0).toUpperCase();
  const busy = getStaffBusyIntervals(staffMember.id, dayAppointments);

  // Bloqueo manual simulado (Almuerzo de 1:00 PM a 2:00 PM si trabaja)
  const mockManualBlocks = workingWindow.isWorking ? [
    { id: `lunch-${staffMember.id}`, startMinutes: 13 * 60, endMinutes: 14 * 60, title: '🔒 Almuerzo (Bloqueo)' }
  ] : [];

  const isTimeBusy = (time) => {
    return busy.some(b => time >= b.startMinutes && time < b.endMinutes) ||
           mockManualBlocks.some(b => time >= b.startMinutes && time < b.endMinutes);
  };

  const handleColumnClick = (e) => {
    if (!workingWindow.isWorking) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const clickedMinutes = Math.round((VIEW_START_MIN + y / PX_PER_MIN) / 30) * 30;
    
    // Ignora clicks encima de una cita existente o bloque manual
    const onExisting = busy.some(b => clickedMinutes >= b.startMinutes && clickedMinutes < b.endMinutes) ||
                       mockManualBlocks.some(b => clickedMinutes >= b.startMinutes && clickedMinutes < b.endMinutes);
    if (onExisting) return;

    if (multipleBookingActive) {
      if (onMultipleSlotToggle) {
        onMultipleSlotToggle(staffMember.id, clickedMinutes);
      }
    } else {
      onSlotClick(staffMember, clickedMinutes);
    }
  };

  // Determinar estado de disponibilidad para "¿Quién está libre ahorita?"
  let isCheckingFree = false;
  if (checkingTime != null && workingWindow.isWorking) {
    const insideWorking = checkingTime >= workingWindow.startMinutes && checkingTime < workingWindow.endMinutes;
    const occupied = isTimeBusy(checkingTime);
    isCheckingFree = insideWorking && !occupied;
  }

  // Filtrar ranuras pre-agendadas de reserva múltiple para esta trabajadora
  const staffMultipleSlots = multipleBookedSlots.filter(slot => slot.staffId === staffMember.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: compact ? '100%' : '190px', flex: compact ? 'none' : '1 1 190px' }}>
      {/* Encabezado de la trabajadora (Sticky) */}
      <div 
        className="agenda-staff-header-sticky"
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', marginBottom: '8px',
          borderRadius: '12px', background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(223,178,140,0.25)',
          boxShadow: isCheckingFree ? '0 0 10px rgba(22, 163, 74, 0.25)' : 'none',
          borderColor: checkingTime != null ? (isCheckingFree ? '#22c55e' : '#ef4444') : 'rgba(223,178,140,0.25)',
          transition: 'all 0.25s ease',
          position: 'sticky', top: 0, zIndex: 9
        }}
      >
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
          background: checkingTime != null 
            ? (isCheckingFree ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)' : 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)')
            : 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: '0.72rem',
          boxShadow: checkingTime != null && isCheckingFree ? '0 0 8px #22c55e' : 'none'
        }}>{initial}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4a3036', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {staffMember.name}
          </div>
          <div style={{ fontSize: '0.62rem', color: '#a07880', fontWeight: 600 }}>
            {workingWindow.isWorking ? `${formatMinutes(workingWindow.startMinutes)} – ${formatMinutes(workingWindow.endMinutes)}` : 'Día libre'}
          </div>
        </div>
        {checkingTime != null && (
          <div style={{
            fontSize: '0.58rem', fontWeight: 700, 
            color: isCheckingFree ? '#16a34a' : '#dc2626',
            background: isCheckingFree ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            padding: '2px 6px', borderRadius: '8px'
          }}>
            {isCheckingFree ? 'Libre' : 'Ocupada'}
          </div>
        )}
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
            fontSize: '0.7rem', fontWeight: 700, color: '#a0848a', background: 'rgba(255,255,255,0.9)',
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

        {/* Resaltado del buscador de disponibilidad */}
        {checkingTime != null && workingWindow.isWorking && (
          <div 
            className={isCheckingFree ? 'agenda-slot-highlight-free' : 'agenda-slot-highlight-busy'}
            style={{
              position: 'absolute',
              top: `${minutesToY(checkingTime)}px`,
              left: 0,
              right: 0,
              height: '60px', // Duración por defecto de 60min para verificar
              pointerEvents: 'none',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isCheckingFree && (
              <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#16a34a', background: '#fff', padding: '2px 6px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                Disponible aquí
              </span>
            )}
          </div>
        )}

        {/* Línea de "ahora" */}
        {isToday && nowMinutes >= VIEW_START_MIN && nowMinutes <= VIEW_END_MIN && (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: `${minutesToY(nowMinutes)}px`,
            height: '2px', background: '#db8c95', zIndex: 5, boxShadow: '0 0 4px rgba(219,140,149,0.6)'
          }} />
        )}

        {/* Bloqueos manuales (Almuerzo, etc.) */}
        {mockManualBlocks.map(block => {
          const top = minutesToY(block.startMinutes);
          const height = (block.endMinutes - block.startMinutes) * PX_PER_MIN;
          return (
            <div
              key={block.id}
              className="agenda-blocked-slot"
              style={{
                position: 'absolute', top: `${top}px`, left: '3px', right: '3px', height: `${height - 2}px`,
                borderRadius: '8px', padding: '6px 8px', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', zIndex: 2, fontSize: '0.62rem', fontWeight: 600
              }}
            >
              <div>{block.title}</div>
              <div style={{ fontSize: '0.55rem', opacity: 0.8 }}>1:00 PM – 2:00 PM</div>
            </div>
          );
        })}

        {/* Previsualizaciones de Cita Múltiple (Pre-agendadas) */}
        {staffMultipleSlots.map((slot, idx) => {
          const top = minutesToY(slot.startMinutes);
          const height = 60 * PX_PER_MIN; // 60 minutos por defecto
          return (
            <div
              key={`multi-preview-${idx}`}
              className="agenda-appointment-multiple-selected"
              onClick={(e) => { e.stopPropagation(); handleColumnClick(e); }}
              style={{
                position: 'absolute', top: `${top}px`, left: '3px', right: '3px', height: `${height - 2}px`,
                background: 'rgba(160, 80, 106, 0.1)', border: '1px dashed #a0506a', borderRadius: '8px',
                padding: '4px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
                zIndex: 3, cursor: 'pointer', animation: 'fadeIn 0.2s ease'
              }}
            >
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#a0506a' }}>
                🔗 Visita Múltiple
              </div>
              <div style={{ fontSize: '0.55rem', color: '#7a3a4e', fontWeight: 600 }}>
                {formatMinutes(slot.startMinutes)} (Servicio {idx + 1})
              </div>
            </div>
          );
        })}

        {/* Bloques de citas */}
        {dayAppointments.filter(a => a.staff_id === staffMember.id).map(app => {
          const start = new Date(app.scheduled_at || app.created_at);
          const startMinutes = start.getHours() * 60 + start.getMinutes();
          const duration = getAppointmentDuration(app);
          const top = minutesToY(startMinutes);
          const height = Math.max(22, duration * PX_PER_MIN - 2);
          const colors = STATUS_COLORS[app.status] || STATUS_COLORS.Agendado;
          const clientName = app.clients?.name || 'Cliente';
          
          // Verificar si esta cita está conectada a la previsualización múltiple (si simula ID de cita múltiple)
          const isMultipleApp = app.is_multiple_booking;

          return (
            <div
              key={app.id}
              onClick={(e) => { e.stopPropagation(); onAppointmentClick(app); }}
              title={`${clientName} · ${app.services?.name || 'Servicio'} · ${formatMinutes(startMinutes)}`}
              className={isMultipleApp ? "agenda-appointment-multiple-selected" : ""}
              style={{
                position: 'absolute', top: `${top}px`, left: '3px', right: '3px', height: `${height}px`,
                background: '#fff', borderRadius: '8px', borderLeft: `3px solid ${colors.leftBorder}`,
                boxShadow: '0 2px 6px rgba(167,102,115,0.1)', padding: '3px 6px', cursor: 'pointer',
                overflow: 'hidden', zIndex: 2, transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.zIndex = '3'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '2'; }}
            >
              <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#4a3036', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '2px' }}>
                {isMultipleApp && <span>🔗</span>}
                {clientName}
              </div>
              {height > 32 && <div style={{ fontSize: '0.58rem', color: '#a07880', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.services?.name || 'Servicio'}</div>}
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

  // Nuevos estados para diseño de funciones avanzadas (Fase 2 / Disponibilidad)
  const [checkingTime, setCheckingTime] = useState(null);
  const [multipleBookingActive, setMultipleBookingActive] = useState(false);
  const [multipleBookedSlots, setMultipleBookedSlots] = useState([]);
  const [selectedDetailedApp, setSelectedDetailedApp] = useState(null);
  const [viewMode, setViewMode] = useState('specialists');
  const [expandedStaff, setExpandedStaff] = useState({});

  const handleMultipleSlotToggle = (staffId, minutes) => {
    setMultipleBookedSlots(prev => {
      const exists = prev.some(s => s.staffId === staffId && s.startMinutes === minutes);
      if (exists) {
        return prev.filter(s => !(s.staffId === staffId && s.startMinutes === minutes));
      } else {
        if (prev.length >= 3) {
          showToast?.('Máximo 3 servicios simultáneos para reserva múltiple en esta simulación', 'warning');
          return prev;
        }
        return [...prev, { staffId, startMinutes: minutes }];
      }
    });
  };

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
    let list = [];
    if (isWorkerView) list = staff.filter(s => s.id === user?.id);
    else if (filterStaffId === 'all') list = staff;
    else list = staff.filter(s => s.id === filterStaffId);

    if (checkingTime != null) {
      // Ordenar por disponibilidad en ese minuto
      list = [...list].sort((a, b) => {
        const winA = getStaffWorkingWindow(a.id, dateKey, schedules, timeOff);
        const winB = getStaffWorkingWindow(b.id, dateKey, schedules, timeOff);
        
        const busyA = winA.isWorking ? getStaffBusyIntervals(a.id, dayApps) : [];
        const busyB = winB.isWorking ? getStaffBusyIntervals(b.id, dayApps) : [];

        // Almuerzos manuales simulados (13:00 - 14:00)
        const lunchA = winA.isWorking ? (checkingTime >= 13 * 60 && checkingTime < 14 * 60) : false;
        const lunchB = winB.isWorking ? (checkingTime >= 13 * 60 && checkingTime < 14 * 60) : false;

        const isFreeA = winA.isWorking && 
                         checkingTime >= winA.startMinutes && 
                         checkingTime < winA.endMinutes && 
                         !busyA.some(bar => checkingTime >= bar.startMinutes && checkingTime < bar.endMinutes) &&
                         !lunchA;

        const isFreeB = winB.isWorking && 
                         checkingTime >= winB.startMinutes && 
                         checkingTime < winB.endMinutes && 
                         !busyB.some(bar => checkingTime >= bar.startMinutes && checkingTime < bar.endMinutes) &&
                         !lunchB;

        if (isFreeA && !isFreeB) return -1;
        if (!isFreeA && isFreeB) return 1;
        return 0;
      });
    }
    return list;
  }, [staff, isWorkerView, user?.id, filterStaffId, checkingTime, dateKey, schedules, timeOff, dayApps]);

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

  const openScheduleForAppointment = (app) => {
    setSelectedDetailedApp(app);
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

          {/* Panel de Herramientas de Diseño (Fase 2 Visual) */}
          <div className="agenda-glass-card" style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3036', margin: '0 0 14px 0', borderBottom: '1px solid rgba(223,178,140,0.2)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🛠️</span> Herramientas Pro
            </h4>
            
            {/* Selector de disponibilidad rápida "¿Quién está libre?" */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a07880', display: 'block', marginBottom: '6px' }}>
                🔍 ¿QUIÉN ESTÁ LIBRE AHORA?
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select
                  value={checkingTime || ''}
                  onChange={(e) => setCheckingTime(e.target.value ? parseInt(e.target.value) : null)}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(223,178,140,0.3)',
                    background: '#fff', color: '#6b4a52', fontSize: '0.72rem', fontWeight: 500, outline: 'none'
                  }}
                >
                  <option value="">Desactivado</option>
                  <option value="480">8:00 AM</option>
                  <option value="540">9:00 AM</option>
                  <option value="600">10:00 AM</option>
                  <option value="660">11:00 AM</option>
                  <option value="720">12:00 PM</option>
                  <option value="780">1:00 PM (Almuerzos)</option>
                  <option value="840">2:00 PM</option>
                  <option value="900">3:00 PM</option>
                  <option value="960">4:00 PM</option>
                  <option value="1020">5:00 PM</option>
                  <option value="1080">6:00 PM</option>
                  <option value="1140">7:00 PM</option>
                </select>
                {checkingTime && (
                  <button 
                    onClick={() => setCheckingTime(null)}
                    style={{
                      padding: '0 8px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)',
                      background: 'rgba(239, 68, 68, 0.05)', color: '#dc2626', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600
                    }}
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <span style={{ fontSize: '0.58rem', color: '#8c767b', display: 'block', marginTop: '4px', lineHeight: '1.2' }}>
                Resalta visualmente las especialistas que están libres en la hora seleccionada.
              </span>
            </div>

            {/* Toggle de Reserva Múltiple */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a07880' }}>
                  🔗 RESERVA MULTIPLE
                </label>
                <div style={{ position: 'relative', display: 'inline-block', width: '34px', height: '20px' }}>
                  <input
                    type="checkbox"
                    checked={multipleBookingActive}
                    onChange={(e) => {
                      setMultipleBookingActive(e.target.checked);
                      if (!e.target.checked) setMultipleBookedSlots([]);
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }}
                    id="multi-booking-toggle"
                  />
                  <label 
                    htmlFor="multi-booking-toggle"
                    style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: multipleBookingActive ? '#db8c95' : '#ccc',
                      transition: '.4s', borderRadius: '20px'
                    }}
                  >
                    <span style={{
                      position: 'absolute', content: '""', height: '14px', width: '14px', left: '3px', bottom: '3px',
                      backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                      transform: multipleBookingActive ? 'translateX(14px)' : 'none'
                    }} />
                  </label>
                </div>
              </div>
              {multipleBookingActive && (
                <div style={{
                  background: 'rgba(160, 80, 106, 0.04)', border: '1px dashed rgba(160, 80, 106, 0.3)',
                  padding: '10px', borderRadius: '10px', marginTop: '8px', animation: 'fadeIn 0.2s ease'
                }}>
                  <div style={{ fontSize: '0.62rem', color: '#a0506a', fontWeight: 700, marginBottom: '6px' }}>
                    Haz clic en los horarios libres de cada trabajadora para añadir servicios simultáneos:
                  </div>
                  {multipleBookedSlots.length === 0 ? (
                    <div style={{ fontSize: '0.6rem', color: '#8c767b', fontStyle: 'italic' }}>
                      Ningún horario seleccionado todavía.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {multipleBookedSlots.map((slot, i) => {
                        const sMember = staff.find(st => st.id === slot.staffId);
                        return (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', background: '#fff', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(223,178,140,0.2)' }}>
                            <span style={{ fontWeight: 600, color: '#4a3036' }}>
                              👤 {sMember?.name.split(' ')[0]} · 🕒 {formatMinutes(slot.startMinutes)}
                            </span>
                            <button
                              onClick={() => handleMultipleSlotToggle(slot.staffId, slot.startMinutes)}
                              style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem', padding: '0 2px', fontWeight: 'bold' }}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => {
                          showToast?.('Creando cita múltiple visualmente — cargando modal con preselección', 'success');
                          setMultipleBookingActive(false);
                          setMultipleBookedSlots([]);
                          setShowScheduleModal(true);
                        }}
                        style={{
                          width: '100%', marginTop: '6px', padding: '6px', borderRadius: '8px', border: 'none',
                          background: 'linear-gradient(135deg, #e8a2a9, #db8c95)', color: '#fff',
                          fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(219, 140, 149, 0.2)'
                        }}
                      >
                        Confirmar Cita Múltiple
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

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

            {/* Pestañas de Modo de Vista */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', borderBottom: '1px solid rgba(223, 178, 140, 0.2)', paddingBottom: '8px' }}>
              <button
                onClick={() => setViewMode('specialists')}
                style={{
                  padding: '6px 14px', borderRadius: '8px', border: 'none',
                  background: viewMode === 'specialists' ? 'linear-gradient(135deg, #e8a2a9, #db8c95)' : 'transparent',
                  color: viewMode === 'specialists' ? '#fff' : '#6b4a52',
                  fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                👤 Especialistas ({visibleStaff.length})
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                style={{
                  padding: '6px 14px', borderRadius: '8px', border: 'none',
                  background: viewMode === 'timeline' ? 'linear-gradient(135deg, #e8a2a9, #db8c95)' : 'transparent',
                  color: viewMode === 'timeline' ? '#fff' : '#6b4a52',
                  fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                📅 Cronograma del Día ({dayApps.length})
              </button>
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
          ) : viewMode === 'timeline' ? (
            <div className="cronograma-container">
              {dayApps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#a07880', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  No hay citas agendadas para este día.
                </div>
              ) : (
                [...dayApps].sort((a, b) => {
                  const timeA = new Date(a.scheduled_at || a.created_at);
                  const timeB = new Date(b.scheduled_at || b.created_at);
                  return timeA - timeB;
                }).map(app => {
                  const appTime = new Date(app.scheduled_at || app.created_at);
                  const timeStr = appTime.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true });
                  const specialist = staff.find(s => s.id === app.staff_id);
                  return (
                    <div 
                      key={app.id} 
                      className="cronograma-item-card animate-fade-in"
                      onClick={() => openScheduleForAppointment(app)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="cronograma-time-badge">{timeStr}</div>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3036' }}>
                            {app.clients?.name || 'Cliente'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#a07880', fontWeight: 600 }}>
                            {app.services?.name || 'Servicio'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4a3036' }}>
                            {specialist ? specialist.name.split(' ')[0] : 'Especialista'}
                          </div>
                          <div style={{ fontSize: '0.58rem', color: '#8c767b' }}>Atendiendo</div>
                        </div>
                        <div style={{
                          padding: '4px 10px', borderRadius: '12px', fontSize: '0.6rem', fontWeight: 700,
                          background: STATUS_COLORS[app.status]?.bg || '#f3f4f6',
                          color: STATUS_COLORS[app.status]?.text || '#374151',
                          border: `1px solid ${STATUS_COLORS[app.status]?.border || '#e5e7eb'}`
                        }}>{app.status}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="agenda-accordion-list">
              {visibleStaff.map(s => {
                const window = getStaffWorkingWindow(s.id, dateKey, schedules, timeOff);
                const isExpanded = !!expandedStaff[s.id];
                
                // Verificar disponibilidad para resaltar
                let isFree = false;
                if (checkingTime != null && window.isWorking) {
                  const busySlots = getStaffBusyIntervals(s.id, dayApps);
                  const insideWorking = checkingTime >= window.startMinutes && checkingTime < window.endMinutes;
                  const isLunch = checkingTime >= 13 * 60 && checkingTime < 14 * 60;
                  const occupied = busySlots.some(b => checkingTime >= b.startMinutes && checkingTime < b.endMinutes) || isLunch;
                  isFree = insideWorking && !occupied;
                }

                const initial = (s.name || '?').charAt(0).toUpperCase();

                return (
                  <div 
                    key={s.id} 
                    className={`agenda-accordion-item ${checkingTime != null ? (isFree ? 'available-highlight animate-pulse' : 'busy-highlight') : ''}`}
                  >
                    <div 
                      className="agenda-accordion-header"
                      onClick={() => setExpandedStaff(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: checkingTime != null 
                            ? (isFree ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)' : 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)')
                            : 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: '0.75rem'
                        }}>{initial}</div>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3036' }}>{s.name}</div>
                          <div style={{ fontSize: '0.65rem', color: '#a07880', fontWeight: 600 }}>
                            {window.isWorking ? `${formatMinutes(window.startMinutes)} – ${formatMinutes(window.endMinutes)}` : 'Día libre'}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {checkingTime != null && window.isWorking && (
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700,
                            color: isFree ? '#16a34a' : '#dc2626',
                            background: isFree ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            padding: '3px 8px', borderRadius: '10px'
                          }}>
                            {isFree ? '✓ Disponible' : '❌ Ocupada'}
                          </span>
                        )}
                        <span style={{ 
                          fontSize: '0.65rem', 
                          transform: isExpanded ? 'rotate(180deg)' : 'none', 
                          transition: 'transform 0.25s', 
                          color: '#db8c95',
                          fontWeight: 'bold'
                        }}>
                          ▼
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="agenda-accordion-content animate-fade-in">
                        <div style={{ display: 'flex', gap: '15px' }}>
                          {/* Eje de Horas */}
                          <div style={{ flexShrink: 0, width: '42px', position: 'relative', height: `${GRID_HEIGHT}px` }}>
                            {HOUR_MARKS.map(m => (
                              <div key={m} style={{
                                position: 'absolute', top: `${minutesToY(m) - 6}px`, right: 0,
                                fontSize: '0.62rem', color: '#a07880', fontWeight: 600, fontVariantNumeric: 'tabular-nums'
                              }}>
                                {formatMinutes(m)}
                              </div>
                            ))}
                          </div>
                          
                          {/* Columna de la Agenda */}
                          <div style={{ flex: 1 }}>
                            <StaffDayColumn
                              staffMember={s}
                              dayAppointments={dayApps}
                              workingWindow={window}
                              isToday={isToday}
                              nowMinutes={nowMinutes}
                              onSlotClick={handleSlotClick}
                              onAppointmentClick={openScheduleForAppointment}
                              checkingTime={checkingTime}
                              multipleBookingActive={multipleBookingActive}
                              multipleBookedSlots={multipleBookedSlots}
                              onMultipleSlotToggle={handleMultipleSlotToggle}
                              compact
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Summary + Specialists + Notes */}
        <div className="agenda-sidebar-right" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* POPULAR DETALLE DE CITA SI HAY SELECCIONADA (Fase 2 Visual) */}
          {selectedDetailedApp && (
            <div className="agenda-glass-card animate-fade-in" style={{ padding: '16px', border: '1.5px solid #db8c95', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(223,178,140,0.25)', paddingBottom: '8px' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3036', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📅</span> Detalle de la Cita
                </h4>
                <button 
                  onClick={() => setSelectedDetailedApp(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#db8c95', fontWeight: 700, fontSize: '1.1rem', padding: '0 4px', lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8c767b', fontWeight: 500 }}>Cliente:</span>
                  <span style={{ fontWeight: 700, color: '#4a3036' }}>{selectedDetailedApp.clients?.name || 'Cliente'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8c767b', fontWeight: 500 }}>Teléfono:</span>
                  <span style={{ fontWeight: 600, color: '#db8c95' }}>{selectedDetailedApp.clients?.phone || 'Sin número'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8c767b', fontWeight: 500 }}>Servicio:</span>
                  <span style={{ fontWeight: 700, color: '#4a3036' }}>{selectedDetailedApp.services?.name || 'Servicio'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8c767b', fontWeight: 500 }}>Especialista:</span>
                  <span style={{ fontWeight: 600, color: '#4a3036' }}>{staff.find(s => s.id === selectedDetailedApp.staff_id)?.name || 'Especialista'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8c767b', fontWeight: 500 }}>Hora:</span>
                  <span style={{ fontWeight: 700, color: '#a0506a' }}>
                    {new Date(selectedDetailedApp.scheduled_at || selectedDetailedApp.created_at).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#8c767b', fontWeight: 500 }}>Estado:</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '12px', fontSize: '0.62rem', fontWeight: 700,
                    background: STATUS_COLORS[selectedDetailedApp.status]?.bg || '#f3f4f6',
                    color: STATUS_COLORS[selectedDetailedApp.status]?.text || '#374151',
                    border: `1px solid ${STATUS_COLORS[selectedDetailedApp.status]?.border || '#e5e7eb'}`
                  }}>{selectedDetailedApp.status}</span>
                </div>
                
                {selectedDetailedApp.notes && (
                  <div style={{ marginTop: '4px', background: 'rgba(232, 162, 169, 0.05)', padding: '6px 10px', borderRadius: '8px', borderLeft: '2px solid #db8c95' }}>
                    <span style={{ fontWeight: 700, color: '#6b4a52', display: 'block', fontSize: '0.62rem', marginBottom: '2px' }}>Notas:</span>
                    <span style={{ color: '#4a3036', fontStyle: 'italic', fontSize: '0.65rem' }}>"{selectedDetailedApp.notes}"</span>
                  </div>
                )}

                {/* Acciones de la Cita */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px' }}>
                  <button 
                    onClick={() => {
                      showToast?.('Abrir editor para esta cita (Fase 2)', 'info');
                      setSelectedDetailedApp(null);
                    }}
                    style={{
                      padding: '8px 4px', borderRadius: '8px', border: '1px solid rgba(223, 178, 140, 0.4)',
                      background: '#fff', color: '#6b4a52', fontWeight: 600, cursor: 'pointer', fontSize: '0.65rem',
                      transition: 'all 0.15s'
                    }}
                    className="btn-hover-scale"
                  >
                    ✏️ Editar Cita
                  </button>
                  <button 
                    onClick={() => {
                      showToast?.('Cita completada con éxito', 'success');
                      setSelectedDetailedApp(null);
                    }}
                    style={{
                      padding: '8px 4px', borderRadius: '8px', border: 'none',
                      background: 'linear-gradient(135deg, #4ade80, #22c55e)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.65rem',
                      transition: 'all 0.15s'
                    }}
                    className="btn-hover-scale"
                  >
                    ✓ Completar
                  </button>
                  <button 
                    onClick={() => {
                      const motivo = prompt('Por favor, indica el motivo de la cancelación:');
                      if (motivo !== null) {
                        showToast?.(`Cita cancelada. Motivo: ${motivo || 'No indicado'}`, 'error');
                        setSelectedDetailedApp(null);
                      }
                    }}
                    style={{
                      padding: '8px 4px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)',
                      background: 'rgba(239, 68, 68, 0.05)', color: '#dc2626', fontWeight: 600, cursor: 'pointer', fontSize: '0.65rem',
                      transition: 'all 0.15s'
                    }}
                    className="btn-hover-scale"
                  >
                    ❌ Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      showToast?.('Cita marcada como No-show (inasistencia)', 'warning');
                      setSelectedDetailedApp(null);
                    }}
                    style={{
                      padding: '8px 4px', borderRadius: '8px', border: '1px solid rgba(217, 119, 6, 0.3)',
                      background: 'rgba(217, 119, 6, 0.05)', color: '#d97706', fontWeight: 600, cursor: 'pointer', fontSize: '0.65rem',
                      transition: 'all 0.15s'
                    }}
                    className="btn-hover-scale"
                  >
                    ⚠️ No-show
                  </button>
                </div>
              </div>
            </div>
          )}

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
