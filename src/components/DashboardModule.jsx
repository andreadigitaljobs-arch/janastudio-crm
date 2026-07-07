import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users, Clock, Calendar, Sparkles, RefreshCw,
  Flower2, Plus, Star, ChevronRight,
  Percent, Scissors, DollarSign, Activity, Award,
  Bell, ChevronDown, ShoppingBag, MessageSquare, UserPlus
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
  { time: '9:00 AM', client: 'Isabella R.', service: 'Pestañas Clásicas', status: 'Confirmada', initial: 'I' },
  { time: '11:00 AM', client: 'Valentina G.', service: 'Diseño de Cejas', status: 'Confirmada', initial: 'V' },
  { time: '1:00 PM', client: 'Mariana S.', service: 'Lifting de Pestañas', status: 'Pendiente', initial: 'M' },
  { time: '3:30 PM', client: 'Andrea L.', service: 'Efecto Híbrido', status: 'Confirmada', initial: 'A' },
];

const TOP_SPECIALISTS = [
  { name: 'Isabella R.', role: 'Estilista Senior', earnings: 2450, initial: 'I' },
  { name: 'Valeria M.', role: 'Nail Artist', earnings: 1980, initial: 'V' },
  { name: 'Camila P.', role: 'Lash Expert', earnings: 1560, initial: 'C' },
  { name: 'Sofía A.', role: 'Esteticista', earnings: 1250, initial: 'S' },
];


const DashboardModule = ({
  isMobile, isTablet, onOpenSale, stats, chartData,
  dbData, rates, onNavigate
}) => {
  const { user } = useAuth();
  const carouselRef = useRef(null);

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
      return { bg: '#fbf0f2', text: '#a0506a', border: 'rgba(160, 80, 106, 0.15)' };
    }
    if (s.includes('pend') || s.includes('espera')) {
      return { bg: '#fdf6ed', text: '#c4935e', border: 'rgba(196, 147, 94, 0.15)' };
    }
    return { bg: '#f4f4f6', text: '#7a7a8a', border: 'rgba(122, 122, 138, 0.15)' };
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
              boxShadow: '0 2px 10px rgba(74, 48, 54, 0.05)',
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
              onClick={() => onNavigate('reports')}
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

            {/* Profile circular avatar & arrow dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '1px solid rgba(212, 160, 154, 0.2)'
              }}>
                <img 
                  src="/avatar.png" 
                  alt="Profile" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=60';
                  }}
                />
              </div>
              <ChevronDown size={14} style={{ color: '#4a3036' }} />
            </div>
          </div>
        </div>

        {/* Welcome Back Card */}
        <div style={{
          width: '100%',
          borderRadius: '24px',
          border: '1px solid rgba(212, 160, 154, 0.2)',
          padding: '20px 24px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          minHeight: '180px',
          boxShadow: '0 4px 20px rgba(74, 48, 54, 0.03)',
          background: '#faf3f2'
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
                background: '#c97282',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(201, 114, 130, 0.2)',
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
        {/* Stats Grid 2x2 + 1 Full Width */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          width: '100%'
        }}>
          {/* Card 1: Citas del día */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid rgba(212, 160, 154, 0.15)',
            padding: '12px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(74, 48, 54, 0.02)',
            minHeight: '94px'
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#fdf3f4',
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

          {/* Card 2: Ingresos hoy */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid rgba(212, 160, 154, 0.15)',
            padding: '12px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(74, 48, 54, 0.02)',
            minHeight: '94px'
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#fdf3f4',
              border: '1px solid rgba(160, 80, 106, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a0506a',
              flexShrink: 0
            }}>
              <DollarSign size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Ingresos hoy</span>
              <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-primary)', margin: '1px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {`Bs. ${formatBs(dynamicStats.todayIncome * (rates?.usd || 40)).split(',')[0]}`}
              </span>
              <span style={{ fontSize: '0.55rem', color: dynamicStats.incomeDiffPct >= 0 ? '#22c55e' : '#ef4444', fontWeight: '600', whiteSpace: 'nowrap' }}>
                {dynamicStats.incomeDiffPct >= 0 ? '↑' : '↓'} {Math.abs(dynamicStats.incomeDiffPct)}% <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>vs ayer</span>
              </span>
            </div>
          </div>

          {/* Card 3: Nuevas clientes */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid rgba(212, 160, 154, 0.15)',
            padding: '12px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(74, 48, 54, 0.02)',
            minHeight: '94px'
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#fdf3f4',
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

          {/* Card 4: Servicio más reservado */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid rgba(212, 160, 154, 0.15)',
            padding: '12px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(74, 48, 54, 0.02)',
            minHeight: '94px'
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: '#fdf3f4',
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

          {/* Card 5: Ocupación del equipo */}
          <div style={{
            gridColumn: 'span 2',
            background: '#ffffff',
            borderRadius: '20px',
            border: '1px solid rgba(212, 160, 154, 0.15)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(74, 48, 54, 0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: '#fdf3f4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#a0506a'
                }}>
                  <Users size={16} />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Ocupación del equipo</span>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-primary)' }}>{dynamicStats.occupancy}%</span>
            </div>
            {/* Progress Bar */}
            <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: '#f5e9e7', overflow: 'hidden' }}>
              <div style={{ width: `${dynamicStats.occupancy}%`, height: '100%', background: '#c97282', borderRadius: '4px' }} />
            </div>
            <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              {dynamicStats.activeStaff} estilistas activas hoy
            </span>
          </div>
        </div>

        {/* Agenda de hoy Timeline Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid rgba(212, 160, 154, 0.15)',
          padding: '20px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)'
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

          {/* Timeline points and entries */}
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '8px' }}>
            {/* Thread vertical line */}
            <div style={{
              position: 'absolute',
              left: '11px',
              top: '16px',
              bottom: '16px',
              width: '2px',
              background: 'rgba(212, 160, 154, 0.3)'
            }} />

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
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: idx < upcomingAppointments.length - 1 ? '16px' : '0',
                  position: 'relative'
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
                    flexShrink: 0
                  }} />

                  {/* Clock Time */}
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    width: '65px',
                    flexShrink: 0
                  }}>
                    {apt.time}
                  </span>

                  {/* Circular Initial Avatar */}
                  <div style={{
                    width: '32px',
                    height: '32px',
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

                  {/* Service Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {apt.service}
                    </h4>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                      {apt.client}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.6rem',
                    fontWeight: '700',
                    background: getStatusStyle(apt.status).bg,
                    color: getStatusStyle(apt.status).text,
                    border: `1px solid ${getStatusStyle(apt.status).border}`,
                    flexShrink: 0
                  }}>
                    {apt.status}
                  </span>
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
                boxShadow: '0 4px 12px rgba(74, 48, 54, 0.01)'
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
                boxShadow: '0 4px 12px rgba(74, 48, 54, 0.01)'
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
                boxShadow: '0 4px 12px rgba(74, 48, 54, 0.01)'
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
                boxShadow: '0 4px 12px rgba(74, 48, 54, 0.01)'
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
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid rgba(212, 160, 154, 0.15)',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(74, 48, 54, 0.02)'
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
                  border: '1px solid rgba(212, 160, 154, 0.15)',
                  boxShadow: '0 8px 24px rgba(74, 48, 54, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(74, 48, 54, 0.08)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(74, 48, 54, 0.04)' }}
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

      {/* ── HERO BANNER ── */}
      <div style={{
        borderRadius: '28px',
        position: 'relative',
        overflow: 'hidden',
        height: '220px',
        border: '1px solid rgba(212, 160, 154, 0.15)',
        boxShadow: '0 8px 32px rgba(74, 48, 54, 0.06)',
        background: '#faf3f2'
      }}>
        <img
          src="/salon_banner_full.png"
          alt="Jana Studio"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left center' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(252,249,248,0.97) 0%, rgba(252,249,248,0.82) 45%, rgba(252,249,248,0.0) 80%)',
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
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 22px', borderRadius: '12px', background: '#c97282', color: '#ffffff', fontSize: '0.82rem', fontWeight: '600', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(201, 114, 130, 0.3)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(201, 114, 130, 0.4)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(201, 114, 130, 0.3)' }}
          >
            <Plus size={15} strokeWidth={2.5} /> Nueva Cita
          </button>
        </div>
      </div>

      {/* ── WIDGETS OPERATIVOS 2x2 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {/* Card 1: Citas del día */}
        <div style={{ background: '#ffffff', borderRadius: '22px', border: '1px solid rgba(212, 160, 154, 0.15)', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 16px rgba(74, 48, 54, 0.04)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#fdf3f4', border: '1px solid rgba(160, 80, 106, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0506a', flexShrink: 0 }}>
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

        {/* Card 2: Ingresos hoy */}
        <div style={{ background: '#ffffff', borderRadius: '22px', border: '1px solid rgba(212, 160, 154, 0.15)', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 16px rgba(74, 48, 54, 0.04)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#fdf3f4', border: '1px solid rgba(160, 80, 106, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0506a', flexShrink: 0 }}>
            <DollarSign size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Ingresos hoy</span>
            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {`Bs. ${formatBs(dynamicStats.todayIncome * (rates?.usd || 40)).split(',')[0]}`}
            </span>
            <span style={{ fontSize: '0.65rem', color: dynamicStats.incomeDiffPct >= 0 ? '#22c55e' : '#ef4444', fontWeight: '600', whiteSpace: 'nowrap' }}>
              {dynamicStats.incomeDiffPct >= 0 ? '↑' : '↓'} {Math.abs(dynamicStats.incomeDiffPct)}% <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>vs ayer</span>
            </span>
          </div>
        </div>

        {/* Card 3: Nuevas clientes */}
        <div style={{ background: '#ffffff', borderRadius: '22px', border: '1px solid rgba(212, 160, 154, 0.15)', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 16px rgba(74, 48, 54, 0.04)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#fdf3f4', border: '1px solid rgba(160, 80, 106, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0506a', flexShrink: 0 }}>
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
        <div style={{ background: '#ffffff', borderRadius: '22px', border: '1px solid rgba(212, 160, 154, 0.15)', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 4px 16px rgba(74, 48, 54, 0.04)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#fdf3f4', border: '1px solid rgba(160, 80, 106, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0506a', flexShrink: 0 }}>
            <Sparkles size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>Más reservado</span>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.2, wordBreak: 'break-word' }}>{dynamicStats.mostReservedService}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '500', whiteSpace: 'nowrap' }}>{dynamicStats.mostReservedCount} citas hoy</span>
          </div>
        </div>
      </div>

      {/* ── OCUPACIÓN DEL EQUIPO ── */}
      <div style={{ background: '#ffffff', borderRadius: '22px', border: '1px solid rgba(212, 160, 154, 0.15)', padding: '20px 28px', boxShadow: '0 4px 16px rgba(74, 48, 54, 0.04)', display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#fdf3f4', border: '1px solid rgba(160, 80, 106, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0506a' }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Ocupación del equipo</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#c97282', lineHeight: 1 }}>{dynamicStats.occupancy}%</div>
          </div>
        </div>
        <div style={{ flex: 1, height: '10px', borderRadius: '6px', background: '#f5e9e7', overflow: 'hidden' }}>
          <div style={{ width: `${dynamicStats.occupancy}%`, height: '100%', borderRadius: '6px', background: 'linear-gradient(90deg, #c97282, #a0506a)', transition: 'width 0.6s ease' }} />
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500', flexShrink: 0 }}>{dynamicStats.activeStaff} estilistas activas hoy</span>
      </div>

      {/* ── MAIN CONTENT ROW: Agenda + Top Servicios (ALINEACIÓN STRETCH) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'stretch' }}>

        {/* AGENDA DE HOY */}
        <div style={{ background: '#ffffff', borderRadius: '22px', border: '1px solid rgba(212, 160, 154, 0.15)', padding: '24px', boxShadow: '0 4px 16px rgba(74, 48, 54, 0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', fontFamily: "'Playfair Display', Georgia, serif", margin: 0 }}>
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
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 12px', borderRadius: '14px', background: idx % 2 === 0 ? '#faf3f2' : 'transparent', transition: 'background 0.2s' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--pink-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: '700', fontSize: '0.9rem', flexShrink: 0 }}>
                      {apt.initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.client}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>{apt.service}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>{apt.time}</span>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '700', background: sStyle.bg, color: sStyle.text, border: `1px solid ${sStyle.border}` }}>{apt.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onNavigate('scheduling')}
            style={{ width: '100%', padding: '12px 0', borderRadius: '12px', background: '#c97282', color: '#ffffff', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(201, 114, 130, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s', marginTop: 'auto' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(201, 114, 130, 0.35)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(201, 114, 130, 0.25)' }}
          >
            <Plus size={16} /> Nueva cita
          </button>
        </div>

        {/* TOP SERVICIOS */}
        <div style={{ background: '#ffffff', borderRadius: '22px', border: '1px solid rgba(212, 160, 154, 0.15)', padding: '24px', boxShadow: '0 4px 16px rgba(74, 48, 54, 0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', fontFamily: "'Playfair Display', Georgia, serif", margin: 0 }}>
              Top servicios
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#c97282', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Este mes <ChevronDown size={14} />
            </span>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch', flex: 1 }}>
            {/* Progress bars */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
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
                    style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: '#faf3f2', padding: '10px 14px', borderRadius: '14px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid rgba(212, 160, 154, 0.08)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f5e8e6'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#faf3f2'; e.currentTarget.style.transform = 'none' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: '600' }}>
                        <IconComp size={14} style={{ color: '#c97282' }} />
                        <span>{serv.name}</span>
                      </div>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>{serv.value}%</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', borderRadius: '3px', background: '#f5e9e7', overflow: 'hidden' }}>
                      <div style={{ width: `${serv.value}%`, height: '100%', background: 'linear-gradient(90deg, #c97282, #a0506a)', borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right photo card */}
            <div
              onClick={() => onNavigate('services')}
              style={{ width: '140px', borderRadius: '20px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(212, 160, 154, 0.15)', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none' }}
            >
              <img src="/foto_pestanas.png" alt="Extensiones de pestañas" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(74, 48, 54, 0.85) 0%, rgba(74, 48, 54, 0.1) 60%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px 14px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#ffffff' }}>Ext. de pestañas</span>
                <span style={{ fontSize: '0.6rem', color: '#fae8e5' }}>Desde $50</span>
              </div>
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
              style={{ height: '160px', borderRadius: '22px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(212, 160, 154, 0.15)', boxShadow: '0 6px 20px rgba(74, 48, 54, 0.05)', cursor: 'pointer', transition: 'all 0.25s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(74, 48, 54, 0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(74, 48, 54, 0.05)' }}
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
