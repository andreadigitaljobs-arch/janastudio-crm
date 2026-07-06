import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Scissors, 
  ShoppingBag, 
  Clock, 
  Star, 
  Wrench, 
  Plus, 
  Trash2, 
  TrendingUp,
  Loader2
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import { useDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';
import JanaSelect from './JanaSelect';
import { useScrollLock } from '../hooks/useScrollLock';
import AnimatedModal from './AnimatedModal';
import { createPortal } from 'react-dom';

const asArray = (value) => Array.isArray(value) ? value : [];

const StaffProfileModal = ({ isOpen, onClose, staffMember, inventory = [], onUpdate, isMobile }) => {
  const { user } = useAuth();
  const isAdmin = user?.role?.startsWith('Admin');
  
  const isMobileView = isMobile || (typeof window !== 'undefined' && window.innerWidth < 768);
  const { showToast } = useNotifs();
  const { confirm } = useDialog();
  const [activeTab, setActiveTab] = useState('rendimiento');
  const [loading, setLoading] = useState(true);

  useScrollLock(isOpen);
  
  // Stats State
  const [stats, setStats] = useState({
    totalAppointments: 0,
    totalServiceComm: 0,
    totalProductComm: 0,
    totalTips: 0,
    topServices: [],
    avgDurationMin: 0
  });

  // Inventory State
  const [tools, setTools] = useState([]);
  const [showAddTool, setShowAddTool] = useState(false);
  const [newTool, setNewTool] = useState({ name: '', brand: '', ownership: 'Propia', status: 'Operativa', inventory_id: '' });

  useEffect(() => {
    if (isOpen && staffMember) {
      loadProfileData();
      setTools(asArray(staffMember.tools));
    }
  }, [isOpen, staffMember]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const profileStats = await dataService.getStaffProfileStats(staffMember.id);
      setStats(profileStats);
    } catch (error) {
      console.error('Error loading stats:', error);
      showToast('Error cargando métricas del estilista', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTool = async () => {
    if (newTool.ownership === 'Propia') {
      if (!newTool.name || !newTool.brand) {
        showToast('Ingresa nombre y marca', 'warning');
        return;
      }
    } else {
      if (!newTool.inventory_id) {
        showToast('Selecciona una herramienta del inventario', 'warning');
        return;
      }
    }

    try {
      setLoading(true);
      let toolToAdd = { ...newTool, id: Date.now().toString(), date_added: new Date().toISOString() };

      if (newTool.ownership === 'Asignada') {
        const invItem = inventory.find(i => i.id === newTool.inventory_id);
        if (invItem) {
          toolToAdd.name = invItem.name;
          toolToAdd.brand = invItem.category; // Or any other field
          await dataService.updateInventoryItem(invItem.id, { staff_id: staffMember.id });
        }
      }

      const updatedTools = [...tools, toolToAdd];
      await dataService.updateStaffTools(staffMember.id, updatedTools);
      setTools(updatedTools);
      setNewTool({ name: '', brand: '', ownership: 'Propia', status: 'Operativa', inventory_id: '' });
      setShowAddTool(false);
      showToast('Herramienta asignada');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error saving tool:', error);
      showToast('Error al guardar herramienta', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTool = async (toolId) => {
    if (!await confirm('¿Seguro que deseas eliminar esta herramienta del inventario del estilista?')) return;
    try {
      setLoading(true);
      const toolToRemove = tools.find(t => t.id === toolId);
      
      // If it was assigned from global inventory, return it to stock
      if (toolToRemove && toolToRemove.inventory_id) {
        await dataService.updateInventoryItem(toolToRemove.inventory_id, { staff_id: null });
      }

      const updatedTools = tools.filter(t => t.id !== toolId);
      await dataService.updateStaffTools(staffMember.id, updatedTools);
      setTools(updatedTools);
      showToast('Herramienta removida y regresada al almacén general');
      if (onUpdate) onUpdate();
    } catch (error) {
      showToast('Error al eliminar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const availableInventoryTools = asArray(inventory).filter(i => 
    (i.category === 'Herramienta' || i.category === 'Accesorios') && !i.staff_id
  );

  // Remove early return to allow AnimatedModal exit animations
  // if (!isOpen || !staffMember) return null;
  if (!staffMember) return null;

  return createPortal(
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={overlayClass} style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className={`${cardClass}`} style={{
            width: '100%',
            maxWidth: '800px',
            maxHeight: isMobileView ? '95vh' : '90vh',
            borderRadius: isMobileView ? '24px' : '32px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            background: 'linear-gradient(145deg, rgba(22,22,28,0.98) 0%, rgba(14,14,18,0.99) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(196,139,159,0.08)'
          }}>
        
        {/* Header Section */}
        <div style={{ 
          padding: isMobileView ? '24px 16px 16px' : '32px 32px 24px', 
          background: 'linear-gradient(90deg, rgba(196,139,159,0.06) 0%, transparent 60%)', 
          borderBottom: '1px solid rgba(255,255,255,0.06)' 
        }}>
          <button 
            onClick={onClose}
            style={{ 
              position: 'absolute', 
              top: isMobileView ? '16px' : '24px', 
              right: isMobileView ? '16px' : '24px', 
              background: 'rgba(255,255,255,0.06)', 
              border: '1px solid rgba(255,255,255,0.08)', 
              borderRadius: '50%', 
              width: '40px', 
              height: '40px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--text-muted)', 
              cursor: 'pointer', 
              zIndex: 10,
              transition: 'all 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,69,58,0.15)'; e.currentTarget.style.color = '#ff453a'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <X size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? '16px' : '24px' }}>
            <div style={{ 
              width: isMobileView ? '70px' : '90px', 
              height: isMobileView ? '70px' : '90px', 
              borderRadius: isMobileView ? '16px' : '24px', 
              backgroundColor: 'rgba(255,255,255,0.05)', 
              overflow: 'hidden', 
              border: '2px solid var(--pink-primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0 
            }}>
              {staffMember.image_url ? (
                <img src={staffMember.image_url} alt={staffMember.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={40} color="var(--pink-primary)" opacity={0.5} />
              )}
            </div>
            <div>
              <h2 style={{ fontSize: isMobileView ? '22px' : '28px', fontWeight: '900', color: 'white', margin: 0 }}>{staffMember.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--pink-primary)', fontWeight: '700', fontSize: isMobileView ? '12px' : '14px', marginTop: '4px' }}>
                <Star size={14} fill="var(--pink-primary)" />
                {staffMember.role?.split('|')[0] || 'Estilista'}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobileView ? '8px' : '16px', marginTop: isMobileView ? '20px' : '32px' }}>
            <button 
              onClick={() => setActiveTab('rendimiento')}
              className="astro-tab-btn"
              style={{ 
                padding: isMobileView ? '10px 8px' : '12px 24px', 
                borderRadius: '50px', 
                background: activeTab === 'rendimiento' ? 'var(--pink-primary)' : 'rgba(255,255,255,0.05)', 
                color: activeTab === 'rendimiento' ? 'black' : 'white', 
                fontWeight: '800', 
                border: 'none', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px', 
                fontSize: isMobileView ? '11px' : '14px' 
              }}
            >
              <TrendingUp size={isMobileView ? 14 : 18} /> {isMobileView ? 'Rendimiento' : 'Rendimiento Histórico'}
            </button>
            <button 
              onClick={() => setActiveTab('inventario')}
              className="astro-tab-btn"
              style={{ 
                padding: isMobileView ? '10px 8px' : '12px 24px', 
                borderRadius: '50px', 
                background: activeTab === 'inventario' ? 'var(--pink-primary)' : 'rgba(255,255,255,0.05)', 
                color: activeTab === 'inventario' ? 'black' : 'white', 
                fontWeight: '800', 
                border: 'none', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px', 
                fontSize: isMobileView ? '11px' : '14px' 
              }}
            >
              <Wrench size={isMobileView ? 14 : 18} /> {isMobileView ? 'Inventario' : 'Inventario Personal'}
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div style={{ padding: isMobileView ? '20px 16px' : '32px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <Loader2 className="animate-spin" size={48} color="var(--pink-primary)" />
            </div>
          ) : activeTab === 'rendimiento' ? (
            <div className="animate-fade-in">
              {/* Top Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : 'repeat(3, 1fr)', gap: isMobileView ? '12px' : '16px', marginBottom: isMobileView ? '20px' : '32px' }}>
                <div 
                  style={{ 
                    background: 'rgba(255,255,255,0.025)', 
                    padding: isMobileView ? '16px' : '24px', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(255,255,255,0.06)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: isMobileView ? '12px' : '20px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(50,215,75,0.1)', color: '#32d74b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Scissors size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '1px', marginBottom: '4px' }}>COMISIONES SERVICIOS</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: 'white' }}>${stats.totalServiceComm.toFixed(2)}</div>
                  </div>
                </div>
                <div 
                  style={{ 
                    background: 'rgba(255,255,255,0.025)', 
                    padding: isMobileView ? '16px' : '24px', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(255,255,255,0.06)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: isMobileView ? '12px' : '20px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(10,132,255,0.1)', color: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '1px', marginBottom: '4px' }}>COMISIONES PRODUCTOS</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: 'white' }}>${stats.totalProductComm.toFixed(2)}</div>
                  </div>
                </div>
                <div 
                  style={{ 
                    background: 'rgba(196,139,159,0.025)', 
                    padding: isMobileView ? '16px' : '24px', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(196,139,159,0.12)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: isMobileView ? '12px' : '20px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(196,139,159,0.04)'; e.currentTarget.style.borderColor = 'rgba(196,139,159,0.25)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(196,139,159,0.025)'; e.currentTarget.style.borderColor = 'rgba(196,139,159,0.12)'; }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(196,139,159,0.1)', color: 'var(--pink-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '1px', marginBottom: '4px' }}>TOTAL PROPINAS</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--pink-primary)' }}>${(stats.totalTips || 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr', gap: isMobileView ? '16px' : '24px' }}>
                {/* Time & Volume */}
                <div 
                  style={{ 
                    background: 'rgba(196,139,159,0.025)', 
                    padding: '24px', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(196,139,159,0.12)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(196,139,159,0.04)'; e.currentTarget.style.borderColor = 'rgba(196,139,159,0.25)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(196,139,159,0.025)'; e.currentTarget.style.borderColor = 'rgba(196,139,159,0.12)'; }}
                >
                  <h4 style={{ color: 'var(--pink-primary)', fontSize: '14px', fontWeight: '900', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} /> Volumen y Tiempos
                  </h4>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Servicios Totales</span>
                    <span style={{ color: 'white', fontWeight: '900', fontSize: '18px' }}>{stats.totalAppointments}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Tiempo Promedio</span>
                    <span style={{ color: 'white', fontWeight: '900', fontSize: '18px' }}>{stats.avgDurationMin > 0 ? `${stats.avgDurationMin} min` : 'N/A'}</span>
                  </div>
                </div>

                {/* Top Services */}
                <div 
                  style={{ 
                    background: 'rgba(255,255,255,0.025)', 
                    padding: '24px', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <h4 style={{ color: 'white', fontSize: '14px', fontWeight: '900', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={16} color="var(--pink-primary)" /> Servicios Más Realizados
                  </h4>
                  
                  {stats.topServices.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {stats.topServices.map((srv, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '14px' }}>{srv.name}</span>
                          <span style={{ background: 'rgba(196,139,159,0.1)', color: 'var(--pink-primary)', padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '800' }}>{srv.count} veces</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>No hay datos suficientes</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>Equipamiento de {staffMember.name.split(' ')[0]}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Control de herramientas asignadas o propias.</p>
                </div>
                <button 
                  onClick={() => setShowAddTool(!showAddTool)}
                  style={{ 
                    background: showAddTool ? 'rgba(255,255,255,0.06)' : 'var(--pink-primary)', 
                    color: showAddTool ? 'white' : 'black', 
                    border: showAddTool ? '1px solid rgba(255,255,255,0.08)' : 'none', 
                    padding: '10px 20px', 
                    borderRadius: '50px', 
                    fontWeight: '800', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    transition: 'all 0.2s' 
                  }}
                  onMouseOver={e => {
                    if (showAddTool) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    } else {
                      e.currentTarget.style.background = '#c48b9f';
                    }
                  }}
                  onMouseOut={e => {
                    if (showAddTool) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    } else {
                      e.currentTarget.style.background = 'var(--pink-primary)';
                    }
                  }}
                >
                  {showAddTool ? 'Cancelar' : <><Plus size={16} /> Añadir Herramienta</>}
                </button>
              </div>

              {showAddTool && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px', marginBottom: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    
                    {newTool.ownership === 'Propia' ? (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px' }}>TIPO / NOMBRE</label>
                          <input className="form-input" placeholder="Ej. Máquina Clipper" value={newTool.name} onChange={e => setNewTool({...newTool, name: e.target.value})} style={{ height: '44px', width: '100%' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px' }}>MARCA / MODELO</label>
                          <input className="form-input" placeholder="Ej. Wahl Magic Clip" value={newTool.brand} onChange={e => setNewTool({...newTool, brand: e.target.value})} style={{ height: '44px', width: '100%' }} />
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                        <JanaSelect 
                          label="Seleccionar del almacén (herramientas libres)"
                          value={newTool.inventory_id} 
                          onChange={(val) => setNewTool({...newTool, inventory_id: val})} 
                          options={[
                            { value: '', label: '-- Selecciona una herramienta del inventario --' },
                            ...availableInventoryTools.map(item => ({ value: item.id, label: item.name }))
                          ]}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <JanaSelect 
                        label="Pertenencia"
                        value={newTool.ownership} 
                        onChange={(val) => setNewTool({...newTool, ownership: val})} 
                        disabled={!isAdmin}
                        options={[
                          { value: 'Propia', label: 'Propia del Estilista' },
                          ...(isAdmin ? [{ value: 'Asignada', label: 'Asignada (JanaStudio)' }] : [])
                        ]}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <JanaSelect 
                        label="Estado"
                        value={newTool.status} 
                        onChange={(val) => setNewTool({...newTool, status: val})} 
                        options={[
                          { value: 'Operativa', label: 'Operativa' },
                          { value: 'En Mantenimiento', label: 'En Mantenimiento' },
                          { value: 'Dañada', label: 'Dañada' }
                        ]}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleAddTool} 
                    style={{ 
                      width: '100%', 
                      background: 'white', 
                      color: 'black', 
                      border: 'none', 
                      borderRadius: '50px', 
                      height: '44px', 
                      fontWeight: '800', 
                      cursor: 'pointer', 
                      transition: 'all 0.2s' 
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#e5e5e5'}
                    onMouseOut={e => e.currentTarget.style.background = 'white'}
                  >
                    Guardar Herramienta
                  </button>
                </div>
              )}

              {tools.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <Wrench size={40} color="var(--text-muted)" opacity={0.5} style={{ marginBottom: '16px' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No hay herramientas registradas para este empleado.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {tools.map(tool => (
                    <div 
                      key={tool.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: 'rgba(255,255,255,0.025)', 
                        padding: isMobileView ? '12px 16px' : '16px 24px', 
                        borderRadius: '20px', 
                        border: '1px solid rgba(255,255,255,0.06)', 
                        flexWrap: 'wrap', 
                        gap: '12px',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? '12px' : '16px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: tool.ownership === 'Asignada' ? 'rgba(196,139,159,0.1)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Wrench size={18} color={tool.ownership === 'Asignada' ? 'var(--pink-primary)' : 'white'} />
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', color: 'white', fontSize: '15px' }}>{tool.name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600' }}>{tool.brand}</div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: '800', 
                            padding: '2px 10px', 
                            borderRadius: '50px', 
                            background: tool.ownership === 'Asignada' ? 'var(--pink-primary)' : 'rgba(255,255,255,0.08)', 
                            color: tool.ownership === 'Asignada' ? 'black' : 'white',
                            border: tool.ownership === 'Asignada' ? 'none' : '1px solid rgba(255,255,255,0.08)'
                          }}>
                            {tool.ownership}
                          </span>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: '800', 
                            padding: '2px 10px', 
                            borderRadius: '50px', 
                            background: tool.status === 'Operativa' ? 'rgba(50,215,75,0.12)' : tool.status === 'En Mantenimiento' ? 'rgba(255,159,10,0.12)' : 'rgba(255,69,58,0.12)', 
                            color: tool.status === 'Operativa' ? '#32d74b' : tool.status === 'En Mantenimiento' ? '#ff9f0a' : '#ff453a',
                            border: `1px solid ${tool.status === 'Operativa' ? 'rgba(50,215,75,0.15)' : tool.status === 'En Mantenimiento' ? 'rgba(255,159,10,0.15)' : 'rgba(255,69,58,0.15)'}`
                          }}>
                            {tool.status}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleRemoveTool(tool.id)} 
                          style={{ 
                            background: 'rgba(255,69,58,0.08)', 
                            border: '1px solid rgba(255,69,58,0.15)', 
                            padding: '8px 10px', 
                            borderRadius: '10px', 
                            cursor: 'pointer', 
                            color: '#ff453a',
                            transition: 'all 0.2s', 
                            display: 'flex', 
                            alignItems: 'center' 
                          }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,69,58,0.18)'}
                          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,69,58,0.08)'}
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>

        </div>
      </div>
      )}
    </AnimatedModal>,
    document.body
  );
};

export default StaffProfileModal;
