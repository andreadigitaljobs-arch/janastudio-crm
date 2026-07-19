import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Sparkles, User, Package, Calendar, DollarSign, ChevronDown, ChevronRight, Plus, Loader } from 'lucide-react';
import AnimatedModal from './AnimatedModal';
import LaserGunIcon from './LaserGunIcon';
import { dataService } from '../services/dataService';
import { notificationService } from '../services/notificationService';

const LaserPackageModal = ({ isOpen, onClose, isMobile }) => {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  const [paymentMode, setPaymentMode] = useState('full_usd'); // 'full_usd', 'full_bs', 'financed'
  const [methodUsd, setMethodUsd] = useState('Efectivo');
  const [methodBs, setMethodBs] = useState('Pago Móvil');
  
  // Custom client form
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  // Exchange rate
  const [exchangeRate, setExchangeRate] = useState(1);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setStep(1);
      setSelectedClient(null);
      setSelectedService(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cls, svcs, rates] = await Promise.all([
        dataService.getClientsLite(),
        dataService.getServices(),
        dataService.getExchangeRates()
      ]);
      setClients(cls);
      
      const laserSvcs = svcs.filter(s => {
        const cat = (s.category || '').toLowerCase();
        const nom = (s.name || '').toLowerCase();
        return cat.includes('laser') || cat.includes('láser') || cat.includes('depilación') || nom.includes('laser');
      });
      setServices(laserSvcs);

      if (rates && rates.bcv) {
        setExchangeRate(rates.bcv);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName) {
      notificationService.sendNotification('Error', 'Debe ingresar un nombre');
      return;
    }
    try {
      setLoading(true);
      const newCl = await dataService.addClient({ name: newClientName, phone: newClientPhone });
      setClients(prev => [newCl, ...prev]);
      setSelectedClient(newCl);
      setIsCreatingClient(false);
      setStep(2);
    } catch (err) {
      console.error(err);
      notificationService.sendNotification('Error', 'No se pudo crear la clienta');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSale = async () => {
    if (!selectedClient || !selectedService) return;
    
    try {
      setLoading(true);

      const isFinanced = paymentMode === 'financed';
      const isFullBs = paymentMode === 'full_bs';
      const totalAmount = selectedService.price;
      const initialPaymentAmount = isFinanced ? (totalAmount * 0.3) : totalAmount; // 30% if financed
      
      let finalMethod = isFullBs ? methodBs : methodUsd;
      if (isFinanced) finalMethod = `Cuota 1 (${methodUsd})`;

      // 1. Transaction record
      await dataService.addTransaction({
        client_id: selectedClient.id,
        amount: initialPaymentAmount,
        type: 'Ingreso',
        description: `Venta Paquete Láser: ${selectedService.name}`,
        payment_method: finalMethod,
        usd_rate: exchangeRate
      });

      // 2. Create the package
      // Inferir si es de 8 sesiones basándonos en el nombre o si es por default
      let totalSessions = 8;
      if (selectedService.name.toLowerCase().includes('4 sesiones')) totalSessions = 4;
      if (selectedService.name.toLowerCase().includes('1 sesión') || selectedService.name.toLowerCase().includes('sesion')) totalSessions = 1;

      // 10 months from now
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 10);

      const pkg = await dataService.addClientPackage({
        client_id: selectedClient.id,
        service_id: selectedService.id,
        total_sessions: totalSessions,
        used_sessions: 0,
        status: 'active',
        total_amount: totalAmount,
        expires_at: expiresAt.toISOString()
      });

      // 3. Create installments
      // Si es de 8 sesiones, la dueña pidió 3 cuotas: 30%, 40%, 30%. 
      // Si no, podríamos hacer 1 sola cuota del 100%.
      let installments = [];
      if (totalSessions === 8) {
        installments = [
          { client_package_id: pkg.id, installment_number: 1, amount: totalAmount * 0.3, status: 'paid', paid_at: new Date().toISOString() },
          { client_package_id: pkg.id, installment_number: 2, amount: totalAmount * 0.4, status: 'pending' },
          { client_package_id: pkg.id, installment_number: 3, amount: totalAmount * 0.3, status: 'pending' }
        ];
      } else if (totalSessions === 4) {
        // Asumiendo 2 cuotas de 50%
        installments = [
          { client_package_id: pkg.id, installment_number: 1, amount: totalAmount * 0.5, status: 'paid', paid_at: new Date().toISOString() },
          { client_package_id: pkg.id, installment_number: 2, amount: totalAmount * 0.5, status: 'pending' }
        ];
      } else {
        // 1 sesión
        installments = [
          { client_package_id: pkg.id, installment_number: 1, amount: totalAmount, status: 'paid', paid_at: new Date().toISOString() }
        ];
      }
      
      // If payment mode is full, mark all as paid
      if (!isFinanced) {
        installments = installments.map(i => ({ ...i, status: 'paid', paid_at: new Date().toISOString() }));
      }

      await dataService.addPackageInstallments(installments);

      notificationService.sendNotification('Éxito', 'Paquete vendido y primera cuota registrada.');
      onClose();
    } catch (err) {
      console.error(err);
      notificationService.sendNotification('Error', 'Ocurrió un error al vender el paquete.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={`modal-overlay ${overlayClass}`} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(45, 27, 34, 0.4)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '20px' }}>
          <div className={`modal-card ${cardClass}`} style={{ width: '100%', maxWidth: '600px', backgroundColor: '#fff', borderRadius: isMobile ? '28px 28px 0 0' : '28px', maxHeight: isMobile ? '90vh' : '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(74, 48, 54, 0.15)', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(223, 178, 140, 0.15)', backgroundColor: '#fff', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #fff0f2 0%, #ffe1e6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', boxShadow: '0 4px 12px rgba(201,114,130,0.15)' }}>
                  <LaserGunIcon size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#2d1b22', letterSpacing: '-0.3px' }}>Vender Paquete Láser</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#a0909a', fontWeight: 600 }}>Crea un nuevo paquete para la clienta</p>
                </div>
              </div>
              <button onClick={onClose} className="btn-press" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f0f2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0909a', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = '#ffe1e6'; e.currentTarget.style.color = '#c97282'; }} onMouseLeave={e => { e.currentTarget.style.background = '#f5f0f2'; e.currentTarget.style.color = '#a0909a'; }}>
                <X size={18} />
              </button>
            </div>

            {/* Stepper */}
            <div style={{ display: 'flex', padding: isMobile ? '16px 12px' : '20px 32px', background: '#fcf9f8', borderBottom: '1px solid rgba(223, 178, 140, 0.15)', gap: isMobile ? '8px' : '16px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', minWidth: 0 }} onClick={() => setStep(1)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: step >= 1 ? '#c97282' : '#a0909a', fontWeight: 800, fontSize: isMobile ? '0.7rem' : '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  <User size={isMobile ? 12 : 14} style={{ flexShrink: 0 }} /> 1. Clienta
                </div>
                <div style={{ height: '4px', background: step >= 1 ? '#c97282' : 'rgba(223,178,140,0.3)', borderRadius: '4px', transition: 'all 0.3s' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', cursor: selectedClient ? 'pointer' : 'not-allowed', minWidth: 0 }} onClick={() => selectedClient && setStep(2)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: step >= 2 ? '#c97282' : '#a0909a', fontWeight: 800, fontSize: isMobile ? '0.7rem' : '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  <Package size={isMobile ? 12 : 14} style={{ flexShrink: 0 }} /> 2. Paquete
                </div>
                <div style={{ height: '4px', background: step >= 2 ? '#c97282' : 'rgba(223,178,140,0.3)', borderRadius: '4px', transition: 'all 0.3s' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', cursor: selectedService ? 'pointer' : 'not-allowed', minWidth: 0 }} onClick={() => selectedService && setStep(3)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: step >= 3 ? '#c97282' : '#a0909a', fontWeight: 800, fontSize: isMobile ? '0.7rem' : '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  <DollarSign size={isMobile ? 12 : 14} style={{ flexShrink: 0 }} /> 3. Pago
                </div>
                <div style={{ height: '4px', background: step >= 3 ? '#c97282' : 'rgba(223,178,140,0.3)', borderRadius: '4px', transition: 'all 0.3s' }} />
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }} className="jana-scrollbar">
              
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeInUpWow 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#2d1b22' }}>¿A quién le vendemos el paquete?</h4>
                  {!isCreatingClient ? (
                    <>
                      <div style={{ position: 'relative' }}>
                        <Search size={18} color="#a0909a" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 2, pointerEvents: 'none' }} />
                        <input 
                          type="text" 
                          placeholder="Buscar por nombre, apellido o teléfono..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          style={{ width: '100%', padding: '16px 16px 16px 44px', borderRadius: '16px', border: '1.5px solid rgba(223, 178, 140, 0.3)', backgroundColor: '#fff', fontSize: '1rem', color: '#2d1b22', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#c97282';
                            e.target.style.boxShadow = '0 0 0 4px rgba(201, 114, 130, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'rgba(223, 178, 140, 0.3)';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                        {clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.phone && c.phone.includes(searchQuery))).slice(0, 10).map((c) => (
                          <div 
                            key={c.id} 
                            onClick={() => { setSelectedClient(c); setStep(2); }} 
                            className="hover-lift" 
                            style={{ padding: '16px', borderRadius: '16px', border: selectedClient?.id === c.id ? '2px solid #c97282' : '1px solid rgba(223, 178, 140, 0.2)', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'all 0.2s', background: selectedClient?.id === c.id ? '#fff0f2' : '#fff' }}
                          >
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f5f0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0909a', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>
                              {c.name.charAt(0)}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2d1b22' }}>{c.name}</div>
                              <div style={{ fontSize: '0.8rem', color: '#a0909a', fontWeight: 500 }}>{c.phone || 'Sin teléfono'}</div>
                            </div>
                            <ChevronRight size={18} color="#dfb28c" style={{ flexShrink: 0 }} />
                          </div>
                        ))}
                      </div>

                      <button onClick={() => setIsCreatingClient(true)} className="btn-press" style={{ padding: '16px', borderRadius: '16px', border: '2px dashed rgba(201,114,130,0.4)', background: '#fff0f2', color: '#c97282', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', marginTop: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Plus size={18} /> Nueva Clienta
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeInUpWow 0.3s ease' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#a0909a', fontWeight: 700, marginBottom: '6px' }}>Nombre Completo</label>
                        <input type="text" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Ej. Camila Santos" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(223, 178, 140, 0.4)', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#a0909a', fontWeight: 700, marginBottom: '6px' }}>Teléfono (WhatsApp)</label>
                        <input type="tel" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="+58 412..." style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(223, 178, 140, 0.4)', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button onClick={() => setIsCreatingClient(false)} className="btn-press" style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#f5f0f2', border: 'none', color: '#a0909a', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                        <button onClick={handleCreateClient} disabled={loading} className="btn-press" style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(201, 114, 130,0.25)' }}>
                          {loading ? 'Guardando...' : 'Guardar Clienta'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeInUpWow 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#2d1b22' }}>Selecciona el paquete láser</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {services.map((svc) => (
                      <div 
                        key={svc.id} 
                        onClick={() => { setSelectedService(svc); setStep(3); }} 
                        className="hover-lift" 
                        style={{ padding: '20px', borderRadius: '16px', border: selectedService?.id === svc.id ? '2px solid #c97282' : '1px solid rgba(223, 178, 140, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.2s', background: selectedService?.id === svc.id ? '#fff0f2' : '#fff' }}
                      >
                        <div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2d1b22' }}>{svc.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#a0909a', fontWeight: 500, marginTop: '4px' }}>Incluye revisión inicial</div>
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#c97282' }}>${svc.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && selectedClient && selectedService && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUpWow 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                  <div style={{ background: '#fcf9f8', padding: '20px', borderRadius: '16px', border: '1px dashed rgba(223, 178, 140, 0.4)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Resumen de Compra</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2d1b22' }}>{selectedClient.name}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2d1b22', marginTop: '4px' }}>{selectedService.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(223, 178, 140, 0.2)' }}>
                      <div style={{ fontSize: '0.9rem', color: '#a0909a', fontWeight: 600 }}>Total del Paquete</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#c97282' }}>${selectedService.price}</div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, color: '#2d1b22' }}>Plan de Financiamiento</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => setPaymentMode('full_usd')}
                          style={{ flex: '1 0 45%', padding: '12px', borderRadius: '12px', border: paymentMode === 'full_usd' ? '2px solid #c97282' : '1px solid rgba(223, 178, 140, 0.4)', background: paymentMode === 'full_usd' ? '#fff0f2' : '#fff', color: paymentMode === 'full_usd' ? '#c97282' : '#a0909a', fontWeight: '800', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }}
                        >TODO EN $</button>
                        <button 
                          onClick={() => setPaymentMode('full_bs')}
                          style={{ flex: '1 0 45%', padding: '12px', borderRadius: '12px', border: paymentMode === 'full_bs' ? '2px solid #c97282' : '1px solid rgba(223, 178, 140, 0.4)', background: paymentMode === 'full_bs' ? '#fff0f2' : '#fff', color: paymentMode === 'full_bs' ? '#c97282' : '#a0909a', fontWeight: '800', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }}
                        >TODO EN BS</button>
                        <button 
                          onClick={() => setPaymentMode('financed')}
                          style={{ flex: '1 0 100%', padding: '12px', borderRadius: '12px', border: paymentMode === 'financed' ? '2px solid #c97282' : '1px solid rgba(223, 178, 140, 0.4)', background: paymentMode === 'financed' ? '#fff0f2' : '#fff', color: paymentMode === 'financed' ? '#c97282' : '#a0909a', fontWeight: '800', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }}
                        >PAGO FRACCIONADO (3 CUOTAS)</button>
                      </div>

                      {paymentMode === 'full_usd' && (
                        <div style={{ padding: '16px', backgroundColor: '#fcf9f8', borderRadius: '16px', border: '1px solid rgba(223, 178, 140, 0.2)' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#a0909a', marginBottom: '8px', display: 'block' }}>MÉTODO DE PAGO ($)</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {['Efectivo', 'Zelle', 'Binance'].map(m => (
                              <button 
                                key={m}
                                onClick={() => setMethodUsd(m)}
                                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: methodUsd === m ? '1.5px solid #c97282' : '1px solid rgba(223,178,140,0.3)', background: methodUsd === m ? '#fff' : 'transparent', color: methodUsd === m ? '#c97282' : '#a0909a', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                              >{m}</button>
                            ))}
                          </div>
                        </div>
                      )}

                      {paymentMode === 'full_bs' && (
                        <div style={{ padding: '16px', backgroundColor: '#fcf9f8', borderRadius: '16px', border: '1px solid rgba(223, 178, 140, 0.2)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#a0909a' }}>MONTO REFERENCIAL A TASA BCV</label>
                            <div style={{ fontWeight: '900', color: '#c97282', fontSize: '1.2rem' }}>
                              {(selectedService.price * exchangeRate).toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})} BS
                            </div>
                          </div>
                          <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#a0909a', marginBottom: '8px', display: 'block' }}>MÉTODO DE PAGO (BS)</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {['Pago Móvil', 'Efectivo', 'Punto'].map(m => (
                              <button 
                                key={m}
                                onClick={() => setMethodBs(m)}
                                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: methodBs === m ? '1.5px solid #c97282' : '1px solid rgba(223,178,140,0.3)', background: methodBs === m ? '#fff' : 'transparent', color: methodBs === m ? '#c97282' : '#a0909a', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                              >{m}</button>
                            ))}
                          </div>
                        </div>
                      )}

                      {paymentMode === 'financed' && (
                        <div style={{ padding: '16px', backgroundColor: '#fcf9f8', borderRadius: '16px', border: '1px solid rgba(223, 178, 140, 0.2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2d1b22' }}>Primera Cuota (30%)</label>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#a0909a', fontWeight: 800 }}>$</span>
                              <input 
                                type="text" 
                                readOnly
                                value={(selectedService.price * 0.3).toFixed(2)}
                                style={{ width: '100%', padding: '16px 16px 16px 36px', borderRadius: '12px', border: '1.5px solid rgba(223, 178, 140, 0.3)', backgroundColor: '#fff', fontSize: '1rem', color: '#2d1b22', fontWeight: 800, outline: 'none' }} 
                              />
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fff0f2', borderRadius: '10px', border: '1px solid rgba(201,114,130,0.2)' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c97282' }}>Restante (2 cuotas):</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#c97282' }}>${(selectedService.price * 0.7).toFixed(2)} USD</span>
                          </div>
                          
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#a0909a', marginBottom: '8px', display: 'block' }}>MÉTODO DE ABONO ($)</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {['Efectivo', 'Zelle', 'Binance'].map(m => (
                                <button 
                                  key={m}
                                  onClick={() => setMethodUsd(m)}
                                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: methodUsd === m ? '1.5px solid #c97282' : '1px solid rgba(223,178,140,0.3)', background: methodUsd === m ? '#fff' : 'transparent', color: methodUsd === m ? '#c97282' : '#a0909a', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                >{m}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button disabled={loading} onClick={handleConfirmSale} style={{ padding: '18px', borderRadius: '16px', background: 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)', color: '#fff', fontWeight: 800, fontSize: '1.05rem', border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(201, 114, 130, 0.25)', transition: 'transform 0.2s, box-shadow 0.2s', marginTop: '10px' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(201, 114, 130, 0.35)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(201, 114, 130, 0.25)'; }}>
                    {loading ? <Loader className="spin" size={20} /> : 'Confirmar Venta y Generar Cuotas'}
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
};

export default LaserPackageModal;
