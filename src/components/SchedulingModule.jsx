import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon, Clock, User, Plus, ChevronLeft, ChevronRight,
  ChevronDown, Search, Pencil,
  CheckCircle2, Users,
  CalendarDays, StickyNote, BarChart3, XCircle, Bell,
  DollarSign, Info, AlertTriangle, Coffee, Sliders, Check, HelpCircle, Scissors
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';
import { getRoleKind, getRoleName } from '../utils/roles';
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
import AnimatedModal from './AnimatedModal';
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
          <button
            onClick={handlePrev}
            style={{
              width: '30px', height: '30px', borderRadius: '10px', border: '1px solid rgba(223,178,140,0.3)',
              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#c97282', transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1) translateX(-3px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(212, 160, 154, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(212, 160, 154, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1) translateX(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'rgba(223,178,140,0.3)';
            }}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={handleNext}
            style={{
              width: '30px', height: '30px', borderRadius: '10px', border: '1px solid rgba(223,178,140,0.3)',
              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#c97282', transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1) translateX(3px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(212, 160, 154, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(212, 160, 154, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1) translateX(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'rgba(223,178,140,0.3)';
            }}
          >
            <ChevronRight size={15} />
          </button>
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
                transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                opacity: d.currentMonth ? 1 : 0.3,
                boxShadow: selected ? '0 4px 12px rgba(212, 160, 154, 0.2)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (d.currentMonth && !selected) {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.background = 'rgba(212, 160, 154, 0.1)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(212, 160, 154, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (d.currentMonth && !selected) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
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
  onMultipleSlotToggle,
  onAppointmentContextMenu
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
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onAppointmentContextMenu) {
                  onAppointmentContextMenu(e, app);
                }
              }}
              title={`${clientName} · ${app.services?.name || 'Servicio'} · ${formatMinutes(startMinutes)}`}
              className={isMultipleApp ? "agenda-appointment-multiple-selected" : ""}
              style={{
                position: 'absolute', top: `${top}px`, left: '3px', right: '3px', height: `${height}px`,
                background: '#fff', borderRadius: '8px', borderLeft: `3px solid ${colors.leftBorder}`,
                boxShadow: '0 2px 6px rgba(167,102,115,0.1)', padding: '3px 6px', cursor: 'pointer',
                overflow: 'hidden', zIndex: 2, transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                animation: `appointmentSlideIn 0.35s ease forwards`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(167,102,115,0.2)';
                e.currentTarget.style.zIndex = '3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(167,102,115,0.1)';
                e.currentTarget.style.zIndex = '2';
              }}
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


const SchedulingModule = ({ isMobile, isCollapsed = false, rates, openScheduleModal = false, modalKey = null }) => {
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
  const [appointmentToEdit, setAppointmentToEdit] = useState(null);
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
  const [isClosingDetailedApp, setIsClosingDetailedApp] = useState(false);
  const [statusEditingApp, setStatusEditingApp] = useState(null); // { appId, clientName, x, y }
  const [selectedStaffAvailDetail, setSelectedStaffAvailDetail] = useState(null);
  
  const triggerCloseDetailedApp = () => {
    setIsClosingDetailedApp(true);
    setTimeout(() => {
      setSelectedDetailedApp(null);
      setIsClosingDetailedApp(false);
    }, 270);
  };

  const detailedAppDetails = useMemo(() => {
    if (!selectedDetailedApp) return null;
    try {
      const appDate = new Date(selectedDetailedApp.scheduled_at || selectedDetailedApp.created_at);
      const activeStaff = staff.find(s => s.id === selectedDetailedApp.staff_id);
      const staffNameOnly = activeStaff ? activeStaff.name.split('(')[0].trim() : 'Especialista';
      const staffRoleOnly = activeStaff ? String(activeStaff.role || 'Especialista').split('|')[0] : 'Especialista';
      const formattedDate = appDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const formattedTime = appDate.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true });
      return {
        activeStaff,
        staffNameOnly,
        staffRoleOnly,
        formattedDate,
        formattedTime
      };
    } catch (err) {
      console.error("Error formatting detailed app:", err);
      return null;
    }
  }, [selectedDetailedApp, staff]);

  const [viewMode, setViewMode] = useState('operation');
  const [quickContextMenu, setQuickContextMenu] = useState(null); // { x, y, app }
  const [showQuickAvailModal, setShowQuickAvailModal] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState({});
  const [selectedStaffDrawer, setSelectedStaffDrawer] = useState(null);
  const [isClosingStaffDrawer, setIsClosingStaffDrawer] = useState(false);
  const [staffActiveTab, setStaffActiveTab] = useState('agenda');
  const [rankingTab, setRankingTab] = useState('revenue');
  const [leftTab, setLeftTab] = useState('citas');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  const handleCloseStaffDrawer = () => {
    setIsClosingStaffDrawer(true);
    setTimeout(() => {
      setSelectedStaffDrawer(null);
      setIsClosingStaffDrawer(false);
    }, 280);
  };

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

  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  const roleKind = getRoleKind(user?.role);
  const isWorkerView = roleKind === 'worker';

  useEffect(() => {
    const updateUnread = () => {
      setUnreadNotifsCount(notificationService.getHistory().filter(n => !n.read).length);
    };
    updateUnread();
    window.addEventListener('jana_new_notification', updateUnread);
    return () => window.removeEventListener('jana_new_notification', updateUnread);
  }, []);

  useEffect(() => {
    loadData();
  }, []);


  useEffect(() => {
    if (selectedStaffDrawer) {
      window.dispatchEvent(new CustomEvent('jana:show-sidebar'));
    }
  }, [selectedStaffDrawer]);

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
          {/* Simplified Date Navigation Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', borderRadius: '12px', border: '1px solid rgba(223, 178, 140, 0.3)', padding: '4px 8px', boxShadow: '0 2px 8px rgba(74, 48, 54, 0.03)' }}>
            {/* Hoy button */}
            <button
              onClick={() => setSelectedDate(new Date())}
              style={{
                padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', color: '#4a3036',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(212, 160, 154, 0.1)';
                e.currentTarget.style.color = '#db8c95';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#4a3036';
              }}
            >
              Hoy
            </button>

            <div style={{ width: '1px', height: '20px', background: 'rgba(223, 178, 140, 0.2)' }} />

            {/* Navigator Arrows with Date */}
            <button
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1))}
              style={{
                width: '28px', height: '28px', borderRadius: '8px', background: 'transparent',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#db8c95', cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(212, 160, 154, 0.15)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <ChevronLeft size={14} />
            </button>

            <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#4a3036', minWidth: '65px', textAlign: 'center' }}>
              {selectedDate.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}
            </span>

            <button
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1))}
              style={{
                width: '28px', height: '28px', borderRadius: '8px', background: 'transparent',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#db8c95', cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(212, 160, 154, 0.15)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Bell Notifications */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('jana:open-notifications'))}
            style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: '#ffffff', border: '1px solid rgba(223, 178, 140, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative',
              color: '#4a3036',
              boxShadow: '0 2px 8px rgba(74, 48, 54, 0.03)', transition: 'all 0.2s'
            }}
          >
            <Bell size={18} />
            {unreadNotifsCount > 0 && (
              <div style={{
                position: 'absolute', top: '10px', right: '10px',
                backgroundColor: '#db8c95', width: '7px', height: '7px',
                borderRadius: '50%',
              }} />
            )}
          </button>

          {/* + Nueva cita */}
          <button
            onClick={() => { setScheduleModalPreset(null); setShowScheduleModal(true); }}
            style={{
              padding: '8px 18px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)',
              color: '#fff', fontSize: '0.82rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 4px 15px rgba(219,140,149,0.25)',
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
              e.currentTarget.style.boxShadow = '0 12px 28px rgba(219,140,149,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(219,140,149,0.25)';
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
                className="agenda-glass-card animate-card-enter"
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
                  transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease',
                  animation: `cardEnter 0.4s var(--transition-smooth) ${idx * 0.1}s forwards`
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(74, 48, 54, 0.1)'; }}
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

          {/* ESTADO ACTUAL DEL SALÓN */}
          <div className="agenda-glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4a3036', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#db8c95' }} />
              ESTADO ACTUAL DEL SALÓN
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '12px' }}>
              {/* Disponibles */}
              <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', marginBottom: '6px' }}>🟢 Disponibles</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#16a34a' }}>{staffByStatus.libres.length}</div>
              </div>

              {/* En Cita */}
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: '6px' }}>🔴 En Cita</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#dc2626' }}>{staffByStatus.ocupadas.length}</div>
              </div>

              {/* Almuerzo */}
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', marginBottom: '6px' }}>🟡 Almuerzo</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d97706' }}>1</div>
              </div>
            </div>
          </div>

          {/* PRÓXIMAS CITAS IMPORTANTES */}
          <div className="agenda-glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4a3036', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarIcon size={16} color="#db8c95" />
              PRÓXIMAS CITAS HOY
            </h4>

            {dayApps.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#a07880', fontSize: '0.78rem' }}>
                No hay citas agendadas para hoy
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dayApps.slice(0, 5).map((app, idx) => {
                  const start = new Date(app.scheduled_at || app.created_at);
                  const startHour = start.getHours().toString().padStart(2, '0');
                  const startMin = start.getMinutes().toString().padStart(2, '0');
                  const staffName = staff.find(s => s.id === app.staff_id)?.name || 'Especialista';
                  const duration = getAppointmentDuration(app);
                  const endHour = new Date(start.getTime() + duration * 60000).getHours().toString().padStart(2, '0');
                  const endMin = new Date(start.getTime() + duration * 60000).getMinutes().toString().padStart(2, '0');

                  return (
                    <div
                      key={app.id}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '12px',
                        background: '#faf3f2',
                        borderRadius: '10px',
                        border: '1px solid rgba(223, 178, 140, 0.15)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fff';
                        e.currentTarget.style.borderColor = 'rgba(219, 140, 149, 0.3)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#faf3f2';
                        e.currentTarget.style.borderColor = 'rgba(223, 178, 140, 0.15)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      {/* Hora */}
                      <div style={{ minWidth: '50px', fontWeight: 800, color: '#db8c95', fontSize: '0.78rem' }}>
                        {startHour}:{startMin}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4a3036', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {app.clients?.name || 'Cliente'} → {app.services?.name || 'Servicio'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#a07880', fontWeight: 600, marginTop: '2px' }}>
                          {staffName}
                        </div>
                      </div>

                      {/* Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          padding: '3px 6px',
                          borderRadius: '6px',
                          background: app.status === 'Completado' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: app.status === 'Completado' ? '#16a34a' : '#d97706'
                        }}>
                          {app.status === 'Completado' ? '✓' : '○'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* TWO-COLUMN CONTENT GRID */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', width: '100%', alignItems: 'flex-start', marginTop: '0' }}>
            
            {/* Left Column (72%) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0', minWidth: 0 }}>
              
              {/* Rendimiento Grid (Sin tabs) */}
              <div className="agenda-glass-card" style={{ padding: '20px', overflow: 'visible' }}>

                {/* Tab: Rendimiento - Always Shown */}
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
                        transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      }}
                      onFocus={(e) => {
                        e.target.style.background = '#fff';
                        e.target.style.borderColor = 'rgba(219, 140, 149, 0.5)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(219, 140, 149, 0.12)';
                        e.target.style.transform = 'scale(1.01)';
                      }}
                      onBlur={(e) => {
                        e.target.style.background = '#faf3f2';
                        e.target.style.borderColor = 'rgba(223, 178, 140, 0.15)';
                        e.target.style.boxShadow = 'none';
                        e.target.style.transform = 'scale(1)';
                      }}
                    />
                    {staffSearchQuery && (
                      <button
                        onClick={() => setStaffSearchQuery('')}
                        style={{
                          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                          border: 'none', background: 'transparent', color: '#a07880', cursor: 'pointer',
                          fontSize: '0.85rem', padding: '4px',
                          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          animation: 'checkmarkBounce 0.3s ease forwards'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#db8c95';
                          e.currentTarget.style.transform = 'translateY(-50%) scale(1.2) rotate(90deg)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#a07880';
                          e.currentTarget.style.transform = 'translateY(-50%) scale(1) rotate(0deg)';
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
                {/* Container for Specialists - Dynamic height, shows everyone without scrolling */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {visibleStaff.map(s => {
                    const window = getStaffWorkingWindow(s.id, dateKey, schedules, timeOff);
                      const busySlots = (() => {
                      const realBusy = getStaffBusyIntervals(s.id, dayApps);
                      if (realBusy.length > 0) return realBusy;
                      
                      // Simulated busy hours based on the static demoApps on dashboard
                      // demoApps maps: Isabella: 9:00 (d1), Laura: 9:30 (d2), Sofia: 10:00 (d3), Camila: 10:30 (d4), Valeria: 11:00 (d5), Mariana: 11:30 (d6)
                      const simulated = [];
                      if (s.name.includes('Isabella')) simulated.push({ startMinutes: 9 * 60, endMinutes: 10.5 * 60, client: 'María Fernández' }); // 9:00 - 10:30
                      if (s.name.includes('Laura')) simulated.push({ startMinutes: 9.5 * 60, endMinutes: 10.25 * 60, client: 'Valentina Gómez' }); // 9:30 - 10:15
                      if (s.name.includes('Sofía')) simulated.push({ startMinutes: 10 * 60, endMinutes: 10.75 * 60, client: 'Camila Torres' });  // 10:00 - 10:45
                      if (s.name.includes('Camila')) simulated.push({ startMinutes: 10.5 * 60, endMinutes: 11.25 * 60, client: 'Daniela Rojas' }); // 10:30 - 11:15
                      if (s.name.includes('Valeria')) simulated.push({ startMinutes: 11 * 60, endMinutes: 11.75 * 60, client: 'Andrea Castillo' }); // 11:00 - 11:45
                      if (s.name.includes('Mariana')) simulated.push({ startMinutes: 11.5 * 60, endMinutes: 13 * 60, client: 'Lucía Méndez' }); // 11:30 - 13:00
                      return simulated;
                    })();

                    const refMin = checkingTime != null ? checkingTime : nowMinutes;
                    const isLunch = refMin >= 13 * 60 && refMin < 14 * 60;
                    
                    let dotColor = '#94a3b8'; // Off duty
                    let statusText = 'No trabaja hoy';
                    let occupied = false;
                    let activeSlot = null;

                    if (window.isWorking) {
                      activeSlot = busySlots.find(b => refMin >= b.startMinutes && refMin < b.endMinutes);
                      occupied = activeSlot || isLunch;
                      
                      if (occupied) {
                        dotColor = isLunch ? '#db8c95' : '#f59e0b'; // Amber for busy, rose for lunch
                        statusText = isLunch ? 'En Almuerzo' : `Ocupada c/ ${activeSlot?.client || 'Cliente'}`;
                      } else {
                        dotColor = '#22c55e'; // Free
                        // Find when is next appointment
                        const nextSimulated = busySlots.filter(b => b.startMinutes > refMin).sort((a,b) => a.startMinutes - b.startMinutes)[0];
                        statusText = nextSimulated 
                          ? `Libre ahora (Cita ${formatMinutes(nextSimulated.startMinutes)})`
                          : 'Libre ahora';
                      }
                    }

                    let badgeBg = 'rgba(148, 163, 184, 0.08)';
                    let badgeColor = '#64748b';
                    if (window.isWorking) {
                      if (isLunch) {
                        badgeBg = 'rgba(219, 140, 149, 0.12)';
                        badgeColor = '#db8c95';
                      } else if (occupied) {
                        badgeBg = 'rgba(245, 158, 11, 0.1)';
                        badgeColor = '#d97706';
                      } else {
                        badgeBg = 'rgba(34, 197, 94, 0.08)';
                        badgeColor = '#16a34a';
                      }
                    }

                    return (
                      <div 
                        key={s.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px',
                          padding: '8px 10px',
                          borderRadius: '14px',
                          background: '#ffffff',
                          border: '1px solid rgba(223, 178, 140, 0.08)',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                        className="btn-hover-scale"
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#faf6f5';
                          e.currentTarget.style.borderColor = 'rgba(219, 140, 149, 0.2)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.borderColor = 'rgba(223, 178, 140, 0.08)';
                        }}
                        onClick={() => setSelectedStaffAvailDetail({
                          staff: s,
                          busySlots,
                          isWorking: window.isWorking,
                          isLunch,
                          refMin,
                          statusText
                        })}
                      >
                        {/* Larger Avatar */}
                        <div style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}>
                          <img
                            src={s.photo_url || `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(s.name)}&backgroundColor=e8a2a9,f7d4d7,fce4e8&radius=50`}
                            alt={s.name}
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(223, 178, 140, 0.15)' }}
                          />
                          {/* Dot Status Overlay */}
                          <div 
                            style={{ 
                              position: 'absolute', 
                              bottom: '-1px', 
                              right: '-1px', 
                              width: '10px', 
                              height: '10px', 
                              borderRadius: '50%', 
                              background: dotColor, 
                              border: '1.5px solid #fff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }} 
                          />
                        </div>

                        {/* Specialist Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#3d2b30', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.name}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: '#a0868c', fontWeight: 600, marginTop: '1px' }}>
                            {getStaffRole(s.name)}
                          </div>
                          {window.isWorking && (
                            <div style={{ fontSize: '0.68rem', color: '#6b4a52', fontWeight: 600, marginTop: '3px' }}>
                              {isLunch 
                                ? <span style={{ color: '#db8c95', fontWeight: 700 }}>Regresa a las 2:00 PM</span>
                                : activeSlot 
                                  ? <span style={{ color: '#d97706', fontWeight: 700 }}>Con {activeSlot.client || 'Cliente'} (Libre {formatMinutes(activeSlot.endMinutes)})</span>
                                  : (() => {
                                      const nextSimulated = busySlots.filter(b => b.startMinutes > refMin).sort((a,b) => a.startMinutes - b.startMinutes)[0];
                                      if (nextSimulated) {
                                        const minsDiff = nextSimulated.startMinutes - refMin;
                                        const hrs = Math.floor(minsDiff / 60);
                                        const mins = minsDiff % 60;
                                        const timeText = hrs > 0 ? `${hrs}h ${mins > 0 ? `${mins}m` : ''}` : `${mins} min`;
                                        return (
                                          <span style={{ color: '#4a3036' }}>
                                            Disp. por <strong style={{ color: '#16a34a' }}>{timeText}</strong> <span style={{ opacity: 0.8 }}>(Cita {formatMinutes(nextSimulated.startMinutes)})</span>
                                          </span>
                                        );
                                      }
                                      return <span style={{ color: '#16a34a', fontWeight: 700 }}>Disponible todo el día</span>;
                                    })()
                              }
                            </div>
                          )}
                          {!window.isWorking && (
                            <div style={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 700, marginTop: '2px' }}>
                              Día libre
                            </div>
                          )}
                        </div>

                        {/* Visual Status Capsule Badge */}
                        <div style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: badgeBg,
                          color: badgeColor,
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                          letterSpacing: '-0.1px',
                          textTransform: 'uppercase'
                        }}>
                          {isLunch ? 'Almuerzo' : occupied ? 'Ocupada' : 'Libre'}
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
<AnimatedModal isOpen={showQuickAvailModal}>
  {(overlayClass, cardClass) => (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(74, 48, 54, 0.35)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1100, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '16px'
      }}
      className={overlayClass}
      onClick={() => setShowQuickAvailModal(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={cardClass}
        style={{
          maxWidth: '720px', width: '100%', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          background: '#fff',
          borderRadius: '24px',
          boxShadow: '0 25px 60px rgba(74,48,54,0.18), 0 8px 24px rgba(0,0,0,0.06)',
          overflow: 'hidden'
        }}
      >
        {/* ── HEADER ── */}
        <div style={{
          padding: '28px 32px 24px',
          borderBottom: '1px solid rgba(223,178,140,0.15)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            <h3 style={{
              margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#3d2b30',
              letterSpacing: '-0.3px'
            }}>
              Buscador rápido de disponibilidad
            </h3>
            <p style={{
              margin: '4px 0 0', fontSize: '0.76rem', color: '#a0868c', fontWeight: 500
            }}>
              Encuentra especialistas disponibles según la fecha, hora, duración y servicio.
            </p>
          </div>
          <button
            onClick={() => setShowQuickAvailModal(false)}
            style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'rgba(74,48,54,0.05)',
              border: 'none', color: '#8c767b', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', lineHeight: 1, transition: 'all 0.2s',
              flexShrink: 0, marginTop: '2px'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(219,140,149,0.12)'; e.currentTarget.style.color = '#db8c95'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,48,54,0.05)'; e.currentTarget.style.color = '#8c767b'; }}
          >
            ✕
          </button>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '24px 32px 32px' }} className="jana-scrollbar">

          {/* ── FILTER ROW 1: Fecha | Hora | Duración ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a0868c', display: 'block', marginBottom: '7px', letterSpacing: '0.3px' }}>Fecha</label>
              <JanaDatePicker
                value={availDate}
                onChange={e => setAvailDate(e.target.value)}
                variant="light"
                inputClassName="agenda-input"
                inputStyle={{ borderRadius: '12px', height: '44px', fontSize: '0.82rem', fontWeight: 600, paddingLeft: '38px', background: '#fff', border: '1.5px solid rgba(212,160,154,0.3)', color: '#3d2b30' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a0868c', display: 'block', marginBottom: '7px', letterSpacing: '0.3px' }}>Hora de inicio</label>
              <JanaSelect variant="light" value={availTimeStr} onChange={val => setAvailTimeStr(val)}
                options={[
                  { value: "07:00", label: "07:00 AM" },
                  { value: "07:30", label: "07:30 AM" },
                  { value: "08:00", label: "08:00 AM" },
                  { value: "08:30", label: "08:30 AM" },
                  { value: "09:00", label: "09:00 AM" },
                  { value: "09:30", label: "09:30 AM" },
                  { value: "10:00", label: "10:00 AM" },
                  { value: "10:30", label: "10:30 AM" },
                  { value: "11:00", label: "11:00 AM" },
                  { value: "11:30", label: "11:30 AM" },
                  { value: "12:00", label: "12:00 PM" },
                  { value: "12:30", label: "12:30 PM" },
                  { value: "13:00", label: "13:00 PM" },
                  { value: "13:30", label: "13:30 PM" },
                  { value: "14:00", label: "14:00 PM" },
                  { value: "14:30", label: "14:30 PM" },
                  { value: "15:00", label: "15:00 PM" },
                  { value: "15:30", label: "15:30 PM" },
                  { value: "16:00", label: "16:00 PM" },
                  { value: "16:30", label: "16:30 PM" },
                  { value: "17:00", label: "17:00 PM" },
                  { value: "17:30", label: "17:30 PM" },
                  { value: "18:00", label: "18:00 PM" },
                  { value: "18:30", label: "18:30 PM" },
                  { value: "19:00", label: "19:00 PM" },
                  { value: "19:30", label: "19:30 PM" }
                ]}
                style={{ width: '100%' }}
                showSearch={true}
                editable={true}
                placeholder="Ej: 09:00 AM"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a0868c', display: 'block', marginBottom: '7px', letterSpacing: '0.3px' }}>Duración</label>
              <JanaSelect variant="light" value={availDuration} onChange={val => setAvailDuration(val)}
                options={[
                  { value: "15", label: "15 minutos" },
                  { value: "30", label: "30 minutos" },
                  { value: "45", label: "45 minutos" },
                  { value: "60", label: "60 minutos (1 hora)" },
                  { value: "90", label: "90 minutos (1.5 horas)" },
                  { value: "120", label: "120 minutos (2 horas)" },
                  { value: "180", label: "180 minutos (3 horas)" }
                ]}
                style={{ width: '100%' }}
                editable={true}
                placeholder="Ej: 1 hora o 90"
              />
            </div>
          </div>

          {/* ── FILTER ROW 2: Servicio | Especialista ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a0868c', display: 'block', marginBottom: '7px', letterSpacing: '0.3px' }}>Servicio</label>
              <JanaSelect variant="light" value={availServiceId} onChange={val => setAvailServiceId(val)}
                options={[{ value: "all", label: "Cualquier servicio" }, ...services.map(s => ({ value: s.id, label: `${s.name} (${s.duration || 60}m)` }))]}
                style={{ width: '100%' }}
                showSearch={true}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a0868c', display: 'block', marginBottom: '7px', letterSpacing: '0.3px' }}>Especialista</label>
              <JanaSelect variant="light" value={availStaffId} onChange={val => setAvailStaffId(val)}
                options={[{ value: "all", label: "Todas las especialistas" }, ...staff.map(s => ({ value: s.id, label: s.name }))]}
                style={{ width: '100%' }}
                showSearch={true}
              />
            </div>
          </div>

          {/* ── ACTION ROW ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <button onClick={() => { setAvailTimeStr('09:00'); setAvailDuration('60'); setAvailServiceId('all'); setAvailStaffId('all'); }}
              style={{ background: 'none', border: 'none', color: '#db8c95', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 0', transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >✦ Limpiar filtros</button>
            <button
              style={{ padding: '12px 28px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)', color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 6px 20px rgba(219,140,149,0.3)', transition: 'all 0.2s', letterSpacing: '0.2px' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(219,140,149,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(219,140,149,0.3)'; }}
            ><Search size={15} /> Buscar disponibilidad</button>
          </div>

          <div style={{ height: '1px', background: 'rgba(223,178,140,0.15)', marginBottom: '24px' }} />

          {/* ── RESULTS ── */}
          {(() => {
            const [hh, mm] = availTimeStr.split(':').map(Number);
            const startMinutes = hh * 60 + mm;
            let durationVal = 60;
            const cleanDurStr = String(availDuration || '').toLowerCase().trim();
            if (cleanDurStr.includes('hora') || cleanDurStr.includes('hr') || cleanDurStr.endsWith('h')) {
              // Extract numeric value (like 1, 1.5, 2)
              const match = cleanDurStr.match(/[\d.]+/);
              if (match) {
                durationVal = Math.round(parseFloat(match[0]) * 60);
              }
            } else {
              const parsedMin = parseInt(cleanDurStr.replace(/\D/g, ''));
              if (!isNaN(parsedMin)) {
                durationVal = parsedMin;
              }
            }
            const endMinutes = startMinutes + durationVal;
            const queryDate = new Date(availDate);
            const queryDateKey = getBusinessDateKey(queryDate);
            const staffList = availStaffId === 'all' ? staff : staff.filter(s => s.id === availStaffId);
            const disponibles = [];
            const noDisponibles = [];

            staffList.forEach(s => {
              const window = getStaffWorkingWindow(s.id, queryDateKey, schedules, timeOff);
              if (!window.isWorking) { noDisponibles.push({ staff: s, reason: 'Día libre / No trabaja hoy' }); return; }
              if (startMinutes < window.startMinutes || endMinutes > window.endMinutes) { noDisponibles.push({ staff: s, reason: `Fuera de jornada (${formatMinutes(window.startMinutes)} – ${formatMinutes(window.endMinutes)})` }); return; }
              const busySlots = getStaffBusyIntervals(s.id, appointments.filter(app => { const appDate = new Date(app.scheduled_at || app.created_at); return getBusinessDateKey(appDate) === queryDateKey; }));
              const lunchStart = 13 * 60, lunchEnd = 14 * 60;
              const hasLunchOverlap = startMinutes < lunchEnd && endMinutes > lunchStart;
              const conflict = busySlots.find(b => startMinutes < b.endMinutes && endMinutes > b.startMinutes);
              if (hasLunchOverlap) { noDisponibles.push({ staff: s, reason: 'Hora de almuerzo (1:00 PM – 2:00 PM)' }); }
              else if (conflict) { noDisponibles.push({ staff: s, reason: `Ocupada ${formatMinutes(conflict.startMinutes)} – ${formatMinutes(conflict.endMinutes)}` }); }
              else { disponibles.push({ staff: s, freeFrom: formatMinutes(window.startMinutes), freeUntil: formatMinutes(window.endMinutes) }); }
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#3d2b30' }}>Especialistas disponibles ({disponibles.length})</h4>
                  {disponibles.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', color: '#16a34a', padding: '5px 12px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700, border: '1px solid #bbf7d0' }}>
                      <CheckCircle2 size={13} /> {disponibles.length} disponibles
                    </span>
                  )}
                </div>

                {/* Cards */}
                {disponibles.length === 0 ? (
                  <div style={{ padding: '24px', borderRadius: '16px', background: '#faf7f5', border: '1px dashed rgba(223,178,140,0.3)', textAlign: 'center', color: '#a0868c', fontSize: '0.82rem' }}>
                    Ninguna especialista disponible con estos criterios.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>



      {/* DRAWER LATERAL DESLIZANTE DE TRABAJADORA (Fase 2 Visual) */}
      {/* FULL-SCREEN STAFF DASHBOARD VIEW */}
      {selectedStaffDrawer && (
        <div 
          style={{
            position: 'fixed',
            left: isMobile ? 0 : (isCollapsed ? '70px' : '230px'),
            top: 0,
            right: 0,
            bottom: 0,
            background: '#fcf8f7',
            zIndex: 998, 
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            transition: 'left 0.3s ease'
          }}
          className={`${isClosingStaffDrawer ? 'staff-drawer-exit' : 'staff-drawer-enter'} no-scrollbar`}
        >
          {/* Custom Header Action Bar (Top Bar) */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(223, 178, 140, 0.15)',
            padding: isMobile ? '12px 16px' : '16px 32px',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}>
            <button
              onClick={handleCloseStaffDrawer}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a07880',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#db8c95';
                e.currentTarget.style.transform = 'translateX(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#a07880';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <ChevronLeft size={18} /> Volver a Agenda
            </button>

            {/* Right side of topbar: Bell & Active User Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Bell Icon */}
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('jana:open-notifications'))}
                style={{
                  width: '38px', height: '38px', borderRadius: '12px',
                  background: '#ffffff', border: '1px solid rgba(223, 178, 140, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', position: 'relative',
                  color: '#4a3036',
                  boxShadow: '0 2px 8px rgba(74, 48, 54, 0.03)',
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(212, 160, 154, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(74, 48, 54, 0.03)';
                }}
              >
                <Bell size={16} />
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  backgroundColor: '#db8c95', width: '16px', height: '16px',
                  borderRadius: '50%', color: '#fff', fontSize: '0.62rem',
                  fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  5
                </span>
              </button>

              {/* User Profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ textAlign: 'right', display: isMobile ? 'none' : 'block' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#4a3036' }}>
                    {user?.name || 'Admin'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#a07880', fontWeight: 600 }}>
                    {getRoleName(user?.role) || 'Dueña'}
                  </div>
                </div>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #db8c95' }}>
                  <img 
                    src={user?.photo_url || `https://api.dicebear.com/9.x/lorelei/svg?seed=Admin&backgroundColor=f7d4d7`}
                    alt="User profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main content padding area */}
          <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Identity Card & Date Selector Ribbon */}
            <div style={{ 
              background: '#fff', 
              border: '1px solid rgba(223,178,140,0.18)', 
              borderRadius: '24px', 
              padding: '24px',
              boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'stretch' : 'center',
              gap: '20px'
            }}>
              {/* Left Side: Photo & Name & Specialty */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #fce4e8', flexShrink: 0, boxShadow: '0 4px 12px rgba(219,140,149,0.15)' }}>
                  <img 
                    src={selectedStaffDrawer.photo_url || `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(selectedStaffDrawer.name)}&backgroundColor=e8a2a9,f7d4d7,fce4e8&radius=50`}
                    alt={selectedStaffDrawer.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#4a3036', margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>
                      {selectedStaffDrawer.name}
                    </h2>
                    <span style={{ fontSize: '0.72rem', color: '#db8c95', background: 'rgba(219,140,149,0.1)', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      {getStaffRole(selectedStaffDrawer.name)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#a07880', margin: '8px 0 0', fontWeight: 600 }}>
                    Especialidad: {selectedStaffDrawer.role || 'Extensiones de pestañas'}  ·  Teléfono: 0412 345 6789
                  </p>
                </div>
              </div>

              {/* Right Side: Date Picker Navigation & Edit Schedule */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                {/* Date Navigator */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  background: '#ffffff', 
                  border: '1px solid rgba(223, 178, 140, 0.25)', 
                  borderRadius: '12px',
                  padding: '4px',
                  boxShadow: '0 2px 8px rgba(74, 48, 54, 0.02)'
                }}>
                  <div style={{ 
                    padding: '8px 16px', 
                    fontSize: '0.82rem', 
                    fontWeight: 700, 
                    color: '#4a3036',
                    textTransform: 'capitalize'
                  }}>
                    {selectedDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(' de', '').replace(' de', '')}
                  </div>
                  <div style={{ display: 'flex', gap: '2px', borderLeft: '1px solid rgba(223,178,140,0.15)', paddingLeft: '4px' }}>
                    <button 
                      onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1))}
                      style={{
                        width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'transparent',
                        color: '#db8c95', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      className="btn-hover-scale"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1))}
                      style={{
                        width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'transparent',
                        color: '#db8c95', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      className="btn-hover-scale"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Edit Schedule Button */}
                <button 
                  onClick={() => showToast?.('Abriendo editor de horarios...', 'info')}
                  style={{
                    background: '#fff', 
                    border: '1px solid #db8c95', 
                    color: '#db8c95',
                    padding: '10px 20px', 
                    borderRadius: '12px', 
                    fontSize: '0.82rem', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(219,140,149,0.05)'
                  }}
                  className="btn-hover-scale"
                >
                  <Clock size={14} /> Editar horario
                </button>
              </div>
            </div>

            {/* Quick Status Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
              {/* Card 1: Estado Actual */}
              <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '20px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', flexShrink: 0, boxShadow: '0 0 8px #22c55e' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.62rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado actual</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#22c55e', marginTop: '2px' }}>Ocupada <span style={{ color: '#a07880', fontSize: '0.78rem', fontWeight: 500 }}>Hasta 11:30 AM</span></div>
                </div>
              </div>

              {/* Card 2: Próxima Cita */}
              <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '20px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(217, 119, 6, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0 }}>
                  <CalendarIcon size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.62rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Próxima cita</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
                    12:00 PM <span style={{ color: '#a07880', fontSize: '0.78rem', fontWeight: 500 }}>· Volumen 3D</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Horario de Hoy */}
              <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '20px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(219, 140, 149, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#db8c95', flexShrink: 0 }}>
                  <Clock size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.62rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Horario de hoy</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4a3036', marginTop: '2px', lineHeight: '1.2' }}>
                    9:00 AM - 6:00 PM <br />
                    <span style={{ color: '#a07880', fontSize: '0.68rem', fontWeight: 500 }}>1:00 PM - 2:00 PM (descanso)</span>
                  </div>
                </div>
              </div>
            </div>

             {/* Horizontal Tabs Menu */}
             <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid rgba(223, 178, 140, 0.15)', paddingBottom: '2px', overflowX: 'auto' }} className="no-scrollbar">
               {[
                 { id: 'agenda', label: 'Agenda del día' },
                 { id: 'resumen', label: 'Resumen del día' },
                 { id: 'servicios', label: 'Servicios realizados' },
                 { id: 'historial', label: 'Historial' },
                 { id: 'notas', label: 'Notas' }
               ].map((tab, tIdx) => {
                 const isActive = staffActiveTab === tab.id;
                 return (
                   <span 
                     key={tab.id} 
                     onClick={() => setStaffActiveTab(tab.id)}
                     style={{ 
                       fontSize: '0.85rem', 
                       fontWeight: isActive ? 800 : 600, 
                       color: isActive ? '#db8c95' : '#a07880', 
                       borderBottom: isActive ? '3px solid #db8c95' : '3px solid transparent', 
                       paddingBottom: '10px', 
                       cursor: 'pointer',
                       transition: 'all 0.15s',
                       whiteSpace: 'nowrap'
                     }}
                   >
                     {tab.label}
                   </span>
                 );
               })}
             </div>

            {/* Dashboard Content Layout conditioned by active tab */}
            {staffActiveTab === 'agenda' && (
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', alignItems: 'flex-start', width: '100%' }}>
                
                {/* Column 1: Daily Agenda Timeline (50% width on Desktop) */}
                <div style={{ flex: 1.5, background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '24px', padding: '24px', minWidth: 0, width: '100%', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#4a3036', margin: '0 0 20px 0' }}>
                    Agenda del {selectedDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
                    {(() => {
                      const staffApps = (() => {
                        const real = dayApps.filter(a => a.staff_id === selectedStaffDrawer.id);
                        if (real.length > 0) return real;
                        
                        // Match the simulation we did for "Who is free now" sidebar
                        const mockList = [];
                        if (selectedStaffDrawer.name.includes('Isabella')) {
                          mockList.push({
                            id: 'sim-1',
                            scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 9, 0),
                            clients: { name: 'María Fernández' },
                            services: { name: 'Volumen 3D', price: 64 },
                            status: 'En Silla'
                          });
                        }
                        if (selectedStaffDrawer.name.includes('Laura')) {
                          mockList.push({
                            id: 'sim-2',
                            scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 9, 30),
                            clients: { name: 'Valentina Gómez' },
                            services: { name: 'Manicura Gel', price: 28 },
                            status: 'Agendado'
                          });
                        }
                        if (selectedStaffDrawer.name.includes('Sofía')) {
                          mockList.push({
                            id: 'sim-3',
                            scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 10, 0),
                            clients: { name: 'Camila Torres' },
                            services: { name: 'Laminación Cejas', price: 22 },
                            status: 'Agendado'
                          });
                        }
                        if (selectedStaffDrawer.name.includes('Camila')) {
                          mockList.push({
                            id: 'sim-4',
                            scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 10, 30),
                            clients: { name: 'Daniela Rojas' },
                            services: { name: 'Extensiones Clásicas', price: 28 },
                            status: 'Agendado'
                          });
                        }
                        if (selectedStaffDrawer.name.includes('Valeria')) {
                          mockList.push({
                            id: 'sim-5',
                            scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 11, 0),
                            clients: { name: 'Andrea Castillo' },
                            services: { name: 'Lifting Pestañas', price: 20 },
                            status: 'Agendado'
                          });
                        }
                        if (selectedStaffDrawer.name.includes('Mariana')) {
                          mockList.push({
                            id: 'sim-6',
                            scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 11, 30),
                            clients: { name: 'Lucía Méndez' },
                            services: { name: 'Color Completo', price: 85 },
                            status: 'En Silla'
                          });
                        }
                        return mockList;
                      })();

                      // Hours to display in timeline (similar to mockup)
                      const hoursList = [
                        { time: '9:00 AM', hourVal: 9 },
                        { time: '10:00 AM', hourVal: 10 },
                        { time: '11:00 AM', hourVal: 11 },
                        { time: '12:00 PM', hourVal: 12 },
                        { time: '1:00 PM', hourVal: 13, isLunch: true },
                        { time: '2:00 PM', hourVal: 14 },
                        { time: '3:00 PM', hourVal: 15 },
                        { time: '4:00 PM', hourVal: 16 },
                        { time: '5:00 PM', hourVal: 17 },
                        { time: '6:00 PM', hourVal: 18 }
                      ];

                      return hoursList.map((slot, idx) => {
                        // Find if there is an appointment at this hour
                        const app = staffApps.find(a => {
                          const sTime = new Date(a.scheduled_at || a.created_at);
                          return sTime.getHours() === slot.hourVal;
                        });

                        // Render different block depending on state
                        return (
                          <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>
                            {/* Time Column */}
                            <div style={{ 
                              fontSize: '0.78rem', 
                              fontWeight: 800, 
                              color: '#a07880', 
                              width: '65px', 
                              textAlign: 'right', 
                              paddingTop: '12px' 
                            }}>
                              {slot.time}
                            </div>

                            {/* Divider line & Slot Content */}
                            <div style={{ flex: 1, position: 'relative', borderLeft: '2px solid rgba(223, 178, 140, 0.12)', paddingLeft: '20px', paddingBottom: '8px' }}>
                              <div style={{ 
                                position: 'absolute', 
                                left: '-5px', 
                                top: '16px', 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                background: 'rgba(223, 178, 140, 0.4)' 
                              }} />

                              {app ? (
                                /* APPOINTMENT BOOKED */
                                <div style={{
                                  padding: '14px 18px',
                                  background: '#fff0f2',
                                  border: '1px solid rgba(219, 140, 149, 0.15)',
                                  borderRadius: '16px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  boxShadow: '0 2px 8px rgba(219,140,149,0.03)'
                                }}>
                                  <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4a3036' }}>
                                      {app.clients?.name || 'Cliente sin nombre'}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#a07880', marginTop: '3px', fontWeight: 600 }}>
                                      {app.services?.name || 'Servicio General'} (1h 30m)
                                    </div>
                                  </div>
                                  <span style={{ 
                                    fontSize: '0.62rem', 
                                    fontWeight: 800, 
                                    background: 'rgba(219,140,149,0.12)', 
                                    color: '#db8c95', 
                                    padding: '4px 10px', 
                                    borderRadius: '20px', 
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                  }}>
                                    Confirmada
                                  </span>
                                </div>
                              ) : slot.isLunch ? (
                                /* LUNCH REST */
                                <div style={{
                                  padding: '12px 18px',
                                  background: '#faf6f2',
                                  border: '1px dashed rgba(223, 178, 140, 0.25)',
                                  borderRadius: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  color: '#a07880'
                                }}>
                                  <Coffee size={15} color="#db8c95" />
                                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Descanso</span>
                                </div>
                              ) : (
                                /* AVAILABLE SLOT */
                                <div style={{
                                  padding: '12px 18px',
                                  background: 'rgba(255, 255, 255, 0.5)',
                                  border: '1px dashed rgba(219, 140, 149, 0.2)',
                                  borderRadius: '16px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <span style={{ fontSize: '0.78rem', color: '#a07880', fontWeight: 650 }}>Disponible</span>
                                  <button 
                                    onClick={() => {
                                      setScheduleModalPreset({ 
                                        staff: selectedStaffDrawer,
                                        initialTime: `${slot.hourVal}:00`
                                      });
                                      setShowScheduleModal(true);
                                    }}
                                    style={{
                                      width: '28px', height: '28px', borderRadius: '8px', border: 'none',
                                      background: '#db8c95', color: '#fff', display: 'flex', alignItems: 'center',
                                      justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(219,140,149,0.2)'
                                    }}
                                    className="btn-hover-scale"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Column 2: Performance Summary & Top Metrics (28% width on Desktop) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                  <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#4a3036', margin: '0 0 20px 0' }}>
                      Resumen del día
                    </h3>

                    {/* Metrics grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                      <div style={{ background: '#faf3f2', padding: '14px', borderRadius: '16px', border: '1px solid rgba(223,178,140,0.06)' }}>
                        <div style={{ fontSize: '0.62rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase' }}>Citas programadas</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#4a3036', marginTop: '4px' }}>
                          {getStaffMetrics(selectedStaffDrawer.id).citasCount}
                        </div>
                      </div>
                      <div style={{ background: '#faf3f2', padding: '14px', borderRadius: '16px', border: '1px solid rgba(223,178,140,0.06)' }}>
                        <div style={{ fontSize: '0.62rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase' }}>Citas completadas</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#22c55e', marginTop: '4px' }}>
                          {getStaffMetrics(selectedStaffDrawer.id).citasCount}
                        </div>
                      </div>
                      <div style={{ background: '#faf3f2', padding: '14px', borderRadius: '16px', border: '1px solid rgba(223,178,140,0.06)', gridColumn: 'span 2' }}>
                        <div style={{ fontSize: '0.62rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase' }}>Ingresos generados</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#db8c95', marginTop: '4px' }}>
                          $ {getStaffMetrics(selectedStaffDrawer.id).revenue.toLocaleString()}
                        </div>
                      </div>
                      
                      {/* Occupancy with visual progress bar */}
                      <div style={{ background: '#faf3f2', padding: '14px', borderRadius: '16px', border: '1px solid rgba(223,178,140,0.06)', gridColumn: 'span 2' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.62rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase' }}>Ocupación del día</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4a3036' }}>{getStaffMetrics(selectedStaffDrawer.id).occupancy}%</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(223, 178, 140, 0.15)', borderRadius: '3px', overflow: 'hidden', marginTop: '8px' }}>
                          <div style={{ height: '100%', background: 'linear-gradient(90deg, #e8a2a9, #db8c95)', width: `${getStaffMetrics(selectedStaffDrawer.id).occupancy}%` }} />
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#a07880', marginTop: '6px', fontWeight: 600 }}>Meta: 80%</div>
                      </div>
                    </div>

                    {/* Free time between appointments */}
                    <div style={{ padding: '14px', background: '#fffbeb', border: '1px solid rgba(217, 119, 6, 0.15)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(217, 119, 6, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0 }}>
                        <Clock size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.58rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase' }}>Tiempo libre entre citas</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>1h 30m <span style={{ fontSize: '0.65rem', color: '#a07880', fontWeight: 500 }}>acumulado</span></div>
                      </div>
                    </div>

                    {/* Most sold services list */}
                    <div style={{ borderTop: '1px solid rgba(223, 178, 140, 0.12)', paddingTop: '16px' }}>
                      <div style={{ fontSize: '0.68rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.3px' }}>
                        Servicios más vendidos hoy
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { rank: 1, name: 'Volumen 3D', qty: 2, rev: 64 },
                          { rank: 2, name: 'Extensiones Clásicas', qty: 1, rev: 28 },
                          { rank: 3, name: 'Retoque Clásico', qty: 1, rev: 6 }
                        ].map(srv => (
                          <div key={srv.rank} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#4a3036', alignItems: 'center' }}>
                            <span style={{ fontWeight: 650, color: '#4a3036' }}>{srv.rank}. {srv.name}</span>
                            <span style={{ fontWeight: 800, color: '#db8c95' }}>{srv.qty} cita(s) · $ {srv.rev}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Clients, Internal Notes & Actions (22% width on Desktop) */}
                <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                  
                  {/* Next Client Card */}
                  <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a07880', margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Cliente Siguiente
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #db8c95', flexShrink: 0 }}>
                        <img 
                          src={`https://api.dicebear.com/9.x/lorelei/svg?seed=Valentina&backgroundColor=f7d4d7`}
                          alt="Valentina Pérez"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#4a3036' }}>Valentina Pérez</div>
                        <div style={{ fontSize: '0.68rem', color: '#a07880', fontWeight: 600 }}>0414 789 4563</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedStaffDrawer(null);
                        window.location.hash = '#clients';
                      }}
                      style={{
                        width: '100%', background: 'transparent', border: '1px solid rgba(219,140,149,0.25)',
                        color: '#db8c95', padding: '8px', borderRadius: '10px', fontSize: '0.72rem',
                        fontWeight: 700, cursor: 'pointer'
                      }}
                      className="btn-hover-scale"
                    >
                      Ver perfil de clienta
                    </button>
                  </div>

                  {/* Internal Notes container */}
                  <div style={{ background: '#fff0f2', border: '1px solid rgba(219,140,149,0.12)', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.01)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a0506a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Notas rápidas
                      </h3>
                      <Pencil size={12} color="#db8c95" style={{ cursor: 'pointer' }} />
                    </div>
                    <textarea 
                      placeholder="Escribe notas de seguimiento..."
                      style={{
                        width: '100%', height: '70px', border: 'none',
                        background: 'transparent', fontSize: '0.76rem', color: '#4a3036', outline: 'none',
                        resize: 'none', fontWeight: 550, lineHeight: '1.4'
                      }}
                      defaultValue="Prefiere rizo C. Productos hipoalergénicos. No usar adhesivo fuerte."
                    />
                  </div>

                  {/* Action buttons list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                        setShowQuickAvailModal?.(true) || showToast?.('Abriendo disponibilidad...', 'info');
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
                        background: 'rgba(74, 48, 54, 0.06)', color: '#4a3036',
                        fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                      }}
                      className="btn-hover-scale"
                    >
                      Ver reporte completo
                    </button>
                  </div>

                  {/* Day Comparison widget */}
                  <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                    <h3 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#a07880', margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Comparativo del día <br /><span style={{ fontSize: '0.62rem', color: '#a07880', fontWeight: 500, textTransform: 'none' }}>vs. día anterior</span>
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        { label: 'Ingresos', pct: '+ 18%', val: '$ 98.00', isUp: true },
                        { label: 'Citas', pct: '+ 25%', val: '4 citas', isUp: true },
                        { label: 'Ocupación', pct: '+ 12%', val: '78%', isUp: true }
                      ].map((cmp, cIdx) => (
                        <div key={cIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                          <span style={{ color: '#8c767b', fontWeight: 600 }}>{cmp.label}</span>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ color: cmp.isUp ? '#16a34a' : '#dc2626', fontWeight: 850, marginRight: '6px' }}>
                              {cmp.isUp ? '↑' : '↓'} {cmp.pct}
                            </span>
                            <span style={{ color: '#4a3036', fontWeight: 800 }}>{cmp.val}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: RESUMEN DEL DÍA */}
            {staffActiveTab === 'resumen' && (
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', width: '100%' }} className="animate-fade-in">
                <div style={{ flex: 2, background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#4a3036', margin: '0 0 20px 0' }}>Análisis de Rendimiento (Hoy)</h3>
                  
                  {/* Visual Chart Bars Mockup */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#4a3036', marginBottom: '6px' }}>
                        <span>Progreso de meta de ingresos diarios ($150.00)</span>
                        <span>{Math.min(100, Math.round((getStaffMetrics(selectedStaffDrawer.id).revenue / 150) * 100))}%</span>
                      </div>
                      <div style={{ height: '14px', background: '#faf3f2', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg, #db8c95, #e8a2a9)', width: `${Math.min(100, Math.round((getStaffMetrics(selectedStaffDrawer.id).revenue / 150) * 100))}%`, transition: 'width 0.8s ease' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#4a3036', marginBottom: '6px' }}>
                        <span>Tiempo activo trabajando (Horas de Servicio)</span>
                        <span>{(getStaffMetrics(selectedStaffDrawer.id).citasCount * 1.5).toFixed(1)} hrs / 8 hrs turno</span>
                      </div>
                      <div style={{ height: '14px', background: '#faf3f2', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg, #16a34a, #22c55e)', width: `${(getStaffMetrics(selectedStaffDrawer.id).citasCount * 1.5 / 8) * 100}%`, transition: 'width 0.8s ease' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '20px' }}>
                      <div style={{ border: '1px solid rgba(223,178,140,0.15)', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.62rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase' }}>Ticket Promedio</span>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#4a3036', marginTop: '4px' }}>
                          $ {getStaffMetrics(selectedStaffDrawer.id).citasCount > 0 ? Math.round(getStaffMetrics(selectedStaffDrawer.id).revenue / getStaffMetrics(selectedStaffDrawer.id).citasCount) : 0}
                        </div>
                      </div>
                      <div style={{ border: '1px solid rgba(223,178,140,0.15)', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.62rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase' }}>Eficiencia</span>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#22c55e', marginTop: '4px' }}>96%</div>
                      </div>
                      <div style={{ border: '1px solid rgba(223,178,140,0.15)', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.62rem', color: '#a07880', fontWeight: 700, textTransform: 'uppercase' }}>Retención Clientes</span>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#db8c95', marginTop: '4px' }}>88%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Quick info */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#a07880', fontWeight: 750 }}>PRODUCTIVIDAD SEMANAL</h4>
                    <p style={{ fontSize: '0.78rem', color: '#4a3036', lineHeight: '1.4' }}>Isabella se encuentra en el <strong>top 3 de productividad</strong> de esta semana en el salón, logrando cubrir el 92% de sus horarios habilitados con citas completadas.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: SERVICIOS REALIZADOS */}
            {staffActiveTab === 'servicios' && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '20px', width: '100%' }} className="animate-fade-in">
                {[
                  { name: 'Volumen 3D', duration: '90 min', price: '$ 64.00', qty: 2, icon: '✨' },
                  { name: 'Extensiones Clásicas', duration: '75 min', price: '$ 28.00', qty: 1, icon: '💅' },
                  { name: 'Retoque Clásico', duration: '45 min', price: '$ 6.00', qty: 1, icon: '🌸' }
                ].map((srv, idx) => (
                  <div key={idx} style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.15)', borderRadius: '20px', padding: '20px', display: 'flex', gap: '14px', alignItems: 'center', boxShadow: '0 4px 15px rgba(74,48,54,0.02)' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(219,140,149,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                      {srv.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#3d2b30' }}>{srv.name}</h4>
                      <div style={{ fontSize: '0.68rem', color: '#a0868c', fontWeight: 650, marginTop: '2px' }}>{srv.duration} · {srv.price} c/u</div>
                      <div style={{ fontSize: '0.72rem', color: '#db8c95', fontWeight: 800, marginTop: '6px' }}>Completados hoy: {srv.qty}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB CONTENT: HISTORIAL */}
            {staffActiveTab === 'historial' && (
              <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '24px', padding: '24px', width: '100%', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }} className="animate-fade-in">
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#4a3036', margin: '0 0 20px 0' }}>Historial del Día (Operación de Hoy)</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '20px', borderLeft: '2px solid rgba(223, 178, 140, 0.12)' }}>
                  {[
                    { time: '10:30 AM', action: 'Completó Cita de María Fernández', details: 'Servicio: Volumen 3D · Recaudado: $ 64.00' },
                    { time: '09:00 AM', action: 'Inició Cita de María Fernández', details: 'Registrado en cabina principal' },
                    { time: '08:45 AM', action: 'Ingreso al salón y check-in de turno', details: 'Estado actualizado a Disponible' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      {/* Timeline node dot */}
                      <div style={{ position: 'absolute', left: '-25px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#db8c95', border: '2px solid #fff', boxShadow: '0 0 0 3px rgba(219,140,149,0.15)' }} />
                      <div style={{ fontSize: '0.65rem', color: '#a07880', fontWeight: 800 }}>{item.time}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#4a3036', marginTop: '2px' }}>{item.action}</div>
                      <div style={{ fontSize: '0.7rem', color: '#8c767b', marginTop: '1px' }}>{item.details}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: NOTAS */}
            {staffActiveTab === 'notas' && (
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', width: '100%' }} className="animate-fade-in">
                <div style={{ flex: 1.5, background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#4a3036', margin: '0 0 16px 0' }}>Bloc de Notas Internas</h3>
                  <textarea 
                    placeholder="Escribe notas generales sobre el desempeño, preferencias de materiales o avisos para esta especialista..."
                    style={{
                      width: '100%', height: '180px', border: '1px solid rgba(223,178,140,0.15)', borderRadius: '16px',
                      background: '#faf6f5', padding: '16px', fontSize: '0.82rem', color: '#4a3036', outline: 'none',
                      resize: 'none', fontWeight: 550, lineHeight: '1.5'
                    }}
                    defaultValue="Nota de cabina: Isabella prefiere utilizar el adhesivo de secado rápido (0.5s) en cabinas con humedad controlada de 50%. En el turno de tarde, requiere asistencia de recepción para la preparación de pestañas pre-armadas."
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                    <button 
                      onClick={() => showToast?.('Notas guardadas correctamente', 'success')}
                      style={{
                        padding: '10px 24px', borderRadius: '12px', border: 'none',
                        background: 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)',
                        color: '#ffffff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(219, 140, 149, 0.2)'
                      }}
                      className="btn-hover-scale"
                    >
                      Guardar notas
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ background: '#fff0f2', border: '1px solid rgba(219,140,149,0.12)', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.01)' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#a0506a', fontWeight: 750 }}>RECORDATORIO</h4>
                    <p style={{ fontSize: '0.78rem', color: '#4a3036', lineHeight: '1.4' }}>Las notas son privadas y solo visibles para administradoras y dueñas del salón en esta consola de CRM.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => { setShowScheduleModal(false); setScheduleModalPreset(null); setAppointmentToEdit(null); }}
        clients={clients}
        services={services}
        staff={staff}
        initialStaff={scheduleModalPreset?.staff || (isWorkerView ? visibleStaff[0] : null)}
        rates={rates}
        defaultDate={selectedDate}
        initialTime={scheduleModalPreset?.initialTime}
        appointmentToEdit={appointmentToEdit}
        onSave={() => { setShowScheduleModal(false); setScheduleModalPreset(null); setAppointmentToEdit(null); loadFilteredAppointments(); }}
      />
      {showNewClientModal && (
        <NewClientModal
          isOpen={showNewClientModal}
          onClose={() => setShowNewClientModal(false)}
          onClientCreated={(c) => { setClients(prev => [...prev, c]); setShowNewClientModal(false); }}
        />
      )}

      {/* DETALLE DE CITA LATERAL DESLIZANTE */}
      {selectedDetailedApp && detailedAppDetails && (() => {
        const { activeStaff, staffNameOnly, staffRoleOnly, formattedDate, formattedTime } = detailedAppDetails;
        return (
          <div 
            className={`staff-drawer-overlay ${isClosingDetailedApp ? 'closing' : ''}`} 
            style={{ zIndex: 15000 }} 
            onClick={triggerCloseDetailedApp}
          >
            <div className="staff-drawer" onClick={(e) => e.stopPropagation()} style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #fffbfb 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              {/* Header */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(223, 178, 140, 0.15)', paddingBottom: '14px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#3d2b30', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.3px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#fff0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#db8c95' }}>
                      <CalendarIcon size={16} />
                    </div>
                    Detalle del <span style={{ color: '#db8c95' }}>Turno</span>
                  </h4>
                  <button 
                    onClick={triggerCloseDetailedApp}
                    style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(74,48,54,0.05)', border: 'none', color: '#8c767b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(219,140,149,0.12)'; e.currentTarget.style.color = '#db8c95'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,48,54,0.05)'; e.currentTarget.style.color = '#8c767b'; }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Client Card (Foto 2 Inspired) */}
                  <div style={{
                    padding: '16px', borderRadius: '16px', border: '1.5px solid rgba(223,178,140,0.22)',
                    display: 'flex', alignItems: 'center', gap: '14px', background: '#ffffff',
                    boxShadow: '0 4px 12px rgba(74, 48, 54, 0.03)'
                  }}>
                    <img 
                      src={`https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(selectedDetailedApp.clients?.name || '')}&radius=50`} 
                      alt={selectedDetailedApp.clients?.name || ''} 
                      style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#fff0f2', border: '2px solid #fff' }} 
                    />
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#a0868c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Clienta</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#3d2b30' }}>{selectedDetailedApp.clients?.name || 'Cliente'}</div>
                      <div style={{ fontSize: '0.74rem', color: '#db8c95', fontWeight: 600, marginTop: '1px' }}>{selectedDetailedApp.clients?.phone || 'Sin número'}</div>
                    </div>
                  </div>

                  {/* Specialist & Service Card */}
                  <div style={{
                    padding: '16px', borderRadius: '16px', border: '1.5px solid rgba(223,178,140,0.18)',
                    display: 'flex', flexDirection: 'column', gap: '12px', background: '#faf8f7'
                  }}>
                    {/* Service Row */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#db8c95', border: '1px solid rgba(223,178,140,0.2)', flexShrink: 0 }}>
                        <Scissors size={14} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.58rem', color: '#a0868c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Servicio contratado</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 850, color: '#3d2b30', marginTop: '1px' }}>{selectedDetailedApp.services?.name || 'Servicio'}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#db8c95', marginTop: '2px' }}>${Number(selectedDetailedApp.total_price || selectedDetailedApp.services?.price || 0).toFixed(2)}</div>
                      </div>
                    </div>

                    <div style={{ height: '1px', background: 'rgba(223, 178, 140, 0.15)' }} />

                    {/* Specialist Row */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <img 
                        src={activeStaff?.photo_url || `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(staffNameOnly)}&radius=50`} 
                        alt={staffNameOnly} 
                        style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#fff', border: '1px solid rgba(223,178,140,0.2)', objectFit: 'cover' }} 
                      />
                      <div>
                        <div style={{ fontSize: '0.58rem', color: '#a0868c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profesional a cargo</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3d2b30', marginTop: '1px' }}>{staffNameOnly}</div>
                        <div style={{ fontSize: '0.68rem', color: '#a0868c', fontWeight: 600 }}>{staffRoleOnly}</div>
                      </div>
                    </div>
                  </div>

                  {/* Time, Date and Status Card */}
                  <div style={{
                    padding: '16px', borderRadius: '16px', border: '1.5px solid rgba(223,178,140,0.18)',
                    display: 'flex', flexDirection: 'column', gap: '10px', background: '#ffffff',
                    boxShadow: '0 4px 12px rgba(74, 48, 54, 0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#8c767b', fontWeight: 600 }}>Fecha:</span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#3d2b30', textTransform: 'capitalize' }}>{formattedDate}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#8c767b', fontWeight: 600 }}>Hora reservada:</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 850, color: '#a0506a' }}>{formattedTime}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#8c767b', fontWeight: 600 }}>Estado:</span>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800,
                        background: STATUS_COLORS[selectedDetailedApp.status]?.bg || '#f3f4f6',
                        color: STATUS_COLORS[selectedDetailedApp.status]?.text || '#374151',
                        border: `1px solid ${STATUS_COLORS[selectedDetailedApp.status]?.border || '#e5e7eb'}`
                      }}>{selectedDetailedApp.status}</span>
                    </div>
                  </div>

                  {/* Notes Card */}
                  {selectedDetailedApp.notes && (
                    <div style={{ 
                      marginTop: '2px', 
                      background: 'rgba(232, 162, 169, 0.03)', 
                      padding: '14px', 
                      borderRadius: '16px', 
                      border: '1.5px solid rgba(223, 178, 140, 0.12)', 
                      borderLeft: '4px solid #db8c95' 
                    }}>
                      <span style={{ fontWeight: 800, color: '#6b4a52', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Notas o Comentarios:</span>
                      <span style={{ color: '#4a3036', fontStyle: 'italic', fontSize: '0.74rem', lineHeight: '1.4', display: 'block' }}>"{selectedDetailedApp.notes}"</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div style={{ borderTop: '1px solid rgba(223, 178, 140, 0.15)', paddingTop: '20px', marginTop: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* Fila 1: Acciones Operativas Principales */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                    <button 
                      onClick={() => {
                        showToast?.('Cita completada con éxito', 'success');
                        triggerCloseDetailedApp();
                      }}
                      className="drawer-btn drawer-btn-complete"
                      style={{ height: '44px', fontSize: '0.8rem', borderRadius: '14px' }}
                    >
                      <Check size={14} strokeWidth={2.5} /> Completar
                    </button>
                    <button 
                      onClick={() => {
                        triggerCloseDetailedApp();
                        setTimeout(() => {
                          setAppointmentToEdit(selectedDetailedApp);
                          setIsReprogramOnly?.(true);
                          setShowScheduleModal(true);
                        }, 280);
                      }}
                      className="drawer-btn drawer-btn-reprogram"
                      style={{ height: '44px', fontSize: '0.8rem', borderRadius: '14px' }}
                    >
                      <Clock size={14} /> Reprogramar
                    </button>
                  </div>

                  {/* Fila 2: Gestión y Estados Auxiliares */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px' }}>
                    <button 
                      onClick={() => {
                        triggerCloseDetailedApp();
                        setTimeout(() => {
                          setAppointmentToEdit(selectedDetailedApp);
                          setIsReprogramOnly?.(false);
                          setShowScheduleModal(true);
                        }, 280);
                      }}
                      className="drawer-btn drawer-btn-edit"
                      style={{ borderRadius: '12px' }}
                    >
                      <Pencil size={12} /> Editar Ficha
                    </button>
                    <button 
                      onClick={async () => {
                        const confirmNoShow = window.confirm('¿Confirmas que la clienta no asistió a su cita programada?');
                        if (confirmNoShow) {
                          try {
                            setLoading(true);
                            await dataService.updateAppointment(selectedDetailedApp.id, { status: 'Cancelada' });
                            showToast?.('Cita marcada como No se presentó', 'warning');
                            triggerCloseDetailedApp();
                            loadFilteredAppointments();
                          } catch (err) {
                            showToast?.('Error al actualizar la cita', 'error');
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                      className="drawer-btn drawer-btn-noshow"
                      style={{ borderRadius: '12px' }}
                    >
                      <AlertTriangle size={12} /> No asistió (No-show)
                    </button>
                  </div>

                  {/* Fila 3: Acciones Críticas Unificadas */}
                  <button 
                    onClick={async () => {
                      const ans = window.confirm(
                        "⚠️ ACCIÓN CRÍTICA\n\n" +
                        "Aceptar: CANCELAR la cita (se mantiene el historial, te preguntará el motivo).\n" +
                        "Cancelar: ELIMINAR permanentemente (borrado total de la grilla).\n\n" +
                        "Presiona 'Aceptar' para Cancelar, o 'Cancelar' para ver la opción de Eliminar."
                      );
                      
                      if (ans) {
                        // Flujo Cancelar Cita
                        const motivo = prompt('Por favor, indica el motivo de la cancelación:');
                        if (motivo !== null) {
                          try {
                            setLoading(true);
                            await dataService.updateAppointment(selectedDetailedApp.id, { status: 'Cancelada' });
                            showToast?.(`Cita cancelada. Motivo: ${motivo || 'No indicado'}`, 'error');
                            triggerCloseDetailedApp();
                            loadFilteredAppointments();
                          } catch (err) {
                            showToast?.('Error al cancelar la cita', 'error');
                          } finally {
                            setLoading(false);
                          }
                        }
                      } else {
                        // Confirmar eliminación total
                        const doubleCheck = window.confirm('🛑 ATENCIÓN: ¿Segura de que quieres ELIMINAR permanentemente este turno? Esta acción destruirá el registro por completo.');
                        if (doubleCheck) {
                          try {
                            setLoading(true);
                            await dataService.deleteAppointment(selectedDetailedApp.id);
                            showToast?.('Cita eliminada permanentemente', 'success');
                            triggerCloseDetailedApp();
                            loadFilteredAppointments();
                          } catch (err) {
                            showToast?.('Error al eliminar la cita', 'error');
                          } finally {
                            setLoading(false);
                          }
                        }
                      }
                    }}
                    className="drawer-btn drawer-btn-danger"
                    style={{ width: '100%', marginTop: '4px', borderRadius: '12px' }}
                  >
                    <XCircle size={12} /> Gestionar Cancelación / Eliminar Cita
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Context Menu (Quick actions from outside) */}
      {quickContextMenu && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 16000, background: 'transparent' }} 
            onClick={() => setQuickContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setQuickContextMenu(null); }}
          />
          <div style={{
            position: 'fixed',
            left: `${Math.min(quickContextMenu.x, window.innerWidth - 200)}px`,
            top: `${Math.min(quickContextMenu.y, window.innerHeight - 350)}px`,
            width: '190px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(74, 48, 54, 0.15)',
            border: '1px solid rgba(223, 178, 140, 0.25)',
            padding: '6px',
            zIndex: 16001,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            animation: 'fadeIn 0.12s ease-out'
          }}>
            <div style={{ padding: '6px 8px', fontSize: '0.62rem', fontWeight: 700, color: '#a07880', borderBottom: '1px solid #f5ebe8', marginBottom: '4px' }}>
              ⚡ Acciones: {quickContextMenu.app.clients?.name || 'Cita'}
            </div>
            
            {/* Quick Status Submenu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#c97282', padding: '2px 8px 4px 8px' }}>ESTADO ACTUAL:</div>
              {['Agendado', 'En Silla', 'En Tratamiento', 'Por Pagar', 'Completado'].map(st => {
                const isCurrent = quickContextMenu.app.status === st;
                return (
                  <button
                    key={st}
                    onClick={async () => {
                      try {
                        setLoading(true);
                        await dataService.updateAppointment(quickContextMenu.app.id, { status: st });
                        showToast?.(`Estado actualizado a: ${st}`, 'success');
                        setQuickContextMenu(null);
                        loadFilteredAppointments();
                      } catch (err) {
                        console.error(err);
                        showToast?.('Error al actualizar estado', 'error');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    style={{
                      padding: '5px 8px', fontSize: '0.68rem', textAlign: 'left', border: 'none', borderRadius: '6px',
                      background: isCurrent ? 'rgba(232, 162, 169, 0.15)' : 'transparent',
                      color: isCurrent ? '#a0506a' : '#4a3036', fontWeight: isCurrent ? 750 : 500, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}
                    className="btn-hover-scale"
                  >
                    <span>{st}</span>
                    {isCurrent && <span style={{ fontSize: '0.6rem' }}>✓</span>}
                  </button>
                );
              })}
            </div>

            <div style={{ height: '1px', background: '#f5ebe8', margin: '4px 0' }} />

            {/* Postpone Appointment (Reagendar / Posponer por horas) */}
            <button
              onClick={async () => {
                const hoursInput = prompt('¿Cuántas horas o minutos deseas posponer esta cita? (Ej: "30" para 30 minutos, o "2h" para 2 horas):');
                if (hoursInput) {
                  try {
                    let minutesToAdd = parseInt(hoursInput) || 0;
                    if (hoursInput.toLowerCase().endsWith('h')) {
                      minutesToAdd = (parseInt(hoursInput) * 60) || 0;
                    }
                    if (minutesToAdd > 0) {
                      setLoading(true);
                      const current = new Date(quickContextMenu.app.scheduled_at || quickContextMenu.app.created_at);
                      const newTime = new Date(current.getTime() + minutesToAdd * 60000);
                      await dataService.updateAppointment(quickContextMenu.app.id, { scheduled_at: newTime.toISOString() });
                      showToast?.(`Cita pospuesta por ${hoursInput}`, 'success');
                      setQuickContextMenu(null);
                      loadFilteredAppointments();
                    } else {
                      showToast?.('Cantidad no válida', 'error');
                    }
                  } catch (err) {
                    console.error(err);
                    showToast?.('Error al posponer', 'error');
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              style={{
                padding: '6px 8px', fontSize: '0.68rem', textAlign: 'left', border: 'none', borderRadius: '6px',
                background: 'transparent', color: '#db8c95', fontWeight: 650, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
              className="btn-hover-scale"
            >
              ⏰ Posponer / Retrasar...
            </button>

            <div style={{ height: '1px', background: '#f5ebe8', margin: '4px 0' }} />

            {/* Delete Appointment */}
            <button
              onClick={async () => {
                const confirmDel = window.confirm(`¿Segura de que quieres eliminar la cita de ${quickContextMenu.app.clients?.name || 'esta clienta'}?`);
                if (confirmDel) {
                  try {
                    setLoading(true);
                    await dataService.deleteAppointment(quickContextMenu.app.id);
                    showToast?.('Cita eliminada permanentemente', 'success');
                    setQuickContextMenu(null);
                    loadFilteredAppointments();
                  } catch (err) {
                    console.error(err);
                    showToast?.('Error al eliminar cita', 'error');
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              style={{
                padding: '6px 8px', fontSize: '0.68rem', textAlign: 'left', border: 'none', borderRadius: '6px',
                background: 'rgba(220, 38, 38, 0.05)', color: '#dc2626', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
              className="btn-hover-scale"
            >
              🗑️ Eliminar permanentemente
            </button>
          </div>
        </>
      )}
      {/* POPUP SELECTOR DE ESTADOS DISEÑADO (Premium Glow Up) */}
      {statusEditingApp && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 16000, background: 'transparent' }} 
            onClick={() => setStatusEditingApp(null)}
          />
          <div 
            style={{
              position: 'absolute',
              left: `${Math.min(statusEditingApp.x, window.innerWidth - 180)}px`,
              top: `${statusEditingApp.y + 4}px`,
              width: '160px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(74, 48, 54, 0.12)',
              border: '1px solid rgba(223, 178, 140, 0.25)',
              padding: '6px',
              zIndex: 16001,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              animation: 'fadeIn 0.12s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              padding: '5px 8px 6px 8px', 
              fontSize: '0.58rem', 
              fontWeight: 800, 
              color: '#db8c95', 
              borderBottom: '1px solid #fcf7f6', 
              marginBottom: '3px',
              textTransform: 'uppercase',
              letterSpacing: '0.4px'
            }}>
              Selecciona Estado:
            </div>
            {[
              { status: 'Agendado', label: 'Agendado', bg: 'rgba(34, 197, 94, 0.08)', color: '#16a34a', icon: <CheckCircle2 size={12} /> },
              { status: 'En Silla', label: 'En Silla', bg: 'rgba(168, 85, 247, 0.08)', color: '#a855f7', icon: <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7' }} /> },
              { status: 'En Tratamiento', label: 'En Tratamiento', bg: 'rgba(168, 85, 247, 0.14)', color: '#9333ea', icon: <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#9333ea', boxShadow: '0 0 4px #9333ea' }} /> },
              { status: 'Por Pagar', label: 'Por Pagar', bg: 'rgba(217, 119, 6, 0.08)', color: '#d97706', icon: <Clock size={12} /> },
              { status: 'Completado', label: 'Completado', bg: 'rgba(34, 197, 94, 0.14)', color: '#15803d', icon: <Check size={12} /> },
              { status: 'Cancelado', label: 'Cancelado', bg: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', icon: <XCircle size={12} /> }
            ].map(st => {
              const isCurrent = statusEditingApp.currentStatus === st.status;
              return (
                <button
                  key={st.status}
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await dataService.updateAppointment(statusEditingApp.appId, { status: st.status });
                      showToast?.(`Estado actualizado a: ${st.status}`, 'success');
                      setStatusEditingApp(null);
                      loadFilteredAppointments();
                    } catch (err) {
                      console.error(err);
                      showToast?.('Error al actualizar estado', 'error');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{
                    padding: '8px 10px',
                    fontSize: '0.72rem',
                    textAlign: 'left',
                    border: 'none',
                    borderRadius: '10px',
                    background: isCurrent ? 'rgba(219, 140, 149, 0.08)' : 'transparent',
                    color: isCurrent ? '#db8c95' : '#4a3036',
                    fontWeight: isCurrent ? 800 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.18s'
                  }}
                  className="btn-hover-scale"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = st.bg;
                    e.currentTarget.style.color = st.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isCurrent ? 'rgba(219, 140, 149, 0.08)' : 'transparent';
                    e.currentTarget.style.color = isCurrent ? '#db8c95' : '#4a3036';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', flexShrink: 0 }}>
                    {st.icon}
                  </div>
                  <span style={{ flex: 1 }}>{st.label}</span>
                  {isCurrent && <span style={{ fontSize: '0.62rem', color: '#db8c95', fontWeight: 900 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
      {/* POPUP DETALLE DE DISPONIBILIDAD DE ESPECIALISTA - REDIRIGIDO A PERFIL DIRECTAMENTE SIN POPUP */}
      {selectedStaffAvailDetail && (() => {
        // Instead of opening a popup, immediately open the full-screen sliding profile drawer
        setTimeout(() => {
          setSelectedStaffDrawer(selectedStaffAvailDetail.staff);
          setSelectedStaffAvailDetail(null);
        }, 10);
        return null;
      })()}
    </div>
  );
};

export default SchedulingModule;
