import React, { useEffect, useMemo, useState } from 'react';
import { Percent, Plus, Save, Trash2 } from 'lucide-react';
import { dataService } from '../services/dataService';

const emptyForm = () => ({ name: '', description: '', discount_type: 'percent', discount_value: 10, scope: 'all', service_id: '', category: '', starts_at: new Date().toISOString().slice(0, 10), ends_at: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), active: true });

export default function PromotionsModule({ isMobile }) {
  const [promotions, setPromotions] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    const [rows, catalog] = await Promise.all([dataService.getPromotions(), dataService.getServices()]);
    setPromotions(rows); setServices(catalog);
  };
  useEffect(() => { load().catch(console.error); }, []);
  const categories = useMemo(() => [...new Set(services.map(s => s.category).filter(Boolean))], [services]);
  const save = async () => {
    if (!form.name.trim() || Number(form.discount_value) <= 0) return;
    setSaving(true);
    try {
      await dataService.savePromotion({ ...form, service_id: form.scope === 'service' ? form.service_id || null : null, category: form.scope === 'category' ? form.category || null : null, client_id: null, discount_value: Number(form.discount_value), starts_at: new Date(`${form.starts_at}T00:00:00`).toISOString(), ends_at: new Date(`${form.ends_at}T23:59:59`).toISOString() });
      setForm(emptyForm()); await load();
    } finally { setSaving(false); }
  };
  const field = { height: 42, border: '1px solid var(--border-color)', borderRadius: 12, padding: '0 12px', background: '#fff', color: 'var(--text-primary)' };
  return <div className="animate-fade-in" style={{ paddingBottom: 60 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}><Percent color="var(--pink-primary)"/><div><h1 className="jana-page-title" style={{ margin: 0 }}>Promociones</h1><p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>Descuentos con vigencia y alcance verificable.</p></div></div>
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(300px, 420px) 1fr', gap: 20 }}>
      <section className="agenda-glass-card" style={{ padding: 20 }}><h3 style={{ marginTop: 0 }}><Plus size={16}/> Nueva promoción</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <input style={field} placeholder="Nombre" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <input style={field} placeholder="Descripción" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><select style={field} value={form.discount_type} onChange={e=>setForm({...form,discount_type:e.target.value})}><option value="percent">Porcentaje</option><option value="fixed">Monto USD</option></select><input style={field} type="number" min="0.01" value={form.discount_value} onChange={e=>setForm({...form,discount_value:e.target.value})}/></div>
          <select style={field} value={form.scope} onChange={e=>setForm({...form,scope:e.target.value})}><option value="all">Todos los servicios</option><option value="service">Un servicio</option><option value="category">Una categoría</option></select>
          {form.scope==='service' && <select style={field} value={form.service_id} onChange={e=>setForm({...form,service_id:e.target.value})}><option value="">Selecciona servicio</option>{services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>}
          {form.scope==='category' && <select style={field} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="">Selecciona categoría</option>{categories.map(c=><option key={c}>{c}</option>)}</select>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><input style={field} type="date" value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/><input style={field} type="date" value={form.ends_at} onChange={e=>setForm({...form,ends_at:e.target.value})}/></div>
          <button className="btn-pink" disabled={saving} onClick={save} style={{ height: 44, borderRadius: 12 }}><Save size={16}/> {saving?'Guardando…':'Guardar promoción'}</button>
        </div>
      </section>
      <section style={{ display: 'grid', gap: 12, alignContent: 'start' }}>{promotions.length===0 && <div className="agenda-glass-card" style={{ padding: 30, textAlign:'center', color:'var(--text-secondary)' }}>Todavía no hay promociones configuradas.</div>}{promotions.map(p=>{ const current=p.active && new Date(p.starts_at)<=new Date() && new Date(p.ends_at)>=new Date(); return <div key={p.id} className="agenda-glass-card" style={{ padding:18, display:'flex', justifyContent:'space-between', gap:12 }}><div><strong>{p.name}</strong><div style={{ color:'var(--pink-primary)', fontWeight:800, marginTop:5 }}>{p.discount_type==='percent'?`${p.discount_value}%`:`$${p.discount_value}`} · {p.scope==='all'?'Todo':p.services?.name||p.category}</div><small style={{ color:'var(--text-secondary)' }}>{new Date(p.starts_at).toLocaleDateString()} – {new Date(p.ends_at).toLocaleDateString()} · {current?'Vigente':'Fuera de vigencia'}</small></div><button title="Desactivar" onClick={()=>dataService.deletePromotion(p.id).then(load)} style={{ border:0, background:'transparent', color:'#c97282', cursor:'pointer' }}><Trash2 size={18}/></button></div>})}</section>
    </div>
  </div>;
}
