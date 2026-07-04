import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Zap,
  TrendingUp,
  User,
  Package,
  DollarSign,
  Users,
  Trophy,
  Crown,
  Calendar,
  Clock,
  ArrowUpRight,
  Target,
  Edit3,
  Gift,
  Cake,
  Bell,
  X,
  MessageCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { dataService } from '../../services/dataService';
import { useNotifs } from '../../context/NotificationContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import { buildBirthdayMessage } from '../../utils/birthdayMessage';
import { buildWhatsAppUrl } from '../../utils/whatsapp';
import { getRoleKind } from '../../utils/roles';

const QUOTES = [
  { text: "Cada cabeza es un mundo.", creator: "Refrán Popular" },
  { text: "La grandeza nace de pequeños comienzos.", creator: "Sir Francis Drake" },
  { text: "La disciplina es el puente entre metas y logros.", creator: "Jim Rohn" },
  { text: "El estilo es una forma de decir quién eres sin hablar.", creator: "Rachel Zoe" },
  { text: "Invierte en tu imagen, es tu carta de presentación.", creator: "Negocios" },
  { text: "Un corte de pelo puede cambiar una vida.", creator: "JanaStudio" },
  { text: "La calidad atrae, el detalle retiene.", creator: "Estrategia" },
  { text: "No busques clientes, busca fans.", creator: "Crecimiento" },
  { text: "El arte de la belleza es una pasión que inspira.", creator: "JanaStudio" },
  { text: "El éxito es la suma de pequeños esfuerzos diarios.", creator: "Robert Collier" },
  { text: "Domina tu oficio, luego rompe las reglas.", creator: "Maestros" },
  { text: "Cada cliente es una oportunidad de crear una obra maestra.", creator: "Visión" },
  { text: "El mejor marketing es un cliente satisfecho.", creator: "Marketing" },
  { text: "Sé tan bueno que no puedan ignorarte.", creator: "Steve Martin" },
  { text: "Tu única competencia es la persona en el espejo.", creator: "Superación" },
  { text: "El negocio de la belleza es el negocio de la felicidad.", creator: "Emprendimiento" }
];

const MobileDashboard = ({ onOpenSale, stats, chartData, dbData, onNavigate, onOpenNotifications }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [goals, setGoals] = useState({
    daily: parseFloat(localStorage.getItem('jana_daily_goal') || '500'),
    weekly: parseFloat(localStorage.getItem('jana_weekly_goal') || '3000'),
    monthly: parseFloat(localStorage.getItem('jana_monthly_goal') || '12000')
  });

  const [whatsappModalData, setWhatsappModalData] = useState(null);
  const [editedPhone, setEditedPhone] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useScrollLock(whatsappModalData !== null || isEditingGoals);

  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * QUOTES.length));

    const updateUnread = () => {
      const history = notificationService.getHistory();
      const count = history.filter(n => !n.read).length;
      setUnreadCount(count);
    };

    updateUnread();
    window.addEventListener('jana_new_notification', updateUnread);
    return () => window.removeEventListener('jana_new_notification', updateUnread);
  }, []);

  const handleSaveGoals = (newGoals) => {
    localStorage.setItem('jana_daily_goal', newGoals.daily);
    localStorage.setItem('jana_weekly_goal', newGoals.weekly);
    localStorage.setItem('jana_monthly_goal', newGoals.monthly);
    setGoals(newGoals);
    setIsEditingGoals(false);
  };

  const handleWhatsAppCongratulate = (person) => {
    const whatsappMsg = buildBirthdayMessage(person.name);
    setEditedPhone(person.phone || '');
    setEditedMessage(whatsappMsg);
    setWhatsappModalData(person);
  };

  const handleSendWhatsApp = async (isDirect = true) => {
    if (!whatsappModalData) return;

    const isRealClient = !whatsappModalData.isStaff && 
      !String(whatsappModalData.id).startsWith('staff-') && 
      !String(whatsappModalData.id).startsWith('client-');

    if (isRealClient && editedPhone !== (whatsappModalData.phone || '')) {
      setIsSaving(true);
      try {
        await dataService.updateClient(whatsappModalData.id, { phone: editedPhone });
      } catch (err) {
        console.error("Error al actualizar teléfono de cliente:", err);
      } finally {
        setIsSaving(false);
      }
    }

    const url = buildWhatsAppUrl({
      phone: isDirect ? editedPhone : '',
      message: editedMessage
    });

    window.open(url, '_blank');
    setWhatsappModalData(null);
  };

  const roleKind = getRoleKind(user?.role);
  const isBarber = roleKind === 'stylist';
  const isStylist = roleKind === 'assistant';
  const isAdmin = roleKind === 'admin';

  const myStats = ((isBarber || isStylist) && dbData?.staff) 
    ? (dbData.staff.find(s => s.id === user.id)?.stats || { income: 0, weeklyIncome: 0, monthlyIncome: 0, appointments: 0 }) 
    : (stats || { income: 0, weeklyIncome: 0, monthlyIncome: 0, appointments: 0 });

  const myClients = isBarber
    ? (dbData?.clients || []).filter(c => c.created_by_staff_id === user?.id || (c.served_by_staff_ids || []).includes(user?.id))
    : (dbData?.clients || []);

  // Calculate dynamic top performing staff
  const getTopBarber = () => {
    if (!dbData?.staff || dbData.staff.length === 0) return { name: "Marco Silva", count: 12 };
    const barbers = dbData.staff.filter(s => {
      const r = s.role?.toLowerCase() || '';
      return (r.includes('estilista') || r.includes('stylist')) && !r.includes('admin');
    });
    if (barbers.length === 0) return { name: "Marco Silva", count: 12 };
    const sorted = [...barbers].sort((a, b) => (b.stats?.income || 0) - (a.stats?.income || 0));
    return {
      name: sorted[0]?.name || "Marco Silva",
      income: sorted[0]?.stats?.income || 0,
      count: sorted[0]?.stats?.appointments || 3
    };
  };

  const topBarber = getTopBarber();

  // Get first 3 active barbers for team overview (monthly income podium)
  const teamOverview = (dbData?.staff || [])
    .filter(s => {
      const r = s.role?.toLowerCase() || '';
      return (r.includes('estilista') || r.includes('stylist')) && !r.includes('archived') && !r.includes('admin');
    })
    .sort((a, b) => (b.stats?.monthlyIncome || 0) - (a.stats?.monthlyIncome || 0))
    .slice(0, 3);

  // Top Clientes
  const topClients = (dbData?.clients || [])
    .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
    .slice(0, 3);

  // SVG Chart Calculation (Custom Glowing Line Chart)
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  
  let myLineValues = chartData?.datasets?.[0]?.data || [240, 350, 200, 380, 480, 520, 600];
  let myDaysFlow = [];
  let myPeakHours = { '9a.m.': 0, '12p.m.': 0, '3p.m.': 0, '6p.m.': 0, '9p.m.': 0 };

  if (isBarber) {
    const myAppts = (dbData?.appointments || []).filter(a => a.staff_id === user?.id);
    const myTrans = (dbData?.transactions || []).filter(tr => tr.type === 'income' && !tr.metadata?.appointment_id && tr.metadata?.staffInvolved?.some(si => si.staffId === user?.id));
    
    myLineValues = last7Days.map(d => {
      const appts = myAppts.filter(a => a.created_at?.startsWith(d) || a.scheduled_at?.startsWith(d)).reduce((acc, a) => acc + Number(a.total_price || 0), 0);
      const dirs = myTrans.filter(tr => tr.created_at?.startsWith(d)).reduce((acc, tr) => acc + Number(tr.amount || 0), 0);
      return appts + dirs;
    });

    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const statsDays = {};
    const statsHours = { '9a.m.': 0, '12p.m.': 0, '3p.m.': 0, '6p.m.': 0, '9p.m.': 0 };

    [...myAppts, ...myTrans].forEach(item => {
      const opDate = item.accounting_at || item.completed_at || item.scheduled_at || item.created_at;
      const d = opDate ? opDate.split('T')[0] : null;
      if (d && last7Days.includes(d)) {
        const day = days[new Date(opDate).getDay()];
        statsDays[day] = (statsDays[day] || 0) + 1;

        const h = new Date(opDate).getHours();
        if (h >= 8 && h < 11) statsHours['9a.m.']++;
        else if (h >= 11 && h < 14) statsHours['12p.m.']++;
        else if (h >= 14 && h < 17) statsHours['3p.m.']++;
        else if (h >= 17 && h < 20) statsHours['6p.m.']++;
        else if (h >= 20) statsHours['9p.m.']++;
      }
    });

    const renderOrder = ['sábado', 'viernes', 'jueves', 'miércoles', 'martes', 'domingo', 'lunes'];
    myDaysFlow = renderOrder.map(day => ({ name: day, count: statsDays[day] || 0 }));
    myPeakHours = statsHours;
  }

  let astWashesByBarber = [];
  let astDaysFlow = [];
  let astPeakHours = { '9a.m.': 0, '12p.m.': 0, '3p.m.': 0, '6p.m.': 0, '9p.m.': 0 };

  if (isStylist) {
    const myAppts = (dbData?.appointments || []).filter(a => a.appointment_staff?.some(as => String(as.staff_id) === String(user?.id)));
    const myTrans = (dbData?.transactions || []).filter(tr => tr.type === 'income' && !tr.metadata?.appointment_id && tr.metadata?.staffInvolved?.some(si => String(si.staffId) === String(user?.id)));
    
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const statsDays = {};
    const statsHours = { '9a.m.': 0, '12p.m.': 0, '3p.m.': 0, '6p.m.': 0, '9p.m.': 0 };
    const barberCounts = {};

    [...myAppts, ...myTrans].forEach(item => {
      const opDate = item.accounting_at || item.completed_at || item.scheduled_at || item.created_at;
      const d = opDate ? opDate.split('T')[0] : null;
      if (d && last7Days.includes(d)) {
        const day = days[new Date(opDate).getDay()];
        statsDays[day] = (statsDays[day] || 0) + 1;

        const h = new Date(opDate).getHours();
        if (h >= 8 && h < 11) statsHours['9a.m.']++;
        else if (h >= 11 && h < 14) statsHours['12p.m.']++;
        else if (h >= 14 && h < 17) statsHours['3p.m.']++;
        else if (h >= 17 && h < 20) statsHours['6p.m.']++;
        else if (h >= 20) statsHours['9p.m.']++;

        if (item.staff_id) {
          const barberObj = (dbData?.staff || []).find(s => s.id === item.staff_id);
          if (barberObj && !barberObj.role?.toLowerCase().includes('assistant') && !barberObj.role?.toLowerCase().includes('admin')) {
            barberCounts[barberObj.name] = (barberCounts[barberObj.name] || 0) + 1;
          }
        } else if (item.metadata?.staffInvolved) {
          const mainBarber = item.metadata.staffInvolved.find(si => {
            const sObj = (dbData?.staff || []).find(s => s.id === si.staffId);
            return sObj && !sObj.role?.toLowerCase().includes('assistant') && !sObj.role?.toLowerCase().includes('admin');
          });
          if (mainBarber) {
             const barberObj = (dbData?.staff || []).find(s => s.id === mainBarber.staffId);
             if (barberObj) {
               barberCounts[barberObj.name] = (barberCounts[barberObj.name] || 0) + 1;
             }
          }
        }
      }
    });

    const renderOrder = ['sábado', 'viernes', 'jueves', 'miércoles', 'martes', 'domingo', 'lunes'];
    astDaysFlow = renderOrder.map(day => ({ name: day, count: statsDays[day] || 0 }));
    astPeakHours = statsHours;
    astWashesByBarber = Object.keys(barberCounts).map(name => ({ name: name.split(' ')[0], count: barberCounts[name] })).sort((a,b) => b.count - a.count);
  }

  const maxAstDayCount = Math.max(...astDaysFlow.map(d => d.count)) || 1;
  const maxAstHourCount = Math.max(...Object.values(astPeakHours)) || 1;
  const maxAstBarberCount = Math.max(...astWashesByBarber.map(d => d.count)) || 1;

  const maxMyDayCount = Math.max(...myDaysFlow.map(d => d.count)) || 1;
  const maxMyHourCount = Math.max(...Object.values(myPeakHours)) || 1;

  const lineValues = isBarber ? myLineValues : (chartData?.datasets?.[0]?.data || [240, 350, 200, 380, 480, 520, 600]);
  const maxVal = Math.max(...lineValues) || 100;
  const chartHeight = 120;
  
  const points = lineValues.map((val, idx) => {
    const x = 20 + idx * 45;
    const y = 130 - (val / maxVal) * chartHeight;
    return { x, y, val };
  });

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    return `${acc} C ${(prev.x + p.x) / 2} ${prev.y}, ${(prev.x + p.x) / 2} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const fillD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} 150 L ${points[0].x} 150 Z`
    : '';

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Birthday Stats
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const todaysBirthdays = (myClients || []).filter(c => {
    if (!c.birth_date) return false;
    const parts = c.birth_date.split('-');
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    return m === todayMonth && d === todayDay;
  });

  const upcomingBirthdays = (myClients || [])
    .filter(c => {
      if (!c.birth_date) return false;
      const parts = c.birth_date.split('-');
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      
      const bday = new Date(today.getFullYear(), m - 1, d);
      if (bday < today && !(m === todayMonth && d === todayDay)) {
        bday.setFullYear(today.getFullYear() + 1);
      }
      
      const diffTime = bday - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      c.daysToBday = diffDays;
      c.bdayDateStr = `${d} de ${bday.toLocaleDateString([], { month: 'long' })}`;
      
      return diffDays > 0 && diffDays <= 15;
    })
    .sort((a, b) => a.daysToBday - b.daysToBday)
    .slice(0, 3);

  return (
    <div className="mobile-dashboard animate-fade-in" style={{ paddingBottom: '100px', fontFamily: "'Inter', sans-serif", overflowX: 'hidden', position: 'relative' }}>
      
      {/* Hello Greeting Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--pink-primary)', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase' }}>BIENVENIDO A JANA</div>
          <div style={{ fontSize: '28px', fontWeight: '950', letterSpacing: '-1px', marginTop: '4px', color: '#ffffff' }}>
            Panel de <span className="text-gold">Control</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '1.5px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: unreadCount > 0 ? 'var(--pink-primary)' : 'white',
              position: 'relative',
              cursor: 'pointer',
              outline: 'none',
              padding: 0
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute',
                top: '0px',
                right: '0px',
                backgroundColor: '#ff4d4d',
                color: 'white',
                fontSize: '8px',
                fontWeight: '900',
                borderRadius: '50%',
                minWidth: '13px',
                height: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 2px',
                border: '1.5px solid var(--bg-primary)'
              }}>
                {unreadCount}
              </div>
            )}
          </button>

          {/* Crown */}
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            border: '1.5px solid var(--pink-primary)',
            background: 'rgba(196,139,159,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--pink-primary)'
          }}>
            <Crown size={20} />
          </div>
        </div>
      </div>

      {/* Wrapper to allow 3D floating chair overflow and prevent backdrop-filter clipping */}
      <div style={{ position: 'relative', overflow: 'visible', marginBottom: '24px' }}>
        {/* Main Hero Card (Quotes & Floating Chair Background - Identical to PC Dashboard) */}
        <div className="glass-card" style={{ 
          minHeight: '220px', 
          borderRadius: '28px', 
          padding: '24px 20px', 
          position: 'relative', 
          overflow: 'visible',
          background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(42, 34, 15, 0.65) 100%)',
          border: '1px solid rgba(196, 139, 159, 0.35)',
          boxShadow: '0 16px 45px rgba(0, 0, 0, 0.75), inset 0 0 35px rgba(196, 139, 159, 0.08)',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '60%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '12px', height: '2px', backgroundColor: 'var(--pink-primary)' }} />
              <span style={{ fontSize: '10px', fontWeight: '950', color: 'var(--pink-primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>PENSAMIENTO JANA</span>
              <button 
                onClick={() => setQuoteIndex((prev) => (prev + 1) % QUOTES.length)}
                style={{ 
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                  transition: 'transform 0.2s ease, background-color 0.2s ease'
                }}
                title="Descubrir otro Pensamiento Jana"
              >
                <Sparkles size={12} color="var(--pink-primary)" className="animate-pulse" />
              </button>
            </div>
            <h2 style={{ 
              fontSize: '17px', 
              fontWeight: '700', 
              lineHeight: '1.35', 
              marginBottom: '12px', 
              color: 'white',
              fontFamily: "'Georgia', serif",
              fontStyle: 'italic',
              textShadow: '0 2px 12px rgba(0,0,0,0.6)',
              textWrap: 'pretty'
            }}>
              “{QUOTES[quoteIndex].text}”
            </h2>
            <p style={{ color: 'var(--pink-primary)', fontSize: '11px', fontWeight: '800', opacity: 0.9, letterSpacing: '0.5px' }}>
              — {QUOTES[quoteIndex].creator}
            </p>
          </div>
        </div>

        {/* Visual Elements (Floating Chair - Placed OUTSIDE glass-card to bypass backdrop-filter clip bugs) */}
        <div className="chair-entrance" style={{ 
          position: 'absolute', 
          right: '-10px', 
          bottom: '-10px', 
          width: '45%', 
          height: '125%', // Increased to pop out beautifully at the top
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 12,
          pointerEvents: 'none'
        }}>
          {/* Soft Golden Glow behind the chair */}
          <div style={{
            position: 'absolute',
            top: '40%',
            left: '42%',
            transform: 'translate(-50%, -50%)',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(196, 139, 159, 0.14) 0%, rgba(196, 139, 159, 0.05) 35%, rgba(196, 139, 159, 0.01) 65%, transparent 100%)',
            zIndex: 2,
            pointerEvents: 'none'
          }} />
          <div className="chair-shadow" style={{ 
            position: 'absolute', 
            bottom: '8px', 
            left: '42%', 
            transform: 'translateX(-50%)', 
            width: '80px', 
            height: '16px', 
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, transparent 70%)',
            zIndex: 1,
            animation: 'shadow-scale 8s infinite ease-in-out'
          }} />
          <img 
            src="/barber-chair.png" 
            alt="JanaStudio Chair" 
            className="chair-float"
            style={{ 
              width: '100%', 
              height: 'auto',
              maxHeight: '130%', // Pop up to prevent any top cut-offs
              objectFit: 'contain',
              zIndex: 3,
              filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.85)) drop-shadow(0 0 20px rgba(196, 139, 159, 0.35))',
              animation: 'float 8s infinite ease-in-out'
            }} 
          />
        </div>
      </div>

      {/* Business Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isStylist ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '12px 8px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px' }}>{isStylist ? 'GANANCIAS SEMANALES' : 'PRODUCCIÓN'}</div>
          <div style={{ fontSize: '15px', fontWeight: '950', color: isStylist ? '#00c6ff' : 'var(--pink-primary)' }}>${formatCurrency(myStats.weeklyIncome || 0)}</div>
        </div>
        <div className="glass-card" style={{ padding: '12px 8px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px' }}>{isStylist ? 'LAVADOS SEMANALES' : 'CITAS'}</div>
          <div style={{ fontSize: '15px', fontWeight: '950', color: 'white' }}>{isStylist ? myStats.weeklyAppointments : myStats.weeklyAppointments}</div>
        </div>
        {!isStylist && (
          <div className="glass-card" style={{ padding: '12px 8px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px' }}>CLIENTES</div>
            <div style={{ fontSize: '15px', fontWeight: '950', color: 'white' }}>{isBarber ? myClients.length : stats.clients}</div>
          </div>
        )}
      </div>

      {/* Assistant Goals Meters Widget */}
      {isStylist && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {[
            { 
              id: 'personal_income', 
              title: 'Mi Meta de Ingresos', 
              current: myStats.monthlyIncome || 0, 
              goal: parseFloat(localStorage.getItem(`jana_monthly_goal_${user?.id}`) || (parseFloat(localStorage.getItem('jana_monthly_goal') || '') < 1000 ? localStorage.getItem('jana_monthly_goal') : null) || '400'), 
              label: 'MES EN CURSO',
              isCurrency: true
            },
            { 
              id: 'personal_services', 
              title: 'Mi Meta de Servicios', 
              current: (dbData?.appointments || []).filter(a => {
                const d = new Date(a.created_at || a.scheduled_at);
                const currentMonthStartISO = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
                if (d < new Date(currentMonthStartISO)) return false;
                return a.appointment_staff?.some(as => as.staff_id === user?.id);
              }).length, 
              goal: parseInt(localStorage.getItem(`jana_monthly_goal_services_${user?.id}`) || localStorage.getItem('jana_monthly_goal_services') || '40'), 
              label: 'SERVICIOS DEL MES',
              isCurrency: false
            }
          ].map((m, i) => (
            <div key={m.id} className="glass-card" style={{ padding: '18px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={14} color="var(--pink-primary)" />
                  <span style={{ fontWeight: '900', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'white' }}>{m.title}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>
                  {m.isCurrency ? `$${formatCurrency(m.current || 0)}` : m.current} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>/ {m.isCurrency ? `$${formatCurrency(m.goal)}` : m.goal}</span>
                </div>
                <div style={{ fontSize: '9px', fontWeight: '900', color: 'var(--pink-primary)', backgroundColor: 'rgba(196,139,159,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  {Math.min(Math.round(((m.current || 0) / m.goal) * 100), 100)}%
                </div>
              </div>

              <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${Math.min(((m.current || 0) / m.goal) * 100, 100)}%`, 
                  height: '100%', 
                  background: 'var(--pink-gradient)', 
                  boxShadow: 'var(--pink-glow)',
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assistant Upcoming Appointments Widget */}
      {isStylist && (
        <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(0,122,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} color="#007aff" />
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: '900', color: 'white', margin: 0 }}>Próximas <span style={{ color: '#007aff' }}>Citas</span></h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '350px', paddingRight: '4px' }} className="astro-scrollbar">
            {(!dbData?.todayAppointments || dbData.todayAppointments.filter(app => ['Agendado', 'En Silla', 'En Tratamiento'].includes(app.status)).length === 0) ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '13px', fontWeight: '600' }}>No hay citas pendientes para hoy.</p>
              </div>
            ) : (
              dbData.todayAppointments
                .filter(app => ['Agendado', 'En Silla', 'En Tratamiento'].includes(app.status))
                .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
                .map((app, idx) => (
                  <div key={idx} style={{ 
                    padding: '12px 14px', 
                    borderRadius: '14px', 
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontWeight: '800', fontSize: '13px', color: 'white' }}>{app.clients?.name || 'Cliente'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '10px', color: '#007aff', fontWeight: '700' }}>{app.staff?.name?.split(' ')[0]}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>•</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{app.services?.name}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: '900', color: 'white' }}>
                        {app.scheduled_at ? new Date(app.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'S/H'}
                      </div>
                      <div style={{ 
                        fontSize: '9px', 
                        fontWeight: '900', 
                        padding: '1px 5px', 
                        borderRadius: '4px',
                        marginTop: '3px',
                        backgroundColor: app.status === 'En Silla' ? 'rgba(76,175,80,0.1)' : (app.status === 'En Tratamiento' ? 'rgba(0,122,255,0.1)' : 'rgba(196,139,159,0.1)'),
                        color: app.status === 'En Silla' ? '#4caf50' : (app.status === 'En Tratamiento' ? '#007aff' : 'var(--pink-primary)'),
                        display: 'inline-block'
                      }}>
                        {app.status}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* Admin Goals Meters Widget (Identical to PC Goals Module) */}
      {isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {[
            { id: 'daily', title: 'Misión Diaria', current: stats?.income || 0, goal: goals.daily, label: 'HOY' },
            { id: 'weekly', title: 'Meta Semanal', current: stats?.weeklyIncome || 0, goal: goals.weekly, label: 'SEMANA ACTUAL' },
            { id: 'monthly', title: 'Objetivo Mensual', current: stats?.monthlyIncome || 0, goal: goals.monthly, label: 'MES EN CURSO' }
          ].map((m, i) => (
            <div key={m.id} className="glass-card" style={{ padding: '18px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={14} color="var(--pink-primary)" />
                  <span style={{ fontWeight: '900', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'white' }}>{m.title}</span>
                </div>
                {i === 0 && (
                  <button 
                    onClick={() => setIsEditingGoals(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                  >
                    <Edit3 size={12} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>
                  ${formatCurrency(m.current || 0)} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>/ ${formatCurrency(m.goal)}</span>
                </div>
                <div style={{ fontSize: '9px', fontWeight: '900', color: 'var(--pink-primary)', backgroundColor: 'rgba(196,139,159,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  {Math.min(Math.round(((m.current || 0) / m.goal) * 100), 100)}%
                </div>
              </div>

              <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${Math.min(((m.current || 0) / m.goal) * 100, 100)}%`, 
                  height: '100%', 
                  background: 'var(--pink-gradient)', 
                  boxShadow: 'var(--pink-glow)',
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visual Podium Section for Top Barbers (Identical to Desktop) */}
      {isAdmin && teamOverview.length >= 2 && (
        <PodiumWidget 
          title="Top Estilistas" 
          icon={<Trophy size={16} />}
          data={teamOverview}
          labelKey="name"
          scoreKey={(item) => `$${(item.stats?.monthlyIncome || 0).toFixed(0)}`}
          scoreLabel="MES EN CURSO"
        />
      )}

      {/* Visual Podium Section for Top Clients (Identical to Desktop) */}
      {isAdmin && topClients.length >= 2 && (
        <PodiumWidget 
          title="Top Clientes" 
          icon={<Users size={16} />}
          data={topClients}
          labelKey="name"
          scoreKey={(item) => `$${(item.total_spent || 0).toFixed(0)}`}
          scoreLabel="TOTAL CONSUMIDO"
          isClient={true}
          onNavigate={onNavigate}
        />
      )}

      {/* Fallback list if podium data is too fresh */}
      {isAdmin && teamOverview.length < 2 && (
        <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontWeight: '900', fontSize: '13px', color: '#ffffff', marginBottom: '16px', letterSpacing: '-0.3px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={14} color="var(--pink-primary)" /> TOP ESTILISTAS (MES EN CURSO)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {teamOverview.map((st, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: idx !== teamOverview.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '950', color: 'var(--pink-primary)', width: '16px' }}>{idx+1}.</span>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>{st.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--pink-primary)' }}>${formatCurrency(st.stats?.monthlyIncome || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Birthdays Section (Ported from PC Dashboard) */}
      {isAdmin && (
        <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Cake size={16} color="var(--pink-primary)" />
            <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#ffffff' }}>CUMPLEAÑOS DE CLIENTES</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Today */}
            <div>
              <div style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: todaysBirthdays.length > 0 ? '#4caf50' : 'rgba(255,255,255,0.1)' }}></span>
                CUMPLEN HOY
              </div>
              {todaysBirthdays.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
                  Ningún cliente cumple años hoy.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {todaysBirthdays.map(c => (
                    <div 
                      key={c.id} 
                      style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap',
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '10px 12px', 
                        backgroundColor: 'rgba(196,139,159,0.08)', 
                        border: '1px solid rgba(196,139,159,0.2)', 
                        borderRadius: '12px',
                        gap: '8px 10px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '100px', flex: '1 1 0%' }}>
                        <span 
                          style={{ fontWeight: '800', color: 'white', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} 
                          onClick={() => onNavigate && onNavigate('clients', { clientId: c.id })}
                        >
                          {c.name}
                        </span>
                        <span style={{ alignSelf: 'flex-start', fontSize: '8px', fontWeight: '900', color: 'var(--pink-primary)', backgroundColor: 'rgba(196,139,159,0.1)', padding: '1px 4px', borderRadius: '3px' }}>
                          CLIENTE
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', flexShrink: 0, flexGrow: 1, justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleWhatsAppCongratulate(c)}
                          style={{ 
                            padding: '6px 12px', 
                            borderRadius: '8px', 
                            border: 'none', 
                            backgroundColor: '#25d366', 
                            color: 'black', 
                            fontSize: '11px', 
                            fontWeight: '850', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <MessageCircle size={12} fill="black" /> Felicitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming */}
            <div>
              <div style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
                PRÓXIMOS 15 DÍAS
              </div>
              {upcomingBirthdays.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
                  Sin cumpleaños próximos.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {upcomingBirthdays.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '10px', cursor: 'pointer' }} onClick={() => onNavigate && onNavigate('clients', { clientId: c.id })}>
                      <span style={{ fontWeight: '700', color: 'var(--text-secondary)', fontSize: '12px' }}>{c.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--pink-primary)', fontWeight: '800' }}>{c.bdayDateStr} <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '600' }}>(en {c.daysToBday}d)</span></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isStylist && (
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ fontWeight: '900', fontSize: '15px', color: '#ffffff', letterSpacing: '-0.3px', fontStyle: 'italic' }}>Tendencia de Ventas</div>
            <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '900', backgroundColor: 'rgba(196, 139, 159, 0.1)', padding: '4px 10px', borderRadius: '8px' }}>DIARIA</div>
          </div>
          
          {/* Glow Line Chart in pure SVG */}
        <div style={{ height: '160px', width: '100%', position: 'relative' }}>
          <svg width="100%" height="150" viewBox="0 0 320 150" style={{ overflow: 'visible' }}>
            {/* Grid Lines */}
            {[30, 60, 90, 120].map((gY, gi) => (
              <line key={gi} x1="20" y1={gY} x2="300" y2={gY} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            ))}

            {/* Glowing path area */}
            {fillD && (
              <path d={fillD} fill="url(#mobileGoldGrad)" opacity="0.1" />
            )}

            {/* Curved Path */}
            {pathD && (
              <path d={pathD} fill="none" stroke="var(--pink-primary)" strokeWidth="2.5" strokeLinecap="round" />
            )}

            {/* Points & Tags */}
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="4" fill="var(--pink-primary)" stroke="#121212" strokeWidth="1.5" />
                
                {/* Micro Label Pill */}
                {i % 2 === 0 && (
                  <g transform={`translate(${p.x}, ${p.y - 14})`}>
                    <rect x="-16" y="-6" width="32" height="12" rx="2" fill="#ffffff" />
                    <text x="0" y="3" fill="#000000" fontSize="8" fontWeight="950" textAnchor="middle">
                      {isStylist ? Math.round(p.val) : `$${Math.round(p.val)}`}
                    </text>
                  </g>
                )}

                {/* X Axis tick labels */}
                {i < 7 && chartData?.labels?.[i] && (
                  <text x={p.x} y="145" fill="#8c8c8c" fontSize="8" fontWeight="800" textAnchor="middle">
                    {chartData.labels[i]}
                  </text>
                )}
              </g>
            ))}

            <defs>
              <linearGradient id="mobileGoldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--pink-primary)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      )}

      {isBarber && (
        <>
          {/* DÍAS FLUJO (Bar Chart) */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '12px', height: '6px', backgroundColor: 'var(--pink-primary)', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Días Flujo (Semana)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '140px', padding: '10px 0', marginTop: '20px' }}>
              {myDaysFlow.map((d, idx) => {
                const h = (d.count / maxMyDayCount) * 90;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span style={{ fontSize: '10px', fontWeight: '950', color: 'var(--pink-primary)' }}>{d.count}</span>
                    <div style={{ width: '18px', height: `${Math.max(h, 4)}px`, background: 'var(--pink-gradient)', borderRadius: '2px 2px 0 0', boxShadow: '0 4px 10px rgba(196,139,159,0.15)' }}></div>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#8c8c8c', textTransform: 'lowercase', marginTop: '2px' }}>
                      {d.name.substring(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* HORAS FLUJO (Line Chart) */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '12px', height: '6px', backgroundColor: 'var(--pink-primary)', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Horas Flujo (Semana)</span>
            </div>
            <div style={{ height: '140px', width: '100%', position: 'relative', marginTop: '20px' }}>
              <svg width="100%" height="100%" viewBox="0 0 320 140" style={{ overflow: 'visible' }}>
                {[20, 50, 80, 110].map((gY, gi) => (
                  <line key={gi} x1="10" y1={gY} x2="310" y2={gY} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                ))}
                <path d={Object.keys(myPeakHours).reduce((acc, k, i) => {
                  const x = 30 + i * ((300 - 30) / 4);
                  const y = 110 - (myPeakHours[k] / maxMyHourCount) * 90;
                  return acc + (i === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `);
                }, '')} fill="none" stroke="var(--pink-primary)" strokeWidth="2" />
                {Object.keys(myPeakHours).map((k, i) => {
                  const x = 30 + i * ((300 - 30) / 4);
                  const y = 110 - (myPeakHours[k] / maxMyHourCount) * 90;
                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="3" fill="var(--pink-primary)" stroke="#121212" strokeWidth="1" />
                      <text x={x} y="130" fill="#8c8c8c" fontSize="9" fontWeight="800" textAnchor="middle">{k}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </>
      )}

      {isStylist && (
        <>
          {/* TRATAMIENTOS POR ESTILISTA (Bar Chart) */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '12px', height: '6px', backgroundColor: '#00c6ff', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Tratamientos por Estilista</span>
            </div>
            {astWashesByBarber.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#8c8c8c', padding: '20px 0', textAlign: 'center' }}>Sin datos esta semana</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                {astWashesByBarber.map((d, idx) => {
                  const w = (d.count / maxAstBarberCount) * 100;
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#8c8c8c', width: '50px', textAlign: 'right' }}>{d.name.substring(0, 8)}</span>
                      <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', height: '14px', borderRadius: '4px', overflow: 'hidden' }}>
                         <div style={{ width: `${Math.max(w, 2)}%`, height: '100%', background: 'linear-gradient(90deg, #0072ff, #00c6ff)', borderRadius: '4px' }}></div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '950', color: '#00c6ff', width: '20px' }}>{d.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LAVADOS POR DIA (Bar Chart) */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '12px', height: '6px', backgroundColor: '#00c6ff', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Lavados por Día</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '140px', padding: '10px 0', marginTop: '20px' }}>
              {astDaysFlow.map((d, idx) => {
                const h = (d.count / maxAstDayCount) * 90;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span style={{ fontSize: '10px', fontWeight: '950', color: '#00c6ff' }}>{d.count}</span>
                    <div style={{ width: '18px', height: `${Math.max(h, 4)}px`, background: 'linear-gradient(0deg, #0072ff, #00c6ff)', borderRadius: '2px 2px 0 0', boxShadow: '0 4px 10px rgba(0, 198, 255, 0.15)' }}></div>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#8c8c8c', textTransform: 'lowercase', marginTop: '2px' }}>
                      {d.name.substring(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LAVADOS POR HORA (Horizontal Bar Chart) */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '12px', height: '6px', backgroundColor: '#00c6ff', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '1px' }}>Lavados por Hora</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
               {Object.keys(astPeakHours).map((k, i) => {
                  const count = astPeakHours[k];
                  const w = (count / maxAstHourCount) * 100;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'white', width: '40px', textAlign: 'right' }}>{k}</span>
                      <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', height: '16px', borderRadius: '4px', overflow: 'hidden' }}>
                         <div style={{ width: `${Math.max(w, 2)}%`, height: '100%', background: 'linear-gradient(90deg, #0072ff, #00c6ff)', borderRadius: '4px' }}></div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '950', color: '#00c6ff', width: '25px' }}>{count}</span>
                    </div>
                  );
               })}
            </div>
          </div>
        </>
      )}

      {/* Goal Edit Modal */}
      {isEditingGoals && (
        <div className="modal-overlay animate-fade-in" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, backdropFilter: 'blur(10px)', padding: '20px'
        }}>
          <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: '360px', padding: '30px', borderRadius: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target color="var(--pink-primary)" size={18} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>Metas <span className="text-gold">Jana</span></h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '1px' }}>META DIARIA ($)</label>
                <input 
                  type="number" 
                  value={goals.daily} 
                  onChange={e => setGoals({...goals, daily: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', fontWeight: '700', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '1px' }}>META SEMANAL ($)</label>
                <input 
                  type="number" 
                  value={goals.weekly} 
                  onChange={e => setGoals({...goals, weekly: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', fontWeight: '700', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '1px' }}>META MENSUAL ($)</label>
                <input 
                  type="number" 
                  value={goals.monthly} 
                  onChange={e => setGoals({...goals, monthly: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', fontWeight: '700', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setIsEditingGoals(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700' }}>Cancelar</button>
              <button onClick={() => handleSaveGoals(goals)} className="btn-pink" style={{ flex: 1.5, padding: '12px', borderRadius: '10px', fontWeight: '800' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
      {/* WhatsApp Message Customization Modal Portal */}
      {whatsappModalData && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '380px',
            background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(10, 10, 10, 0.98) 100%)',
            border: '1px solid rgba(196, 139, 159, 0.25)',
            borderRadius: '24px',
            padding: '20px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(196, 139, 159, 0.05)',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={18} color="var(--pink-primary)" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: 'white' }}>
                  Felicitar a {whatsappModalData.name}
                </h3>
              </div>
              <button 
                onClick={() => setWhatsappModalData(null)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Description */}
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 14px 0' }}>
              Personaliza el mensaje y el número. Al editar el teléfono, se guardará en la base de datos automáticamente.
            </p>

            {/* Phone Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
              <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Número de Teléfono
              </label>
              <input 
                type="text" 
                value={editedPhone} 
                onChange={(e) => setEditedPhone(e.target.value)}
                placeholder="Ej: +584121234567"
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                }}
              />
            </div>

            {/* Message Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '18px' }}>
              <label style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Mensaje de Felicitación
              </label>
              <textarea 
                value={editedMessage} 
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={5}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '110px',
                  lineHeight: '1.4'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={() => handleSendWhatsApp(true)}
                disabled={isSaving || !editedPhone}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: editedPhone ? '#25d366' : 'rgba(255,255,255,0.05)',
                  color: editedPhone ? 'black' : 'var(--text-muted)',
                  fontWeight: '850',
                  fontSize: '12px',
                  border: 'none',
                  cursor: (isSaving || !editedPhone) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: editedPhone ? '0 4px 12px rgba(37, 211, 102, 0.25)' : 'none',
                }}
              >
                <MessageCircle size={14} />
                {isSaving ? 'Guardando...' : 'Enviar al Número Registrado'}
              </button>

              <button 
                onClick={() => handleSendWhatsApp(false)}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                Elegir Contacto Manualmente
              </button>

              <button 
                onClick={() => setWhatsappModalData(null)}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  fontWeight: '600',
                  fontSize: '12px',
                  border: 'none',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  textAlign: 'center'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(3deg); }
        }
        .mobile-dashboard::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

// Premium visual podium component cloned and scaled for Mobile Screens
const PodiumWidget = ({ title, icon, data, labelKey, scoreKey, scoreLabel, isClient, onNavigate }) => {
  const podiumOrder = [data[1], data[0], data[2]].filter(Boolean);

  return (
    <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <h3 style={{ fontSize: '14px', fontWeight: '900', color: 'white' }}>{title.split(' ')[0]} <span className="text-gold">{title.split(' ')[1]}</span></h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', minHeight: '140px' }}>
        {podiumOrder.map((item, idx) => {
          const originalIdx = data.indexOf(item);
          const isFirst = originalIdx === 0;
          const isSecond = originalIdx === 1;
          const isThird = originalIdx === 2;

          return (
            <div key={item.id || idx} style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center'
            }}>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <div style={{ 
                  width: isFirst ? '56px' : '44px', 
                  height: isFirst ? '56px' : '44px', 
                  borderRadius: '16px', 
                  backgroundColor: 'var(--bg-tertiary)',
                  border: isFirst ? '2.5px solid var(--pink-primary)' : '1.5px solid rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                  boxShadow: isFirst ? 'var(--pink-glow)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item[labelKey]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={isFirst ? 24 : 18} color="var(--pink-primary)" opacity={0.5} />
                  )}
                </div>
                {isFirst && <Crown size={16} color="var(--pink-primary)" fill="var(--pink-primary)" style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)' }} />}
                <div style={{ 
                  position: 'absolute', 
                  bottom: '-6px', 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  width: '18px', 
                  height: '18px', 
                  borderRadius: '50%', 
                  backgroundColor: isFirst ? 'var(--pink-primary)' : isSecond ? '#C0C0C0' : '#CD7F32',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '9px', 
                  fontWeight: '900', 
                  color: 'black'
                }}>
                  {originalIdx + 1}
                </div>
              </div>

              <div 
                style={{ textAlign: 'center', marginTop: '8px', cursor: isClient ? 'pointer' : 'default', width: '100%' }}
                onClick={() => isClient && onNavigate && onNavigate('clients', { clientId: item.id })}
              >
                <div style={{ 
                  fontWeight: '850', 
                  fontSize: isFirst ? '11px' : '10px', 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  color: isClient ? 'var(--pink-primary)' : 'white',
                  textDecoration: isClient ? 'underline' : 'none',
                  textUnderlineOffset: '2px',
                  maxWidth: '75px',
                  margin: '0 auto'
                }}>
                  {item[labelKey].split(' ')[0]}
                </div>
                <div style={{ color: 'var(--pink-primary)', fontWeight: '950', fontSize: '12px', marginTop: '2px' }}>{scoreKey(item)}</div>
                <div style={{ fontSize: '7px', fontWeight: '800', opacity: 0.4, letterSpacing: '0.3px', textTransform: 'uppercase' }}>{scoreLabel}</div>
                
                {/* Visual Podium Base */}
                <div style={{ 
                  width: '100%', 
                  height: isFirst ? '40px' : isSecond ? '25px' : '15px', 
                  background: 'linear-gradient(to top, rgba(196, 139, 159, 0.25), rgba(196, 139, 159, 0.08))',
                  borderRadius: '6px 6px 0 0',
                  marginTop: '8px',
                  border: '1px solid rgba(196, 139, 159, 0.25)',
                  borderBottom: 'none'
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MobileDashboard;

