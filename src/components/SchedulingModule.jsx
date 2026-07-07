import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon, Clock, User, Plus, ChevronLeft, ChevronRight,
  ChevronDown, Search, Filter, MoreVertical, Pencil, Trash2,
  CheckCircle2, AlertCircle, XCircle, Loader2, Users, Sparkles,
  CalendarDays, StickyNote, BarChart3, Eye, Scissors
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import ScheduleModal from './ScheduleModal';
import NewClientModal from './NewClientModal';
import { normalizeForSearch } from '../utils/stringUtils';

const DEMO_STAFF = [
  { id: 1, name: 'Isabella R.', role: 'Estilista Senior', initial: 'I', nextAvailable: '6:00 PM' },
  { id: 2, name: 'Valeria M.', role: 'Nail Artist', initial: 'V', nextAvailable: '5:30 PM' },
  { id: 3, name: 'Camila P.', role: 'Esteticista', initial: 'C', nextAvailable: '4:00 PM' },
];

const DEMO_APPOINTMENTS = [
  { time: '9:00 AM', client: 'María Gabriela R.', service: 'Coloración Balayage', duration: '90 min', staff: 'Estilista Senior', status: 'Confirmada', initial: 'M' },
  { time: '11:00 AM', client: 'Valentina S.', service: 'Uñas Acrílicas', duration: '90 min', staff: 'Nail Artist', status: 'Confirmada', initial: 'V' },
  { time: '12:00 PM', client: 'Daniela P.', service: 'Limpieza Facial Premium', duration: '60 min', staff: 'Esteticista', status: 'Pendiente', initial: 'D' },
  { time: '2:00 PM', client: 'Andrea L.', service: 'Extensiones de Pestañas', duration: '90 min', staff: 'Esteticista', status: 'Confirmada', initial: 'A' },
  { time: '4:00 PM', client: 'Camila P.', service: 'Corte + Brushing', duration: '60 min', staff: 'Estilista Senior', status: 'En proceso', initial: 'C' },
  { time: '5:00 PM', client: 'Sofía M.', service: 'Diseño de Cejas', duration: '30 min', staff: 'Esteticista', status: 'Confirmada', initial: 'S' },
];

const TIME_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'
];

const STATUS_COLORS = {
  'Confirmada': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', leftBorder: '#22c55e' },
  'Pendiente': { bg: '#fffbeb', text: '#d97706', border: '#fde68a', leftBorder: '#f59e0b' },
  'En proceso': { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd', leftBorder: '#0ea5e9' },
  'Agendado': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', leftBorder: '#22c55e' },
  'En Silla': { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd', leftBorder: '#0ea5e9' },
  'Completado': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', leftBorder: '#22c55e' },
  'Cancelada': { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', leftBorder: '#ef4444' },
};

const CalendarComponent = ({ selectedDate, onSelectDate, appointments }) => {
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

const SchedulingModule = ({ isMobile, rates, openScheduleModal = false, modalKey = null }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const [appointments, setAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('day');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStaff, setFilterStaff] = useState('all');
  const [filterService, setFilterService] = useState('all');

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
    window.addEventListener('jana:data-changed', refreshOnAppointmentChange);
    return () => window.removeEventListener('jana:data-changed', refreshOnAppointmentChange);
  }, [selectedDate, filterType]);

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

  const getStatusLabel = (status) => {
    const map = { 'Agendado': 'Confirmada', 'En Silla': 'En proceso', 'En Tratamiento': 'En proceso', 'Por Pagar': 'En proceso', 'Completado': 'Confirmada', 'Cancelada': 'Cancelada' };
    return map[status] || status;
  };

  const getAppointmentDate = (app) => new Date(app.scheduled_at || app.created_at);

  const formatDuration = (minutes) => {
    const safeMinutes = Number(minutes) || 60;
    return `${safeMinutes} min`;
  };

  const slotToMinutes = (slot) => {
    const match = slot.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/);
    if (!match) return -1;
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = match[3];
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const appToMinutes = (app) => {
    const date = getAppointmentDate(app);
    return date.getHours() * 60 + date.getMinutes();
  };

  const toDisplayAppointment = (app) => {
    const clientName = app.clients?.name || 'Cliente';
    const status = getStatusLabel(app.status);
    const appDate = getAppointmentDate(app);
    return {
      ...app,
      time: appDate.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase(),
      client: clientName,
      service: app.services?.name || 'Servicio',
      duration: formatDuration(app.services?.duration_minutes || app.duration_minutes),
      staff: app.staff?.name || 'Sin especialista',
      status,
      initial: clientName.charAt(0).toUpperCase()
    };
  };

  const filteredApps = (appointments.length > 0 ? appointments : []).filter(app => {
    if (!searchTerm) return true;
    const term = normalizeForSearch(searchTerm);
    return normalizeForSearch(app.clients?.name || '').includes(term) || normalizeForSearch(app.clients?.phone || '').includes(term);
  }).sort((a, b) => getAppointmentDate(a) - getAppointmentDate(b));

  const displayApps = filteredApps.map(toDisplayAppointment);

  const totalCitas = filteredApps.length;
  const confirmadas = filteredApps.filter(a => a.status === 'Agendado' || a.status === 'Completado').length;
  const pendientes = filteredApps.filter(a => a.status === 'En Silla' || a.status === 'En Tratamiento').length;
  const enProceso = filteredApps.filter(a => a.status === 'Por Pagar').length;
  const nextAppointment = displayApps[0];
  const availableSlots = TIME_SLOTS.length - TIME_SLOTS.filter(slot => {
    const slotMinutes = slotToMinutes(slot);
    return displayApps.some(app => appToMinutes(app) >= slotMinutes && appToMinutes(app) < slotMinutes + 60);
  }).length;
  const confirmedPercent = totalCitas ? Math.round(confirmadas / totalCitas * 100) : 0;

  const dayName = selectedDate.toLocaleDateString('es-VE', { weekday: 'long' });
  const dayNum = selectedDate.getDate();
  const monthName = selectedDate.toLocaleDateString('es-VE', { month: 'long' });

  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile ? 'calc(100px + env(safe-area-inset-bottom, 12px))' : '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 700, color: '#4a3036', margin: 0, fontFamily: 'Playfair Display, serif' }}>
            Agenda <span className="text-gradient">Jana</span>
          </h1>
          {!isMobile && <p style={{ fontSize: '0.8rem', color: '#a07880', margin: '4px 0 0 0', fontWeight: 500 }}>
            Gestión inteligente de citas y disponibilidad.
          </p>}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {!isMobile && <button onClick={() => setShowNewClientModal(true)} style={{
            padding: '10px 18px', borderRadius: '12px', border: '1px solid rgba(223,178,140,0.4)',
            background: '#fff', color: '#6b4a52', fontSize: '0.8rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
          }} className="btn-hover-scale"><User size={16} /> Nuevo Cliente</button>}
          <button onClick={() => setShowScheduleModal(true)} style={{
            padding: isMobile ? '10px 14px' : '10px 18px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)',
            color: '#fff', fontSize: isMobile ? '0.75rem' : '0.8rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 4px 15px rgba(219,140,149,0.25)', transition: 'all 0.2s', whiteSpace: 'nowrap'
          }} className="btn-hover-scale"><Plus size={16} /> Agendar</button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? '8px' : '16px', marginBottom: '20px' }}>
        {[
          { icon: CalendarDays, label: 'Citas', value: totalCitas, sub: nextAppointment ? `Sig: ${nextAppointment.time}` : 'Sin citas' },
          { icon: Clock, label: 'Libres', value: availableSlots, sub: 'horas hoy' },
          { icon: CheckCircle2, label: 'OK', value: confirmadas, sub: `${confirmedPercent}%` },
        ].map((stat, idx) => (
          <div key={idx} className="agenda-glass-card" style={{
            padding: isMobile ? '12px 8px' : '18px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'center' : 'center',
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
          <CalendarComponent selectedDate={selectedDate} onSelectDate={setSelectedDate} appointments={appointments} />

          {/* Filters */}
          <div className="agenda-glass-card" style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3036', margin: '0 0 14px 0', borderBottom: '1px solid rgba(223,178,140,0.2)', paddingBottom: '8px' }}>Filtros de vista</h4>

            {/* View Type Toggle */}
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

            {/* Status Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              {['Confirmadas', 'Pendientes'].map(s => (
                <button key={s} style={{
                  flex: 1, padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(223,178,140,0.3)',
                  background: '#fff', color: '#6b4a52', fontSize: '0.72rem', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s'
                }} className="btn-hover-scale">
                  {s} <ChevronDown size={13} color="#c97282" />
                </button>
              ))}
            </div>

            {/* Staff Filter */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <select style={{
                width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid rgba(223,178,140,0.3)',
                background: '#fff', color: '#6b4a52', fontSize: '0.72rem', fontWeight: 500,
                outline: 'none', cursor: 'pointer', appearance: 'none'
              }}>
                <option>Especialista</option>
                {staff.map(s => <option key={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown size={13} color="#c97282" style={{ position: 'absolute', right: '12px', top: '12px', pointerEvents: 'none' }} />
            </div>

            {/* Service Filter */}
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <select style={{
                width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid rgba(223,178,140,0.3)',
                background: '#fff', color: '#6b4a52', fontSize: '0.72rem', fontWeight: 500,
                outline: 'none', cursor: 'pointer', appearance: 'none'
              }}>
                <option>Servicio</option>
                {services.map(s => <option key={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown size={13} color="#c97282" style={{ position: 'absolute', right: '12px', top: '12px', pointerEvents: 'none' }} />
            </div>

            <button onClick={() => { setFilterStatus('all'); setFilterStaff('all'); setFilterService('all'); }} style={{
              width: '100%', padding: '9px', borderRadius: '10px', border: '1px solid rgba(196,139,159,0.2)',
              background: 'rgba(196,139,159,0.06)', color: '#c97282', fontSize: '0.72rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s'
            }} className="btn-hover-scale">
              <XCircle size={13} /> Limpiar filtros
            </button>
          </div>
        </div>

        {/* Center: Timeline */}
        <div className="agenda-glass-card" style={{ padding: '20px' }}>
          {/* Date Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#4a3036', margin: 0, textTransform: 'capitalize', fontFamily: 'Playfair Display, serif' }}>
              {dayName}, {dayNum} de {monthName}
            </h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))} style={{
                width: '30px', height: '30px', borderRadius: '10px', border: '1px solid rgba(223,178,140,0.3)',
                background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', transition: 'all 0.2s'
              }} className="btn-hover-scale"><ChevronLeft size={15} /></button>
              <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))} style={{
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
              placeholder="Buscar por nombre, cédula o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1, border: 'none', background: 'none', outline: 'none',
                fontSize: '0.8rem', color: '#4a3036'
              }}
            />
            <Filter size={16} color="#db8c95" style={{ cursor: 'pointer' }} />
          </div>

          {/* Timeline Wrapper */}
          <div className="agenda-timeline-container">
            {TIME_SLOTS.map((slot) => {
              const slotMinutes = slotToMinutes(slot);
              const slotApp = displayApps.find(a => appToMinutes(a) >= slotMinutes && appToMinutes(a) < slotMinutes + 60);
              return (
                <div key={slot} className="agenda-time-row">
                  {/* Indicador de la hora */}
                  <div className="agenda-time-indicator">{slot}</div>

                  {/* Punto conector visual */}
                  <div className="agenda-timeline-connector-dot" />

                  {/* Wrapper para el contenido de la cita */}
                  <div className="agenda-appointment-wrapper">
                    {slotApp ? (
                      <div
                        className="agenda-appointment-card"
                        style={{ borderLeftColor: STATUS_COLORS[slotApp.status]?.leftBorder || '#22c55e' }}
                      >
                        {/* Avatar */}
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(219,140,149,0.3)'
                        }}>{slotApp.initial}</div>

                        {/* Textos principales */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: '#4a3036', fontSize: '0.85rem' }}>{slotApp.client}</div>
                          <div style={{ fontSize: '0.72rem', color: '#a07880', marginTop: '2px', fontWeight: 500 }}>{slotApp.service}</div>
                        </div>

                        {/* Duración y especialista */}
                        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ fontSize: '0.7rem', color: '#6b4a52', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                            <Clock size={11} color="#db8c95" /> {slotApp.duration}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#a07880', fontWeight: 500 }}>{slotApp.staff}</div>
                        </div>

                        {/* Badge de estado */}
                        <div
                          className="agenda-status-badge"
                          style={{
                            background: STATUS_COLORS[slotApp.status]?.bg || '#f0fdf4',
                            color: STATUS_COLORS[slotApp.status]?.text || '#16a34a',
                            border: `1px solid ${STATUS_COLORS[slotApp.status]?.border || '#bbf7d0'}`,
                          }}
                        >
                          {slotApp.status}
                        </div>

                        {/* Acciones */}
                        <button style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#db8c95', padding: '4px', display: 'flex', alignItems: 'center'
                        }}><MoreVertical size={16} /></button>
                      </div>
                    ) : (
                      /* Si está libre, ofrecemos agendar directamente en ese slot */
                      <button
                        onClick={() => setShowScheduleModal(true)}
                        className="agenda-free-slot-btn"
                      >
                        <Plus size={14} /> Reservar {slot}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Summary + Specialists + Notes */}
        <div className="agenda-sidebar-right" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Resumen del Día */}
          <div className="agenda-glass-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3036', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={15} color="#db8c95" /> Resumen del Día
              </h4>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#db8c95' }}>
                <MoreVertical size={16} />
              </button>
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
                  <span style={{ fontWeight: 700, color: '#4a3036' }}>7h 30m</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '8px' }}>
                  <span style={{ color: '#8c767b', fontWeight: 500 }}>Disponibilidad</span>
                  <span style={{ fontWeight: 700, color: '#4a3036' }}>4h 30m</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ color: '#8c767b', fontWeight: 500 }}>Ocupación del día</span>
                  <span style={{ fontWeight: 800, color: '#db8c95' }}>63%</span>
                </div>
                <div style={{ marginTop: '8px', height: '6px', borderRadius: '4px', background: 'rgba(232, 162, 169, 0.12)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '63%', borderRadius: '4px', background: 'linear-gradient(90deg, #e8a2a9, #db8c95)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Especialistas del Día */}
          <div className="agenda-glass-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3036', margin: 0 }}>Especialistas</h4>
              <button style={{
                padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(223,178,140,0.3)',
                background: 'transparent', color: '#db8c95', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
              }} className="btn-hover-scale">Ver todos</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {DEMO_STAFF.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0
                  }}>{s.initial}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#4a3036', fontSize: '0.78rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#a07880', fontWeight: 500 }}>{s.role}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.58rem', color: '#a07880', fontWeight: 500 }}>Libre</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4a3036' }}>{s.nextAvailable}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
          onClose={() => setShowScheduleModal(false)}
          clients={clients}
          services={services}
          staff={staff}
          rates={rates}
          defaultDate={selectedDate}
          onSave={() => { setShowScheduleModal(false); loadFilteredAppointments(); }}
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
