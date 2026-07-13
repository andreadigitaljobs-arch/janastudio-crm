import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon, Clock, User, Plus, ChevronLeft, ChevronRight,
  ChevronDown, Search, Pencil,
  CheckCircle2, Users, UserCheck,
  CalendarDays, StickyNote, BarChart3, XCircle, Bell,
  DollarSign, Info, AlertTriangle, Coffee, Sliders, Check, HelpCircle, Scissors, Sparkles, Sun, MessageCircle, Circle, Star
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
import { getBusinessDateKey, businessDateStart } from '../utils/dateTime';
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

// Franjas horarias para filtrar el listado de "Citas de hoy"
const TIME_PERIODS = [
  { key: 'all', label: 'Todo el día' },
  { key: 'manana', label: 'Mañana', startMin: 0, endMin: 12 * 60 },
  { key: 'mediodia', label: 'Mediodía', startMin: 12 * 60, endMin: 14 * 60 },
  { key: 'tarde', label: 'Tarde', startMin: 14 * 60, endMin: 18 * 60 },
  { key: 'noche', label: 'Noche', startMin: 18 * 60, endMin: 24 * 60 },
];
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
      <div className="mi-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2d1b22', margin: 0, textTransform: 'capitalize' }}>
          {monthName}
        </h3>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handlePrev}
            className="mi-btn"
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
            className="mi-btn"
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
              className="mi-btn"
              style={{
                width: '100%',
                maxWidth: '32px',
                aspectRatio: '1 / 1',
                borderRadius: '10px',
                border: 'none',
                background: selected
                  ? 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)'
                  : todayMark
                    ? 'rgba(232, 162, 169, 0.15)'
                    : 'transparent',
                color: selected
                  ? '#fff'
                  : todayMark
                    ? '#c97282'
                    : d.currentMonth
                      ? '#2d1b22'
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
            : 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: '0.72rem',
          boxShadow: checkingTime != null && isCheckingFree ? '0 0 8px #22c55e' : 'none'
        }}>{initial}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2d1b22', lineHeight: 1.3 }}>
            {staffMember.name}
          </div>
          <div style={{ fontSize: '0.62rem', color: '#a0909a', fontWeight: 600 }}>
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
        className="hover-glow"
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
            height: '2px', background: '#c97282', zIndex: 5, boxShadow: '0 0 4px rgba(201, 114, 130,0.6)'
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
              className={`mi-card ${isMultipleApp ? "agenda-appointment-multiple-selected" : ""}`}
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
              <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#2d1b22', lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: '2px' }}>
                {isMultipleApp && <span>🔗</span>}
                {clientName}
              </div>
              {height > 32 && <div style={{ fontSize: '0.58rem', color: '#a0909a', fontWeight: 600, lineHeight: 1.3 }}>{app.services?.name || 'Servicio'}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getWhatsAppNumber = (phone) => {
  if (!phone) return '';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0') && clean.length === 11) return '58' + clean.slice(1);
  if (clean.length === 10) return '58' + clean;
  return clean;
};

const SchedulingModule = ({ isMobile, isTablet = false, isCollapsed = false, rates, openScheduleModal = false, modalKey = null, onOpenNotifications, onNavigate }) => {
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
  const [dateNavDir, setDateNavDir] = useState('next');
  const goToDate = (newDate, dir) => { setDateNavDir(dir); setSelectedDate(newDate); };
  const calendarBtnRef = useRef(null);
  const [calendarPos, setCalendarPos] = useState({ top: 0, left: 0 });
  const CALENDAR_POPUP_WIDTH = 280;

  const openHeaderCalendar = () => {
    const rect = calendarBtnRef.current?.getBoundingClientRect();
    if (rect) {
      const margin = 12;
      const idealLeft = rect.left + rect.width / 2 - CALENDAR_POPUP_WIDTH / 2;
      const clampedLeft = Math.min(
        Math.max(idealLeft, margin),
        window.innerWidth - CALENDAR_POPUP_WIDTH - margin
      );
      setCalendarPos({ top: rect.bottom + 12, left: clampedLeft });
    }
    setShowHeaderCalendar(prev => !prev);
  };
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
  const [clientPastAppointments, setClientPastAppointments] = useState([]);

  useEffect(() => {
    if (!selectedDetailedApp?.clients?.id) { setClientPastAppointments([]); return; }
    let cancelled = false;
    dataService.getClientPastAppointments(selectedDetailedApp.clients.id, selectedDetailedApp.id)
      .then(data => { if (!cancelled) setClientPastAppointments(data); })
      .catch(() => { if (!cancelled) setClientPastAppointments([]); });
    return () => { cancelled = true; };
  }, [selectedDetailedApp?.id, selectedDetailedApp?.clients?.id]);

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
  // Filtro del timeline "Citas de hoy": 'all' = "Todos" (todas las citas del día, por defecto),
  // o el id de una especialista puntual.
  const [mobileStaffFilter, setMobileStaffFilter] = useState('all');
  const [timeOfDayFilter, setTimeOfDayFilter] = useState('all'); // 'all' | 'manana' | 'mediodia' | 'tarde' | 'noche'
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [hoveredStaffId, setHoveredStaffId] = useState(null);
  const [showHeaderCalendar, setShowHeaderCalendar] = useState(false);

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
  }, [selectedDate, filterType, staff]);

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
    const handleOpenNewAppointment = () => {
      setScheduleModalPreset(null);
      setShowScheduleModal(true);
    };

    window.addEventListener('jana:data-changed', refreshOnAppointmentChange);
    window.addEventListener('jana:mock-schedule-changed', refreshOnScheduleChange);
    window.addEventListener('jana:open-new-appointment', handleOpenNewAppointment);
    
    return () => {
      window.removeEventListener('jana:data-changed', refreshOnAppointmentChange);
      window.removeEventListener('jana:mock-schedule-changed', refreshOnScheduleChange);
      window.removeEventListener('jana:open-new-appointment', handleOpenNewAppointment);
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
      let appointments = [];
      try {
        const data = await dataService.getAppointmentServicesFlat(start.toISOString(), endQuery.toISOString());
        appointments = data.filter(a => a.status !== 'Cancelada' && a.status !== 'Cancelado');
      } catch (fetchErr) {
        console.error('Error cargando citas reales, se usarán datos demo si aplica:', fetchErr);
        appointments = [];
      }

      // Si no hay citas y es hoy, añadir citas demo
      if (appointments.length === 0 && filterType === 'day') {
        const todayKey = getBusinessDateKey(new Date());
        const selectedKey = getBusinessDateKey(selectedDate);
        if (todayKey === selectedKey) {
          // Anclado a la medianoche de la fecha de negocio seleccionada (no a "ahora"),
          // para que las citas no se corran al día siguiente según la hora en que se cargue la página.
          const dayStart = businessDateStart(selectedKey).getTime();
          const at = (hour) => new Date(dayStart + hour * 60 * 60000).toISOString();
          const demoAppts = [
            {
              id: 'demo-1', client_id: '1', staff_id: staff[0]?.id || 'demo-staff-1',
              clients: { name: 'María Fernández', phone: '04121234567' },
              services: { name: 'Extensión de Pestañas', price: 600 },
              scheduled_at: at(9),
              status: 'En Silla'
            },
            {
              id: 'demo-2', client_id: '2', staff_id: staff[1]?.id || 'demo-staff-2',
              clients: { name: 'Valentina Gómez', phone: '04149876543' },
              services: { name: 'Diseño de Cejas', price: 400 },
              scheduled_at: at(9.5),
              status: 'En Proceso'
            },
            {
              id: 'demo-3', client_id: '3', staff_id: staff[2]?.id || 'demo-staff-3',
              clients: { name: 'Camila Torres', phone: '04162341234' },
              services: { name: 'Corte y Color', price: 800 },
              scheduled_at: at(10),
              status: 'En Silla'
            },
            {
              id: 'demo-4', client_id: '4', staff_id: staff[3]?.id || 'demo-staff-4',
              clients: { name: 'Daniela Rojas', phone: '04125678901' },
              services: { name: 'Manicura + Pedicura', price: 500 },
              scheduled_at: at(10.5),
              status: 'En Tratamiento'
            },
            {
              id: 'demo-5', client_id: '5', staff_id: staff[4]?.id || 'demo-staff-5',
              clients: { name: 'Andrea Castillo', phone: '04149234567' },
              services: { name: 'Microblading', price: 1200 },
              scheduled_at: at(11),
              status: 'Completado'
            },
            {
              id: 'demo-6', client_id: '6', staff_id: staff[5]?.id || 'demo-staff-6',
              clients: { name: 'Lucía Méndez', phone: '04128765432' },
              services: { name: 'Tratamiento Facial', price: 550 },
              scheduled_at: at(11.5),
              status: 'Agendado'
            },
            {
              id: 'demo-7', client_id: '7', staff_id: staff[0]?.id || 'demo-staff-1',
              clients: { name: 'Paula Martínez', phone: '04141234567' },
              services: { name: 'Extensión de Pestañas', price: 600 },
              scheduled_at: at(14.5),
              status: 'Agendado'
            },
            {
              id: 'demo-8', client_id: '8', staff_id: staff[1]?.id || 'demo-staff-2',
              clients: { name: 'Sofía López', phone: '04169876543' },
              services: { name: 'Diseño de Cejas', price: 400 },
              scheduled_at: at(15),
              status: 'Agendado'
            },
            {
              id: 'demo-9', client_id: '9', staff_id: staff[2]?.id || 'demo-staff-3',
              clients: { name: 'Valentina Ruiz', phone: '04162341234' },
              services: { name: 'Corte y Arreglo', price: 450 },
              scheduled_at: at(15.5),
              status: 'Agendado'
            },
            {
              id: 'demo-10', client_id: '10', staff_id: staff[3]?.id || 'demo-staff-4',
              clients: { name: 'Karla Sánchez', phone: '04125678901' },
              services: { name: 'Pedicura Decorada', price: 350 },
              scheduled_at: at(16),
              status: 'Agendado'
            }
          ];
          appointments = demoAppts;
        }
      }

      setAppointments(appointments);
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
    <div className="animate-fade-in agenda-module" style={{ paddingBottom: isMobile ? 'calc(100px + env(safe-area-inset-bottom, 12px))' : '40px' }}>
      
      {/* HEADER EXACTLY LIKE THE MOCKUP */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '28px', 
        padding: '12px 0 16px 0', 
        flexWrap: 'wrap', 
        gap: '20px',
        position: 'relative',
        width: '100%'
      }}>
        {/* Background Ambient Glow */}
        <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(212,160,154,0.18) 0%, rgba(212,160,154,0) 70%)', pointerEvents: 'none', zIndex: 0 }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: isMobile ? '100%' : 'auto', gap: '16px', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: isMobile ? '38px' : '46px', height: isMobile ? '38px' : '46px', borderRadius: isMobile ? '12px' : '14px', background: 'var(--magenta-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(160, 80, 106, 0.15)', flexShrink: 0 }}>
              <CalendarIcon size={isMobile ? 16 : 20} color="white" />
            </div>
            <div>
              <h1 className="jana-page-title" style={{ margin: 0, fontSize: isMobile ? '20px' : '28px', letterSpacing: '-0.6px', fontWeight: '850', color: 'var(--text-primary)' }}>
                Agenda
              </h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: isMobile ? '12px' : '14px', fontWeight: '500' }}>
                Controla el rendimiento y la disponibilidad de tu equipo.
              </p>
            </div>
          </div>

          {/* On mobile the bell moves up here, next to the title, instead of wrapping alone below the date selector */}
          {isMobile && (
            <button
              onClick={onOpenNotifications}
              className="mi-btn"
              style={{
                width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                background: '#ffffff', border: '1px solid rgba(223, 178, 140, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative',
                color: '#2d1b22',
                boxShadow: '0 2px 8px rgba(74, 48, 54, 0.03)', transition: 'all 0.2s'
              }}
            >
              <Bell size={18} />
              {unreadNotifsCount > 0 && (
                <div style={{
                  position: 'absolute', top: '10px', right: '10px',
                  backgroundColor: '#c97282', width: '7px', height: '7px',
                  borderRadius: '50%',
                }} />
              )}
            </button>
          )}
        </div>

        {/* Date Selector and Buttons on Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          {/* Simplified Date Navigation Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', borderRadius: '12px', border: '1px solid rgba(223, 178, 140, 0.3)', padding: '4px 8px', boxShadow: '0 2px 8px rgba(74, 48, 54, 0.03)' }}>
            {/* Hoy button */}
            <button
              onClick={() => setSelectedDate(new Date())}
              className="mi-btn"
              style={{
                padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', color: '#2d1b22',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(212, 160, 154, 0.1)';
                e.currentTarget.style.color = '#c97282';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#2d1b22';
              }}
            >
              Hoy
            </button>

            {/* Divider */}
            <div style={{ width: '1px', height: '20px', background: 'rgba(223, 178, 140, 0.2)', marginLeft: '4px', marginRight: '4px' }} />

            {/* Custom Date Picker Trigger (Calendar Icon) */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginRight: '4px' }}>
              <button
                ref={calendarBtnRef}
                title="Elegir fecha"
                onClick={openHeaderCalendar}
                className="mi-btn"
                style={{
                  padding: '6px 10px', borderRadius: '10px', border: 'none', background: 'rgba(201, 114, 130, 0.1)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 0.2s ease', color: '#c97282'
                }}
                onMouseEnter={(e) => {
                  if (!showHeaderCalendar) e.currentTarget.style.background = 'rgba(201, 114, 130, 0.2)';
                }}
                onMouseLeave={(e) => {
                  if (!showHeaderCalendar) e.currentTarget.style.background = 'rgba(201, 114, 130, 0.1)';
                }}
              >
                <CalendarDays size={16} strokeWidth={2.5} />
                <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>Mes</span>
              </button>
              
              {/* Custom Dropdown Calendar */}
              {showHeaderCalendar && (
                <>
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
                    onClick={() => setShowHeaderCalendar(false)}
                  />
                  <div
                    style={{
                      position: 'fixed', top: `${calendarPos.top}px`, left: `${calendarPos.left}px`,
                      width: '280px', maxWidth: 'calc(100vw - 24px)', maxHeight: 'calc(100vh - 24px)', overflowY: 'auto',
                      background: 'rgba(252, 249, 248, 0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                      borderRadius: '16px', boxShadow: '0 16px 40px rgba(74, 48, 54, 0.12)',
                      border: '1px solid rgba(223, 178, 140, 0.3)', padding: '16px', zIndex: 1000,
                      animation: 'fadeInUpWow 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const prev = new Date(selectedDate);
                          prev.setMonth(prev.getMonth() - 1);
                          setSelectedDate(prev);
                        }}
                        className="mi-btn"
                        style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(201, 114, 130, 0.08)', border: 'none', color: '#c97282', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201, 114, 130, 0.15)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201, 114, 130, 0.08)' }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2d1b22', margin: 0, textTransform: 'capitalize' }}>
                        {selectedDate.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = new Date(selectedDate);
                          next.setMonth(next.getMonth() + 1);
                          setSelectedDate(next);
                        }}
                        className="mi-btn"
                        style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(201, 114, 130, 0.08)', border: 'none', color: '#c97282', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201, 114, 130, 0.15)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201, 114, 130, 0.08)' }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                      {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
                        <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#a0909a', padding: '4px 0' }}>{day}</div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                      {(() => {
                        const year = selectedDate.getFullYear();
                        const month = selectedDate.getMonth();
                        const firstDay = new Date(year, month, 1).getDay();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const offset = firstDay === 0 ? 6 : firstDay - 1;
                        const days = [];

                        for (let i = 0; i < offset; i++) {
                          days.push(<div key={`empty-${i}`} />);
                        }

                        for (let day = 1; day <= daysInMonth; day++) {
                          const dateObj = new Date(year, month, day);
                          const dateKey = getBusinessDateKey(dateObj);
                          const isSelected = dateKey === getBusinessDateKey(selectedDate);
                          const isToday = dateKey === getBusinessDateKey(new Date());

                          days.push(
                            <button
                              key={day}
                              onClick={() => {
                                setSelectedDate(dateObj);
                                setShowHeaderCalendar(false);
                              }}
                              className="mi-btn"
                              style={{
                                padding: '8px 0', borderRadius: '8px', border: 'none',
                                background: isSelected ? 'var(--magenta-primary)' : isToday ? 'rgba(201, 114, 130, 0.15)' : 'transparent',
                                color: isSelected ? '#fff' : isToday ? '#c97282' : '#2d1b22',
                                fontWeight: isSelected || isToday ? 800 : 600,
                                cursor: 'pointer', fontSize: '0.75rem',
                                transition: 'all 0.2s',
                                outline: isToday && !isSelected ? '1px solid rgba(201, 114, 130, 0.5)' : 'none'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.background = 'rgba(201, 114, 130, 0.1)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.background = isToday ? 'rgba(201, 114, 130, 0.15)' : 'transparent';
                              }}
                            >
                              {day}
                            </button>
                          );
                        }
                        return days;
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Navigator Arrows with Date */}
            <button
              onClick={() => goToDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1), 'prev')}
              className="mi-btn"
              style={{
                width: '28px', height: '28px', borderRadius: '8px', background: 'transparent',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#c97282', cursor: 'pointer',
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

            <span key={selectedDate.toDateString()} className={dateNavDir === 'next' ? 'animate-date-enter' : 'animate-date-prev'} style={{ display: 'inline-block', fontSize: '0.78rem', fontWeight: '600', color: '#2d1b22', minWidth: '65px', textAlign: 'center' }}>
              {selectedDate.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}
            </span>

            <button
              onClick={() => goToDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1), 'next')}
              className="mi-btn"
              style={{
                width: '28px', height: '28px', borderRadius: '8px', background: 'transparent',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#c97282', cursor: 'pointer',
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

          {/* Bell Notifications (desktop only — on mobile it moved up next to the title) */}
          {!isMobile && (
            <button
              onClick={onOpenNotifications}
              className="mi-btn"
              style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: '#ffffff', border: '1px solid rgba(223, 178, 140, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative',
                color: '#2d1b22',
                boxShadow: '0 2px 8px rgba(74, 48, 54, 0.03)', transition: 'all 0.2s'
              }}
            >
              <Bell size={18} />
              {unreadNotifsCount > 0 && (
                <div style={{
                  position: 'absolute', top: '10px', right: '10px',
                  backgroundColor: '#c97282', width: '7px', height: '7px',
                  borderRadius: '50%',
                }} />
              )}
            </button>
          )}

          {/* + Nueva cita */}
          <button
            onClick={() => { setScheduleModalPreset(null); setShowScheduleModal(true); }}
            className="mi-btn"
            style={{
              padding: isMobile ? '12px 20px' : '8px 18px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)',
              color: '#fff', fontSize: isMobile ? '0.95rem' : '0.82rem', fontWeight: 700,
              cursor: 'pointer', display: isMobile ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              flex: isMobile ? '1 1 100%' : 'none',
              boxShadow: '0 4px 15px rgba(201, 114, 130,0.25)',
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
              e.currentTarget.style.boxShadow = '0 12px 28px rgba(201, 114, 130,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(201, 114, 130,0.25)';
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

          {/* THREE-COLUMN CONTENT GRID */}
          {(isMobile || isTablet) && (
            <div style={{ 
              display: 'flex', position: 'relative', marginBottom: '24px', 
              background: 'rgba(252, 249, 248, 0.7)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              padding: '6px', borderRadius: '18px', border: '1px solid rgba(223, 178, 140, 0.25)', 
              flexShrink: 0, boxShadow: '0 8px 32px rgba(74, 48, 54, 0.04)'
            }}>
              {/* Sliding Pill Background */}
              <div style={{
                position: 'absolute', top: '6px', bottom: '6px', left: '6px',
                width: 'calc((100% - 12px) / 2)', background: '#ffffff',
                borderRadius: '14px', boxShadow: '0 4px 12px rgba(201, 114, 130, 0.15), 0 1px 2px rgba(0,0,0,0.02)',
                border: '1px solid rgba(201, 114, 130, 0.1)',
                transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: `translateX(${leftTab === 'citas' ? '0%' : '100%'})`
              }} />

              {/* Buttons */}
              <button onClick={() => setLeftTab('citas')} className="mi-btn" style={{ flex: 1, position: 'relative', padding: '12px 4px', borderRadius: '14px', border: 'none', background: 'transparent', color: leftTab === 'citas' ? '#c97282' : '#a0909a', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', transition: 'color 0.3s, transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.95)'} onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                <Scissors size={16} strokeWidth={leftTab === 'citas' ? 2.5 : 2} /> Citas
              </button>
              <button onClick={() => setLeftTab('especialistas')} className="mi-btn" style={{ flex: 1, position: 'relative', padding: '12px 4px', borderRadius: '14px', border: 'none', background: 'transparent', color: leftTab === 'especialistas' ? '#c97282' : '#a0909a', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', transition: 'color 0.3s, transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.95)'} onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                <Users size={16} strokeWidth={leftTab === 'especialistas' ? 2.5 : 2} /> Personal
              </button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : 'repeat(2, 1fr)', gap: (isMobile || isTablet) ? '16px' : '24px', width: '100%', alignItems: 'start', marginTop: '0' }}>

            {/* Column 1 - Próximas Citas */}
            <div style={{ display: (!(isMobile || isTablet) || leftTab === 'citas') ? 'flex' : 'none', flexDirection: 'column', gap: '24px', minWidth: 0, animation: ((isMobile || isTablet) && leftTab === 'citas') ? 'fadeInUpWow 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none' }}>

              {/* TIMELINE AGENDA - PREMIUM */}
              <div className="agenda-glass-card" style={{ padding: '0', display: 'flex', flexDirection: 'column', minHeight: '600px', overflow: 'hidden' }}>
                
                {/* Header of Timeline */}
                <div style={{
                  padding: '20px 20px 15px', display: 'flex', flexWrap: 'wrap',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center',
                  gap: isMobile ? '12px' : '14px',
                  borderBottom: '1px solid rgba(223, 178, 140, 0.2)', background: 'rgba(255,255,255,0.5)'
                }}>
                  <h4 className="mi-section-header" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2d1b22', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <Clock size={16} color="#c97282" />
                    CITAS DE HOY
                  </h4>
                  {visibleStaff.length > 0 && (
                    <div style={{ width: isMobile ? '100%' : '150px', minWidth: '120px', flexShrink: 1 }}>
                      <JanaSelect
                        variant="light"
                        label=""
                        value={mobileStaffFilter || visibleStaff[0].id}
                        onChange={(val) => setMobileStaffFilter(val)}
                        options={[
                          { value: 'all', label: 'Todos' },
                          ...visibleStaff.map(s => ({ value: s.id, label: s.name.split(' ')[0], image: s.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100' }))
                        ]}
                      />
                    </div>
                  )}
                </div>

                {/* Filtro de franja horaria */}
                {dayApps.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(85px, 1fr))', gap: '6px', padding: '12px 20px', borderBottom: '1px solid rgba(223, 178, 140, 0.15)', background: 'rgba(255,255,255,0.3)' }}>
                    {TIME_PERIODS.map(period => (
                      <button
                        key={period.key}
                        onClick={() => setTimeOfDayFilter(period.key)}
                        className="mi-chip"
                        style={{
                          padding: '7px 10px', borderRadius: '10px', cursor: 'pointer',
                          fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'center',
                          background: timeOfDayFilter === period.key ? '#c97282' : '#faf3f2',
                          color: timeOfDayFilter === period.key ? '#fff' : '#a0506a',
                          border: '1px solid ' + (timeOfDayFilter === period.key ? '#c97282' : 'rgba(160,80,106,0.15)'),
                          transition: 'all 0.2s'
                        }}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Empty State Override if NO appointments for the WHOLE DAY (across all selected staff) */}
                {dayApps.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, background: 'rgba(252, 249, 248, 0.5)' }}>
                    <div style={{
                      width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, #fdf4f5 0%, #fae6e9 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
                      boxShadow: '0 8px 24px rgba(201, 114, 130, 0.15), inset 0 0 20px rgba(255,255,255,1)'
                    }}>
                      <Sun size={42} strokeWidth={1.5} color="#c97282" />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2d1b22', margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>Día Libre</h3>
                    <p style={{ fontSize: '0.85rem', color: '#a0909a', margin: '0 0 24px 0', maxWidth: '240px', lineHeight: 1.5 }}>
                      No hay citas programadas para hoy. Aprovecha el día o agrega una nueva cita.
                    </p>
                    <button 
                      onClick={() => window.dispatchEvent(new Event('jana:open-new-appointment'))}
                      className="mi-btn"
                      style={{ 
                        background: 'linear-gradient(135deg, #c97282 0%, #a0506a 100%)', 
                        color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '14px', 
                        fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', 
                        boxShadow: '0 8px 20px rgba(201, 114, 130, 0.35), 0 2px 4px rgba(201, 114, 130, 0.2)', 
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(201, 114, 130, 0.4), 0 4px 8px rgba(201, 114, 130, 0.3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(201, 114, 130, 0.35), 0 2px 4px rgba(201, 114, 130, 0.2)'; }}
                    >
                      <Plus size={18} strokeWidth={2.5} /> Agendar Primera Cita
                    </button>
                  </div>
                ) : (
                  /* Chronological single-column agenda list — one appointment below the other,
                     grouped by time so it's obvious when several staff have a cita at the same hour. */
                  <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: '#fff', padding: '16px' }} className="no-scrollbar">
                    {(() => {
                      const activeFilter = mobileStaffFilter || visibleStaff[0]?.id;
                      const activePeriod = TIME_PERIODS.find(p => p.key === timeOfDayFilter);
                      const filteredApps = dayApps
                        .filter(app => activeFilter === 'all' ? true : app.staff_id === activeFilter)
                        .filter(app => {
                          if (!activePeriod || activePeriod.key === 'all') return true;
                          const start = new Date(app.scheduled_at || app.created_at);
                          const startMin = start.getHours() * 60 + start.getMinutes();
                          return startMin >= activePeriod.startMin && startMin < activePeriod.endMin;
                        })
                        .slice()
                        .sort((a, b) => new Date(a.scheduled_at || a.created_at) - new Date(b.scheduled_at || b.created_at));

                      if (filteredApps.length === 0) {
                        return (
                          <div style={{ padding: '30px 10px', textAlign: 'center', fontSize: '0.8rem', color: '#a0909a', fontWeight: 600 }}>
                            No hay citas en esta franja horaria.
                          </div>
                        );
                      }

                      // Agrupar por hora exacta para mostrar juntas las citas que coinciden en horario
                      const groups = [];
                      filteredApps.forEach(app => {
                        const start = new Date(app.scheduled_at || app.created_at);
                        const timeKey = `${start.getHours()}:${start.getMinutes()}`;
                        const lastGroup = groups[groups.length - 1];
                        if (!lastGroup || lastGroup.timeKey !== timeKey) {
                          groups.push({ timeKey, start, apps: [app] });
                        } else {
                          lastGroup.apps.push(app);
                        }
                      });

                      return (
                        <AnimatePresence mode="popLayout">
                          {groups.map((group, groupIdx) => {
                        const h12 = group.start.getHours() % 12 || 12;
                        const ampm = group.start.getHours() >= 12 ? 'PM' : 'AM';
                        return (
                          <motion.div
                            key={group.timeKey}
                            layout
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 16, transition: { duration: 0.2 } }}
                            transition={{ duration: 0.32, delay: Math.min(groupIdx * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}
                            style={{ marginBottom: '18px' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#c97282', flexShrink: 0 }}>
                                {h12}:{group.start.getMinutes().toString().padStart(2, '0')} {ampm}
                              </div>
                              {group.apps.length > 1 && (
                                <div className="mi-tag" style={{ fontSize: '0.6rem', fontWeight: 800, color: '#a0506a', background: 'rgba(201, 114, 130, 0.1)', padding: '2px 9px', borderRadius: '999px', flexShrink: 0 }}>
                                  {group.apps.length} citas a la misma hora
                                </div>
                              )}
                              <div style={{ flex: 1, height: '1px', background: 'rgba(223, 178, 140, 0.2)' }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {group.apps.map(app => {
                                const start = new Date(app.scheduled_at || app.created_at);
                                const staffMember = visibleStaff.find(s => s.id === app.staff_id);
                                const isRetrasada = Math.floor((new Date().getTime() - start.getTime()) / 60000) > 15 && app.status !== 'Completado' && app.status !== 'Cancelada';

                                let bgColor = '#fcfaf9';
                                let borderColor = 'rgba(160, 80, 106, 0.25)';
                                let accentColor = '#a0506a';
                                if (app.status === 'Completado') {
                                  bgColor = 'rgba(34, 197, 94, 0.05)'; borderColor = 'rgba(34, 197, 94, 0.3)'; accentColor = '#16a34a';
                                } else if (isRetrasada) {
                                  bgColor = 'rgba(239, 68, 68, 0.05)'; borderColor = 'rgba(239, 68, 68, 0.3)'; accentColor = '#dc2626';
                                } else if (app.status === 'En Curso') {
                                  bgColor = 'rgba(245, 158, 11, 0.05)'; borderColor = 'rgba(245, 158, 11, 0.3)'; accentColor = '#d97706';
                                }

                                const durationMin = getAppointmentDuration(app);
                                const durationLabel = durationMin >= 60
                                  ? `${Math.floor(durationMin / 60)}h${durationMin % 60 ? ` ${durationMin % 60}m` : ''}`
                                  : `${durationMin}m`;
                                const price = app.total_price ?? app.services?.price;

                                const canComplete = app.status !== 'Completado' && app.status !== 'Cancelada';
                                const clientPhone = app.clients?.phone;

                                return (
                                  <div key={app.id}
                                    onClick={() => setSelectedDetailedApp(app)}
                                    className="mi-card"
                                    style={{
                                      display: 'flex', alignItems: 'stretch', gap: 0,
                                      background: bgColor, border: `1px solid ${borderColor}`,
                                      borderLeft: `6px solid ${accentColor}`, borderRadius: '12px',
                                      overflow: 'hidden', cursor: 'pointer',
                                      boxShadow: '0 2px 8px rgba(74, 48, 54, 0.04)',
                                      transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(74, 48, 54, 0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(74, 48, 54, 0.04)'; }}
                                  >
                                    {staffMember && (
                                      <div style={{ position: 'relative', width: '58px', minHeight: '82px', flexShrink: 0 }}>
                                        <img
                                          src={staffMember.image_url || staffMember.photo_url || `https://i.pravatar.cc/150?u=${encodeURIComponent(staffMember.name || '')}`}
                                          alt={staffMember.name || ''}
                                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(200deg, ${accentColor}66 0%, ${accentColor}00 55%), linear-gradient(0deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 45%)` }} />
                                      </div>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0, padding: '12px 16px' }}>
                                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2d1b22', display: 'flex', alignItems: 'center', gap: '5px', lineHeight: 1.3 }}>
                                        {app.clients?.name || 'Cliente'}
                                        {isRetrasada && <AlertTriangle size={12} color="#dc2626" style={{ flexShrink: 0 }} />}
                                      </div>
                                      <div style={{ fontSize: '0.68rem', color: '#8c767b', fontWeight: 600, lineHeight: 1.3, marginTop: '2px' }}>
                                        {app.services?.name || 'Servicio'}{staffMember ? ` · ${staffMember.name.split(' ')[0]}` : ''}
                                      </div>
                                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                        <span className="mi-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: '#2d1b22', fontWeight: 800, background: '#fff', border: '1px solid rgba(74,48,54,0.12)', padding: '3px 9px', borderRadius: '8px' }}>
                                          <Clock size={11} color="#2d1b22" /> {durationLabel}
                                        </span>
                                        {price != null && (
                                          <span className="mi-tag" style={{ fontSize: '0.7rem', color: '#2d1b22', fontWeight: 800, background: '#fff', border: '1px solid rgba(74,48,54,0.12)', padding: '3px 9px', borderRadius: '8px' }}>
                                            ${Number(price).toLocaleString('es-VE')}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0, padding: '12px 16px 12px 0' }}>
                                                        <div className="mi-tag" style={{ fontSize: '0.62rem', fontWeight: 800, color: accentColor, background: `${accentColor}18`, padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                                        {app.status}
                                      </div>
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        {clientPhone && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${getWhatsAppNumber(clientPhone)}`, '_blank'); }}
                                            title="Contactar por WhatsApp"
                                            className="mi-btn"
                                            style={{ width: '26px', height: '26px', borderRadius: '8px', border: '1px solid rgba(223,178,140,0.25)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                                          >
                                            <MessageCircle size={13} color="#8c767b" />
                                          </button>
                                        )}
                                        {canComplete && (
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              try {
                                                await dataService.updateAppointment(app.id, { status: 'Completado' });
                                                showToast('Cita marcada como completada', 'success');
                                                loadFilteredAppointments();
                                              } catch (err) {
                                                showToast('Error al actualizar la cita', 'error');
                                              }
                                            }}
                                            title="Marcar como completada"
                                            className="mi-btn"
                                            style={{ width: '26px', height: '26px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                                          >
                                            <Check size={14} color="#16a34a" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        );
                          })}
                        </AnimatePresence>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Column 2 - Especialistas */}
            <div style={{ display: (!(isMobile || isTablet) || leftTab === 'especialistas') ? 'flex' : 'none', flexDirection: 'column', gap: '24px', minWidth: 0, animation: ((isMobile || isTablet) && leftTab === 'especialistas') ? 'fadeInUpWow 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none' }}>

              {/* ESTADO DEL EQUIPO (Moved to Personal Tab) */}
              <div style={{ marginBottom: '0' }}>
                <h3 className="mi-section-header" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2d1b22', margin: '0 0 14px 0', letterSpacing: '0.5px' }}>
                  ESTADO DEL EQUIPO
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: (isMobile || isTablet) ? '8px' : '16px' }}>
                  <div className="mi-stat mi-enter-up mi-delay-1 hover-lift" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(34, 197, 94, 0.02) 100%)', border: '2px solid rgba(34, 197, 94, 0.25)', borderRadius: '16px', padding: (isMobile || isTablet) ? '12px 6px' : '20px', textAlign: 'center', minWidth: 0, animation: 'cardEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1) 0s both' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: (isMobile || isTablet) ? '6px' : '10px' }}><Users size={(isMobile || isTablet) ? 20 : 24} color="#16a34a" strokeWidth={1.5} /></div>
                    <div style={{ fontSize: (isMobile || isTablet) ? '0.56rem' : '0.68rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: (isMobile || isTablet) ? '4px' : '8px' }}>Disponibles</div>
                    <div style={{ fontSize: (isMobile || isTablet) ? '1.4rem' : '2.2rem', fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>{staffByStatus.libres.length}</div>
                  </div>
                  <div className="mi-stat mi-enter-up mi-delay-2 hover-lift" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.02) 100%)', border: '2px solid rgba(239, 68, 68, 0.25)', borderRadius: '16px', padding: (isMobile || isTablet) ? '12px 6px' : '20px', textAlign: 'center', minWidth: 0, animation: 'cardEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: (isMobile || isTablet) ? '6px' : '10px' }}><Scissors size={(isMobile || isTablet) ? 20 : 24} color="#dc2626" strokeWidth={1.5} /></div>
                    <div style={{ fontSize: (isMobile || isTablet) ? '0.56rem' : '0.68rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: (isMobile || isTablet) ? '4px' : '8px' }}>En Cita</div>
                    <div style={{ fontSize: (isMobile || isTablet) ? '1.4rem' : '2.2rem', fontWeight: 900, color: '#dc2626', lineHeight: 1 }}>{staffByStatus.ocupadas.length}</div>
                  </div>
                  <div className="mi-stat mi-enter-up mi-delay-3 hover-lift" style={{ background: 'linear-gradient(135deg, rgba(212, 160, 154, 0.08) 0%, rgba(212, 160, 154, 0.02) 100%)', border: '2px solid rgba(212, 160, 154, 0.3)', borderRadius: '16px', padding: (isMobile || isTablet) ? '12px 6px' : '20px', textAlign: 'center', minWidth: 0, animation: 'cardEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1) 0.16s both' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: (isMobile || isTablet) ? '6px' : '10px' }}><Clock size={(isMobile || isTablet) ? 20 : 24} color="#a0506a" strokeWidth={1.5} /></div>
                    <div style={{ fontSize: (isMobile || isTablet) ? '0.56rem' : '0.68rem', fontWeight: 700, color: '#a0506a', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: (isMobile || isTablet) ? '4px' : '8px' }}>Almuerzo</div>
                    <div style={{ fontSize: (isMobile || isTablet) ? '1.4rem' : '2.2rem', fontWeight: 900, color: '#a0506a', lineHeight: 1 }}>1</div>
                  </div>
                </div>
              </div>

              <div className="agenda-glass-card hover-lift" style={{ padding: '20px', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
                <h4 className="mi-section-header" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2d1b22', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <UserCheck size={16} color="#c97282" />
                  ESTADO DE ESPECIALISTAS
                </h4>

                {/* Search Bar for Specialists */}
                <div style={{ position: 'relative', marginBottom: '16px', flexShrink: 0 }}>
                  <Search size={14} color="#a0909a" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Buscar especialista..."
                    value={staffSearchQuery}
                    onChange={e => setStaffSearchQuery(e.target.value)}
                    className="mi-input"
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 34px',
                      fontSize: '0.78rem',
                      color: '#2d1b22',
                      background: '#fcf6f7',
                      border: '1px solid rgba(223, 178, 140, 0.15)',
                      borderRadius: '12px',
                      outline: 'none',
                      transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    }}
                  />
                </div>

                <p style={{ fontSize: '0.75rem', color: '#a0909a', fontWeight: 600, margin: '0 0 10px 0', textAlign: 'center', fontStyle: 'italic' }}>
                  Toca en una especialista para ver su ficha
                </p>

                {/* Stylists Compact Grid */}
                <div className="no-scrollbar" style={{ display: 'grid', gridTemplateColumns: `repeat(${(isMobile || isTablet) ? 2 : 3}, minmax(0, 1fr))`, gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '4px', paddingTop: '6px', paddingBottom: '6px', overflowX: 'hidden' }}>
                  <AnimatePresence mode="popLayout">
                  {visibleStaff.map((s, staffIdx) => {
                    const window = getStaffWorkingWindow(s.id, dateKey, schedules, timeOff);
                    const metrics = getStaffMetrics(s.id);
                    const initial = (s.name || '?').charAt(0).toUpperCase();
                    const nextApp = getStaffNextApp(s.id);
                    const staffMotionProps = {
                      layout: true,
                      initial: { opacity: 0, y: 20, scale: 0.92 },
                      animate: { opacity: 1, y: 0, scale: 1 },
                      exit: { opacity: 0, y: -12, scale: 0.92, transition: { duration: 0.2 } },
                      transition: { duration: 0.4, delay: Math.min(staffIdx * 0.06, 0.4), ease: [0.16, 1, 0.3, 1] }
                    };

                    if (!window.isWorking) {
                      return (
                        <motion.div
                          key={s.id}
                          {...staffMotionProps}
                          onClick={() => setSelectedStaffDrawer(s)}
                          onMouseEnter={() => setHoveredStaffId(s.id)}
                          onMouseLeave={() => setHoveredStaffId(null)}
                          className="agenda-staff-card"
                          data-status="notrabaja"
                          style={{
                            padding: (isMobile || isTablet) ? '8px' : '10px',
                            background: '#fcfaf9',
                            border: '1.5px dashed rgba(223,178,140,0.2)',
                            borderLeft: '4px solid rgba(180,170,165,0.3)',
                            borderRadius: '14px',
                            display: 'flex',
                            flexDirection: (isMobile || isTablet) ? 'column' : 'row',
                            alignItems: (isMobile || isTablet) ? 'center' : 'center',
                            gap: (isMobile || isTablet) ? '6px' : '10px',
                            cursor: 'pointer',
                            opacity: 0.6,
                            position: 'relative',
                            overflow: 'visible',
                          }}
                        >
                          <div className="staff-avatar-shimmer" style={{ position: 'relative', width: (isMobile || isTablet) ? '40px' : '50px', height: (isMobile || isTablet) ? '40px' : '50px', flexShrink: 0, borderRadius: '10px', overflow: 'hidden' }}>
                            <img
                              src={s.photo_url || `https://i.pravatar.cc/150?u=${encodeURIComponent(s.name)}`}
                              alt={s.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(50%)' }}
                            />
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(180,170,165,0.3) 0%, rgba(180,170,165,0.05) 100%)' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0, textAlign: (isMobile || isTablet) ? 'center' : 'left' }}>
                            <div style={{ fontSize: (isMobile || isTablet) ? '0.65rem' : '0.72rem', fontWeight: 800, color: '#8c767b', lineHeight: 1.3 }}>{s.name}</div>
                            <div style={{ fontSize: '0.52rem', color: '#a0909a', fontWeight: 600, marginTop: '1px', lineHeight: 1.3 }}>{getStaffRole(s.name)}</div>
                            <div style={{ marginTop: '3px', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.48rem', fontWeight: 800, color: '#b0a8a3', background: 'rgba(180,170,165,0.1)', padding: '1px 6px', borderRadius: '999px', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
                              <Circle size={7} color="#b0a8a3" strokeWidth={2.5} />
                              NO TRABAJA
                            </div>
                          </div>
                          <ChevronRight size={12} color="#b0a8a3" className="staff-chevron" style={{ flexShrink: 0, opacity: 0.4, ...(isMobile || isTablet ? { position: 'absolute', right: '6px', top: '6px' } : {}) }} />
                        </motion.div>
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

                    let statusText = 'LIBRE';
                    let statusBg = 'rgba(34, 197, 94, 0.08)';
                    let statusColor = '#16a34a';

                    if (isLunch) {
                      statusText = 'ALMUERZO';
                      statusBg = 'rgba(201, 114, 130, 0.08)';
                      statusColor = '#c97282';
                    } else if (activeApp) {
                      statusText = 'EN CITA';
                      statusBg = 'rgba(239, 68, 68, 0.06)';
                      statusColor = '#dc2626';
                    } else if (staffIdx === 1 || staffIdx === 3 || staffIdx === 5) {
                      statusText = 'EN CITA';
                      statusBg = 'rgba(239, 68, 68, 0.06)';
                      statusColor = '#dc2626';
                    } else if (staffIdx === 7) {
                      statusText = 'ALMUERZO';
                      statusBg = 'rgba(201, 114, 130, 0.08)';
                      statusColor = '#c97282';
                    }

                    const isMobileCard = isMobile || isTablet;

                    return (
                      <motion.div
                        key={s.id}
                        {...staffMotionProps}
                        onClick={() => setSelectedStaffDrawer(s)}
                        onMouseEnter={() => !isMobileCard && setHoveredStaffId(s.id)}
                        onMouseLeave={() => !isMobileCard && setHoveredStaffId(null)}
                        className="agenda-staff-card"
                        data-status={statusText === 'LIBRE' ? 'libre' : statusText === 'EN CITA' ? 'encita' : 'almuerzo'}
                        style={{
                          padding: isMobileCard ? '8px' : '10px',
                          background: '#ffffff',
                          border: '1px solid rgba(223,178,140,0.18)',
                          borderLeft: `4px solid ${statusColor}`,
                          borderRadius: '14px',
                          display: 'flex',
                          flexDirection: isMobileCard ? 'column' : 'row',
                          alignItems: isMobileCard ? 'center' : 'center',
                          gap: isMobileCard ? '6px' : '10px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(74,48,54,0.04)',
                          position: 'relative',
                          overflow: 'visible',
                        }}
                      >
                        {/* Desktop tooltip on hover */}
                        {!isMobileCard && hoveredStaffId === s.id && (
                          <div className="staff-tooltip" style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: '#2d1b22', color: '#fff', padding: '8px 12px', borderRadius: '10px', fontSize: '0.65rem', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 20, boxShadow: '0 4px 16px rgba(45,27,34,0.25)' }}>
                            <div style={{ fontWeight: 700, marginBottom: '2px' }}>{s.name}</div>
                            <div style={{ opacity: 0.8 }}>{metrics.citasCount} cita{metrics.citasCount !== 1 ? 's' : ''} · {metrics.occupancy}% ocupación</div>
                            {nextApp && <div style={{ opacity: 0.65, marginTop: '2px' }}>Próxima: {nextApp.timeStr}</div>}
                            <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', border: '5px solid transparent', borderTopColor: '#2d1b22' }} />
                          </div>
                        )}

                        {/* Photo */}
                        <div className="staff-avatar-shimmer" style={{ position: 'relative', width: isMobileCard ? '42px' : '50px', height: isMobileCard ? '42px' : '58px', flexShrink: 0, borderRadius: isMobileCard ? '10px' : '12px', overflow: 'hidden' }}>
                          <img
                            src={s.photo_url || `https://i.pravatar.cc/150?u=${encodeURIComponent(s.name)}`}
                            alt={s.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(200deg, ${statusColor}55 0%, ${statusColor}00 55%), linear-gradient(0deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 45%)` }} />
                          {/* Status dot — pulsing when busy */}
                          <span className={statusText !== 'LIBRE' ? 'staff-dot-pulse' : ''} style={{ position: 'absolute', right: '2px', bottom: '2px', width: isMobileCard ? '7px' : '9px', height: isMobileCard ? '7px' : '9px', borderRadius: '50%', background: statusColor, border: '1.5px solid #fff', boxShadow: `0 0 4px ${statusColor}66` }} />
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0, textAlign: isMobileCard ? 'center' : 'left', paddingRight: isMobileCard ? 0 : '22px' }}>
                          <div style={{ fontSize: isMobileCard ? '0.65rem' : '0.72rem', fontWeight: 800, color: '#2d1b22', lineHeight: 1.3 }}>{s.name}</div>
                          <div style={{ fontSize: '0.5rem', color: '#a0909a', fontWeight: 600, marginTop: '1px', lineHeight: 1.3 }}>{getStaffRole(s.name)}</div>
                          <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: isMobileCard ? '4px' : '6px', justifyContent: isMobileCard ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
                            <span className="mi-tag" style={{ fontSize: '0.48rem', fontWeight: 800, color: statusColor, background: `${statusColor}12`, padding: '1px 6px', borderRadius: '999px', letterSpacing: '0.3px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              {statusText !== 'LIBRE' && <span className="staff-dot-pulse" style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', background: statusColor }} />}
                              {statusText}
                            </span>
                            {metrics.citasCount > 0 && (
                              <span style={{ fontSize: '0.56rem', fontWeight: 700, color: '#6b5a60', background: 'rgba(160,144,154,0.1)', padding: '3px 8px', borderRadius: '999px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CalendarDays size={11} color="#8c767b" strokeWidth={2} />
                                {metrics.citasCount} {metrics.citasCount === 1 ? 'cita' : 'citas'}
                              </span>
                            )}
                          </div>
                          {/* Next appointment — desktop only */}
                          {!isMobileCard && nextApp && statusText === 'LIBRE' && (
                            <div style={{ fontSize: '0.46rem', color: '#c9a0a8', fontWeight: 500, marginTop: '2px' }}>
                              Próxima: {nextApp.timeStr}
                            </div>
                          )}
                        </div>

                        {/* Chevron — desktop: absolute right; mobile: bottom-right */}
                        <ChevronRight size={isMobileCard ? 10 : 14} color={statusColor} className="staff-chevron" style={{ flexShrink: 0, opacity: 0.4, position: 'absolute', ...(isMobileCard ? { right: '6px', top: '6px' } : { right: '8px', top: '50%', transform: 'translateY(-50%)' }) }} />

                        {/* Occupancy bar — desktop only */}
                        {!isMobileCard && (
                          <div style={{ position: 'absolute', bottom: 0, left: '4px', right: 0, height: '3px', background: '#fcf6f7', borderRadius: '0 0 14px 0', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: statusColor, width: `${metrics.occupancy}%`, transition: 'width 0.4s ease' }} />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  </AnimatePresence>
                </div>

                {visibleStaff.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#a0909a', fontSize: '0.8rem', border: '1px dashed rgba(223,178,140,0.25)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center' }}>
                    <Search size={24} color="#c97282" style={{ opacity: 0.5 }} />
                    <div style={{ fontWeight: 700 }}>No se encontraron especialistas</div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* (FAB removed in favor of central bottom nav button) */}

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
            <h3 className="mi-section-header" style={{
              margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#2d1b22',
              letterSpacing: '-0.3px'
            }}>
              Buscador rápido de disponibilidad
            </h3>
            <p style={{
              margin: '4px 0 0', fontSize: '0.76rem', color: '#a0909a', fontWeight: 500
            }}>
              Encuentra especialistas disponibles según la fecha, hora, duración y servicio.
            </p>
          </div>
          <button
            onClick={() => setShowQuickAvailModal(false)}
            className="mi-btn"
            style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'rgba(74,48,54,0.05)',
              border: 'none', color: '#8c767b', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', lineHeight: 1, transition: 'all 0.2s',
              flexShrink: 0, marginTop: '2px'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201, 114, 130,0.12)'; e.currentTarget.style.color = '#c97282'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,48,54,0.05)'; e.currentTarget.style.color = '#8c767b'; }}
          >
            ✕
          </button>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '24px 32px 32px' }} className="no-scrollbar">

          {/* ── FILTER ROW 1: Fecha | Hora | Duración ── */}
          <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a0909a', display: 'block', marginBottom: '7px', letterSpacing: '0.3px' }}>Fecha</label>
              <JanaDatePicker
                value={availDate}
                onChange={e => setAvailDate(e.target.value)}
                variant="light"
                inputClassName="agenda-input"
                inputStyle={{ borderRadius: '12px', height: '44px', fontSize: '0.82rem', fontWeight: 600, paddingLeft: '38px', background: '#fff', border: '1.5px solid rgba(212,160,154,0.3)', color: '#2d1b22' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a0909a', display: 'block', marginBottom: '7px', letterSpacing: '0.3px' }}>Hora de inicio</label>
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
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a0909a', display: 'block', marginBottom: '7px', letterSpacing: '0.3px' }}>Duración</label>
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
          <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a0909a', display: 'block', marginBottom: '7px', letterSpacing: '0.3px' }}>Servicio</label>
              <JanaSelect variant="light" value={availServiceId} onChange={val => setAvailServiceId(val)}
                options={[{ value: "all", label: "Cualquier servicio" }, ...services.map(s => ({ value: s.id, label: `${s.name} (${s.duration || 60}m)` }))]}
                style={{ width: '100%' }}
                showSearch={true}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a0909a', display: 'block', marginBottom: '7px', letterSpacing: '0.3px' }}>Especialista</label>
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
              className="mi-btn"
              style={{ background: 'none', border: 'none', color: '#c97282', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 0', transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >✦ Limpiar filtros</button>
            <button
              className="mi-btn"
              style={{ padding: '12px 28px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)', color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 6px 20px rgba(201, 114, 130,0.3)', transition: 'all 0.2s', letterSpacing: '0.2px' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(201, 114, 130,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(201, 114, 130,0.3)'; }}
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
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#2d1b22' }}>Especialistas disponibles ({disponibles.length})</h4>
                  {disponibles.length > 0 && (
                    <span className="mi-tag" style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', color: '#16a34a', padding: '5px 12px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700, border: '1px solid #bbf7d0' }}>
                      <CheckCircle2 size={13} /> {disponibles.length} disponibles
                    </span>
                  )}
                </div>

                {/* Cards */}
                {disponibles.length === 0 ? (
                  <div style={{ padding: '24px', borderRadius: '16px', background: '#faf7f5', border: '1px dashed rgba(223,178,140,0.3)', textAlign: 'center', color: '#a0909a', fontSize: '0.82rem' }}>
                    Ninguna especialista disponible con estos criterios.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Especialistas disponibles aquí */}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
      )}
    </AnimatedModal>

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
            zIndex: 1050, 
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
              className="mi-btn"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a0909a',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#c97282';
                e.currentTarget.style.transform = 'translateX(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#a0909a';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <ChevronLeft size={18} /> Volver a Agenda
            </button>
          </div>

          {/* Main content padding area */}
          <div style={{ padding: isMobile ? '16px 16px calc(120px + env(safe-area-inset-bottom, 12px)) 16px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Identity Card & Date Selector Ribbon */}
            <div style={{ 
              background: '#fff', 
              border: '1px solid rgba(223,178,140,0.18)', 
              borderRadius: isMobile ? '16px' : '24px', 
              padding: isMobile ? '14px' : '24px',
              boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'stretch' : 'center',
              gap: isMobile ? '12px' : '20px'
            }}>
              {/* Left Side: Photo & Name & Specialty */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px', flexWrap: 'wrap' }}>
                <div style={{ width: isMobile ? '52px' : '90px', height: isMobile ? '52px' : '90px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #fce4e8', flexShrink: 0, boxShadow: '0 4px 12px rgba(201, 114, 130,0.15)' }}>
                  <img 
                    src={selectedStaffDrawer.photo_url || `https://i.pravatar.cc/150?u=${encodeURIComponent(selectedStaffDrawer.name)}`}
                    alt={selectedStaffDrawer.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: isMobile ? '0.95rem' : '1.5rem', fontWeight: 900, color: '#2d1b22', margin: 0 }}>
                      {selectedStaffDrawer.name}
                    </h2>
                    <span className="mi-tag" style={{ fontSize: isMobile ? '0.52rem' : '0.72rem', color: '#c97282', background: 'rgba(201, 114, 130,0.1)', padding: isMobile ? '2px 8px' : '3px 10px', borderRadius: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      {getStaffRole(selectedStaffDrawer.name)}
                    </span>
                  </div>
                  <p style={{ fontSize: isMobile ? '0.6rem' : '0.8rem', color: '#a0909a', margin: isMobile ? '4px 0 0' : '8px 0 0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedStaffDrawer.role || 'Extensiones de pestañas'} · 0412 345 6789
                  </p>
                </div>
              </div>

              {/* Right Side: Date Picker Navigation & Edit Schedule */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', flexWrap: 'wrap', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                {/* Date Navigator */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  background: '#ffffff', 
                  border: '1px solid rgba(223, 178, 140, 0.25)', 
                  borderRadius: isMobile ? '10px' : '12px',
                  padding: '3px',
                  boxShadow: '0 2px 8px rgba(74, 48, 54, 0.02)',
                  flex: isMobile ? 1 : 'none',
                  minWidth: 0
                }}>
                  <div key={selectedDate.toDateString()} className={dateNavDir === 'next' ? 'animate-date-enter' : 'animate-date-prev'} style={{
                    padding: isMobile ? '6px 10px' : '8px 16px',
                    fontSize: isMobile ? '0.68rem' : '0.82rem',
                    fontWeight: 700,
                    color: '#2d1b22',
                    textTransform: 'capitalize',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    minWidth: 0,
                    textAlign: 'center'
                  }}>
                    {selectedDate.toLocaleDateString('es-VE', { weekday: isMobile ? 'short' : 'long', day: 'numeric', month: 'short', year: 'numeric' }).replace(' de', '').replace(' de', '')}
                  </div>
                  <div style={{ display: 'flex', gap: '2px', borderLeft: '1px solid rgba(223,178,140,0.15)', paddingLeft: '4px', flexShrink: 0 }}>
                    <button
                      onClick={() => goToDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1), 'prev')}
                      className="mi-btn btn-hover-scale"
                      style={{
                        width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', borderRadius: '8px', border: 'none', background: 'transparent',
                        color: '#c97282', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <ChevronLeft size={isMobile ? 14 : 16} />
                    </button>
                    <button
                      onClick={() => goToDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1), 'next')}
                      className="mi-btn btn-hover-scale"
                      style={{
                        width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', borderRadius: '8px', border: 'none', background: 'transparent',
                        color: '#c97282', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <ChevronRight size={isMobile ? 14 : 16} />
                    </button>
                  </div>
                </div>

                {/* Edit Schedule Button */}
                <button 
                  onClick={() => showToast?.('Abriendo editor de horarios...', 'info')}
                  className="mi-btn btn-hover-scale"
                  style={{
                    background: '#fff', 
                    border: '1px solid #c97282', 
                    color: '#c97282',
                    padding: isMobile ? '8px 14px' : '10px 20px', 
                    borderRadius: isMobile ? '10px' : '12px', 
                    fontSize: isMobile ? '0.7rem' : '0.82rem', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(201, 114, 130,0.05)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  <Clock size={14} /> Editar horario
                </button>
              </div>
            </div>

            {/* Quick Status Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: (isMobile || isTablet) ? '10px' : '16px' }}>
              {/* Card 1: Estado Actual */}
              <div className="mi-stat mi-enter-up mi-delay-1" style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: isMobile ? '14px' : '20px', padding: isMobile ? '12px' : '16px 20px', display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                <div style={{ width: isMobile ? '8px' : '10px', height: isMobile ? '8px' : '10px', borderRadius: '50%', background: '#22c55e', flexShrink: 0, boxShadow: '0 0 8px #22c55e' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? '0.55rem' : '0.62rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado actual</div>
                  <div style={{ fontSize: isMobile ? '0.78rem' : '0.9rem', fontWeight: 800, color: '#22c55e', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Ocupada <span style={{ color: '#a0909a', fontSize: isMobile ? '0.65rem' : '0.78rem', fontWeight: 500 }}>Hasta 11:30 AM</span></div>
                </div>
              </div>

              {/* Card 2: Próxima Cita */}
              <div className="mi-stat mi-enter-up mi-delay-2" style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: isMobile ? '14px' : '20px', padding: isMobile ? '12px' : '16px 20px', display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                <div style={{ width: isMobile ? '30px' : '36px', height: isMobile ? '30px' : '36px', borderRadius: '10px', background: 'rgba(217, 119, 6, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0 }}>
                  <CalendarIcon size={isMobile ? 14 : 16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? '0.55rem' : '0.62rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Próxima cita</div>
                  <div style={{ fontSize: isMobile ? '0.78rem' : '0.9rem', fontWeight: 800, color: '#d97706', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    12:00 PM <span style={{ color: '#a0909a', fontSize: isMobile ? '0.65rem' : '0.78rem', fontWeight: 500 }}>· Volumen 3D</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Horario de Hoy */}
              <div className="mi-stat mi-enter-up mi-delay-3" style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: isMobile ? '14px' : '20px', padding: isMobile ? '12px' : '16px 20px', display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                <div style={{ width: isMobile ? '30px' : '36px', height: isMobile ? '30px' : '36px', borderRadius: '10px', background: 'rgba(201, 114, 130, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', flexShrink: 0 }}>
                  <Clock size={isMobile ? 14 : 16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? '0.55rem' : '0.62rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Horario de hoy</div>
                  <div style={{ fontSize: isMobile ? '0.68rem' : '0.78rem', fontWeight: 800, color: '#2d1b22', marginTop: '2px', lineHeight: '1.2' }}>
                    9:00 AM - 6:00 PM <br />
                    <span style={{ color: '#a0909a', fontSize: isMobile ? '0.58rem' : '0.68rem', fontWeight: 500 }}>1:00 PM - 2:00 PM (descanso)</span>
                  </div>
                </div>
              </div>
            </div>

             {/* Pills Tabs Menu */}
             <div style={{ display: 'flex', gap: isMobile ? '6px' : '8px', background: 'rgba(223,178,140,0.08)', borderRadius: '14px', padding: isMobile ? '4px' : '5px', width: 'fit-content', maxWidth: '100%' }}>
               {[
                 { id: 'agenda', label: 'Agenda' },
                 { id: 'resumen', label: 'Resumen' },
                 { id: 'servicios', label: 'Servicios' },
                 { id: 'historial', label: 'Historial' },
                 { id: 'notas', label: 'Notas' }
               ].map((tab) => {
                 const isActive = staffActiveTab === tab.id;
                 return (
                   <span 
                     key={tab.id} 
                     onClick={() => setStaffActiveTab(tab.id)}
                     style={{ 
                       fontSize: isMobile ? '0.7rem' : '0.82rem', 
                       fontWeight: isActive ? 800 : 600, 
                       color: isActive ? '#fff' : '#8a7080', 
                       background: isActive ? 'linear-gradient(135deg, #c97282, #a0506a)' : 'transparent',
                       borderRadius: '10px',
                       padding: isMobile ? '8px 14px' : '10px 18px',
                       cursor: 'pointer',
                       transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                       whiteSpace: 'nowrap',
                       flexShrink: 0,
                       boxShadow: isActive ? '0 2px 8px rgba(201,114,130,0.3)' : 'none',
                       letterSpacing: '0.2px'
                     }}
                   >
                     {tab.label}
                   </span>
                 );
               })}
             </div>

            {/* Dashboard Content Layout conditioned by active tab */}
            {staffActiveTab === 'agenda' && (
              <div style={{ display: 'flex', flexDirection: (isMobile || isTablet) ? 'column' : 'row', gap: (isMobile || isTablet) ? '16px' : '24px', alignItems: 'flex-start', width: '100%' }}>
                
                {/* Column 1: Daily Agenda Timeline (50% width on Desktop) */}
                <div style={{ flex: 1.5, background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '24px', padding: '24px', minWidth: 0, width: '100%', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                  <h3 className="mi-section-header" style={{ fontSize: '1rem', fontWeight: 800, color: '#2d1b22', margin: '0 0 20px 0' }}>
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
                              color: '#a0909a', 
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
                                  border: '1px solid rgba(201, 114, 130, 0.15)',
                                  borderRadius: '16px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  boxShadow: '0 2px 8px rgba(201, 114, 130,0.03)'
                                }}>
                                  <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2d1b22' }}>
                                      {app.clients?.name || 'Cliente sin nombre'}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#a0909a', marginTop: '3px', fontWeight: 600 }}>
                                      {app.services?.name || 'Servicio General'} (1h 30m)
                                    </div>
                                  </div>
                                  <span style={{ 
                                    fontSize: '0.62rem', 
                                    fontWeight: 800, 
                                    background: 'rgba(201, 114, 130,0.12)', 
                                    color: '#c97282', 
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
                                  color: '#a0909a'
                                }}>
                                  <Coffee size={15} color="#c97282" />
                                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Descanso</span>
                                </div>
                              ) : (
                                /* AVAILABLE SLOT */
                                <div style={{
                                  padding: '12px 18px',
                                  background: 'rgba(255, 255, 255, 0.5)',
                                  border: '1px dashed rgba(201, 114, 130, 0.2)',
                                  borderRadius: '16px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <span style={{ fontSize: '0.78rem', color: '#a0909a', fontWeight: 650 }}>Disponible</span>
                                  <button 
                                    onClick={() => {
                                      setScheduleModalPreset({ 
                                        staff: selectedStaffDrawer,
                                        initialTime: `${slot.hourVal}:00`
                                      });
                                      setShowScheduleModal(true);
                                    }}
                                    className="mi-btn btn-hover-scale"
                                    style={{
                                      width: '28px', height: '28px', borderRadius: '8px', border: 'none',
                                      background: '#c97282', color: '#fff', display: 'flex', alignItems: 'center',
                                      justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(201, 114, 130,0.2)'
                                    }}
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
                    <div className="mi-section-header" style={{ fontSize: '1rem', fontWeight: 800, color: '#2d1b22', margin: '0 0 20px 0' }}>
                      Resumen del día
                    </div>

                    {/* Metrics grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                      <div style={{ background: '#fcf6f7', padding: '14px', borderRadius: '16px', border: '1px solid rgba(223,178,140,0.06)' }}>
                        <div style={{ fontSize: '0.62rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase' }}>Citas programadas</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2d1b22', marginTop: '4px' }}>
                          {getStaffMetrics(selectedStaffDrawer.id).citasCount}
                        </div>
                      </div>
                      <div style={{ background: '#fcf6f7', padding: '14px', borderRadius: '16px', border: '1px solid rgba(223,178,140,0.06)' }}>
                        <div style={{ fontSize: '0.62rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase' }}>Citas completadas</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#22c55e', marginTop: '4px' }}>
                          {getStaffMetrics(selectedStaffDrawer.id).citasCount}
                        </div>
                      </div>
                      <div style={{ background: '#fcf6f7', padding: '14px', borderRadius: '16px', border: '1px solid rgba(223,178,140,0.06)', gridColumn: 'span 2' }}>
                        <div style={{ fontSize: '0.62rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase' }}>Ingresos generados</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#c97282', marginTop: '4px' }}>
                          $ {getStaffMetrics(selectedStaffDrawer.id).revenue.toLocaleString()}
                        </div>
                      </div>
                      
                      {/* Occupancy with visual progress bar */}
                      <div style={{ background: '#fcf6f7', padding: '14px', borderRadius: '16px', border: '1px solid rgba(223,178,140,0.06)', gridColumn: 'span 2' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.62rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase' }}>Ocupación del día</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2d1b22' }}>{getStaffMetrics(selectedStaffDrawer.id).occupancy}%</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(223, 178, 140, 0.15)', borderRadius: '3px', overflow: 'hidden', marginTop: '8px' }}>
                          <div style={{ height: '100%', background: 'linear-gradient(90deg, #c48b9f, #c97282)', width: `${getStaffMetrics(selectedStaffDrawer.id).occupancy}%` }} />
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#a0909a', marginTop: '6px', fontWeight: 600 }}>Meta: 80%</div>
                      </div>
                    </div>

                    {/* Free time between appointments */}
                    <div style={{ padding: '14px', background: '#fffbeb', border: '1px solid rgba(217, 119, 6, 0.15)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(217, 119, 6, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0 }}>
                        <Clock size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.58rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase' }}>Tiempo libre entre citas</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>1h 30m <span style={{ fontSize: '0.65rem', color: '#a0909a', fontWeight: 500 }}>acumulado</span></div>
                      </div>
                    </div>

                    {/* Most sold services list */}
                    <div style={{ borderTop: '1px solid rgba(223, 178, 140, 0.12)', paddingTop: '16px' }}>
                      <div style={{ fontSize: '0.68rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.3px' }}>
                        Servicios más vendidos hoy
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { rank: 1, name: 'Volumen 3D', qty: 2, rev: 64 },
                          { rank: 2, name: 'Extensiones Clásicas', qty: 1, rev: 28 },
                          { rank: 3, name: 'Retoque Clásico', qty: 1, rev: 6 }
                        ].map(srv => (
                          <div key={srv.rank} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#2d1b22', alignItems: 'center' }}>
                            <span style={{ fontWeight: 650, color: '#2d1b22' }}>{srv.rank}. {srv.name}</span>
                            <span style={{ fontWeight: 800, color: '#c97282' }}>{srv.qty} cita(s) · $ {srv.rev}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Clients, Internal Notes & Actions (22% width on Desktop) */}
                <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                  
                  {/* Next Client Card */}
                  <div className="mi-card" style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                    <h3 className="mi-section-header" style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a0909a', margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Cliente Siguiente
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0, backgroundColor: 'rgba(160,80,106,0.12)', border: '1.5px solid #a0506a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a0506a' }}>VP</span>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#2d1b22' }}>Valentina Pérez</div>
                        <div style={{ fontSize: '0.68rem', color: '#a0909a', fontWeight: 600 }}>0414 789 4563</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedStaffDrawer(null);
                        window.location.hash = '#clients';
                      }}
                      className="mi-btn btn-hover-scale"
                      style={{
                        width: '100%', background: 'transparent', border: '1px solid rgba(201, 114, 130,0.25)',
                        color: '#c97282', padding: '8px', borderRadius: '10px', fontSize: '0.72rem',
                        fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      Ver perfil de clienta
                    </button>
                  </div>

                  {/* Internal Notes container */}
                      <div className="mi-card" style={{ background: '#fff0f2', border: '1px solid rgba(201, 114, 130,0.12)', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.01)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h3 className="mi-section-header" style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a0506a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Notas rápidas
                      </h3>
                      <Pencil size={12} color="#c97282" style={{ cursor: 'pointer' }} />
                    </div>
                    <textarea 
                      placeholder="Escribe notas de seguimiento..."
                      className="mi-input"
                      style={{
                        width: '100%', height: '70px', border: 'none',
                        background: 'transparent', fontSize: '0.76rem', color: '#2d1b22', outline: 'none',
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
                      className="mi-btn btn-hover-scale"
                      style={{
                        width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                        background: 'linear-gradient(135deg, #c48b9f, #c97282)', color: '#fff',
                        fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(201, 114, 130,0.2)'
                      }}
                    >
                      Agendar Nueva Cita
                    </button>

                    <button
                      onClick={() => {
                        setShowQuickAvailModal?.(true) || showToast?.('Abriendo disponibilidad...', 'info');
                      }}
                      className="mi-btn btn-hover-scale"
                      style={{
                        width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(201, 114, 130, 0.25)',
                        background: '#fff', color: '#c97282',
                        fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      Ver disponibilidad
                    </button>

                    <button
                      onClick={() => {
                        setSelectedStaffDrawer(null);
                        showToast?.('Navegando a reportes de productividad...', 'info');
                      }}
                      className="mi-btn btn-hover-scale"
                      style={{
                        width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                        background: 'rgba(74, 48, 54, 0.06)', color: '#2d1b22',
                        fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      Ver reporte completo
                    </button>
                  </div>

                  {/* Day Comparison widget */}
                  <div className="mi-card" style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '24px', padding: '20px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                    <h3 className="mi-section-header" style={{ fontSize: '0.78rem', fontWeight: 800, color: '#a0909a', margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Comparativo del día <br /><span style={{ fontSize: '0.62rem', color: '#a0909a', fontWeight: 500, textTransform: 'none' }}>vs. día anterior</span>
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
                            <span style={{ color: '#2d1b22', fontWeight: 800 }}>{cmp.val}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: RESUMEN DEL DÍA — Full redesign */}
            {staffActiveTab === 'resumen' && (() => {
              const m = getStaffMetrics(selectedStaffDrawer.id);
              const meta = 150;
              const metaPct = Math.min(100, Math.round((m.revenue / meta) * 100));
              const hoursWorked = +(m.citasCount * 1.5).toFixed(1);
              const hoursPct = Math.min(100, Math.round((hoursWorked / 8) * 100));
              const yesterdayRevenue = Math.round(m.revenue * 0.85);
              const yesterdayCitas = Math.max(1, m.citasCount - 1);
              const revenueDiff = m.revenue - yesterdayRevenue;
              const revenueUp = revenueDiff >= 0;
              const citasDiff = m.citasCount - yesterdayCitas;
              const citasUp = citasDiff >= 0;
              const ticket = m.citasCount > 0 ? Math.round(m.revenue / m.citasCount) : 0;
              const yesterdayTicket = yesterdayCitas > 0 ? Math.round(yesterdayRevenue / yesterdayCitas) : 0;
              const ticketDiff = ticket - yesterdayTicket;
              const topServices = [
                { name: 'Volumen 3D', revenue: Math.round(m.revenue * 0.45), count: Math.max(1, Math.floor(m.citasCount * 0.4)), pct: 45 },
                { name: 'Extensiones', revenue: Math.round(m.revenue * 0.30), count: Math.max(1, Math.floor(m.citasCount * 0.3)), pct: 30 },
              ];
              const nextApp = getStaffNextApp(selectedStaffDrawer.id);
              const idleHours = Math.max(0, 8 - hoursWorked).toFixed(1);
              const cancelCount = m.cancelaciones || 0;
              const staffName = (selectedStaffDrawer.name || '').split(' ')[0];
              const ranking = { position: 3, total: 8, occupancy: 92 };

              return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '16px', width: '100%' }} className="animate-fade-in">

                {/* Comparativo vs Ayer */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: isMobile ? '8px' : '14px' }}>
                  <div className="mi-stat mi-enter-up" style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: isMobile ? '12px' : '18px', padding: isMobile ? '10px 8px' : '16px', boxShadow: '0 2px 12px rgba(74,48,54,0.02)' }}>
                    <div style={{ fontSize: isMobile ? '0.65rem' : '0.6rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.2 }}>Ingresos Hoy</div>
                    <div style={{ fontSize: isMobile ? '1.25rem' : '1.3rem', fontWeight: 900, color: '#2d1b22', marginTop: '2px' }}>${m.revenue.toLocaleString()}</div>
                    <div style={{ fontSize: isMobile ? '0.58rem' : '0.55rem', fontWeight: 700, color: revenueUp ? '#16a34a' : '#dc2626', marginTop: '2px' }}>{revenueUp ? '↑' : '↓'} ${Math.abs(revenueDiff)}</div>
                  </div>
                  <div className="mi-stat mi-enter-up mi-delay-1" style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: isMobile ? '12px' : '18px', padding: isMobile ? '10px 8px' : '16px', boxShadow: '0 2px 12px rgba(74,48,54,0.02)' }}>
                    <div style={{ fontSize: isMobile ? '0.65rem' : '0.6rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.2 }}>Citas Hoy</div>
                    <div style={{ fontSize: isMobile ? '1.25rem' : '1.3rem', fontWeight: 900, color: '#2d1b22', marginTop: '2px' }}>{m.citasCount}</div>
                    <div style={{ fontSize: isMobile ? '0.58rem' : '0.55rem', fontWeight: 700, color: citasUp ? '#16a34a' : '#dc2626', marginTop: '2px' }}>{citasUp ? '↑' : '↓'} {Math.abs(citasDiff)}</div>
                  </div>
                  <div className="mi-stat mi-enter-up mi-delay-2" style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: isMobile ? '12px' : '18px', padding: isMobile ? '10px 8px' : '16px', boxShadow: '0 2px 12px rgba(74,48,54,0.02)' }}>
                    <div style={{ fontSize: isMobile ? '0.65rem' : '0.6rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.2 }}>Ticket Prom.</div>
                    <div style={{ fontSize: isMobile ? '1.25rem' : '1.3rem', fontWeight: 900, color: '#2d1b22', marginTop: '2px' }}>${ticket}</div>
                    <div style={{ fontSize: isMobile ? '0.58rem' : '0.55rem', fontWeight: 700, color: ticketDiff >= 0 ? '#16a34a' : '#dc2626', marginTop: '2px' }}>{ticketDiff >= 0 ? '↑' : '↓'} ${Math.abs(ticketDiff)}</div>
                  </div>
                </div>

                {/* Barras de progreso */}
                <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: isMobile ? '14px' : '20px', padding: isMobile ? '16px' : '20px', boxShadow: '0 2px 12px rgba(74,48,54,0.02)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '14px' : '14px' }}>
                    {/* Meta de ingresos */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '0.85rem' : '0.75rem', fontWeight: 700, color: '#2d1b22', marginBottom: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><DollarSign size={14} color="#c97282" /> Meta de ingresos (${meta})</span>
                        <span style={{ color: metaPct >= 100 ? '#16a34a' : '#c97282' }}>{metaPct}%</span>
                      </div>
                      <div style={{ height: isMobile ? '12px' : '12px', background: '#fcf6f7', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                        <div className="mi-bar-fill" style={{ height: '100%', background: metaPct >= 100 ? 'linear-gradient(90deg, #16a34a, #22c55e)' : 'linear-gradient(90deg, #c97282, #c48b9f)', width: `${metaPct}%`, transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)', borderRadius: '10px' }} />
                        {metaPct >= 100 && <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.6rem', fontWeight: 800, color: '#fff' }}>✓</span>}
                      </div>
                    </div>
                    {/* Horas trabajadas */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? '0.85rem' : '0.75rem', fontWeight: 700, color: '#2d1b22', marginBottom: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} color="#16a34a" /> Horas de servicio</span>
                        <span>{hoursWorked}h / 8h</span>
                      </div>
                      <div style={{ height: isMobile ? '12px' : '12px', background: '#fcf6f7', borderRadius: '10px', overflow: 'hidden' }}>
                        <div className="mi-bar-fill" style={{ height: '100%', background: 'linear-gradient(90deg, #16a34a, #22c55e)', width: `${hoursPct}%`, transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)', borderRadius: '10px' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats row — Eficiencia, Retención, Cancelaciones */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? '8px' : '14px' }}>
                  <div className="mi-stat mi-enter-up" style={{ border: '1px solid rgba(223,178,140,0.15)', borderRadius: isMobile ? '12px' : '16px', padding: isMobile ? '12px 6px' : '14px', textAlign: 'center', background: '#fff' }}>
                    <span style={{ fontSize: isMobile ? '0.65rem' : '0.58rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase' }}>Eficiencia</span>
                    <div style={{ fontSize: isMobile ? '1.3rem' : '1.3rem', fontWeight: 900, color: '#22c55e', marginTop: '4px' }}>96%</div>
                    <div style={{ fontSize: isMobile ? '0.62rem' : '0.45rem', fontWeight: 700, color: '#16a34a', marginTop: '2px' }}>↑3% vs ayer</div>
                  </div>
                  <div className="mi-stat mi-enter-up mi-delay-1" style={{ border: '1px solid rgba(223,178,140,0.15)', borderRadius: isMobile ? '12px' : '16px', padding: isMobile ? '12px 6px' : '14px', textAlign: 'center', background: '#fff' }}>
                    <span style={{ fontSize: isMobile ? '0.65rem' : '0.58rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase' }}>Retención</span>
                    <div style={{ fontSize: isMobile ? '1.3rem' : '1.3rem', fontWeight: 900, color: '#c97282', marginTop: '4px' }}>88%</div>
                    <div style={{ fontSize: isMobile ? '0.62rem' : '0.45rem', fontWeight: 700, color: '#dc2626', marginTop: '2px' }}>↓2% vs ayer</div>
                  </div>
                  <div className="mi-stat mi-enter-up mi-delay-2" style={{ border: '1px solid rgba(223,178,140,0.15)', borderRadius: isMobile ? '12px' : '16px', padding: isMobile ? '12px 6px' : '14px', textAlign: 'center', background: '#fff' }}>
                    <span style={{ fontSize: isMobile ? '0.65rem' : '0.58rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase' }}>Cancelaciones</span>
                    <div style={{ fontSize: isMobile ? '1.3rem' : '1.3rem', fontWeight: 900, color: cancelCount === 0 ? '#22c55e' : '#dc2626', marginTop: '4px' }}>{cancelCount}</div>
                    <div style={{ fontSize: isMobile ? '0.62rem' : '0.45rem', fontWeight: 700, color: cancelCount === 0 ? '#16a34a' : '#a0909a', marginTop: '2px' }}>{cancelCount === 0 ? '✓ Sin cancelaciones' : '1 cliente'}</div>
                  </div>
                </div>

                {/* 2-column layout: Servicios top + Info cards */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '12px' : '14px' }}>

                  {/* Servicios más rentables */}
                  <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: isMobile ? '14px' : '18px', padding: isMobile ? '16px' : '18px', boxShadow: '0 2px 12px rgba(74,48,54,0.02)' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: isMobile ? '0.85rem' : '0.78rem', fontWeight: 800, color: '#a0909a', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Servicios Top</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {topServices.map((srv, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: isMobile ? '32px' : '32px', height: isMobile ? '32px' : '32px', borderRadius: '8px', background: i === 0 ? 'rgba(201,114,130,0.1)' : 'rgba(160,80,106,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {i === 0 ? <Sparkles size={isMobile ? 14 : 14} color="#c97282" /> : <Check size={isMobile ? 14 : 14} color="#a0506a" />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: isMobile ? '0.85rem' : '0.72rem', fontWeight: 700, color: '#2d1b22', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{srv.name}</div>
                            <div style={{ fontSize: isMobile ? '0.7rem' : '0.5rem', color: '#a0909a', marginTop: '2px' }}>{srv.count} cita{srv.count !== 1 ? 's' : ''} · ${srv.revenue}</div>
                          </div>
                          <div style={{ width: isMobile ? '40px' : '50px', height: '5px', background: '#fcf6f7', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                            <div style={{ height: '100%', background: i === 0 ? '#c97282' : '#d4a09a', width: `${srv.pct}%`, borderRadius: '4px' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Próxima cita + Horas muertas */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '14px' }}>
                    {/* Próxima cita */}
                    <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: isMobile ? '14px' : '18px', padding: isMobile ? '16px' : '18px', boxShadow: '0 2px 12px rgba(74,48,54,0.02)' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: isMobile ? '0.82rem' : '0.72rem', fontWeight: 800, color: '#a0909a', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}><Bell size={13} color="#d97706" /> Próxima Cita</h4>
                      {nextApp ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(217,119,6,0.04)', borderRadius: '12px', padding: '12px 14px' }}>
                          <div style={{ width: isMobile ? '36px' : '36px', height: isMobile ? '36px' : '36px', borderRadius: '10px', background: 'rgba(217,119,6,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Clock size={isMobile ? 16 : 16} color="#d97706" />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: isMobile ? '1.1rem' : '1rem', fontWeight: 900, color: '#d97706' }}>{nextApp.timeStr}</div>
                            <div style={{ fontSize: isMobile ? '0.72rem' : '0.52rem', color: '#a0909a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Volumen 3D · María Fernández</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: isMobile ? '0.82rem' : '0.72rem', color: '#a0909a', fontStyle: 'italic' }}>Sin más citas hoy</div>
                      )}
                    </div>
                    {/* Horas muertas */}
                    <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: isMobile ? '14px' : '18px', padding: isMobile ? '16px' : '18px', boxShadow: '0 2px 12px rgba(74,48,54,0.02)' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: isMobile ? '0.82rem' : '0.72rem', fontWeight: 800, color: '#a0909a', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={13} color={parseFloat(idleHours) > 3 ? '#dc2626' : '#a0909a'} /> Horas Sin Citas</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: isMobile ? '1.3rem' : '1.2rem', fontWeight: 900, color: parseFloat(idleHours) > 3 ? '#dc2626' : '#2d1b22' }}>{idleHours}h</div>
                        <div style={{ fontSize: isMobile ? '0.72rem' : '0.5rem', color: '#a0909a', fontWeight: 600 }}>disponibles en turno</div>
                      </div>
                      {parseFloat(idleHours) > 3 && (
                        <div style={{ fontSize: isMobile ? '0.68rem' : '0.48rem', color: '#dc2626', fontWeight: 600, marginTop: '6px', background: 'rgba(239,68,68,0.06)', padding: '6px 10px', borderRadius: '8px' }}>Horario con huecos — considerar promociones</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom row: Ranking + Satisfacción + Tips */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: isMobile ? '12px' : '14px' }}>
                  {/* Ranking semanal */}
                  <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: isMobile ? '14px' : '18px', padding: isMobile ? '16px' : '18px', boxShadow: '0 2px 12px rgba(74,48,54,0.02)' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: isMobile ? '0.82rem' : '0.72rem', fontWeight: 800, color: '#a0909a', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}><BarChart3 size={13} color="#c97282" /> Ranking Semanal</h4>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
                      <span style={{ fontSize: isMobile ? '1.8rem' : '1.6rem', fontWeight: 900, color: '#c97282' }}>#{ranking.position}</span>
                      <span style={{ fontSize: isMobile ? '0.72rem' : '0.55rem', color: '#a0909a', fontWeight: 600 }}>/ {ranking.total} estilistas</span>
                    </div>
                    <div style={{ height: '7px', background: '#fcf6f7', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'linear-gradient(90deg, #c97282, #c48b9f)', width: `${ranking.occupancy}%`, borderRadius: '6px', transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ fontSize: isMobile ? '0.68rem' : '0.48rem', color: '#a0909a', marginTop: '6px' }}>{ranking.occupancy}% ocupación semanal</div>
                  </div>

                  {/* Satisfacción */}
                  <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: isMobile ? '14px' : '18px', padding: isMobile ? '16px' : '18px', boxShadow: '0 2px 12px rgba(74,48,54,0.02)' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: isMobile ? '0.82rem' : '0.72rem', fontWeight: 800, color: '#a0909a', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}><Star size={13} color="#d97706" /> Satisfacción</h4>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ fontSize: isMobile ? '1.8rem' : '1.6rem', fontWeight: 900, color: '#d97706' }}>4.8</span>
                      <span style={{ fontSize: isMobile ? '0.72rem' : '0.55rem', color: '#a0909a', fontWeight: 600 }}>/ 5.0</span>
                    </div>
                    <div style={{ display: 'flex', gap: '3px', marginBottom: '8px' }}>
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} size={isMobile ? 16 : 14} color={star <= 4 ? '#d97706' : '#d97706'} fill={star <= 4 ? '#d97706' : (star === 5 ? '#d9770666' : 'none')} strokeWidth={star <= 4 ? 0 : 1.5} />
                      ))}
                    </div>
                    <div style={{ fontSize: isMobile ? '0.68rem' : '0.48rem', color: '#a0909a' }}>Basado en {m.citasCount} citas</div>
                  </div>

                  {/* Tip del día */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(201,114,130,0.06) 0%, rgba(201,114,130,0.02) 100%)', border: '1px solid rgba(201,114,130,0.15)', borderRadius: isMobile ? '14px' : '18px', padding: isMobile ? '16px' : '18px', boxShadow: '0 2px 12px rgba(74,48,54,0.02)' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: isMobile ? '0.82rem' : '0.72rem', fontWeight: 800, color: '#c97282', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}><Info size={13} color="#c97282" /> Tip del Día</h4>
                    <p style={{ fontSize: isMobile ? '0.82rem' : '0.68rem', color: '#2d1b22', lineHeight: 1.5, margin: 0 }}>Aplicar sérum post-láser en la próxima cita de Volumen 3D. Mejora la retención del 88% al 94% según estudios internos.</p>
                  </div>
                </div>

              </div>
              );
            })()}

            {/* TAB CONTENT: SERVICIOS REALIZADOS */}
            {staffActiveTab === 'servicios' && (
              <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : 'repeat(3, 1fr)', gap: (isMobile || isTablet) ? '12px' : '20px', width: '100%' }} className="animate-fade-in">
                {[
                  { name: 'Volumen 3D', duration: '90 min', price: '$ 64.00', qty: 2, icon: '✨' },
                  { name: 'Extensiones Clásicas', duration: '75 min', price: '$ 28.00', qty: 1, icon: '💅' },
                  { name: 'Retoque Clásico', duration: '45 min', price: '$ 6.00', qty: 1, icon: '🌸' }
                ].map((srv, idx) => (
                  <div key={idx} className="mi-card" style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.15)', borderRadius: '20px', padding: '20px', display: 'flex', gap: '14px', alignItems: 'center', boxShadow: '0 4px 15px rgba(74,48,54,0.02)' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(201, 114, 130,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                      {srv.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#2d1b22' }}>{srv.name}</h4>
                      <div style={{ fontSize: '0.68rem', color: '#a0909a', fontWeight: 650, marginTop: '2px' }}>{srv.duration} · {srv.price} c/u</div>
                      <div style={{ fontSize: '0.72rem', color: '#c97282', fontWeight: 800, marginTop: '6px' }}>Completados hoy: {srv.qty}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB CONTENT: HISTORIAL */}
            {staffActiveTab === 'historial' && (
              <div style={{ background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '24px', padding: '24px', width: '100%', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }} className="animate-fade-in">
                <h3 className="mi-section-header" style={{ fontSize: '1rem', fontWeight: 800, color: '#2d1b22', margin: '0 0 20px 0' }}>Historial del Día (Operación de Hoy)</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '20px', borderLeft: '2px solid rgba(223, 178, 140, 0.12)' }}>
                  {[
                    { time: '10:30 AM', action: 'Completó Cita de María Fernández', details: 'Servicio: Volumen 3D · Recaudado: $ 64.00' },
                    { time: '09:00 AM', action: 'Inició Cita de María Fernández', details: 'Registrado en cabina principal' },
                    { time: '08:45 AM', action: 'Ingreso al salón y check-in de turno', details: 'Estado actualizado a Disponible' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      {/* Timeline node dot */}
                      <div style={{ position: 'absolute', left: '-25px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#c97282', border: '2px solid #fff', boxShadow: '0 0 0 3px rgba(201, 114, 130,0.15)' }} />
                      <div style={{ fontSize: '0.65rem', color: '#a0909a', fontWeight: 800 }}>{item.time}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#2d1b22', marginTop: '2px' }}>{item.action}</div>
                      <div style={{ fontSize: '0.7rem', color: '#8c767b', marginTop: '1px' }}>{item.details}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: NOTAS */}
            {staffActiveTab === 'notas' && (
              <div style={{ display: 'flex', flexDirection: (isMobile || isTablet) ? 'column' : 'row', gap: (isMobile || isTablet) ? '16px' : '24px', width: '100%' }} className="animate-fade-in">
                <div style={{ flex: 1.5, background: '#fff', border: '1px solid rgba(223,178,140,0.18)', borderRadius: '24px', padding: (isMobile || isTablet) ? '16px' : '24px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)' }}>
                  <h3 className="mi-section-header" style={{ fontSize: '1rem', fontWeight: 800, color: '#2d1b22', margin: '0 0 16px 0' }}>Bloc de Notas Internas</h3>
                  <textarea 
                    placeholder="Escribe notas generales sobre el desempeño, preferencias de materiales o avisos para esta especialista..."
                    className="mi-input"
                    style={{
                      width: '100%', height: '180px', border: '1px solid rgba(223,178,140,0.15)', borderRadius: '16px',
                      background: '#faf6f5', padding: '16px', fontSize: '0.82rem', color: '#2d1b22', outline: 'none',
                      resize: 'none', fontWeight: 550, lineHeight: '1.5'
                    }}
                    defaultValue="Nota de cabina: Isabella prefiere utilizar el adhesivo de secado rápido (0.5s) en cabinas con humedad controlada de 50%. En el turno de tarde, requiere asistencia de recepción para la preparación de pestañas pre-armadas."
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                    <button 
                      onClick={() => showToast?.('Notas guardadas correctamente', 'success')}
                      className="mi-btn btn-hover-scale"
                      style={{
                        padding: '10px 24px', borderRadius: '12px', border: 'none',
                        background: 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)',
                        color: '#ffffff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(201, 114, 130, 0.2)'
                      }}
                    >
                      Guardar notas
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="mi-card" style={{ background: '#fff0f2', border: '1px solid rgba(201, 114, 130,0.12)', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(74, 48, 54, 0.01)' }}>
                    <h4 className="mi-section-header" style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#a0506a', fontWeight: 750 }}>RECORDATORIO</h4>
                    <p style={{ fontSize: '0.78rem', color: '#2d1b22', lineHeight: '1.4' }}>Las notas son privadas y solo visibles para administradoras y dueñas del salón en esta consola de CRM.</p>
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
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: 0
            }}>
              {/* Header */}
              <div>
                {/* Pink Hero Header (full-bleed) */}
                <div style={{
                  background: 'linear-gradient(135deg, #c97282 0%, #a0506a 100%)',
                  padding: '26px 24px 22px', position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{ position: 'absolute', top: '-50px', right: '-40px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: '-60px', left: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '9px', backgroundColor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <CalendarIcon size={15} />
                      </div>
                      <h4 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.85)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        Detalle del Turno
                      </h4>
                    </div>
                    <button
                      onClick={triggerCloseDetailedApp}
                      className="mi-btn"
                      style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ marginTop: '20px', position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 850, color: '#fff', letterSpacing: '-0.3px' }}>
                      {selectedDetailedApp.clients?.name || 'Cliente'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.9)', fontWeight: 650 }}>
                        {formattedDate} · {formattedTime}
                      </span>
                      <span className="mi-tag" style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '0.62rem', fontWeight: 800,
                        background: 'rgba(255,255,255,0.22)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)'
                      }}>
                        {selectedDetailedApp.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '22px 24px 4px' }}>
                  {/* Client Card (Foto 2 Inspired) */}
                  <div className="mi-card" style={{
                    padding: '16px', borderRadius: '16px', border: '1.5px solid rgba(223,178,140,0.22)',
                    background: '#ffffff', boxShadow: '0 4px 12px rgba(74, 48, 54, 0.03)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
                        backgroundColor: 'rgba(160,80,106,0.12)', border: '1.5px solid var(--pink-primary, #a0506a)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a0506a' }}>
                          {(selectedDetailedApp.clients?.name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.62rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Clienta</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2d1b22' }}>{selectedDetailedApp.clients?.name || 'Cliente'}</div>
                        <div style={{ fontSize: '0.74rem', color: '#c97282', fontWeight: 600, marginTop: '1px' }}>{selectedDetailedApp.clients?.phone || 'Sin número'}</div>
                      </div>
                      {onNavigate && selectedDetailedApp.clients?.id && (
                        <button
                          onClick={() => onNavigate('clients', { clientId: selectedDetailedApp.clients.id })}
                          style={{ fontSize: '0.66rem', fontWeight: 750, color: '#a0506a', background: 'rgba(160,80,106,0.08)', border: '1px solid rgba(160,80,106,0.15)', borderRadius: '10px', padding: '6px 10px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                          Ver ficha ↗
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                      <span className="mi-tag" style={{ fontSize: '0.66rem', fontWeight: 700, color: '#8c767b', background: '#faf6f5', border: '1px solid rgba(223,178,140,0.2)', borderRadius: '8px', padding: '4px 9px' }}>
                        {clientPastAppointments.length > 0 ? `${clientPastAppointments.length} visita${clientPastAppointments.length === 1 ? '' : 's'} anterior${clientPastAppointments.length === 1 ? '' : 'es'}` : 'Primera visita'}
                      </span>
                      <span className="mi-tag" style={{
                        fontSize: '0.66rem', fontWeight: 700, borderRadius: '8px', padding: '4px 9px', border: '1px solid',
                        ...(selectedDetailedApp.status === 'Completado'
                          ? { color: '#16a34a', background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)' }
                          : { color: '#d97706', background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)' })
                      }}>
                        {selectedDetailedApp.status === 'Completado' ? 'Pagado' : 'Pago pendiente'}
                      </span>
                    </div>

                    {selectedDetailedApp.clients?.allergies && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', marginTop: '10px', padding: '9px 11px', borderRadius: '10px', background: 'rgba(220,80,80,0.06)', border: '1px solid rgba(220,80,80,0.18)' }}>
                        <AlertTriangle size={13} color="#c14040" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <div>
                          <div style={{ fontSize: '0.6rem', color: '#c14040', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Alergias</div>
                          <div style={{ fontSize: '0.72rem', color: '#8a3030', fontWeight: 600, marginTop: '1px' }}>{selectedDetailedApp.clients.allergies}</div>
                        </div>
                      </div>
                    )}

                    {clientPastAppointments.length > 0 && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(223,178,140,0.25)' }}>
                        <div style={{ fontSize: '0.6rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>Últimos servicios</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {clientPastAppointments.slice(0, 3).map(pa => (
                            <div key={pa.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                              <span style={{ color: '#2d1b22', fontWeight: 650, lineHeight: 1.3 }}>{pa.services?.name || 'Servicio'}</span>
                              <span style={{ color: '#a0909a', fontWeight: 600, flexShrink: 0, marginLeft: '8px' }}>{new Date(pa.scheduled_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Specialist & Service Card */}
                  <div className="mi-card" style={{
                    padding: '16px', borderRadius: '16px', border: '1.5px solid rgba(223,178,140,0.18)',
                    display: 'flex', flexDirection: 'column', gap: '12px', background: '#faf8f7'
                  }}>
                    {/* Service Row */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #c97282 0%, #a0506a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 3px 8px rgba(160,80,106,0.25)', flexShrink: 0 }}>
                        <Scissors size={14} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.58rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Servicio contratado</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 850, color: '#2d1b22', marginTop: '1px' }}>{selectedDetailedApp.services?.name || 'Servicio'}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#c97282', marginTop: '2px' }}>${Number(selectedDetailedApp.total_price || selectedDetailedApp.services?.price || 0).toFixed(2)}</div>
                      </div>
                    </div>

                    <div style={{ height: '1px', background: 'rgba(223, 178, 140, 0.15)' }} />

                    {/* Specialist Row */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <img 
                        src={activeStaff?.photo_url || `https://i.pravatar.cc/150?u=${encodeURIComponent(staffNameOnly)}`}
                        alt={staffNameOnly} 
                        style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#fff', border: '1px solid rgba(223,178,140,0.2)', objectFit: 'cover' }} 
                      />
                      <div>
                        <div style={{ fontSize: '0.58rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profesional a cargo</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2d1b22', marginTop: '1px' }}>{staffNameOnly}</div>
                        <div style={{ fontSize: '0.68rem', color: '#a0909a', fontWeight: 600 }}>{staffRoleOnly}</div>
                      </div>
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
                      borderLeft: '4px solid #c97282' 
                    }}>
                      <span style={{ fontWeight: 800, color: '#6b4a52', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Notas o Comentarios:</span>
                      <span style={{ color: '#2d1b22', fontStyle: 'italic', fontSize: '0.74rem', lineHeight: '1.4', display: 'block' }}>"{selectedDetailedApp.notes}"</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div style={{ borderTop: '1px solid rgba(223, 178, 140, 0.15)', padding: '20px 24px', paddingBottom: isMobile ? '110px' : '20px', marginTop: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* Fila 1: Acciones Operativas Principales */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                    <button 
                      onClick={() => {
                        showToast?.('Cita completada con éxito', 'success');
                        triggerCloseDetailedApp();
                      }}
                      className="drawer-btn drawer-btn-complete mi-btn"
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
                      className="drawer-btn drawer-btn-reprogram mi-btn"
                      style={{ height: '44px', fontSize: '0.8rem', borderRadius: '14px' }}
                    >
                      <Clock size={14} /> Reprogramar
                    </button>
                  </div>

                  {/* Fila 2: Gestión y Estados Auxiliares */}
                  <div style={{ display: 'grid', gridTemplateColumns: isWorkerView ? '1fr' : '1fr 1.2fr', gap: '10px' }}>
                    <button
                      onClick={() => {
                        triggerCloseDetailedApp();
                        setTimeout(() => {
                          setAppointmentToEdit(selectedDetailedApp);
                          setIsReprogramOnly?.(false);
                          setShowScheduleModal(true);
                        }, 280);
                      }}
                      className="drawer-btn drawer-btn-edit mi-btn"
                      style={{ borderRadius: '12px' }}
                    >
                      <Pencil size={12} /> Editar Ficha
                    </button>
                    {!isWorkerView && (
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
                        className="drawer-btn drawer-btn-noshow mi-btn"
                        style={{ borderRadius: '12px' }}
                      >
                        <AlertTriangle size={12} /> No asistió (No-show)
                      </button>
                    )}
                  </div>

                  {/* Fila 3: Acciones Críticas Unificadas (solo admin/recepción) */}
                  {!isWorkerView && (
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
                    className="drawer-btn drawer-btn-danger mi-btn"
                    style={{ width: '100%', marginTop: '4px', borderRadius: '12px' }}
                  >
                    <XCircle size={12} /> Gestionar Cancelación / Eliminar Cita
                  </button>
                  )}
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
            <div style={{ padding: '6px 8px', fontSize: '0.62rem', fontWeight: 700, color: '#a0909a', borderBottom: '1px solid #f5ebe8', marginBottom: '4px' }}>
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
                    className="mi-btn btn-hover-scale"
                    style={{
                      padding: '5px 8px', fontSize: '0.68rem', textAlign: 'left', border: 'none', borderRadius: '6px',
                      background: isCurrent ? 'rgba(232, 162, 169, 0.15)' : 'transparent',
                      color: isCurrent ? '#a0506a' : '#2d1b22', fontWeight: isCurrent ? 750 : 500, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}
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
              className="mi-btn"
              style={{
                padding: '6px 8px', fontSize: '0.68rem', textAlign: 'left', border: 'none', borderRadius: '6px',
                background: 'transparent', color: '#c97282', fontWeight: 650, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
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
              className="mi-btn"
              style={{
                padding: '6px 8px', fontSize: '0.68rem', textAlign: 'left', border: 'none', borderRadius: '6px',
                background: 'rgba(220, 38, 38, 0.05)', color: '#dc2626', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
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
              color: '#c97282', 
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
                  className="mi-btn"
                  style={{
                    padding: '8px 10px',
                    fontSize: '0.72rem',
                    textAlign: 'left',
                    border: 'none',
                    borderRadius: '10px',
                    background: isCurrent ? 'rgba(201, 114, 130, 0.08)' : 'transparent',
                    color: isCurrent ? '#c97282' : '#2d1b22',
                    fontWeight: isCurrent ? 800 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.18s'
                  }}
                  className="mi-btn btn-hover-scale"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = st.bg;
                    e.currentTarget.style.color = st.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isCurrent ? 'rgba(201, 114, 130, 0.08)' : 'transparent';
                    e.currentTarget.style.color = isCurrent ? '#c97282' : '#2d1b22';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px', flexShrink: 0 }}>
                    {st.icon}
                  </div>
                  <span style={{ flex: 1 }}>{st.label}</span>
                  {isCurrent && <span style={{ fontSize: '0.62rem', color: '#c97282', fontWeight: 900 }}>✓</span>}
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
