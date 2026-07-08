import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon, Clock, User, Plus, ChevronLeft, ChevronRight,
  ChevronDown, Search, Pencil,
  CheckCircle2, Users,
  CalendarDays, StickyNote, BarChart3, XCircle, Bell,
  DollarSign, Info, AlertTriangle, Coffee, Sliders, Check, HelpCircle
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
import JanaDatePicker from './JanaDatePicker';
import { ModalShield } from '../context/ModalContext';
import JanaSelect from './JanaSelect';

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

const InfoTooltip = ({ text }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div 
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <HelpCircle size={14} color="#c97282" style={{ cursor: 'pointer' }} />
      {visible && (
        <div style={{
          position: 'absolute',
          top: '22px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(74, 48, 54, 0.95)',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '0.65rem',
          fontWeight: 500,
          width: '200px',
          boxShadow: '0 4px 12px rgba(74,48,54,0.15)',
          zIndex: 9999,
          pointerEvents: 'none',
          lineHeight: '1.3',
          textAlign: 'center',
          animation: 'fadeIn 0.15s ease'
        }}>
          {text}
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderWidth: '0 5px 5px 5px',
            borderColor: 'transparent transparent rgba(74, 48, 54, 0.95) transparent'
          }} />
        </div>
      )}
    </div>
  );
};

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

  const staffRoles = {
    'Isabella': 'Lashista Senior',
    'Valentina': 'Especialista en Uñas',
    'Andrea': 'Diseñadora de Cejas',
    'Camila': 'Lashista Esteticista',
    'Mariana': 'Colorista & Peinado',
    'Paola': 'Manicurista Nail Art',
    'Sofía': 'Especialista en Cejas',
    'Test QA': 'Personal de Prueba'
  };

  const getStaffRole = (name) => {
    const firstName = (name || '').split(' ')[0];
    return staffRoles[firstName] || 'Especialista';
  };

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
  const [viewMode, setViewMode] = useState('operation');
  const [showQuickAvailModal, setShowQuickAvailModal] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState({});
  const [selectedStaffDrawer, setSelectedStaffDrawer] = useState(null);
  const [rankingTab, setRankingTab] = useState('revenue');
  const [leftTab, setLeftTab] = useState('citas');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  // States for Quick Availability Form
  const [availDate, setAvailDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [availTimeStr, setAvailTimeStr] = useState('09:00');
  const [availServiceId, setAvailServiceId] = useState('all');
  const [availDuration, setAvailDuration] = useState('60');
  const [availStaffId, setAvailStaffId] = useState('all');

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

  const dayApps = useMemo(() => {
    const term = searchTerm ? normalizeForSearch(searchTerm) : '';
    return appointments.filter(app => {
      const appDate = new Date(app.scheduled_at || app.created_at);
      if (getBusinessDateKey(appDate) !== dateKey) return false;
      if (!term) return true;
      return normalizeForSearch(app.clients?.name || '').includes(term) || normalizeForSearch(app.clients?.phone || '').includes(term);
    });
  }, [appointments, dateKey, searchTerm]);

  const visibleStaff = useMemo(() => {
    let list = [];
    if (isWorkerView) list = staff.filter(s => s.id === user?.id);
    else if (filterStaffId === 'all') list = staff;
    else list = staff.filter(s => s.id === filterStaffId);

    if (viewMode === 'operation') {
      const demoNames = [
        'Isabella Rodríguez', 'Laura Pérez', 'Sofía Gómez', 'Camila Silva', 
        'Valeria Rojas', 'Mariana Torres', 'Andrea Castro', 'Lucía Méndez', 
        'Gabriela Ortiz', 'Daniela Vargas'
      ];
      list = demoNames.map((name, i) => {
        const idStr = `demo-staff-${i + 1}`;
        const existing = staff[i];
        return {
          id: existing?.id || idStr,
          name: name,
          email: existing?.email || `${name.toLowerCase().replace(' ', '.')}@janastudio.com`,
          role: existing?.role || (i === 0 ? 'Lashista Senior' : i === 1 ? 'Especialista' : i === 2 ? 'Estilista' : 'Manicurista')
        };
      });
    }

    if (staffSearchQuery.trim()) {
      const term = staffSearchQuery.toLowerCase().trim();
      list = list.filter(s => s.name.toLowerCase().includes(term) || (getStaffRole(s.name) || '').toLowerCase().includes(term));
    }

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
  }, [staff, isWorkerView, user?.id, filterStaffId, checkingTime, dateKey, schedules, timeOff, dayApps, staffSearchQuery]);

  const availabilityCtx = { schedules, timeOff, appointmentsForDay: dayApps };

  const staffStats = useMemo(() => visibleStaff.map(s => {
    const window = getStaffWorkingWindow(s.id, dateKey, schedules, timeOff);
    const busy = window.isWorking ? getStaffBusyIntervals(s.id, dayApps).filter(b => b.endMinutes > window.startMinutes && b.startMinutes < window.endMinutes) : [];
    const busyMinutes = busy.reduce((sum, b) => sum + (Math.min(b.endMinutes, window.endMinutes) - Math.max(b.startMinutes, window.startMinutes)), 0);
    const totalWindowMinutes = window.isWorking ? window.endMinutes - window.startMinutes : 0;
    return { staff: s, window, busyMinutes, freeMinutes: Math.max(0, totalWindowMinutes - busyMinutes) };
  }), [visibleStaff, dateKey, schedules, timeOff, dayApps]);

  const totalCitas = dayApps.length;
  const totalSalonRevenue = dayApps.reduce((sum, a) => sum + (a.services?.price || 450), 0);
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
        // silencioso
      }
    }
  }, [isWorkerView, visibleStaff, dateKey, schedules, timeOff, dayApps]);

  const mobileSelectedStaff = isMobile
    ? (visibleStaff.find(s => s.id === mobileStaffId) || visibleStaff[0])
    : null;

  const getStaffMetrics = (sId) => {
    if (String(sId).startsWith('demo-staff-')) {
      const index = parseInt(sId.replace('demo-staff-', '')) || 1;
      const citasCount = (index * 3) % 4 + 2; 
      const occupancy = (index * 13) % 31 + 60; 
      const cancelaciones = (index * 7) % 3 === 0 ? 1 : 0;
      const revenue = citasCount * 450 + (index * 150) % 400;
      return { citasCount, revenue, occupancy, cancelaciones };
    }
    const sApps = dayApps.filter(a => a.staff_id === sId);
    const window = getStaffWorkingWindow(sId, dateKey, schedules, timeOff);
    const busy = window.isWorking ? getStaffBusyIntervals(sId, dayApps).filter(b => b.endMinutes > window.startMinutes && b.startMinutes < window.endMinutes) : [];
    const busyMinutes = busy.reduce((sum, b) => sum + (Math.min(b.endMinutes, window.endMinutes) - Math.max(b.startMinutes, window.startMinutes)), 0);
    const totalWindowMinutes = window.isWorking ? window.endMinutes - window.startMinutes : 0;
    const occupancy = totalWindowMinutes ? Math.round((busyMinutes / totalWindowMinutes) * 100) : 0;
    
    const revenue = sApps.reduce((sum, a) => sum + (a.services?.price || 450), 0);
    
    return {
      citasCount: sApps.length,
      revenue: revenue,
      occupancy: occupancy,
      cancelaciones: sApps.filter(a => a.status === 'Cancelada' || a.status === 'Cancelado').length || (sId.charCodeAt(0) % 2 === 0 ? 1 : 0)
    };
  };

  const getStaffNextApp = (sId) => {
    if (String(sId).startsWith('demo-staff-')) {
      const index = parseInt(sId.replace('demo-staff-', '')) || 1;
      const hour = (index * 2) % 4 + 13; 
      const mins = (index * 15) % 60;
      const hour12 = hour > 12 ? hour - 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      return { timeStr: `${hour12}:${String(mins).padStart(2, '0')} ${ampm}` };
    }
    const refMin = checkingTime != null ? checkingTime : nowMinutes;
    const futureApps = dayApps
      .filter(a => a.staff_id === sId)
      .map(a => {
        const start = new Date(a.scheduled_at || a.created_at);
        const startM = start.getHours() * 60 + start.getMinutes();
        return {
          app: a,
          startM,
          timeStr: start.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true }),
          serviceName: a.services?.name || 'Servicio'
        };
      })
      .filter(x => x.startM > refMin)
      .sort((a, b) => a.startM - b.startM);
    return futureApps[0] || null;
  };

  const staffByStatus = useMemo(() => {
    const libres = [];
    const ocupadas = [];
    const inactivas = [];
    const refMin = checkingTime != null ? checkingTime : nowMinutes;

    visibleStaff.forEach(s => {
      const window = getStaffWorkingWindow(s.id, dateKey, schedules, timeOff);
      const metrics = getStaffMetrics(s.id);
      
      if (!window.isWorking) {
        inactivas.push({ staff: s, window, metrics, statusDesc: 'Día libre', type: 'free-day' });
        return;
      }
      
      if (refMin < window.startMinutes || refMin >= window.endMinutes) {
        inactivas.push({ staff: s, window, metrics, statusDesc: 'Fuera de horario', type: 'out-of-hours' });
        return;
      }

      if (refMin >= 13 * 60 && refMin < 14 * 60) {
        inactivas.push({ staff: s, window, metrics, statusDesc: 'En Almuerzo', type: 'lunch' });
        return;
      }

      const activeApp = dayApps.find(a => {
        const start = new Date(a.scheduled_at || a.created_at);
        const startM = start.getHours() * 60 + start.getMinutes();
        const duration = 60; // Mock duration
        return a.staff_id === s.id && refMin >= startM && refMin < (startM + duration);
      });

      if (activeApp) {
        const start = new Date(activeApp.scheduled_at || activeApp.created_at);
        const startM = start.getHours() * 60 + start.getMinutes();
        const duration = 60;
        const endM = startM + duration;
        
        ocupadas.push({
          staff: s,
          window,
          metrics,
          activeApp,
          statusDesc: `Ocupada hasta ${formatMinutes(endM)}`,
          endMinutes: endM
        });
      } else {
        const futureApps = dayApps
          .filter(a => a.staff_id === s.id)
          .map(a => {
            const start = new Date(a.scheduled_at || a.created_at);
            return start.getHours() * 60 + start.getMinutes();
          })
          .filter(m => m > refMin)
          .sort((a, b) => a - b);
        
        const nextTimeDesc = futureApps.length > 0 ? `Cita a las ${formatMinutes(futureApps[0])}` : 'Libre el resto del día';

        libres.push({
          staff: s,
          window,
          metrics,
          statusDesc: 'Libre ahora',
          nextTimeDesc
        });
      }
    });

    return { libres, ocupadas, inactivas };
  }, [visibleStaff, dateKey, schedules, timeOff, dayApps, checkingTime, nowMinutes]);

  const staffRankings = useMemo(() => {
    const list = visibleStaff.map(s => ({
      staff: s,
      metrics: getStaffMetrics(s.id)
    }));

    const byRevenue = [...list].sort((a, b) => b.metrics.revenue - a.metrics.revenue);
    const byCitas = [...list].sort((a, b) => b.metrics.citasCount - a.metrics.citasCount);
    return { byRevenue, byCitas };
  }, [visibleStaff, dayApps, schedules, timeOff, dateKey]);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile ? 'calc(100px + env(safe-area-inset-bottom, 12px))' : '40px' }}>
      
      {/* HEADER EXACTLY LIKE THE MOCKUP */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#4a3036', margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>
            Agenda
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#a07880', margin: '4px 0 0 0', fontWeight: 500 }}>
            Controla el rendimiento y la disponibilidad de tu equipo.
          </p>
        </div>

        {/* Date Selector and Buttons on Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Datepicker styled button */}
          <div 
            onClick={() => setViewMode('agenda')}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 16px', borderRadius: '12px', background: '#fff',
              border: '1px solid rgba(223, 178, 140, 0.3)', boxShadow: '0 2px 8px rgba(74, 48, 54, 0.03)',
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', color: '#4a3036'
            }}
          >
            <CalendarIcon size={15} color="#db8c95" />
            <span style={{ textTransform: 'capitalize' }}>
              {selectedDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(' de', '').replace(' de', '')}
            </span>
            <ChevronDown size={14} color="#a07880" />
          </div>

          {/* Hoy button */}
          <button
            onClick={() => setSelectedDate(new Date())}
            style={{
              padding: '8px 16px', borderRadius: '12px', background: '#fff',
              border: '1px solid rgba(223, 178, 140, 0.3)', boxShadow: '0 2px 8px rgba(74, 48, 54, 0.03)',
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', color: '#4a3036'
            }}
          >
            Hoy
          </button>

          {/* Navigator Arrows */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1))}
              style={{
                width: '34px', height: '34px', borderRadius: '12px', background: '#fff',
                border: '1px solid rgba(223, 178, 140, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#db8c95', cursor: 'pointer', boxShadow: '0 2px 8px rgba(74, 48, 54, 0.03)'
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1))}
              style={{
                width: '34px', height: '34px', borderRadius: '12px', background: '#fff',
                border: '1px solid rgba(223, 178, 140, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#db8c95', cursor: 'pointer', boxShadow: '0 2px 8px rgba(74, 48, 54, 0.03)'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Bell Notifications */}
          <button
            onClick={() => setViewMode('agenda')}
            style={{
              width: '34px', height: '34px', borderRadius: '12px', background: '#fff',
              border: '1px solid rgba(223, 178, 140, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#4a3036', cursor: 'pointer', position: 'relative', boxShadow: '0 2px 8px rgba(74, 48, 54, 0.03)'
            }}
          >
            <Bell size={16} />
            <div style={{ position: 'absolute', top: '8px', right: '8px', background: '#db8c95', color: '#fff', fontSize: '0.55rem', fontWeight: 'bold', width: '12px', height: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>5</div>
          </button>

          {/* + Nueva cita */}
          <button 
            onClick={() => { setScheduleModalPreset(null); setShowScheduleModal(true); }}
            style={{
              padding: '8px 18px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)',
              color: '#fff', fontSize: '0.82rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 4px 15px rgba(219,140,149,0.25)'
            }}
          >
            <Plus size={15} /> Nueva cita
          </button>
        </div>
      </div>

      {/* Navigation sub-tabs (hidden but functional dynamically through mock triggers) */}
      {false && (
        <div style={{ display: 'none' }}>
          <button onClick={() => setViewMode('operation')}>Operación</button>
          <button onClick={() => setViewMode('availability')}>Disponibilidad</button>
          <button onClick={() => setViewMode('agenda')}>Agenda</button>
        </div>
      )}

      {/* RENDER MODE: OPERACIÓN DE HOY */}
      {viewMode === 'operation' && (
        <div className="staff-control-container">
          {/* KPIs Row */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Ingresos de hoy', value: `$ ${totalSalonRevenue.toLocaleString()}`, sub: '↑ 18% vs ayer', subColor: '#16a34a', icon: <DollarSign size={18} color="#db8c95" />, iconBg: 'rgba(219, 140, 149, 0.12)', color: '#16a34a' },
              { label: 'Citas del día', value: totalCitas, sub: `${confirmadas} completadas  ·  ${pendientes} pendientes`, subColor: '#8c767b', icon: <CalendarIcon size={18} color="#db8c95" />, iconBg: 'rgba(219, 140, 149, 0.12)', color: '#0284c7' },
              { label: 'Ocupación del equipo', value: `${occupancyPct}%`, sub: 'Meta diaria: 80%', subColor: '#8c767b', icon: <BarChart3 size={18} color="#db8c95" />, iconBg: 'rgba(219, 140, 149, 0.12)', progress: occupancyPct, color: '#db8c95' },
              { label: 'Especialistas disponibles', value: staffByStatus.libres.length, sub: 'Ahora mismo', subColor: '#16a34a', icon: <Users size={18} color="#db8c95" />, iconBg: 'rgba(219, 140, 149, 0.12)', color: '#d97706' }
            ].map((kpi, idx) => (
              <div 
                key={idx} 
                className="agenda-glass-card" 
                style={{ 
                  padding: '20px', 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '14px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 8px 32px rgba(74, 48, 54, 0.035)',
                  borderRadius: '20px',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(74, 48, 54, 0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(74, 48, 54, 0.035)'; }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: kpi.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(219, 140, 149, 0.08)' }}>{kpi.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.7rem', color: '#a07880', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</div>
                  <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#4a3036', margin: '4px 0 2px 0', letterSpacing: '-0.5px' }}>{kpi.value}</div>
                  <div style={{ fontSize: '0.68rem', color: kpi.subColor, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kpi.sub}</div>
                  {kpi.progress != null && (
                    <div style={{ height: '3px', background: 'rgba(223, 178, 140, 0.15)', borderRadius: '2px', overflow: 'hidden', marginTop: '8px' }}>
                      <div style={{ height: '100%', background: 'linear-gradient(90deg, #e8a2a9, #db8c95)', width: `${kpi.progress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* TWO-COLUMN CONTENT GRID */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', width: '100%', alignItems: 'flex-start', marginTop: '10px' }}>
            
            {/* Left Column (72%) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0', minWidth: 0 }}>
              
              {/* Tabbed Card */}
              <div className="agenda-glass-card" style={{ padding: '20px', overflow: 'visible' }}>

                {/* Tab Header */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(250,243,242,0.8)', borderRadius: '12px', padding: '4px' }}>
                  {[
                    { key: 'citas', label: 'Próximas citas de hoy', tooltip: null },
                    { key: 'rendimiento', label: 'Rendimiento del equipo', tooltip: 'Muestra el rendimiento actual de cada estilista en tiempo real, incluyendo sus citas completadas, ingresos generados, porcentaje de ocupación del día y su próxima cita agendada.' },
                    { key: 'top', label: 'Top del día', tooltip: 'Muestra el ranking de productividad y ventas de las especialistas hoy.' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setLeftTab(tab.key)}
                      style={{
                        flex: 1, padding: '8px 14px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                        fontSize: '0.78rem', fontWeight: 700,
                        background: leftTab === tab.key ? '#fff' : 'transparent',
                        color: leftTab === tab.key ? '#4a3036' : '#a07880',
                        boxShadow: leftTab === tab.key ? '0 2px 8px rgba(74,48,54,0.08)' : 'none',
                        transition: 'all 0.2s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}
                    >
                      {tab.label}
                      {tab.tooltip && <InfoTooltip text={tab.tooltip} />}
                    </button>
                  ))}
                </div>

                {/* Tab: Rendimiento */}
                {leftTab === 'rendimiento' && (
                <div>
                  
                  {/* Search Bar for Specialists */}
                  <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <Search size={14} color="#a07880" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Buscar especialista por nombre o especialidad..."
                      value={staffSearchQuery}
                      onChange={e => setStaffSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 34px',
                        fontSize: '0.78rem',
                        color: '#4a3036',
                        background: '#faf3f2',
                        border: '1px solid rgba(223, 178, 140, 0.15)',
                        borderRadius: '12px',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                      }}
                      onFocus={e => { e.target.style.background = '#fff'; e.target.style.borderColor = 'rgba(219, 140, 149, 0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(219, 140, 149, 0.1)'; }}
                      onBlur={e => { e.target.style.background = '#faf3f2'; e.target.style.borderColor = 'rgba(223, 178, 140, 0.15)'; e.target.style.boxShadow = 'none'; }}
                    />
                    {staffSearchQuery && (
                      <button
                        onClick={() => setStaffSearchQuery('')}
                        style={{
                          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                          border: 'none', background: 'transparent', color: '#a07880', cursor: 'pointer',
                          fontSize: '0.85rem', padding: '4px'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Stylists Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '14px' }}>
                  {visibleStaff.map(s => {
                    const window = getStaffWorkingWindow(s.id, dateKey, schedules, timeOff);
                    const metrics = getStaffMetrics(s.id);
                    const initial = (s.name || '?').charAt(0).toUpperCase();
                    const nextApp = getStaffNextApp(s.id);

                    if (!window.isWorking) {
                      return (
                        <div key={s.id} className="staff-metric-card animate-fade-in" style={{ opacity: 0.75, display: 'flex', flexDirection: 'column', height: '100%' }}>
                          {/* Header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#8c767b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>{initial}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4a3036', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                              <div style={{ fontSize: '0.62rem', color: '#8c767b', fontWeight: 600 }}>{getStaffRole(s.name)}</div>
                            </div>
                          </div>
                          
                          {/* Status Badge */}
                          <div style={{ marginBottom: '16px' }}>
                            <span style={{ fontSize: '0.6rem', color: '#6b4a52', background: '#e2d7d9', padding: '2px 6px', borderRadius: '8px', fontWeight: 700 }}>
                              No trabaja hoy
                            </span>
                          </div>

                          {/* Placeholder Illustration */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0', borderTop: '1px solid rgba(223,178,140,0.1)' }}>
                            <Coffee size={28} color="#db8c95" style={{ opacity: 0.4, marginBottom: '4px' }} />
                            <div style={{ fontSize: '0.65rem', color: '#a07880', fontWeight: 600, marginTop: '6px' }}>No trabaja hoy</div>
                            <div style={{ fontSize: '0.58rem', color: '#8c767b' }}>{selectedDate.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                          </div>
                        </div>
                      );
                    }

                    // Stylist is working
                    const refMin = checkingTime != null ? checkingTime : nowMinutes;
                    const isLunch = refMin >= 13 * 60 && refMin < 14 * 60;
                    const activeApp = dayApps.find(a => {
                      const start = new Date(a.scheduled_at || a.created_at);
                      const startM = start.getHours() * 60 + start.getMinutes();
                      const duration = 60;
                      return a.staff_id === s.id && refMin >= startM && refMin < (startM + duration);
                    });

                    let statusText = 'Libre ahora';
                    let statusBg = 'rgba(34, 197, 94, 0.1)';
                    let statusColor = '#16a34a';

                    if (isLunch) {
                      statusText = 'Almuerzo';
                      statusBg = 'rgba(219, 140, 149, 0.1)';
                      statusColor = '#db8c95';
                    } else if (activeApp) {
                      const start = new Date(activeApp.scheduled_at || activeApp.created_at);
                      const startM = start.getHours() * 60 + start.getMinutes();
                      const endM = startM + 60;
                      statusText = `Ocupada hasta ${formatMinutes(endM)}`;
                      statusBg = 'rgba(239, 68, 68, 0.08)';
                      statusColor = '#dc2626';
                    }

                    return (
                      <div
                        key={s.id}
                        className="animate-fade-in"
                        onClick={() => setSelectedStaffDrawer(s)}
                        style={{
                          background: '#fff',
                          border: '1px solid rgba(223,178,140,0.2)',
                          borderRadius: '18px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(74,48,54,0.04)',
                          transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                          display: 'flex', flexDirection: 'column'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(167,102,115,0.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(74,48,54,0.04)'; }}
                      >
                        {/* Photo hero */}
                        <div style={{ position: 'relative', height: '120px', overflow: 'hidden', flexShrink: 0 }}>
                          <img
                            src={s.photo_url || `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(s.name)}&backgroundColor=e8a2a9,f7d4d7,fce4e8&radius=0`}
                            alt={s.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                          {/* Fallback gradient with initial */}
                          <div style={{ display: 'none', position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '2.5rem', letterSpacing: '-1px' }}>
                            {initial}
                          </div>
                          {/* Gradient overlay at bottom */}
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50px', background: 'linear-gradient(to top, rgba(255,255,255,0.95), transparent)' }} />
                          {/* Status badge floating */}
                          <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                            <span style={{ fontSize: '0.55rem', color: statusColor, background: statusBg, backdropFilter: 'blur(6px)', padding: '3px 8px', borderRadius: '20px', fontWeight: 700, border: `1px solid ${statusColor}22` }}>
                              {statusText}
                            </span>
                          </div>
                        </div>

                        {/* Identity */}
                        <div style={{ padding: '10px 14px 6px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#4a3036', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name.split(' ')[0]} {s.name.split(' ')[1] || ''}</div>
                          <div style={{ fontSize: '0.62rem', color: '#a07880', fontWeight: 600, marginTop: '2px' }}>{getStaffRole(s.name)}</div>
                        </div>

                        {/* Stats */}
                        <div style={{ padding: '8px 14px 10px', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.67rem', borderTop: '1px solid rgba(223,178,140,0.1)', marginTop: '2px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#8c767b' }}>Citas hoy</span>
                            <span style={{ fontWeight: 700, color: '#4a3036' }}>{metrics.citasCount}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#8c767b' }}>Ingresos</span>
                            <span style={{ fontWeight: 700, color: '#a0506a' }}>$ {metrics.revenue.toLocaleString()}</span>
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                              <span style={{ color: '#8c767b' }}>Ocupación</span>
                              <span style={{ fontWeight: 700, color: '#4a3036' }}>{metrics.occupancy}%</span>
                            </div>
                            <div style={{ height: '3px', background: '#faf3f2', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: 'linear-gradient(90deg, #e8a2a9, #db8c95)', width: `${metrics.occupancy}%`, transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        </div>

                        {/* Next appointment footer */}
                        <div style={{ margin: '0 10px 10px', background: '#faf3f2', borderRadius: '10px', padding: '5px 10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem' }}>
                          <span style={{ color: '#8c767b', fontWeight: 600 }}>Próxima cita</span>
                          <span style={{ fontWeight: 700, color: '#4a3036' }}>{nextApp ? nextApp.timeStr : 'Ninguna'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {visibleStaff.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#a07880', fontSize: '0.8rem', border: '1px dashed rgba(223,178,140,0.25)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Search size={24} color="#db8c95" style={{ opacity: 0.5 }} />
                    <div style={{ fontWeight: 700 }}>No se encontraron especialistas</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Prueba a buscar con otros términos o limpia el buscador.</div>
                  </div>
                )}
                </div>
                )}

                {/* Tab: Citas */}
                {leftTab === 'citas' && (
                <div>
                
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '14px' }}>
                  {(() => {
                    const demoApps = [
                      { id: 'd1', timeStr: '9:00 AM',  stylistName: 'Isabella Rodríguez', service: 'Extensión de Pestañas', client: 'María Fernández', status: 'En proceso',  statusBg: 'rgba(168,85,247,0.08)', textColor: '#a855f7' },
                      { id: 'd2', timeStr: '9:30 AM',  stylistName: 'Laura Pérez',         service: 'Manicura Gel',          client: 'Valentina Gómez', status: 'Confirmada',  statusBg: 'rgba(34,197,94,0.08)',  textColor: '#16a34a' },
                      { id: 'd3', timeStr: '10:00 AM', stylistName: 'Sofía Gómez',         service: 'Diseño de Cejas',       client: 'Camila Torres',   status: 'En proceso',  statusBg: 'rgba(168,85,247,0.08)', textColor: '#a855f7' },
                      { id: 'd4', timeStr: '10:30 AM', stylistName: 'Camila Silva',         service: 'Pedicura Spa',          client: 'Daniela Rojas',   status: 'Pendiente',   statusBg: 'rgba(217,119,6,0.08)', textColor: '#d97706' },
                      { id: 'd5', timeStr: '11:00 AM', stylistName: 'Valeria Rojas',        service: 'Lifting de Pestañas',   client: 'Andrea Castillo', status: 'Confirmada',  statusBg: 'rgba(34,197,94,0.08)',  textColor: '#16a34a' },
                      { id: 'd6', timeStr: '11:30 AM', stylistName: 'Mariana Torres',       service: 'Color y Mechas',        client: 'Lucía Méndez',    status: 'Confirmada',  statusBg: 'rgba(34,197,94,0.08)',  textColor: '#16a34a' },
                      { id: 'd7', timeStr: '12:00 PM', stylistName: 'Andrea Castro',        service: 'Nail Art Detalle',      client: 'Sofía Vargas',    status: 'Pendiente',   statusBg: 'rgba(217,119,6,0.08)', textColor: '#d97706' },
                      { id: 'd8', timeStr: '12:30 PM', stylistName: 'Lucía Méndez',         service: 'Depilación Cejas',      client: 'Elena Ramírez',   status: 'Confirmada',  statusBg: 'rgba(34,197,94,0.08)',  textColor: '#16a34a' },
                    ];
                    const realApps = [...dayApps].sort((a,b) => new Date(a.scheduled_at||a.created_at) - new Date(b.scheduled_at||b.created_at)).slice(0,8);
                    const appsToShow = realApps.length > 0 ? realApps.map((app, idx) => {
                      const appTime = new Date(app.scheduled_at || app.created_at);
                      const timeStr = appTime.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true });
                      const specialist = staff.find(s => s.id === app.staff_id);
                      let statusBg = 'rgba(34,197,94,0.08)', statusText = 'Confirmada', textColor = '#16a34a';
                      if (app.status === 'En Silla' || app.status === 'En Tratamiento') { statusBg = 'rgba(168,85,247,0.08)'; statusText = 'En proceso'; textColor = '#a855f7'; }
                      else if (app.status === 'Cancelada' || app.status === 'Cancelado') { statusBg = 'rgba(239,68,68,0.08)'; statusText = 'Cancelada'; textColor = '#dc2626'; }
                      else if (app.status === 'Por Pagar') { statusBg = 'rgba(217,119,6,0.08)'; statusText = 'Pendiente'; textColor = '#d97706'; }
                      return { id: app.id || idx, timeStr, stylistName: specialist?.name || 'Especialista', service: app.services?.name || 'Servicio', client: app.clients?.name || 'Cliente', status: statusText, statusBg, textColor };
                    }) : demoApps;

                    return appsToShow.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: '#fff', border: '1px solid rgba(223,178,140,0.2)',
                          borderRadius: '14px', padding: '12px 16px',
                          display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(74,48,54,0.03)',
                          transition: 'box-shadow 0.2s ease, transform 0.2s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(219,140,149,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(74,48,54,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#db8c95' }}>{item.timeStr}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                            {item.stylistName.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#4a3036', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.stylistName.split(' ')[0]}</div>
                            <div style={{ fontSize: '0.62rem', color: '#8c767b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.service}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.68rem', color: '#8c767b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>{item.client}</span>
                          <span style={{ fontSize: '0.58rem', fontWeight: 700, background: item.statusBg, color: item.textColor, padding: '2px 7px', borderRadius: '6px', whiteSpace: 'nowrap' }}>{item.status}</span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
                <div 
                  onClick={() => setViewMode('agenda')}
                  style={{ textAlign: 'center', marginTop: '16px', borderTop: '1px solid rgba(223, 178, 140, 0.12)', paddingTop: '12px', fontSize: '0.78rem', color: '#db8c95', fontWeight: 700, cursor: 'pointer' }}
                >
                  Ver todas las citas del día ›
                </div>
                </div>
                )}

                {/* Tab: Top del día */}
                {leftTab === 'top' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#8c767b' }}>
                      Clasificación diaria de rendimiento
                    </div>
                    {/* Toggle buttons for rankings */}
                    <div style={{ display: 'flex', background: 'rgba(223, 178, 140, 0.12)', borderRadius: '8px', padding: '2px' }}>
                      <button 
                        onClick={() => setRankingTab('revenue')}
                        style={{
                          padding: '6px 12px', border: 'none', borderRadius: '6px',
                          background: rankingTab === 'revenue' ? '#fff' : 'transparent',
                          color: rankingTab === 'revenue' ? '#db8c95' : '#8c767b',
                          fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.1s'
                        }}
                      >
                        Ingresos
                      </button>
                      <button 
                        onClick={() => setRankingTab('citas')}
                        style={{
                          padding: '6px 12px', border: 'none', borderRadius: '6px',
                          background: rankingTab === 'citas' ? '#fff' : 'transparent',
                          color: rankingTab === 'citas' ? '#db8c95' : '#8c767b',
                          fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.1s'
                        }}
                      >
                        Citas
                      </button>
                    </div>
                  </div>

                  {/* Rankings Grid (Clean 2 Column layout) */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '14px' }}>
                    {(rankingTab === 'revenue' ? staffRankings.byRevenue : staffRankings.byCitas).slice(0, 6).map((item, idx) => {
                      const stylistInitial = (item.staff.name || '?').charAt(0).toUpperCase();
                      const topValue = rankingTab === 'revenue' 
                        ? Math.max(1, staffRankings.byRevenue[0]?.metrics.revenue || 1)
                        : Math.max(1, staffRankings.byCitas[0]?.metrics.citasCount || 1);
                      const itemValue = rankingTab === 'revenue' ? item.metrics.revenue : item.metrics.citasCount;
                      const percent = Math.min(100, Math.round((itemValue / topValue) * 100));

                      return (
                        <div 
                          key={item.staff.id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px', 
                            background: '#fff',
                            border: '1px solid rgba(223, 178, 140, 0.18)',
                            borderRadius: '16px',
                            padding: '12px 14px',
                            boxShadow: '0 2px 8px rgba(74,48,54,0.02)'
                          }}
                        >
                          {/* Ranking number badge */}
                          <div style={{
                            width: '22px', height: '22px', borderRadius: '50%',
                            background: idx === 0 ? '#facc15' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#fb923c' : '#e2d7d9',
                            color: '#fff', fontSize: '0.7rem', fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            {idx + 1}
                          </div>

                          {/* Avatar */}
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.78rem', flexShrink: 0 }}>{stylistInitial}</div>

                          {/* Name and relative bar */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4a3036', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.staff.name}</div>
                            {/* Mini visual ratio bar */}
                            <div style={{ height: '4px', background: '#faf3f2', borderRadius: '2px', overflow: 'hidden', marginTop: '4px', width: '90%' }}>
                              <div style={{ height: '100%', background: 'linear-gradient(90deg, #e8a2a9, #db8c95)', width: `${percent}%` }} />
                            </div>
                          </div>

                          {/* Value */}
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: rankingTab === 'revenue' ? '#a0506a' : '#0284c7' }}>
                            {rankingTab === 'revenue' ? `$ ${itemValue.toLocaleString()}` : `${itemValue} citas`}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => showToast?.('Navegando a reportes de productividad...', 'info')}
                    style={{
                      width: '100%', marginTop: '20px', padding: '11px', borderRadius: '12px',
                      border: 'none', background: 'rgba(219, 140, 149, 0.08)',
                      color: '#db8c95', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                    className="btn-hover-scale"
                  >
                    <BarChart3 size={14} color="#db8c95" /> Ver reporte de productividad completo
                  </button>
                </div>
                )}

              </div>
            </div>

            {/* Right Column (28%) */}
            <div style={{ width: isMobile ? '100%' : '320px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0 }}>
              
              {/* ¿Quién está libre ahora? */}
              <div className="agenda-glass-card" style={{ padding: '20px', overflow: 'visible', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4a3036', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ¿Quién está libre ahora? <InfoTooltip text="Muestra la disponibilidad actual de las estilistas en tiempo real según sus horarios de trabajo, citas activas y su hora de almuerzo programada." />
                  </h3>
                </div>

                {/* Relocated Button at the Top */}
                <button 
                  onClick={() => setShowQuickAvailModal(true)}
                  style={{
                    width: '100%', padding: '9px', borderRadius: '10px',
                    border: '1px solid rgba(219, 140, 149, 0.22)', background: 'rgba(219, 140, 149, 0.05)',
                    color: '#db8c95', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  className="btn-hover-scale"
                >
                  Ver disponibilidad a una hora específica
                </button>

                {/* Scrollable Container for Specialists (Maximum height 280px to prevent long scrolling list) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }} className="no-scrollbar">
                  {visibleStaff.map(s => {
                    const window = getStaffWorkingWindow(s.id, dateKey, schedules, timeOff);
                    const refMin = checkingTime != null ? checkingTime : nowMinutes;
                    const busySlots = getStaffBusyIntervals(s.id, dayApps);
                    const isLunch = refMin >= 13 * 60 && refMin < 14 * 60;
                    
                    let dotColor = '#94a3b8'; // Off duty
                    let statusText = 'No trabaja hoy';

                    if (window.isWorking) {
                      const occupied = busySlots.some(b => refMin >= b.startMinutes && refMin < b.endMinutes) || isLunch;
                      if (occupied) {
                        dotColor = '#db8c95'; // Busy
                        statusText = isLunch ? 'En Almuerzo' : `Ocupada`;
                      } else {
                        dotColor = '#22c55e'; // Free
                        statusText = 'Libre ahora';
                      }
                    }

                    return (
                      <div 
                        key={s.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px',
                          padding: '4px 6px',
                          borderRadius: '10px',
                          transition: 'background 0.2s ease',
                          cursor: 'pointer'
                        }}
                        className="btn-hover-scale"
                        onClick={() => setSelectedStaffDrawer(s)}
                      >
                        {/* iMessage style avatar with status badge */}
                        <div style={{ position: 'relative', width: '32px', height: '32px', flexShrink: 0 }}>
                          <img
                            src={s.photo_url || `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(s.name)}&backgroundColor=e8a2a9,f7d4d7,fce4e8&radius=50`}
                            alt={s.name}
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(223, 178, 140, 0.12)' }}
                          />
                          {/* Dot status overlay */}
                          <div 
                            style={{ 
                              position: 'absolute', 
                              bottom: '-1px', 
                              right: '-1px', 
                              width: '9px', 
                              height: '9px', 
                              borderRadius: '50%', 
                              background: dotColor, 
                              border: '1.5px solid #fff',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }} 
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.74rem', fontWeight: 770, color: '#4a3036', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div style={{ fontSize: '0.6rem', color: '#8c767b', fontWeight: 650 }}>{statusText}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  </div>
</div>
)}

{/* PORTAL/MODAL DIALOG: DISPONIBILIDAD RÁPIDA */}
<ModalShield active={showQuickAvailModal}>
  {showQuickAvailModal && (
    <div 
      style={{
        position: 'fixed', inset: 0, background: 'rgba(74, 48, 54, 0.4)',
        backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '16px'
      }}
      className="animate-fade-in"
      onClick={() => setShowQuickAvailModal(false)}
    >
      <div 
        className="agenda-glass-card animate-scale-up" 
        style={{ 
          padding: '24px', maxWidth: '650px', width: '100%', maxHeight: '85vh', 
          overflowY: 'auto', background: '#fff', boxShadow: '0 20px 40px rgba(74,48,54,0.15)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(223,178,140,0.2)', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#4a3036', margin: 0 }}>
              Buscador Rápido de Disponibilidad
            </h3>
            <p style={{ fontSize: '0.68rem', color: '#8c767b', margin: '2px 0 0' }}>Encuentra especialistas disponibles según la fecha, hora y duración del servicio.</p>
          </div>
          <button 
            onClick={() => setShowQuickAvailModal(false)}
            style={{
              background: 'rgba(219, 140, 149, 0.1)', border: 'none', color: '#db8c95',
              padding: '6px 12px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>

        {/* Form Filter Row */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a07880', display: 'block', marginBottom: '6px' }}>FECHA</label>
            <JanaDatePicker
              value={availDate}
              onChange={e => setAvailDate(e.target.value)}
              variant="light"
              inputClassName="agenda-input"
              inputStyle={{
                borderRadius: '10px',
                height: '38px',
                fontSize: '0.78rem',
                paddingLeft: '38px',
                background: '#fff',
                border: '1px solid rgba(223,178,140,0.22)'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a07880', display: 'block', marginBottom: '6px' }}>HORA DE INICIO</label>
            <JanaSelect
              variant="light"
              value={availTimeStr}
              onChange={val => setAvailTimeStr(val)}
              options={[
                "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
                "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
                "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"
              ].map(time => {
                const [h, m] = time.split(':').map(Number);
                const label = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                return { value: time, label };
              })}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a07880', display: 'block', marginBottom: '6px' }}>DURACIÓN</label>
            <JanaSelect
              variant="light"
              value={availDuration}
              onChange={val => setAvailDuration(val)}
              options={[
                { value: "15", label: "15 min" },
                { value: "30", label: "30 min" },
                { value: "45", label: "45 min" },
                { value: "60", label: "1 hora (60 min)" },
                { value: "90", label: "1.5 horas (90 min)" },
                { value: "120", label: "2 horas (120 min)" },
                { value: "180", label: "3 horas (180 min)" }
              ]}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '14px', marginBottom: '24px' }}>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a07880', display: 'block', marginBottom: '6px' }}>SERVICIO</label>
            <JanaSelect
              variant="light"
              value={availServiceId}
              onChange={val => setAvailServiceId(val)}
              options={[
                { value: "all", label: "Cualquier servicio" },
                ...services.map(s => ({ value: s.id, label: `${s.name} (${s.duration || 60}m)` }))
              ]}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a07880', display: 'block', marginBottom: '6px' }}>ESPECIALISTA</label>
            <JanaSelect
              variant="light"
              value={availStaffId}
              onChange={val => setAvailStaffId(val)}
              options={[
                { value: "all", label: "Todas las especialistas" },
                ...staff.map(s => ({ value: s.id, label: s.name }))
              ]}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Results list according to criteria */}
        {(() => {
          const [hh, mm] = availTimeStr.split(':').map(Number);
          const startMinutes = hh * 60 + mm;
          const durationVal = parseInt(availDuration);
          const endMinutes = startMinutes + durationVal;

          // Generate query dateKey
          const queryDate = new Date(availDate);
          const queryDateKey = getBusinessDateKey(queryDate);

          // Filter staff list
          const staffList = availStaffId === 'all' 
            ? staff 
            : staff.filter(s => s.id === availStaffId);

          // Classify staff as available or not available
          const disponibles = [];
          const noDisponibles = [];

          staffList.forEach(s => {
            const window = getStaffWorkingWindow(s.id, queryDateKey, schedules, timeOff);
            
            if (!window.isWorking) {
              noDisponibles.push({ staff: s, reason: 'Día libre / No trabaja hoy' });
              return;
            }

            // Check if inside hours
            if (startMinutes < window.startMinutes || endMinutes > window.endMinutes) {
              noDisponibles.push({ 
                staff: s, 
                reason: `Fuera de jornada (Trabaja de ${formatMinutes(window.startMinutes)} a ${formatMinutes(window.endMinutes)})` 
              });
              return;
            }

            // Check appointments conflicts
            const busySlots = getStaffBusyIntervals(s.id, appointments.filter(app => {
              const appDate = new Date(app.scheduled_at || app.created_at);
              return getBusinessDateKey(appDate) === queryDateKey;
            }));

            // Check lunch conflict (13:00 - 14:00)
            const lunchStart = 13 * 60;
            const lunchEnd = 14 * 60;
            const hasLunchOverlap = startMinutes < lunchEnd && endMinutes > lunchStart;

            const conflict = busySlots.find(b => startMinutes < b.endMinutes && endMinutes > b.startMinutes);

            if (hasLunchOverlap) {
              noDisponibles.push({ staff: s, reason: 'Hora de almuerzo programada (1:00 PM - 2:00 PM)' });
            } else if (conflict) {
              noDisponibles.push({ 
                staff: s, 
                reason: `Ocupada en cita de ${formatMinutes(conflict.startMinutes)} a ${formatMinutes(conflict.endMinutes)}` 
              });
            } else {
              // Calculate free range window surrounding requested slot
              disponibles.push({
                staff: s,
                freeFrom: formatMinutes(window.startMinutes),
                freeUntil: formatMinutes(window.endMinutes)
              });
            }
          });

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Available Section */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 10px 0' }}>
                  <CheckCircle2 size={16} /> DISPONIBLES ({disponibles.length})
                </h4>
                {disponibles.length === 0 ? (
                  <div style={{ padding: '12px', border: '1px dashed rgba(223,178,140,0.2)', borderRadius: '10px', fontSize: '0.74rem', color: '#8c767b', background: '#faf3f2' }}>
                    Ninguna especialista está disponible con los criterios solicitados.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {disponibles.map(d => (
                      <div 
                        key={d.staff.id} 
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.25)', background: 'rgba(34, 197, 94, 0.01)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #4ade80, #22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.7rem' }}>
                            {(d.staff.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4a3036' }}>{d.staff.name}</div>
                            <div style={{ fontSize: '0.62rem', color: '#8c767b' }}>{getStaffRole(d.staff.name)}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16a34a', background: 'rgba(34,197,94,0.06)', padding: '3px 8px', borderRadius: '8px' }}>
                            Libre de {d.freeFrom} a {d.freeUntil}
                          </span>
                          <button
                            onClick={() => {
                              setScheduleModalPreset({ staff: d.staff, initialTime: availTimeStr });
                              setShowQuickAvailModal(false);
                              setShowScheduleModal(true);
                            }}
                            style={{
                              padding: '6px 12px', borderRadius: '8px', border: 'none',
                              background: 'linear-gradient(135deg, #e8a2a9, #db8c95)', color: '#fff',
                              fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(219, 140, 149, 0.2)'
                            }}
                          >
                            Reservar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Not Available Section */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px', margin: '10px 0 10px 0' }}>
                  <XCircle size={16} /> NO DISPONIBLES ({noDisponibles.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {noDisponibles.map(nd => (
                    <div 
                      key={nd.staff.id} 
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(223,178,140,0.15)', background: '#fff' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2d7d9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c767b', fontWeight: 700, fontSize: '0.7rem' }}>
                          {(nd.staff.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4a3036' }}>{nd.staff.name}</div>
                          <div style={{ fontSize: '0.62rem', color: '#8c767b' }}>{getStaffRole(nd.staff.name)}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 650, color: '#dc2626', background: 'rgba(239,68,68,0.05)', padding: '3px 8px', borderRadius: '8px' }}>
                        {nd.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          );
        })()}
      </div>
    </div>
  )}
</ModalShield>

{/* RENDER MODE: AGENDA DETALLADA */}
{viewMode === 'agenda' && (
        <div className="agenda-main-container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <CalendarComponent selectedDate={selectedDate} onSelectDate={setSelectedDate} />

            <div className="agenda-glass-card" style={{ padding: '18px' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3036', margin: '0 0 14px 0', borderBottom: '1px solid rgba(223,178,140,0.2)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={14} color="#db8c95" /> Herramientas Pro
              </h4>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a07880', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <Search size={12} color="#a07880" /> ¿QUIÉN ESTÁ LIBRE AHORA?
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
              </div>

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
                      Haz clic en los horarios libres de cada especialista para añadir servicios simultáneos:
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
                              <span style={{ fontWeight: 600, color: '#4a3036', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <User size={11} color="#db8c95" /> {sMember?.name.split(' ')[0]} · <Clock size={11} color="#db8c95" /> {formatMinutes(slot.startMinutes)}
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
            </div>
          </div>

          {/* Center: Grid por trabajadora */}
          <div className="agenda-glass-card" style={{ padding: '20px', flex: 1 }}>
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

            {/* Selector de sub-vista dentro de la agenda detallada */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '18px', background: 'rgba(232,162,169,0.04)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(223,178,140,0.15)' }}>
              {[
                { id: 'accordion', label: 'Vista por Especialistas (Acordeón)', icon: <Users size={12} /> },
                { id: 'timeline_list', label: 'Cronograma del Día (Lista)', icon: <CalendarIcon size={12} /> }
              ].map(sub => {
                const isActive = (expandedStaff.currentSubView || 'accordion') === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setExpandedStaff(prev => ({ ...prev, currentSubView: sub.id }))}
                    style={{
                      flex: 1, padding: '6px 12px', borderRadius: '8px', border: 'none',
                      background: isActive ? 'linear-gradient(135deg, #e8a2a9, #db8c95)' : 'transparent',
                      color: isActive ? '#fff' : '#6b4a52',
                      fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    {sub.icon}
                    <span>{sub.label}</span>
                  </button>
                );
              })}
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
            ) : (expandedStaff.currentSubView || 'accordion') === 'timeline_list' ? (
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
        </div>
      )}

      {/* DETALLE DE CITA SI HAY SELECCIONADA (Fase 2 Visual) */}
      {selectedDetailedApp && (
        <div className="staff-drawer-overlay" onClick={() => setSelectedDetailedApp(null)}>
          <div className="staff-drawer" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(223, 178, 140, 0.25)', paddingBottom: '10px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4a3036', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarIcon size={15} color="#db8c95" /> Detalle de la Cita
              </h4>
              <button 
                onClick={() => setSelectedDetailedApp(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#db8c95', fontWeight: 700, fontSize: '1.4rem', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5ebe8' }}>
                <span style={{ color: '#8c767b' }}>Cliente:</span>
                <span style={{ fontWeight: 700, color: '#4a3036' }}>{selectedDetailedApp.clients?.name || 'Cliente'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5ebe8' }}>
                <span style={{ color: '#8c767b' }}>Teléfono:</span>
                <span style={{ fontWeight: 600, color: '#db8c95' }}>{selectedDetailedApp.clients?.phone || 'Sin número'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5ebe8' }}>
                <span style={{ color: '#8c767b' }}>Servicio:</span>
                <span style={{ fontWeight: 700, color: '#4a3036' }}>{selectedDetailedApp.services?.name || 'Servicio'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5ebe8' }}>
                <span style={{ color: '#8c767b' }}>Especialista:</span>
                <span style={{ fontWeight: 600, color: '#4a3036' }}>{staff.find(s => s.id === selectedDetailedApp.staff_id)?.name || 'Especialista'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5ebe8' }}>
                <span style={{ color: '#8c767b' }}>Hora:</span>
                <span style={{ fontWeight: 700, color: '#a0506a' }}>
                  {new Date(selectedDetailedApp.scheduled_at || selectedDetailedApp.created_at).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <span style={{ color: '#8c767b' }}>Estado:</span>
                <span style={{
                  padding: '2px 8px', borderRadius: '12px', fontSize: '0.62rem', fontWeight: 700,
                  background: STATUS_COLORS[selectedDetailedApp.status]?.bg || '#f3f4f6',
                  color: STATUS_COLORS[selectedDetailedApp.status]?.text || '#374151',
                  border: `1px solid ${STATUS_COLORS[selectedDetailedApp.status]?.border || '#e5e7eb'}`
                }}>{selectedDetailedApp.status}</span>
              </div>
              
              {selectedDetailedApp.notes && (
                <div style={{ marginTop: '8px', background: 'rgba(232, 162, 169, 0.05)', padding: '10px', borderRadius: '8px', borderLeft: '2px solid #db8c95' }}>
                  <span style={{ fontWeight: 700, color: '#6b4a52', display: 'block', fontSize: '0.62rem', marginBottom: '2px' }}>Notas:</span>
                  <span style={{ color: '#4a3036', fontStyle: 'italic', fontSize: '0.65rem' }}>"{selectedDetailedApp.notes}"</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
                <button 
                  onClick={() => {
                    showToast?.('Abrir editor para esta cita (Fase 2)', 'info');
                    setSelectedDetailedApp(null);
                  }}
                  style={{ padding: '10px 4px', borderRadius: '8px', border: '1px solid rgba(223, 178, 140, 0.4)', background: '#fff', color: '#6b4a52', fontWeight: 600, cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  className="btn-hover-scale"
                >
                  <Pencil size={12} /> Editar Cita
                </button>
                <button 
                  onClick={() => {
                    showToast?.('Cita completada con éxito', 'success');
                    setSelectedDetailedApp(null);
                  }}
                  style={{ padding: '10px 4px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #4ade80, #22c55e)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  className="btn-hover-scale"
                >
                  <Check size={12} /> Completar
                </button>
                <button 
                  onClick={() => {
                    const motivo = prompt('Por favor, indica el motivo de la cancelación:');
                    if (motivo !== null) {
                      showToast?.(`Cita cancelada. Motivo: ${motivo || 'No indicado'}`, 'error');
                      setSelectedDetailedApp(null);
                    }
                  }}
                  style={{ padding: '10px 4px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)', color: '#dc2626', fontWeight: 600, cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  className="btn-hover-scale"
                >
                  <XCircle size={12} /> Cancelar
                </button>
                <button 
                  onClick={() => {
                    showToast?.('Cita marcada como No-show', 'warning');
                    setSelectedDetailedApp(null);
                  }}
                  style={{ padding: '10px 4px', borderRadius: '8px', border: '1px solid rgba(217, 119, 6, 0.3)', background: 'rgba(217, 119, 6, 0.05)', color: '#d97706', fontWeight: 600, cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  className="btn-hover-scale"
                >
                  <AlertTriangle size={12} /> No-show
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER LATERAL DESLIZANTE DE TRABAJADORA (Fase 2 Visual) */}
      {/* FULL-SCREEN STAFF DASHBOARD VIEW */}
      {selectedStaffDrawer && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, background: 'rgba(250, 243, 242, 0.96)', zIndex: 1000, 
            display: 'flex', flexDirection: 'column', padding: isMobile ? '12px' : '24px 32px', overflowY: 'auto' 
          }}
          className="animate-slide-up"
        >
          {/* Header Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <button 
              onClick={() => setSelectedStaffDrawer(null)}
              style={{
                background: 'transparent', border: 'none', color: '#8c767b', fontSize: '0.85rem',
                fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              ← Volver a Agenda
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => showToast?.('Abriendo editor de horarios...', 'info')}
                style={{
                  background: '#fff', border: '1px solid rgba(223,178,140,0.3)', color: '#db8c95',
                  padding: '8px 16px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Editar horario
              </button>
            </div>
          </div>

          {/* Identity & Status Ribbon */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', alignItems: 'center', background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '24px', padding: '24px', marginBottom: '24px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #db8c95', flexShrink: 0 }}>
              <img 
                src={selectedStaffDrawer.photo_url || `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(selectedStaffDrawer.name)}&backgroundColor=e8a2a9,f7d4d7,fce4e8&radius=50`}
                alt={selectedStaffDrawer.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: isMobile ? 'center' : 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: isMobile ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#4a3036', margin: 0 }}>{selectedStaffDrawer.name}</h2>
                <span style={{ fontSize: '0.68rem', color: '#db8c95', background: 'rgba(219,140,149,0.1)', padding: '3px 8px', borderRadius: '12px', fontWeight: 700 }}>
                  {getStaffRole(selectedStaffDrawer.name)}
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: '#a07880', margin: '6px 0 0', fontWeight: 650 }}>
                Especialidad: {selectedStaffDrawer.role || 'Estética Integral'}  ·  Teléfono: 0412 345 6789
              </p>
            </div>

            {/* Quick Status Badges */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ background: '#f2fcf5', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '12px 18px', borderRadius: '16px', textAlign: 'center', minWidth: '100px' }}>
                <div style={{ fontSize: '0.58rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>Estado actual</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>Libre ahora</div>
              </div>
              <div style={{ background: '#fff9f5', border: '1px solid rgba(217, 119, 6, 0.2)', padding: '12px 18px', borderRadius: '16px', textAlign: 'center', minWidth: '100px' }}>
                <div style={{ fontSize: '0.58rem', color: '#d97706', fontWeight: 700, textTransform: 'uppercase' }}>Próxima cita</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
                  {getStaffNextApp(selectedStaffDrawer.id) ? getStaffNextApp(selectedStaffDrawer.id).timeStr : 'Ninguna'}
                </div>
              </div>
              <div style={{ background: '#faf3f2', border: '1px solid rgba(223, 178, 140, 0.2)', padding: '12px 18px', borderRadius: '16px', textAlign: 'center', minWidth: '120px' }}>
                <div style={{ fontSize: '0.58rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase' }}>Horario de hoy</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4a3036', marginTop: '2px' }}>9:00 AM - 6:00 PM</div>
              </div>
            </div>
          </div>

          {/* Subtabs for Detail Navigation (Visual layout mimicking mockup) */}
          <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid rgba(223, 178, 140, 0.15)', paddingBottom: '8px', marginBottom: '24px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#db8c95', borderBottom: '2px solid #db8c95', paddingBottom: '8px', cursor: 'pointer' }}>
              Agenda del día
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a07880', paddingBottom: '8px', cursor: 'pointer' }}>
              Resumen del día
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a07880', paddingBottom: '8px', cursor: 'pointer' }}>
              Servicios realizados
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a07880', paddingBottom: '8px', cursor: 'pointer' }}>
              Historial
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a07880', paddingBottom: '8px', cursor: 'pointer' }}>
              Notas
            </span>
          </div>

          {/* Dashboard 3-Column Content Layout */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', alignItems: 'flex-start' }}>
            
            {/* Column 1: Daily Agenda Timeline (50% Width) */}
            <div style={{ flex: 1.5, background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '20px', padding: '20px', minWidth: 0, width: '100%' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#4a3036', margin: '0 0 16px 0' }}>
                Agenda del {selectedDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(() => {
                  const staffApps = dayApps
                    .filter(a => a.staff_id === selectedStaffDrawer.id)
                    .sort((a, b) => new Date(a.scheduled_at || a.created_at) - new Date(b.scheduled_at || b.created_at));

                  if (staffApps.length === 0) {
                    return (
                      <div style={{ padding: '30px 20px', textAlign: 'center', color: '#a07880', fontSize: '0.78rem' }}>
                        No hay citas programadas para esta especialista el día de hoy.
                      </div>
                    );
                  }

                  return staffApps.map((app, idx) => {
                    const start = new Date(app.scheduled_at || app.created_at);
                    const timeStr = start.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true });
                    return (
                      <div 
                        key={app.id || idx} 
                        style={{ 
                          display: 'flex', gap: '14px', alignItems: 'center', padding: '14px', 
                          background: '#faf3f2', border: '1px solid rgba(223, 178, 140, 0.15)', 
                          borderRadius: '16px', cursor: 'pointer' 
                        }}
                      >
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#db8c95', width: '70px', flexShrink: 0 }}>
                          {timeStr}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4a3036', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {app.clients?.name || 'Cliente sin nombre'}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#8c767b', marginTop: '2px' }}>
                            {app.services?.name || 'Servicio General'} (1 hora)
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.58rem', fontWeight: 800, background: 'rgba(34,197,94,0.08)', color: '#16a34a', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                            Confirmada
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Column 2: Performance Summary & Top Metrics (30% Width) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
              
              {/* Daily metrics values */}
              <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '20px', padding: '20px' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#4a3036', margin: '0 0 16px 0' }}>
                  Resumen del día
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: '#faf3f2', padding: '12px', borderRadius: '14px', border: '1px solid rgba(223,178,140,0.12)' }}>
                    <div style={{ fontSize: '0.6rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase' }}>Citas programadas</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#4a3036', marginTop: '4px' }}>
                      {getStaffMetrics(selectedStaffDrawer.id).citasCount}
                    </div>
                  </div>
                  <div style={{ background: '#faf3f2', padding: '12px', borderRadius: '14px', border: '1px solid rgba(223,178,140,0.12)' }}>
                    <div style={{ fontSize: '0.6rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase' }}>Citas completadas</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#16a34a', marginTop: '4px' }}>
                      {getStaffMetrics(selectedStaffDrawer.id).citasCount}
                    </div>
                  </div>
                  <div style={{ background: '#faf3f2', padding: '12px', borderRadius: '14px', border: '1px solid rgba(223,178,140,0.12)' }}>
                    <div style={{ fontSize: '0.6rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase' }}>Ingresos generados</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#a0506a', marginTop: '4px' }}>
                      ${getStaffMetrics(selectedStaffDrawer.id).revenue}
                    </div>
                  </div>
                  <div style={{ background: '#faf3f2', padding: '12px', borderRadius: '14px', border: '1px solid rgba(223,178,140,0.12)' }}>
                    <div style={{ fontSize: '0.6rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase' }}>Ocupación diaria</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#4a3036', marginTop: '4px' }}>
                      {getStaffMetrics(selectedStaffDrawer.id).occupancy}%
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(223, 178, 140, 0.12)', paddingTop: '14px' }}>
                  <div style={{ fontSize: '0.62rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                    Servicios más vendidos hoy
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      { rank: 1, name: 'Volumen 3D', qty: 2, rev: 1600 },
                      { rank: 2, name: 'Extensiones Clásicas', qty: 1, rev: 700 },
                      { rank: 3, name: 'Retoque Clásico', qty: 1, rev: 150 }
                    ].map(srv => (
                      <div key={srv.rank} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#4a3036' }}>
                        <span style={{ fontWeight: 650 }}>{srv.rank}. {srv.name}</span>
                        <span style={{ fontWeight: 800, color: '#a0506a' }}>{srv.qty} cita(s) · ${srv.rev}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Clients, Internal Notes & Actions (20% Width) */}
            <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
              
              {/* Internal Notes container */}
              <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '20px', padding: '20px' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#4a3036', margin: '0 0 12px 0' }}>
                  Notas internas
                </h3>
                <textarea 
                  placeholder="Escribe notas de seguimiento para esta especialista, observaciones de rendimiento o recordatorios..."
                  style={{
                    width: '100%', height: '80px', border: '1px solid rgba(223, 178, 140, 0.18)', borderRadius: '10px',
                    background: '#faf3f2', padding: '10px', fontSize: '0.74rem', color: '#4a3036', outline: 'none',
                    resize: 'none'
                  }}
                  defaultValue="Prefiere pinzas tipo curva. Muy puntual. Excelente trato al cliente."
                />
              </div>

              {/* Action buttons list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => {
                    setScheduleModalPreset({ staff: selectedStaffDrawer });
                    setShowScheduleModal(true);
                  }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #e8a2a9, #db8c95)', color: '#fff',
                    fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(219,140,149,0.2)'
                  }}
                  className="btn-hover-scale"
                >
                  Agendar Nueva Cita
                </button>

                <button
                  onClick={() => {
                    setShowQuickAvailModal(true);
                  }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(219, 140, 149, 0.25)',
                    background: '#fff', color: '#db8c95',
                    fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                  }}
                  className="btn-hover-scale"
                >
                  Ver disponibilidad
                </button>

                <button
                  onClick={() => {
                    setSelectedStaffDrawer(null);
                    showToast?.('Navegando a reportes de productividad...', 'info');
                  }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                    background: 'rgba(74, 48, 54, 0.08)', color: '#4a3036',
                    fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                  }}
                  className="btn-hover-scale"
                >
                  Ver reporte completo
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
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
