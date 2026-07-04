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
        gradient.addColorStop(0, 'rgba(196, 139, 159, 0.25)');
        gradient.addColorStop(1, 'rgba(196, 139, 159, 0.02)');
        return gradient;
      },
      fill: true,
      tension: 0.4,
      borderWidth: 3,
      pointRadius: 5,
      pointBackgroundColor: '#c48b9f',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointHoverRadius: 7,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#2d1f2d',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        displayColors: false,
        cornerRadius: 10,
        callbacks: {
          label: (context) => `Bs. ${formatBs(context.parsed.y)}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9e9e9e', font: { size: 12, weight: '500' } },
        border: { display: false }
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
        ticks: {
          color: '#9e9e9e',
          callback: (value) => `Bs. ${value >= 1000 ? (value / 1000).toFixed(1) + 'K' : value}`,
          font: { size: 11 },
          stepSize: 500
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
      backgroundColor: ['#c48b9f', '#a0506a', '#d4a09a', '#e8c4be', '#f0d8d2'],
      borderWidth: 0,
      borderRadius: 4,
      spacing: 2
    }]
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#2d1f2d',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (context) => `${context.label}: ${context.parsed}%`
        }
      }
    }
  };

  const statusColor = (status) => {
    if (status === 'Confirmada') return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };
    if (status === 'Pendiente') return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
    return { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd' };
  };

  return (
    <div style={{ padding: isMobile ? '16px' : '0' }}>
      {/* Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Citas del Día */}
        <div style={{
          padding: '20px', borderRadius: '16px', background: '#fff',
          border: '1px solid rgba(0,0,0,0.04)', boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'rgba(196, 139, 159, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Calendar size={20} color="#c48b9f" />
            </div>
            <span style={{ fontSize: '0.82rem', color: '#6b6b6b', fontWeight: '500' }}>Citas del Día</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2d2d2d', lineHeight: 1 }}>
            {stats?.appointments || 12}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9e9e9e', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> Próxima: 11:00 AM
          </div>
        </div>

        {/* Ingresos Hoy */}
        <div style={{
          padding: '20px', borderRadius: '16px', background: '#fff',
          border: '1px solid rgba(0,0,0,0.04)', boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'rgba(196, 139, 159, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <DollarSign size={20} color="#c48b9f" />
            </div>
            <span style={{ fontSize: '0.82rem', color: '#6b6b6b', fontWeight: '500' }}>Ingresos Hoy</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2d2d2d', lineHeight: 1 }}>
            Bs. {formatBs(stats?.income || 1254.50)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={12} /> +18.6% vs. ayer
          </div>
        </div>

        {/* Nuevas Clientas */}
        <div style={{
          padding: '20px', borderRadius: '16px', background: '#fff',
          border: '1px solid rgba(0,0,0,0.04)', boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'rgba(196, 139, 159, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <UserPlus size={20} color="#c48b9f" />
            </div>
            <span style={{ fontSize: '0.82rem', color: '#6b6b6b', fontWeight: '500' }}>Nuevas Clientas</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2d2d2d', lineHeight: 1 }}>
            {stats?.clients || 5}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={12} /> +25% vs. ayer
          </div>
        </div>

        {/* Servicios Más Reservados */}
        <div style={{
          padding: '20px', borderRadius: '16px', background: '#fff',
          border: '1px solid rgba(0,0,0,0.04)', boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'rgba(196, 139, 159, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Scissors size={20} color="#c48b9f" />
            </div>
            <span style={{ fontSize: '0.82rem', color: '#6b6b6b', fontWeight: '500' }}>Servicio Más Reservado</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d2d2d', lineHeight: 1 }}>
            Extensiones
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9e9e9e', marginTop: '6px' }}>
            24 reservas hoy
          </div>
        </div>

        {/* Ocupación del Equipo */}
        <div style={{
          padding: '20px', borderRadius: '16px', background: '#fff',
          border: '1px solid rgba(0,0,0,0.04)', boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'rgba(196, 139, 159, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Activity size={20} color="#c48b9f" />
            </div>
            <span style={{ fontSize: '0.82rem', color: '#6b6b6b', fontWeight: '500' }}>Ocupación del Equipo</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2d2d2d', lineHeight: 1 }}>
            78%
          </div>
          <div style={{ marginTop: '8px' }}>
            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(196, 139, 159, 0.15)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '78%', borderRadius: '3px', background: 'linear-gradient(90deg, #c48b9f, #a0506a)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Chart + Próximas Citas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1fr',
        gap: '24px',
        marginBottom: '24px'
      }}>
        {/* Chart */}
        <div style={{
          padding: '24px', borderRadius: '20px', background: '#fff',
          border: '1px solid rgba(0,0,0,0.04)', boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#2d2d2d', margin: 0 }}>
              Ingresos de la Semana
            </h3>
            <div style={{
              padding: '6px 14px', borderRadius: '8px', background: '#faf5f5',
              fontSize: '0.8rem', color: '#6b6b6b', fontWeight: '500',
              display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
              border: '1px solid rgba(0,0,0,0.04)'
            }}>
              Esta Semana <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />
            </div>
          </div>
          <div style={{ height: isMobile ? '220px' : '300px' }}>
            <Line data={demoChartData} options={chartOptions} />
          </div>
        </div>

        {/* Próximas Citas */}
        <div style={{
          padding: '24px', borderRadius: '20px', background: '#fff',
          border: '1px solid rgba(0,0,0,0.04)', boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#2d2d2d', margin: 0 }}>
              Próximas Citas
            </h3>
            <button
              onClick={() => onNavigate('scheduling')}
              style={{
                padding: '6px 14px', borderRadius: '8px', background: 'transparent',
                border: '1px solid rgba(0,0,0,0.08)', color: '#6b6b6b',
                fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer'
              }}
            >
              Ver agenda
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {DEMO_APPOINTMENTS.map((apt, idx) => {
              const sc = statusColor(apt.status);
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px', borderRadius: '14px', background: '#faf5f5'
                }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #c48b9f 0%, #a0506a 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 600, fontSize: '0.9rem', flexShrink: 0
                  }}>
                    {apt.initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.75rem', color: '#9e9e9e', fontWeight: '500' }}>{apt.time}</div>
                    <div style={{ fontWeight: 600, color: '#2d2d2d', fontSize: '0.9rem', marginTop: '2px' }}>{apt.client}</div>
                    <div style={{ fontSize: '0.78rem', color: '#6b6b6b', marginTop: '1px' }}>{apt.service}</div>
                  </div>
                  <div style={{
                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem',
                    fontWeight: '600', background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                    flexShrink: 0, whiteSpace: 'nowrap'
                  }}>
                    {apt.status}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.8rem', color: '#9e9e9e' }}>
            + 8 citas más hoy
          </div>
        </div>
      </div>

      {/* Bottom Row: Frase + Top Especialistas + Servicios Populares */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr 1fr',
        gap: '24px',
        marginBottom: '24px'
      }}>
        {/* Quote Card */}
        <div style={{
          padding: '28px', borderRadius: '20px',
          background: 'linear-gradient(135deg, #fdf2f0 0%, #fce8e4 100%)',
          border: '1px solid rgba(196, 139, 159, 0.1)',
          position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div style={{
            position: 'absolute', top: '-30px', right: '-30px',
            width: '120px', height: '120px', borderRadius: '50%',
            background: 'rgba(196, 139, 159, 0.08)'
          }} />
          <div style={{
            position: 'absolute', bottom: '-20px', left: '-20px',
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(196, 139, 159, 0.06)'
          }} />
          <div>
            <div style={{ fontSize: '2.5rem', color: '#c48b9f', lineHeight: 1, marginBottom: '8px', fontFamily: 'Georgia, serif' }}>"</div>
            <p style={{
              fontSize: '1.15rem', fontStyle: 'italic', color: '#2d2d2d',
              margin: 0, lineHeight: '1.6', position: 'relative', zIndex: 1
            }}>
              {quote.text}
            </p>
          </div>
          <div style={{
            marginTop: '20px', paddingTop: '16px',
            borderTop: '1px solid rgba(196, 139, 159, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{
              fontSize: '1rem', color: '#c48b9f', fontFamily: 'Georgia, serif',
              fontStyle: 'italic', fontWeight: '500'
            }}>
              {quote.signature}
            </span>
            <Flower2 size={20} color="#c48b9f" style={{ opacity: 0.5 }} />
          </div>
        </div>

        {/* Top Especialistas */}
        <div style={{
          padding: '24px', borderRadius: '20px', background: '#fff',
          border: '1px solid rgba(0,0,0,0.04)', boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2d2d2d', margin: 0 }}>
              Top Especialistas
            </h3>
            <button style={{
              padding: '5px 12px', borderRadius: '8px', background: 'transparent',
              border: '1px solid rgba(0,0,0,0.08)', color: '#6b6b6b',
              fontSize: '0.75rem', fontWeight: '500', cursor: 'pointer'
            }}>
              Ver reporte
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {TOP_SPECIALISTS.map((spec, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px', borderRadius: '12px',
                background: idx === 0 ? 'rgba(196, 139, 159, 0.06)' : 'transparent'
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #c48b9f 0%, #a0506a 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 600, fontSize: '0.85rem', flexShrink: 0
                }}>
                  {spec.initial}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#2d2d2d', fontSize: '0.9rem' }}>{spec.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9e9e9e' }}>{spec.role}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: '#2d2d2d', fontSize: '0.9rem' }}>
                    Bs. {formatBs(spec.earnings)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#9e9e9e' }}>Ingresos</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Servicios Más Populares */}
        <div style={{
          padding: '24px', borderRadius: '20px', background: '#fff',
          border: '1px solid rgba(0,0,0,0.04)', boxShadow: 'var(--shadow-card)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2d2d2d', margin: '0 0 20px 0' }}>
            Servicios Más Populares
          </h3>

          <div style={{ height: '180px', position: 'relative', marginBottom: '20px' }}>
            <Doughnut data={servicesDonutData} options={donutOptions} />
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)', textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d2d2d' }}>156</div>
              <div style={{ fontSize: '0.7rem', color: '#9e9e9e' }}>Reservas</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {servicesDonutData.labels.map((label, idx) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '3px',
                  background: servicesDonutData.datasets[0].backgroundColor[idx], flexShrink: 0
                }} />
                <span style={{ flex: 1, fontSize: '0.8rem', color: '#6b6b6b' }}>{label}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2d2d2d' }}>
                  {servicesDonutData.datasets[0].data[idx]}%
                </span>
                <span style={{ fontSize: '0.75rem', color: '#9e9e9e' }}>
                  ({Math.round(156 * servicesDonutData.datasets[0].data[idx] / 100)})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Promotions Banner */}
      <div style={{
        padding: '28px 32px', borderRadius: '20px',
        background: 'linear-gradient(135deg, #2d1f2d 0%, #4a3040 50%, #6b4a5a 100%)',
        boxShadow: '0 8px 32px rgba(45, 31, 45, 0.3)',
        display: 'flex', alignItems: 'center', gap: '20px',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '160px', height: '160px', borderRadius: '50%',
          background: 'rgba(196, 139, 159, 0.1)'
        }} />
        <div style={{
          position: 'absolute', bottom: '-30px', right: '100px',
          width: '100px', height: '100px', borderRadius: '50%',
          background: 'rgba(196, 139, 159, 0.06)'
        }} />

        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #c48b9f 0%, #a0506a 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: '0 4px 16px rgba(196, 139, 159, 0.3)'
        }}>
          <Percent size={24} color="white" />
        </div>

        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', margin: 0 }}>
            Activa tus promociones y atrae más clientas
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: '6px 0 0 0' }}>
            Crea ofertas irresistibles y aumenta tus reservas esta semana.
          </p>
        </div>

        <button style={{
          padding: '14px 28px', borderRadius: '14px', border: 'none',
          background: 'linear-gradient(135deg, #d4a09a 0%, #c48b9f 50%, #a0506a 100%)',
          color: 'white', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(196, 139, 159, 0.3)',
          display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
          transition: 'all 0.3s ease'
        }}>
          <Plus size={18} /> Crear Promoción
        </button>
      </div>
    </div>
  );
};

export default DashboardModule;
