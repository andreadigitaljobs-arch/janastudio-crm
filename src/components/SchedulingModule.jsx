import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sunrise,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Trash2,
  XCircle,
  Pencil,
  Filter,
  List,
  Search,
  Sparkles,
  DollarSign,
  Loader2,
  Check,
  X,
  Minus,
  Package
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import AstroDatePicker from './AstroDatePicker';
import { normalizeForSearch } from '../utils/stringUtils';
import AstroSelect from './AstroSelect';
import AstroDialog from './AstroDialog';
import ScheduleModal from './ScheduleModal';
import { useAuth } from '../context/AuthContext';
import { ModalShield } from '../context/ModalContext';
import AnimatedModal from './AnimatedModal';
import NewClientModal from './NewClientModal';

const getAppointmentUsd = (appointment) => Number(
  appointment?.total_price !== undefined
  && appointment?.total_price !== null
  && Number(appointment.total_price) > 0
    ? appointment.total_price
    : (appointment?.services?.price || 0)
) || 0;

const HistoricalAmount = ({ amount, rate, color = 'var(--pink-primary)', prefix = '' }) => {
  const usd = Number(amount) || 0;
  const bs = usd * (Number(rate) || 0);
  return (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.25 }}>
      <strong style={{ color }}>{prefix}{bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</strong>
      <small style={{ color: 'rgba(255,255,255,0.55)', fontSize: '9px', marginTop: '2px' }}>Ref: {prefix}${usd.toFixed(2)}</small>
    </span>
  );
};

const SchedulingModule = ({ isMobile, rates }) => {
  const { user } = useAuth();
  const { showToast, triggerRocket } = useNotifs();
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [allExtras, setAllExtras] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [dialog, setDialog] = useState({ isOpen: false, appointmentId: null });
  const [editingApp, setEditingApp] = useState(null);
  const [filterType, setFilterType] = useState('day'); // 'day', 'week', 'fortnight', 'month'
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [selectedAppDetail, setSelectedAppDetail] = useState(null);
  const [activeDetail, setActiveDetail] = useState(null);

  useEffect(() => {
    if (selectedAppDetail) {
      setActiveDetail(selectedAppDetail);
    }
  }, [selectedAppDetail]);

  const [collapsedGroups, setCollapsedGroups] = useState({
    morning: true,
    afternoon: true,
    evening: true
  });
  const [expandedGroups, setExpandedGroups] = useState({
    morning: false,
    afternoon: false,
    evening: false
  });
  const ITEMS_PER_GROUP = 5;
  const [showFullCalendar, setShowFullCalendar] = useState(false);

  const [newApp, setNewApp] = useState({
    clientId: '',
    serviceId: '',
    staffId: '',
    time: '10:00',
    extras: [],
    products: []
  });

  useEffect(() => {
    loadBaseData();
    loadAllAppointments(); // For calendar dots
  }, []);

  useEffect(() => {
    loadFilteredAppointments();
  }, [selectedDate, filterType]);

  const loadBaseData = async () => {
    try {
      const [st, cl, sv, ex, pr] = await Promise.all([
        dataService.getStaff(),
        dataService.getClients(),
        dataService.getServices(),
        dataService.getExtras(),
        dataService.getSaleInventoryCatalog()
      ]);
      setStaff(st);
      setClients(cl);
      setServices(sv);
      setAllExtras(ex.filter(e => e.name !== 'SYSTEM_CONFIG_RATES'));
      setAllProducts(pr.filter(p => p.category === 'Venta'));
    } catch (err) {
      console.error(err);
    }
  };

  const loadAllAppointments = async () => {
    try {
      let data = await dataService.getAppointmentsByState(['Agendado', 'En Silla', 'En Tratamiento', 'Por Pagar', 'Completado', 'Cancelada']);
      
      const isBarber = user?.role === 'Estilista' || user?.role?.startsWith('Estilista|') || user?.role === 'Líder Estilista' || user?.role?.startsWith('Líder Estilista|') || user?.role === 'Lider Estilista' || user?.role?.startsWith('Lider Estilista|');
      if (isBarber) {
        data = data.filter(a => String(a.staff_id) === String(user.id));
      }
      
      setAllAppointments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFilteredAppointments = async () => {
    try {
      setLoading(true);
      let data = await dataService.getAppointmentsByState(['Agendado', 'En Silla', 'En Tratamiento', 'Por Pagar', 'Completado', 'Cancelada']);
      
      const isBarber = user?.role === 'Estilista' || user?.role?.startsWith('Estilista|') || user?.role === 'Líder Estilista' || user?.role?.startsWith('Líder Estilista|') || user?.role === 'Lider Estilista' || user?.role?.startsWith('Lider Estilista|');
      if (isBarber) {
        data = data.filter(a => String(a.staff_id) === String(user.id));
      }
      
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      
      let end = new Date(start);
      if (filterType === 'day') {
        end.setDate(start.getDate() + 1);
      } else if (filterType === 'week') {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        end = new Date(start);
        end.setDate(start.getDate() + 7);
      } else if (filterType === 'fortnight') {
        end.setDate(start.getDate() + 14);
      } else if (filterType === 'month') {
        start.setDate(1);
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
      }

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

  const handleEditAppointment = (app) => {
    setEditingApp(app);
    const clientName = clients.find(c => c.id === app.client_id)?.name || '';
    setClientSearchTerm(clientName);
    setClientSearchResults([]);
    setNewApp({
      clientId: app.client_id,
      serviceId: app.service_id,
      staffId: app.staff_id,
      time: new Date(app.scheduled_at || app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      extras: app.appointment_extras?.map(e => e.service_extras?.id) || [],
      products: app.appointment_products?.map(p => ({ id: p.inventory?.id, quantity: p.quantity })) || []
    });
    setShowAddModal(true);
  };

  const handleRescheduleAppointment = (app) => {
    setEditingApp(app);
    const clientName = clients.find(c => c.id === app.client_id)?.name || '';
    setClientSearchTerm(clientName);
    setClientSearchResults([]);
    setNewApp({
      clientId: app.client_id,
      serviceId: app.service_id,
      staffId: app.staff_id,
      time: new Date(app.scheduled_at || app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      extras: app.appointment_extras?.map(e => e.service_extras?.id) || [],
      products: app.appointment_products?.map(p => ({ id: p.inventory?.id, quantity: p.quantity })) || []
    });
    setShowScheduleModal(true);
  };

  const handleClientSearch = (val) => {
    setClientSearchTerm(val);
    setNewApp(prev => ({ ...prev, clientId: '' }));
    if (val.length >= 1) {
      const term = normalizeForSearch(val);
      const results = (clients || []).filter(c => {
        const normalizedName = normalizeForSearch(c.name || '');
        const nameMatches = normalizedName.split(' ').some(w => w.startsWith(term));
        const idMatches = (c.id_card || '').toLowerCase().includes(term);
        return nameMatches || idMatches;
      });
      setClientSearchResults(results.slice(0, 5));
    } else {
      setClientSearchResults([]);
    }
  };

  const handleSelectClient = (client) => {
    setNewApp(prev => ({ ...prev, clientId: client.id }));
    setClientSearchTerm(client.name);
    setClientSearchResults([]);
  };

  const handleTimeSelected = async (isoTime) => {
    try {
      const service = (services || []).find(s => s.id === newApp.serviceId);
      
      let appointmentId = editingApp?.id;

      if (editingApp) {
        await dataService.updateAppointment(editingApp.id, {
          client_id: newApp.clientId,
          service_id: newApp.serviceId,
          staff_id: newApp.staffId,
          total_price: service.price,
          scheduled_at: isoTime
        });
        
        // Limpiar extras y productos anteriores para re-insertar
        await Promise.all([
          dataService.supabase.from('appointment_extras').delete().eq('appointment_id', editingApp.id),
          dataService.supabase.from('appointment_products').delete().eq('appointment_id', editingApp.id)
        ]);
        
        showToast("Cita actualizada");
      } else {
        const created = await dataService.createAppointment({
          client_id: newApp.clientId,
          service_id: newApp.serviceId,
          staff_id: newApp.staffId,
          status: 'Agendado',
          total_price: service.price,
          scheduled_at: isoTime
        });
        appointmentId = created.id;
        showToast("Cita agendada correctamente");
      }

      // Insertar extras y productos
      const extrasPromises = newApp.extras.map(exId => {
        const ex = allExtras.find(e => e.id === exId);
        return dataService.addExtraToAppointment(appointmentId, exId, ex.price);
      });

      const productsPromises = newApp.products.map(p => {
        const prod = allProducts.find(pr => pr.id === p.id);
        return dataService.addProductToAppointment(appointmentId, p.id, p.quantity, prod.price);
      });

      await Promise.all([...extrasPromises, ...productsPromises]);

      setShowAddModal(false);
      setShowScheduleModal(false);
      setEditingApp(null);
      loadFilteredAppointments();
      loadAllAppointments();
    } catch (err) {
      showToast("Error al procesar cita", "error");
    }
  };

  const handleManageAppointment = (id) => {
    setDialog({ isOpen: true, appointmentId: id });
  };

  const handleStartAppointment = async (id) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentStatus(id, 'En Silla');
      showToast("¡Servicio iniciado! El cliente ya está en silla.");
      if (triggerRocket) triggerRocket();
      await Promise.all([loadFilteredAppointments(), loadAllAppointments()]);
    } catch (error) {
      showToast("Error al iniciar servicio", "error");
    } finally {
      setLoading(false);
    }
  };

  const processAction = async (action) => {
    try {
      if (action === 'cancel') {
        await dataService.updateAppointmentStatus(dialog.appointmentId, 'Cancelada');
        showToast("Cita marcada como cancelada");
      } else if (action === 'delete') {
        await dataService.deleteAppointment(dialog.appointmentId);
        showToast("Cita eliminada permanentemente");
      }
      setDialog({ isOpen: false, appointmentId: null });
      loadFilteredAppointments();
      loadAllAppointments();
    } catch (err) {
      showToast("Error al procesar acción", "error");
    }
  };

  const formatDateLabel = (date) => {
    if (filterType === 'day') return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    if (filterType === 'month') return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    const start = new Date(date);
    if (filterType === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
    }
    
    const end = new Date(start);
    if (filterType === 'week') end.setDate(start.getDate() + 6);
    else if (filterType === 'fortnight') end.setDate(start.getDate() + 13);
    
    return `${start.getDate()} ${start.toLocaleDateString('es-ES', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('es-ES', { month: 'short' })}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      'Agendado': { text: 'var(--pink-primary)', bg: 'rgba(212,160,154,0.1)', border: 'rgba(212,160,154,0.25)', dot: 'var(--pink-primary)' },
      'En Silla': { text: '#0a84ff', bg: 'rgba(10,132,255,0.1)', border: 'rgba(10,132,255,0.25)', dot: '#0a84ff' },
      'En Tratamiento': { text: '#64d2ff', bg: 'rgba(100,210,255,0.1)', border: 'rgba(100,210,255,0.25)', dot: '#64d2ff' },
      'Por Pagar': { text: '#bf5af2', bg: 'rgba(191,90,242,0.1)', border: 'rgba(191,90,242,0.25)', dot: '#bf5af2' },
      'Completado': { text: '#30d158', bg: 'rgba(48,209,88,0.15)', border: 'rgba(48,209,88,0.35)', dot: '#30d158' },
      'Cancelada': { text: '#ff453a', bg: 'rgba(255,69,58,0.1)', border: 'rgba(255,69,58,0.25)', dot: '#ff453a' }
    };
    return colors[status] || { text: 'white', bg: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.15)', dot: 'white' };
  };

  const filteredApps = appointments.filter(app => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (app.clients?.name || '').toLowerCase().includes(term) ||
      (app.clients?.id_card || '').toLowerCase().includes(term) ||
      (app.clients?.phone || '').toLowerCase().includes(term)
    );
  }).sort((a, b) => new Date(a.scheduled_at || a.created_at) - new Date(b.scheduled_at || b.created_at));

  const currentRate = Number(rates?.usd) || Number(rates?.bcv) || 550;
  const getAppointmentRate = (app) => Number(app?.exchange_rate) > 0
    ? Number(app.exchange_rate)
    : currentRate;
  const getAppointmentBs = (app) => getAppointmentUsd(app) * getAppointmentRate(app);
  const totalEstimate = filteredApps.reduce((acc, app) => app.status !== 'Cancelada' ? acc + getAppointmentUsd(app) : acc, 0);
  const totalEstimateBs = filteredApps.reduce((acc, app) => app.status !== 'Cancelada' ? acc + getAppointmentBs(app) : acc, 0);
  const activeStaffCount = new Set(filteredApps.map(app => app.staff_id).filter(Boolean)).size;

  const morningApps = [];
  const afternoonApps = [];
  const eveningApps = [];

  filteredApps.forEach(app => {
    const dateObj = new Date(app.scheduled_at || app.created_at);
    const hours = dateObj.getHours();
    if (hours < 12) {
      morningApps.push(app);
    } else if (hours < 19) {
      afternoonApps.push(app);
    } else {
      eveningApps.push(app);
    }
  });

  const getWeekDays = (date) => {
    const week = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(date);
      d.setDate(date.getDate() + i);
      week.push(d);
    }
    return week;
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px', overflowX: 'hidden', maxWidth: '100%' }}>
      
      {/* Styles Injection for Premium Aesthetics */}
      <style>{`
        .scheduling-grid-container {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 24px;
          align-items: start;
          overflow: hidden;
          max-width: 100%;
          box-sizing: border-box;
        }
        .scheduling-grid-container > * {
          min-width: 0;
        }
        @media (max-width: 1150px) {
          .scheduling-grid-container {
            grid-template-columns: 1fr;
          }
        }
        .scheduling-metrics-banner {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
          background: rgba(255, 255, 255, 0.02);
          padding: 12px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          animation: schedulingCardFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 50ms;
        }
        @media (max-width: 600px) {
          .scheduling-metrics-banner {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 1150px) {
          .premium-row-card {
            gap: 12px !important;
            padding: 12px 14px !important;
          }
        }
        @media (max-width: 768px) {
          .premium-row-card {
            gap: 8px !important;
            padding: 10px 12px !important;
          }
        }

        .scheduling-aside {
          position: sticky;
          top: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          z-index: 10;
        }
        @media (max-width: 1150px) {
          .scheduling-aside {
            position: relative;
            top: 0;
            z-index: 1;
          }
        }

        .premium-calendar-aside {
          background: rgba(18, 18, 18, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.04);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          border-radius: 28px;
          padding: 24px;
          max-width: 340px;
          width: 100%;
          margin: 0 auto;
        }
        .premium-filter-segment-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background-color: rgba(0, 0, 0, 0.25);
          padding: 6px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.03);
        }
        .premium-filter-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          border-radius: 16px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
        }
        .premium-filter-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.02);
        }
        .premium-filter-btn.active {
          background: var(--pink-primary);
          color: #121212;
          box-shadow: 0 4px 15px rgba(212, 160, 154, 0.25);
        }
        .premium-search-box {
          background: rgba(18, 18, 18, 0.4);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 14px 22px;
          margin-bottom: 24px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.3s ease;
          animation: schedulingCardFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .premium-search-box:focus-within {
          border-color: rgba(212, 160, 154, 0.4);
          box-shadow: 0 0 20px rgba(212, 160, 154, 0.15), inset 0 0 10px rgba(0,0,0,0.5);
        }
        .premium-search-input {
          flex: 1;
          background: none;
          border: none;
          color: white;
          font-size: 14px;
          font-weight: 700;
          outline: none;
        }
        .premium-search-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
        .appointment-list-wrapper {
          background: rgba(18, 18, 18, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
        }
        @keyframes schedulingCardFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.995);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .premium-row-card {
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: all 0.25s ease, border-color 0.2s, background-color 0.2s, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          background-color: transparent;
          animation: schedulingCardFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .mobile-row-card {
          animation: schedulingCardFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .scheduling-group-card {
          animation: schedulingCardFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .premium-row-card:hover {
          background-color: rgba(255, 255, 255, 0.02);
          border-color: rgba(212, 160, 154, 0.12);
          transform: scale(1.002);
        }
        .avatar-gradient-circle {
          width: 36px;
          height: 36px;
          min-width: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(212, 160, 154, 0.25) 0%, rgba(212, 160, 154, 0.05) 100%);
          border: 1.5px solid rgba(212, 160, 154, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          color: var(--pink-primary);
          font-weight: 900;
          line-height: 1;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 0 8px rgba(212,160,154,0.15);
          flex-shrink: 0;
        }
        .status-glow-badge {
          font-size: 10px;
          font-weight: 850;
          padding: 4px 12px;
          border-radius: 20px;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        .action-icon-btn {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.3);
          cursor: pointer;
          padding: 8px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .premium-row-card:hover .action-icon-btn {
          color: rgba(255, 255, 255, 0.6);
        }
        .action-icon-btn.edit:hover {
          color: var(--pink-primary);
          border-color: rgba(212, 160, 154, 0.3);
          background: rgba(212, 160, 154, 0.08);
          box-shadow: 0 4px 10px rgba(212, 160, 154, 0.1);
        }
        .action-icon-btn.delete:hover {
          color: #ff453a;
          border-color: rgba(255, 69, 58, 0.3);
          background: rgba(255, 69, 58, 0.08);
          box-shadow: 0 4px 10px rgba(255, 69, 58, 0.1);
        }
        .blinking-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
          animation: statusGlow 1.8s ease-in-out infinite;
        }
        @keyframes statusGlow {
          0% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.4; transform: scale(0.9); }
        }
        .price-highlight-tag {
          font-family: 'Outfit', var(--font-sans), system-ui;
          font-weight: 950;
          font-size: 15px;
          color: #30d158;
          text-shadow: 0 0 10px rgba(48, 209, 88, 0.15);
        }
        .date-navigator-card {
          padding: 16px 24px;
          margin-bottom: 20px;
          border-radius: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid rgba(255, 255, 255, 0.04);
          background: rgba(18, 18, 18, 0.3);
          box-sizing: border-box;
          width: 100%;
          overflow: hidden;
        }
        @media (max-width: 600px) {
          .date-navigator-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 16px;
            box-sizing: border-box;
            width: 100%;
            max-width: 100%;
          }
          .date-navigator-card div:last-child {
            width: 100%;
            justify-content: flex-end;
            flex-wrap: wrap;
          }
        }
        .scheduling-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          gap: 16px;
          max-width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 600px) {
          .scheduling-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .scheduling-header button {
            width: 100%;
          }
          .premium-search-box {
            box-sizing: border-box;
            width: 100%;
            max-width: 100%;
          }
          .weekly-ribbon {
            box-sizing: border-box;
            width: 100%;
            max-width: 100%;
          }
          .premium-filter-tabs {
            box-sizing: border-box;
            width: 100%;
            max-width: 100%;
          }
          .scheduling-group-card {
            box-sizing: border-box;
            width: 100%;
            max-width: 100%;
          }
          .scheduling-metrics-banner {
            box-sizing: border-box;
            max-width: 100%;
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 0.9s linear infinite;
          display: block;
        }
        @media (min-width: 1151px) {
          .show-on-tablet {
            display: none !important;
          }
        }
        @media (max-width: 1150px) {
          .hide-on-tablet {
            display: none !important;
          }
        }

        .premium-filter-tabs {
          display: flex;
          gap: 6px;
          background: rgba(0, 0, 0, 0.25);
          padding: 4px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.03);
          margin-bottom: 20px;
          overflow-x: auto;
          scrollbar-width: none;
          box-sizing: border-box;
          width: 100%;
        }
        .premium-filter-tabs::-webkit-scrollbar {
          display: none;
        }
        @media (max-width: 600px) {
          .premium-filter-tabs {
            display: grid;
            grid-template-columns: 1fr 1fr;
            overflow-x: visible;
          }
          .premium-tab-btn {
            flex: unset !important;
            width: 100%;
            font-size: 11px !important;
            padding: 9px 8px !important;
            gap: 5px !important;
          }
        }
        .premium-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .premium-tab-btn:hover {
          color: white;
        }
        .premium-tab-btn.active {
          background: var(--pink-primary);
          color: #121212;
          font-weight: 800;
          box-shadow: 0 2px 8px rgba(212, 160, 154, 0.2);
        }

        .weekly-ribbon {
          display: flex;
          justify-content: space-between;
          background: rgba(18, 18, 18, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 12px;
          border-radius: 20px;
          margin-bottom: 20px;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .weekly-ribbon::-webkit-scrollbar {
          display: none;
        }
        .ribbon-day-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8px 4px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 36px;
        }
        .ribbon-day-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.04);
        }
        .ribbon-day-btn.active {
          background: var(--pink-primary);
          color: #121212;
          font-weight: 800;
          box-shadow: 0 4px 12px rgba(212, 160, 154, 0.25);
        }
        .ribbon-day-btn.today {
          border: 1px solid rgba(212, 160, 154, 0.45) !important;
          background: rgba(212, 160, 154, 0.08);
          color: var(--pink-primary);
        }
        .ribbon-day-btn.today.active {
          border: none !important;
          background: var(--pink-primary);
          color: #121212;
        }
        .ribbon-day-name {
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }
        .ribbon-day-num {
          font-size: 14px;
          font-weight: 800;
        }
        .ribbon-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          margin-top: 4px;
        }
      `}</style>

      <header className="scheduling-header">
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '950', letterSpacing: '-0.8px', fontFamily: 'Outfit, var(--font-sans), system-ui' }}>Agenda <span className="text-pink">Jana</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gestión inteligente de citas y disponibilidad.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowNewClientModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 18px', borderRadius: '14px',
              border: '1.5px solid rgba(212,160,154,0.35)',
              background: 'rgba(212,160,154,0.06)',
              color: 'var(--pink-primary)',
              fontWeight: '800', fontSize: '14px',
              cursor: 'pointer', transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,154,0.12)'; e.currentTarget.style.borderColor = 'rgba(212,160,154,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,160,154,0.06)'; e.currentTarget.style.borderColor = 'rgba(212,160,154,0.35)'; }}
          >
            <User size={16} /> Nuevo Cliente
          </button>
          <button className="btn-pink" style={{ boxShadow: '0 5px 15px rgba(212, 160, 154, 0.25)', whiteSpace: 'nowrap' }} onClick={() => {
              setEditingApp(null);
              setNewApp({ clientId: '', serviceId: '', staffId: user?.id || '', time: '10:00', extras: [], products: [] });
              setClientSearchTerm('');
              setClientSearchResults([]);
              setShowAddModal(true);
            }}>
            <Plus size={18} /> Agendar Cita
          </button>
        </div>
      </header>

      <div className="scheduling-grid-container" style={{ gridTemplateColumns: isMobile ? '1fr' : undefined }}>
        {/* Left Side: Mini Calendar */}
        <aside className="scheduling-aside hide-on-tablet animate-slide-up animate-stagger-1">
          
          <MiniCalendar 
            selectedDate={selectedDate} 
            onDateSelect={(d) => {
              setSelectedDate(d);
              setFilterType('day');
            }} 
            allAppointments={allAppointments}
          />

          <div className="premium-calendar-aside">
            <h4 style={{ fontSize: '11px', fontWeight: '900', color: 'var(--pink-primary)', letterSpacing: '1.5px', marginBottom: '16px', textTransform: 'uppercase' }}>Filtros de Vista</h4>
            <div className="premium-filter-segment-list">
              {[
                { id: 'day', label: 'Hoy / Día', icon: <Clock size={14} /> },
                { id: 'week', label: 'Semanal', icon: <CalendarIcon size={14} /> },
                { id: 'fortnight', label: 'Quincenal', icon: <Filter size={14} /> },
                { id: 'month', label: 'Mensual', icon: <List size={14} /> }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`premium-filter-btn ${filterType === f.id ? 'active' : ''}`}
                >
                  {f.icon}
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Side: Appointments List */}
        <main className="animate-slide-up animate-stagger-2" style={{ minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
          <div className="date-navigator-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ background: 'var(--pink-primary)', width: '36px', height: '36px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', boxShadow: '0 4px 10px rgba(212, 160, 154, 0.3)' }}>
                <CalendarIcon size={16} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '900', textTransform: 'capitalize', color: 'white', fontFamily: 'Outfit, var(--font-sans), system-ui' }}>{formatDateLabel(selectedDate)}</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setShowFullCalendar(!showFullCalendar)} 
                className="show-on-tablet" 
                style={{ 
                  background: showFullCalendar ? 'var(--pink-primary)' : 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: '12px', 
                  width: '38px', 
                  height: '38px', 
                  color: showFullCalendar ? 'black' : 'white', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  transition: 'all 0.2s',
                  marginRight: '4px'
                }}
              >
                <CalendarIcon size={18} />
              </button>
              
              <button onClick={() => {
                const d = new Date(selectedDate);
                if (filterType === 'day') d.setDate(d.getDate() - 1);
                else if (filterType === 'week') d.setDate(d.getDate() - 7);
                else if (filterType === 'fortnight') d.setDate(d.getDate() - 14);
                else if (filterType === 'month') d.setMonth(d.getMonth() - 1);
                setSelectedDate(d);
              }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', width: '38px', height: '38px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}><ChevronLeft size={18} /></button>
              
              <button onClick={() => {
                const d = new Date(selectedDate);
                if (filterType === 'day') d.setDate(d.getDate() + 1);
                else if (filterType === 'week') d.setDate(d.getDate() + 7);
                else if (filterType === 'fortnight') d.setDate(d.getDate() + 14);
                else if (filterType === 'month') d.setMonth(d.getMonth() + 1);
                setSelectedDate(d);
              }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', width: '38px', height: '38px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}><ChevronRight size={18} /></button>
            </div>
          </div>

          {/* Collapsible Monthly Calendar for Tablets/Mobiles */}
          {showFullCalendar && (
            <div className="animate-scale-in show-on-tablet" style={{ marginBottom: '20px' }}>
              <MiniCalendar 
                selectedDate={selectedDate} 
                onDateSelect={(d) => {
                  setSelectedDate(d);
                  setFilterType('day');
                  setShowFullCalendar(false);
                }} 
                allAppointments={allAppointments}
              />
            </div>
          )}

          {/* Segmented Filter Tabs for Tablets/Mobiles */}
          <div className="premium-filter-tabs show-on-tablet">
            {[
              { id: 'day', label: 'Hoy / Día', icon: <Clock size={13} /> },
              { id: 'week', label: 'Semanal', icon: <CalendarIcon size={13} /> },
              { id: 'fortnight', label: 'Quincenal', icon: <Filter size={13} /> },
              { id: 'month', label: 'Mensual', icon: <List size={13} /> }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`premium-tab-btn ${filterType === f.id ? 'active' : ''}`}
              >
                {f.icon}
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          {/* Weekly Day Ribbon for Tablets/Mobiles (Only in Day mode) */}
          {filterType === 'day' && (
            <div className="weekly-ribbon show-on-tablet">
              {getWeekDays(selectedDate).map((date, idx) => {
                const isSelected = selectedDate.toDateString() === date.toDateString();
                const isToday = new Date().toDateString() === date.toDateString();
                const dateStr = date.toISOString().split('T')[0];
                const hasApps = allAppointments.some(a => (a.scheduled_at || a.created_at)?.startsWith(dateStr));
                const dayNamesShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
                
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => {
                      setSelectedDate(date);
                      setFilterType('day');
                    }}
                    className={`ribbon-day-btn ${isSelected ? 'active' : ''} ${isToday ? 'today' : ''}`}
                  >
                    <span className="ribbon-day-name">{isToday ? 'Hoy' : dayNamesShort[date.getDay()]}</span>
                    <span className="ribbon-day-num">{date.getDate()}</span>
                    {hasApps && (
                      <span 
                        className="ribbon-dot" 
                        style={{ 
                          backgroundColor: isSelected ? '#121212' : (isToday ? 'var(--pink-primary)' : 'var(--pink-primary)'),
                          boxShadow: isSelected ? 'none' : '0 0 4px var(--pink-primary)'
                        }} 
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Glowing Search Box */}
          <div className="premium-search-box">
            <Search size={18} color="var(--pink-primary)" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, cédula o teléfono..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="premium-search-input"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ff453a'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              >
                <XCircle size={15} />
              </button>
            )}
          </div>

          <div className="appointment-list-wrapper" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
            {loading ? (
              <div style={{ padding: '100px', textAlign: 'center' }}>
                <Loader2 className="animate-spin" size={32} color="var(--pink-primary)" style={{ margin: '0 auto', marginBottom: '16px' }} />
                <div style={{ color: 'var(--text-muted)', fontWeight: '800', fontSize: '14px' }}>Cargando agenda de citas...</div>
              </div>
            ) : filteredApps.length === 0 ? (
              <div style={{ padding: '80px', textAlign: 'center' }}>
                <Search size={44} color="rgba(212,160,154,0.1)" style={{ marginBottom: '16px' }} />
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700' }}>No se encontraron citas registradas</div>
              </div>
            ) : (
              <div>
                {/* Scrollable Group List with metrics inside */}
                <div style={{ position: 'relative', maxHeight: '700px', overflowY: 'auto', paddingRight: '4px' }}>
                  {/* Metrics Summary Banner - scrolls with content */}
                  <div className="scheduling-metrics-banner" style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <div style={{ background: 'rgba(212, 160, 154, 0.1)', color: 'var(--pink-primary)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CalendarIcon size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Citas</div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>{filteredApps.length}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <div style={{ background: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <DollarSign size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estimado</div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#2ecc71' }}>Bs. {totalEstimateBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: '2px' }}>Ref: ${totalEstimate.toFixed(2)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <div style={{ background: 'rgba(52, 152, 219, 0.1)', color: '#3498db', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estilistas</div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>{activeStaffCount}</div>
                      </div>
                    </div>
                  </div>

                  {[
                    { key: 'morning', title: 'Mañana (12:00 AM - 11:59 AM)', apps: morningApps, icon: <Sunrise size={16} />, color: 'var(--pink-primary)' },
                    { key: 'afternoon', title: 'Tarde (12:00 PM - 06:59 PM)', apps: afternoonApps, icon: <Sun size={16} />, color: '#e8c4be' },
                    { key: 'evening', title: 'Noche (07:00 PM - 11:59 PM)', apps: eveningApps, icon: <Moon size={16} />, color: '#9b59b6' }
                  ].map((group, groupIdx) => {
                    if (group.apps.length === 0) return null;
                    const isCollapsed = collapsedGroups[group.key];
                    return (
                      <div key={group.key} className="scheduling-group-card" style={{ 
                        background: 'rgba(18, 18, 18, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '24px',
                        padding: '16px',
                        animationDelay: `${120 + groupIdx * 80}ms`,
                        marginBottom: '16px',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)'
                      }}>
                        {/* Group Header */}
                        <div 
                          onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            userSelect: 'none',
                            padding: '4px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: group.color, display: 'flex', alignItems: 'center' }}>
                              {group.icon}
                            </span>
                            <span style={{ fontWeight: '800', fontSize: '14px', color: '#fff', fontFamily: 'Outfit, var(--font-sans), system-ui' }}>
                              {group.title}
                            </span>
                            <span style={{
                              fontSize: '10px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              color: 'var(--text-muted)',
                              fontWeight: '750'
                            }}>
                              {group.apps.length} {group.apps.length === 1 ? 'cita' : 'citas'}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-muted)' }}>
                            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                          </div>
                        </div>

                        {/* Group Cards List */}
                        {!isCollapsed && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                            {(expandedGroups[group.key] ? group.apps : group.apps.slice(0, ITEMS_PER_GROUP)).map((app, idx) => {
                              const statusStyle = getStatusColor(app.status);
                                  return isMobile ? (
                                    <div key={app.id} onClick={() => setSelectedAppDetail(app)} className="mobile-row-card" style={{ 
                                      padding: '12px 14px', 
                                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                                      display: 'flex', 
                                      alignItems: 'center',
                                      gap: '12px',
                                      color: '#fff',
                                      cursor: 'pointer',
                                      animationDelay: `${idx * 40}ms`
                                    }}>
                                      {/* Left side: Barber avatar + name */}
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0, width: '48px' }}>
                                        <div className="avatar-gradient-circle" style={{ overflow: 'hidden', width: '32px', height: '32px', minWidth: '32px', fontSize: '11px', margin: 0 }}>
                                          {app.staff?.image_url ? (
                                            <img src={app.staff.image_url} alt={app.staff.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                          ) : (
                                            app.staff?.name?.charAt(0)
                                          )}
                                        </div>
                                        <div style={{ fontWeight: '850', fontSize: '8px', color: 'var(--pink-primary)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.3px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                          {app.staff?.name?.split(' ')[0]}
                                        </div>
                                      </div>

                                      {/* Right side: Detailed info */}
                                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {/* Top Row: Time and Date */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--pink-primary)', whiteSpace: 'nowrap' }}>
                                            {new Date(app.scheduled_at || app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).replace(' ', '').toLowerCase()}
                                          </span>
                                          {filterType !== 'day' && (
                                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                              {new Date(app.scheduled_at || app.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                            </span>
                                          )}
                                        </div>

                                        {/* Row 2: Client Name & Price (aligned) */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '10px' }}>
                                          <div style={{ fontWeight: '800', color: '#fff', fontSize: '13px', wordBreak: 'break-word', flex: 1 }}>
                                            {app.clients?.name}
                                          </div>
                                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                                            <span className="price-highlight-tag" style={{ fontSize: '14px', fontWeight: '950', color: 'var(--pink-primary)', lineHeight: '1.2' }}>
                                              {`${getAppointmentBs(app).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`}
                                            </span>
                                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.55)', fontWeight: '800', marginTop: '1px' }}>
                                              Ref: ${getAppointmentUsd(app).toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        {/* Bottom Row: Service Name, Status Badge */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
                                          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', wordBreak: 'break-word' }}>
                                            {app.services?.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin servicio</span>}
                                          </div>
                                          <div style={{ flexShrink: 0 }}>
                                            <span className="status-glow-badge" style={{ 
                                              fontSize: '8px', 
                                              padding: '3px 6px', 
                                              borderRadius: '6px',
                                              backgroundColor: statusStyle.bg,
                                              color: statusStyle.text,
                                              border: `1px solid ${statusStyle.border}`,
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px'
                                            }}>
                                              <span className="blinking-dot" style={{ backgroundColor: statusStyle.dot, width: '4px', height: '4px', borderRadius: '50%', display: 'inline-block' }} />
                                              {app.status === 'Agendado' ? 'Agenda' : app.status === 'En Silla' ? 'Silla' : app.status === 'En Tratamiento' ? 'Tratamiento' : app.status === 'Por Pagar' ? 'Cobro' : app.status === 'Completado' ? 'Listo' : 'Canc'}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Row 4: Start Button (si aplica: status === 'Agendado') */}
                                        {app.status === 'Agendado' && (
                                          <div style={{ marginTop: '4px' }}>
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartAppointment(app.id);
                                              }}
                                              className="btn-premium-start"
                                              style={{ 
                                                padding: '6px 12px', 
                                                borderRadius: '8px', 
                                                background: 'var(--pink-primary)', 
                                                color: 'black', 
                                                border: 'none', 
                                                fontSize: '11px', 
                                                fontWeight: '900', 
                                                cursor: 'pointer', 
                                                display: 'inline-flex', 
                                                alignItems: 'center', 
                                                gap: '6px',
                                                transition: 'all 0.25s'
                                              }}
                                            >
                                              <Clock size={12} /> INICIAR
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      {/* Action Buttons for Mobile */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                        <button onClick={() => handleEditAppointment(app)} className="action-icon-btn edit" title="Editar detalles" style={{ padding: '6px', borderRadius: '6px' }}>
                                          <Pencil size={12} />
                                        </button>
                                        <button onClick={() => handleRescheduleAppointment(app)} className="action-icon-btn edit" title="Reagendar / Cambiar Hora" style={{ padding: '6px', borderRadius: '6px' }}>
                                          <Clock size={12} />
                                        </button>
                                        <button onClick={() => handleManageAppointment(app.id)} className="action-icon-btn delete" title="Cancelar / Eliminar" style={{ padding: '6px', borderRadius: '6px' }}>
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div key={app.id} onClick={() => setSelectedAppDetail(app)} className="premium-row-card" style={{ 
                                      animationDelay: `${idx * 40}ms`
                                    }}>
                                      {/* Left side: Barber avatar + name */}
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0, width: '60px' }}>
                                        <div className="avatar-gradient-circle" style={{ overflow: 'hidden', width: '36px', height: '36px', minWidth: '36px', fontSize: '13px', margin: 0 }}>
                                          {app.staff?.image_url ? (
                                            <img src={app.staff.image_url} alt={app.staff.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                          ) : (
                                            app.staff?.name?.charAt(0)
                                          )}
                                        </div>
                                        <div style={{ fontWeight: '850', fontSize: '9px', color: 'var(--pink-primary)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.3px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                          {app.staff?.name?.split(' ')[0]}
                                        </div>
                                      </div>
                                  {/* Middle side: Detailed info */}
                                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {/* Top Row: Time and Date */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--pink-primary)', whiteSpace: 'nowrap' }}>
                                        {new Date(app.scheduled_at || app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).replace(' ', '').toLowerCase()}
                                      </span>
                                      {filterType !== 'day' && (
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                          {new Date(app.scheduled_at || app.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                        </span>
                                      )}
                                    </div>

                                    {/* Row 2: Client Name & Price (shows completely and aligned) */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '12px' }}>
                                      <div style={{ fontWeight: '800', color: '#fff', fontSize: '14px', wordBreak: 'break-word', flex: 1 }}>
                                        {app.clients?.name}
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                                          <span className="price-highlight-tag" style={{ fontSize: '15px', fontWeight: '950', color: 'var(--pink-primary)', lineHeight: '1.2' }}>
                                            {`${getAppointmentBs(app).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`}
                                          </span>
                                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', fontWeight: '800', marginTop: '1px' }}>
                                            Ref: ${getAppointmentUsd(app).toFixed(2)}
                                          </span>
                                        </div>
                                    </div>
                                    
                                    {/* Bottom Row: Service Name, Status Badge */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
                                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', wordBreak: 'break-word' }}>
                                        {app.services?.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin servicio</span>}
                                      </div>
                                      <div style={{ flexShrink: 0 }}>
                                        <span className="status-glow-badge" style={{ 
                                          fontSize: '9px', 
                                          padding: '3px 8px', 
                                          borderRadius: '6px',
                                          backgroundColor: statusStyle.bg,
                                          color: statusStyle.text,
                                          border: `1px solid ${statusStyle.border}`,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}>
                                          <span className="blinking-dot" style={{ backgroundColor: statusStyle.dot, width: '4px', height: '4px', borderRadius: '50%', display: 'inline-block' }} />
                                          {app.status}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Row 4: Start Button (si aplica: status === 'Agendado') */}
                                    {app.status === 'Agendado' && (
                                      <div style={{ marginTop: '4px' }}>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStartAppointment(app.id);
                                          }}
                                          className="btn-premium-start"
                                          style={{ 
                                            padding: '6px 12px', 
                                            borderRadius: '8px', 
                                            background: 'var(--pink-primary)', 
                                            color: 'black', 
                                            border: 'none', 
                                            fontSize: '11px', 
                                            fontWeight: '900', 
                                            cursor: 'pointer', 
                                            display: 'inline-flex', 
                                            alignItems: 'center', 
                                            gap: '6px',
                                            transition: 'all 0.25s'
                                          }}
                                        >
                                          <Clock size={12} /> INICIAR
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Right side: Action Buttons */}
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                    <button onClick={() => handleEditAppointment(app)} className="action-icon-btn edit" title="Editar detalles" style={{ padding: '8px', borderRadius: '8px' }}>
                                      <Pencil size={14} />
                                    </button>
                                    <button onClick={() => handleRescheduleAppointment(app)} className="action-icon-btn edit" title="Reagendar / Cambiar Hora" style={{ padding: '8px', borderRadius: '8px' }}>
                                      <Clock size={14} />
                                    </button>
                                    <button onClick={() => handleManageAppointment(app.id)} className="action-icon-btn delete" title="Cancelar / Eliminar" style={{ padding: '8px', borderRadius: '8px' }}>
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            {/* Ver más / Ver menos button */}
                            {group.apps.length > ITEMS_PER_GROUP && (
                              <button
                                onClick={() => setExpandedGroups(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                                style={{
                                  width: '100%',
                                  marginTop: '8px',
                                  padding: '10px',
                                  borderRadius: '12px',
                                  border: '1px solid rgba(212,175,55,0.2)',
                                  background: 'rgba(212,175,55,0.05)',
                                  color: 'var(--pink-primary)',
                                  fontSize: '12px',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  letterSpacing: '0.5px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  transition: 'all 0.2s ease',
                                  fontFamily: 'Outfit, var(--font-sans), system-ui'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.12)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.05)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)'; }}
                              >
                                {expandedGroups[group.key] ? (
                                  <><ChevronUp size={14} /> VER MENOS</>
                                ) : (
                                  <><ChevronDown size={14} /> VER {group.apps.length - ITEMS_PER_GROUP} MÁS</>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <AstroDialog 
        isOpen={dialog.isOpen} 
        type="confirm"
        title="Gestionar Cita" 
        message="¿Qué deseas hacer con esta cita?" 
        onCancel={() => setDialog({ isOpen: false, appointmentId: null })}
        customFooter={
          <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '20px' }}>
            <button onClick={() => processAction('cancel')} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid #ff453a', background: 'rgba(255,69,58,0.1)', color: '#ff453a', fontWeight: '800', cursor: 'pointer' }}>MARCAR CANCELADA</button>
            <button onClick={() => processAction('delete')} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: '800', cursor: 'pointer' }}>BORRAR PERMANENTE</button>
          </div>
        }
      />

      <ScheduleModal 
        isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} onSchedule={handleTimeSelected} defaultDate={selectedDate}
        client={clients.find(c => c.id === newApp.clientId)} service={services.find(s => s.id === newApp.serviceId)} staff={staff.find(s => s.id === newApp.staffId)}
      />

      <AnimatedModal isOpen={showAddModal}>
        {(overlayClass, cardClass) => {
          const selectedClient = clients.find(c => c.id === newApp.clientId);
          const serviceVal = services.find(s => s.id === newApp.serviceId);
          const servicePrice = serviceVal ? parseFloat(serviceVal.price || 0) : 0;
          const extrasPrice = newApp.extras.reduce((acc, exId) => {
            const ex = allExtras.find(e => e.id === exId);
            return acc + (ex ? parseFloat(ex.price || 0) : 0);
          }, 0);
          const productsPrice = newApp.products.reduce((acc, p) => {
            const pr = allProducts.find(prod => prod.id === p.id);
            return acc + (pr ? parseFloat(pr.price || 0) * p.quantity : 0);
          }, 0);
          const totalEstimated = servicePrice + extrasPrice + productsPrice;

          return (
            <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,8,10,0.92)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', backdropFilter: 'blur(8px)' }}>
              <div className={`glass-card ${cardClass}`} style={{ maxWidth: '480px', width: '100%', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '92vh', overflowY: 'auto', padding: '0px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                {/* Gradient Accent Bar */}
                <div style={{ height: '5px', background: 'linear-gradient(90deg, #c48b9f 0%, #e8c4be 50%, #c48b9f 100%)', width: '100%', borderTopLeftRadius: '23px', borderTopRightRadius: '23px' }}></div>
                
                <div style={{ padding: '30px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CalendarIcon color="var(--pink-primary)" size={20} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '20px', fontWeight: '950', margin: 0, fontFamily: 'Outfit, sans-serif', color: 'white', letterSpacing: '-0.3px' }}>
                          {editingApp ? 'Editar Cita' : 'Nueva Cita'}
                        </h3>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {editingApp ? 'Modifica los detalles del servicio' : 'Agenda un nuevo servicio'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowAddModal(false)} 
                      style={{ background: 'rgba(255,255,255,0.04)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,69,58,0.15)'; e.currentTarget.style.color = '#ff453a'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    {/* Client Selector / Search */}
                    <div style={{ position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>CLIENTE</label>
                      {selectedClient ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', padding: '12px 16px', borderRadius: '14px' }}>
                          <div>
                            <div style={{ fontWeight: '800', color: 'white', fontSize: '15px' }}>{selectedClient.name}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span><strong style={{ color: 'var(--pink-primary)', fontWeight: '800' }}>Cédula:</strong> V-{selectedClient.id_card}</span>
                              {selectedClient.phone && (
                                <>
                                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
                                  <span><strong style={{ color: 'var(--pink-primary)', fontWeight: '800' }}>Cel:</strong> {selectedClient.phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              setClientSearchTerm('');
                              setClientSearchResults([]);
                              setNewApp(prev => ({ ...prev, clientId: '' }));
                            }}
                            style={{ background: 'rgba(255,69,58,0.1)', color: '#ff453a', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,69,58,0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,69,58,0.1)'}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                              <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} size={16} color="var(--text-muted)" />
                              <input
                                type="text"
                                placeholder="Buscar por cédula o nombre..."
                                value={clientSearchTerm}
                                onChange={(e) => handleClientSearch(e.target.value)}
                                style={{
                                  width: '100%',
                                  paddingLeft: '42px',
                                  height: '48px',
                                  fontSize: '13px',
                                  background: 'rgba(255,255,255,0.03)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: '14px',
                                  color: 'white',
                                  outline: 'none',
                                  fontWeight: '700',
                                  boxSizing: 'border-box',
                                  transition: 'all 0.3s'
                                }}
                                onFocus={e => e.target.style.borderColor = 'rgba(212,175,55,0.4)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                              />
                            </div>
                          </div>
                          {/* Quick add new client button */}
                          <button
                            type="button"
                            onClick={() => setShowNewClientModal(true)}
                            style={{
                              width: '100%', height: '40px', borderRadius: '12px',
                              border: '1.5px dashed rgba(212,175,55,0.3)',
                              background: 'rgba(212,175,55,0.04)',
                              color: 'var(--pink-primary)', fontWeight: '700', fontSize: '12px',
                              cursor: 'pointer', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.1)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.04)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'; }}
                          >
                            <User size={14} /> Registrar nuevo cliente
                          </button>
                        </div>
                      )}
                      
                      {/* Search Results Dropdown */}
                      {!selectedClient && clientSearchResults.length > 0 && (
                        <div className="animate-scale-in" style={{
                          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                          background: 'rgba(18,18,22,0.98)',
                          border: '1px solid rgba(212,175,55,0.2)', borderRadius: '14px',
                          overflow: 'hidden', zIndex: 200, backdropFilter: 'blur(20px)',
                          boxShadow: '0 16px 48px rgba(0,0,0,0.6)'
                        }}>
                          {clientSearchResults.map(c => (
                            <div
                              key={c.id}
                              onClick={() => handleSelectClient(c)}
                              style={{ padding: '12px 18px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.2s' }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.08)'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <div>
                                <div style={{ fontWeight: '700', fontSize: '13px', color: 'white' }}>{c.name}</div>
                                {c.phone && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{c.phone}</div>}
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>V-{c.id_card}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Service Selection */}
                    <AstroSelect 
                      label="SERVICIO" 
                      placeholder="Selecciona servicio" 
                      value={newApp.serviceId} 
                      onChange={(val) => setNewApp({...newApp, serviceId: val})} 
                      options={services.map(s => ({ label: `${s.name} ($${s.price})`, value: s.id }))} 
                    />

                    {/* Barber Selection */}
                    <AstroSelect 
                      label="ESTILISTA" 
                       placeholder="Selecciona estilista"
                      value={newApp.staffId} 
                      onChange={(val) => setNewApp({...newApp, staffId: val})} 
                      options={staff
                        .filter(s => {
                          const roleName = (s.role?.split('|')[0] || '').toLowerCase();
                          return roleName.includes('estilista') && !roleName.includes('admin');
                        })
                        .map(s => ({ label: s.name, value: s.id }))
                      } 
                      disabled={user?.role === 'Estilista' || user?.role?.startsWith('Estilista|') || user?.role === 'Estilista Senior' || user?.role?.startsWith('Estilista Senior|')}
                    />

                    {/* Extras Selection */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>EXTRAS</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {allExtras.map(ex => {
                          const isSelected = newApp.extras.includes(ex.id);
                          return (
                            <button 
                              key={ex.id}
                              onClick={() => {
                                setNewApp({
                                  ...newApp,
                                  extras: isSelected ? newApp.extras.filter(id => id !== ex.id) : [...newApp.extras, ex.id]
                                });
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                borderRadius: '12px',
                                border: '1px solid',
                                borderColor: isSelected ? 'var(--pink-primary)' : 'rgba(255,255,255,0.08)',
                                background: isSelected ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)',
                                color: isSelected ? 'var(--pink-primary)' : 'rgba(255,255,255,0.8)',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              {isSelected && <Check size={12} strokeWidth={3} />}
                              <span>{ex.name} (+${ex.price})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Products Selection */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PRODUCTOS ADICIONALES</label>
                      <AstroSelect 
                        placeholder="Añadir producto..." 
                        onChange={(val) => {
                          const exists = newApp.products.find(p => p.id === val);
                          if (exists) return;
                          setNewApp({
                            ...newApp,
                            products: [...newApp.products, { id: val, quantity: 1 }]
                          });
                        }} 
                        options={allProducts.map(p => ({ label: `${p.name} ($${p.price})`, value: p.id }))} 
                      />
                      
                      {newApp.products.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                          {newApp.products.map(p => {
                            const product = allProducts.find(pr => pr.id === p.id);
                            if (!product) return null;
                            return (
                              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Package size={14} color="var(--pink-primary)" />
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>{product.name}</span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(${product.price})</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '2px' }}>
                                    <button 
                                      onClick={() => {
                                        const newQty = p.quantity - 1;
                                        if (newQty <= 0) {
                                          setNewApp({ ...newApp, products: newApp.products.filter(item => item.id !== p.id) });
                                        } else {
                                          setNewApp({ ...newApp, products: newApp.products.map(item => item.id === p.id ? { ...item, quantity: newQty } : item) });
                                        }
                                      }} 
                                      style={{ width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.05)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    >
                                      <Minus size={10} />
                                    </button>
                                    <span style={{ fontWeight: '700', fontSize: '12px', minWidth: '16px', textAlign: 'center' }}>{p.quantity}</span>
                                    <button 
                                      onClick={() => {
                                        setNewApp({ ...newApp, products: newApp.products.map(item => item.id === p.id ? { ...item, quantity: p.quantity + 1 } : item) });
                                      }} 
                                      style={{ width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.05)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    >
                                      <Plus size={10} />
                                    </button>
                                  </div>
                                  <button 
                                    onClick={() => setNewApp({ ...newApp, products: newApp.products.filter(item => item.id !== p.id) })} 
                                    style={{ color: 'rgba(255,69,58,0.8)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#ff453a'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,69,58,0.8)'}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Live Total Cost Breakdown */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.02) 100%)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '16px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '0.5px' }}>TOTAL ESTIMADO</div>
                        <div style={{ fontSize: '24px', fontWeight: '950', color: 'var(--pink-primary)', fontFamily: 'Outfit, sans-serif', marginTop: '2px' }}>
                          Bs. {rates?.usd ? (totalEstimated * rates.usd).toLocaleString('es-VE', { maximumFractionDigits: 0 }) : (totalEstimated * 550).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: '600', marginTop: '2px' }}>Ref: ${totalEstimated.toFixed(2)}</div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textAlign: 'right', lineHeight: '1.4' }}>
                        {newApp.serviceId && <div>Servicio: ${servicePrice.toFixed(2)}</div>}
                        {newApp.extras.length > 0 && <div>Extras: +${extrasPrice.toFixed(2)}</div>}
                        {newApp.products.length > 0 && <div>Productos: +${productsPrice.toFixed(2)}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '28px' }}>
                    <button 
                      onClick={() => { 
                        if (!newApp.clientId || !newApp.serviceId || !newApp.staffId) { 
                          showToast("Selecciona cliente, servicio y estilista", "error"); 
                          return; 
                        } 
                        setShowScheduleModal(true); 
                      }} 
                      className="btn-pink" 
                      style={{ width: '100%', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: '800' }}
                    >
                      <Clock size={16} /> 
                      {editingApp ? 'CONFIRMAR CAMBIOS' : 'SELECCIONAR HORARIO'}
                    </button>
                    <button 
                      onClick={() => setShowAddModal(false)} 
                      style={{ width: '100%', height: '48px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', borderRadius: '14px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
                    >
                      CANCELAR
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      </AnimatedModal>

      {/* New Client Modal (accessible from scheduling) */}
      <NewClientModal
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onSuccess={(newClient) => {
          loadBaseData();
          setShowNewClientModal(false);
          // Auto-select the newly created client in the appointment form
          if (newClient) {
            setNewApp(prev => ({ ...prev, clientId: newClient.id }));
            setClientSearchTerm(newClient.name);
            setClientSearchResults([]);
            if (!showAddModal) {
              setEditingApp(null);
              setNewApp(prev => ({ ...prev, clientId: newClient.id, serviceId: '', staffId: user?.id || '', time: '10:00', extras: [], products: [] }));
              setClientSearchTerm(newClient.name);
              setShowAddModal(true);
            }
          }
        }}
      />

      {/* Appointment Detail Modal */}
      <AnimatedModal isOpen={!!selectedAppDetail}>
        {(overlayClass, cardClass) => {
          if (!activeDetail) return null;
          const statusStyle = getStatusColor(activeDetail.status);
          const initials = activeDetail.clients?.name ? activeDetail.clients.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'W';
          return (
            <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,10,0.94)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
              <div className={`glass-card ${cardClass}`} style={{ maxWidth: '450px', width: '100%', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)', padding: '36px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6)' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      width: '52px', 
                      height: '52px', 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.05) 100%)', 
                      border: '1.5px solid rgba(212, 175, 55, 0.4)',
                      boxShadow: '0 4px 15px rgba(212, 175, 55, 0.15)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      flexShrink: 0,
                      fontSize: '18px',
                      fontWeight: '900',
                      color: 'var(--pink-primary)',
                      fontFamily: 'Outfit, sans-serif'
                    }}>
                      {initials}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: '950', color: 'white', margin: 0, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.3px' }}>
                        {activeDetail.clients?.name}
                      </h3>
                      <span className="status-glow-badge" style={{ 
                        marginTop: '6px',
                        display: 'inline-flex',
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.text,
                        border: `1px solid ${statusStyle.border}`
                      }}>
                        <span className="blinking-dot" style={{ backgroundColor: statusStyle.dot }} />
                        {activeDetail.status}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedAppDetail(null)} 
                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '20px', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,69,58,0.15)'; e.currentTarget.style.color = '#ff453a'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                  >
                    &times;
                  </button>
                </div>

                <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, fontWeight: '700' }}>
                    Cédula: <span style={{ color: 'white' }}>V-{activeDetail.clients?.id_card || 'S/C'}</span> • Celular: <span style={{ color: 'white' }}>{activeDetail.clients?.phone || 'S/N'}</span>
                  </p>
                </div>

                {/* Date and Time block */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                    <Clock size={16} color="var(--pink-primary)" style={{ marginBottom: '2px' }} />
                    <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Hora</span>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                      {new Date(activeDetail.scheduled_at || activeDetail.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', textAlign: 'center' }}>
                    <CalendarIcon size={16} color="var(--pink-primary)" style={{ marginBottom: '2px' }} />
                    <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Fecha</span>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: 'white', whiteSpace: 'nowrap', fontFamily: 'Outfit, sans-serif' }}>
                      {new Date(activeDetail.scheduled_at || activeDetail.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Service & Price */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '24px' }}>
                  {/* Primary Service */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--pink-primary)' }} />
                      <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Servicio Principal</label>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--pink-primary)', borderRadius: '10px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Sparkles size={15} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: '850', color: 'white', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {activeDetail.services?.name || 'Venta directa sin servicio'}
                          </div>
                          <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                            Atendido por: <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{activeDetail.staff?.name || 'Caja'}</strong>
                          </p>
                        </div>
                      </div>
                      <HistoricalAmount
                        amount={activeDetail.services?.price || 0}
                        rate={getAppointmentRate(activeDetail)}
                      />
                    </div>
                  </div>

                  {/* Extras (if any) */}
                  {activeDetail.appointment_extras && activeDetail.appointment_extras.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--pink-primary)' }} />
                        <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Servicios Extras</label>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {activeDetail.appointment_extras.map(e => (
                          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
                              <Sparkles size={12} color="var(--pink-primary)" style={{ opacity: 0.7 }} />
                              <span>{e.service_extras?.name}</span>
                            </div>
                            <HistoricalAmount amount={e.price} rate={getAppointmentRate(activeDetail)} prefix="+" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products (if any) */}
                  {activeDetail.appointment_products && activeDetail.appointment_products.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--pink-primary)' }} />
                        <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Productos Vendidos</label>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {activeDetail.appointment_products.map(p => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>• {p.quantity}x {p.inventory?.name}</span>
                            <HistoricalAmount amount={Number(p.price) * Number(p.quantity || 1)} rate={getAppointmentRate(activeDetail)} prefix="+" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Personnel Involved (appointment_staff records) */}
                  {activeDetail.appointment_staff && activeDetail.appointment_staff.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--pink-primary)' }} />
                        <label style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Comisiones & Propinas</label>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {activeDetail.appointment_staff.map(as => {
                          const hasServComm = as.commission_earned > 0;
                          const hasProdComm = as.product_commission > 0;
                          const hasTip = as.tip_amount > 0;
                          const cleanRole = as.staff?.role?.split('|')[0] || '';
                          
                          return (
                            <div key={as.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div className="avatar-gradient-circle" style={{ width: '32px', height: '32px', minWidth: '32px', fontSize: '12px', margin: 0, overflow: 'hidden' }}>
                                {as.staff?.image_url ? (
                                  <img src={as.staff.image_url} alt={as.staff.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  as.staff?.name?.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                                  <span style={{ fontWeight: '800', color: 'white', fontSize: '13px' }}>{as.staff?.name}</span>
                                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{cleanRole}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', fontSize: '11px', flexWrap: 'wrap' }}>
                                  {hasServComm && <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>Serv: <HistoricalAmount amount={as.commission_earned} rate={getAppointmentRate(activeDetail)} /></span>}
                                  {hasProdComm && <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>Prod: <HistoricalAmount amount={as.product_commission} rate={getAppointmentRate(activeDetail)} /></span>}
                                  {hasTip && <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>Propina: <HistoricalAmount amount={as.tip_amount} rate={getAppointmentRate(activeDetail)} color="#30d158" /></span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Block */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.02) 100%)', padding: '20px', borderRadius: '18px', border: '1px solid rgba(212,175,55,0.25)', boxShadow: '0 8px 32px rgba(212,175,55,0.06)' }}>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--pink-primary)', textTransform: 'uppercase', display: 'block', marginBottom: '2px', letterSpacing: '0.5px' }}>Total de la Cita</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ref: ${getAppointmentUsd(activeDetail).toFixed(2)} USD</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '22px', fontWeight: '950', color: 'var(--pink-primary)', textShadow: '0 0 15px rgba(212,175,55,0.35)', fontFamily: 'Outfit, sans-serif' }}>
                      {`${getAppointmentBs(activeDetail).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          );
        }}
      </AnimatedModal>
    </div>
  );
};

const MiniCalendar = ({ selectedDate, onDateSelect, allAppointments }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();
  
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const days = [];
  const totalDays = daysInMonth(currentMonth.getMonth(), currentMonth.getFullYear());
  const startDay = firstDayOfMonth(currentMonth.getMonth(), currentMonth.getFullYear());
  
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  
  return (
    <div className="glass-card" style={{ maxWidth: '340px', width: '100%', margin: '0 auto', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.04)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', color: 'white', fontFamily: 'Outfit, var(--font-sans), system-ui', letterSpacing: '0.5px' }}>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}><ChevronRight size={16} /></button>
      </header>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {["D", "L", "M", "M", "J", "V", "S"].map(d => <div key={d} style={{ fontSize: '9px', fontWeight: '900', color: 'var(--pink-primary)', opacity: 0.6, marginBottom: '8px' }}>{d}</div>)}
        {days.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} />;
          const isSelected = selectedDate.toDateString() === date.toDateString();
          const isToday = new Date().toDateString() === date.toDateString();
          const dateStr = date.toISOString().split('T')[0];
          const hasApps = allAppointments.some(a => (a.scheduled_at || a.created_at)?.startsWith(dateStr));
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <button 
              key={date.toISOString()} onClick={() => onDateSelect(date)}
              style={{
                width: '36px',
                height: '36px',
                margin: '4px auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px', 
                border: isToday && !isSelected ? '1px solid rgba(212,175,55,0.45)' : 'none', 
                cursor: 'pointer', 
                fontSize: '12px', 
                fontWeight: isSelected ? '900' : (isToday ? '800' : '600'),
                background: isSelected ? 'var(--pink-primary)' : (isToday ? 'rgba(212,175,55,0.08)' : 'none'), 
                color: isSelected ? '#121212' : (isToday ? 'var(--pink-primary)' : (isWeekend ? 'rgba(255, 255, 255, 0.4)' : 'white')), 
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {date.getDate()}
              {hasApps && (
                <div style={{ 
                  width: '4px', 
                  height: '4px', 
                  borderRadius: '50%', 
                  backgroundColor: isSelected ? '#121212' : 'var(--pink-primary)',
                  position: 'absolute',
                  bottom: '4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  boxShadow: isSelected ? 'none' : '0 0 5px var(--pink-primary)'
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SchedulingModule;
