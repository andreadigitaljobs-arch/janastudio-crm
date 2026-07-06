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
import { Line } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler, ArcElement
);

const FALLBACK_APPOINTMENTS = [
  { time: '9:00 AM', client: 'Isabella R.', service: 'Classic Lashes', status: 'Confirmada', initial: 'I' },
  { time: '11:00 AM', client: 'Valentina G.', service: 'Brow Design', status: 'Confirmada', initial: 'V' },
  { time: '1:00 PM', client: 'Mariana S.', service: 'Lash Lift', status: 'Pendiente', initial: 'M' },
  { time: '3:30 PM', client: 'Andrea L.', service: 'Hybrid Set', status: 'Confirmada', initial: 'A' },
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
    if (dbData?.appointments && dbData.appointments.length > 0) {
      // Map and sort upcoming appointments
      return dbData.appointments
        .filter(apt => apt.status !== 'Completado' && apt.status !== 'Cancelado')
        .slice(0, 5)
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
    }
    return FALLBACK_APPOINTMENTS;
  }, [dbData]);

  // Chart configuration to look like mockup (pink minimalist line chart)
  const mainChartData = useMemo(() => {
    const hasData = chartData?.datasets?.[0]?.data?.some(v => v > 0);
    const dataPoints = hasData ? chartData.datasets[0].data : [700, 1200, 950, 1500, 1254, 1800, 2100];
    
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Revenue',
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
          label: (context) => `Revenue: $${context.parsed.y}`
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
          callback: (value) => `$${value}`
        },
        border: { display: false },
        min: 0
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.35s ease' }}>
      
      {/* Asymmetric Desktop Layout: Left main column, Right sidebar panel */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px', alignItems: 'stretch' }}>
        
        {/* Left Column: Banner, Stats grid, Bottom row */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Main Hero Banner: Elevate beauty. Empower confidence. */}
          <div style={{
            background: 'linear-gradient(135deg, #eae1dd 0%, #f6ebe8 100%)',
            borderRadius: '24px',
            padding: isMobile ? '24px' : '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(212, 160, 154, 0.15)',
            minHeight: '220px'
          }}>
            <div style={{ flex: 1, zIndex: 2, display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '55%' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ 
                  fontFamily: "'Playfair Display', Georgia, serif", 
                  fontSize: isMobile ? '1.5rem' : '2rem', 
                  fontStyle: 'italic', 
                  color: 'var(--plum-light)',
                  lineHeight: '1.2'
                }}>Elevate beauty.</span>
                <span style={{ 
                  fontFamily: "'Playfair Display', Georgia, serif", 
                  fontSize: isMobile ? '2rem' : '2.5rem', 
                  fontWeight: '700', 
                  color: 'var(--text-primary)',
                  lineHeight: '1.2'
                }}>Empower confidence.</span>
              </div>
              <button 
                onClick={() => onNavigate('scheduling')}
                style={{
                  alignSelf: 'flex-start',
                  padding: '10px 20px',
                  borderRadius: '100px',
                  background: 'var(--magenta-secondary)',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(160, 80, 106, 0.2)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(160, 80, 106, 0.3)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(160, 80, 106, 0.2)' }}
              >
                View today's agenda
              </button>
            </div>

            {/* Collage Section: Elegant oval cutouts */}
            {!isMobile && (
              <div style={{ 
                position: 'relative', 
                width: '38%', 
                height: '180px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <div style={{
                  width: '90px',
                  height: '130px',
                  borderRadius: '50px',
                  overflow: 'hidden',
                  transform: 'translateY(-15px)',
                  boxShadow: '0 8px 20px rgba(74, 48, 54, 0.1)',
                  border: '3px solid #ffffff'
                }}>
                  <img src="/fondo_carga_mobile.jpeg" alt="Lashes" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{
                  width: '130px',
                  height: '160px',
                  borderRadius: '100px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 25px rgba(74, 48, 54, 0.15)',
                  border: '3px solid #ffffff'
                }}>
                  <img src="/fondo_carga.jpeg" alt="Salon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            )}
          </div>

          {/* Stats grid row */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
            gap: '16px' 
          }}>
            {/* Stats Card: Clients */}
            <div className="glass-card" style={{ 
              padding: '20px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Clients</span>
                <span style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {stats?.clients || dbData?.clients?.length || 248}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--magenta-secondary)', fontWeight: '600' }}>+18 New this month</span>
              </div>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #fff2f4 0%, #fae1e6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'inset 0 2px 6px rgba(160, 80, 106, 0.05)',
                border: '1px solid rgba(160, 80, 106, 0.05)',
                color: 'var(--magenta-primary)'
              }}>
                <Users size={24} />
              </div>
            </div>

            {/* Stats Card: Service Catalog */}
            <div className="glass-card" style={{ 
              padding: '20px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Service Catalog</span>
                <span style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {dbData?.services?.length || 24}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Most booked: Classic Lashes</span>
              </div>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #f6eee9 0%, #eadcd5 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'inset 0 2px 6px rgba(212, 160, 154, 0.05)',
                border: '1px solid rgba(212, 160, 154, 0.05)',
                color: 'var(--pink-primary)'
              }}>
                <Scissors size={24} />
              </div>
            </div>

            {/* Stats Card: Team */}
            <div className="glass-card" style={{ 
              padding: '20px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Team</span>
                <span style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {dbData?.staff?.length || 6}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--magenta-secondary)', fontWeight: '600' }}>2 On shift today</span>
              </div>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #fff2f4 0%, #fae1e6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'inset 0 2px 6px rgba(160, 80, 106, 0.05)',
                border: '1px solid rgba(160, 80, 106, 0.05)',
                color: 'var(--magenta-primary)'
              }}>
                <Sparkles size={24} />
              </div>
            </div>
          </div>

          {/* Bottom Grid: Loyalty, Reports, Grow your studio */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
            gap: '16px' 
          }}>
            {/* Loyalty Gold Club card */}
            <div className="glass-card" style={{ padding: '20px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>Loyalty</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--magenta-secondary)', fontWeight: '600', cursor: 'pointer' }}>View all</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--pink-primary)' }}>Gold Club</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>128 Active members</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>320 pts Avg. balance</span>
                </div>
                
                {/* Visual mini VIP card */}
                <div style={{
                  width: '95px', height: '62px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #e8c4be 0%, #d4a09a 50%, #b8708a 100%)',
                  boxShadow: '0 4px 10px rgba(184, 112, 138, 0.25)',
                  padding: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  color: '#ffffff', position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{ fontSize: '0.45rem', fontWeight: '800', letterSpacing: '0.5px' }}>JANA STUDIO</div>
                  <div style={{ fontSize: '0.55rem', fontWeight: '700', alignSelf: 'flex-end', color: 'rgba(255,255,255,0.9)' }}>GOLD CLUB</div>
                </div>
              </div>
            </div>

            {/* Reports Revenue card */}
            <div className="glass-card" style={{ padding: '20px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>Reports</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--magenta-secondary)', fontWeight: '600', cursor: 'pointer' }}>View all</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  ${stats?.monthlyIncome ? formatBs(stats.monthlyIncome) : '12,840'}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  ↑ 18% <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>vs Apr 22</span>
                </span>
              </div>
              
              {/* Minimal Line chart */}
              <div style={{ height: '55px', width: '100%', marginTop: 'auto' }}>
                <Line data={mainChartData} options={chartOptions} />
              </div>
            </div>

            {/* Grow your studio promo card */}
            <div className="glass-card" style={{ 
              padding: '20px', 
              backgroundColor: '#ffffff', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div>
                <span style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', fontFamily: "'Playfair Display', Georgia, serif" }}>Grow your studio</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: '1.3' }}>
                  Discover insights and tools to grow your business.
                </p>
              </div>

              <button 
                onClick={() => onNavigate('reports')}
                style={{
                  alignSelf: 'flex-start',
                  padding: '8px 16px',
                  borderRadius: '100px',
                  background: '#eae1dd',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  zIndex: 2,
                  marginTop: '12px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e2d5cf'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#eae1dd'}
              >
                See reports
              </button>

              {/* Styled flower icon overlapping background */}
              <div style={{
                position: 'absolute', bottom: '-15px', right: '-15px',
                opacity: 0.15, color: 'var(--magenta-primary)', zIndex: 1
              }}>
                <Flower2 size={95} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar Panel: Upcoming Appointments */}
        <div className="glass-card" style={{
          width: isMobile ? '100%' : '320px',
          backgroundColor: '#ffffff',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '20px',
          minHeight: '450px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ 
                fontSize: '1.15rem', 
                fontWeight: '700', 
                color: 'var(--text-primary)', 
                fontFamily: "'Playfair Display', Georgia, serif",
                margin: 0
              }}>Upcoming Appointments</h3>
              <span 
                onClick={() => onNavigate('scheduling')}
                style={{ fontSize: '0.72rem', color: 'var(--magenta-secondary)', fontWeight: '600', cursor: 'pointer' }}
              >
                View all
              </span>
            </div>

            {/* Appointments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
              {upcomingAppointments.map((apt, idx) => {
                const sStyle = getStatusStyle(apt.status);
                return (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 0',
                    borderBottom: idx < upcomingAppointments.length - 1 ? '1px solid rgba(212, 160, 154, 0.1)' : 'none'
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
            <Plus size={16} /> New Appointment
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardModule;
