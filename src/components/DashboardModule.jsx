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
      borderColor: '#c48b9f',
      backgroundColor: (ctx) => {
        if (!ctx.chart.chartArea) return 'rgba(196, 139, 159, 0.1)';
        const gradient = ctx.chart.ctx.createLinearGradient(0, ctx.chart.chartArea.top, 0, ctx.chart.chartArea.bottom);
        gradient.addColorStop(0, 'rgba(196, 139, 159, 0.2)');
        gradient.addColorStop(1, 'rgba(196, 139, 159, 0.01)');
        return gradient;
      },
      fill: true, tension: 0.4, borderWidth: 2.5,
      pointRadius: 3.5, pointBackgroundColor: '#c48b9f',
      pointBorderColor: '#ffffff', pointBorderWidth: 2, pointHoverRadius: 5,
    }]
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#2d1f2d', titleColor: '#fff', bodyColor: '#fff',
        padding: 10, displayColors: false, cornerRadius: 8,
        titleFont: { size: 11 }, bodyFont: { size: 11 },
        callbacks: { label: (context) => `Bs. ${formatBs(context.parsed.y)}` }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9e9e9e', font: { size: 10, weight: '500' } },
        border: { display: false }
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false },
        ticks: {
          color: '#9e9e9e', font: { size: 10 },
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
      backgroundColor: ['#c48b9f', '#a0506a', '#d4a09a', '#e8c4be', '#f0d8d2'],
      borderWidth: 0, borderRadius: 3, spacing: 2
    }]
  };

  const donutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '72%',
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
    if (status === 'Confirmada') return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };
    if (status === 'Pendiente') return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
    return { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd' };
  };

  const card = {
    padding: '14px', borderRadius: '14px', background: '#fff',
    border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
  };

  const iconCircle = {
    width: '32px', height: '32px', borderRadius: '9px',
    background: 'rgba(196, 139, 159, 0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
  };

  return (
    <div style={{ padding: isMobile ? '12px' : '0' }}>
      {/* Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: '12px', marginBottom: '18px'
      }}>
        {/* Citas del Día */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={iconCircle}><Calendar size={16} color="#c48b9f" /></div>
            <span style={{ fontSize: '0.72rem', color: '#6b6b6b', fontWeight: '500' }}>Citas del Día</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d2d2d', lineHeight: 1 }}>
            {stats?.appointments || 12}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#9e9e9e', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={10} /> Próxima: 11:00 AM
          </div>
        </div>

        {/* Ingresos Hoy */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={iconCircle}><DollarSign size={16} color="#c48b9f" /></div>
            <span style={{ fontSize: '0.72rem', color: '#6b6b6b', fontWeight: '500' }}>Ingresos Hoy</span>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#2d2d2d', lineHeight: 1.1 }}>
            Bs. {formatBs(stats?.income || 1254.50)}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#16a34a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <TrendingUp size={10} /> +18.6% vs. ayer
          </div>
        </div>

        {/* Nuevas Clientas */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={iconCircle}><UserPlus size={16} color="#c48b9f" /></div>
            <span style={{ fontSize: '0.72rem', color: '#6b6b6b', fontWeight: '500' }}>Nuevas Clientas</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d2d2d', lineHeight: 1 }}>
            {stats?.clients || 5}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#16a34a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <TrendingUp size={10} /> +25% vs. ayer
          </div>
        </div>

        {/* Servicio Más Reservado */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={iconCircle}><Scissors size={16} color="#c48b9f" /></div>
            <span style={{ fontSize: '0.72rem', color: '#6b6b6b', fontWeight: '500' }}>Servicio Más Reservado</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2d2d2d', lineHeight: 1.1 }}>
            Extensiones
          </div>
          <div style={{ fontSize: '0.68rem', color: '#9e9e9e', marginTop: '4px' }}>24 reservas hoy</div>
        </div>

        {/* Ocupación del Equipo */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={iconCircle}><Activity size={16} color="#c48b9f" /></div>
            <span style={{ fontSize: '0.72rem', color: '#6b6b6b', fontWeight: '500' }}>Ocupación del Equipo</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d2d2d', lineHeight: 1 }}>78%</div>
          <div style={{ marginTop: '6px' }}>
            <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(196, 139, 159, 0.12)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '78%', borderRadius: '3px', background: 'linear-gradient(90deg, #c48b9f, #a0506a)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Chart + Próximas Citas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1fr',
        gap: '18px', marginBottom: '18px'
      }}>
        {/* Chart */}
        <div style={{ ...card, padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#2d2d2d', margin: 0 }}>Ingresos de la Semana</h3>
            <div style={{
              padding: '4px 10px', borderRadius: '7px', background: '#faf5f5',
              fontSize: '0.7rem', color: '#6b6b6b', fontWeight: '500',
              display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
              border: '1px solid rgba(0,0,0,0.04)'
            }}>
              Esta Semana <ChevronRight size={12} style={{ transform: 'rotate(90deg)' }} />
            </div>
          </div>
          <div style={{ height: isMobile ? '180px' : '240px' }}>
            <Line data={demoChartData} options={chartOptions} />
          </div>
        </div>

        {/* Próximas Citas */}
        <div style={{ ...card, padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#2d2d2d', margin: 0 }}>Próximas Citas</h3>
            <button
              onClick={() => onNavigate('scheduling')}
              style={{
                padding: '4px 10px', borderRadius: '7px', background: 'transparent',
                border: '1px solid rgba(0,0,0,0.08)', color: '#6b6b6b',
                fontSize: '0.7rem', fontWeight: '500', cursor: 'pointer'
              }}
            >Ver agenda</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {DEMO_APPOINTMENTS.map((apt, idx) => {
              const sc = statusColor(apt.status);
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px', borderRadius: '11px', background: '#faf5f5'
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #c48b9f 0%, #a0506a 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 600, fontSize: '0.78rem', flexShrink: 0
                  }}>{apt.initial}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', color: '#9e9e9e', fontWeight: '500' }}>{apt.time}</div>
                    <div style={{ fontWeight: 600, color: '#2d2d2d', fontSize: '0.78rem', marginTop: '1px' }}>{apt.client}</div>
                    <div style={{ fontSize: '0.68rem', color: '#6b6b6b', marginTop: '1px' }}>{apt.service}</div>
                  </div>
                  <div style={{
                    padding: '3px 8px', borderRadius: '20px', fontSize: '0.62rem',
                    fontWeight: '600', background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                    flexShrink: 0, whiteSpace: 'nowrap'
                  }}>{apt.status}</div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.7rem', color: '#9e9e9e' }}>
            + 8 citas más hoy
          </div>
        </div>
      </div>

      {/* Bottom Row: Frase + Top Especialistas + Servicios Populares */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr 1fr',
        gap: '18px', marginBottom: '18px'
      }}>
        {/* Quote Card */}
        <div style={{
          padding: '20px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #fdf2f0 0%, #fce8e4 100%)',
          border: '1px solid rgba(196, 139, 159, 0.08)',
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div style={{
            position: 'absolute', top: '-25px', right: '-25px',
            width: '90px', height: '90px', borderRadius: '50%',
            background: 'rgba(196, 139, 159, 0.06)'
          }} />
          <div>
            <div style={{ fontSize: '2rem', color: '#c48b9f', lineHeight: 1, marginBottom: '4px', fontFamily: 'Georgia, serif' }}>"</div>
            <p style={{
              fontSize: '0.95rem', fontStyle: 'italic', color: '#2d2d2d',
              margin: 0, lineHeight: '1.5', position: 'relative', zIndex: 1
            }}>{quote.text}</p>
          </div>
          <div style={{
            marginTop: '14px', paddingTop: '10px',
            borderTop: '1px solid rgba(196, 139, 159, 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '0.82rem', color: '#c48b9f', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
              {quote.signature}
            </span>
            <Flower2 size={16} color="#c48b9f" style={{ opacity: 0.4 }} />
          </div>
        </div>

        {/* Top Especialistas */}
        <div style={{ ...card, padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#2d2d2d', margin: 0 }}>Top Especialistas</h3>
            <button style={{
              padding: '4px 10px', borderRadius: '7px', background: 'transparent',
              border: '1px solid rgba(0,0,0,0.08)', color: '#6b6b6b',
              fontSize: '0.68rem', fontWeight: '500', cursor: 'pointer'
            }}>Ver reporte</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {TOP_SPECIALISTS.map((spec, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px', borderRadius: '10px',
                background: idx === 0 ? 'rgba(196, 139, 159, 0.05)' : 'transparent'
              }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #c48b9f 0%, #a0506a 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 600, fontSize: '0.75rem', flexShrink: 0
                }}>{spec.initial}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#2d2d2d', fontSize: '0.78rem' }}>{spec.name}</div>
                  <div style={{ fontSize: '0.65rem', color: '#9e9e9e' }}>{spec.role}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: '#2d2d2d', fontSize: '0.78rem' }}>Bs. {formatBs(spec.earnings)}</div>
                  <div style={{ fontSize: '0.6rem', color: '#9e9e9e' }}>Ingresos</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Servicios Más Populares */}
        <div style={{ ...card, padding: '16px' }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#2d2d2d', margin: '0 0 14px 0' }}>Servicios Más Populares</h3>

          <div style={{ height: '150px', position: 'relative', marginBottom: '14px' }}>
            <Doughnut data={servicesDonutData} options={donutOptions} />
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)', textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2d2d2d' }}>156</div>
              <div style={{ fontSize: '0.6rem', color: '#9e9e9e' }}>Reservas</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {servicesDonutData.labels.map((label, idx) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '2px',
                  background: servicesDonutData.datasets[0].backgroundColor[idx], flexShrink: 0
                }} />
                <span style={{ flex: 1, fontSize: '0.7rem', color: '#6b6b6b' }}>{label}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#2d2d2d' }}>
                  {servicesDonutData.datasets[0].data[idx]}%
                </span>
                <span style={{ fontSize: '0.62rem', color: '#9e9e9e' }}>
                  ({Math.round(156 * servicesDonutData.datasets[0].data[idx] / 100)})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Promotions Banner */}
      <div style={{
        padding: '18px 24px', borderRadius: '16px',
        background: 'linear-gradient(135deg, #2d1f2d 0%, #4a3040 50%, #6b4a5a 100%)',
        boxShadow: '0 4px 20px rgba(45, 31, 45, 0.25)',
        display: 'flex', alignItems: 'center', gap: '16px',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-30px', right: '-30px',
          width: '120px', height: '120px', borderRadius: '50%',
          background: 'rgba(196, 139, 159, 0.08)'
        }} />
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #c48b9f 0%, #a0506a 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: '0 3px 12px rgba(196, 139, 159, 0.25)'
        }}>
          <Percent size={20} color="white" />
        </div>

        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
            Activa tus promociones y atrae más clientas
          </h4>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>
            Crea ofertas irresistibles y aumenta tus reservas esta semana.
          </p>
        </div>

        <button style={{
          padding: '10px 20px', borderRadius: '11px', border: 'none',
          background: 'linear-gradient(135deg, #d4a09a 0%, #c48b9f 50%, #a0506a 100%)',
          color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 3px 12px rgba(196, 139, 159, 0.25)',
          display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
          transition: 'all 0.3s ease'
        }}>
          <Plus size={15} /> Crear Promoción
        </button>
      </div>
    </div>
  );
};

export default DashboardModule;
