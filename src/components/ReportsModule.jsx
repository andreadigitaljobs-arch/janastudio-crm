import { useState, useMemo } from 'react';
import {
  Download, Calendar, ChevronDown, TrendingUp, TrendingDown,
  Users, Target, Clock, Star, Filter, FileText, Settings,
  BarChart3, PieChart, Activity, ArrowUpRight, ArrowDownRight,
  CheckCircle, AlertCircle, Zap, Eye
} from 'lucide-react';

const formatBs = (val) => Number(val || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const REPORT_COLORS = {
  pink: '#c48b9f',
  pinkLight: 'rgba(196,139,159,0.1)',
  green: '#32d74b',
  red: '#ff453a',
  orange: '#ff9f0a',
  purple: '#bf5af2',
  blue: '#0a84ff',
  teal: '#30d158',
};

const DonutChart = ({ data, size = 160 }) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  let cumulative = 0;

  const arcs = data.map((d, i) => {
    const start = (cumulative / total) * 360;
    cumulative += d.value;
    const end = (cumulative / total) * 360;
    const startRad = ((start - 90) * Math.PI) / 180;
    const endRad = ((end - 90) * Math.PI) / 180;
    const largeArc = end - start > 180 ? 1 : 0;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((d, i) => (
        <path key={i} d={d} fill={data[i].color} opacity="0.85" />
      ))}
      <circle cx={cx} cy={cy} r={radius * 0.55} fill="white" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--text-primary)">Total</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="13" fontWeight="900" fill="var(--pink-primary)">Bs. {formatBs(total)}</text>
    </svg>
  );
};

const MiniLineChart = ({ data, width = 500, height = 200, color = '#c48b9f', label }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.y)) || 1;
  const min = 0;
  const padX = 40;
  const padY = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = data.map((d, i) => ({
    x: padX + (i / (data.length - 1 || 1)) * chartW,
    y: padY + chartH - ((d.y - min) / (max - min || 1)) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padY + chartH} L ${points[0].x} ${padY + chartH} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${label})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="white" stroke={color} strokeWidth="2" />
      ))}
      {data.map((d, i) => (
        <text key={i} x={points[i].x} y={height - 4} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{d.label}</text>
      ))}
    </svg>
  );
};

const HorizontalBar = ({ label, value, maxVal, color = '#c48b9f', amount }) => {
  const pct = maxVal > 0 ? (value / maxVal) * 100 : 0;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>Bs. {formatBs(amount || value)}</span>
      </div>
      <div style={{ height: '8px', background: '#f0e4e8', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.6s ease' }}></div>
      </div>
    </div>
  );
};

const HeatMapCell = ({ intensity }) => {
  const bg = intensity === 0 ? '#faf5f5'
    : intensity === 1 ? 'rgba(196,139,159,0.15)'
    : intensity === 2 ? 'rgba(196,139,159,0.35)'
    : intensity === 3 ? 'rgba(196,139,159,0.55)'
    : 'rgba(196,139,159,0.8)';
  return (
    <div style={{ width: '100%', height: '28px', borderRadius: '4px', background: bg, transition: 'background 0.3s' }}></div>
  );
};

const ReportsModule = ({ isMobile, rates, staff = [], services = [], clients = [] }) => {
  const [periodo, setPeriodo] = useState('30');
  const [sucursal, setSucursal] = useState('all');
  const [especialista, setEspecialista] = useState('all');
  const [servicio, setServicio] = useState('all');
  const [comparar, setComparar] = useState('prev');

  const dropdownStyle = {
    padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border-color)',
    background: 'white', color: 'var(--text-primary)', fontSize: '12px', fontWeight: '600',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0,
    outline: 'none'
  };

  const sectionCard = {
    padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'white'
  };

  const statCard = {
    padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'white'
  };

  const ingresosTotales = 48320;
  const citasCompletadas = 386;
  const ticketPromedio = 295.56;
  const tasaRetencion = 74;

  const serviciosData = [
    { name: 'Balayage Premium', value: 12540, color: '#c48b9f' },
    { name: 'Extensiones de Pestañas', value: 8320, color: '#bf5af2' },
    { name: 'Botox Capilar', value: 6780, color: '#ff9f0a' },
    { name: 'Uñas Acrílicas', value: 4980, color: '#30d158' },
    { name: 'Limpieza Facial Premium', value: 3210, color: '#0a84ff' },
  ];

  const distribucionVentas = [
    { name: 'Cabello', value: 42.3, color: '#c48b9f' },
    { name: 'Uñas', value: 22.7, color: '#bf5af2' },
    { name: 'Pestañas', value: 14.9, color: '#ff9f0a' },
    { name: 'Facial', value: 12.6, color: '#30d158' },
    { name: 'Combos', value: 7.5, color: '#0a84ff' },
  ];

  const chartIngresos = [
    { label: '4 may', y: 28000 }, { label: '11 may', y: 32000 }, { label: '18 may', y: 29500 },
    { label: '25 may', y: 35000 }, { label: '1 jun', y: 38000 }, { label: '8 jun', y: 34500 },
    { label: '15 jun', y: 42000 }, { label: '22 jun', y: 39000 }, { label: '29 jun', y: 45000 }, { label: '4 jul', y: 48320 },
  ];

  const chartReservas = [
    { label: '4 may', y: 280 }, { label: '11 may', y: 310 }, { label: '18 may', y: 295 },
    { label: '25 may', y: 340 }, { label: '1 jun', y: 370 }, { label: '8 jun', y: 330 },
    { label: '15 jun', y: 400 }, { label: '22 jun', y: 385 }, { label: '29 jun', y: 420 }, { label: '4 jul', y: 440 },
  ];

  const teamPerformance = [
    { rank: 1, name: 'Isabella R.', avatar: 'I', ingresos: 14820, citas: 118, rendimiento: 92, color: '#c48b9f' },
    { rank: 2, name: 'Valeria M.', avatar: 'V', ingresos: 13460, citas: 104, rendimiento: 88, color: '#bf5af2' },
    { rank: 3, name: 'Camila P.', avatar: 'C', ingresos: 10250, citas: 87, rendimiento: 78, color: '#ff9f0a' },
    { rank: 4, name: 'Sofia A.', avatar: 'S', ingresos: 9790, citas: 77, rendimiento: 72, color: '#30d158' },
  ];

  const heatMapData = [
    { day: 'Lunes', hours: [0, 1, 2, 3, 2, 3, 3, 2, 1, 1, 0, 0, 1, 2, 3, 3, 2, 1, 0] },
    { day: 'Martes', hours: [0, 1, 1, 2, 3, 3, 2, 2, 1, 1, 0, 0, 1, 2, 3, 3, 2, 1, 0] },
    { day: 'Miércoles', hours: [0, 0, 1, 2, 2, 3, 3, 2, 1, 0, 0, 0, 1, 2, 2, 3, 2, 1, 0] },
    { day: 'Jueves', hours: [0, 1, 2, 3, 3, 3, 2, 2, 1, 1, 0, 0, 1, 3, 3, 3, 2, 1, 0] },
    { day: 'Viernes', hours: [0, 1, 2, 3, 3, 3, 3, 3, 2, 1, 0, 0, 2, 3, 3, 3, 3, 2, 1] },
    { day: 'Sábado', hours: [0, 1, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0, 2, 3, 3, 3, 3, 2, 1] },
    { day: 'Domingo', hours: [0, 0, 1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0] },
  ];

  const clientesRecurrentes = [
    { num: 1, name: 'María Gabriela López', visits: 8, lastService: 'Balayage Premium', total: 4850, avatar: 'ML' },
    { num: 2, name: 'Andrea Valentina Ruiz', visits: 7, lastService: 'Extensiones de Pestañas', total: 3760, avatar: 'AR' },
    { num: 3, name: 'Daniela Sofia Mendoza', visits: 6, lastService: 'Botox Capilar', total: 3240, avatar: 'DM' },
    { num: 4, name: 'Valentina Herrera', visits: 5, lastService: 'Uñas Acrílicas', total: 2890, avatar: 'VH' },
    { num: 5, name: 'Alejandra Jana Pérez', visits: 5, lastService: 'Limpieza Facial Premium', total: 2610, avatar: 'AP' },
  ];

  return (
    <div>
      <div className="mi-enter-up" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '28px', 
        padding: '12px 0 16px 0', 
        flexWrap: 'wrap', 
        gap: '20px',
        position: 'relative',
        width: '100%'
      }}>
        {/* Background Ambient Glow */}
        <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(212,160,154,0.18) 0%, rgba(212,160,154,0) 70%)', pointerEvents: 'none', zIndex: 0 }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 }}>
          <div style={{ width: isMobile ? '38px' : '46px', height: isMobile ? '38px' : '46px', borderRadius: isMobile ? '12px' : '14px', background: 'var(--magenta-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(160, 80, 106, 0.15)', flexShrink: 0 }}>
            <BarChart3 size={isMobile ? 16 : 20} color="white" />
          </div>
    <div className="mi-enter-up">
            <h1 className="jana-page-title" style={{ margin: 0, fontSize: isMobile ? '20px' : '28px', letterSpacing: '-0.6px', fontWeight: '850', color: 'var(--text-primary)' }}>
              Reportes
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: isMobile ? '12px' : '14px', fontWeight: '500' }}>
              Métricas, análisis y decisiones para el crecimiento del salón.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
          <button className="mi-btn" style={{ padding: '10px 20px', borderRadius: '12px', border: '2px solid var(--pink-primary)', background: 'white', color: 'var(--pink-primary)', fontWeight: '800', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>
            <Download size={16} /> Exportar PDF
          </button>
          <button className="btn-pink mi-btn" style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>
            <Calendar size={16} /> Programar Reporte
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '28px' }}>
        <div style={{ ...dropdownStyle, flex: isMobile ? '1 1 45%' : '1 1 auto' }}>
          <Calendar size={14} color="var(--pink-primary)" />
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ ...dropdownStyle, border: 'none', padding: 0, background: 'transparent', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none', flex: 1 }}>
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="365">Último año</option>
          </select>
        </div>
        <div style={{ ...dropdownStyle, flex: isMobile ? '1 1 45%' : '1 1 auto' }}>
          <BarChart3 size={14} color="var(--pink-primary)" />
          <select value={sucursal} onChange={e => setSucursal(e.target.value)} style={{ border: 'none', padding: 0, background: 'transparent', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none', flex: 1 }}>
            <option value="all">Todas las sucursales</option>
            <option value="principal">Sucursal Principal</option>
          </select>
        </div>
        <div style={{ ...dropdownStyle, flex: isMobile ? '1 1 45%' : '1 1 auto' }}>
          <Users size={14} color="var(--pink-primary)" />
          <select value={especialista} onChange={e => setEspecialista(e.target.value)} style={{ border: 'none', padding: 0, background: 'transparent', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none', flex: 1 }}>
            <option value="all">Todos los especialistas</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ ...dropdownStyle, flex: isMobile ? '1 1 45%' : '1 1 auto' }}>
          <Star size={14} color="var(--pink-primary)" />
          <select value={servicio} onChange={e => setServicio(e.target.value)} style={{ border: 'none', padding: 0, background: 'transparent', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none', flex: 1 }}>
            <option value="all">Todos los servicios</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ ...dropdownStyle, flex: isMobile ? '1 1 45%' : '1 1 auto' }}>
          <Activity size={14} color="var(--pink-primary)" />
          <select value={comparar} onChange={e => setComparar(e.target.value)} style={{ border: 'none', padding: 0, background: 'transparent', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none', flex: 1 }}>
            <option value="prev">Comparar período</option>
            <option value="none">Sin comparación</option>
          </select>
        </div>
      </div>

      <section className="mi-enter-up mi-delay-1" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'INGRESOS TOTALES', value: `Bs. ${formatBs(ingresosTotales)}`, icon: <BarChart3 size={14} />, trend: '+12.4%', trendUp: true, sub: 'vs período anterior' },
          { label: 'CITAS COMPLETADAS', value: citasCompletadas.toString(), icon: <CheckCircle size={14} />, trend: '+8.1%', trendUp: true, sub: 'vs período anterior' },
          { label: 'TICKET PROMEDIO', value: `Bs. ${formatBs(ticketPromedio)}`, icon: <Target size={14} />, trend: '+5.9%', trendUp: true, sub: 'vs período anterior' },
          { label: 'TASA DE RETENCIÓN', value: `${tasaRetencion}%`, icon: <Users size={14} />, trend: '+6.3%', trendUp: true, sub: 'vs período anterior' },
        ].map((s, i) => (
          <div key={i} className={`mi-stat mi-delay-${i + 1}`} style={statCard}>
            <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: REPORT_COLORS.pinkLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.icon}
              </div>
              {s.label}
            </div>
            <div style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.sub}</div>
            <div style={{ fontSize: '11px', color: s.trendUp ? '#32d74b' : '#ff453a', fontWeight: '700', marginTop: '2px' }}>
              {s.trendUp ? <ArrowUpRight size={12} style={{ display: 'inline' }} /> : <ArrowDownRight size={12} style={{ display: 'inline' }} />} {s.trend}
            </div>
          </div>
        ))}
      </section>

      <div className="mi-enter-up mi-delay-2" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px', marginBottom: '28px' }}>
        <div className="mi-card" style={sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>Ingresos y Reservas</h3>
            <select style={{ padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', background: 'white', cursor: 'pointer' }}>
              <option>Por semanas</option>
              <option>Por días</option>
              <option>Por meses</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '3px', borderRadius: '2px', background: '#c48b9f' }}></div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Ingresos (Bs.)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '3px', borderRadius: '2px', background: '#bf5af2', borderStyle: 'dashed' }}></div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Reservas</span>
            </div>
          </div>
          <MiniLineChart data={chartIngresos} color="#c48b9f" label="ingresos" height={180} />
        </div>

        <div className="mi-card" style={sectionCard}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px' }}>Distribución de Ventas</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <DonutChart data={distribucionVentas} size={140} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {distribucionVentas.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }}></div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', minWidth: '70px' }}>{d.name}</span>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)' }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mi-card" style={sectionCard}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px' }}>Objetivos del Mes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              { label: 'Ingresos', current: 48320, target: 60000, unit: 'Bs.', pct: 80, color: '#c48b9f' },
              { label: 'Reservas', current: 386, target: 500, unit: '', pct: 77, color: '#bf5af2' },
              { label: 'Retención', current: 74, target: 75, unit: '%', pct: 99, color: '#32d74b' },
            ].map((o, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{o.label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {o.unit === 'Bs.' ? `Bs. ${formatBs(o.current)} / Bs. ${formatBs(o.target)}` : o.unit === '%' ? `${o.current}% / ${o.target}%` : `${o.current} / ${o.target}`}
                  </span>
                </div>
                <div style={{ height: '8px', background: '#f0e4e8', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: `${Math.min(o.pct, 100)}%`, height: '100%', background: o.color, borderRadius: '4px', transition: 'width 0.8s ease' }}></div>
                </div>
                <div style={{ textAlign: 'right', marginTop: '2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: o.color }}>{o.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mi-enter-up mi-delay-3" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '24px', marginBottom: '28px' }}>
        <div className="mi-card" style={sectionCard}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Servicios Más Rentables</h3>
          {serviciosData.map((s, i) => (
            <HorizontalBar key={i} label={s.name} value={s.value} maxVal={serviciosData[0].value} color={s.color} amount={s.value} />
          ))}
        </div>

        <div className="mi-card" style={sectionCard}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Rendimiento del Equipo</h3>
          {isMobile ? (
            /* MOBILE: tarjetas de especialista */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {teamPerformance.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', background: '#faf5f5', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: t.rank <= 3 ? t.color : 'var(--text-muted)', minWidth: '18px' }}>{t.rank <= 3 ? `#${t.rank}` : t.rank}</span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', color: t.color, flexShrink: 0 }}>{t.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bs. {formatBs(t.ingresos)} · {t.citas} citas</div>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: t.rendimiento >= 85 ? '#32d74b' : t.rendimiento >= 75 ? '#ff9f0a' : '#ff453a', flexShrink: 0 }}>{t.rendimiento}%</span>
                </div>
              ))}
            </div>
          ) : (
            /* DESKTOP: tabla */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: '700' }}>Especialista</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700' }}>Ingresos</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '700' }}>Citas</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '700' }}>Rendimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {teamPerformance.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: t.rank <= 3 ? t.color : 'var(--text-muted)', minWidth: '16px' }}>{t.rank <= 3 ? `#${t.rank}` : t.rank}</span>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `rgba(196,139,159,0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: t.color }}>{t.avatar}</div>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{t.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>Bs. {formatBs(t.ingresos)}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{t.citas}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: t.rendimiento >= 85 ? '#32d74b' : t.rendimiento >= 75 ? '#ff9f0a' : '#ff453a' }}>{t.rendimiento}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mi-card" style={sectionCard}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Horas de Mayor Demanda</h3>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(19, 1fr)', gap: '2px', minWidth: '320px' }}>
              <div></div>
              {Array.from({ length: 19 }, (_, i) => i + 8).map(h => (
                <div key={h} style={{ fontSize: '8px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: '600' }}>{h}</div>
              ))}
              {heatMapData.map((row, ri) => (
                <div key={ri} style={{ display: 'contents' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center' }}>{row.day}</div>
                  {row.hours.map((intensity, hi) => (
                    <HeatMapCell key={`${ri}-${hi}`} intensity={intensity} />
                  ))}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Baja demanda</span>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{ width: '14px', height: '10px', borderRadius: '2px', background: i === 0 ? '#faf5f5' : `rgba(196,139,159,${0.15 + i * 0.17})` }}></div>
              ))}
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Alta demanda</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mi-enter-up mi-delay-4" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '24px', marginBottom: '28px' }}>
        <div className="mi-card" style={sectionCard}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Clientes Recurrentes</h3>
          {isMobile ? (
            /* MOBILE: tarjetas de clientes */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {clientesRecurrentes.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', background: '#faf5f5' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', minWidth: '16px' }}>{c.num}</span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: 'var(--pink-primary)', flexShrink: 0 }}>{c.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.visits} visitas</div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--pink-primary)', flexShrink: 0 }}>Bs. {formatBs(c.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            /* DESKTOP: tabla */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: '700' }}>#</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: '700' }}>Cliente</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '700' }}>Visitas</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: '700' }}>Último Servicio</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700' }}>Total Gastado</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesRecurrentes.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>{c.num}</td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', color: 'var(--pink-primary)' }}>{c.avatar}</div>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{c.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{c.visits}</td>
                      <td style={{ padding: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>{c.lastService}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: '800', color: 'var(--pink-primary)' }}>Bs. {formatBs(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mi-card" style={sectionCard}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Resumen Ejecutivo</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { icon: <BarChart3 size={16} color="#c48b9f" />, text: 'Balayage Premium lidera la facturación.' },
              { icon: <Calendar size={16} color="#bf5af2" />, text: 'Los sábados muestran mayor ocupación.' },
              { icon: <TrendingUp size={16} color="#32d74b" />, text: 'La retención creció respecto al mes anterior.' },
              { icon: <Users size={16} color="#ff9f0a" />, text: 'Valeria M. lidera en número de citas.' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: '#faf5f5' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.5' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mi-card" style={sectionCard}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Recomendaciones</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { icon: <TrendingUp size={16} color="#ff453a" />, title: 'Impulsa los servicios con menor rendimiento', desc: 'Crea estrategias para aumentar la demanda de servicios con baja rotación.' },
              { icon: <Zap size={16} color="#ff9f0a" />, title: 'Crea promociones dirigidas', desc: 'Lanza ofertas en servicios populares para maximizar ingresos.' },
              { icon: <Users size={16} color="#0a84ff" />, title: 'Refuerza el equipo en horas pico', desc: 'Asegura personal suficiente los sábados y en la tarde para optimizar la atención.' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '2px' }}>{r.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{r.desc}</div>
                </div>
                <ChevronDown size={14} color="var(--text-muted)" style={{ transform: 'rotate(-90deg)', flexShrink: 0, marginTop: '4px' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsModule;
