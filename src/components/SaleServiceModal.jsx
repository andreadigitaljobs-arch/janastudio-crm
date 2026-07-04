import React, { useState, useEffect } from 'react';
import { useNotifs } from '../context/NotificationContext';
import { 
  X, 
  User, 
  Search, 
  Plus, 
  Rocket, 
  Sparkles, 
  CreditCard, 
  Loader2, 
  UserPlus,
  ArrowRight,
  Clock,
  Zap,
  Package,
  PlusCircle,
  MinusCircle,
  ChevronDown
} from 'lucide-react';
import { dataService } from '../services/dataService';
import AstroSelect from './AstroSelect';
import AstroDatePicker from './AstroDatePicker';
import { normalizeForSearch } from '../utils/stringUtils';
import NewClientModal from './NewClientModal';
import AnimatedModal from './AnimatedModal';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../hooks/useScrollLock';

const SaleServiceModal = ({ isOpen, onClose, clients, services, staff, extras, inventory, onRefresh, rates, currency }) => {
  const { showToast, triggerConfetti, triggerRocket, sendPushNotification } = useNotifs();
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useScrollLock(isOpen);

  // Selection Flow
  const [step, setStep] = useState(1); // 1: Client, 2: Order Details
  const [selectedClient, setSelectedClient] = useState(null);
  const [idSearch, setIdSearch] = useState('');
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  
  // Form Data
  const [selectedService, setSelectedService] = useState(null);
  const [involvedStaff, setInvolvedStaff] = useState([{ staffId: '', role: 'Estilista' }]);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);

  // Search States for Step 2
  const [extraSearch, setExtraSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedClient(null);
      setIdSearch('');
      setSelectedService(null);
      setInvolvedStaff([{ staffId: '', role: 'Estilista' }]);
      setSelectedExtras([]);
      setSelectedProducts([]);
      setTotalPrice(0);
      setExtraSearch('');
      setProductSearch('');
    }
  }, [isOpen]);

  // Total Price Calculation
  useEffect(() => {
    let total = 0;
    if (selectedService) total += selectedService.price;
    selectedExtras.forEach(e => total += e.price);
    selectedProducts.forEach(p => total += (p.price * p.quantity));
    setTotalPrice(total);
  }, [selectedService, selectedExtras, selectedProducts]);

  // Remove early return so AnimatedModal can handle the exit animation
  // if (!isOpen) return null;

  const handleIdSearch = () => {
    const cleanId = idSearch.trim().replace(/\./g, '');
    const client = (clients || []).find(c => c.id_card?.replace(/\./g, '') === cleanId || c.phone?.includes(cleanId));
    if (client) {
      setSelectedClient(client);
      setStep(2);
      showToast(`Cliente encontrado: ${client.name}`);
    } else {
      showToast("No se encontró el cliente. ¿Es nuevo?", "warning");
    }
  };

  const handleSelectClientFromList = (client) => {
    setSelectedClient(client);
    setStep(2);
  };

  const toggleExtra = (extra) => {
    const exists = selectedExtras.find(e => e.id === extra.id);
    if (exists) {
      setSelectedExtras(selectedExtras.filter(e => e.id !== extra.id));
    } else {
      setSelectedExtras([...selectedExtras, extra]);
      showToast(`${extra.name} añadido`);
    }
  };

  const updateProductQuantity = (product, delta) => {
    const exists = selectedProducts.find(p => p.id === product.id);
    if (exists) {
      const newQty = exists.quantity + delta;
      if (newQty <= 0) {
        setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
      } else {
        setSelectedProducts(selectedProducts.map(p => p.id === product.id ? { ...p, quantity: newQty } : p));
      }
    } else if (delta > 0) {
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
      showToast(`${product.name} añadido`);
    }
  };

  const handleSubmit = async () => {
    if (!selectedClient || (!selectedService && selectedProducts.length === 0)) {
      showToast('Selecciona al menos un servicio o producto.', 'error');
      return;
    }

    if (selectedService && involvedStaff.some(s => !s.staffId)) {
      showToast('Por favor selecciona un estilista.', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Create Appointment
      const appointmentData = {
        client_id: selectedClient.id,
        service_id: selectedService?.id || null,
        staff_id: involvedStaff[0].staffId || null,
        status: 'Por Pagar',
        total_price: totalPrice,
        scheduled_at: new Date().toISOString()
      };

      const newApp = await dataService.createAppointment(appointmentData);
      if (!newApp) {
        showToast('Error: no se pudo crear la cita.', 'error');
        return;
      }

      // Add Extras
      const extraPromises = selectedExtras.map(extra => 
        dataService.addExtraToAppointment(newApp.id, extra.id, extra.price)
      );
      
      // Add Products
      const productPromises = selectedProducts.map(prod => 
        dataService.addProductToAppointment(newApp.id, prod.id, prod.quantity, prod.price)
      );
      
      await Promise.all([...extraPromises, ...productPromises]);

      if (onRefresh) onRefresh();
      
      triggerRocket();
      showToast(`¡Operación registrada! ${selectedClient?.name || 'Cliente'} enviado a caja.`);
      sendPushNotification('🚀 Operación Astro', `${selectedClient?.name || 'Cliente'} — ${selectedService?.name || 'Venta'}`);
      
      onClose();
    } catch (error) {
      console.error('Error registering quick operation:', error);
      showToast('Error técnico al registrar operación.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredExtras = (extras || []).filter(e => e.name.toLowerCase().includes(extraSearch.toLowerCase()));
  const filteredProducts = (inventory || []).filter(p => 
    p.category === 'Venta' && 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const modalContainerStyle = isMobile ? {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#161616',
    borderTopLeftRadius: '32px',
    borderTopRightRadius: '32px',
    padding: '32px 24px 44px 24px',
    zIndex: 1100,
    maxHeight: '95vh',
    display: 'flex',
    flexDirection: 'column'
  } : {
    width: '600px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    backgroundColor: '#161616',
    borderRadius: '32px',
    padding: '40px',
    position: 'relative',
    zIndex: 1100,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column'
  };

  return createPortal(
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={overlayClass} style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(10px)'
        }}>
          <div className={`${cardClass}`} style={modalContainerStyle}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.5px' }}>
              Operación <span className="text-gold">Rápida</span>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: step === 1 ? 'var(--pink-primary)' : 'rgba(255,255,255,0.2)' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: step === 2 ? 'var(--pink-primary)' : 'rgba(255,255,255,0.2)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '4px' }}>Paso {step} de 2</span>
            </div>
          </div>
          <button onClick={onClose} className="action-btn" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content Area - Scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '24px' }} className="astro-scrollbar">
          
          {step === 1 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '16px', top: '16px' }} size={20} color="var(--pink-primary)" />
                <input 
                  type="text" 
                  placeholder="Busca por Cédula o Nombre..." 
                  value={idSearch}
                  onChange={(e) => setIdSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleIdSearch()}
                  autoFocus
                  style={{ width: '100%', paddingLeft: '52px', height: '52px', fontSize: '16px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(196,139,159,0.2)' }}
                />
              </div>

              {idSearch.length >= 1 && (
                <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  {(clients || []).filter(c => {
                    const term = normalizeForSearch(idSearch);
                    const normalizedName = normalizeForSearch(c.name || '');
                    const nameMatches = normalizedName.split(' ').some(w => w.startsWith(term));
                    const idMatches = (c.id_card || '').toLowerCase().includes(term);
                    return nameMatches || idMatches;
                  }).slice(0, 5).map(c => (
                    <div key={c.id} onClick={() => handleSelectClientFromList(c)} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="client-search-item">
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '14px' }}>{c.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>V-{c.id_card}</div>
                      </div>
                      <ArrowRight size={14} color="var(--pink-primary)" />
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => setShowNewClientModal(true)} style={{ width: '100%', height: '52px', borderRadius: '16px', border: '1.5px dashed rgba(196,139,159,0.3)', background: 'rgba(196,139,159,0.05)', color: 'var(--pink-primary)', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <UserPlus size={18} /> Registrar Nuevo Cliente
              </button>
            </div>
          )}

          {step === 2 && selectedClient && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Selected Client Summary */}
              <div style={{ padding: '16px 20px', background: 'rgba(196,139,159,0.05)', borderRadius: '20px', border: '1px solid rgba(196,139,159,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--pink-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User color="black" size={18} /></div>
                  <div>
                    <div style={{ fontWeight: '900', fontSize: '14px' }}>{selectedClient.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>V-{selectedClient.id_card}</div>
                  </div>
                </div>
                <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--pink-primary)', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}>CAMBIAR</button>
              </div>

              {/* Service & Staff */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <AstroSelect 
                  label="Servicio"
                  value={selectedService?.id || ''}
                  onChange={val => setSelectedService((services || []).find(s => s.id == val))}
                  options={(services || []).map(s => ({ label: `${s.name} — $${s.price}`, value: s.id }))}
                  icon={<Rocket size={18} color="var(--pink-primary)" />}
                />
                <AstroSelect 
                  label="Atendido por"
                  value={involvedStaff[0].staffId}
                  onChange={val => setInvolvedStaff([{ ...involvedStaff[0], staffId: val }])}
                  options={staff.map(s => ({ label: s.name, value: s.id }))}
                  icon={<Sparkles size={18} color="var(--pink-primary)" />}
                />
              </div>

              {/* Searchable Extras */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Añadir Extras</label>
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} size={14} color="var(--text-muted)" />
                  <input 
                    type="text" 
                    placeholder="Escribe para buscar extra..." 
                    value={extraSearch}
                    onChange={(e) => setExtraSearch(e.target.value)}
                    style={{ width: '100%', paddingLeft: '36px', height: '40px', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {filteredExtras.slice(0, 8).map(e => (
                    <button 
                      key={e.id}
                      onClick={() => toggleExtra(e)}
                      style={{ 
                        padding: '8px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', 
                        backgroundColor: selectedExtras.find(se => se.id === e.id) ? 'rgba(196,139,159,0.2)' : 'rgba(255,255,255,0.03)',
                        border: selectedExtras.find(se => se.id === e.id) ? '1px solid var(--pink-primary)' : '1px solid rgba(255,255,255,0.05)',
                        color: selectedExtras.find(se => se.id === e.id) ? 'var(--pink-primary)' : 'white',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      {e.name} (+${e.price})
                    </button>
                  ))}
                  {filteredExtras.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.5 }}>No se encontraron extras.</div>}
                </div>
              </div>

              {/* Searchable Products */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Venta de Productos</label>
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} size={14} color="var(--text-muted)" />
                  <input 
                    type="text" 
                    placeholder="Escribe para buscar producto..." 
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    style={{ width: '100%', paddingLeft: '36px', height: '40px', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredProducts.slice(0, 5).map(p => {
                    const selected = selectedProducts.find(sp => sp.id === p.id);
                    const isOutOfStock = (p.stock || 0) <= 0;
                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.03)', opacity: isOutOfStock ? 0.6 : 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Package size={14} color={isOutOfStock ? "var(--text-muted)" : "var(--pink-primary)"} />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: isOutOfStock ? 'var(--text-muted)' : 'white' }}>{p.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>${p.price}</div>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: isOutOfStock ? '#ff453a' : '#30d158', marginTop: '2px' }}>
                              {isOutOfStock ? 'Agotado (Sin Stock)' : `Stock: ${p.stock}`}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {selected ? (
                            <>
                              <button onClick={() => updateProductQuantity(p, -1)} style={{ background: 'none', border: 'none', color: 'var(--pink-primary)', cursor: 'pointer' }}><MinusCircle size={18} /></button>
                              <span style={{ fontWeight: '800', fontSize: '13px', minWidth: '12px', textAlign: 'center' }}>{selected.quantity}</span>
                              <button onClick={() => updateProductQuantity(p, 1)} style={{ background: 'none', border: 'none', color: 'var(--pink-primary)', cursor: 'pointer' }} disabled={isOutOfStock || (selected.quantity >= p.stock)}><PlusCircle size={18} /></button>
                            </>
                          ) : (
                            <button 
                              onClick={() => !isOutOfStock && updateProductQuantity(p, 1)} 
                              disabled={isOutOfStock}
                              style={{ 
                                padding: '6px 12px', 
                                borderRadius: '8px', 
                                border: isOutOfStock ? '1px dashed rgba(255,255,255,0.1)' : '1px solid rgba(196,139,159,0.2)', 
                                background: 'none', 
                                color: isOutOfStock ? 'var(--text-muted)' : 'var(--pink-primary)', 
                                fontSize: '11px', 
                                fontWeight: '800', 
                                cursor: isOutOfStock ? 'not-allowed' : 'pointer' 
                              }}
                            >
                              {isOutOfStock ? 'SIN STOCK' : 'AÑADIR'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.5 }}>No se encontraron productos.</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        {step === 2 && (
          <div style={{ 
            paddingTop: '20px', 
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexShrink: 0
          }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px' }}>Total Estimado</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '24px', fontWeight: '950', color: 'white' }}>${totalPrice}</div>
                {rates?.usd > 0 && (
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                    ≈ {Math.round(totalPrice * rates.usd).toLocaleString()} BS
                  </div>
                )}
              </div>
            </div>
            <button 
              className="btn-pink" 
              onClick={handleSubmit}
              disabled={loading || (!selectedService && selectedProducts.length === 0)}
              style={{ height: '52px', padding: '0 24px', borderRadius: '14px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Zap size={16} fill="black" /> ENVIAR A CAJA</>}
            </button>
          </div>
        )}

        <NewClientModal 
          isOpen={showNewClientModal} 
          onClose={() => setShowNewClientModal(false)} 
          onSuccess={(newC) => {
            setSelectedClient(newC);
            setStep(2);
            setShowNewClientModal(false);
          }}
        />

          <style>{`
            .client-search-item:hover {
              background-color: rgba(196,139,159,0.05) !important;
            }
            .astro-scrollbar::-webkit-scrollbar { width: 4px; }
            .astro-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .astro-scrollbar::-webkit-scrollbar-thumb { background: rgba(196,139,159,0.2); borderRadius: 10px; }
          `}</style>
        </div>
      </div>
      )}
    </AnimatedModal>,
    document.body
  );
};

export default SaleServiceModal;
