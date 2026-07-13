import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users, Clock, Calendar, Sparkles, RefreshCw,
  Flower2, Plus, Star, ChevronRight,
  Percent, Scissors, DollarSign, Activity, Award,
  Bell, ChevronDown, Package, UserPlus, BellRing, X
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler, ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler, ArcElement
);

const FALLBACK_APPOINTMENTS = [
  { time: '9:00 AM', client: 'Isabella Rodríguez', service: 'Pestañas Clásicas', status: 'Confirmada', initial: 'I' },
  { time: '11:00 AM', client: 'Valentina García', service: 'Diseño de Cejas', status: 'Confirmada', initial: 'V' },
  { time: '1:00 PM', client: 'Mariana Sánchez', service: 'Lifting de Pestañas', status: 'Pendiente', initial: 'M' },
  { time: '3:30 PM', client: 'Andrea López', service: 'Efecto Híbrido', status: 'Confirmada', initial: 'A' },
];

const TOP_SPECIALISTS = [
  { name: 'Isabella Rodríguez', role: 'Estilista Senior', earnings: 2450, initial: 'I' },
  { name: 'Valeria Martínez', role: 'Nail Artist', earnings: 1980, initial: 'V' },
  { name: 'Camila Pérez', role: 'Lash Expert', earnings: 1560, initial: 'C' },
  { name: 'Sofía Alonso', role: 'Esteticista', earnings: 1250, initial: 'S' },
];


const DashboardModule = ({
  isMobile, isTablet, onOpenSale, stats, chartData,
  dbData, rates, onNavigate, onOpenNotifications
}) => {
  const { user } = useAuth();
  const carouselRef = useRef(null);
  const [ntfPerm, setNtfPerm] = useState(() => {
    try { return Notification?.permission || 'default'; } catch { return 'default'; }
  });
  const [showNtfBanner, setShowNtfBanner] = useState(true);

  const [activeServiceIndex, setActiveServiceIndex] = useState(0);

  const SERVICES_LIST = [
    { name: 'Ext. de Pestañas', price: 'Desde $50', img: '/foto_pestanas.png' },
    { name: 'Nail Art / Uñas', price: 'Desde $45', img: '/unas_foto.png' },
    { name: 'Diseño de Cejas', price: 'Desde $35', img: '/cejas_foto.png' },
    { name: 'Corte de Cabello', price: 'Desde $25', img: '/corte_cabello_foto.jpg' },
    { name: 'Peinado y Maquillaje', price: 'Desde $60', img: '/peinado_maquillaje.png', position: 'top center' },
    { name: 'Depilación Láser', price: 'Desde $40', img: '/depilacion_laser_foto.jpg' }
  ];

  const handleServiceScroll = (e) => {
    const container = e.target;
    const scrollLeft = container.scrollLeft;
    const cardWidth = 214;
    const index = Math.round(scrollLeft / cardWidth);
    setActiveServiceIndex(Math.min(index, SERVICES_LIST.length - 1));
  };

  const requestNtfPermission = async () => {
    try {
      if (!('Notification' in window)) {
        alert('Tu navegador no soporta notificaciones.');
        return;
      }
      const res = await Notification.requestPermission();
      setNtfPerm(res);
      if (res === 'granted' || res === 'denied') {
        setTimeout(() => setShowNtfBanner(false), 2000);
      }
    } catch (err) {
      console.error('Notification permission error:', err);
    }
  };

  useEffect(() => {
    if (!isMobile) return;
    const container = carouselRef.current;
    if (!container) return;
    
    let intervalId;
    const startScroll = () => {
      intervalId = setInterval(() => {
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (container.scrollLeft >= maxScroll - 10) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container.scrollBy({ left: 162, behavior: 'smooth' });
        }
      }, 3000);
    };

    startScroll();
    return () => clearInterval(intervalId);
  }, [isMobile]);


  const formatBs = (amount) => {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(amount);
  };

  // Status color helper for appointments
  const getStatusStyle = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('confirm') || s.includes('completado')) {
      return { bg: '#dcf5e7', text: '#1a7a4c', border: '#1a7a4c', icon: '✓' };
    }
    if (s.includes('pend') || s.includes('espera')) {
      return { bg: '#fff3cd', text: '#b8860b', border: '#b8860b', icon: '◷' };
    }
    return { bg: '#e8e8ec', text: '#555', border: '#999', icon: '•' };
  };

  // Extract upcoming appointments from dynamic data or fallback to mockup list
  const upcomingAppointments = useMemo(() => {
    let list = [];
    if (dbData?.appointments && dbData.appointments.length > 0) {
      // Map and sort upcoming appointments
      list = dbData.appointments
        .filter(apt => apt.status !== 'Completado' && apt.status !== 'Cancelado')
        .slice()
        .sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0))
        .map(apt => {
          const clientName = apt.clients?.name || 'Cliente';
          const timeString = apt.scheduled_at
            ? new Date(apt.scheduled_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
            : 'S/Hora';
          return {
            time: timeString,
            client: clientName,
            service: apt.services?.name || 'Servicio de Belleza',
            status: apt.status || 'Confirmada',
            initial: clientName.charAt(0).toUpperCase()
          };
        });
    } else {
      list = FALLBACK_APPOINTMENTS;
    }
    return list.slice(0, 4);
  }, [dbData]);

  // Dynamic calculations for premium operational widgets
  const dynamicStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Today's appointments
    const todayAppts = dbData?.appointments?.filter(a => a.scheduled_at?.startsWith(todayStr)) || [];
    
    // Today's income
    const todayTransactions = dbData?.transactions?.filter(t => t.created_at?.startsWith(todayStr) && t.type === 'income') || [];
    const yesterdayTransactions = dbData?.transactions?.filter(t => t.created_at?.startsWith(yesterdayStr) && t.type === 'income') || [];
    
    const todayIncomeVal = todayTransactions.reduce((acc, t) => acc + Number(t.amount), 0);
    const yesterdayIncomeVal = yesterdayTransactions.reduce((acc, t) => acc + Number(t.amount), 0);

    let incomeDiffPct = 0;
    if (yesterdayIncomeVal > 0) {
      incomeDiffPct = Math.round(((todayIncomeVal - yesterdayIncomeVal) / yesterdayIncomeVal) * 100);
    } else if (todayIncomeVal > 0) {
      incomeDiffPct = 100;
    }

    // New clients today
    const todayClients = dbData?.clients?.filter(c => c.created_at?.startsWith(todayStr)) || [];
    const yesterdayClients = dbData?.clients?.filter(c => c.created_at?.startsWith(yesterdayStr)) || [];

    const newClientsTodayCount = todayClients.length;
    const yesterdayClientsCount = yesterdayClients.length;
    
    let clientsDiffPct = 0;
    if (yesterdayClientsCount > 0) {
      clientsDiffPct = Math.round(((newClientsTodayCount - yesterdayClientsCount) / yesterdayClientsCount) * 100);
    } else if (newClientsTodayCount > 0) {
      clientsDiffPct = 100;
    }

    // Most reserved service today
    const serviceCounts = {};
    todayAppts.forEach(apt => {
      const serviceName = apt.services?.name || 'Servicio';
      serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
    });
    
    let mostReservedService = 'Ninguno';
    let mostReservedCount = 0;
    Object.entries(serviceCounts).forEach(([name, count]) => {
      if (count > mostReservedCount) {
        mostReservedCount = count;
        mostReservedService = name;
      }
    });

    if (mostReservedCount === 0 && dbData?.services?.length > 0) {
      mostReservedService = dbData.services[0]?.name || 'Pestañas';
      mostReservedCount = 0;
    }

    // Occupancy
    const activeStaffToday = dbData?.staff?.length || 1;
    const maxCapacity = activeStaffToday * 4;
    const occupancyRate = maxCapacity > 0 ? Math.min(Math.round((todayAppts.length / maxCapacity) * 100), 100) : 0;

    return {
      todayIncome: todayIncomeVal > 0 ? todayIncomeVal : (stats?.income || 135),
      incomeDiffPct: incomeDiffPct || 12,
      newClients: newClientsTodayCount > 0 ? newClientsTodayCount : 4,
      clientsDiffPct: clientsDiffPct || 25,
      mostReservedService,
      mostReservedCount: mostReservedCount > 0 ? mostReservedCount : (todayAppts.length || 5),
      occupancy: occupancyRate > 0 ? occupancyRate : 78,
      activeStaff: activeStaffToday
    };
  }, [dbData, stats]);


  // Chart configuration to look like mockup (pink minimalist line chart)
  const mainChartData = useMemo(() => {
    const hasData = chartData?.datasets?.[0]?.data?.some(v => v > 0);
    const dataPoints = hasData ? chartData.datasets[0].data : [700, 1200, 950, 1500, 1254, 1800, 2100];
    
    return {
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      datasets: [{
        label: 'Ingresos',
        data: dataPoints,
        borderColor: '#a0506a',
        borderWidth: 2,
        pointBackgroundColor: '#a0506a',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        backgroundColor: (ctx) => {
          const canvas = ctx.chart.ctx;
          const gradient = canvas.createLinearGradient(0, 0, 0, 120);
          gradient.addColorStop(0, 'rgba(160, 80, 106, 0.12)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
          return gradient;
        },
        tension: 0.4
      }]
    };
  }, [chartData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#4a3036',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        padding: 8,
        borderRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context) => `Ingresos: $${formatBs(context.parsed.y)}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#a0506a', font: { size: 9, weight: '600' } },
        border: { display: false }
      },
      y: {
        grid: { color: 'rgba(212, 160, 154, 0.1)', drawBorder: false },
        ticks: {
          color: '#a0506a',
          font: { size: 9, weight: '500' },
          callback: (value) => `Bs. ${value}`
        },
        border: { display: false },
        min: 0
      }
    }
  };

  const servicesDonutData = {
    labels: ['Extensiones', 'Coloración', 'Uñas Acrílicas', 'Trat. Faciales', 'Otros'],
    datasets: [{
      data: [35, 25, 20, 12, 8],
      backgroundColor: ['#c48b9f', '#a0506a', '#d4a09a', '#e8c4be', '#fbcada'],
      borderWidth: 0, borderRadius: 3, spacing: 2
    }]
  };

  const donutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#4a3036', titleColor: '#fff', bodyColor: '#fff',
        padding: 10, cornerRadius: 8,
      }
    }
  };


  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        animation: 'fadeIn 0.35s ease',
        paddingBottom: '100px'
      }}>
        {/* Custom Premium Header */}
        <div style={{
          display: 'flex',
          justifyItems: 'stretch',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 4px 4px 4px',
          width: '100%'
        }}>
          {/* Circular JANA Studio Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '1px solid rgba(212, 160, 154, 0.25)',
              boxShadow: '0 2px 10px rgba(201, 114, 130, 0.08)',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img src="/logo.webp" alt="Logo" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
            </div>
          </div>

          {/* Right Notification & Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Bell Icon with Red badge */}
            <div 
              style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              onClick={() => onOpenNotifications?.()}
            >
              <Bell size={24} style={{ color: '#4a3036' }} />
              <div style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#c97282',
                color: '#ffffff',
                fontSize: '0.62rem',
                fontWeight: '700',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #ffffff'
              }}>
                3
              </div>
            </div>

            {/* Exchange Rates */}
            {rates && rates.usdt > 0 && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 10px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(212,160,154,0.12)'
                }}>
                  <span style={{ fontSize: '0.62rem', color: '#a0909a', fontWeight: '600' }}>BCV</span>
                  <span style={{ fontSize: '0.82rem', color: '#2d1b22', fontWeight: '800' }}>Bs. {rates.bcv?.toFixed(2)}</span>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 10px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(212,160,154,0.12)'
                }}>
                  <span style={{ fontSize: '0.62rem', color: '#a0909a', fontWeight: '600' }}>USDT</span>
                  <span style={{ fontSize: '0.82rem', color: '#c97282', fontWeight: '800' }}>Bs. {rates.usdt?.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notification Activation Banner - Light Pink (matches desktop) */}
        {ntfPerm !== 'granted' && showNtfBanner && (
          <div
            onClick={() => {
              if (!('Notification' in window)) {
                alert('Tu navegador no soporta notificaciones.');
                return;
              }
              Notification.requestPermission().then(res => {
                setNtfPerm(res);
              });
            }}
            style={{
              width: '100%',
              borderRadius: '20px',
              padding: '0',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(201, 114, 130, 0.08)',
              background: 'linear-gradient(135deg, #fdf2f4 0%, #fce8ec 100%)',
              border: '1px solid rgba(201, 114, 130, 0.12)',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '14px',
                background: 'rgba(201, 114, 130, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <BellRing size={20} style={{ color: '#c97282' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: '0.78rem', fontWeight: '700', color: '#5a3a36',
                  display: 'block', lineHeight: '1.2', }}>
                  Activa las alertas
                </span>
                <span style={{
                  fontSize: '0.62rem', color: '#9e7f7b',
                  display: 'block', marginTop: '2px', lineHeight: '1.3'
                }}>
                  Recibe avisos al instante
                </span>
              </div>
              <span className="mi-btn" style={{
                padding: '6px 14px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #c97282, #a0506a)',
                color: '#fff', fontSize: '0.68rem', fontWeight: '700',
                border: 'none', flexShrink: 0
              }}>
                Activar
              </span>
            </div>
          </div>
        )}

        {/* Welcome Back Card */}
        <div style={{
          width: '100%',
          borderRadius: '24px',
          border: '1px solid rgba(201, 114, 130, 0.15)',
          padding: '20px 24px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          minHeight: '180px',
          boxShadow: '0 4px 20px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)'
        }}>
          {/* Full Background Image */}
          <div style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 0
          }}>
            <img 
              src="/salon_banner_full.png" 
              alt="Salon Background" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'left center',
                display: 'block'
              }}
              onError={(e) => {
                e.target.src = '/salon_desk.png';
              }}
            />
          </div>

          {/* Left info column overlay */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px', 
            zIndex: 2, 
            maxWidth: '75%',
            position: 'relative'
          }}>
            <h2 style={{
              fontSize: '1.35rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: '1.2'
            }}>
              Bienvenida de <br /> nuevo, Jana <span style={{ color: '#c97282' }}>♡</span>
            </h2>
            <p style={{
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
              fontWeight: '500',
              lineHeight: '1.4',
              margin: '2px 0 6px 0'
            }}>
              Aquí tienes un resumen <br /> de tu estudio hoy.
            </p>
            <button
              onClick={() => onOpenSale()}
              className="mi-btn"
              style={{
                alignSelf: 'flex-start',
                padding: '8px 16px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #c97282 0%, #a0506a 100%)',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(201, 114, 130, 0.25), inset 0 1px 1px rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
            >
              <Plus size={14} /> Nueva cita
            </button>
          </div>
        </div>
        {/* Stats Grid 2x2 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px', width: '100%' }}>
            {/* Card 1: Citas del día */}
            <div className="mi-stat mi-enter-up mi-delay-0" style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)',
              backdropFilter: 'blur(16px)',
              borderRadius: '20px',
              border: '1px solid rgba(201, 114, 130, 0.12)',
              padding: '12px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)',
              minHeight: '94px',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #fdf3f4 0%, #fce8ec 100%)',
                border: '1px solid rgba(160, 80, 106, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a0506a',
                flexShrink: 0
              }}>
                <Calendar size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>Citas del día</span>
                <span style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', margin: '1px 0' }}>
                  {stats?.appointments || 12}
                </span>
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {upcomingAppointments && upcomingAppointments.length > 0 
                    ? `Sig: ${upcomingAppointments[0].time}` 
                    : "Sin citas"}
                </span>
              </div>
            </div>

            {/* Card 2: Nuevas clientes */}
            <div className="mi-stat mi-enter-up mi-delay-1" style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)',
              backdropFilter: 'blur(16px)',
              borderRadius: '20px',
              border: '1px solid rgba(201, 114, 130, 0.12)',
              padding: '12px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)',
              minHeight: '94px',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #fdf3f4 0%, #fce8ec 100%)',
                border: '1px solid rgba(160, 80, 106, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a0506a',
                flexShrink: 0
              }}>
                <UserPlus size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>Nuevas clientes</span>
                <span style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', margin: '1px 0' }}>
                  {dynamicStats.newClients}
                </span>
                <span style={{ fontSize: '0.55rem', color: dynamicStats.clientsDiffPct >= 0 ? '#22c55e' : '#ef4444', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  {dynamicStats.clientsDiffPct >= 0 ? '↑' : '↓'} {Math.abs(dynamicStats.clientsDiffPct)}% <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>vs ayer</span>
                </span>
              </div>
            </div>

            {/* Card 3: Más reservado */}
            <div className="mi-stat mi-enter-up mi-delay-2" style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)',
              backdropFilter: 'blur(16px)',
              borderRadius: '20px',
              border: '1px solid rgba(201, 114, 130, 0.12)',
              padding: '12px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)',
              minHeight: '94px',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #fdf3f4 0%, #fce8ec 100%)',
                border: '1px solid rgba(160, 80, 106, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a0506a',
                flexShrink: 0
              }}>
                <Sparkles size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>Más reservado</span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  color: 'var(--text-primary)',
                  margin: '2px 0',
                  lineHeight: '1.15'
                }}>
                  {dynamicStats.mostReservedService}
                </span>
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: '500', whiteSpace: 'nowrap' }}>
                  {dynamicStats.mostReservedCount} citas hoy
                </span>
              </div>
            </div>

            {/* Card 4: Ocupación del equipo */}
            <div className="mi-stat mi-enter-up mi-delay-3" style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)',
              backdropFilter: 'blur(16px)',
              borderRadius: '20px',
              border: '1px solid rgba(201, 114, 130, 0.12)',
              padding: '12px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)',
              minHeight: '94px',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #fdf3f4 0%, #fce8ec 100%)',
                border: '1px solid rgba(160, 80, 106, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a0506a',
                flexShrink: 0
              }}>
                <Users size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>Ocupación</span>
                <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#c97282', margin: '1px 0' }}>{dynamicStats.occupancy}%</span>
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {dynamicStats.activeStaff} estilistas activas
                </span>
              </div>
          </div>
        </div>

          {/* Divider + Mini Reportes */}
          <div className="mi-card mi-enter-up mi-delay-4" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)',
            backdropFilter: 'blur(16px)',
            borderRadius: '20px',
            border: '1px solid rgba(201, 114, 130, 0.12)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 4px 20px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 className="mi-section-header" style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                Reportes
              </h4>
              <span onClick={() => onNavigate('reports')} style={{ fontSize: '0.7rem', color: '#c97282', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                Ver todo <ChevronRight size={12} />
              </span>
            </div>
            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>$12.840</span>
            <span style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: '600' }}>
              ↑ 18% <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>vs mes anterior</span>
            </span>
            {/* Mini sparkline CSS bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '32px', marginTop: '4px' }}>
              {[35, 55, 42, 68, 52, 78, 90].map((h, i) => (
                <div key={i} style={{
                  flex: 1,
                  height: `${h}%`,
                  borderRadius: '3px',
                  background: i === 6 
                    ? 'linear-gradient(180deg, #c97282, #a0506a)' 
                    : 'rgba(201, 114, 130, 0.2)',
                  transition: 'height 0.3s ease'
                }} />
              ))}
            </div>
          </div>

        {/* Agenda de hoy Timeline Card */}
        <div className="mi-card mi-enter-up mi-delay-5" style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)',
          backdropFilter: 'blur(16px)',
          borderRadius: '24px',
          border: '1px solid rgba(201, 114, 130, 0.12)',
          padding: '20px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 4px 20px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="mi-section-header" style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              margin: 0
            }}>
              Agenda de hoy
            </h3>
            <div 
              onClick={() => onNavigate('scheduling')}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#c97282', fontWeight: '600', cursor: 'pointer' }}
            >
              Ver calendario <Calendar size={13} style={{ marginLeft: '2px' }} />
            </div>
          </div>

          {/* Timeline entries */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

            {upcomingAppointments.length === 0 ? (
              <div style={{
                padding: '24px 0',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: '500'
              }}>
                No hay más citas programadas para hoy.
              </div>
            ) : (
              upcomingAppointments.map((apt, idx) => {
                const sStyle = getStatusStyle(apt.status);
                const isNext = idx === 0;
                return (
                  <div key={idx} className="mi-row" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px',
                    borderRadius: '14px',
                    background: isNext ? 'rgba(201, 114, 130, 0.06)' : 'transparent',
                    border: isNext ? '1px solid rgba(201, 114, 130, 0.18)' : '1px solid transparent'
                  }}>
                    {/* Time chip — the first, most scannable thing in an agenda */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '64px',
                      padding: '6px 2px',
                      borderRadius: '10px',
                      background: isNext ? 'rgba(201, 114, 130, 0.14)' : '#faf3f2',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '800', color: isNext ? '#a0506a' : 'var(--text-primary)', lineHeight: 1.15, whiteSpace: 'nowrap' }}>
                        {apt.time}
                      </span>
                      {isNext && (
                        <span style={{ fontSize: '0.5rem', fontWeight: '800', color: '#c97282', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>
                          Siguiente
                        </span>
                      )}
                    </div>

                    {/* Avatar — ring color reflects appointment status */}
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'var(--pink-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      flexShrink: 0,
                      border: `2px solid ${sStyle.border}`,
                      boxShadow: '0 0 0 2px #ffffff'
                    }}>
                      {apt.initial}
                    </div>

                    {/* Client (primary) + service & status (secondary) */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {apt.client}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: '500', marginTop: '2px', lineHeight: 1.3 }}>
                        {apt.service}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sStyle.text, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.64rem', fontWeight: '700', color: sStyle.text, whiteSpace: 'nowrap' }}>
                          {apt.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Servicios */}
        <div className="mi-card mi-enter-up mi-delay-6" style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)',
          backdropFilter: 'blur(16px)',
          borderRadius: '24px',
          border: '1px solid rgba(201, 114, 130, 0.12)',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="mi-section-header" style={{
              fontSize: '0.9rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              margin: 0
            }}>
              Top servicios
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#c97282', fontWeight: '600', cursor: 'pointer' }}>
              Este mes <ChevronDown size={12} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
            {/* Progress Bars as Clickable Cards */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
              {[
                { name: 'Extensiones de pestañas', value: 42, icon: Sparkles },
                { name: 'Laminado de cejas', value: 24, icon: Star },
                { name: 'Set híbrido', value: 18, icon: Flower2 },
                { name: 'Nail Art / Manicura', value: 16, icon: Scissors }
              ].map((serv, idx) => {
                const IconComp = serv.icon;
                return (
                  <div 
                    key={idx} 
                    onClick={() => onNavigate('services')}
                    className="mi-row"
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '4px',
                      background: '#faf3f2',
                      padding: '8px 10px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: '1px solid rgba(212, 160, 154, 0.08)'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f5e8e6'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#faf3f2'; e.currentTarget.style.transform = 'none' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)', fontWeight: '600' }}>
                        <IconComp size={12} style={{ color: '#c97282' }} />
                        <span>{serv.name}</span>
                      </div>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>{serv.value}%</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: '#f5e9e7', overflow: 'hidden' }}>
                      <div style={{ width: `${serv.value}%`, height: '100%', background: '#c97282', borderRadius: '2px' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right side graphic card */}
            <div 
              onClick={() => onNavigate('services')}
              style={{
                width: '120px',
                borderRadius: '18px',
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid rgba(212, 160, 154, 0.15)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none' }}
            >
              <img 
                src="/foto_pestanas.png" 
                alt="Extensiones de pestañas" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(74, 48, 54, 0.85) 0%, rgba(74, 48, 54, 0.1) 60%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '8px 10px'
              }}>
                <span style={{ fontSize: '0.62rem', fontWeight: '700', color: '#ffffff' }}>Ext. de pestañas</span>
                <span style={{ fontSize: '0.52rem', color: '#fae8e5' }}>Desde $50</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Especialistas */}
        <div className="mi-card mi-enter-up mi-delay-7" style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)',
          backdropFilter: 'blur(16px)',
          borderRadius: '24px',
          border: '1px solid rgba(201, 114, 130, 0.12)',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="mi-section-header" style={{
              fontSize: '0.9rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              margin: 0
            }}>
              Top Especialistas
            </h3>
            <div 
              onClick={() => onNavigate('personnel')}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#c97282', fontWeight: '600', cursor: 'pointer' }}
            >
              Ver todo <ChevronRight size={12} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {TOP_SPECIALISTS.slice(0, 3).map((spec, idx) => {
              return (
                <div 
                  key={idx} 
                  onClick={() => onNavigate('personnel')}
                  className="mi-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 0',
                    borderBottom: idx < 2 ? '1px solid rgba(201, 114, 130, 0.08)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {/* Rank badge */}
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    background: idx === 0 ? 'linear-gradient(135deg, #c97282, #a0506a)' : 'transparent',
                    border: idx === 0 ? 'none' : '2px solid rgba(201,114,130,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: idx === 0 ? '#fff' : '#a0506a' }}>#{idx + 1}</span>
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #c97282, #a0506a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0
                  }}>{spec.initial}</div>

                  {/* Name + role */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem', lineHeight: 1.3 }}>{spec.name}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{spec.role}</div>
                  </div>

                  {/* Earnings */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, color: '#a0506a', fontSize: '0.82rem' }}>${formatBs(spec.earnings)}</div>
                    <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>ingresos</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Servicios Destacados Gallery */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 className="mi-section-header" style={{
            fontSize: '0.95rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            margin: '6px 0 0 0'
          }}>
            Servicios destacados
          </h3>
          <div 
            ref={carouselRef}
            onScroll={handleServiceScroll}
            className="no-scrollbar" 
            style={{
              display: 'flex',
              gap: '14px',
              overflowX: 'auto',
              width: '100%',
              paddingBottom: '12px',
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth',
              scrollSnapType: 'x mandatory'
            }}
          >
            {SERVICES_LIST.map((serv, idx) => (
              <div 
                key={idx} 
                onClick={() => onNavigate('services')}
                className="mi-card"
                style={{
                  flexShrink: 0,
                  width: '200px',
                  height: '140px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid rgba(201, 114, 130, 0.12)',
                  boxShadow: '0 8px 24px rgba(201, 114, 130, 0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  scrollSnapAlign: 'start'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(201, 114, 130, 0.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(201, 114, 130, 0.06)' }}
              >
                <img 
                  src={serv.img} 
                  alt={serv.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: serv.position || 'center' }} 
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(74, 48, 54, 0.85) 0%, rgba(74, 48, 54, 0.02) 65%)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '12px 16px'
                }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#ffffff' }}>{serv.name}</span>
                  <span style={{ fontSize: '0.62rem', color: '#fae8e5' }}>{serv.price}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Scroll indicators */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
            {SERVICES_LIST.map((_, idx) => (
              <div 
                key={idx} 
                style={{
                  width: activeServiceIndex === idx ? '20px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  background: activeServiceIndex === idx ? '#c97282' : 'rgba(201, 114, 130, 0.25)',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.35s ease', paddingBottom: '40px' }}>

      {/* Notification Activation Banner - Desktop */}
      {ntfPerm !== 'granted' && showNtfBanner && (
        <div style={{
          width: '100%',
          borderRadius: '16px',
          padding: '14px 18px',
          background: 'rgba(253, 237, 240, 0.8)',
          border: '1px solid rgba(201, 114, 130, 0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'rgba(201, 114, 130, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <BellRing size={20} style={{ color: '#c97282' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#c97282', display: 'block', lineHeight: '1.2' }}>
              Activa las alertas de tu CRM
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px', lineHeight: '1.3' }}>
              Recibe notificaciones al instante cuando haya nuevas citas y actualizaciones.
            </span>
          </div>
          <button
            className="mi-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (!('Notification' in window)) {
                alert('Tu navegador no soporta notificaciones.');
                return;
              }
              Notification.requestPermission().then(res => {
                setNtfPerm(res);
                if (res === 'granted' || res === 'denied') {
                  setTimeout(() => setShowNtfBanner(false), 2000);
                }
              }).catch(() => {});
            }}
            style={{
              padding: '8px 18px', borderRadius: '10px',
              border: '1.5px solid #c97282',
              background: 'transparent',
              color: '#c97282', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer',
              flexShrink: 0, transition: 'all 0.2s ease', whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#c97282'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#c97282'; }}
          >
            Activar
          </button>
          <button
            onClick={() => setShowNtfBanner(false)}
            style={{
              width: '28px', height: '28px', borderRadius: '8px',
              border: 'none', background: 'transparent',
              color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201, 114, 130, 0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── HERO BANNER ── */}
      <div className="mi-card mi-enter-up mi-delay-0" style={{
        borderRadius: '28px',
        position: 'relative',
        overflow: 'hidden',
        height: '220px',
        border: '1px solid rgba(201, 114, 130, 0.15)',
        boxShadow: '0 8px 32px rgba(201, 114, 130, 0.08), inset 0 1px 1px rgba(255,255,255,0.9)',
        background: '#faf3f2'
      }}>
        <img
          src="/salon_banner_full.png"
          alt="Jana Studio"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left 35%' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(252,249,248,0.97) 0%, rgba(253,243,244,0.88) 45%, rgba(251,230,235,0.2) 80%)',
          borderRadius: '28px', zIndex: 1
        }} />
        <div className="dashboard-hero-text" style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '10px', padding: '36px 48px', height: '100%', justifyContent: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.25rem, 2.2vw, 1.9rem)', fontWeight: '700', color: 'var(--text-primary)', margin: 0, lineHeight: '1.2', textWrap: 'balance' }}>
            Bienvenida de nuevo, {(!user || user.role?.toLowerCase().includes('admin')) ? 'Jana' : (user.name?.split(' ')[0] || 'Jana')} <span style={{ color: '#c97282' }}>♡</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500', margin: 0, lineHeight: 1.5, textWrap: 'balance' }}>
            Aquí tienes un resumen de tu estudio hoy.
          </p>
          <button
            className="mi-btn mi-enter-pop"
            onClick={() => onNavigate('scheduling')}
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 22px', borderRadius: '12px', background: 'linear-gradient(135deg, #c97282 0%, #a0506a 100%)', color: '#ffffff', fontSize: '0.82rem', fontWeight: '600', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(201, 114, 130, 0.35), inset 0 1px 1px rgba(255,255,255,0.15)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(201, 114, 130, 0.45), inset 0 1px 1px rgba(255,255,255,0.2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(201, 114, 130, 0.35), inset 0 1px 1px rgba(255,255,255,0.15)' }}
          >
            <Plus size={15} strokeWidth={2.5} /> Nueva Cita
          </button>
        </div>
      </div>

      {/* ── ACCIONES RÁPIDAS ── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {[
          { label: 'Nueva cita', icon: Calendar, action: () => onNavigate('scheduling'), color: '#c97282' },
          { label: 'Cobrar', icon: DollarSign, action: () => onOpenSale(), color: '#a0506a' },
          { label: 'Buscar cliente', icon: Users, action: () => onNavigate('clients'), color: '#ba82a0' },
          { label: 'Inventario', icon: Package, action: () => onNavigate('inventory'), color: '#c99482' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={item.action}
              className="mi-btn mi-enter-pop"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', borderRadius: '14px',
                border: '1px solid rgba(201, 114, 130, 0.15)',
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(8px)',
                color: 'var(--text-primary)',
                cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(201, 114, 130, 0.04)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${item.color}15`; e.currentTarget.style.borderColor = `${item.color}40`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(201, 114, 130, 0.15)'; e.currentTarget.style.transform = 'none'; }}
            >
              <Icon size={16} style={{ color: item.color }} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ── WIDGETS OPERATIVOS ── */}
      <div className="dashboard-kpi-row">
        {/* Card 1: Citas del día */}
        <div className="mi-stat mi-enter-up mi-delay-1" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)', backdropFilter: 'blur(16px)', borderRadius: '22px', border: '1px solid rgba(201, 114, 130, 0.12)', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 16px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)', transition: 'all 0.3s ease' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'linear-gradient(135deg, #fdf3f4 0%, #fce8ec 100%)', border: '1px solid rgba(160, 80, 106, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0506a', flexShrink: 0 }}>
            <Calendar size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>Citas del día</span>
            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>{upcomingAppointments.length > 0 ? upcomingAppointments.length : (stats?.appointments || 12)}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {upcomingAppointments.length > 0 ? `Sig: ${upcomingAppointments[0].time}` : 'Sin citas próximas'}
            </span>
          </div>
        </div>

        {/* Card 2: Nuevas clientes */}
        <div className="mi-stat mi-enter-up mi-delay-2" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)', backdropFilter: 'blur(16px)', borderRadius: '22px', border: '1px solid rgba(201, 114, 130, 0.12)', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 16px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)', transition: 'all 0.3s ease' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'linear-gradient(135deg, #fdf3f4 0%, #fce8ec 100%)', border: '1px solid rgba(160, 80, 106, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0506a', flexShrink: 0 }}>
            <UserPlus size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>Nuevas clientes</span>
            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>{dynamicStats.newClients}</span>
            <span style={{ fontSize: '0.65rem', color: dynamicStats.clientsDiffPct >= 0 ? '#22c55e' : '#ef4444', fontWeight: '600', whiteSpace: 'nowrap' }}>
              {dynamicStats.clientsDiffPct >= 0 ? '↑' : '↓'} {Math.abs(dynamicStats.clientsDiffPct)}% <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>vs ayer</span>
            </span>
          </div>
        </div>

        {/* Card 4: Más reservado */}
        <div className="mi-stat mi-enter-up mi-delay-3" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)', backdropFilter: 'blur(16px)', borderRadius: '22px', border: '1px solid rgba(201, 114, 130, 0.12)', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 16px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)', transition: 'all 0.3s ease' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'linear-gradient(135deg, #fdf3f4 0%, #fce8ec 100%)', border: '1px solid rgba(160, 80, 106, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0506a', flexShrink: 0 }}>
            <Sparkles size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>Más reservado</span>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.2 }}>{dynamicStats.mostReservedService}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '500', whiteSpace: 'nowrap' }}>{dynamicStats.mostReservedCount} citas hoy</span>
          </div>
        </div>
        {/* Card 5: Ocupación del equipo */}
        <div className="mi-stat mi-enter-up mi-delay-4" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)', backdropFilter: 'blur(16px)', borderRadius: '22px', border: '1px solid rgba(201, 114, 130, 0.12)', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 16px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)', transition: 'all 0.3s ease' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'linear-gradient(135deg, #fdf3f4 0%, #fce8ec 100%)', border: '1px solid rgba(160, 80, 106, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0506a', flexShrink: 0 }}>
            <Activity size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: '4px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>Ocupación</span>
            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: '#c97282', lineHeight: 1 }}>{dynamicStats.occupancy}%</span>
            <div style={{ height: '4px', borderRadius: '3px', background: '#f5e9e7', overflow: 'hidden' }}>
              <div style={{ width: `${dynamicStats.occupancy}%`, height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #c97282, #a0506a)', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ROW: Agenda + Top Servicios + Top Especialistas (ALINEACIÓN STRETCH) ── */}
      <div className="dashboard-main-row">

        {/* AGENDA DE HOY */}
        <div className="mi-card mi-enter-up mi-delay-5" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)', backdropFilter: 'blur(16px)', borderRadius: '22px', border: '1px solid rgba(201, 114, 130, 0.12)', padding: '24px', boxShadow: '0 4px 16px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="mi-section-header" style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                Agenda de hoy
              </h3>
              <span onClick={() => onNavigate('scheduling')} style={{ fontSize: '0.75rem', color: '#c97282', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Ver calendario <ChevronRight size={14} />
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {upcomingAppointments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  <Clock size={28} style={{ marginBottom: '8px', opacity: 0.3 }} />
                  <div>No hay citas programadas para hoy</div>
                </div>
              ) : upcomingAppointments.map((apt, idx) => {
                const sStyle = getStatusStyle(apt.status);
                const isNext = idx === 0;
                return (
                  <div key={idx} className="mi-row" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px',
                    borderRadius: '14px',
                    background: isNext ? 'rgba(201, 114, 130, 0.06)' : 'transparent',
                    border: isNext ? '1px solid rgba(201, 114, 130, 0.18)' : '1px solid transparent'
                  }}>
                    {/* Time chip */}
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      width: '64px', padding: '6px 2px', borderRadius: '10px', flexShrink: 0,
                      background: isNext ? 'rgba(201, 114, 130, 0.14)' : '#faf3f2'
                    }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: '800', color: isNext ? '#a0506a' : 'var(--text-primary)', lineHeight: 1.15, whiteSpace: 'nowrap' }}>{apt.time}</span>
                      {isNext && (
                        <span style={{ fontSize: '0.5rem', fontWeight: '800', color: '#c97282', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>Siguiente</span>
                      )}
                    </div>

                    {/* Avatar — ring color reflects status */}
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--pink-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: '700', fontSize: '0.9rem', flexShrink: 0, border: `2px solid ${sStyle.border}`, boxShadow: '0 0 0 2px #ffffff' }}>
                      {apt.initial}
                    </div>

                    {/* Client (primary) + service & status (secondary) */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: 1.3 }}>{apt.client}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.3, marginTop: '2px' }}>{apt.service}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sStyle.text, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.66rem', fontWeight: '700', color: sStyle.text, whiteSpace: 'nowrap' }}>{apt.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            className="mi-btn"
            onClick={() => onNavigate('scheduling')}
            style={{ width: '100%', padding: '12px 0', borderRadius: '12px', background: 'linear-gradient(135deg, #c97282 0%, #a0506a 100%)', color: '#ffffff', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(201, 114, 130, 0.3), inset 0 1px 1px rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s', marginTop: 'auto' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(201, 114, 130, 0.35)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(201, 114, 130, 0.25)' }}
          >
            <Plus size={16} /> Nueva cita
          </button>
        </div>

        {/* TOP SERVICIOS */}
        <div className="mi-card mi-enter-up mi-delay-6" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)', backdropFilter: 'blur(16px)', borderRadius: '22px', border: '1px solid rgba(201, 114, 130, 0.12)', padding: '24px', boxShadow: '0 4px 16px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="mi-section-header" style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              Top servicios
            </h3>
            <span onClick={() => onNavigate('services')} style={{ fontSize: '0.75rem', color: '#c97282', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Ver todo <ChevronRight size={14} />
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            {[
              { name: 'Pestañas clásicas', value: 42, icon: Sparkles },
              { name: 'Laminado cejas', value: 24, icon: Star },
              { name: 'Set híbrido', value: 18, icon: Flower2 },
              { name: 'Manicura', value: 16, icon: Scissors }
            ].map((serv, idx) => {
              const IconComp = serv.icon;
              return (
                <div
                  key={idx}
                  onClick={() => onNavigate('services')}
                  className="mi-row"
                  style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#faf3f2', padding: '6px 12px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid rgba(212, 160, 154, 0.08)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f5e8e6'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#faf3f2'; e.currentTarget.style.transform = 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: '600' }}>
                      <IconComp size={13} style={{ color: '#c97282' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{serv.name}</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>{serv.value}%</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: '#f5e9e7', overflow: 'hidden' }}>
                    <div style={{ width: `${serv.value}%`, height: '100%', background: 'linear-gradient(90deg, #c97282, #a0506a)', borderRadius: '2px' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Photo banner directly below progress bars */}
          <div
            onClick={() => onNavigate('services')}
            className="dashboard-featured-photo"
            style={{
              width: '100%',
              borderRadius: '20px',
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
              background: 'linear-gradient(140deg, #a0506a 0%, #964a63 30%, #8a4560 60%, #7a3f55 100%)',
              boxShadow: '0 10px 30px rgba(160, 80, 106, 0.25), 0 4px 12px rgba(112, 48, 80, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.005)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(160, 80, 106, 0.35), 0 6px 16px rgba(112, 48, 80, 0.2), inset 0 1px 0 rgba(255,255,255,0.15)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(160, 80, 106, 0.25), 0 4px 12px rgba(112, 48, 80, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)' }}
          >
            {/* Peinado y maquillaje photo placed on the right with a fixed width on desktop */}
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: isMobile ? '45%' : '240px', zIndex: 1 }}>
              <img 
                src="/peinado_maquillaje.png" 
                alt="Adicional de Ondas" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', filter: 'saturate(1.05)' }}
              />
              {/* Minimal fade — only on the left edge where photo meets text container */}
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                background: 'linear-gradient(to right, #964a63 0%, rgba(150, 74, 99, 0.4) 15%, transparent 40%)' 
              }} />
              {/* Subtle warm overlay on photo */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(201, 114, 130, 0.05) 0%, rgba(122, 58, 78, 0.08) 100%)',
                mixBlendMode: 'soft-light'
              }} />
            </div>

            {/* Content area on the left, takes up the remaining width */}
            <div style={{ 
              position: 'relative', 
              zIndex: 2, 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              padding: '16px 22px', 
              width: isMobile ? '55%' : 'calc(100% - 240px)', 
              color: '#ffffff' 
            }}>
              {/* Glassmorphism badge */}
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '5px', 
                backgroundColor: 'rgba(255, 255, 255, 0.12)', 
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '4px 10px', 
                borderRadius: '20px', 
                fontSize: '8.5px', 
                fontWeight: '800', 
                textTransform: 'uppercase', 
                letterSpacing: '0.8px',
                width: 'fit-content',
                marginBottom: '10px',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)'
              }}>
                <span style={{ fontSize: '10px' }}>🔥</span> Más reservado
              </div>
              <h4 style={{ 
                fontSize: '16px', 
                fontWeight: '800', 
                margin: 0, 
                color: '#ffffff', 
                lineHeight: '1.15',
                textShadow: '0 1px 3px rgba(0,0,0,0.15)'
              }}>
                Adicional de Ondas
              </h4>
              <span style={{ 
                fontSize: '11.5px', 
                color: '#fbcada', 
                fontWeight: '600',
                marginTop: '2px',
                letterSpacing: '0.3px'
              }}>
                (Sirena o Sueltas)
              </span>
              <span style={{ 
                fontSize: '11px', 
                color: '#ffffff', 
                fontWeight: '700',
                marginTop: '10px',
                opacity: 0.95,
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  fontSize: '9px'
                }}>📅</span>
                5 citas hoy
              </span>
            </div>
          </div>
        </div>

        {/* TOP ESPECIALISTAS */}
        <div className="mi-card mi-enter-up mi-delay-7" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)', backdropFilter: 'blur(16px)', borderRadius: '22px', border: '1px solid rgba(201, 114, 130, 0.12)', padding: '22px', boxShadow: '0 4px 16px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)', display: 'flex', flexDirection: 'column', gap: '0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 className="mi-section-header" style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Top especialistas</h3>
            <span onClick={() => onNavigate('personnel')} style={{ fontSize: '0.75rem', color: '#c97282', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Ver todo <ChevronRight size={13} />
            </span>
          </div>

          {/* Specialists list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {TOP_SPECIALISTS.slice(0, 3).map((spec, idx) => {
              const maxEarnings = TOP_SPECIALISTS[0]?.earnings || 1;
              return (
                <div key={idx} className="mi-row" style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 0',
                  borderBottom: idx < 2 ? '1px solid rgba(201,114,130,0.08)' : 'none'
                }}>
                  {/* Rank badge */}
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    background: idx === 0 ? 'linear-gradient(135deg, #c97282, #a0506a)' : 'transparent',
                    border: idx === 0 ? 'none' : '2px solid rgba(201,114,130,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: idx === 0 ? '#fff' : '#a0506a' }}>#{idx + 1}</span>
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #c97282, #a0506a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0
                  }}>{spec.initial}</div>

                  {/* Name + role */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem', lineHeight: 1.3 }}>{spec.name}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{spec.role}</div>
                  </div>

                  {/* Earnings */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, color: '#a0506a', fontSize: '0.82rem' }}>${formatBs(spec.earnings)}</div>
                    <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>ingresos</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* REPORTES */}
        <div className="mi-card mi-enter-up mi-delay-8" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)', backdropFilter: 'blur(16px)', borderRadius: '22px', border: '1px solid rgba(201, 114, 130, 0.12)', padding: '22px', boxShadow: '0 4px 16px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)', display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 className="mi-section-header" style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Reportes</h4>
            <span onClick={() => onNavigate('reports')} style={{ fontSize: '0.75rem', color: '#c97282', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Ver todo <ChevronRight size={13} />
            </span>
          </div>
          <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>$12.840</span>
          <span style={{ fontSize: '0.68rem', color: '#22c55e', fontWeight: '600' }}>
            ↑ 18% <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>vs mes anterior</span>
          </span>
          <div style={{ height: '90px', width: '100%', position: 'relative', marginTop: '4px' }}>
            <Line
              data={{
                labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                datasets: [{
                  data: [800, 1200, 950, 1400, 1100, 1600, 1800],
                  borderColor: '#a0506a',
                  borderWidth: 2,
                  pointBackgroundColor: '#a0506a',
                  pointBorderColor: '#ffffff',
                  pointBorderWidth: 2,
                  pointRadius: 3,
                  pointHoverRadius: 5,
                  fill: true,
                  backgroundColor: 'rgba(160, 80, 106, 0.06)',
                  tension: 0.4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { color: '#a0506a', font: { size: 8, weight: '600' } }, border: { display: false } },
                  y: { display: false, min: 0 }
                }
              }}
            />
          </div>
        </div>

      </div>

      {/* ── SERVICIOS DESTACADOS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="mi-section-header" style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Servicios destacados
          </h3>
          <span onClick={() => onNavigate('services')} style={{ fontSize: '0.75rem', color: '#c97282', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Ver todos <ChevronRight size={13} />
          </span>
        </div>
        <div className="dashboard-services-row">
          {SERVICES_LIST.map((serv, idx) => (
            <div
              key={idx}
              onClick={() => onNavigate('services')}
              className="mi-card"
              style={{ height: '160px', borderRadius: '22px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(201, 114, 130, 0.12)', boxShadow: '0 6px 20px rgba(201, 114, 130, 0.06)', cursor: 'pointer', transition: 'all 0.25s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(201, 114, 130, 0.12)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(201, 114, 130, 0.06)' }}
            >
              <img src={serv.img} alt={serv.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: serv.position || 'center' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(74, 48, 54, 0.85) 0%, rgba(74, 48, 54, 0.02) 65%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '12px 14px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#ffffff' }}>{serv.name}</span>
                <span style={{ fontSize: '0.65rem', color: '#fae8e5' }}>{serv.price}</span>
              </div>
            </div>
            ))}
        </div>
      </div>

    </div>
  );
};

export default DashboardModule;
