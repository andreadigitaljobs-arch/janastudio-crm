import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Clock, Calendar, Sparkles, RefreshCw,
  Flower2, Heart, MapPin, Bell, Plus, Star, ChevronRight,
  BarChart3, Target, Award, Zap, CheckCircle, AlertCircle,
  Percent, Activity, DollarSign, UserPlus, Scissors
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

const QUOTES = [
  { text: "Cada mujer es hermosa a su manera.", signature: "Jana Studio ♡" },
  { text: "La belleza comienza con la decisión de ser tú misma.", signature: "Coco Chanel" },
  { text: "Las manos que embellecen, tocan el alma.", signature: "Jana Studio ♡" },
  { text: "La confianza es la mejor belleza.", signature: "Jana Studio ♡" },
];

const DEMO_APPOINTMENTS = [
  { time: '11:00 AM', client: 'María Gabriela R.', service: 'Coloración Balayage', status: 'Confirmada', initial: 'M' },
  { time: '12:30 PM', client: 'Valentina S.', service: 'Uñas Acrílicas', status: 'Confirmada', initial: 'V' },
  { time: '02:00 PM', client: 'Daniela P.', service: 'Limpieza Facial Premium', status: 'Pendiente', initial: 'D' },
  { time: '03:30 PM', client: 'Andrea L.', service: 'Extensiones de Pestañas', status: 'Confirmada', initial: 'A' },
];

const TOP_SPECIALISTS = [
  { name: 'Isabella R.', role: 'Estilista Senior', earnings: 2450, initial: 'I' },
  { name: 'Valeria M.', role: 'Nail Artist', earnings: 1980, initial: 'V' },
  { name: 'Camila P.', role: 'Lash Expert', earnings: 1560, initial: 'C' },
  { name: 'Sofía A.', role: 'Esteticista', earnings: 1250, initial: 'S' },
];

const DashboardModule = ({
  isMobile, isTablet, isCollapsed, onOpenSale, stats, chartData,
  dbData, handleSeedData, rates, onNavigate, onRefresh
}) => {
  const { user } = useAuth();
  const [quoteIndex, setQuoteIndex] = useState(0);

  const formatBs = (amount) => {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(amount);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % QUOTES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const quote = QUOTES[quoteIndex];

  const demoChartData = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [{
      label: 'Ingresos (Bs.)',
      data: [700, 1950, 1350, 680, 1254, 950, 1800],
      borderColor: '#a0506a',
      backgroundColor: (ctx) => {
        if (!ctx.chart.chartArea) return 'rgba(224, 153, 174, 0.1)';
        const gradient = ctx.chart.ctx.createLinearGradient(0, ctx.chart.chartArea.top, 0, ctx.chart.chartArea.bottom);
        gradient.addColorStop(0, 'rgba(224, 153, 174, 0.35)');
        gradient.addColorStop(1, 'rgba(255, 245, 246, 0.01)');
        return gradient;
      },
      fill: true, tension: 0.4, borderWidth: 3,
      pointRadius: 4, pointBackgroundColor: '#dfb28c',
      pointBorderColor: '#ffffff', pointBorderWidth: 2, pointHoverRadius: 6,
    }]
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#2d1f2d', titleColor: '#fff', bodyColor: '#fff',
        padding: 10, displayColors: false, cornerRadius: 8,
        titleFont: { size: 11, weight: 'bold' }, bodyFont: { size: 11 },
        callbacks: { label: (context) => `Bs. ${formatBs(context.parsed.y)}` }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#a0506a', font: { size: 10, weight: '600' } },
        border: { display: false }
      },
      y: {
        grid: { color: 'rgba(251, 202, 218, 0.25)', drawBorder: false },
        ticks: {
          color: '#a0506a', font: { size: 10, weight: '500' },
          callback: (value) => `Bs. ${value >= 1000 ? (value / 1000).toFixed(1) + 'K' : value}`,
          stepSize: 500
        },
        border: { display: false }, min: 0
      }
    }
  };

  const servicesDonutData = {
    labels: ['Extensiones', 'Coloración', 'Uñas Acrílicas', 'Trat. Faciales', 'Otros'],
    datasets: [{
      data: [35, 25, 20, 12, 8],
      backgroundColor: ['#a0506a', '#e099ae', '#fbcada', '#dfb28c', '#ebd8cb'],
      borderWidth: 0, borderRadius: 4, spacing: 3
    }]
  };

  const donutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '75%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#2d1f2d', titleColor: '#fff', bodyColor: '#fff',
        padding: 10, cornerRadius: 8,
        titleFont: { size: 11 }, bodyFont: { size: 11 },
        callbacks: { label: (context) => `${context.label}: ${context.parsed}%` }
      }
    }
  };

  const statusColor = (status) => {
    if (status === 'Confirmada') return { bg: '#fdf2f4', text: '#a0506a', border: '#fbcada' };
    if (status === 'Pendiente') return { bg: '#fffbf0', text: '#d48c48', border: '#fbe4c7' };
    return { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd' };
  };

  return (
    <div style={{ padding: isMobile ? '12px 12px 32px 12px' : '0 0 32px 0', animation: 'fadeIn 0.35s ease' }}>
      {/* Stats Row */}
      <div className="dashboard-grid">
        {/* Citas del Día */}
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span className="db-stat-label">Citas del Día</span>
              <div className="db-icon-wrapper"><Calendar size={16} color="#a0506a" /></div>
            </div>
            <div className="db-stat-value">
              {stats?.appointments || 12}
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#a0506a', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
            <Clock size={12} style={{ opacity: 0.7 }} /> Próxima: 11:00 AM
          </div>
        </div>

        {/* Ingresos Hoy */}
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span className="db-stat-label">Ingresos Hoy</span>
              <div className="db-icon-wrapper"><DollarSign size={16} color="#a0506a" /></div>
            </div>
            <div className="db-stat-value" style={{ fontSize: '1.45rem' }}>
              Bs. {formatBs(stats?.income || 1254.50)}
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#a0506a', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
            <TrendingUp size={12} /> +18.6% vs. ayer
          </div>
        </div>

        {/* Nuevas Clientas */}
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span className="db-stat-label">Nuevas Clientas</span>
              <div className="db-icon-wrapper"><UserPlus size={16} color="#a0506a" /></div>
            </div>
            <div className="db-stat-value">
              {stats?.clients || 5}
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#a0506a', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
            <TrendingUp size={12} /> +25% vs. ayer
          </div>
        </div>

        {/* Servicio Más Reservado */}
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span className="db-stat-label">Top Servicio</span>
              <div className="db-icon-wrapper"><Scissors size={16} color="#a0506a" /></div>
            </div>
            <div className="db-stat-value" style={{ fontSize: '1.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Extensiones
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#a0506a', marginTop: '10px', fontWeight: '500' }}>
            24 reservas hoy
          </div>
        </div>

        {/* Ocupación del Equipo */}
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span className="db-stat-label">Ocupación</span>
              <div className="db-icon-wrapper"><Activity size={16} color="#a0506a" /></div>
            </div>
            <div className="db-stat-value">78%</div>
          </div>
          <div style={{ marginTop: '10px', width: '100%' }}>
            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(251, 202, 218, 0.3)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '78%', borderRadius: '3px', background: 'var(--rose-gradient-premium)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Chart + Próximas Citas */}
      <div className="db-main-row">

        {/* Chart */}
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '290px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#a0506a', margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>Ingresos Semanales</h3>
            <div style={{
              padding: '5px 12px', borderRadius: '10px', background: 'var(--blush-bg)',
              fontSize: '0.72rem', color: '#a0506a', fontWeight: '700',
              display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
              border: '1px solid rgba(251, 202, 218, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(160,80,106,0.4)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(251,202,218,0.4)' }}
            >
              Esta Semana <ChevronRight size={12} style={{ transform: 'rotate(90deg)', opacity: 0.7 }} />
            </div>
          </div>
          <div style={{ flex: 1, minHeight: '180px', position: 'relative' }}>
            <Line data={demoChartData} options={chartOptions} />
          </div>
        </div>

        {/* Próximas Citas - Timeline style */}
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '290px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#a0506a', margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>Agenda de Hoy</h3>
            <button
              onClick={() => onNavigate('scheduling')}
              style={{
                padding: '5px 12px', borderRadius: '10px', background: 'var(--blush-bg)',
                border: '1px solid rgba(251,202,218,0.5)', color: '#a0506a',
                fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251, 202, 218, 0.35)'; e.currentTarget.style.borderColor = 'rgba(160, 80, 106, 0.3)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--blush-bg)'; e.currentTarget.style.borderColor = 'rgba(251, 202, 218, 0.5)' }}
            >Ver agenda</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, position: 'relative' }}>
            <div className="timeline-connector" />
            
            {DEMO_APPOINTMENTS.map((apt, idx) => {
              const sc = statusColor(apt.status);
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  position: 'relative', zIndex: 1
                }}>
                  {/* Timeline point */}
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: apt.status === 'Confirmada' ? 'var(--rose-gradient-premium)' : 'var(--gold-gradient)',
                    border: '3px solid #ffffff',
                    boxShadow: '0 0 8px rgba(160, 80, 106, 0.2)',
                    flexShrink: 0
                  }} />
                  
                  {/* Appointment Card */}
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '8px 14px', borderRadius: '14px', background: 'var(--blush-bg)',
                    border: '1px solid rgba(251, 202, 218, 0.25)',
                    boxShadow: '0 2px 8px rgba(160, 80, 106, 0.02)'
                  }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'var(--rose-gradient-premium)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0
                    }}>{apt.initial}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.62rem', color: '#a0506a', fontWeight: '700' }}>{apt.time}</div>
                      <div style={{ fontWeight: 700, color: '#3d2a3a', fontSize: '0.8rem', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.client}</div>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(90, 61, 80, 0.8)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.service}</div>
                    </div>
                    <div style={{
                      padding: '3px 9px', borderRadius: '20px', fontSize: '0.62rem',
                      fontWeight: '700', background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                      flexShrink: 0, whiteSpace: 'nowrap'
                    }}>{apt.status}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '0.75rem', color: '#a0506a', fontWeight: '600' }}>
            + 8 citas más hoy
          </div>
        </div>
      </div>

      {/* Bottom Row: Frase + Top Especialistas + Servicios Populares */}
      <div className="db-bottom-row">
        {/* Quote Card */}
        <div style={{
          padding: '28px', borderRadius: '22px',
          background: 'linear-gradient(135deg, #fff7f8 0%, #fbe8ec 100%)',
          border: '1px solid rgba(251, 202, 218, 0.45)',
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          minHeight: '300px',
          boxShadow: 'var(--luxury-card-shadow)'
        }}>
          <div style={{
            position: 'absolute', top: '-25px', right: '-25px',
            width: '110px', height: '110px', borderRadius: '50%',
            background: 'rgba(251, 202, 218, 0.15)'
          }} />
          <div>
            <div style={{ fontSize: '3rem', color: '#e099ae', lineHeight: 1, marginBottom: '2px', fontFamily: 'Georgia, serif', opacity: 0.6 }}>"</div>
            <p style={{
              fontSize: '1rem', fontStyle: 'italic', color: '#3d2a3a',
              margin: 0, lineHeight: '1.6', position: 'relative', zIndex: 1,
              fontWeight: '500', fontFamily: "'Playfair Display', Georgia, serif"
            }}>{quote.text}</p>
          </div>
          <div style={{
            marginTop: '18px', paddingTop: '14px',
            borderTop: '1px solid rgba(251, 202, 218, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '0.8rem', color: '#a0506a', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: '700' }}>
              {quote.signature}
            </span>
            <Flower2 size={20} color="#e099ae" style={{ opacity: 0.6 }} />
          </div>
        </div>

        {/* Top Especialistas */}
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#a0506a', margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>Especialistas Top</h3>
            <button style={{
              padding: '5px 12px', borderRadius: '10px', background: 'transparent',
              border: '1px solid rgba(251,202,218,0.5)', color: '#a0506a',
              fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer'
            }}>Ver reporte</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            {TOP_SPECIALISTS.map((spec, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '6px 10px', borderRadius: '14px',
                background: idx === 0 ? 'rgba(251, 202, 218, 0.2)' : 'transparent',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: 'var(--rose-gradient-premium)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0
                }}>{spec.initial}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#3d2a3a', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spec.name}</div>
                  <div style={{ fontSize: '0.65rem', color: '#a0506a', fontWeight: '500' }}>{spec.role}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, color: '#a0506a', fontSize: '0.8rem' }}>Bs. {formatBs(spec.earnings)}</div>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(90, 61, 80, 0.6)', fontWeight: '600' }}>Ingresos</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Servicios Más Populares */}
        <div className="luxury-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#a0506a', margin: '0 0 14px 0', fontFamily: "'Playfair Display', Georgia, serif" }}>Servicios Populares</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <div style={{ width: '105px', height: '105px', position: 'relative', flexShrink: 0 }}>
              <Doughnut data={servicesDonutData} options={donutOptions} />
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#a0506a' }}>156</div>
                <div style={{ fontSize: '0.55rem', color: 'rgba(90, 61, 80, 0.6)', fontWeight: '600' }}>Reservas</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
              {servicesDonutData.labels.map((label, idx) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: servicesDonutData.datasets[0].backgroundColor[idx], flexShrink: 0
                  }} />
                  <span style={{ flex: 1, color: 'rgba(90, 61, 80, 0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>{label}</span>
                  <span style={{ fontWeight: 700, color: '#a0506a', flexShrink: 0 }}>
                    {servicesDonutData.datasets[0].data[idx]}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Promotions Banner */}
      <div style={{
        padding: '24px 30px', borderRadius: '24px',
        background: 'linear-gradient(135deg, #2d1f2d 0%, #3e1b2f 50%, #5c2043 100%)',
        boxShadow: '0 12px 40px rgba(62, 27, 47, 0.25)',
        display: 'flex', alignItems: 'center', gap: '20px',
        position: 'relative', overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        flexWrap: 'wrap'
      }}>
        <div style={{
          position: 'absolute', top: '-30px', right: '-30px',
          width: '130px', height: '130px', borderRadius: '50%',
          background: 'rgba(251, 202, 218, 0.04)'
        }} />
        <div style={{
          width: '46px', height: '46px', borderRadius: '14px',
          background: 'var(--rose-gradient-premium)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: '0 4px 15px rgba(224, 153, 174, 0.3)'
        }}>
          <Percent size={20} color="white" />
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '0.3px' }}>
            Activa tus promociones y atrae más clientas
          </h4>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.55)', margin: '6px 0 0 0', fontWeight: '500' }}>
            Crea ofertas irresistibles y aumenta tus reservas esta semana.
          </p>
        </div>

        <button style={{
          padding: '12px 26px', borderRadius: '14px', border: 'none',
          background: 'var(--gold-gradient)',
          color: '#2d1f2d', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(223, 178, 140, 0.35)',
          display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(223, 178, 140, 0.5)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(223, 178, 140, 0.35)' }}
        >
          <Plus size={16} /> Crear Promoción
        </button>
      </div>
    </div>
  );
};

export default DashboardModule;
