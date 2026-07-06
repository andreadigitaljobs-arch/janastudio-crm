import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Clock, Calendar, Sparkles, RefreshCw,
  Flower2, Plus, Star, ChevronRight,
  Percent, Scissors, DollarSign, Activity, Award
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
    return list.slice(0, 3);
  }, [dbData]);

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


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.35s ease', height: '100%' }}>
      
      {/* Asymmetric Desktop Layout: Left main column, Right sidebar panel */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', alignItems: 'stretch', flex: 1, minHeight: 0 }}>
        
        {/* Left Column: Banner, Stats grid, Bottom row */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
          
          {/* Main Hero Banner: draggable & zoomable background image */}
          <div className="wow-card wow-animate-1" style={{
            borderRadius: '24px',
            position: 'relative',
            overflow: 'hidden',
            flex: isMobile ? 'none' : '1',
            minHeight: isMobile ? '180px' : '0',
            border: '1px solid rgba(212, 160, 154, 0.15)',
            boxShadow: 'var(--shadow-card)',
            userSelect: 'none'
          }}>
            {/* Real background image with zoom and position controls */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                zIndex: 0
              }}
            >
              <img 
                src="/hero_banner.jpeg" 
                alt="Banner"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 46%',
                  transform: 'scale(1.05)',
                  pointerEvents: 'none'
                }}
                id="jana-hero-img"
              />
            </div>

            {/* Dark gradient overlay so text is readable */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, rgba(30,15,20,0.65) 0%, rgba(30,15,20,0.3) 60%, rgba(30,15,20,0.0) 100%)',
              borderRadius: '24px',
              zIndex: 1
            }} />

            {/* Left aligned text content */}
            <div style={{ 
              zIndex: 2, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '14px', 
              maxWidth: isMobile ? '100%' : '52%',
              padding: isMobile ? '28px 24px' : '40px 44px',
              position: 'relative',
              height: '100%',
              justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ 
                  fontFamily: "'Playfair Display', Georgia, serif", 
                  fontSize: isMobile ? '1.4rem' : '2rem', 
                  fontStyle: 'italic', 
                  color: '#ffffff',
                  lineHeight: '1.25',
                  textShadow: '0 2px 8px rgba(0,0,0,0.25)'
                }}>Eleva la belleza.</span>
                <span style={{ 
                  fontFamily: "'Playfair Display', Georgia, serif", 
                  fontSize: isMobile ? '1.4rem' : '2rem', 
                  fontStyle: 'italic',
                  color: '#f4d0d5',
                  lineHeight: '1.25',
                  textShadow: '0 2px 8px rgba(0,0,0,0.25)'
                }}>Empodera la confianza.</span>
              </div>
              <button 
                onClick={() => onNavigate('scheduling')}
                style={{
                  alignSelf: 'flex-start',
                  padding: '10px 22px',
                  borderRadius: '100px',
                  background: 'rgba(212, 140, 154, 0.85)',
                  backdropFilter: 'blur(6px)',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  border: '1px solid rgba(255,255,255,0.25)',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(190, 100, 125, 0.95)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(212, 140, 154, 0.85)'; e.currentTarget.style.transform = 'none' }}
              >
                Ver agenda de hoy
              </button>
            </div>
          </div>


          {/* Stats grid row */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
            gap: '10px'
          }}>
            {/* Stats Card: Clients */}
            <div className="glass-card wow-card wow-animate-2" style={{ 
              padding: '0',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              backgroundColor: '#ffffff',
              overflow: 'hidden',
              minHeight: '0',
              position: 'relative'
            }}>
              {/* Text side */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '18px 16px 18px 20px', gap: '4px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Clientes</span>
                <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>
                  {stats?.clients || dbData?.clients?.length || 248}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--magenta-secondary)', fontWeight: '600' }}>+18 nuevos este mes</span>
              </div>
              {/* Oval image placeholder — replace src when ready */}
              <div style={{
                width: '100px',
                flexShrink: 0,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 12px 10px 0'
              }}>
                <div className="wow-oval" style={{
                  width: '80px',
                  height: '110px',
                  borderRadius: '60px 60px 60px 60px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(160,80,106,0.12)',
                  background: 'linear-gradient(135deg, #fbcada 0%, #d4a09a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(212,160,154,0.3)'
                }}>
                  {/* Placeholder icon until user provides image */}
                  <Users size={32} color="rgba(255,255,255,0.9)" />
                </div>
              </div>
            </div>

            {/* Stats Card: Service Catalog */}
            <div className="glass-card wow-card wow-animate-2" style={{ 
              padding: '0',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              backgroundColor: '#ffffff',
              overflow: 'hidden',
              minHeight: '0',
              position: 'relative'
            }}>
              {/* Text side */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '18px 16px 18px 20px', gap: '4px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Catálogo de Servicios</span>
                <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>
                  {dbData?.services?.length || 24}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Más solicitado: Pestañas Clásicas</span>
              </div>
              {/* Oval image placeholder */}
              <div style={{
                width: '100px',
                flexShrink: 0,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 12px 10px 0'
              }}>
                <div className="wow-oval" style={{
                  width: '80px',
                  height: '110px',
                  borderRadius: '60px 60px 60px 60px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(160,80,106,0.12)',
                  background: 'linear-gradient(135deg, #dfb28c 0%, #d4a09a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(212,160,154,0.3)'
                }}>
                  <Scissors size={32} color="rgba(255,255,255,0.9)" />
                </div>
              </div>
            </div>

            {/* Stats Card: Team */}
            <div className="glass-card wow-card wow-animate-2" style={{ 
              padding: '0',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              backgroundColor: '#ffffff',
              overflow: 'hidden',
              minHeight: '0',
              position: 'relative'
            }}>
              {/* Text side */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '18px 16px 18px 20px', gap: '4px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Equipo</span>
                <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>
                  {dbData?.staff?.length || 6}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--magenta-secondary)', fontWeight: '600' }}>2 en turno hoy</span>
              </div>
              {/* Oval image placeholder */}
              <div style={{
                width: '100px',
                flexShrink: 0,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 12px 10px 0'
              }}>
                <div className="wow-oval" style={{
                  width: '80px',
                  height: '110px',
                  borderRadius: '60px 60px 60px 60px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(160,80,106,0.12)',
                  background: 'linear-gradient(135deg, #c97282 0%, #a0506a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(212,160,154,0.3)'
                }}>
                  <Sparkles size={32} color="rgba(255,255,255,0.9)" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Grid: Loyalty, Reports, Grow your studio */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
            gap: '10px',
            flex: '1',
            minHeight: 0
          }}>
            {/* Top Especialistas Card */}
            <div className="glass-card wow-card wow-animate-3" style={{ padding: '20px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '0', borderRadius: '20px', border: '1px solid rgba(212, 160, 154, 0.15)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>Top Especialistas</span>
                <span onClick={() => onNavigate('personnel')} style={{ fontSize: '0.72rem', color: 'var(--magenta-secondary)', fontWeight: '600', cursor: 'pointer' }}>Ver todo</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {TOP_SPECIALISTS.slice(0, 3).map((spec, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '4px 6px', borderRadius: '10px',
                    background: idx === 0 ? 'rgba(212, 160, 154, 0.08)' : 'transparent'
                  }}>
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      background: 'var(--pink-gradient)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 600, fontSize: '0.72rem', flexShrink: 0
                    }}>{spec.initial}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spec.name}</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spec.role}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.75rem' }}>Bs. {formatBs(spec.earnings)}</div>
                      <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>Ingresos</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reports Revenue card */}
            <div className="glass-card wow-card wow-animate-4" style={{ padding: '20px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '0', borderRadius: '20px', border: '1px solid rgba(212, 160, 154, 0.15)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>Reportes</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--magenta-secondary)', fontWeight: '600', cursor: 'pointer' }}>Ver todo</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Bs. {stats?.monthlyIncome ? formatBs(stats.monthlyIncome) : '12.840'}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  ↑ 18% <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>vs mes anterior</span>
                </span>
              </div>
              
              {/* Minimal Line chart */}
              <div style={{ height: '55px', width: '100%', marginTop: 'auto' }}>
                <Line data={mainChartData} options={chartOptions} />
              </div>
            </div>

            {/* Servicios Más Populares Card */}
            <div className="glass-card wow-card wow-animate-5" style={{ padding: '20px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '0', borderRadius: '20px', border: '1px solid rgba(212, 160, 154, 0.15)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>Servicios Populares</span>
                <span onClick={() => onNavigate('services')} style={{ fontSize: '0.72rem', color: 'var(--magenta-secondary)', fontWeight: '600', cursor: 'pointer' }}>Ver todo</span>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minHeight: 0 }}>
                {/* Donut chart */}
                <div style={{ height: '90px', width: '90px', position: 'relative', flexShrink: 0 }}>
                  <Doughnut data={servicesDonutData} options={donutOptions} />
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)', textAlign: 'center',
                    lineHeight: 1.1
                  }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>156</div>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 500 }}>Reservas</div>
                  </div>
                </div>
                
                {/* Legend list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflow: 'hidden' }}>
                  {servicesDonutData.labels.slice(0, 3).map((label, idx) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem' }}>
                      <div style={{
                        width: '6px', height: '6px', borderRadius: '2px',
                        background: servicesDonutData.datasets[0].backgroundColor[idx], flexShrink: 0
                      }} />
                      <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
                        {servicesDonutData.datasets[0].data[idx]}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar Panel: Upcoming Appointments */}
        <div className="glass-card wow-card wow-animate-3" style={{
          width: isMobile ? '100%' : '300px',
          flexShrink: 0,
          backgroundColor: '#ffffff',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '10px',
          borderRadius: '20px',
          border: '1px solid rgba(212, 160, 154, 0.15)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ 
                fontSize: '1.15rem', 
                fontWeight: '700', 
                color: 'var(--text-primary)', 
                fontFamily: "'Playfair Display', Georgia, serif",
                margin: 0
              }}>Próximas Citas</h3>
              <span 
                onClick={() => onNavigate('scheduling')}
                style={{ fontSize: '0.72rem', color: 'var(--magenta-secondary)', fontWeight: '600', cursor: 'pointer' }}
              >
                Ver todo
              </span>
            </div>

            {/* Appointments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflow: 'hidden' }}>
              {upcomingAppointments.map((apt, idx) => {
                const sStyle = getStatusStyle(apt.status);
                return (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 0',
                    borderBottom: idx < upcomingAppointments.length - 1 ? '1px solid rgba(212, 160, 154, 0.1)' : 'none',
                    flexShrink: 0
                  }}>
                    {/* User profile circular letter initials */}
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'var(--pink-gradient)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#ffffff', fontWeight: '700', fontSize: '0.8rem', flexShrink: 0
                    }}>
                      {apt.initial}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>{apt.time}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '20px', fontSize: '0.62rem',
                          fontWeight: '700', background: sStyle.bg, color: sStyle.text,
                          border: `1px solid ${sStyle.border}`, flexShrink: 0
                        }}>{apt.status}</span>
                      </div>
                      <div style={{ 
                        fontWeight: '700', 
                        color: 'var(--text-primary)', 
                        fontSize: '0.85rem', 
                        marginTop: '2px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}>
                        {apt.client}
                      </div>
                      <div style={{ 
                        fontSize: '0.72rem', 
                        color: 'var(--text-secondary)', 
                        marginTop: '1px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}>
                        {apt.service}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action button inside card bottom */}
          <button
            onClick={onOpenSale}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: '12px',
              background: 'var(--magenta-secondary)',
              color: '#ffffff',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(160, 80, 106, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(160, 80, 106, 0.35)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(160, 80, 106, 0.25)' }}
          >
            <Plus size={16} /> Nueva Cita
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardModule;
