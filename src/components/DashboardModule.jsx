import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Clock,
  Calendar,
  Sparkles,
  RefreshCw,
  Scissors
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
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const QUOTES = [
  { text: "La belleza comienza con la decisión de ser tú misma.", creator: "Coco Chanel" },
  { text: "Cada mujer es hermosa a su manera.", creator: "Reflejo" },
  { text: "Invertir en tu imagen es invertir en ti.", creator: "Emprendimiento" },
  { text: "Las manos que embellecen, tocan el alma.", creator: "Arte" },
  { text: "La confianza es la mejor belleza.", creator: "Reflejo" },
  { text: "Un buen servicio vale más que mil palabras.", creator: "Negocios" },
  { text: "La paciencia es la madre del arte.", creator: "Sabiduría" },
  { text: "Cada detalle cuenta cuando se hace con amor.", creator: "Pasión" },
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

  const quote = QUOTES[quoteIndex];

  return (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ 
            fontSize: isMobile ? '1.5rem' : '2rem', 
            fontWeight: 800, 
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Sparkles size={28} style={{ color: '#d946a8' }} />
            Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', textTransform: 'capitalize' }}>
            {today}
          </p>
        </div>
        <button
          onClick={onRefresh}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem'
          }}
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      {/* Quote */}
      <div style={{
        padding: '20px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(217, 70, 168, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
        border: '1px solid rgba(217, 70, 168, 0.2)',
        marginBottom: '24px'
      }}>
        <p style={{ 
          fontSize: '1.1rem', 
          fontStyle: 'italic', 
          color: 'var(--text-primary)',
          margin: 0
        }}>
          "{quote.text}"
        </p>
        <p style={{ 
          fontSize: '0.85rem', 
          color: 'var(--text-muted)',
          marginTop: '8px',
          textAlign: 'right'
        }}>
          — {quote.creator}
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(217, 70, 168, 0.15) 0%, rgba(217, 70, 168, 0.05) 100%)',
          border: '1px solid rgba(217, 70, 168, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Ingresos Hoy</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#d946a8', margin: '8px 0 0 0' }}>
                ${formatCurrency(stats?.income || 0)}
              </h3>
            </div>
            <div style={{
              padding: '10px',
              borderRadius: '12px',
              background: 'rgba(217, 70, 168, 0.2)'
            }}>
              <TrendingUp size={20} color="#d946a8" />
            </div>
          </div>
        </div>

        <div style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Ingresos Semana</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#8b5cf6', margin: '8px 0 0 0' }}>
                ${formatCurrency(stats?.weeklyIncome || 0)}
              </h3>
            </div>
            <div style={{
              padding: '10px',
              borderRadius: '12px',
              background: 'rgba(139, 92, 246, 0.2)'
            }}>
              <Calendar size={20} color="#8b5cf6" />
            </div>
          </div>
        </div>

        <div style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Total Clientes</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#22c55e', margin: '8px 0 0 0' }}>
                {stats?.clients || 0}
              </h3>
            </div>
            <div style={{
              padding: '10px',
              borderRadius: '12px',
              background: 'rgba(34, 197, 94, 0.2)'
            }}>
              <Users size={20} color="#22c55e" />
            </div>
          </div>
        </div>

        <div style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.05) 100%)',
          border: '1px solid rgba(234, 179, 8, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Servicios Hoy</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#eab308', margin: '8px 0 0 0' }}>
                {stats?.appointments || 0}
              </h3>
            </div>
            <div style={{
              padding: '10px',
              borderRadius: '12px',
              background: 'rgba(234, 179, 8, 0.2)'
            }}>
              <Scissors size={20} color="#eab308" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
          Ingresos de la Semana
        </h3>
        <div style={{ height: isMobile ? '200px' : '300px' }}>
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
                  grid: { color: 'rgba(255,255,255,0.05)' },
                  ticks: { color: 'var(--text-muted)' }
                },
                y: {
                  grid: { color: 'rgba(255,255,255,0.05)' },
                  ticks: { 
                    color: 'var(--text-muted)',
                    callback: (value) => `$${value}`
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Team Performance */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
          Rendimiento del Equipo
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {(dbData?.staff || []).map(member => (
            <div
              key={member.id}
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #d946a8 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}>
                  {member.name?.charAt(0) || '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{member.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{member.role}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hoy</div>
                  <div style={{ fontWeight: 600, color: '#d946a8' }}>
                    ${formatCurrency(member.stats?.income || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Semana</div>
                  <div style={{ fontWeight: 600, color: '#8b5cf6' }}>
                    ${formatCurrency(member.stats?.weeklyIncome || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mes</div>
                  <div style={{ fontWeight: 600, color: '#22c55e' }}>
                    ${formatCurrency(member.stats?.monthlyIncome || 0)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardModule;
