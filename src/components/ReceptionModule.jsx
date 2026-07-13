import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, Search, UserPlus, Sparkles, Calendar, Zap, CheckCircle2,
  Clock, ArrowRight, ShoppingBag, X, Package, Edit3, Receipt,
  Trash2, Rocket, MoreVertical, StickyNote, BarChart3, Play, Pause, Eye
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import { normalizeForSearch } from '../utils/stringUtils';
import NewClientModal from './NewClientModal';
import ScheduleModal from './ScheduleModal';
import JanaDialog from './JanaDialog';
import { useScrollLock } from '../hooks/useScrollLock';
import { supabase } from '../lib/supabase';

const DEMO_WAITING = [
  { name: 'Sofía M.', arrived: '10:20 AM', status: 'En espera', initial: 'S' },
  { name: 'Jana V.', arrived: '10:35 AM', status: 'Lista', initial: 'J' },
  { name: 'Laura G.', arrived: '10:40 AM', status: 'Pasando', initial: 'L' },
  { name: 'Diana R.', arrived: '10:45 AM', status: 'En espera', initial: 'D' },
];

const DEMO_UPCOMING = [
  { time: '11:00 AM', client: 'Valentina S.', service: 'Uñas Acrílicas', staff: 'Valeria M.', status: 'Confirmada', initial: 'V' },
  { time: '12:30 PM', client: 'Daniela P.', service: 'Limpieza Facial Premium', staff: 'Camila P.', status: 'Pendiente', initial: 'D' },
  { time: '3:30 PM', client: 'Andrea L.', service: 'Extensiones de Pestañas', staff: 'Isabella R.', status: 'Confirmada', initial: 'A' },
];

const DEMO_STAFF = [
  { name: 'Isabella R.', role: 'Estilista Senior', initial: 'I', available: true },
  { name: 'Valeria M.', role: 'Nail Artist', initial: 'V', available: true },
  { name: 'Camila P.', role: 'Esteticista', initial: 'C', available: true },
];

const ReceptionModule = ({ isMobile }) => {
  const { showToast, triggerRocket } = useNotifs();
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [allExtras, setAllExtras] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [idSearch, setIdSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [activeAppointments, setActiveAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(58);
  const [dialog, setDialog] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null });
  const [formData, setFormData] = useState({ serviceId: '', staffId: '', status: 'En Silla' });

  const loadData = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [c, s, st, active, ext, inv, allApps, ratesData] = await Promise.all([
        dataService.getClients(),
        dataService.getServices(),
        dataService.getStaff(),
        dataService.getAppointmentsByState(['En Silla', 'Agendado']),
        dataService.getExtras(),
        dataService.getSaleInventoryCatalog(),
        dataService.getAppointments(todayStart.toISOString(), todayEnd.toISOString()),
        dataService.getExchangeRates()
      ]);
      setClients(c || []);
      setServices(s || []);
      setStaff((st || []).filter(m => {
        const r = (m.role?.split('|')[0] || '').toLowerCase();
        return !r.includes('admin') && !r.includes('recepcionista') && !r.includes('caja');
      }));
      setActiveAppointments((active || []).filter(a => a.status === 'En Silla'));
      setAllExtras(ext || []);
      setInventory((inv || []).filter(i => i.is_for_sale !== false && i.category === 'Venta'));
      setUpcomingAppointments(allApps || []);
      if (ratesData) {
        const activeType = localStorage.getItem('jana_active_rate') || 'usdt';
        setExchangeRate(activeType === 'bcv' ? (ratesData.bcv || 36.5) : (ratesData.usdt || 43.2));
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    loadData();
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') loadData(); };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => document.removeEventListener('visibilitychange', refreshOnFocus);
  }, []);

  const handleSearchInput = (val) => {
    setIdSearch(val);
    if (val.length >= 1) {
      const term = normalizeForSearch(val);
      const results = (Array.isArray(clients) ? clients : []).filter(c => {
        const n = normalizeForSearch(c.name || '');
        return n.split(' ').some(w => w.startsWith(term)) || (c.id_card || '').toLowerCase().includes(term);
      });
      setSearchResults(results.slice(0, 5));
    } else { setSearchResults([]); }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setIdSearch('');
    setSearchResults([]);
  };

  const toggleService = (serviceId) => {
    const exists = selectedServices.find(s => s.id === serviceId);
    if (exists) { setSelectedServices(selectedServices.filter(s => s.id !== serviceId)); return; }
    const service = services.find(s => s.id === serviceId);
    if (service) setSelectedServices([...selectedServices, { ...service, staffId: formData.staffId || null }]);
  };

  const setServiceStaff = (serviceId, staffId) => {
    setSelectedServices(selectedServices.map(s => s.id === serviceId ? { ...s, staffId } : s));
  };

  const toggleExtra = (extra) => {
    const exists = selectedExtras.find(e => e.id === extra.id);
    if (exists) { setSelectedExtras(selectedExtras.filter(e => e.id !== extra.id)); }
    else { setSelectedExtras([...selectedExtras, { ...extra, customPrice: extra.price }]); }
  };

  const toggleProduct = (product) => {
    const exists = selectedProducts.find(p => p.id === product.id);
    if (exists) { setSelectedProducts(selectedProducts.filter(p => p.id !== product.id)); }
    else { setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]); }
  };

  const handleSubmit = async (statusOverride, scheduledAt = null) => {
    if (!selectedClient) { showToast("Selecciona un cliente primero", "error"); return; }
    if (selectedServices.length === 0 && selectedExtras.length === 0 && selectedProducts.length === 0) {
      showToast("Agrega al menos un servicio, extra o producto", "error"); return;
    }
    if (selectedServices.some(s => !s.staffId)) {
      showToast("Asigna una profesional a cada servicio de la orden", "error"); return;
    }
    try {
      setLoading(true);

      const appointment = await dataService.createAppointmentWithServices(
        {
          client_id: selectedClient.id,
          status: statusOverride || formData.status,
          scheduled_at: scheduledAt
        },
        selectedServices.map(s => ({
          service_id: s.id,
          staff_id: s.staffId,
          price_paid: s.price
        }))
      );

      const extraPromises = selectedExtras.map(extra =>
        dataService.addExtraToAppointment(appointment.id, null, extra.id, extra.customPrice ?? extra.price)
      );
      const productPromises = selectedProducts.map(prod =>
        dataService.addProductToAppointment(appointment.id, prod.id, prod.quantity, prod.price)
      );
      await Promise.all([...extraPromises, ...productPromises]);

      showToast("¡Orden procesada!");
      setSelectedClient(null); setSelectedServices([]); setSelectedExtras([]); setSelectedProducts([]);
      setFormData({ serviceId: '', staffId: '', status: 'En Silla' });
      loadData();
    } catch (error) { console.error(error); showToast("Error al procesar orden", "error"); }
    finally { setLoading(false); }
  };

  const subtotal = selectedServices.reduce((a, s) => a + s.price, 0) +
    selectedExtras.reduce((a, e) => a + (e.customPrice ?? e.price), 0) +
    selectedProducts.reduce((a, p) => a + (p.price * p.quantity), 0);
  const discount = subtotal * 0.05;
  const total = subtotal - discount;

  const card = {
    padding: '14px', borderRadius: '14px', background: '#fff',
    border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
  };

  return (
    <div className="animate-fade-in mi-enter-up" style={{ paddingBottom: '40px' }}>
      {/* Header */}
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
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'var(--magenta-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(160, 80, 106, 0.15)', flexShrink: 0 }}>
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <h1 className="jana-page-title" style={{ margin: 0, fontSize: '28px', letterSpacing: '-0.6px', fontWeight: '850', color: 'var(--text-primary)' }}>
              Recepción Jana
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px', fontWeight: '500' }}>
              Módulo de atención y agendamiento rápido.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setIsNewClientModalOpen(true)} style={{
            padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)',
            background: '#fff', color: '#6b6b6b', fontSize: '0.78rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
          }}><UserPlus size={15} /> Nuevo Cliente</button>
          <button className="mi-btn" style={{
        </div>
      </div>

      {/* Main Grid */}
      <div className="mi-enter-up mi-delay-1" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: '18px', alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Step 1: Cliente */}
          <div style={{ ...card, position: 'relative', zIndex: searchResults.length > 0 ? 99 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} color="#c48b9f" />
                <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#2d2d2d' }}>1. Cliente</span>
              </div>
          <button className="mi-btn" onClick={() => setIsNewClientModalOpen(true)} style={{
                background: 'rgba(196,139,159,0.08)', border: 'none', color: '#c48b9f',
                padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}><UserPlus size={12} /> Nuevo</button>
            </div>

            {selectedClient ? (
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(196,139,159,0.05)', border: '1px solid rgba(196,139,159,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #c48b9f, #a0506a)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 600, fontSize: '0.85rem'
                    }}>{selectedClient.name?.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#2d2d2d' }}>{selectedClient.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#9e9e9e', marginTop: '2px' }}>📞 {selectedClient.phone || 'Sin teléfono'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className="mi-tag" style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(196,139,159,0.08)', color: '#c48b9f', fontSize: '0.62rem', fontWeight: 600 }}>⭐ Frecuente</span>
                    <span className="mi-tag" style={{ padding: '3px 8px', borderRadius: '6px', background: '#f0fdf4', color: '#16a34a', fontSize: '0.62rem', fontWeight: 600 }}>✓ Confirmada</span>
                    <button className="mi-btn" onClick={() => setSelectedClient(null)} style={{ background: 'none', border: 'none', color: '#9e9e9e', cursor: 'pointer' }}>
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)', background: '#faf5f5' }}>
                  <Search size={14} color="#9e9e9e" />
                  <input
                    className="mi-input"
                    type="text" placeholder="Buscar por nombre, cédula o teléfono..."
                    value={idSearch} onChange={(e) => handleSearchInput(e.target.value)}
                    style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '0.75rem', color: '#2d2d2d' }}
                  />
                  <button className="mi-btn" onClick={() => { if (searchResults.length > 0) handleSelectClient(searchResults[0]); }} style={{
                    width: '30px', height: '30px', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg, #c48b9f, #a0506a)',
                    color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}><ArrowRight size={14} /></button>
                </div>
                {searchResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px',
                    background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px',
                    overflow: 'hidden', zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
                  }}>
                    {searchResults.map(c => (
                      <div key={c.id} onClick={() => handleSelectClient(c)} style={{
                        padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.03)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem'
                      }}>
                        <span style={{ fontWeight: 600, color: '#2d2d2d' }}>{c.name}</span>
                        <span style={{ fontSize: '0.68rem', color: '#c48b9f', fontWeight: 600 }}>V-{c.id_card}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Detalle de la Orden */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Receipt size={16} color="#c48b9f" />
              <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#2d2d2d' }}>2. Detalle de la Orden</span>
            </div>

            {/* Add buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              {[
                { label: '+ Servicio', icon: Sparkles, color: '#c48b9f', bg: 'rgba(196,139,159,0.06)', border: 'rgba(196,139,159,0.2)', onClick: () => setIsServiceModalOpen(true) },
                { label: '+ Extra', icon: Rocket, color: '#d97706', bg: 'rgba(217,119,6,0.06)', border: 'rgba(217,119,6,0.2)', onClick: () => setIsExtraModalOpen(true) },
                { label: '+ Producto', icon: ShoppingBag, color: '#16a34a', bg: 'rgba(22,163,74,0.06)', border: 'rgba(22,163,74,0.2)', onClick: () => setIsProductModalOpen(true) },
              ].map((btn, i) => (
                    <button key={i} className="mi-btn" onClick={btn.onClick} style={{
                  padding: '12px 8px', borderRadius: '10px', border: `1px dashed ${btn.border}`,
                  background: btn.bg, color: btn.color, fontSize: '0.7rem', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'
                }}>
                  <btn.icon size={16} /> {btn.label}
                </button>
              ))}
            </div>

            {/* Order items */}
            {(selectedServices.length > 0 || selectedExtras.length > 0 || selectedProducts.length > 0) && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.5fr 1fr 0.5fr 0.8fr', gap: '6px', padding: '6px 8px', fontSize: '0.6rem', color: '#9e9e9e', fontWeight: 600, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <span>Concepto</span><span>Cant.</span><span>Estilista</span><span>Duración</span><span style={{ textAlign: 'right' }}>Precio</span>
                </div>
                {selectedServices.map(s => (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '2fr 0.5fr 1fr 0.5fr 0.8fr', gap: '6px', padding: '8px', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.03)', fontSize: '0.72rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#2d2d2d' }}>{s.name}</div>
                      <div style={{ fontSize: '0.6rem', color: '#9e9e9e' }}>Servicio</div>
                    </div>
                    <span style={{ color: '#6b6b6b' }}>1</span>
                    <select
                      value={s.staffId || ''}
                      onChange={(e) => setServiceStaff(s.id, e.target.value)}
                      style={{
                        fontSize: '0.64rem', padding: '4px 4px', borderRadius: '6px',
                        border: s.staffId ? '1px solid rgba(0,0,0,0.1)' : '1.5px solid #dc2626',
                        background: s.staffId ? '#fff' : '#fef2f2', color: '#2d2d2d', maxWidth: '100%'
                      }}
                    >
                      <option value="">Elegir...</option>
                      {staff.map(st => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                    <span style={{ color: '#6b6b6b' }}>{s.duration_minutes || 60} min</span>
                    <div style={{ textAlign: 'right', fontWeight: 600, color: '#2d2d2d' }}>Bs. {(s.price * exchangeRate).toFixed(2)}</div>
                  </div>
                ))}
                {selectedServices.some(s => !s.staffId) && (
                  <div style={{ padding: '6px 8px', fontSize: '0.65rem', color: '#dc2626', fontWeight: 600 }}>
                    ⚠️ Asigna una profesional a cada servicio antes de continuar
                  </div>
                )}
                {selectedProducts.map(p => (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 0.5fr 1fr 0.5fr 0.8fr', gap: '6px', padding: '8px', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.03)', fontSize: '0.72rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#2d2d2d' }}>{p.name}</div>
                      <div style={{ fontSize: '0.6rem', color: '#9e9e9e' }}>Producto</div>
                    </div>
                    <span style={{ color: '#6b6b6b' }}>{p.quantity || 1}</span>
                    <span style={{ color: '#6b6b6b' }}>—</span>
                    <span style={{ color: '#6b6b6b' }}>—</span>
                    <div style={{ textAlign: 'right', fontWeight: 600, color: '#2d2d2d' }}>Bs. {(p.price * exchangeRate).toFixed(2)}</div>
                  </div>
                ))}

                <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                    <span style={{ color: '#6b6b6b' }}>Subtotal</span>
                    <span style={{ color: '#2d2d2d' }}>Bs. {(subtotal * exchangeRate).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '6px' }}>
                    <span style={{ color: '#6b6b6b' }}>Descuento</span>
                    <span style={{ color: '#dc2626' }}>- Bs. {(discount * exchangeRate).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                    <span style={{ fontWeight: 700, color: '#2d2d2d', fontSize: '0.85rem' }}>Total</span>
                    <span style={{ fontWeight: 700, color: '#c48b9f', fontSize: '1rem' }}>Bs. {(total * exchangeRate).toFixed(2)}</span>
                  </div>
                    <button className="mi-btn" onClick={() => handleSubmit('En Silla')} disabled={loading || !selectedClient || selectedServices.some(s => !s.staffId)} style={{
                    width: '100%', marginTop: '10px', padding: '10px', borderRadius: '10px', border: 'none',
                    background: 'linear-gradient(135deg, #d4a09a, #c48b9f, #a0506a)',
                    color: '#fff', fontSize: '0.78rem', fontWeight: 600,
                    cursor: (loading || !selectedClient || selectedServices.some(s => !s.staffId)) ? 'not-allowed' : 'pointer',
                    opacity: (loading || !selectedClient || selectedServices.some(s => !s.staffId)) ? 0.6 : 1,
                    boxShadow: '0 3px 10px rgba(196,139,159,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}>Continuar a Pago →</button>
                </div>
              </div>
            )}

            {/* Estilistas Disponibles */}
            <div style={{ marginTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Users size={14} color="#c48b9f" />
                <span style={{ fontWeight: 600, fontSize: '0.75rem', color: '#2d2d2d' }}>Estilistas Disponibles</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {DEMO_STAFF.map((s, i) => (
                    <button className="mi-btn" onClick={() => setFormData({ ...formData, staffId: staff[i]?.id || '' })} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px',
                    borderRadius: '10px', border: formData.staffId === (staff[i]?.id) ? '1.5px solid #c48b9f' : '1px solid rgba(0,0,0,0.06)',
                    background: formData.staffId === (staff[i]?.id) ? 'rgba(196,139,159,0.06)' : '#faf5f5',
                    cursor: 'pointer', fontSize: '0.7rem'
                  }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #c48b9f, #a0506a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: '0.65rem' }}>{s.initial}</div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, color: '#2d2d2d' }}>{s.name}</div>
                      <div style={{ fontSize: '0.58rem', color: '#16a34a' }}>● Disponible</div>
                    </div>
                  </button>
                ))}
                  <button className="mi-btn" style={{
                    padding: '6px 10px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)',
                    background: 'transparent', color: '#c48b9f', fontSize: '0.68rem', fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                  }}><Users size={12} /> Ver todos</button>
              </div>
            </div>

            {/* Próximas Citas */}
            <div style={{ marginTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Calendar size={14} color="#c48b9f" />
                <span style={{ fontWeight: 600, fontSize: '0.75rem', color: '#2d2d2d' }}>Próximas Citas (Agenda Hoy)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(upcomingAppointments.length > 0 ? upcomingAppointments : DEMO_UPCOMING.map(d => ({
                  id: `mock-${d.client}`,
                  scheduled_at: new Date().toISOString(),
                  clients: { name: d.client, phone: '0412-0000000' },
                  services: { name: d.service },
                  staff_id: d.staff,
                  status: d.status
                }))).map((apt, idx) => {
                  const sc = apt.status === 'Confirmada' || apt.status === 'Agendado' || apt.status === 'Completado' 
                    ? { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' } 
                    : { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };

                  const start = new Date(apt.scheduled_at);
                  const timeStr = start.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true });
                  const clientName = apt.clients?.name || 'Cliente';
                  const specialistName = staff.find(s => s.id === apt.staff_id)?.name || 'Especialista';

                  return (
                    <div
                      key={apt.id || idx}
                      onClick={async () => {
                        if (String(apt.id).startsWith('mock-')) {
                          showToast('Esta es una cita de demostración. Crea una cita real desde Agenda o Recepción para interactuar.', 'warning');
                          return;
                        }
                        const opt = window.prompt(
                          `¿Qué deseas hacer con la cita de ${clientName}?\n` +
                          `1. Cambiar estado\n` +
                          `2. Posponer / Retrasar\n` +
                          `3. Eliminar / Cancelar\n` +
                          `Escribe el número de la opción:`
                        );
                        if (opt === '1') {
                          const newStatus = window.prompt('Introduce el nuevo estado (Agendado, En Silla, En Tratamiento, Por Pagar, Completado):');
                          if (newStatus) {
                            try {
                              setLoading(true);
                              await dataService.updateAppointment(apt.id, { status: newStatus });
                              showToast('Estado actualizado', 'success');
                              loadData();
                            } catch (err) {
                              showToast('Error al actualizar estado', 'error');
                            } finally {
                              setLoading(false);
                            }
                          }
                        } else if (opt === '2') {
                          const minutesInput = window.prompt('¿Cuántos minutos deseas posponer esta cita? (Ej: 30):');
                          if (minutesInput) {
                            try {
                              setLoading(true);
                              const parsedMins = parseInt(minutesInput) || 0;
                              const updatedTime = new Date(start.getTime() + parsedMins * 60000);
                              await dataService.updateAppointment(apt.id, { scheduled_at: updatedTime.toISOString() });
                              showToast(`Cita pospuesta por ${parsedMins} minutos`, 'success');
                              loadData();
                            } catch (err) {
                              showToast('Error al posponer cita', 'error');
                            } finally {
                              setLoading(false);
                            }
                          }
                        } else if (opt === '3') {
                          const confirmDel = window.confirm(`¿Segura de que quieres eliminar la cita de ${clientName}?`);
                          if (confirmDel) {
                            try {
                              setLoading(true);
                              await dataService.deleteAppointment(apt.id);
                              showToast('Cita eliminada permanentemente', 'success');
                              loadData();
                            } catch (err) {
                              showToast('Error al eliminar cita', 'error');
                            } finally {
                              setLoading(false);
                            }
                          }
                        }
                      }}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', 
                        borderRadius: '10px', background: '#faf5f5', fontSize: '0.72rem', cursor: 'pointer',
                        transition: 'transform 0.15s ease'
                      }}
                      className="btn-hover-scale mi-row"
                    >
                      <div style={{ width: '50px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, color: '#c48b9f', fontSize: '0.75rem' }}>{timeStr.split(' ')[0]}</div>
                        <div style={{ fontSize: '0.58rem', color: '#9e9e9e' }}>{timeStr.split(' ')[1]}</div>
                      </div>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #c48b9f, #a0506a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: '0.68rem', flexShrink: 0 }}>
                        {clientName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#2d2d2d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clientName}</div>
                        <div style={{ fontSize: '0.62rem', color: '#9e9e9e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>- {apt.services?.name || 'Servicio'}</div>
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#6b6b6b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {specialistName.split(' ')[0]}
                      </div>
                      <span className="mi-tag" style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '0.58rem', fontWeight: 600, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                        {apt.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Módulo de Espera */}
          <div style={{ ...card, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: '-20px', right: '-20px',
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(196,139,159,0.06)'
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2d2d2d', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="#c48b9f" /> Módulo de Espera
              </h4>
              <button className="mi-btn" style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.06)', background: 'transparent', color: '#c48b9f', fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer' }}>Ver todo →</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {DEMO_WAITING.map((w, i) => {
                const wsc = w.status === 'Lista' ? { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' } :
                  w.status === 'Pasando' ? { bg: '#fffbeb', text: '#d97706', border: '#fde68a' } :
                  { bg: '#faf5f5', text: '#6b6b6b', border: 'rgba(0,0,0,0.06)' };
                return (
                  <div key={i} className="mi-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', background: '#faf5f5' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #c48b9f, #a0506a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: '0.68rem', flexShrink: 0 }}>{w.initial}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#2d2d2d', fontSize: '0.75rem' }}>{w.name}</div>
                      <div style={{ fontSize: '0.6rem', color: '#9e9e9e' }}>Llegó: {w.arrived}</div>
                    </div>
                    <span className="mi-tag" style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '0.58rem', fontWeight: 600, background: wsc.bg, color: wsc.text, border: `1px solid ${wsc.border}` }}>{w.status}</span>
                    <button className="mi-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9e9e9e' }}><MoreVertical size={12} /></button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumen Rápido */}
          <div style={card}>
            <h4 style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2d2d2d', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart3 size={14} color="#c48b9f" /> Resumen Rápido
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
              {[
                { label: 'Clientes en espera', value: 4, color: '#c48b9f' },
                { label: 'En atención', value: 2, color: '#c48b9f' },
                { label: 'Citas de hoy', value: 12, color: '#c48b9f' },
                { label: 'Walk-ins', value: 3, color: '#c48b9f' },
              ].map((s, i) => (
                <div key={i} className="mi-stat" style={{ textAlign: 'center', padding: '8px 4px', borderRadius: '10px', background: '#faf5f5' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2d2d2d' }}>{s.value}</div>
                  <div style={{ fontSize: '0.55rem', color: '#9e9e9e', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Occupancy Donut */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'conic-gradient(#c48b9f 0% 68%, rgba(196,139,159,0.12) 68% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#2d2d2d' }}>68%</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2d2d2d', marginBottom: '6px' }}>Ocupación del día</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#c48b9f' }} />
                    <span style={{ color: '#6b6b6b' }}>Horas ocupadas</span>
                    <span style={{ fontWeight: 600, color: '#2d2d2d', marginLeft: 'auto' }}>7h 30m</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(196,139,159,0.12)' }} />
                    <span style={{ color: '#6b6b6b' }}>Horas disponibles</span>
                    <span style={{ fontWeight: 600, color: '#2d2d2d', marginLeft: 'auto' }}>3h 30m</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.65rem', color: '#6b6b6b', marginBottom: '6px' }}>Meta diaria: 75%</div>
            <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(196,139,159,0.12)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '68%', borderRadius: '3px', background: 'linear-gradient(90deg, #c48b9f, #a0506a)' }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.6rem', color: '#9e9e9e', marginTop: '4px' }}>68%</div>
          </div>

          {/* Notas de Recepción */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2d2d2d', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <StickyNote size={14} color="#c48b9f" /> Notas de Recepción
              </h4>
                <button className="mi-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c48b9f' }}><Edit3 size={13} /></button>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#6b6b6b', lineHeight: '1.5' }}>
              <p style={{ margin: '0 0 6px 0' }}>Recordar promoción de hidratación capilar.</p>
              <p style={{ margin: 0 }}>Revisar stock de productos de coloración.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <NewClientModal isOpen={isNewClientModalOpen} onClose={() => setIsNewClientModalOpen(false)} onSuccess={(c) => { setClients([...clients, c]); setSelectedClient(c); setIsNewClientModalOpen(false); }} />
      <ScheduleModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} client={selectedClient} staff={staff} initialStaff={staff.find(s => s.id === formData.staffId)} service={selectedServices[0]} onSchedule={(date) => handleSubmit('Agendado', date)} />
      <JanaDialog isOpen={dialog.isOpen} title={dialog.title} message={dialog.message} type={dialog.type} onConfirm={dialog.onConfirm} onCancel={() => setDialog({ ...dialog, isOpen: false })} confirmText="Confirmar" cancelText="Cancelar" />
      {isServiceModalOpen && <SelectionModal isOpen={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} title="Seleccionar Servicios" items={services} selectedItems={selectedServices} onToggle={(s) => toggleService(s.id)} exchangeRate={exchangeRate} type="service" />}
      {isExtraModalOpen && <SelectionModal isOpen={isExtraModalOpen} onClose={() => setIsExtraModalOpen(false)} title="Añadir Extras" items={allExtras} selectedItems={selectedExtras} onToggle={toggleExtra} exchangeRate={exchangeRate} type="extra" />}
      {isProductModalOpen && <SelectionModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Venta de Productos" items={inventory} selectedItems={selectedProducts} onToggle={toggleProduct} exchangeRate={exchangeRate} type="product" />}
    </div>
  );
};

const SelectionModal = ({ isOpen, onClose, title, items, selectedItems, onToggle, exchangeRate = 58, type }) => {
  useScrollLock(isOpen);
  if (!isOpen) return null;
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
      zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: '500px', maxHeight: '80vh', background: '#fff',
        borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#2d2d2d', margin: 0 }}>{title}</h3>
          <button className="mi-btn" onClick={onClose} style={{ background: '#faf5f5', border: 'none', borderRadius: '8px', width: '28px', height: '28px', color: '#6b6b6b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(items || []).map(item => {
            const isSel = selectedItems?.find(si => si.id === item.id);
            return (
                <button className="mi-btn mi-row" key={item.id} onClick={() => onToggle(item)} style={{
                padding: '12px', borderRadius: '12px',
                border: isSel ? '1.5px solid #c48b9f' : '1px solid rgba(0,0,0,0.06)',
                background: isSel ? 'rgba(196,139,159,0.05)' : '#faf5f5',
                textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', width: '100%'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#2d2d2d', fontSize: '0.82rem' }}>{item.name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#9e9e9e', marginTop: '2px' }}>Bs. {(item.price * exchangeRate).toFixed(2)}</div>
                </div>
                {isSel && <CheckCircle2 size={18} color="#c48b9f" />}
              </button>
            );
          })}
        </div>
        <button className="mi-btn" onClick={onClose} style={{
          marginTop: '16px', padding: '10px', borderRadius: '10px', border: 'none',
          background: 'linear-gradient(135deg, #c48b9f, #a0506a)',
          color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer'
        }}>LISTO</button>
      </div>
    </div>,
    document.body
  );
};

export default ReceptionModule;
