import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  User,
  Sparkles,
  ShoppingBag,
  Clock,
  Star,
  Wrench,
  Plus,
  Trash2,
  TrendingUp,
  Loader2,
  Shield,
  Activity,
  Calendar,
  Smartphone,
  Tag,
  Key,
  ChevronDown,
  Target,
  CheckCircle2,
  Timer,
  Pencil,
  Check,
  X
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import { useDialog } from '../context/DialogContext';
import {
  businessDateEnd,
  businessDateStart,
  getBusinessDateKey,
  getBusinessMonthStart,
  getOperationalDate
} from '../utils/dateTime';


const asArray = (value) => Array.isArray(value) ? value : [];

const formatBs = (value) => Number(value || 0).toLocaleString('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const MoneyValue = ({ usd, rate }) => {
  const ref = Number(usd || 0);
  const bcv = Number(rate || 0);
  return (
    <span style={{ display: 'inline-block', lineHeight: 1.05 }}>
      <span style={{ display: 'block' }}>{formatBs(ref * bcv)} Bs.</span>
      <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.48)', fontWeight: '700', marginTop: '5px', letterSpacing: 0 }}>
        Ref: ${ref.toFixed(2)} USD
      </span>
    </span>
  );
};

const CONFETTI_PIECES = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  left: `${(i * 1.72 + Math.sin(i * 0.4) * 20 + 10) % 96 + 2}%`,
  delay: `${(i * 0.09) % 3.5}s`,
  duration: `${2.8 + (i % 6) * 0.35}s`,
  color: ['#c48b9f', '#ff6b6b', '#4ecdc4', '#ffd93d', '#ff8e53', '#96e6a1', '#c084fc', '#60a5fa'][i % 8],
  size: 7 + (i % 4) * 2,
  isCircle: i % 3 === 0,
  isRect: i % 3 === 2,
  spin: (i % 2 === 0 ? '' : 'reverse'),
}));

const STATUS_CONFIG = {
  'Completado':  { color: '#30d158', bg: 'rgba(48,209,88,0.1)',  label: '✓ Listo',   dot: '#30d158' },
  'En Silla':    { color: '#c48b9f', bg: 'rgba(196,139,159,0.12)', label: '⏳ En silla', dot: '#c48b9f' },
  'Agendado':    { color: '#888',    bg: 'rgba(255,255,255,0.05)', label: 'Agendado',  dot: '#444' },
  'Cancelado':   { color: '#ff453a', bg: 'rgba(255,69,58,0.1)',   label: 'Cancelado', dot: '#ff453a' },
};

const getStatusCfg = (status) => STATUS_CONFIG[status] || STATUS_CONFIG['Agendado'];

const fmtTime = (iso) => {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const UserProfilePage = ({ staffMember, inventory = [], onUpdate, isMobile, rates }) => {
  const { showToast } = useNotifs();
  const { confirm } = useDialog();
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('semana'); // 'diario', 'semana', 'mes', 'rango', 'todo'
  const [rawDbStats, setRawDbStats] = useState(null);
  const [statsLoadedFrom, setStatsLoadedFrom] = useState(null);
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  const [stats, setStats] = useState({
    totalAppointments: 0,
    totalServiceComm: 0,
    totalProductComm: 0,
    totalTips: 0,
    topServices: [],
    avgDurationMin: 0
  });

  const [todayAppointments, setTodayAppointments] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({ servicesCount: 0, income: 0 });
  const [sparklines, setSparklines] = useState({ services: [], products: [], tips: [] });

  // Inventory/Tools State
  const [tools, setTools] = useState([]);
  const [showAddTool, setShowAddTool] = useState(false);
  const [newTool, setNewTool] = useState({ name: '', brand: '', ownership: 'Propia', status: 'Operativa', inventory_id: '' });
  const [dropdownOpen, setDropdownOpen] = useState(false);


  const calculateFilteredStats = (rawRecords, filter, range = customRange) => {
    if (!rawRecords) return {
      totalAppointments: 0,
      totalServiceComm: 0,
      totalProductComm: 0,
      totalTips: 0,
      topServices: [],
      avgDurationMin: 0
    };

    let startDate = null;
    let endDate = null;
    const now = new Date();
    if (filter === 'diario') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === 'semana') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === 'mes') {
      startDate = getBusinessMonthStart(now);
    } else if (filter === 'rango') {
      if (range.start) {
        startDate = businessDateStart(range.start);
      }
      if (range.end) {
        endDate = businessDateEnd(range.end);
      }
    }

    let totalServiceComm = 0;
    let totalProductComm = 0;
    let totalTips = 0;
    let totalDurationMs = 0;
    let durationCount = 0;
    const serviceCounts = {};
    let matchedCount = 0;


    asArray(rawRecords).forEach(record => {
      const app = record.appointments;
      if (!app) return;

      const appDate = getOperationalDate(app);
      if (!appDate || Number.isNaN(appDate.getTime())) return;
      if (startDate && appDate < startDate) return;
      if (endDate && appDate > endDate) return;

      matchedCount++;
      totalServiceComm += Number(record.commission_earned || 0);
      totalProductComm += Number(record.product_commission || 0);
      totalTips += Number(record.tip_amount || 0);

      // Services
      const sName = app.services?.name;
      if (sName) {
        serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
      }

      // Duration
      if (app.started_at && app.completed_at) {
        const start = new Date(app.started_at).getTime();
        const end = new Date(app.completed_at).getTime();
        if (end > start) {
          totalDurationMs += (end - start);
          durationCount++;
        }
      }
    });

    const topServices = Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([service_name, count]) => ({ service_name, count }));

    const avgDurationMin = durationCount > 0 ? Math.round(totalDurationMs / durationCount / 60000) : 0;

    return {
      totalAppointments: matchedCount,
      totalServiceComm,
      totalProductComm,
      totalTips,
      topServices,
      avgDurationMin
    };
  };

  const handleFilterChange = async (newFilter) => {
    setTimeFilter(newFilter);
    let records = rawDbStats;
    if (newFilter === 'todo' && statsLoadedFrom) {
      try {
        setLoading(true);
        const profileStats = await dataService.getStaffProfileStats(staffMember.id, staffMember.role || '');
        records = profileStats.rawRecords || [];
        setRawDbStats(records);
        setStatsLoadedFrom(null);
      } catch (error) {
        console.error('Error loading full profile history:', error);
        showToast('No se pudo cargar el historial completo', 'error');
      } finally {
        setLoading(false);
      }
    }
    if (records) {
      const filtered = calculateFilteredStats(records, newFilter);
      setStats(filtered);
    }
  };

  const handleCustomRangeChange = async (type, value) => {
    const nextRange = { ...customRange, [type]: value };
    setCustomRange(nextRange);
    let records = rawDbStats;
    const requestedStart = nextRange.start ? businessDateStart(nextRange.start) : null;
    if (
      timeFilter === 'rango' &&
      requestedStart &&
      statsLoadedFrom &&
      requestedStart < new Date(statsLoadedFrom)
    ) {
      try {
        setLoading(true);
        const profileStats = await dataService.getStaffProfileStats(
          staffMember.id,
          staffMember.role || '',
          requestedStart.toISOString()
        );
        records = profileStats.rawRecords || [];
        setRawDbStats(records);
        setStatsLoadedFrom(requestedStart.toISOString());
      } catch (error) {
        console.error('Error loading custom profile range:', error);
        showToast('No se pudo cargar el rango solicitado', 'error');
      } finally {
        setLoading(false);
      }
    }
    if (timeFilter === 'rango' && records) {
      const filtered = calculateFilteredStats(records, 'rango', nextRange);
      setStats(filtered);
    }
  };

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const isAssistant = staffMember?.role?.toLowerCase().includes('asistente') || staffMember?.role?.toLowerCase().includes('lavado') || staffMember?.role?.toLowerCase().includes('operaciones');
      const monthStart = getBusinessMonthStart().toISOString();
      const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      weekAgo.setHours(0, 0, 0, 0);

      const [profileStats, todayAppts, monthAppts] = await Promise.all([
        dataService.getStaffProfileStats(staffMember.id, staffMember.role || '', monthStart),
        dataService.getTodayAppointments(),
        dataService.getAppointmentsByState(['Completado'], monthStart)
      ]);

      setRawDbStats(profileStats.rawRecords || []);
      setStatsLoadedFrom(monthStart);
      const filtered = calculateFilteredStats(profileStats.rawRecords || [], timeFilter);
      setStats(filtered);

      // Today's appointments for this staff member (all statuses)
      const myToday = todayAppts.filter(a => {
        if (isAssistant) {
          return a.appointment_staff?.some(as => as.staff_id === staffMember.id);
        }
        return a.staff_id === staffMember.id;
      });
      setTodayAppointments(myToday);

      // Calculate monthly stats from rawRecords to include both appointments and historical transactions
      const currentMonthStart = getBusinessMonthStart();
      const monthlyRecords = (profileStats.rawRecords || []).filter(record => {
        const app = record.appointments;
        if (!app) return false;
        const appDate = getOperationalDate(app);
        return appDate && !Number.isNaN(appDate.getTime()) && appDate >= currentMonthStart;
      });

      const monthlyIncome = monthlyRecords.reduce((sum, r) => sum + Number(r.commission_earned || 0) + Number(r.product_commission || 0) + Number(r.tip_amount || 0), 0);
      const monthlyCount = monthlyRecords.length;
      setMonthlyStats({ servicesCount: monthlyCount, income: monthlyIncome });

      // Sparklines: last 7 days daily commission totals
      const commPct = (staffMember.commission_pct || 40) / 100;
      const today = new Date();
      const sevenDaysBars = [...Array(7)].map((_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        const dayStr = getBusinessDateKey(d);
        return monthAppts
          .filter(a => (a.created_at?.startsWith(dayStr) || a.scheduled_at?.startsWith(dayStr)))
          .reduce((sum, a) => {
            if (isAssistant) {
              const myStaff = a.appointment_staff?.find(as => as.staff_id === staffMember.id);
              return sum + Number(myStaff?.commission_earned || 0) + Number(myStaff?.product_commission || 0) + Number(myStaff?.tip_amount || 0);
            }
            return sum + Number(a.total_price || 0) * commPct;
          }, 0);
      });
      const maxBar = Math.max(...sevenDaysBars, 0.01);
      setSparklines({
        services: sevenDaysBars.map(v => Math.round((v / maxBar) * 100)),
        products: [10, 0, 25, 0, 0, 0, 0],
        tips: [0, 40, 0, 20, 0, 30, 0]
      });

    } catch (error) {
      console.error('Error loading profile data:', error);
      showToast('Error cargando métricas del perfil', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staffMember) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadProfileData();
      setTools(asArray(staffMember.tools));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffMember]);

  useEffect(() => {
    if (!staffMember) return undefined;
    let refreshTimer;
    const refreshProfile = () => {
      dataService.invalidateOperationalCache();
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => loadProfileData(), 350);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshProfile();
    };

    window.addEventListener('astro:data-changed', refreshProfile);
    window.addEventListener('focus', refreshProfile);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      clearTimeout(refreshTimer);
      window.removeEventListener('astro:data-changed', refreshProfile);
      window.removeEventListener('focus', refreshProfile);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [staffMember]);

  const handleAddTool = async () => {
    if (newTool.ownership === 'Propia') {
      if (!newTool.name || !newTool.brand) { showToast('Ingresa nombre y marca', 'warning'); return; }
    } else {
      if (!newTool.inventory_id) { showToast('Selecciona una herramienta del inventario', 'warning'); return; }
    }
    try {
      setLoading(true);
      let toolToAdd = { ...newTool, id: Date.now().toString(), date_added: new Date().toISOString() };
      if (newTool.ownership === 'Asignada') {
        const invItem = inventory.find(i => i.id === newTool.inventory_id);
        if (invItem) {
          toolToAdd.name = invItem.name;
          toolToAdd.brand = invItem.category;
          await dataService.updateInventoryItem(invItem.id, { staff_id: staffMember.id });
        }
      }
      const updatedTools = [...tools, toolToAdd];
      await dataService.updateStaffTools(staffMember.id, updatedTools);
      setTools(updatedTools);
      setNewTool({ name: '', brand: '', ownership: 'Propia', status: 'Operativa', inventory_id: '' });
      setShowAddTool(false);
      showToast('Herramienta asignada con éxito');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error saving tool:', error);
      showToast('Error al guardar herramienta', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTool = async (toolId) => {
    if (!await confirm('¿Seguro que deseas eliminar esta herramienta del inventario del estilista?')) return;
    try {
      setLoading(true);
      const toolToRemove = tools.find(t => t.id === toolId);
      if (toolToRemove?.inventory_id) {
        await dataService.updateInventoryItem(toolToRemove.inventory_id, { staff_id: null });
      }
      const updatedTools = tools.filter(t => t.id !== toolId);
      await dataService.updateStaffTools(staffMember.id, updatedTools);
      setTools(updatedTools);
      showToast('Herramienta removida y regresada al inventario general');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error removing tool:', error);
      showToast('Error al eliminar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const availableInventoryTools = asArray(inventory).filter(i =>
    (i.category === 'Herramienta' || i.category === 'Accesorios') && !i.staff_id
  );

  const roleRaw = staffMember?.role || 'ASISTENTE';
  const roleName = roleRaw.includes('|') ? roleRaw.split('|')[0] : roleRaw;

  // ── DEMO DATA (borrar este bloque cuando no se necesite) ──────────
  const DEMO = false;
  const _stats       = DEMO ? { totalAppointments: 142, totalServiceComm: 284.50, totalProductComm: 47.20, totalTips: 33.00, avgDurationMin: 38, topServices: [{ service_name: 'Corte + Barba', count: 61 }, { service_name: 'Corte Clásico', count: 44 }, { service_name: 'Corte Jana Deluxe', count: 28 }, { service_name: 'Diseño de Barba', count: 9 }] } : stats;
  const _today       = DEMO ? [
    { id: 1, status: 'Completado', scheduled_at: new Date().toISOString().split('T')[0]+'T10:00:00', clients: { name: 'Carlos Méndez' }, services: { name: 'Corte + Barba' }, total_price: 25 },
    { id: 2, status: 'Completado', scheduled_at: new Date().toISOString().split('T')[0]+'T11:30:00', clients: { name: 'Luis Torres' }, services: { name: 'Corte Clásico' }, total_price: 18 },
    { id: 3, status: 'En Silla',   scheduled_at: new Date().toISOString().split('T')[0]+'T14:00:00', clients: { name: 'Ricardo Pérez' }, services: { name: 'Corte + Diseño' }, total_price: 30 },
    { id: 4, status: 'Agendado',   scheduled_at: new Date().toISOString().split('T')[0]+'T15:30:00', clients: { name: 'Andrés López' }, services: { name: 'Corte Jana Deluxe' }, total_price: 35 },
    { id: 5, status: 'Agendado',   scheduled_at: new Date().toISOString().split('T')[0]+'T17:00:00', clients: { name: 'Miguel Rodríguez' }, services: { name: 'Diseño de Barba' }, total_price: 20 },
  ] : todayAppointments;
  const _monthly     = DEMO ? { servicesCount: 29, income: 284.50 } : monthlyStats;
  const _sparklines  = DEMO ? { services: [42, 68, 55, 88, 61, 75, 100], products: [10, 0, 35, 0, 20, 0, 45], tips: [0, 50, 0, 30, 60, 0, 40] } : sparklines;
  const _tools       = DEMO ? [
    { id: '1', name: 'Clipper Magic Clip', brand: 'Wahl · Serie 5 Star', ownership: 'Propia', status: 'Operativa' },
    { id: '2', name: 'Navaja Feather',     brand: 'Feather · Artist Club', ownership: 'Propia', status: 'Operativa' },
    { id: '3', name: 'Recortadora T-Outliner', brand: 'Andis', ownership: 'Asignada', status: 'Operativa' },
  ] : tools;
  // ─────────────────────────────────────────────────────────────────

  // ── BIRTHDAY ─────────────────────────────────────────────────────
  const SIMULATE_BIRTHDAY = false;
  const isBirthday = (() => {
    if (SIMULATE_BIRTHDAY) return true;
    const bd = staffMember?.birth_date;
    if (!bd) return false;
    const parts = bd.split('-');
    if (parts.length < 3) return false;
    const now = new Date();
    return parseInt(parts[1]) === now.getMonth() + 1 && parseInt(parts[2]) === now.getDate();
  })();
  const bdayKey = `jana_bday_${staffMember?.id}`;
  const [showBdayOverlay, setShowBdayOverlay] = useState(() => {
    if (!isBirthday) return false;
    const last = localStorage.getItem(bdayKey);
    return last !== new Date().toISOString().split('T')[0];
  });
  const dismissBday = () => {
    localStorage.setItem(bdayKey, new Date().toISOString().split('T')[0]);
    setShowBdayOverlay(false);
  };
  // ─────────────────────────────────────────────────────────────────

  // Goals — editable, persisted in localStorage
  const [editingGoals, setEditingGoals] = useState(false);

  const [goalDraft, setGoalDraft] = useState({ income: '', services: '' });

  const monthlyGoalIncome    = parseFloat(localStorage.getItem(`jana_monthly_goal_${staffMember?.id}`) || (parseFloat(localStorage.getItem('jana_monthly_goal') || '') < 1000 ? localStorage.getItem('jana_monthly_goal') : null) || '400');
  const monthlyGoalServices  = parseInt(localStorage.getItem(`jana_monthly_goal_services_${staffMember?.id}`)   || localStorage.getItem('jana_monthly_goal_services') || '40');
  const incomeProgress   = Math.min(100, Math.round((_monthly.income          / monthlyGoalIncome)    * 100));
  const serviceProgress  = Math.min(100, Math.round((_monthly.servicesCount   / monthlyGoalServices)  * 100));

  const handleOpenGoalEdit = () => {
    setGoalDraft({ income: monthlyGoalIncome.toString(), services: monthlyGoalServices.toString() });
    setEditingGoals(true);
  };

  const handleSaveGoals = () => {
    const inc = parseFloat(goalDraft.income);
    const svc = parseInt(goalDraft.services);
    if (!isNaN(inc) && inc > 0)  localStorage.setItem(`jana_monthly_goal_${staffMember?.id}`, inc.toString());
    if (!isNaN(svc) && svc > 0)  localStorage.setItem(`jana_monthly_goal_services_${staffMember?.id}`, svc.toString());
    setEditingGoals(false);
    showToast('Metas actualizadas');
  };

  // Personal earnings only. Never derive staff income from the appointment gross.
  const isAssistant = staffMember?.role?.toLowerCase().includes('asistente') || staffMember?.role?.toLowerCase().includes('lavado') || staffMember?.role?.toLowerCase().includes('operaciones');
  const todayPersonalStats = calculateFilteredStats(rawDbStats, 'diario');
  const todayComm = Number(todayPersonalStats.totalServiceComm || 0)
    + Number(todayPersonalStats.totalProductComm || 0)
    + Number(todayPersonalStats.totalTips || 0);
  const profileRate = Number(rates?.bcv) || Number(rates?.usd) || 1;

  // First upcoming appointment
  const nextApptIdx = _today.findIndex(a => a.status !== 'Completado' && a.status !== 'Cancelado');

  if (!staffMember) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando información del perfil...</div>;
  }

  const bdayOverlay = showBdayOverlay ? ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {CONFETTI_PIECES.map(p => (
        <div key={p.id} style={{
          position: 'absolute', top: '-30px', left: p.left,
          width: p.isRect ? `${Math.round(p.size * 0.45)}px` : `${p.size}px`,
          height: `${p.size}px`,
          borderRadius: p.isCircle ? '50%' : '2px',
          background: p.color,
          animation: `confettiFall${p.spin === 'reverse' ? 'Reverse' : ''} ${p.duration} ${p.delay} linear infinite`,
          opacity: 0.9, pointerEvents: 'none',
        }} />
      ))}
      <style>{`
        @keyframes confettiFall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0.3; } }
        @keyframes confettiFallReverse { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(-720deg); opacity: 0.3; } }
        @keyframes bdayCardIn { from { opacity: 0; transform: scale(0.85) translateY(30px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes bdayCrownBounce { 0%,100% { transform: translateY(0) rotate(-8deg); } 50% { transform: translateY(-10px) rotate(8deg); } }
        @keyframes sparkle { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.7); } }
        .bday-btn:hover { transform: scale(1.05) !important; }
      `}</style>
      <div style={{ position: 'relative', zIndex: 10, background: 'linear-gradient(155deg, #1c1a0a 0%, #0e0d07 60%, #1a0e1a 100%)', border: '1px solid rgba(196,139,159,0.45)', borderRadius: '32px', padding: isMobile ? '40px 28px' : '52px 52px', maxWidth: '420px', width: '90%', textAlign: 'center', boxShadow: '0 0 100px rgba(196,139,159,0.18), 0 40px 80px rgba(0,0,0,0.9)', animation: 'bdayCardIn 0.55s cubic-bezier(0.22,1,0.36,1) both' }}>
        {['-28px', 'calc(100% - 28px)'].map((left, si) => (
          <div key={si} style={{ position: 'absolute', top: '20px', left, fontSize: '18px', color: '#c48b9f', animation: `sparkle ${1.2 + si * 0.3}s ease-in-out infinite` }}>✦</div>
        ))}
        <div style={{ fontSize: isMobile ? '52px' : '64px', marginBottom: '4px', animation: 'bdayCrownBounce 3s ease-in-out infinite' }}>👑</div>
        <div style={{ fontSize: '10px', fontWeight: '900', color: '#c48b9f', letterSpacing: '3.5px', textTransform: 'uppercase', marginBottom: '10px', opacity: 0.85 }}>✦ JanaStudio ✦</div>
        <h2 style={{ fontSize: isMobile ? '26px' : '32px', fontWeight: '950', color: 'white', margin: '0 0 6px', letterSpacing: '-0.5px', lineHeight: 1.15 }}>¡Feliz Cumpleaños,</h2>
        <h2 style={{ fontSize: isMobile ? '30px' : '38px', fontWeight: '950', background: 'linear-gradient(135deg, #c48b9f, #ffe066, #a67c1e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 22px', letterSpacing: '-1px' }}>
          {staffMember?.name?.split(' ')[0] || 'Compañero'}! 🎉
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', lineHeight: 1.7, margin: '0 0 32px', fontWeight: '500' }}>
          Todo el equipo de <span style={{ color: '#c48b9f', fontWeight: '800' }}>Jana</span> te desea un día increíble.<br />
          Que este año venga cargado de éxitos, buenos cortes y mucha energía. ✂️
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '32px', fontSize: '26px' }}>
          {['🎂', '🎈', '🎊'].map((e, i) => (
            <span key={i} style={{ animation: `sparkle ${1.4 + i * 0.25}s ease-in-out infinite`, animationDelay: `${i * 0.15}s`, display: 'inline-block' }}>{e}</span>
          ))}
        </div>
        <button className="bday-btn" onClick={dismissBday} style={{ padding: '15px 40px', borderRadius: '16px', background: 'linear-gradient(135deg, #c48b9f 0%, #ffe066 50%, #a67c1e 100%)', border: 'none', color: '#0a0a00', fontWeight: '900', fontSize: '15px', cursor: 'pointer', letterSpacing: '0.3px', boxShadow: '0 6px 25px rgba(196,139,159,0.45)', transition: 'transform 0.2s' }}>
          ¡Gracias!
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px', overflowX: 'hidden' }}>

      <style>{`
        .pp-card { background: var(--bg-secondary, #161616); border: 1px solid rgba(255,255,255,0.06); border-radius: 24px; overflow: hidden; }
        .pp-card-gold { border-color: rgba(196,139,159,0.2); }
        .stat-card-pp { padding: 22px; border-radius: 20px; position: relative; overflow: hidden; transition: transform 0.25s ease, border-color 0.25s ease; border: 1px solid rgba(255,255,255,0.04); }
        .stat-card-pp:hover { transform: translateY(-4px); border-color: rgba(196,139,159,0.2); }
        .sparkbar { border-radius: 3px 3px 0 0; flex: 1; transition: height 0.4s ease; }
        .appt-row-pp { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 14px; transition: background 0.2s; overflow: hidden; }
        .appt-row-pp:hover { background: rgba(255,255,255,0.03); }
        .appt-row-pp.next-appt { background: rgba(196,139,159,0.05); border: 1px solid rgba(196,139,159,0.15); }
        @media (max-width: 600px) {
          .appt-row-pp { gap: 8px; padding: 10px 10px; flex-wrap: nowrap; }
          .appt-badge { font-size: 10px !important; padding: 3px 7px !important; }
          .appt-price { font-size: 12px !important; }
        }
        .goal-bar-track { background: rgba(255,255,255,0.06); border-radius: 4px; height: 6px; overflow: hidden; }
        .goal-bar-fill { height: 100%; border-radius: 4px; transition: width 1s cubic-bezier(0.25,1,0.5,1); }
        .rank-row { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); border-radius: 12px; padding: 10px 14px; transition: all 0.2s; }
        .rank-row:hover { background: rgba(255,255,255,0.03); border-color: rgba(196,139,159,0.15); transform: translateX(4px); }
        .inventory-tool-row { padding: 12px 14px; background: rgba(255,255,255,0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: flex-start; transition: border-color 0.2s, box-shadow 0.2s, background 0.2s; }
        .inventory-tool-row:hover, .inventory-tool-row:active { border-color: rgba(196,139,159,0.35); background: rgba(196,139,159,0.04); box-shadow: 0 0 12px rgba(196,139,159,0.1); }
        .custom-form-input { height: 40px; padding: 0 14px; font-size: 13px; border-radius: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); color: white; width: 100%; outline: none; transition: all 0.2s; }
        .custom-form-input:focus { border-color: var(--pink-primary); box-shadow: 0 0 10px rgba(196,139,159,0.2); }
        .glow-avatar-border { position: relative; background: linear-gradient(135deg, var(--pink-primary) 0%, #a67c1e 100%); padding: 4px; border-radius: 50%; box-shadow: 0 8px 25px rgba(0,0,0,0.6), 0 0 20px rgba(196,139,159,0.3); transition: transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275); }
        .glow-avatar-border:hover { transform: scale(1.05) rotate(5deg); }
        .bday-avatar-pulse { animation: bdayAvatarPulse 2s ease-in-out infinite !important; }
        @keyframes bdayAvatarPulse { 0%,100% { box-shadow: 0 8px 25px rgba(0,0,0,0.6), 0 0 20px rgba(196,139,159,0.4); } 50% { box-shadow: 0 8px 25px rgba(0,0,0,0.6), 0 0 50px rgba(196,139,159,0.9), 0 0 80px rgba(196,139,159,0.35); } }
        @keyframes bdayCrownFloat { 0%,100% { transform: translateX(-50%) translateY(0) rotate(-6deg); } 50% { transform: translateX(-50%) translateY(-6px) rotate(6deg); } }
        @keyframes bdayBalloon { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-8px) rotate(4deg); } }
        @keyframes bdayShimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes bdayOrb { 0%,100% { transform: scale(1); opacity: 0.7; box-shadow: 0 0 6px rgba(196,139,159,0.6); } 50% { transform: scale(1.5); opacity: 1; box-shadow: 0 0 14px rgba(196,139,159,1); } }
        .animated-aurora { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(42,34,15,0.85) 50%, rgba(20,20,20,0.95) 100%); background-size: 200% 200%; animation: auroraBg 15s ease infinite; }
        @keyframes auroraBg { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .anim-0 { animation: slideUpFade 0.5s cubic-bezier(0.22,1,0.36,1) both 0.05s; }
        .anim-1 { animation: slideUpFade 0.5s cubic-bezier(0.22,1,0.36,1) both 0.12s; }
        .anim-2 { animation: slideUpFade 0.5s cubic-bezier(0.22,1,0.36,1) both 0.20s; }
        .anim-3 { animation: slideUpFade 0.5s cubic-bezier(0.22,1,0.36,1) both 0.28s; }
        .anim-4 { animation: slideUpFade 0.5s cubic-bezier(0.22,1,0.36,1) both 0.36s; }
        @keyframes slideUpFade { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
        .hero-name { color: #ffffff !important; text-shadow: 0 2px 14px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9) !important; }
        @keyframes float { 0%,100% { transform: translateY(0px) rotate(-1deg); } 50% { transform: translateY(-14px) rotate(1deg); } }
        @keyframes shadow-scale { 0%,100% { transform: translateX(-50%) scaleX(1); opacity: 0.6; } 50% { transform: translateX(-50%) scaleX(0.75); opacity: 0.25; } }
        @keyframes confettiFall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0.3; } }
        @keyframes confettiFallReverse { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(-720deg); opacity: 0.3; } }
        @keyframes bdayCardIn { from { opacity: 0; transform: scale(0.85) translateY(30px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes bdayCrownBounce { 0%,100% { transform: translateY(0) rotate(-8deg); } 50% { transform: translateY(-10px) rotate(8deg); } }
        @keyframes sparkle { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.7); } }
      `}</style>

      {bdayOverlay}

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div className="glass-card pp-card-gold anim-0" style={{ borderRadius: '28px', overflow: 'hidden', padding: 0 }}>

        {isMobile ? (
          /* ── MOBILE HERO ──────────────────────────────────────────────── */
          <>
            {/* Gradient banner */}
            <div style={{ height: '90px', position: 'relative', overflow: 'hidden' }}>
              <div className="animated-aurora" />
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 60%, rgba(196,139,159,0.22) 0%, transparent 70%)', pointerEvents: 'none' }} />
            </div>

            {/* Avatar centrado */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-50px', position: 'relative', zIndex: 2, paddingBottom: '20px' }}>
              <div style={{ position: 'relative' }}>
                {isBirthday && (
                  <div style={{ position: 'absolute', top: '-24px', left: '50%', fontSize: '26px', zIndex: 5, animation: 'bdayCrownFloat 2.5s ease-in-out infinite', filter: 'drop-shadow(0 2px 6px rgba(196,139,159,0.9))' }}>👑</div>
                )}
              <div className={`glow-avatar-border${isBirthday ? ' bday-avatar-pulse' : ''}`}>
                <div style={{ width: '96px', height: '96px', borderRadius: '50%', backgroundColor: '#121212', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {staffMember.image_url ? (
                    <img src={staffMember.image_url} alt={staffMember.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '38px', fontWeight: '950', color: 'white' }}>{staffMember.name?.charAt(0) || 'A'}</span>
                  )}
                </div>
                <div style={{ position: 'absolute', bottom: 5, right: 5, width: 14, height: 14, borderRadius: '50%', background: '#30d158', border: '3px solid #161616', boxShadow: '0 0 8px rgba(48,209,88,0.5)' }} />
              </div>
              </div>

              {/* Nombre */}
              <div style={{ fontSize: '26px', fontWeight: '950', color: '#fff', letterSpacing: '-0.5px', marginTop: '12px', lineHeight: 1.1 }}>{staffMember.name}</div>

              {isBirthday && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', background: 'linear-gradient(135deg, rgba(196,139,159,0.12), rgba(196,139,159,0.04))', border: '1px solid rgba(196,139,159,0.28)', borderRadius: '20px', padding: '7px 18px', boxShadow: '0 0 20px rgba(196,139,159,0.1)' }}>
                  {['🎂', '🎈', '🎊'].map((e, i) => (
                    <span key={i} style={{ fontSize: '16px', display: 'inline-block', animation: `bdayBalloon ${1.8 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }}>{e}</span>
                  ))}
                  <span style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase', background: 'linear-gradient(90deg, #a67c1e, #ffe066, #c48b9f, #ffe066, #a67c1e)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'bdayShimmer 2.5s linear infinite' }}>
                    HOY ES TU DÍA
                  </span>
                </div>
              )}

              {/* Role + teléfono en una sola fila */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: '900', color: '#121212', background: 'var(--pink-primary)', padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'inline-flex', alignItems: 'center', gap: '4px', textAlign: 'center', lineHeight: 1.3 }}>
                  <Shield size={10} /> {roleName}
                </span>
                {staffMember.phone && (() => {
                  const raw = staffMember.phone.replace(/\D/g, '');
                  const display = raw.startsWith('0') ? raw : `0${raw}`;
                  const waNumber = raw.startsWith('0') ? `58${raw.slice(1)}` : `58${raw}`;
                  return (
                    <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', fontWeight: '600', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
                      <Smartphone size={11} color="#888" /> {display}
                    </a>
                  );
                })()}
              </div>
            </div>

            {/* Stats mobile: 3 arriba + 2 abajo centrados */}
            {(() => {
              const stats5 = [
                { val: _today.filter(a => a.status === 'Completado').length, lbl: isAssistant ? 'Tratamientos hoy' : 'Hoy' },
                { val: _monthly.servicesCount,                                lbl: isAssistant ? 'Tratamientos mes' : 'Este mes' },
                { val: `${_stats.avgDurationMin} min`,                        lbl: 'Tiempo prom.' },
                { val: <MoneyValue usd={todayComm} rate={profileRate} />,              lbl: 'Ganancia hoy' },
                { val: <MoneyValue usd={_monthly.income} rate={profileRate} />,        lbl: 'Ganancia mes' },
              ];
              const StatCell = ({ item, borderRight, borderTop }) => (
                <div style={{ padding: '14px 10px', textAlign: 'center', borderRight: borderRight ? '1px solid rgba(255,255,255,0.04)' : 'none', borderTop: borderTop ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--pink-primary)' }}>{item.val}</div>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '3px', letterSpacing: '0.3px' }}>{item.lbl}</div>
                </div>
              );
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {stats5.slice(0, 3).map((item, i) => <StatCell key={i} item={item} borderRight={i < 2} borderTop={false} />)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {stats5.slice(3).map((item, i) => <StatCell key={i} item={item} borderRight={i < 1} borderTop={false} />)}
                  </div>
                </>
              );
            })()}
          </>
        ) : (
          /* ── DESKTOP HERO ─────────────────────────────────────────────── */
          <>
            {/* Banner aurora */}
            <div style={{ height: '130px', position: 'relative', overflow: 'hidden' }}>
              <div className="animated-aurora" />
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 75% 40%, rgba(196,139,159,0.18) 0%, transparent 65%)', pointerEvents: 'none' }} />
            </div>

            {/* Avatar + info */}
            <div style={{ padding: '0 28px 0 28px', marginTop: '-60px', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '20px' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {isBirthday && (
                  <div style={{ position: 'absolute', top: '-26px', left: '50%', fontSize: '28px', zIndex: 5, animation: 'bdayCrownFloat 2.5s ease-in-out infinite', filter: 'drop-shadow(0 2px 8px rgba(196,139,159,0.9))' }}>👑</div>
                )}
                <div className={`glow-avatar-border${isBirthday ? ' bday-avatar-pulse' : ''}`}>
                  <div style={{ width: '108px', height: '108px', borderRadius: '50%', backgroundColor: '#121212', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {staffMember.image_url ? (
                      <img src={staffMember.image_url} alt={staffMember.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '42px', fontWeight: '950', color: 'white' }}>{staffMember.name?.charAt(0) || 'A'}</span>
                    )}
                  </div>
                  <div style={{ position: 'absolute', bottom: 5, right: 5, width: 16, height: 16, borderRadius: '50%', background: '#30d158', border: '3px solid #161616', boxShadow: '0 0 8px rgba(48,209,88,0.5)' }} />
                </div>
              </div>

              <div style={{ flex: 1, paddingBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                <div style={{ fontSize: '28px', fontWeight: '950', color: '#fff', letterSpacing: '-0.5px', marginBottom: '8px', lineHeight: 1.1, transform: 'translateY(-14px)' }}>{staffMember.name}</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: '900', color: '#121212', background: 'var(--pink-primary)', padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '1px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Shield size={11} /> {roleName}
                  </span>
                  {staffMember.phone && (() => {
                    const raw = staffMember.phone.replace(/\D/g, '');
                    const display = raw.startsWith('0') ? raw : `0${raw}`;
                    const waNumber = raw.startsWith('0') ? `58${raw.slice(1)}` : `58${raw}`;
                    return (
                      <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer"
                        style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: '700', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                        <Smartphone size={10} /> {display}
                      </a>
                    );
                  })()}
                </div>
                </div>

                {/* Birthday right panel */}
                {isBirthday && (
                  <div style={{ paddingBottom: '14px', paddingRight: '8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    {/* Emoji row */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['🎂', '🎈', '🎊'].map((e, i) => (
                        <span key={i} style={{ fontSize: '22px', display: 'inline-block', animation: `bdayBalloon ${1.8 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }}>{e}</span>
                      ))}
                    </div>
                    {/* Card */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(196,139,159,0.12), rgba(196,139,159,0.03))', border: '1px solid rgba(196,139,159,0.28)', borderRadius: '16px', padding: '10px 20px', textAlign: 'right', boxShadow: '0 0 24px rgba(196,139,159,0.08)' }}>
                      <div style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '2.5px', textTransform: 'uppercase', background: 'linear-gradient(90deg, #a67c1e, #ffe066, #c48b9f, #ffe066, #a67c1e)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'bdayShimmer 2.5s linear infinite' }}>
                        ✦ HOY ES TU DÍA ✦
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontWeight: '600', letterSpacing: '0.5px' }}>El equipo Jana te celebra</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick stats strip desktop */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {[
                { val: _today.filter(a => a.status === 'Completado').length, lbl: isAssistant ? 'Tratamientos hoy' : 'Servicios hoy' },
                { val: _monthly.servicesCount,                                lbl: isAssistant ? 'Tratamientos mes' : 'Este mes' },
                { val: <MoneyValue usd={todayComm} rate={profileRate} />,              lbl: 'Ganancia hoy' },
                { val: <MoneyValue usd={_monthly.income} rate={profileRate} />,        lbl: 'Ganancia mes' },
                { val: `${_stats.avgDurationMin} min`,                        lbl: 'Tiempo prom.' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '16px 20px', textAlign: 'center', borderRight: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--pink-primary)' }}>{item.val}</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '3px', letterSpacing: '0.3px' }}>{item.lbl}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── STAT CARDS COMPACTAS ─────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Loader2 className="animate-spin" size={36} color="var(--pink-primary)" style={{ margin: '0 auto' }} />
        </div>
      ) : (
        <>
          {/* Top: main commission card – full width */}
          <div className="glass-card anim-1" style={{ background: 'rgba(22,22,22,0.8)', padding: '18px 20px', borderRadius: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                {isAssistant ? 'Comisión Tratamiento' : 'Comisión Servicios'}
              </div>
              <div style={{ fontSize: '30px', fontWeight: '950', color: 'white', fontFamily: 'Outfit, system-ui', letterSpacing: '-0.5px' }}>
                <MoneyValue usd={_stats.totalServiceComm} rate={profileRate} />
              </div>
              <div style={{ height: '2px', background: '#c48b9f', borderRadius: '2px', width: '32px', opacity: 0.7, marginTop: '10px' }} />
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'rgba(196,139,159,0.1)', border: '1px solid rgba(196,139,159,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={19} color="#c48b9f" />
            </div>
          </div>

          {/* Bottom row: 2 compact cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="anim-2">
            {[
              { label: 'Comisión Productos', val: <MoneyValue usd={_stats.totalProductComm} rate={profileRate} />, icon: <ShoppingBag size={17} color="#30d158" />, iconBg: 'rgba(48,209,88,0.1)', iconBorder: 'rgba(48,209,88,0.2)', accentColor: '#30d158' },
              { label: 'Total Propinas',     val: <MoneyValue usd={_stats.totalTips} rate={profileRate} />,        icon: <TrendingUp size={17} color="#0a84ff" />, iconBg: 'rgba(10,132,255,0.1)', iconBorder: 'rgba(10,132,255,0.2)', accentColor: '#0a84ff' },
            ].map((card, i) => (
              <div key={i} className={`glass-card anim-${i + 3}`} style={{ background: 'rgba(22,22,22,0.8)', padding: '16px 14px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.6px', lineHeight: '1.3' }}>{card.label}</div>
                  <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: card.iconBg, border: `1px solid ${card.iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {card.icon}
                  </div>
                </div>
                <div style={{ fontSize: '22px', fontWeight: '950', color: 'white', fontFamily: 'Outfit, system-ui', letterSpacing: '-0.5px' }}>{card.val}</div>
                <div style={{ height: '2px', background: card.accentColor, borderRadius: '2px', width: '32px', opacity: 0.7 }} />
              </div>
            ))}
          </div>

          {/* ── AGENDA HOY + METAS ──────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '16px' }} className="anim-3">

            {/* Agenda del día */}
            <div className="glass-card pp-card" style={{ padding: '24px', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={17} color="var(--pink-primary)" />
                  <h4 style={{ fontSize: '13px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Agenda de hoy</h4>
                </div>
                <span style={{ fontSize: '12px', color: '#555' }}>
                  {_today.filter(a => a.status === 'Completado').length}/{_today.length} completados
                </span>
              </div>

              {_today.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '13px', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '14px' }}>
                  Sin citas agendadas para hoy
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {_today.map((appt, idx) => {
                    const cfg = getStatusCfg(appt.status);
                    const isNext = idx === nextApptIdx;
                    return (
                      <div key={appt.id} className={`appt-row-pp${isNext ? ' next-appt' : ''}`}>
                        <div style={{ fontSize: '11px', color: isNext ? '#c48b9f' : '#666', width: isMobile ? '48px' : '60px', flexShrink: 0, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {fmtTime(appt.scheduled_at || appt.created_at)}
                        </div>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {appt.clients?.name || 'Cliente'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.services?.name || '—'}</div>
                        </div>
                        <div className="appt-price" style={{ fontSize: '13px', fontWeight: '800', color: '#c48b9f', flexShrink: 0 }}>
                          ${Number(appt.total_price || 0).toFixed(0)}
                        </div>
                        <span className="appt-badge" style={{ fontSize: '11px', fontWeight: '700', color: cfg.color, background: cfg.bg, padding: '3px 8px', borderRadius: '20px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Metas del mes */}
            <div className="glass-card pp-card" style={{ padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Target size={17} color="var(--pink-primary)" />
                  <h4 style={{ fontSize: '13px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Metas del mes</h4>
                </div>
                {!editingGoals ? (
                  <button onClick={handleOpenGoalEdit} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#888', cursor: 'pointer', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(196,139,159,0.3)'; e.currentTarget.style.color = '#c48b9f'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#888'; }}>
                    <Pencil size={11} /> Editar
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={handleSaveGoals} style={{ background: 'rgba(196,139,159,0.15)', border: '1px solid rgba(196,139,159,0.3)', borderRadius: '8px', color: '#c48b9f', cursor: 'pointer', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '800' }}>
                      <Check size={11} /> Guardar
                    </button>
                    <button onClick={() => setEditingGoals(false)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#888', cursor: 'pointer', padding: '5px 8px', display: 'flex', alignItems: 'center' }}>
                      <X size={11} />
                    </button>
                  </div>
                )}
              </div>

              {editingGoals ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'rgba(196,139,159,0.04)', borderRadius: '14px', border: '1px solid rgba(196,139,159,0.15)' }}>
                  {[
                    { label: 'Meta servicios / mes', key: 'services', prefix: '', suffix: ' servicios' },
                    { label: 'Meta ingresos / mes',  key: 'income',   prefix: '$', suffix: ' USD' },
                  ].map(field => (
                    <div key={field.key}>
                      <div style={{ fontSize: '11px', color: '#888', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{field.label}</div>
                      <div style={{ position: 'relative' }}>
                        {field.prefix && <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#c48b9f', fontWeight: '800', fontSize: '14px' }}>{field.prefix}</span>}
                        <input
                          type="number"
                          value={goalDraft[field.key]}
                          onChange={e => setGoalDraft(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="custom-form-input"
                          style={{ paddingLeft: field.prefix ? '24px' : '14px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {[
                    { label: 'Servicios', val: `${_monthly.servicesCount} / ${monthlyGoalServices}`, pct: serviceProgress, color: '#c48b9f' },
                    { label: 'Ingresos',  val: `$${_monthly.income.toFixed(0)} / $${monthlyGoalIncome.toFixed(0)}`, pct: incomeProgress, color: '#30d158' },
                  ].map((goal, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', color: '#aaa' }}>{goal.label}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{goal.val}</span>
                      </div>
                      <div className="goal-bar-track">
                        <div className="goal-bar-fill" style={{ width: `${goal.pct}%`, background: goal.color }} />
                      </div>
                      <div style={{ fontSize: '11px', color: goal.pct >= 100 ? goal.color : '#555', marginTop: '5px', textAlign: 'right' }}>
                        {goal.pct >= 100 ? '¡Meta alcanzada! 🎉' : `${goal.pct}% completado`}
                      </div>
                    </div>
                  ))}
                </>
              )}

            </div>
          </div>

          {/* ── RENDIMIENTO + INVENTARIO ─────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }} className="anim-4">

            {/* Rendimiento histórico */}
            <div className="glass-card pp-card" style={{ padding: '26px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Activity size={17} color="var(--pink-primary)" />
                  <h4 style={{ fontSize: '13px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Rendimiento</h4>
                </div>
                 <div style={{ display: 'flex', gap: '4px', background: 'rgba(0, 0, 0, 0.3)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', flexWrap: 'wrap' }}>
                  {[
                    { id: 'diario', label: 'Diario' },
                    { id: 'semana', label: 'Semana' },
                    { id: 'mes', label: 'Mes' },
                    { id: 'rango', label: 'Rango' },
                    { id: 'todo', label: 'Todo' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => handleFilterChange(opt.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: timeFilter === opt.id ? 'var(--pink-primary)' : 'transparent',
                        color: timeFilter === opt.id ? '#0a0a00' : 'rgba(255,255,255,0.6)',
                        fontSize: '11px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {timeFilter === 'rango' && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ flex: 1, minWidth: '120px' }}>
                    <label style={{ display: 'block', fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Desde</label>
                    <input 
                      type="date" 
                      value={customRange.start} 
                      onChange={e => handleCustomRangeChange('start', e.target.value)} 
                      style={{ 
                        width: '100%', 
                        padding: '6px 10px', 
                        borderRadius: '8px', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        color: 'white', 
                        fontSize: '12px',
                        outline: 'none'
                      }} 
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '120px' }}>
                    <label style={{ display: 'block', fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hasta</label>
                    <input 
                      type="date" 
                      value={customRange.end} 
                      onChange={e => handleCustomRangeChange('end', e.target.value)} 
                      style={{ 
                        width: '100%', 
                        padding: '6px 10px', 
                        borderRadius: '8px', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        color: 'white', 
                        fontSize: '12px',
                        outline: 'none'
                      }} 
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { icon: <Star size={12} color="#c48b9f" />, lbl: isAssistant ? 'TRATAMIENTOS' : 'SERVICIOS', val: _stats.totalAppointments },
                  { icon: <Clock size={12} color="#c48b9f" />, lbl: 'TIEMPO PROM.', val: <>{_stats.avgDurationMin}<span style={{ fontSize: '13px', color: '#555', fontWeight: '700' }}> min</span></> },
                ].map((item, i) => (
                  <div key={i} style={{ padding: '18px', background: 'rgba(0,0,0,0.25)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#555', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      {item.icon} {item.lbl}
                    </div>
                    <div style={{ fontSize: '30px', fontWeight: '950', color: 'white' }}>{item.val}</div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>{isAssistant ? 'Tratamientos más realizados' : 'Servicios más realizados'}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {_stats.topServices.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#444', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '14px' }}>Sin registros aún</div>
                  ) : _stats.topServices.map((srv, idx) => (
                    <div key={idx} className="rank-row">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '7px' }}>
                        <span style={{ fontWeight: '700', color: 'white' }}>{srv.service_name}</span>
                        <span style={{ fontWeight: '900', color: '#c48b9f', background: 'rgba(196,139,159,0.08)', border: '1px solid rgba(196,139,159,0.15)', padding: '2px 9px', borderRadius: '7px', fontSize: '10px', whiteSpace: 'nowrap' }}>{srv.count} {isAssistant ? 'tratamientos' : 'servicios'}</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (srv.count / Math.max(1, _stats.totalAppointments)) * 100)}%`, height: '100%', background: 'var(--pink-gradient)', boxShadow: 'var(--pink-glow)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Inventario personal */}
            <div className="glass-card pp-card" style={{ padding: '26px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Wrench size={17} color="var(--pink-primary)" />
                  <h4 style={{ fontSize: '13px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Inventario Personal</h4>
                </div>
                <button
                  onClick={() => setShowAddTool(!showAddTool)}
                  style={{ background: showAddTool ? 'rgba(255,255,255,0.05)' : 'rgba(196,139,159,0.1)', border: showAddTool ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(196,139,159,0.25)', borderRadius: '10px', color: showAddTool ? 'white' : '#c48b9f', padding: '7px 13px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s' }}
                >
                  <Plus size={12} /> {showAddTool ? 'Cerrar' : 'Asignar'}
                </button>
              </div>

              {showAddTool && (
                <div style={{ padding: '18px', background: 'rgba(0,0,0,0.3)', borderRadius: '18px', border: '1px solid rgba(196,139,159,0.2)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['Propia', 'Asignada'].map(opt => (
                        <button key={opt} onClick={() => setNewTool({ ...newTool, ownership: opt })}
                          style={{ flex: 1, height: '34px', borderRadius: '8px', border: 'none', background: newTool.ownership === opt ? '#c48b9f' : 'rgba(255,255,255,0.04)', color: newTool.ownership === opt ? 'black' : 'white', fontSize: '11px', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s' }}>
                          {opt === 'Asignada' ? 'Asignada del Stock' : opt}
                        </button>
                      ))}
                    </div>
                    {newTool.ownership === 'Propia' ? (
                      <>
                        <input type="text" placeholder="Nombre (Ej: Clipper Magic Clip)" value={newTool.name} onChange={e => setNewTool({ ...newTool, name: e.target.value })} className="custom-form-input" />
                        <input type="text" placeholder="Marca/Detalles (Ej: Wahl)" value={newTool.brand} onChange={e => setNewTool({ ...newTool, brand: e.target.value })} className="custom-form-input" />
                      </>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        <button type="button" onClick={() => setDropdownOpen(!dropdownOpen)} className="custom-form-input"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: dropdownOpen ? '1px solid #c48b9f' : undefined }}>
                          <span style={{ color: newTool.inventory_id ? 'white' : 'rgba(255,255,255,0.4)' }}>
                            {newTool.inventory_id ? availableInventoryTools.find(t => t.id === newTool.inventory_id)?.name : 'Selecciona una herramienta...'}
                          </span>
                          <ChevronDown size={15} color="#c48b9f" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                        {dropdownOpen && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '5px', background: 'rgba(20,20,20,0.97)', border: '1px solid rgba(196,139,159,0.3)', borderRadius: '10px', maxHeight: '160px', overflowY: 'auto', zIndex: 100 }}>
                            {availableInventoryTools.length === 0 ? (
                              <div style={{ padding: '12px', color: '#555', fontSize: '13px', textAlign: 'center' }}>Sin herramientas disponibles</div>
                            ) : availableInventoryTools.map(t => (
                              <div key={t.id} onClick={() => { setNewTool({ ...newTool, inventory_id: t.id }); setDropdownOpen(false); }}
                                style={{ padding: '10px 14px', color: newTool.inventory_id === t.id ? '#c48b9f' : 'white', background: newTool.inventory_id === t.id ? 'rgba(196,139,159,0.08)' : 'transparent', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(196,139,159,0.08)'; e.currentTarget.style.color = '#c48b9f'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = newTool.inventory_id === t.id ? 'rgba(196,139,159,0.08)' : 'transparent'; e.currentTarget.style.color = newTool.inventory_id === t.id ? '#c48b9f' : 'white'; }}>
                                {t.name} (Ref: ${t.price})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <button onClick={handleAddTool} className="btn-pink" style={{ height: '40px', borderRadius: '10px', fontSize: '12px', fontWeight: '900' }}>
                      CONFIRMAR ASIGNACIÓN
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                {_tools.length === 0 ? (
                  <div style={{ padding: '28px', textAlign: 'center', color: '#444', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '14px' }}>
                    Ninguna herramienta registrada en este perfil.
                  </div>
                ) : _tools.map(tool => (
                  <div key={tool.id} className="inventory-tool-row">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: tool.ownership === 'Propia' ? 'rgba(196,139,159,0.1)' : 'rgba(48,209,88,0.1)', border: `1px solid ${tool.ownership === 'Propia' ? 'rgba(196,139,159,0.2)' : 'rgba(48,209,88,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Wrench size={16} color={tool.ownership === 'Propia' ? '#c48b9f' : '#30d158'} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '800', fontSize: '13px', color: 'white', marginBottom: '3px' }}>{tool.name}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>
                          {tool.brand} · <span style={{ color: tool.ownership === 'Propia' ? '#c48b9f' : '#30d158', fontWeight: '700' }}>{tool.ownership}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '10px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: tool.status === 'Operativa' ? '#30d158' : '#ff453a', background: tool.status === 'Operativa' ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)', border: `1px solid ${tool.status === 'Operativa' ? 'rgba(48,209,88,0.25)' : 'rgba(255,69,58,0.25)'}`, padding: '3px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                        ● {tool.status}
                      </span>
                      <button onClick={() => handleRemoveTool(tool.id)}
                        style={{ background: 'rgba(255,69,58,0.05)', border: '1px solid rgba(255,69,58,0.1)', color: 'rgba(255,69,58,0.5)', cursor: 'pointer', padding: '6px', borderRadius: '9px', display: 'flex', alignItems: 'center', transition: 'all 0.2s', flexShrink: 0 }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ff453a'; e.currentTarget.style.background = 'rgba(255,69,58,0.15)'; e.currentTarget.style.borderColor = 'rgba(255,69,58,0.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,69,58,0.5)'; e.currentTarget.style.background = 'rgba(255,69,58,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,69,58,0.1)'; }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserProfilePage;
