import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users, Clock, Calendar, Sparkles, RefreshCw,
  Flower2, Plus, Star, ChevronRight,
  Percent, Scissors, DollarSign, Activity, Award,
  Bell, ChevronDown, ShoppingBag, MessageSquare, UserPlus, BellRing, X
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

  const requestNtfPermission = async () => {
    try {
      if (!('Notification' in window)) {
        alert('Tu navegador no soporta notificaciones.');
        return;
      }
      const res = await Notification.requestPermission();
      setNtfPerm(res);
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
          label: (context) => `Ingresos: Bs. ${formatBs(context.parsed.y)}`
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

        {/* Notification Activation Banner - only when needed */}
        {ntfPerm !== 'granted' && (
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
              boxShadow: '0 6px 24px rgba(201, 114, 130, 0.15)',
              background: 'linear-gradient(135deg, #c97282, #a0506a, #8a4560)',
              backgroundSize: '200% 200%',
              animation: 'ntfBannerPulse 3s ease-in-out infinite',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(201, 114, 130, 0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(201, 114, 130, 0.15)'; }}
          >
            <style>{`
              @keyframes ntfBannerPulse { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
              @keyframes ntfBellRing { 0%, 100% { transform: rotate(0deg); } 15% { transform: rotate(14deg); } 30% { transform: rotate(-12deg); } 45% { transform: rotate(8deg); } 60% { transform: rotate(-6deg); } 75% { transform: rotate(2deg); } }
            `}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', position: 'relative', zIndex: 1 }}>
              {/* Animated bell icon */}
              <div style={{
                width: '48px', height: '48px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                animation: 'ntfBellRing 2s ease-in-out infinite'
              }}>
                <BellRing size={24} style={{ color: '#fff' }} />
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: '0.82rem', fontWeight: '800', color: '#ffffff',
                  display: 'block', lineHeight: '1.2', fontFamily: "'Playfair Display', Georgia, serif"
                }}>
                  Activa las alertas
                </span>
                <span style={{
                  fontSize: '0.65rem', color: 'rgba(255,255,255,0.75)',
                  display: 'block', marginTop: '3px', lineHeight: '1.3'
                }}>
                  Recibe avisos al instante como un WhatsApp
                </span>
              </div>

              {/* Arrow */}
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <ChevronRight size={16} style={{ color: '#fff' }} />
              </div>
            </div>

            {/* Decorative circles */}
            <div style={{
              position: 'absolute', top: '-20px', right: '-20px',
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            }} />
            <div style={{
              position: 'absolute', bottom: '-30px', left: '-15px',
              width: '60px', height: '60px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
            }} />
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
              fontFamily: "'Playfair Display', Georgia, serif",
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
            {/* Card 1: Citas del día */}
            <div style={{
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
            <div style={{
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
            <div style={{
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
                  display: 'block', 
                  lineHeight: '1.15',
                  wordBreak: 'break-word'
                }}>
                  {dynamicStats.mostReservedService}
                </span>
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: '500', whiteSpace: 'nowrap' }}>
                  {dynamicStats.mostReservedCount} citas hoy
                </span>
              </div>
            </div>

            {/* Card 4: Ocupación del equipo */}
            <div style={{
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
          <div style={{
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
              <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', fontFamily: "'Playfair Display', Georgia, serif", margin: 0 }}>
                Reportes
              </h4>
              <span onClick={() => onNavigate('reports')} style={{ fontSize: '0.7rem', color: '#c97282', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                Ver todo <ChevronRight size={12} />
              </span>
            </div>
            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)' }}>Bs. 12.840</span>
            <span style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: '600' }}>
              ↑ 18% <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>vs mes anterior</span>
            </span>
            <div style={{ height: '90px', width: '100%', position: 'relative' }}>
              <Line
                data={{
                  labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                  datasets: [{
                    data: [800, 1200, 950, 1400, 1100, 1600, 1800],
                    borderColor: '#c97282',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#c97282',
                    pointBorderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: true,
                    backgroundColor: (ctx) => {
                      const gradient = ctx.chart?.ctx?.createLinearGradient(0, 0, 0, 90);
                      if (gradient) {
                        gradient.addColorStop(0, 'rgba(201, 114, 130, 0.25)');
                        gradient.addColorStop(1, 'rgba(201, 114, 130, 0.02)');
                      }
                      return gradient || 'rgba(201, 114, 130, 0.15)';
                    },
                    tension: 0.4
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: { enabled: false } },
                  scales: {
                    x: { grid: { display: false }, ticks: { color: '#a0506a', font: { size: 9, weight: '600' } }, border: { display: false } },
                    y: { display: false, min: 0 }
                  }
                }}
              />
            </div>
          </div>

        {/* Agenda de hoy Timeline Card */}
        <div style={{
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
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              fontFamily: "'Playfair Display', Georgia, serif",
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
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '8px' }}>

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
              upcomingAppointments.map((apt, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  gap: '10px',
                  marginBottom: idx < upcomingAppointments.length - 1 ? '12px' : '0',
                  position: 'relative',
                  paddingBottom: idx < upcomingAppointments.length - 1 ? '12px' : '0',
                  borderBottom: idx < upcomingAppointments.length - 1 ? '1px solid rgba(212, 160, 154, 0.12)' : 'none'
                }}>
                  {/* Custom dot */}
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#c97282',
                    border: '2px solid #ffffff',
                    boxShadow: '0 0 0 2px rgba(201, 114, 130, 0.25)',
                    zIndex: 2,
                    marginLeft: '-4px',
                    marginTop: '6px',
                    flexShrink: 0
                  }} />

                  {/* Clock Time */}
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    width: '62px',
                    flexShrink: 0,
                    paddingTop: '2px'
                  }}>
                    {apt.time}
                  </span>

                  {/* Avatar */}
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'var(--pink-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.75rem',
                    flexShrink: 0
                  }}>
                    {apt.initial}
                  </div>

                  {/* Details: service + client + badge stacked */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      lineHeight: '1.2'
                    }}>
                      {apt.service}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        {apt.client}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '2px' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        background: getStatusStyle(apt.status).bg,
                        color: getStatusStyle(apt.status).text,
                        border: `1.5px solid ${getStatusStyle(apt.status).border}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: getStatusStyle(apt.status).text,
                          display: 'inline-block',
                          flexShrink: 0
                        }} />
                        {apt.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{
            fontSize: '0.9rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            fontFamily: "'Playfair Display', Georgia, serif",
            margin: '4px 0 0 0'
          }}>
            Acciones rápidas
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {/* Nueva Cita */}
            <div 
              onClick={() => onOpenSale()}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <div style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '16px',
                background: '#fdf2f3',
                border: '1px solid rgba(160, 80, 106, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a0506a',
                boxShadow: '0 4px 12px rgba(201, 114, 130, 0.04)'
              }}>
                <Calendar size={22} />
              </div>
              <span style={{ fontSize: '0.62rem', fontWeight: '600', color: 'var(--text-primary)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                Nueva cita
              </span>
            </div>

            {/* Agregar Clienta */}
            <div 
              onClick={() => onNavigate('clients')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <div style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '16px',
                background: '#fdf2f3',
                border: '1px solid rgba(160, 80, 106, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a0506a',
                boxShadow: '0 4px 12px rgba(201, 114, 130, 0.04)'
              }}>
                <UserPlus size={22} />
              </div>
              <span style={{ fontSize: '0.62rem', fontWeight: '600', color: 'var(--text-primary)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                Agregar clienta
              </span>
            </div>

            {/* Punto de venta */}
            <div 
              onClick={() => onNavigate('checkout')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <div style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '16px',
                background: '#fdf2f3',
                border: '1px solid rgba(160, 80, 106, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a0506a',
                boxShadow: '0 4px 12px rgba(201, 114, 130, 0.04)'
              }}>
                <ShoppingBag size={22} />
              </div>
              <span style={{ fontSize: '0.62rem', fontWeight: '600', color: 'var(--text-primary)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                Punto de venta
              </span>
            </div>

            {/* Enviar mensaje */}
            <div 
              onClick={() => {}}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <div style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '16px',
                background: '#fdf2f3',
                border: '1px solid rgba(160, 80, 106, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a0506a',
                boxShadow: '0 4px 12px rgba(201, 114, 130, 0.04)'
              }}>
                <MessageSquare size={22} />
              </div>
              <span style={{ fontSize: '0.62rem', fontWeight: '600', color: 'var(--text-primary)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                Enviar mensaje
              </span>
            </div>
          </div>
        </div>

        {/* Top Servicios */}
        <div style={{
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
            <h3 style={{
              fontSize: '0.9rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              fontFamily: "'Playfair Display', Georgia, serif",
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
        <div style={{
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
            <h3 style={{
              fontSize: '0.9rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              fontFamily: "'Playfair Display', Georgia, serif",
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {TOP_SPECIALISTS.slice(0, 3).map((spec, idx) => {
              const medals = ['🥇', '🥈', '🥉'];
              const maxEarnings = TOP_SPECIALISTS[0]?.earnings || 1;
              const barPct = Math.round((spec.earnings / maxEarnings) * 100);
              const isFirst = idx === 0;
              return (
                <div 
                  key={idx} 
                  onClick={() => onNavigate('personnel')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '14px',
                    background: isFirst
                      ? 'linear-gradient(135deg, rgba(201,114,130,0.1) 0%, rgba(160,80,106,0.06) 100%)'
                      : 'rgba(250, 243, 242, 0.6)',
                    border: isFirst
                      ? '1px solid rgba(201, 114, 130, 0.2)'
                      : '1px solid rgba(212, 160, 154, 0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none' }}
                >
                  {/* Rank medal */}
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: isFirst ? 'linear-gradient(135deg, #c97282, #a0506a)' : '#f5e9e7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isFirst ? '9px' : '12px',
                    flexShrink: 0, boxShadow: isFirst ? '0 3px 8px rgba(160,80,106,0.3)' : 'none'
                  }}>
                    {isFirst
                      ? <span style={{ color: '#fff', fontWeight: 800, fontSize: '9px' }}>#{idx + 1}</span>
                      : <span>{medals[idx]}</span>
                    }
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #c97282, #a0506a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(160,80,106,0.25)'
                  }}>{spec.initial}</div>

                  {/* Name + role + bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spec.name}</div>
                    <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{spec.role}</div>
                    <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(212,160,154,0.2)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${barPct}%`, height: '100%', borderRadius: '2px',
                        background: isFirst ? 'linear-gradient(90deg, #c97282, #a0506a)' : 'rgba(201,114,130,0.45)',
                        transition: 'width 0.6s ease'
                      }} />
                    </div>
                  </div>

                  {/* Earnings */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, color: isFirst ? '#a0506a' : 'var(--text-primary)', fontSize: '0.75rem' }}>Bs. {formatBs(spec.earnings)}</div>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '1px' }}>ingresos</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Servicios Destacados Gallery */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{
            fontSize: '0.95rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            fontFamily: "'Playfair Display', Georgia, serif",
            margin: '6px 0 0 0'
          }}>
            Servicios destacados
          </h3>
          <div 
            ref={carouselRef}
            className="no-scrollbar" 
            style={{
              display: 'flex',
              gap: '14px',
              overflowX: 'auto',
              width: '100%',
              paddingBottom: '12px',
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth'
            }}
          >
            {[
              { name: 'Ext. de Pestañas', price: 'Desde $50', img: '/foto_pestanas.png' },
              { name: 'Nail Art / Uñas', price: 'Desde $45', img: '/unas_foto.png' },
              { name: 'Diseño de Cejas', price: 'Desde $35', img: '/cejas_foto.png' },
              { name: 'Corte de Cabello', price: 'Desde $25', img: '/corte_cabello_foto.jpg' },
              { name: 'Peinado y Maquillaje', price: 'Desde $60', img: '/peinado_maquillaje.png', position: 'top center' },
              { name: 'Depilación Láser', price: 'Desde $40', img: '/depilacion_laser_foto.jpg' }
            ].map((serv, idx) => (
              <div 
                key={idx} 
                onClick={() => onNavigate('services')}
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
                  transition: 'all 0.25s ease'
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
        </div>
      </div>
    );
  }


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.35s ease', paddingBottom: '40px' }}>

      {/* Notification Activation Banner - Desktop */}
      {ntfPerm !== 'granted' && (
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
            onClick={(e) => {
              e.stopPropagation();
              if (!('Notification' in window)) {
                alert('Tu navegador no soporta notificaciones.');
                return;
              }
              Notification.requestPermission().then(res => {
                setNtfPerm(res);
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
            onClick={() => setNtfPerm('granted')}
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
      <div style={{
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
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '45%', padding: '36px 48px', height: '100%', justifyContent: 'center' }}>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.9rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, lineHeight: '1.2' }}>
            Bienvenida de nuevo, {(!user || user.role?.toLowerCase().includes('admin')) ? 'Jana' : (user.name?.split(' ')[0] || 'Jana')} <span style={{ color: '#c97282' }}>♡</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500', margin: 0, lineHeight: 1.5 }}>
            Aquí tienes un resumen de tu estudio hoy.
          </p>
          <button
            onClick={() => onNavigate('scheduling')}
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 22px', borderRadius: '12px', background: 'linear-gradient(135deg, #c97282 0%, #a0506a 100%)', color: '#ffffff', fontSize: '0.82rem', fontWeight: '600', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(201, 114, 130, 0.35), inset 0 1px 1px rgba(255,255,255,0.15)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(201, 114, 130, 0.45), inset 0 1px 1px rgba(255,255,255,0.2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(201, 114, 130, 0.35), inset 0 1px 1px rgba(255,255,255,0.15)' }}
          >
            <Plus size={15} strokeWidth={2.5} /> Nueva Cita
          </button>
        </div>
      </div>

      {/* ── WIDGETS OPERATIVOS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {/* Card 1: Citas del día */}
        <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)', backdropFilter: 'blur(16px)', borderRadius: '22px', border: '1px solid rgba(201, 114, 130, 0.12)', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 16px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)', transition: 'all 0.3s ease' }}>
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
        <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)', backdropFilter: 'blur(16px)', borderRadius: '22px', border: '1px solid rgba(201, 114, 130, 0.12)', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 16px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)', transition: 'all 0.3s ease' }}>
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
        <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)', backdropFilter: 'blur(16px)', borderRadius: '22px', border: '1px solid rgba(201, 114, 130, 0.12)', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 16px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)', transition: 'all 0.3s ease' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'linear-gradient(135deg, #fdf3f4 0%, #fce8ec 100%)', border: '1px solid rgba(160, 80, 106, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0506a', flexShrink: 0 }}>
            <Sparkles size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>Más reservado</span>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.2, wordBreak: 'break-word' }}>{dynamicStats.mostReservedService}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '500', whiteSpace: 'nowrap' }}>{dynamicStats.mostReservedCount} citas hoy</span>
          </div>
        </div>
        {/* Card 5: Ocupación del equipo */}
        <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(253,243,244,0.85) 100%)', backdropFilter: 'blur(16px)', borderRadius: '22px', border: '1px solid rgba(201, 114, 130, 0.12)', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 16px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)', transition: 'all 0.3s ease' }}>
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

      {/* ── MAIN CONTENT ROW: Agenda + Top Servicios + Top Especialistas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', alignItems: 'start' }}>

        {/* AGENDA DE HOY */}
        <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid rgba(201, 114, 130, 0.1)', padding: '22px', boxShadow: '0 2px 12px rgba(201, 114, 130, 0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Agenda de hoy</h3>
            <span onClick={() => onNavigate('scheduling')} style={{ fontSize: '0.75rem', color: '#c97282', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Ver calendario <ChevronRight size={13} />
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Timeline line */}
            <div style={{ position: 'absolute', left: '72px', top: '8px', bottom: '8px', width: '2px', background: 'linear-gradient(180deg, rgba(201,114,130,0.3) 0%, rgba(201,114,130,0.1) 100%)', zIndex: 0 }} />

            {upcomingAppointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <Clock size={28} style={{ marginBottom: '8px', opacity: 0.3 }} />
                <div>No hay citas programadas para hoy</div>
              </div>
            ) : upcomingAppointments.map((apt, idx) => {
              const sStyle = getStatusStyle(apt.status);
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0', padding: '12px 0', position: 'relative', zIndex: 1 }}>
                  {/* Time */}
                  <span style={{ width: '68px', fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-muted)', textAlign: 'right', paddingRight: '14px', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {apt.time}
                  </span>

                  {/* Dot */}
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#c97282', border: '2px solid #fff', boxShadow: '0 0 0 2px rgba(201,114,130,0.2)', flexShrink: 0, zIndex: 2 }} />

                  {/* Content */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '14px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #c97282, #a0506a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '0.75rem', flexShrink: 0 }}>
                      {apt.initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.client}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.service}</div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '700', background: sStyle.bg, color: sStyle.text, border: `1px solid ${sStyle.border}`, flexShrink: 0, whiteSpace: 'nowrap' }}>{apt.status}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => onNavigate('scheduling')}
            style={{ width: '100%', padding: '10px 0', borderRadius: '12px', background: 'transparent', color: '#c97282', border: '1.5px dashed rgba(201,114,130,0.35)', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,114,130,0.04)'; e.currentTarget.style.borderColor = 'rgba(201,114,130,0.5)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(201,114,130,0.35)'; }}
          >
            <Plus size={15} /> Nueva cita
          </button>
        </div>

        {/* TOP SERVICIOS */}
        <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid rgba(201, 114, 130, 0.1)', padding: '22px', boxShadow: '0 2px 12px rgba(201, 114, 130, 0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Top servicios</h3>
            <span style={{ fontSize: '0.75rem', color: '#c97282', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Este mes <ChevronDown size={13} />
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
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
                  style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 0', borderBottom: idx < 3 ? '1px solid rgba(201,114,130,0.08)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.82rem' }}>
                      <IconComp size={14} style={{ color: '#c97282' }} />
                      <span>{serv.name}</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.82rem' }}>{serv.value}%</span>
                  </div>
                  <div style={{ width: '100%', height: '5px', borderRadius: '3px', background: '#fdf2f4', overflow: 'hidden' }}>
                    <div style={{ width: `${serv.value}%`, height: '100%', background: 'linear-gradient(90deg, #c97282, #a0506a)', borderRadius: '3px', transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Photo card: Más reservado */}
          <div
            onClick={() => onNavigate('services')}
            style={{
              width: '100%', borderRadius: '16px', overflow: 'hidden', position: 'relative',
              cursor: 'pointer', height: '160px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
          >
            <img src="/peinado_maquillaje.png" alt="Adicional de Ondas" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 15%' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(74, 48, 54, 0.8) 0%, rgba(74, 48, 54, 0.05) 55%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.55rem', fontWeight: '800', color: '#fbcada', textTransform: 'uppercase', letterSpacing: '1px' }}>Más reservado</span>
              <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#ffffff', fontFamily: "'Playfair Display', Georgia, serif" }}>Adicional de Ondas</span>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>(Sirena o Sueltas)</span>
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.8)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                📅 5 citas hoy
              </span>
            </div>
          </div>
        </div>

        {/* TOP ESPECIALISTAS + REPORTES */}
        <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid rgba(201, 114, 130, 0.1)', padding: '22px', boxShadow: '0 2px 12px rgba(201, 114, 130, 0.04)', display: 'flex', flexDirection: 'column', gap: '0' }}>
          {/* Top Especialistas header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Top especialistas</h3>
            <span onClick={() => onNavigate('personnel')} style={{ fontSize: '0.75rem', color: '#c97282', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Ver todo <ChevronRight size={13} />
            </span>
          </div>

          {/* Specialists list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {TOP_SPECIALISTS.slice(0, 3).map((spec, idx) => {
              const maxEarnings = TOP_SPECIALISTS[0]?.earnings || 1;
              return (
                <div key={idx} style={{
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
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spec.name}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{spec.role}</div>
                  </div>

                  {/* Earnings */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, color: '#a0506a', fontSize: '0.82rem' }}>Bs. {formatBs(spec.earnings)}</div>
                    <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>ingresos</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Divider + Reportes */}
          <div style={{ borderTop: '1px solid rgba(201, 114, 130, 0.1)', paddingTop: '16px', marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Reportes</h4>
              <span onClick={() => onNavigate('reports')} style={{ fontSize: '0.75rem', color: '#c97282', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Ver todo <ChevronRight size={13} />
              </span>
            </div>
            <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>Bs. 12.840</span>
            <span style={{ fontSize: '0.68rem', color: '#22c55e', fontWeight: '600' }}>
              ↑ 18% <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>vs mes anterior</span>
            </span>
            <div style={{ height: '60px', width: '100%', position: 'relative', marginTop: '4px' }}>
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

      </div>

      {/* ── SERVICIOS DESTACADOS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', fontFamily: "'Playfair Display', Georgia, serif", margin: 0 }}>
          Servicios destacados
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px' }}>
          {[
            { name: 'Ext. de Pestañas', price: 'Desde $50', img: '/foto_pestanas.png' },
            { name: 'Nail Art / Uñas', price: 'Desde $45', img: '/unas_foto.png' },
            { name: 'Diseño de Cejas', price: 'Desde $35', img: '/cejas_foto.png' },
            { name: 'Corte de Cabello', price: 'Desde $25', img: '/corte_cabello_foto.jpg' },
            { name: 'Peinado y Maquillaje', price: 'Desde $60', img: '/peinado_maquillaje.png', position: 'top center' },
            { name: 'Depilación Láser', price: 'Desde $40', img: '/depilacion_laser_foto.jpg' }
          ].map((serv, idx) => (
            <div
              key={idx}
              onClick={() => onNavigate('services')}
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
