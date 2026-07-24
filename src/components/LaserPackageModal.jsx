import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Sparkles, User, Package, Calendar, DollarSign, ChevronDown, ChevronRight, Plus, Loader } from 'lucide-react';
import AnimatedModal from './AnimatedModal';
import LaserGunIcon from './LaserGunIcon';
import { dataService } from '../services/dataService';
import { notificationService } from '../services/notificationService';
import { buildLaserInstallmentPlan, buildLaserTenderBreakdown } from '../domain/laserRules';

const LaserPackageModal = ({ isOpen, onClose, isMobile }) => {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [totalSessions, setTotalSessions] = useState(8);
  const [customPrice, setCustomPrice] = useState('');
  const catalogPrice = Number(totalSessions === 8
    ? selectedService?.laser_price_8
    : totalSessions === 4
      ? selectedService?.laser_price_4
      : selectedService?.laser_price_single ?? selectedService?.price) || Number(selectedService?.price || 0);
  const packagePrice = customPrice === '' ? catalogPrice : Math.max(0, Number(customPrice) || 0);

  const [isFinanced, setIsFinanced] = useState(false);
  const [tenderMode, setTenderMode] = useState('full_usd');
  const [mixedUsdAmount, setMixedUsdAmount] = useState('');
  const [methodUsd, setMethodUsd] = useState('Efectivo');
  const [methodBs, setMethodBs] = useState('Pago Móvil');
  
  // Custom client form
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  // Exchange rate
  const [exchangeRate, setExchangeRate] = useState(1);
  const installmentPlan = buildLaserInstallmentPlan({
    total: packagePrice,
    sessions: totalSessions,
    financed: isFinanced,
  });
  const amountDueUsd = installmentPlan[0]?.amount || 0;
  const remainingUsd = installmentPlan.slice(1).reduce((sum, installment) => sum + installment.amount, 0);
  const mixedUsdValue = Math.max(0, Number(mixedUsdAmount) || 0);
  const mixedAmountInvalid = tenderMode === 'mixed' && mixedUsdValue > amountDueUsd;
  const tenderBreakdown = buildLaserTenderBreakdown({
    amountUsd: amountDueUsd,
    exchangeRate,
    tenderMode,
    usdPortion: Math.min(amountDueUsd, mixedUsdValue),
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      setStep(1);
      setSelectedClient(null);
      setSelectedService(null);
      setSearchQuery('');
      setIsFinanced(false);
      setTenderMode('full_usd');
      setMixedUsdAmount('');
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
    if (mixedAmountInvalid) {
      notificationService.sendNotification('Revisa el pago', 'La parte en dólares no puede superar la cuota de hoy.');
      return;
    }
    
    try {
      setLoading(true);

      const totalAmount = packagePrice;
      const formattedUsd = tenderBreakdown.usdAmount.toFixed(2);
      const formattedBs = tenderBreakdown.bsAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      let finalMethod = `USD · ${methodUsd}`;
      if (tenderMode === 'full_bs') finalMethod = `Bs · ${methodBs}`;
      if (tenderMode === 'mixed') {
        finalMethod = `Mixto · $${formattedUsd} ${methodUsd} + Bs ${formattedBs} ${methodBs}`;
      }
      if (isFinanced) finalMethod = `Cuota 1 (30%) · ${finalMethod}`;
      await dataService.sellLaserPackage({
        clientId: selectedClient.id,
        serviceId: selectedService.id,
        sessions: totalSessions,
        total: totalAmount,
        paymentMode: isFinanced ? 'financed' : tenderMode,
        paymentMethod: finalMethod,
        exchangeRate
      });

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
                        onClick={() => { setSelectedService(svc); setCustomPrice(''); setStep(3); }}
                        className="hover-lift" 
                        style={{ padding: '20px', borderRadius: '16px', border: selectedService?.id === svc.id ? '2px solid #c97282' : '1px solid rgba(223, 178, 140, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.2s', background: selectedService?.id === svc.id ? '#fff0f2' : '#fff' }}
                      >
                        <div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2d1b22' }}>{svc.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#a0909a', fontWeight: 500, marginTop: '4px' }}>Incluye revisión inicial</div>
                        </div>
                        <div style={{ textAlign: 'right' }}><div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#c97282' }}>${svc.laser_price_8 || svc.price}</div><div style={{ fontSize: '0.68rem', color: '#a0909a' }}>paquete de 8</div></div>
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
                      <div style={{ position: 'relative', width: 120 }}><span style={{ position: 'absolute', left: 10, top: 9, color: '#c97282', fontWeight: 900 }}>$</span><input aria-label="Precio del paquete" type="number" min="0" step="0.01" value={customPrice === '' ? catalogPrice : customPrice} onChange={e => setCustomPrice(e.target.value)} style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(201,114,130,.35)', padding: '0 8px 0 24px', fontSize: '1rem', fontWeight: 900, color: '#c97282', textAlign: 'right' }} /></div>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#a0909a', display: 'block', marginBottom: 8 }}>SESIONES DEL PAQUETE</label>
                    <select value={totalSessions} onChange={e => { const sessions = Number(e.target.value); setTotalSessions(sessions); setCustomPrice(''); if (sessions !== 8) setIsFinanced(false); }} style={{ width: '100%', height: 42, borderRadius: 12, border: '1px solid rgba(223,178,140,.4)', padding: '0 12px', marginBottom: 18 }}>
                      <option value={1}>1 sesión</option><option value={4}>4 sesiones</option><option value={8}>8 sesiones</option>
                    </select>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#2d1b22' }}>Plan de pago del paquete</h4>
                    <p style={{ margin: '0 0 14px', fontSize: '0.8rem', color: '#a0909a', lineHeight: 1.45 }}>Elige si se cancela completo o en cuotas. La moneda se selecciona aparte.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => setIsFinanced(false)}
                          style={{ flex: 1, padding: '12px', borderRadius: '12px', border: !isFinanced ? '2px solid #c97282' : '1px solid rgba(223, 178, 140, 0.4)', background: !isFinanced ? '#fff0f2' : '#fff', color: !isFinanced ? '#c97282' : '#a0909a', fontWeight: '800', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }}
                        >PAGO COMPLETO</button>
                        <button 
                          onClick={() => totalSessions === 8 && setIsFinanced(true)}
                          disabled={totalSessions !== 8}
                          style={{ flex: 1, padding: '12px', borderRadius: '12px', border: isFinanced ? '2px solid #c97282' : '1px solid rgba(223, 178, 140, 0.4)', background: isFinanced ? '#fff0f2' : '#fff', color: isFinanced ? '#c97282' : '#a0909a', opacity: totalSessions === 8 ? 1 : .55, fontWeight: '800', cursor: totalSessions === 8 ? 'pointer' : 'not-allowed', fontSize: '0.8rem', transition: 'all 0.2s' }}
                        >{totalSessions === 8 ? 'PAGO FRACCIONADO (30/40/30)' : 'SOLO PARA 8 SESIONES'}</button>
                      </div>

                      {isFinanced && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#fff0f2', borderRadius: '12px', border: '1px solid rgba(201,114,130,0.2)' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c97282' }}>Quedarán 2 cuotas pendientes</span>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#c97282' }}>${remainingUsd.toFixed(2)} USD</div>
                            <div style={{ fontSize: '0.7rem', color: '#a0909a' }}>Ref. {(remainingUsd * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</div>
                          </div>
                        </div>
                      )}

                      <div style={{ padding: '16px', backgroundColor: '#fcf9f8', borderRadius: '16px', border: '1px solid rgba(223, 178, 140, 0.2)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: '0.76rem', color: '#a0909a', fontWeight: 800, textTransform: 'uppercase' }}>{isFinanced ? 'Primera cuota (30%)' : 'Monto a pagar hoy'}</div>
                            <div style={{ fontSize: '1.45rem', lineHeight: 1.2, color: '#2d1b22', fontWeight: 900 }}>${amountDueUsd.toFixed(2)} USD</div>
                          </div>
                          <div style={{ textAlign: 'right', color: '#a0909a', fontSize: '0.76rem', fontWeight: 700 }}>
                            Ref. {(amountDueUsd * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2d1b22', marginBottom: '8px', display: 'block' }}>¿Cómo paga hoy?</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {[
                              ['full_usd', 'TODO EN $'],
                              ['full_bs', 'TODO EN BS'],
                              ['mixed', 'PAGO MIXTO'],
                            ].map(([mode, label]) => (
                              <button
                                key={mode}
                                onClick={() => {
                                  setTenderMode(mode);
                                  if (mode === 'mixed' && mixedUsdAmount === '') setMixedUsdAmount((amountDueUsd / 2).toFixed(2));
                                }}
                                style={{ flex: 1, padding: '10px 6px', borderRadius: '10px', border: tenderMode === mode ? '1.5px solid #c97282' : '1px solid rgba(223,178,140,0.3)', background: tenderMode === mode ? '#fff0f2' : '#fff', color: tenderMode === mode ? '#c97282' : '#a0909a', fontSize: '0.73rem', fontWeight: 800, cursor: 'pointer' }}
                              >{label}</button>
                            ))}
                          </div>
                        </div>

                        {tenderMode === 'mixed' && (
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                            <label style={{ fontSize: '0.75rem', color: '#a0909a', fontWeight: 800 }}>
                              PARTE EN DÓLARES
                              <div style={{ position: 'relative', marginTop: 6 }}>
                                <span style={{ position: 'absolute', left: 12, top: 11, color: '#c97282', fontWeight: 800 }}>$</span>
                                <input type="number" min="0" max={amountDueUsd} step="0.01" value={mixedUsdAmount} onChange={e => setMixedUsdAmount(e.target.value)} style={{ width: '100%', height: 42, boxSizing: 'border-box', borderRadius: 10, border: mixedAmountInvalid ? '1.5px solid #ef4444' : '1px solid rgba(223,178,140,.4)', padding: '0 10px 0 28px', color: '#2d1b22', fontWeight: 800 }} />
                              </div>
                            </label>
                            <div style={{ padding: '9px 12px', borderRadius: 10, background: '#fff', border: '1px solid rgba(223,178,140,.3)' }}>
                              <div style={{ fontSize: '0.7rem', color: '#a0909a', fontWeight: 800 }}>RESTANTE EN BOLÍVARES</div>
                              <div style={{ color: '#c97282', fontWeight: 900, marginTop: 3 }}>{tenderBreakdown.bsAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</div>
                            </div>
                          </div>
                        )}

                        {(tenderMode === 'full_usd' || tenderMode === 'mixed') && (
                          <div>
                            <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#a0909a', marginBottom: '7px', display: 'block' }}>MÉTODO EN DÓLARES</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {['Efectivo', 'Zelle', 'Binance'].map(m => (
                                <button key={m} onClick={() => setMethodUsd(m)} style={{ flex: 1, padding: '9px', borderRadius: '10px', border: methodUsd === m ? '1.5px solid #c97282' : '1px solid rgba(223,178,140,0.3)', background: methodUsd === m ? '#fff' : 'transparent', color: methodUsd === m ? '#c97282' : '#a0909a', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>{m}</button>
                              ))}
                            </div>
                          </div>
                        )}

                        {(tenderMode === 'full_bs' || tenderMode === 'mixed') && (
                          <div>
                            <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#a0909a', marginBottom: '7px', display: 'block' }}>MÉTODO EN BOLÍVARES</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {['Pago Móvil', 'Efectivo', 'Punto'].map(m => (
                                <button key={m} onClick={() => setMethodBs(m)} style={{ flex: 1, padding: '9px', borderRadius: '10px', border: methodBs === m ? '1.5px solid #c97282' : '1px solid rgba(223,178,140,0.3)', background: methodBs === m ? '#fff' : 'transparent', color: methodBs === m ? '#c97282' : '#a0909a', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>{m}</button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button disabled={loading} onClick={handleConfirmSale} style={{ padding: '18px', borderRadius: '16px', background: 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)', color: '#fff', fontWeight: 800, fontSize: '1.05rem', border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(201, 114, 130, 0.25)', transition: 'transform 0.2s, box-shadow 0.2s', marginTop: '10px' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(201, 114, 130, 0.35)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(201, 114, 130, 0.25)'; }}>
                    {loading ? <Loader className="spin" size={20} /> : isFinanced ? 'Confirmar venta y generar cuotas' : 'Confirmar venta'}
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
