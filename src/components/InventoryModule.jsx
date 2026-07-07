import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Minus, 
  Search, 
  AlertTriangle, 
  Edit3,
  Loader2,
  TrendingDown,
  ChevronRight,
  Zap,
  Trash2,
  History,
  Tag, 
  Filter, 
  ShieldAlert,
  X,
  Camera,
  TrendingUp,
  Eye,
  Calendar,
  ShoppingCart,
  BarChart3
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useModal } from '../context/ModalContext';
import { createPortal } from 'react-dom';
import JanaSelect from './JanaSelect';
import JanaCamera from './JanaCamera';
import AnimatedModal from './AnimatedModal';

const InventoryModule = ({ isMobile, currency, rates }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const { confirm } = useDialog();
  const { pushModal, popModal } = useModal();
  const [inventory, setInventory] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [newItem, setNewItem] = useState({ 
    name: '', 
    stock: 0, 
    price: 0, 
    cost_price: 0,
    commission_pct: 10,
    category: 'Venta', 
    image_url: '',
    staff_id: null,
    cost_price_dirty: false,
    price_dirty: false,
    stock_dirty: false,
    commission_pct_dirty: false
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [invData, staffData] = await Promise.all([
        dataService.getInventory(),
        dataService.getStaff()
      ]);
      setInventory(invData);
      setStaff(staffData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handeAdjustStock = async (id, currentStock, amount) => {
    try {
      const newStock = Math.max(0, currentStock + amount);
      await dataService.updateStock(id, newStock);
      
      // Log movement
      await dataService.logInventoryMovement({
        product_id: id,
        type: amount > 0 ? 'entry' : 'exit',
        amount: Math.abs(amount),
        reason: 'Ajuste Manual'
      });

      fetchInventory();
    } catch (error) {
      showToast('Error al ajustar stock', 'error');
    }
  };

  const [viewMode, setViewMode] = useState('list'); // 'grid' or 'list'
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'today', 'week', 'month'

  useEffect(() => {
    if (showCamera || showHistoryModal || editingItem) {
      pushModal();
      return () => popModal();
    }
  }, [showCamera, showHistoryModal, editingItem, pushModal, popModal]);

  const handleAddItem = async () => {
    if (!newItem.name || saving) return;
    try {
      setSaving(true);
      // Sanitize object: Only send database-columns
      const { cost_price_dirty, price_dirty, stock_dirty, commission_pct_dirty, ...cleanItem } = newItem;
      
      // Ensure empty strings are treated as 0
      const finalItem = {
        ...cleanItem,
        price: Number(cleanItem.price) || 0,
        cost_price: Number(cleanItem.cost_price) || 0,
        stock: Number(cleanItem.stock) || 0,
        commission_pct: Number(cleanItem.commission_pct) || 0
      };

      const created = await dataService.addInventoryItem(finalItem);
      
      // Log initial movement if stock > 0
      if (finalItem.stock > 0 && created?.id) {
        await dataService.logInventoryMovement({
          product_id: created.id,
          type: 'entry',
          amount: finalItem.stock,
          reason: 'Carga Inicial'
        });
      }

      setShowAddForm(false);
      setNewItem({ name: '', stock: 0, price: 0, cost_price: 0, commission_pct: 10, category: 'Venta', image_url: '', cost_price_dirty: false, price_dirty: false, stock_dirty: false, commission_pct_dirty: false });
      fetchInventory();
      showToast('Producto agregado al almacén');
    } catch (error) {
      console.error(error);
      showToast('Error al agregar item de inventario', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id, name) => {
    if (!await confirm(`¿Estás seguro de que quieres eliminar "${name}" del inventario?`)) return;
    try {
      await dataService.deleteInventoryItem(id);
      fetchInventory();
      showToast('Producto eliminado');
    } catch (error) {
      showToast('Error al eliminar producto', 'error');
    }
  };

  const lowStockCount = inventory.filter(item => item.stock <= 5 && item.category !== 'Accesorios').length;

  const filteredInventory = inventory.filter(item => {
    const searchMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!searchMatch) return false;

    // Filter for stylists: They see everything EXCEPT other stylists' tools
    const isStylist = user?.role === 'Estilista' || user?.role?.startsWith('Estilista|');
    if (isStylist) {
      // If it's a tool, it MUST be mine or have no owner
      if (item.category === 'Herramienta') {
        return String(item.staff_id) === String(user.id);
      }
      // They also see general sales/internal items
    }
    return true;
  });

  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const defaultCategories = ['Todas', 'Cabello', 'Uñas', 'Facial', 'Coloración'];
  const activeProducts = filteredInventory.filter(i => i.active !== false);
  const activeProductsCount = activeProducts.length;
  const lowStockCount2 = activeProducts.filter(i => i.stock > 0 && i.stock <= (i.min_stock || 5) && i.category !== 'Accesorios').length;
  const outOfStockCount = activeProducts.filter(i => i.stock === 0).length;
  const inventoryValue = activeProducts.reduce((sum, i) => sum + ((Number(i.price) || 0) * (Number(i.stock) || 0)), 0);
  const formatBs = (val) => `Bs. ${Number(val).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile ? '120px' : '60px' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
          <Loader2 className="animate-spin" color="var(--pink-primary)" size={40} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px' }}>
          
          {/* LEFT COLUMN */}
          <div style={{ flex: isMobile ? 1 : 3, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>Control de <span className="text-pink">Stock</span></h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Gestión de productos y suministros críticos.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
                <button 
                  className="btn-pink"
                  onClick={async () => {
                    setShowHistoryModal(true);
                    setLoadingHistory(true);
                    try { const data = await dataService.getInventoryMovements(); setHistory(data); } catch (e) { console.error(e); } finally { setLoadingHistory(false); }
                  }}
                  style={{ padding: '10px 20px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <History size={16} /> Movimientos
                </button>
                <button 
                  className="btn-pink"
                  onClick={() => setShowAddForm(!showAddForm)}
                  style={{ padding: '10px 20px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700' }}
                >
                  {showAddForm ? <X size={16} /> : <Plus size={16} />}
                  {showAddForm ? 'Cancelar' : 'Nuevo Producto'}
                </button>
              </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>Nuevo Producto en Inventario</h3>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>NOMBRE</label>
                    <input type="text" placeholder="Ej. Cera Gold Premium" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '0 14px', fontSize: '13px', background: 'white' }} />
                  </div>
                  <JanaSelect label="CATEGORÍA" value={newItem.category} onChange={(val) => setNewItem({...newItem, category: val})} options={[{ label: 'Venta', value: 'Venta' }, { label: 'Uso Interno', value: 'Uso Interno' }, { label: 'Accesorios', value: 'Accesorios' }, { label: 'Herramienta', value: 'Herramienta' }]} />
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>PRECIO COSTO ($)</label>
                    <input type="number" placeholder="0.00" value={newItem.cost_price === 0 && !newItem.cost_price_dirty ? '' : newItem.cost_price} onChange={(e) => setNewItem({...newItem, cost_price: e.target.value === '' ? '' : Number(e.target.value), cost_price_dirty: true})} style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '0 14px', fontSize: '13px' }} />
                  </div>
                  {(newItem.category === 'Venta' || newItem.category === 'Accesorios') && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>PRECIO VENTA ($)</label>
                      <input type="number" placeholder="0.00" value={newItem.price === 0 && !newItem.price_dirty ? '' : newItem.price} onChange={(e) => setNewItem({...newItem, price: e.target.value === '' ? '' : Number(e.target.value), price_dirty: true})} style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '0 14px', fontSize: '13px' }} />
                    </div>
                  )}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>STOCK INICIAL</label>
                    <input type="number" placeholder="0" value={newItem.stock === 0 && !newItem.stock_dirty ? '' : newItem.stock} onChange={(e) => setNewItem({...newItem, stock: e.target.value === '' ? '' : Number(e.target.value), stock_dirty: true})} style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '0 14px', fontSize: '13px' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button className="btn-pink" onClick={handleAddItem} disabled={saving} style={{ width: '100%', height: '44px', borderRadius: '12px', fontSize: '13px', fontWeight: '700' }}>
                      {saving ? <Loader2 className="animate-spin" size={16} /> : 'Registrar Stock'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Search Bar */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" placeholder="Buscar producto, categoría o proveedor..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', paddingLeft: '38px', height: '40px', borderRadius: '12px', fontSize: '13px', background: 'white', border: '1px solid var(--border-color)' }}
                />
              </div>
              <div style={{ display: 'flex', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <button onClick={() => setViewMode('grid')} style={{ padding: '8px 14px', border: 'none', background: viewMode === 'grid' ? 'var(--pink-primary)' : 'white', color: viewMode === 'grid' ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Package size={14} /> Cuadrícula
                </button>
                <button onClick={() => setViewMode('list')} style={{ padding: '8px 14px', border: 'none', background: viewMode === 'list' ? 'var(--pink-primary)' : 'white', color: viewMode === 'list' ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <BarChart3 size={14} /> Lista
                </button>
              </div>
            </div>

            {/* Category Chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {defaultCategories.map(cat => (
                <button key={cat} onClick={() => setCategoryFilter(cat)} style={{ padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', transition: 'all 0.2s', backgroundColor: categoryFilter === cat ? 'var(--pink-primary)' : '#faf5f5', color: categoryFilter === cat ? 'white' : 'var(--text-muted)', border: categoryFilter === cat ? 'none' : '1px solid var(--border-color)' }}>
                  {cat}
                </button>
              ))}
              <button style={{ padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', backgroundColor: '#faf5f5', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} /> Bajo stock
              </button>
              <button style={{ padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', backgroundColor: '#faf5f5', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} /> Agotados
              </button>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c48b9f' }}><Package size={18} /></div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Productos activos</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{activeProductsCount}</div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: '600' }}>↑ 12 este mes</div>
              </div>
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}><AlertTriangle size={18} /></div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Bajo stock</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{lowStockCount2}</div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>↓ -3 vs. mes anterior</div>
              </div>
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}><TrendingUp size={18} /></div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Agotados</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{outOfStockCount}</div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>↑ +1 vs. mes anterior</div>
              </div>
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}><ShoppingCart size={18} /></div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Valor de inventario</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>{formatBs(inventoryValue * (rates?.usd || 550))}</div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: '600' }}>↑ +8% vs. mes anterior</div>
              </div>
            </div>

            {/* Product Table / Cards */}
            <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              {isMobile ? (
                /* ── MOBILE: tarjetas de producto ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {activeProducts.map((item, idx) => {
                    const stockColor = item.stock === 0 ? '#ef4444' : item.stock <= (item.min_stock || 5) ? '#f59e0b' : '#22c55e';
                    const statusLabel = item.stock === 0 ? 'Agotado' : item.stock <= (item.min_stock || 5) ? 'Bajo stock' : 'Óptimo';
                    const statusBg = item.stock === 0 ? 'rgba(239,68,68,0.1)' : item.stock <= (item.min_stock || 5) ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)';
                    return (
                      <div key={item.id} style={{
                        padding: '14px 16px',
                        borderBottom: idx < activeProducts.length - 1 ? '1px solid var(--border-color)' : 'none',
                        display: 'flex', alignItems: 'center', gap: '12px'
                      }}>
                        {/* Imagen */}
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: item.image_url ? 'transparent' : 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                          {item.image_url ? <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} /> : <Package size={18} color="#c48b9f" />}
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.category}</span>
                            <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, background: statusBg, color: stockColor }}>{statusLabel}</span>
                          </div>
                        </div>
                        {/* Stock grande */}
                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: stockColor, lineHeight: 1 }}>{item.stock}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>unid.</div>
                        </div>
                        {/* Acciones compactas */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="action-btn" onClick={() => handeAdjustStock(item.id, item.stock, -1)} style={{ width: '30px', height: '30px', fontSize: '14px' }}><Minus size={12} /></button>
                            <button className="action-btn" onClick={() => handeAdjustStock(item.id, item.stock, 1)} style={{ width: '30px', height: '30px', fontSize: '14px' }}><Plus size={12} /></button>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="action-btn" onClick={() => setEditingItem(item)} style={{ width: '30px', height: '30px' }}><Edit3 size={12} /></button>
                            <button className="action-btn" onClick={() => handleDeleteItem(item.id, item.name)} style={{ width: '30px', height: '30px', color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.05)' }}><Trash2 size={12} /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ── DESKTOP: tabla completa ── */
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#faf5f5', borderBottom: '1px solid var(--border-color)' }}>
                        {['PRODUCTO', 'CATEGORÍA', 'PROVEEDOR', 'STOCK ACTUAL', 'STOCK MÍNIMO', 'PRECIO UNITARIO', 'ÚLTIMO MOVIMIENTO', 'ESTADO', 'ACCIONES'].map(h => (
                          <th key={h} style={{ padding: '12px 14px', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeProducts.map(item => {
                        const stockColor = item.stock === 0 ? '#ef4444' : item.stock <= (item.min_stock || 5) ? '#f59e0b' : '#22c55e';
                        const statusLabel = item.stock === 0 ? 'Agotado' : item.stock <= (item.min_stock || 5) ? 'Bajo stock' : 'Óptimo';
                        const statusBg = item.stock === 0 ? 'rgba(239,68,68,0.1)' : item.stock <= (item.min_stock || 5) ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)';
                        const statusColor = item.stock === 0 ? '#ef4444' : item.stock <= (item.min_stock || 5) ? '#f59e0b' : '#22c55e';
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="table-row-hover">
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: item.image_url ? 'transparent' : 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                  {item.image_url ? <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} /> : <Package size={16} color="#c48b9f" />}
                                </div>
                                <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13px' }}>{item.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{item.category}</td>
                            <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{item.supplier || '—'}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontWeight: '800', color: stockColor, fontSize: '14px' }}>{item.stock}</span>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{item.min_stock || '—'}</td>
                            <td style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--text-primary)', fontSize: '13px' }}>{formatBs((Number(item.price) || 0) * (rates?.usd || 550))}</td>
                            <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{item.last_movement || '—'}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: statusBg, color: statusColor, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }} />{statusLabel}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="action-btn" onClick={() => setEditingItem(item)} style={{ width: '28px', height: '28px' }}><Eye size={12} /></button>
                                <button className="action-btn" onClick={() => handeAdjustStock(item.id, item.stock, -1)} style={{ width: '28px', height: '28px' }}><Minus size={12} /></button>
                                <button className="action-btn" onClick={() => handeAdjustStock(item.id, item.stock, 1)} style={{ width: '28px', height: '28px' }}><Plus size={12} /></button>
                                <button className="action-btn" onClick={() => setEditingItem(item)} style={{ width: '28px', height: '28px' }}><Edit3 size={12} /></button>
                                <button className="action-btn" onClick={() => handleDeleteItem(item.id, item.name)} style={{ width: '28px', height: '28px', color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.05)' }}><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Próximas reposiciones */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} color="#c48b9f" /> Próximas reposiciones
                </h4>
                <button style={{ fontSize: '12px', color: 'var(--pink-primary)', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer' }}>Ver todas →</button>
              </div>
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
                {[
                  { day: '08', month: 'JUL', name: 'Alisado Japonés Kit', supplier: 'Kativa', qty: 5 },
                  { day: '10', month: 'JUL', name: 'Oxidante 20 Vol', supplier: 'Igora Royal', qty: 6 },
                  { day: '12', month: 'JUL', name: 'Acrílico Transparente', supplier: 'Mia Secret', qty: 10 },
                ].map((r, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '12px', backgroundColor: '#faf5f5', border: '1px solid var(--border-color)', minWidth: '260px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'center', minWidth: '40px' }}>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--pink-primary)' }}>{r.day}</div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>{r.month}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '12px' }}>{r.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Proveedor: {r.supplier}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cantidad sugerida: {r.qty}</div>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', whiteSpace: 'nowrap' }}>Pendiente</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR */}
          {!isMobile && (
            <div style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Alertas de reposición */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} color="#ef4444" /> Alertas de reposición
                </h4>
                {activeProducts.filter(i => i.stock <= (i.min_stock || 5) && i.category !== 'Accesorios').slice(0, 4).map((item, idx) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: idx < 3 ? '1px solid var(--border-color)' : 'none' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={14} color="#c48b9f" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize: '10px', color: item.stock === 0 ? '#ef4444' : '#f59e0b', fontWeight: '700' }}>Stock actual: {item.stock}</div>
                    </div>
                  </div>
                ))}
                <button style={{ width: '100%', padding: '8px', marginTop: '8px', borderRadius: '8px', border: 'none', background: 'rgba(196,139,159,0.1)', color: 'var(--pink-primary)', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Ver todas las alertas →</button>
              </div>

              {/* Categorías con más movimiento */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart3 size={14} color="#c48b9f" /> Categorías con más movimiento
                </h4>
                {[
                  { name: 'Uñas', pct: 42, color: '#c48b9f' },
                  { name: 'Cabello', pct: 34, color: '#6366f1' },
                  { name: 'Coloración', pct: 14, color: '#ef4444' },
                  { name: 'Facial', pct: 10, color: '#f59e0b' },
                ].map(cat => (
                  <div key={cat.name} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{cat.name}</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{cat.pct}%</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#f5f5f5', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${cat.pct}%`, backgroundColor: cat.color, borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Movimientos recientes */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <History size={14} color="#c48b9f" /> Movimientos recientes
                </h4>
                {[
                  { date: '03/07', type: 'Ingreso', product: 'Acond. Post-Trat.', amount: '+10', color: '#22c55e' },
                  { date: '02/07', type: 'Salida', product: 'Esmalte Francés', amount: '-2', color: '#ef4444' },
                  { date: '01/07', type: 'Ajuste', product: 'Acrílico Transp.', amount: '-1', color: '#f59e0b' },
                ].map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: idx < 2 ? '1px solid var(--border-color)' : 'none', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: '35px' }}>{m.date}</span>
                    <span style={{ color: 'var(--text-secondary)', minWidth: '45px' }}>{m.type}</span>
                    <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: '600' }}>{m.product}</span>
                    <span style={{ fontWeight: '800', color: m.color }}>{m.amount}</span>
                  </div>
                ))}
                <button style={{ width: '100%', padding: '8px', marginTop: '8px', borderRadius: '8px', border: 'none', background: 'rgba(196,139,159,0.1)', color: 'var(--pink-primary)', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Ver historial completo →</button>
              </div>

              {/* Próxima compra sugerida */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingCart size={14} color="#c48b9f" /> Próxima compra sugerida
                </h4>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>3 productos recomendados</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total estimado</span>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{formatBs(1248 * (rates?.usd || 550))}</span>
                </div>
                <button className="btn-pink" style={{ width: '100%', padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <ShoppingCart size={14} /> Generar pedido
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      <EditInventoryModal 
        isOpen={!!editingItem}
        item={editingItem || {}} 
        onClose={() => setEditingItem(null)} 
        onSave={async (updates) => {
          try {
            // Sanitize updates
            const { cost_price_dirty, price_dirty, stock_dirty, ...cleanUpdates } = updates;
            await dataService.updateInventoryItem(editingItem.id, cleanUpdates);
            fetchInventory();
            setEditingItem(null);
            showToast('Producto actualizado');
          } catch (error) {
            showToast('Error al actualizar producto', 'error');
          }
        }}
      />

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.6; transform: scale(0.95); }
        }
        .table-row-hover:hover {
          background-color: #faf5f5 !important;
        }
      `}</style>

      <AnimatedModal isOpen={showHistoryModal}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: isMobile ? '12px' : '20px' }}>
            <div className={`glass-card ${cardClass}`} style={{ maxWidth: '800px', width: '100%', borderRadius: '32px', border: '1px solid var(--border-color)', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden', backgroundColor: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: isMobile ? '24px 20px 0 20px' : '24px 32px 0 32px', gap: '16px' }}>
                <div>
                  <h2 style={{ 
                    fontWeight: '900', 
                    fontSize: isMobile ? '20px' : '24px', 
                    lineHeight: '1.2', 
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <History size={isMobile ? 20 : 24} color="var(--pink-primary)" />
                    {isMobile ? 'Historial Stock' : 'Historial de Movimientos'}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Registro detallado de entradas y salidas de almacén.</p>
                </div>
                <button 
                  onClick={() => setShowHistoryModal(false)} 
                  style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    border: 'none', 
                    color: 'white', 
                    cursor: 'pointer', 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: isMobile ? '0 20px 24px 20px' : '0 32px 32px 32px' }}>
                {/* Time range filters */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Todos', value: 'all' },
                    { label: 'Hoy', value: 'today' },
                    { label: 'Semana', value: 'week' },
                    { label: 'Mes', value: 'month' }
                  ].map(tab => (
                    <button
                      key={tab.value}
                      onClick={() => setHistoryFilter(tab.value)}
                      style={{
                        padding: isMobile ? '6px 12px' : '8px 16px',
                        borderRadius: '10px',
                        fontSize: isMobile ? '11px' : '12px',
                        fontWeight: '800',
                        backgroundColor: historyFilter === tab.value ? 'var(--pink-primary)' : 'rgba(255,255,255,0.03)',
                        color: historyFilter === tab.value ? 'black' : 'white',
                        border: '1px solid ' + (historyFilter === tab.value ? 'var(--pink-primary)' : 'rgba(255,255,255,0.08)'),
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {loadingHistory ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--pink-primary)" />
                  </div>
                ) : (
                  (() => {
                    const filteredHistory = history.filter(move => {
                      if (historyFilter === 'all') return true;
                      const moveDate = new Date(move.created_at);
                      const now = new Date();
                      
                      if (historyFilter === 'today') {
                        return moveDate.toDateString() === now.toDateString();
                      }
                      
                      if (historyFilter === 'week') {
                        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return moveDate >= oneWeekAgo;
                      }
                      
                      if (historyFilter === 'month') {
                        return moveDate.getMonth() === now.getMonth() && moveDate.getFullYear() === now.getFullYear();
                      }
                      
                      return true;
                    });

                    if (filteredHistory.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                          <History size={48} style={{ marginBottom: '16px', opacity: 0.1 }} />
                          <p>No hay movimientos registrados en este período.</p>
                        </div>
                      );
                    }

                    return (
                      <div 
                        style={{ 
                          maxHeight: '420px', 
                          overflowY: 'auto', 
                          overflowX: 'hidden', 
                          paddingRight: '4px' 
                        }} 
                        className="jana-scrollbar"
                      >
                        {isMobile ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {filteredHistory.map(move => (
                              <div key={move.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>{move.inventory?.name || 'Producto Eliminado'}</span>
                                  <span style={{ 
                                    padding: '3px 8px', 
                                    borderRadius: '6px', 
                                    fontSize: '9px', 
                                    fontWeight: '900',
                                    backgroundColor: move.type === 'entry' ? 'rgba(50,215,75,0.1)' : 'rgba(255,69,58,0.1)',
                                    color: move.type === 'entry' ? '#32d74b' : '#ff453a'
                                  }}>
                                    {move.type === 'entry' ? 'ENTRADA' : 'SALIDA'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  <span style={{ whiteSpace: 'nowrap' }}>{new Date(move.created_at).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                  <span style={{ fontWeight: '900', fontSize: '13px', color: move.type === 'entry' ? '#32d74b' : '#ff453a' }}>
                                    {move.type === 'entry' ? '+' : '-'}{move.amount}
                                  </span>
                                </div>
                                {move.reason && (
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '2px' }}>
                                    <span style={{ fontWeight: '700' }}>Motivo:</span> {move.reason}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                              <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <tr>
                                  <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>FECHA</th>
                                  <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>PRODUCTO</th>
                                  <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>TIPO</th>
                                  <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>CANT.</th>
                                  <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>MOTIVO</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredHistory.map(move => (
                                  <tr key={move.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '16px', fontSize: '12px', whiteSpace: 'nowrap' }}>{new Date(move.created_at).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                                    <td style={{ padding: '16px', fontSize: '13px', fontWeight: '700' }}>{move.inventory?.name || 'Producto Eliminado'}</td>
                                    <td style={{ padding: '16px' }}>
                                      <span style={{ 
                                        padding: '4px 10px', 
                                        borderRadius: '8px', 
                                        fontSize: '10px', 
                                        fontWeight: '800',
                                        backgroundColor: move.type === 'entry' ? 'rgba(50,215,75,0.1)' : 'rgba(255,69,58,0.1)',
                                        color: move.type === 'entry' ? '#32d74b' : '#ff453a'
                                      }}>
                                        {move.type === 'entry' ? 'ENTRADA' : 'SALIDA'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '900', color: move.type === 'entry' ? '#32d74b' : '#ff453a' }}>{move.type === 'entry' ? '+' : '-'}{move.amount}</td>
                                    <td style={{ padding: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{move.reason}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>
    </div>
  );
};

const EditInventoryModal = ({ isOpen, item, onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...item });
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...item });
      setShowCamera(false);
    }
  }, [isOpen, item]);

  const handleSave = async () => {
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  return (
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className={`glass-card ${cardClass} jana-scrollbar`} style={{ maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '28px', padding: '32px', display: 'flex', flexDirection: 'column', backgroundColor: 'white', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexShrink: 0 }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Package size={22} color="var(--pink-primary)" />
                <span>Editar <span className="text-pink">Producto</span></span>
              </h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><Plus size={24} style={{ transform: 'rotate(45deg)' }} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>NOMBRE</label>
                <input type="text" className="astro-input" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} style={{ width: '100%' }} />
              </div>

              <JanaSelect 
                label="CATEGORÍA"
                value={formData.category}
                onChange={(val) => setFormData({...formData, category: val})}
                options={[
                  { label: '🛒 Para Venta', value: 'Venta' },
                  { label: '💈 Uso Interno', value: 'Uso Interno' },
                  { label: '✂️ Accesorios', value: 'Accesorios' },
                  { label: '🔧 Herramienta', value: 'Herramienta' }
                ]}
              />

              {formData.category === 'Herramienta' && (
                <JanaSelect 
                  label="ASIGNAR A"
                placeholder="Selecciona estilista"
                  value={formData.staff_id}
                  onChange={(val) => setFormData({...formData, staff_id: val})}
                  options={[
                    { label: '💈 Local / General', value: null }
                  ]}
                />
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>PRECIO COSTO ($)</label>
                  <input type="number" className="astro-input" value={formData.cost_price || 0} onChange={(e) => setFormData({...formData, cost_price: Number(e.target.value)})} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>PRECIO VENTA ($)</label>
                  <input type="number" className="astro-input" value={formData.price || 0} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} style={{ width: '100%' }} />
                </div>
              </div>

              {(formData.category === 'Venta' || formData.category === 'Accesorios') && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>COMISIÓN VENDEDOR (%)</label>
                  <input type="number" className="astro-input" value={formData.commission_pct ?? 10} onChange={(e) => setFormData({...formData, commission_pct: Number(e.target.value)})} style={{ width: '100%' }} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>FOTO DEL PRODUCTO</label>
                <div 
                  onClick={() => setShowCamera(true)}
                  style={{ 
                    height: formData.image_url ? '120px' : '48px', 
                    backgroundColor: 'rgba(255,255,255,0.03)', 
                    border: '1px dashed rgba(255,255,255,0.15)', 
                    borderRadius: '16px', 
                    display: 'flex', 
                    flexDirection: formData.image_url ? 'column' : 'row',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    transition: 'all 0.2s'
                  }}
                >
                  {formData.image_url ? (
                    <>
                      <img src={formData.image_url} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1 }} />
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', justifyContent: 'center', background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)' }}>
                         <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                         <Camera size={20} color="var(--pink-primary)" />
                         </div>
                         <span style={{ fontSize: '12px', color: 'white', fontWeight: '800', textShadow: '0 2px 4px rgba(0,0,0,0.8)', backgroundColor: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>Tocar para cambiar foto</span>
                      </div>
                    </>
                  ) : (
                    <>
                    <Camera size={18} color="var(--pink-primary)" />
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tomar o subir foto...</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button 
                onClick={onClose} 
                style={{ 
                  flex: 1, 
                  padding: '14px', 
                  borderRadius: '14px', 
                  border: 'none', 
                  backgroundColor: 'rgba(255,255,255,0.05)', 
                  color: 'white', 
                  fontSize: '14px', 
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
              >
                Cancelar
              </button>
              <button onClick={handleSave} className="btn-pink" style={{ flex: 2, padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: '800' }} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
              </button>
            </div>

            <AnimatedModal isOpen={showCamera}>
              {(overlayClass, cardClass) => (
                <JanaCamera 
                  onCapture={(img) => { setFormData({...formData, image_url: img}); setShowCamera(false); }} 
                  onClose={() => setShowCamera(false)} 
                  overlayClass={overlayClass}
                  cardClass={cardClass}
                />
              )}
            </AnimatedModal>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
};

export default InventoryModule;
