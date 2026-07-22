import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Save, 
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Package
} from 'lucide-react';
import { dataService } from '../services/dataService';
import MiniLoader from './MiniLoader';


const CostingModule = ({ isMobile, services = [], inventory = [] }) => {
  const [selectedService, setSelectedService] = useState(null);
  const [serviceCosts, setServiceCosts] = useState([]);
  const [profitData, setProfitData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    item_name: '',
    quantity_per_service: 1,
    unit_cost: 0,
    unit: 'unidad',
    inventory_item_id: null
  });

  useEffect(() => {
    if (selectedService) {
      loadServiceCosts(selectedService.id);
    }
  }, [selectedService]);

  const loadServiceCosts = async (serviceId) => {
    setLoading(true);
    try {
      const costs = await dataService.getServiceCosts(serviceId);
      setServiceCosts(costs);
      
      const profit = await dataService.calculateServiceProfit(serviceId);
      setProfitData(profit);
    } catch (error) {
      console.error('Error loading service costs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedService || !newItem.item_name) return;
    
    setSaving(true);
    try {
      await dataService.addServiceCost({
        service_id: selectedService.id,
        item_name: newItem.item_name,
        quantity_per_service: newItem.quantity_per_service,
        unit_cost: newItem.unit_cost,
        unit: newItem.unit,
        inventory_item_id: newItem.inventory_item_id
      });
      
      setNewItem({
        item_name: '',
        quantity_per_service: 1,
        unit_cost: 0,
        unit: 'unidad',
        inventory_item_id: null
      });
      setShowAddItem(false);
      loadServiceCosts(selectedService.id);
    } catch (error) {
      console.error('Error adding cost item:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('¿Eliminar este insumo del servicio?')) return;
    
    setSaving(true);
    try {
      await dataService.deleteServiceCost(itemId);
      loadServiceCosts(selectedService.id);
    } catch (error) {
      console.error('Error deleting cost item:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQuantity = async (itemId, quantity) => {
    setSaving(true);
    try {
      await dataService.updateServiceCost(itemId, { quantity_per_service: quantity });
      loadServiceCosts(selectedService.id);
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCost = async (itemId, cost) => {
    setSaving(true);
    try {
      await dataService.updateServiceCost(itemId, { unit_cost: cost });
      loadServiceCosts(selectedService.id);
    } catch (error) {
      console.error('Error updating cost:', error);
    } finally {
      setSaving(false);
    }
  };

  const selectInventoryItem = (item) => {
    setNewItem({
      ...newItem,
      item_name: item.name,
      unit_cost: (Number(item.cost) || 0) / Math.max(Number(item.package_size) || 1, 0.000001),
      unit: item.unit,
      inventory_item_id: item.id
    });
  };

  const getProfitColor = (margin) => {
    if (margin >= 50) return '#22c55e';
    if (margin >= 20) return '#eab308';
    return '#ef4444';
  };

  const getProfitLabel = (margin) => {
    if (margin >= 50) return 'Excelente';
    if (margin >= 20) return 'Aceptable';
    return 'Bajo';
  };

  return (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <div style={{ 
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
            <Calculator size={isMobile ? 16 : 20} color="white" />
          </div>
          <div>
            <h1 className="jana-page-title" style={{ margin: 0, fontSize: isMobile ? '20px' : '28px', letterSpacing: '-0.6px', fontWeight: '850', color: 'var(--text-primary)' }}>
              Costeo de Servicios
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: isMobile ? '12px' : '14px', fontWeight: '500' }}>
              Analiza la rentabilidad de cada servicio.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '300px 1fr', gap: '24px' }}>
        {/* Services List */}
        <div className="glass-card" style={{ padding: '20px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
            Servicios
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
            {services.map(service => (
              <button
                key={service.id}
                onClick={() => setSelectedService(service)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: selectedService?.id === service.id ? '2px solid var(--pink-primary)' : '1px solid var(--border-color)',
                  background: selectedService?.id === service.id ? 'rgba(217, 70, 168, 0.1)' : 'var(--bg-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{service.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  ${service.price} • {service.category}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cost Analysis */}
        <div className="glass-card" style={{ padding: '20px' }}>
          {!selectedService ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px', 
              color: 'var(--text-muted)' 
            }}>
              <Calculator size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>Selecciona un servicio para ver su costeo</p>
            </div>
          ) : (
            <>
              {/* Service Header */}
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedService.name}
                </h2>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Precio: <strong style={{ color: 'var(--text-primary)' }}>${selectedService.price}</strong>
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Duración: <strong style={{ color: 'var(--text-primary)' }}>{selectedService.duration_minutes} min</strong>
                  </span>
                </div>
              </div>

              {/* Profit Summary */}
              {profitData && profitData.length > 0 && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
                  gap: '16px', 
                  marginBottom: '24px' 
                }}>
                  <div style={{ 
                    padding: '16px', 
                    borderRadius: '12px', 
                    background: 'rgba(217, 70, 168, 0.1)',
                    border: '1px solid rgba(217, 70, 168, 0.2)'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Costo Total
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--pink-primary)' }}>
                      ${profitData[0].total_cost?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: '16px', 
                    borderRadius: '12px', 
                    background: profitData[0].profit > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${profitData[0].profit > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Ganancia
                    </div>
                    <div style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: 700, 
                      color: profitData[0].profit > 0 ? '#22c55e' : '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {profitData[0].profit > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                      ${Math.abs(profitData[0].profit || 0).toFixed(2)}
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: '16px', 
                    borderRadius: '12px', 
                    background: `${getProfitColor(profitData[0].profit_margin)}15`,
                    border: `1px solid ${getProfitColor(profitData[0].profit_margin)}30`
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Margen de Ganancia
                    </div>
                    <div style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: 700, 
                      color: getProfitColor(profitData[0].profit_margin),
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {profitData[0].profit_margin >= 50 ? (
                        <CheckCircle size={20} />
                      ) : profitData[0].profit_margin >= 20 ? (
                        <AlertCircle size={20} />
                      ) : (
                        <AlertCircle size={20} />
                      )}
                      {profitData[0].profit_margin?.toFixed(1) || '0'}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {getProfitLabel(profitData[0].profit_margin)}
                    </div>
                  </div>
                </div>
              )}

              {/* Cost Items */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Insumos por Servicio
                  </h3>
                  <button
                    onClick={() => setShowAddItem(true)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--pink-primary)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Plus size={16} />
                    Agregar
                  </button>
                </div>

                {loading ? (
                  <MiniLoader text="Cargando costos..." />
                ) : serviceCosts.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    color: 'var(--text-muted)',
                    background: 'var(--bg-primary)',
                    borderRadius: '12px'
                  }}>
                    <Package size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <p>No hay insumos registrados para este servicio</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                      Haz clic en "Agregar" para añadir insumos
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {serviceCosts.map(item => (
                      <div
                        key={item.id}
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        {/* Cabecera: nombre + botón borrar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
                              {item.item_name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              por {item.unit}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {/* Fila de inputs: Cant. × $Costo = Total */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cant.</label>
                            <input
                              type="number"
                              value={item.quantity_per_service}
                              onChange={(e) => handleUpdateQuantity(item.id, parseFloat(e.target.value) || 0)}
                              style={{
                                width: '56px', padding: '6px 8px', borderRadius: '6px',
                                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)', textAlign: 'center', fontSize: '0.85rem'
                              }}
                            />
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>×</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>$</span>
                            <input
                              type="number"
                              value={item.unit_cost}
                              onChange={(e) => handleUpdateCost(item.id, parseFloat(e.target.value) || 0)}
                              style={{
                                width: '70px', padding: '6px 8px', borderRadius: '6px',
                                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)', textAlign: 'right', fontSize: '0.85rem'
                              }}
                            />
                          </div>
                          <div style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--pink-primary)', fontSize: '0.9rem' }}>
                            = ${item.total_cost?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '20px'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto',
            padding: '24px'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
              Agregar Insumo
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Seleccionar del inventario (opcional)
              </label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '8px',
                maxHeight: '150px',
                overflow: 'auto'
              }}>
                {inventory.map(item => (
                  <button
                    key={item.id}
                    onClick={() => selectInventoryItem(item)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      ${item.cost} / {item.unit}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Nombre del insumo
                </label>
                <input
                  type="text"
                  value={newItem.item_name}
                  onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Unidad
                </label>
                <select
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="unidad">Unidad</option>
                  <option value="gramo">Gramo</option>
                  <option value="ml">ML</option>
                  <option value="litro">Litro</option>
                  <option value="kg">KG</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Cantidad por servicio
                </label>
                <input
                  type="number"
                  value={newItem.quantity_per_service}
                  onChange={(e) => setNewItem({ ...newItem, quantity_per_service: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Costo por unidad ($)
                </label>
                <input
                  type="number"
                  value={newItem.unit_cost}
                  onChange={(e) => setNewItem({ ...newItem, unit_cost: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddItem(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddItem}
                disabled={!newItem.item_name || saving}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--pink-primary)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  opacity: !newItem.item_name || saving ? 0.5 : 1
                }}
              >
                {saving ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostingModule;
