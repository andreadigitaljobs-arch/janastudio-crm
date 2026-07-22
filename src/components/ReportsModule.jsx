import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Calendar, Loader2, TrendingUp, AlertTriangle } from 'lucide-react';
import { dataService } from '../services/dataService';

const usd = (value) => `$${Number(value || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ReportsModule = ({ isMobile, rates }) => {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - days);
      try {
        const data = await dataService.getProfitabilityReport(start.toISOString(), end.toISOString());
        if (active) setRows(data);
      } catch (reportError) {
        console.error(reportError);
        if (active) setError('No se pudo cargar la rentabilidad. Verifica que la migración esté aplicada.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [days]);

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    revenue: acc.revenue + Number(row.actual_revenue || 0),
    materials: acc.materials + Number(row.actual_material_cost || 0),
    staff: acc.staff + Number(row.actual_staff_cost || 0),
    profit: acc.profit + Number(row.actual_profit || 0),
    services: acc.services + Number(row.services_completed || 0),
  }), { revenue: 0, materials: 0, staff: 0, profit: 0, services: 0 }), [rows]);

  const sorted = useMemo(() => [...rows].sort((a, b) => Number(b.estimated_profit) - Number(a.estimated_profit)), [rows]);
  const card = { background: 'white', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' };

  return (
    <div className="mi-enter-up" style={{ paddingBottom: '70px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--magenta-gradient)', display: 'grid', placeItems: 'center' }}><BarChart3 size={20} color="white" /></div>
          <div><h1 className="jana-page-title" style={{ margin: 0, fontSize: isMobile ? '21px' : '28px' }}>Rentabilidad real</h1><p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>Ingresos menos insumos y pago de la especialista.</p></div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700 }}><Calendar size={15} /> Período <select value={days} onChange={(event) => setDays(Number(event.target.value))} style={{ padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'white' }}><option value={7}>7 días</option><option value={30}>30 días</option><option value={90}>90 días</option><option value={365}>1 año</option></select></label>
      </div>

      {loading ? <div style={{ ...card, textAlign: 'center', padding: '70px' }}><Loader2 className="animate-spin" color="var(--pink-primary)" /></div> : error ? <div style={{ ...card, color: '#b42318' }}><AlertTriangle size={18} /> {error}</div> : <>
        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: '12px', marginBottom: '22px' }}>
          {[['Ingresos', totals.revenue], ['Insumos', totals.materials], ['Especialistas', totals.staff], ['Ganancia salón', totals.profit], ['Servicios realizados', totals.services, true]].map(([label, value, integer]) => <div key={label} style={card}><div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>{label}</div><div style={{ fontSize: isMobile ? '19px' : '23px', fontWeight: 900, marginTop: '7px', color: label === 'Ganancia salón' ? '#198754' : 'var(--text-primary)' }}>{integer ? value : usd(value)}</div>{!integer && rates?.usd > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>Ref. Bs. {(Number(value) * rates.usd).toLocaleString('es-VE', { maximumFractionDigits: 0 })}</div>}</div>)}
        </section>

        {totals.services === 0 && <div style={{ ...card, marginBottom: '22px', background: '#fffaf0', borderColor: '#f5dca8', fontSize: '13px' }}><AlertTriangle size={16} color="#b7791f" style={{ verticalAlign: 'middle', marginRight: '7px' }} />Todavía no hay cobros completados en este período. La tabla muestra la rentabilidad estimada del catálogo; al cobrar, quedará congelado el costo histórico.</div>}

        <div style={{ ...card, overflowX: 'auto' }}>
          <h2 style={{ fontSize: '15px', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '7px' }}><TrendingUp size={17} color="var(--pink-primary)" /> Rentabilidad por servicio</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}><thead><tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>{['Servicio', 'Precio', 'Insumos', 'Pago personal', 'Ganancia estimada', 'Margen', 'Realizados', 'Ganancia real'].map((heading) => <th key={heading} style={{ textAlign: heading === 'Servicio' ? 'left' : 'right', padding: '10px 8px' }}>{heading}</th>)}</tr></thead><tbody>{sorted.map((row) => <tr key={row.service_id} style={{ borderBottom: '1px solid #f3e9eb', fontSize: '12px' }}><td style={{ padding: '11px 8px', fontWeight: 750 }}>{row.service_name}<div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{row.category || 'Sin categoría'}</div></td><td style={{ textAlign: 'right' }}>{usd(row.price)}</td><td style={{ textAlign: 'right' }}>{usd(row.estimated_material_cost)}</td><td style={{ textAlign: 'right' }}>{usd(row.estimated_staff_cost)}</td><td style={{ textAlign: 'right', fontWeight: 850, color: Number(row.estimated_profit) >= 0 ? '#198754' : '#b42318' }}>{usd(row.estimated_profit)}</td><td style={{ textAlign: 'right' }}>{Number(row.estimated_margin || 0).toFixed(1)}%</td><td style={{ textAlign: 'right' }}>{row.services_completed}</td><td style={{ textAlign: 'right', fontWeight: 850 }}>{usd(row.actual_profit)}</td></tr>)}</tbody></table>
        </div>
      </>}
    </div>
  );
};

export default ReportsModule;
