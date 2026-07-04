import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon, Clock, User, Plus, ChevronLeft, ChevronRight,
  ChevronDown, Search, Filter, MoreVertical, Pencil, Trash2,
  CheckCircle2, AlertCircle, XCircle, Loader2, Users, Sparkles,
  CalendarDays, StickyNote, BarChart3, Eye
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
  'Confirmada': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  'Pendiente': { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  'En proceso': { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd' },
  'Agendado': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  'En Silla': { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd' },
  'Completado': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  'Cancelada': { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
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
    <div style={{
      padding: '16px', borderRadius: '16px', background: '#fff',
      border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2d2d2d', margin: 0, textTransform: 'capitalize' }}>
          {monthName}
        </h3>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={handlePrev} style={{
            width: '28px', height: '28px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)',
            background: '#faf5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#6b6b6b'
          }}><ChevronLeft size={14} /></button>
          <button onClick={handleNext} style={{
            width: '28px', height: '28px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)',
            background: '#faf5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#6b6b6b'
          }}><ChevronRight size={14} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
          <div key={i} style={{ fontSize: '0.65rem', fontWeight: 600, color: '#9e9e9e', padding: '4px 0' }}>{d}</div>
        ))}
        {days.map((d, i) => {
          const selected = isSelected(d);
          const todayMark = isToday(d);
          return (
            <button
              key={i}
              onClick={() => d.currentMonth && onSelectDate(new Date(year, month, d.day))}
              style={{
                width: '32px', height: '32px', borderRadius: '10px', border: 'none',
                background: selected ? 'linear-gradient(135deg, #c48b9f, #a0506a)' : todayMark ? 'rgba(196,139,159,0.1)' : 'transparent',
                color: selected ? '#fff' : todayMark ? '#c48b9f' : d.currentMonth ? '#2d2d2d' : '#d1d5db',
                fontWeight: selected || todayMark ? 600 : 400,
                fontSize: '0.75rem', cursor: d.currentMonth ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto'
              }}
            >{d.day}</button>
          );
        })}
      </div>
    </div>
  );
};

const SchedulingModule = ({ isMobile, rates }) => {
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
      let data = await dataService.getAppointmentsByState(['Agendado', 'En Silla', 'En Tratamiento', 'Por Pagar', 'Completado', 'Cancelada']);
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      let end = new Date(start);
      if (filterType === 'day') end.setDate(start.getDate() + 1);
      else if (filterType === 'week') { end.setDate(start.getDate() + 7); }
      else if (filterType === 'month') { start.setDate(1); end = new Date(start.getFullYear(), start.getMonth() + 1, 0); end.setHours(23, 59, 59, 999); }

      const filtered = data.filter(a => {
        const appDate = new Date(a.scheduled_at || a.created_at);
        return appDate >= start && appDate < end;
      });
      setAppointments(filtered);
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

  const filteredApps = (appointments.length > 0 ? appointments : []).filter(app => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (app.clients?.name || '').toLowerCase().includes(term) || (app.clients?.phone || '').toLowerCase().includes(term);
  }).sort((a, b) => new Date(a.scheduled_at || a.created_at) - new Date(b.scheduled_at || b.created_at));

  const displayApps = filteredApps.length > 0 ? filteredApps : DEMO_APPOINTMENTS;

  const totalCitas = filteredApps.length || 12;
  const confirmadas = filteredApps.filter(a => a.status === 'Agendado' || a.status === 'Completado').length || 8;
  const pendientes = filteredApps.filter(a => a.status === 'En Silla' || a.status === 'En Tratamiento').length || 2;
  const enProceso = filteredApps.filter(a => a.status === 'Por Pagar').length || 1;

  const dayName = selectedDate.toLocaleDateString('es-VE', { weekday: 'long' });
  const dayNum = selectedDate.getDate();
  const monthName = selectedDate.toLocaleDateString('es-VE', { month: 'long' });

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#2d2d2d', margin: 0 }}>
            Agenda <span className="text-gradient">Jana</span>
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#9e9e9e', margin: '4px 0 0 0' }}>
            Gestión inteligente de citas y disponibilidad.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowNewClientModal(true)} style={{
            padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)',
            background: '#fff', color: '#6b6b6b', fontSize: '0.78rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
          }}><User size={15} /> Nuevo Cliente</button>
          <button onClick={() => setShowScheduleModal(true)} style={{
            padding: '8px 16px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #d4a09a, #c48b9f, #a0506a)',
            color: '#fff', fontSize: '0.78rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 3px 10px rgba(196,139,159,0.25)'
          }}><Plus size={15} /> Agendar Cita</button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px' }}>
        {[
          { icon: CalendarDays, label: 'Citas Hoy', value: totalCitas, sub: 'Próxima: 11:00 AM', color: '#c48b9f' },
          { icon: Clock, label: 'Disponibles', value: 5, sub: 'Horas disponibles', color: '#c48b9f' },
          { icon: CheckCircle2, label: 'Confirmadas', value: confirmadas, sub: `${Math.round(confirmadas / totalCitas * 100)}% del total`, color: '#c48b9f' },
        ].map((stat, idx) => (
          <div key={idx} style={{
            padding: '14px', borderRadius: '14px', background: '#fff',
            border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(196,139,159,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <stat.icon size={18} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#6b6b6b', fontWeight: '500' }}>{stat.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2d2d2d', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.62rem', color: '#9e9e9e', marginTop: '2px' }}>{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Calendar + Timeline + Sidebar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '240px 1fr 240px',
        gap: '18px', alignItems: 'start'
      }}>
        {/* Left: Calendar + Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <CalendarComponent selectedDate={selectedDate} onSelectDate={setSelectedDate} appointments={appointments} />

          {/* Filters */}
          <div style={{
            padding: '14px', borderRadius: '14px', background: '#fff',
            border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <h4 style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2d2d2d', margin: '0 0 10px 0' }}>Filtros de vista</h4>

            {/* View Type Toggle */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', background: '#faf5f5', borderRadius: '10px', padding: '3px' }}>
              {[
                { id: 'day', label: 'Hoy / Día', icon: CalendarDays },
                { id: 'week', label: 'Semana', icon: CalendarDays },
                { id: 'month', label: 'Mes', icon: CalendarDays },
              ].map(f => (
                <button key={f.id} onClick={() => setFilterType(f.id)} style={{
                  flex: 1, padding: '6px 8px', borderRadius: '8px', border: 'none',
                  background: filterType === f.id ? 'linear-gradient(135deg, #c48b9f, #a0506a)' : 'transparent',
                  color: filterType === f.id ? '#fff' : '#6b6b6b',
                  fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                }}>
                  <f.icon size={12} /> {f.label}
                </button>
              ))}
            </div>

            {/* Status Filters */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              {['Confirmadas', 'Pendientes'].map(s => (
                <button key={s} style={{
                  flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)',
                  background: '#faf5f5', color: '#6b6b6b', fontSize: '0.68rem', fontWeight: 500,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                }}>
                  {s} <ChevronDown size={12} />
                </button>
              ))}
            </div>

            {/* Staff Filter */}
            <select style={{
              width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)',
              background: '#faf5f5', color: '#6b6b6b', fontSize: '0.68rem', marginBottom: '8px',
              outline: 'none', cursor: 'pointer'
            }}>
              <option>Especialista</option>
              {staff.map(s => <option key={s.id}>{s.name}</option>)}
            </select>

            {/* Service Filter */}
            <select style={{
              width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)',
              background: '#faf5f5', color: '#6b6b6b', fontSize: '0.68rem', marginBottom: '10px',
              outline: 'none', cursor: 'pointer'
            }}>
              <option>Servicio</option>
              {services.map(s => <option key={s.id}>{s.name}</option>)}
            </select>

            <button onClick={() => { setFilterStatus('all'); setFilterStaff('all'); setFilterService('all'); }} style={{
              width: '100%', padding: '7px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)',
              background: '#faf5f5', color: '#6b6b6b', fontSize: '0.68rem', fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
            }}>
              <XCircle size={12} /> Limpiar filtros
            </button>
          </div>
        </div>

        {/* Center: Timeline */}
        <div style={{
          padding: '16px', borderRadius: '16px', background: '#fff',
          border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          {/* Date Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2d2d2d', margin: 0 }}>
              {dayName.charAt(0).toUpperCase() + dayName.slice(1)}, {dayNum} de {monthName}
            </h3>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))} style={{
                width: '28px', height: '28px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)',
                background: '#faf5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6b6b'
              }}><ChevronLeft size={14} /></button>
              <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))} style={{
                width: '28px', height: '28px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)',
                background: '#faf5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6b6b'
              }}><ChevronRight size={14} /></button>
            </div>
          </div>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
            borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)', background: '#faf5f5',
            marginBottom: '14px'
          }}>
            <Search size={14} color="#9e9e9e" />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1, border: 'none', background: 'none', outline: 'none',
                fontSize: '0.75rem', color: '#2d2d2d'
              }}
            />
            <Filter size={14} color="#9e9e9e" style={{ cursor: 'pointer' }} />
          </div>

          {/* Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {TIME_SLOTS.map((slot) => {
              const slotApp = displayApps.find(a => a.time === slot);
              return (
                <div key={slot} style={{
                  display: 'flex', gap: '12px', minHeight: '60px',
                  borderBottom: '1px solid rgba(0,0,0,0.03)'
                }}>
                  <div style={{
                    width: '65px', flexShrink: 0, paddingTop: '12px',
                    fontSize: '0.68rem', color: '#9e9e9e', fontWeight: 500
                  }}>{slot}</div>

                  <div style={{ flex: 1, padding: '8px 0' }}>
                    {slotApp ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderRadius: '12px',
                        background: '#faf5f5', transition: 'all 0.2s ease'
                      }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #c48b9f, #a0506a)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 600, fontSize: '0.78rem', flexShrink: 0
                        }}>{slotApp.initial}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#2d2d2d', fontSize: '0.78rem' }}>{slotApp.client}</div>
                          <div style={{ fontSize: '0.68rem', color: '#6b6b6b', marginTop: '1px' }}>{slotApp.service}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.65rem', color: '#9e9e9e' }}>{slotApp.duration}</div>
                          <div style={{ fontSize: '0.62rem', color: '#9e9e9e', marginTop: '1px' }}>{slotApp.staff}</div>
                        </div>
                        <div style={{
                          padding: '3px 8px', borderRadius: '20px', fontSize: '0.6rem',
                          fontWeight: 600, background: STATUS_COLORS[slotApp.status]?.bg || '#f0fdf4',
                          color: STATUS_COLORS[slotApp.status]?.text || '#16a34a',
                          border: `1px solid ${STATUS_COLORS[slotApp.status]?.border || '#bbf7d0'}`,
                          flexShrink: 0, whiteSpace: 'nowrap'
                        }}>{slotApp.status}</div>
                        <button style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#9e9e9e', padding: '4px', display: 'flex', alignItems: 'center'
                        }}><MoreVertical size={14} /></button>
                      </div>
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center' }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Summary + Specialists + Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Resumen del Día */}
          <div style={{
            padding: '14px', borderRadius: '14px', background: '#fff',
            border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2d2d2d', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart3 size={14} color="#c48b9f" /> Resumen del Día
              </h4>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9e9e9e' }}>
                <MoreVertical size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Total de citas', value: totalCitas },
                { label: 'Confirmadas', value: confirmadas, pct: `${Math.round(confirmadas / totalCitas * 100)}%`, color: '#16a34a' },
                { label: 'Pendientes', value: pendientes, pct: `${Math.round(pendientes / totalCitas * 100)}%`, color: '#d97706' },
                { label: 'En proceso', value: enProceso, pct: `${Math.round(enProceso / totalCitas * 100)}%`, color: '#0284c7' },
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                  <span style={{ color: '#6b6b6b' }}>{item.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#2d2d2d' }}>{item.value}</span>
                    {item.pct && <span style={{ color: item.color, fontWeight: 600, fontSize: '0.65rem' }}>{item.pct}</span>}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '8px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px' }}>
                  <span style={{ color: '#6b6b6b' }}>Horas ocupadas</span>
                  <span style={{ fontWeight: 600, color: '#2d2d2d' }}>7h 30m</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '8px' }}>
                  <span style={{ color: '#6b6b6b' }}>Disponibilidad</span>
                  <span style={{ fontWeight: 600, color: '#2d2d2d' }}>4h 30m</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                  <span style={{ color: '#6b6b6b' }}>Ocupación del día</span>
                  <span style={{ fontWeight: 700, color: '#c48b9f' }}>63%</span>
                </div>
                <div style={{ marginTop: '6px', height: '5px', borderRadius: '3px', background: 'rgba(196,139,159,0.12)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '63%', borderRadius: '3px', background: 'linear-gradient(90deg, #c48b9f, #a0506a)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Especialistas del Día */}
          <div style={{
            padding: '14px', borderRadius: '14px', background: '#fff',
            border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2d2d2d', margin: 0 }}>Especialistas del Día</h4>
              <button style={{
                padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.06)',
                background: 'transparent', color: '#c48b9f', fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer'
              }}>Ver todos</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {DEMO_STAFF.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #c48b9f, #a0506a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 600, fontSize: '0.7rem', flexShrink: 0
                  }}>{s.initial}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#2d2d2d', fontSize: '0.75rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.62rem', color: '#9e9e9e' }}>{s.role}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.58rem', color: '#9e9e9e' }}>Próxima disponible</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#2d2d2d' }}>{s.nextAvailable}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notas Rápidas */}
          <div style={{
            padding: '14px', borderRadius: '14px', background: '#fff',
            border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2d2d2d', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <StickyNote size={14} color="#c48b9f" /> Notas rápidas
              </h4>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c48b9f' }}>
                <Pencil size={13} />
              </button>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#6b6b6b', lineHeight: '1.5' }}>
              <p style={{ margin: '0 0 6px 0' }}>Recordar promoción de hidratación capilar.</p>
              <p style={{ margin: 0 }}>Revisar stock de productos de coloración.</p>
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
