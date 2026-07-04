import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Clock,
  Calendar,
  Sparkles,
  RefreshCw,
  Flower2,
  Heart,
  MapPin,
  Bell,
  Plus,
  Star,
  ChevronRight,
  BarChart3,
  Target,
  Award,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

const QUOTES = [
  { text: "La belleza comienza con la decisión de ser tú misma.", author: "Coco Chanel" },
  { text: "Cada mujer es hermosa a su manera.", author: "Reflejo" },
  { text: "Invertir en tu imagen es invertir en ti.", author: "Emprendimiento" },
  { text: "Las manos que embellecen, tocan el alma.", author: "Arte" },
  { text: "La confianza es la mejor belleza.", author: "Reflejo" },
  { text: "Un buen servicio vale más que mil palabras.", author: "Negocios" },
  { text: "El arte de la belleza es una pasión que inspira.", author: "JanaStudio" },
  { text: "Cada detalle cuenta cuando se hace con amor.", author: "Pasión" },
];

const DashboardModule = ({
  isMobile,
  isTablet,
  isCollapsed,
  onOpenSale,
  stats,
  chartData,
  dbData,
  handleSeedData,
  rates,
  onNavigate,
  onRefresh
}) => {
  const { user } = useAuth();
  const [quoteIndex, setQuoteIndex] = useState(0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % QUOTES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toLocaleDateString('es-VE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const currentTime = new Date().toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const quote = QUOTES[quoteIndex];

  // Get upcoming appointments
  const upcomingAppointments = (dbData?.appointments || [])
    .slice(0, 5)
    .map((apt, idx) => ({
      id: idx,
      time: apt.time || '10:00 AM',
      client: apt.client_name || 'Cliente',
      service: apt.service_name || 'Servicio',
      status: apt.status === 'Completado' ? 'Completada' : apt.status === 'Pendiente' ? 'Pendiente' : 'Confirmada',
      avatar: apt.client_name?.charAt(0) || 'C'
    }));

  // Get top specialists
  const topSpecialists = (dbData?.staff || [])
    .slice(0, 3)
    .map((staff, idx) => ({
      id: idx,
      name: staff.name || 'Especialista',
      role: staff.role || 'Manicurista',
      earnings: staff.stats?.monthlyIncome || 0,
      appointments: staff.stats?.monthlyAppointments || 0,
      rating: 4.5 + (idx * 0.1),
      avatar: staff.name?.charAt(0) || 'E'
    }));

  // Services distribution for doughnut chart
  const servicesData = {
    labels: ['Manicuría', 'Pestañas', 'Alisado', 'Otros'],
    datasets: [{
      data: [45, 25, 20, 10],
      backgroundColor: [
        '#c48b9f',
        '#a0506a',
        '#d4a09a',
        '#e8c4be'
      ],
      borderWidth: 0,
      borderRadius: 4,
      spacing: 2
    }]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => `${context.label}: ${context.parsed}%`
        }
      }
    }
  };

  return (
    <div style={{ padding: isMobile ? '16px' : '0' }}>
      {/* Main Grid Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
        gap: '24px',
        marginBottom: '24px'
      }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Stats Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
            gap: '16px'
          }}>
            {/* Citas del Día */}
            <div style={{
              padding: '20px',
              borderRadius: '16px',
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.04)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #c48b9f 0%, #a0506a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={20} color="white" />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#9e9e9e', margin: 0, fontWeight: '500' }}>Citas del Día</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d2d2d', margin: '4px 0 0 0' }}>
                  {stats?.appointments || 0}
                </h3>
              </div>
            </div>

            {/* Ingresos Hoy */}
            <div style={{
              padding: '20px',
              borderRadius: '16px',
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.04)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={20} color="white" />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#9e9e9e', margin: 0, fontWeight: '500' }}>Ingresos Hoy</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d2d2d', margin: '4px 0 0 0' }}>
                  ${formatCurrency(stats?.income || 0)}
                </h3>
              </div>
            </div>

            {/* Nuevas Clientes */}
            <div style={{
              padding: '20px',
              borderRadius: '16px',
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.04)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Users size={20} color="white" />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#9e9e9e', margin: 0, fontWeight: '500' }}>Nuevas Clientes</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d2d2d', margin: '4px 0 0 0' }}>
                  {stats?.clients || 0}
                </h3>
              </div>
            </div>

            {/* Servicios Más Reservados */}
            <div style={{
              padding: '20px',
              borderRadius: '16px',
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.04)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Star size={20} color="white" />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#9e9e9e', margin: 0, fontWeight: '500' }}>Servicios Pop.</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d2d2d', margin: '4px 0 0 0' }}>
                  {dbData?.services?.length || 0}
                </h3>
              </div>
            </div>

            {/* Ocupación del Equipo */}
            <div style={{
              padding: '20px',
              borderRadius: '16px',
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.04)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Target size={20} color="white" />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#9e9e9e', margin: 0, fontWeight: '500' }}>Equipo Activo</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d2d2d', margin: '4px 0 0 0' }}>
                  {dbData?.staff?.length || 0}
                </h3>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div style={{
            padding: '24px',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.04)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2d2d2d', margin: 0 }}>
                Ingresos de la Semana
              </h3>
              <div style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#faf5f5',
                fontSize: '0.8rem',
                color: '#6b6b6b',
                fontWeight: '500'
              }}>
                Últimos 7 días
              </div>
            </div>
            <div style={{ height: isMobile ? '200px' : '280px' }}>
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      titleColor: '#fff',
                      bodyColor: '#fff',
                      padding: 12,
                      displayColors: false,
                      callbacks: {
                        label: (context) => `$${context.parsed.y.toFixed(2)}`
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { color: '#9e9e9e', font: { size: 12 } },
                      border: { display: false }
                    },
                    y: {
                      grid: { color: 'rgba(0,0,0,0.04)' },
                      ticks: {
                        color: '#9e9e9e',
                        callback: (value) => `$${value}`,
                        font: { size: 12 }
                      },
                      border: { display: false }
                    }
                  },
                  elements: {
                    point: {
                      radius: 4,
                      hoverRadius: 6,
                      backgroundColor: '#c48b9f',
                      borderColor: '#ffffff',
                      borderWidth: 2
                    },
                    line: {
                      borderColor: '#c48b9f',
                      borderWidth: 3
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Próximas Citas */}
          <div style={{
            padding: '24px',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.04)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2d2d2d', margin: 0 }}>
                Próximas Citas
              </h3>
              <button
                onClick={() => onNavigate('scheduling')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: '#c48b9f',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Ver todo <ChevronRight size={14} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {upcomingAppointments.length > 0 ? upcomingAppointments.map((apt) => (
                <div key={apt.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#faf5f5',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #c48b9f 0%, #a0506a 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1rem'
                  }}>
                    {apt.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#2d2d2d', fontSize: '0.95rem' }}>{apt.client}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b6b6b', marginTop: '2px' }}>{apt.service}</div>
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    background: apt.status === 'Completada' ? '#dcfce7' : apt.status === 'Pendiente' ? '#fef3c7' : '#e0f2fe',
                    color: apt.status === 'Completada' ? '#16a34a' : apt.status === 'Pendiente' ? '#d97706' : '#0284c7'
                  }}>
                    {apt.status}
                  </div>
                </div>
              )) : (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: '#9e9e9e',
                  fontSize: '0.9rem'
                }}>
                  No hay citas programadas
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Quote Card */}
          <div style={{
            padding: '24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #faf5f5 0%, #f5eded 100%)',
            border: '1px solid rgba(0,0,0,0.04)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(196, 139, 159, 0.1) 0%, rgba(160, 80, 106, 0.1) 100%)',
              opacity: 0.5
            }} />
            <Flower2 size={24} style={{ color: '#c48b9f', marginBottom: '12px' }} />
            <p style={{
              fontSize: '1rem',
              fontStyle: 'italic',
              color: '#2d2d2d',
              margin: 0,
              lineHeight: '1.6',
              position: 'relative',
              zIndex: 1
            }}>
              "{quote.text}"
            </p>
            <p style={{
              fontSize: '0.8rem',
              color: '#9e9e9e',
              marginTop: '12px',
              textAlign: 'right',
              fontWeight: '500'
            }}>
              — {quote.author}
            </p>
          </div>

          {/* Top Especialistas */}
          <div style={{
            padding: '24px',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.04)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2d2d2d', margin: '0 0 20px 0' }}>
              Top Especialistas
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {topSpecialists.length > 0 ? topSpecialists.map((spec, idx) => (
                <div key={spec.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#faf5f5'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #c48b9f 0%, #a0506a 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}>
                    {spec.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#2d2d2d', fontSize: '0.9rem' }}>{spec.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b6b6b' }}>{spec.role}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: '#2d2d2d', fontSize: '0.9rem' }}>
                      ${formatCurrency(spec.earnings)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9e9e9e' }}>este mes</div>
                  </div>
                </div>
              )) : (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  color: '#9e9e9e',
                  fontSize: '0.85rem'
                }}>
                  Sin datos de especialistas
                </div>
              )}
            </div>
          </div>

          {/* Servicios Más Populares */}
          <div style={{
            padding: '24px',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.04)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2d2d2d', margin: '0 0 20px 0' }}>
              Servicios Más Populares
            </h3>
            
            <div style={{ height: '180px', marginBottom: '16px' }}>
              <Doughnut data={servicesData} options={doughnutOptions} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {servicesData.labels.map((label, idx) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '3px',
                    background: servicesData.datasets[0].backgroundColor[idx]
                  }} />
                  <span style={{ fontSize: '0.8rem', color: '#6b6b6b' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Promociones Banner */}
          <div style={{
            padding: '20px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #c48b9f 0%, #a0506a 100%)',
            boxShadow: '0 4px 20px rgba(196, 139, 159, 0.25)',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Zap size={24} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'white', margin: 0 }}>
                  Activa Promociones
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', margin: '4px 0 0 0' }}>
                  Atrae más clientes con ofertas especiales
                </p>
              </div>
              <ChevronRight size={20} color="white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardModule;
