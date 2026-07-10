import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Sparkles, User, Package, Calendar, DollarSign, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import AnimatedModal from './AnimatedModal';
import LaserGunIcon from './LaserGunIcon';

const LaserPackageModal = ({ isOpen, onClose, isMobile }) => {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  
  const [paymentMode, setPaymentMode] = useState('full_usd');
  const [methodUsd, setMethodUsd] = useState('Efectivo');
  const [methodBs, setMethodBs] = useState('Pago Móvil');
  const [initialPaymentUsd, setInitialPaymentUsd] = useState(45);
  

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
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#a0909a', fontWeight: 600 }}>Crea un nuevo tratamiento de depilación</p>
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', minWidth: 0 }} onClick={() => setStep(2)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: step >= 2 ? '#c97282' : '#a0909a', fontWeight: 800, fontSize: isMobile ? '0.7rem' : '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  <Package size={isMobile ? 12 : 14} style={{ flexShrink: 0 }} /> 2. Paquete
                </div>
                <div style={{ height: '4px', background: step >= 2 ? '#c97282' : 'rgba(223,178,140,0.3)', borderRadius: '4px', transition: 'all 0.3s' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', minWidth: 0 }} onClick={() => setStep(3)}>
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
                      
                      {/* Dummy List of Clients */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                        {['María Fernández', 'Ana López', 'Valentina Ruiz'].map((name, i) => (
                          <div key={i} onClick={() => setStep(2)} className="hover-lift" style={{ padding: '16px', borderRadius: '16px', border: '1px solid rgba(223, 178, 140, 0.2)', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'all 0.2s', background: '#fff' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#c97282'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(201,114,130,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(223, 178, 140, 0.2)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f5f0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0909a', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>
                              {name.charAt(0)}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2d1b22' }}>{name}</div>
                              <div style={{ fontSize: '0.8rem', color: '#a0909a', fontWeight: 500 }}>+58 414-000000{i} • Registrada hace 2 meses</div>
                            </div>
                            <ChevronRight size={18} color="#dfb28c" style={{ flexShrink: 0 }} />
                          </div>
                        ))}
                      </div>

                      <button onClick={() => setIsCreatingClient(true)} className="btn-press" style={{ padding: '16px', borderRadius: '16px', border: '2px dashed rgba(201,114,130,0.4)', background: '#fff0f2', color: '#c97282', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', marginTop: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onMouseEnter={e => e.currentTarget.style.background = '#ffe1e6'} onMouseLeave={e => e.currentTarget.style.background = '#fff0f2'}>
                        <Plus size={18} /> Nueva Clienta
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeInUpWow 0.3s ease' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#a0909a', fontWeight: 700, marginBottom: '6px' }}>Nombre Completo</label>
                        <input type="text" placeholder="Ej. Camila Santos" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(223, 178, 140, 0.4)', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#a0909a', fontWeight: 700, marginBottom: '6px' }}>Teléfono (WhatsApp)</label>
                        <input type="tel" placeholder="+58 412..." style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(223, 178, 140, 0.4)', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button onClick={() => setIsCreatingClient(false)} className="btn-press" style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#f5f0f2', border: 'none', color: '#a0909a', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                        <button onClick={() => { setIsCreatingClient(false); setStep(2); }} className="btn-press" style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(201, 114, 130,0.25)' }}>Guardar Clienta</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeInUpWow 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#2d1b22' }}>Selecciona el paquete láser</h4>
                  
                  {/* Dummy Packages Selection */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[
                      { name: 'Brasilera + Medias Piernas', price: 145 },
                      { name: '5 Sesiones (Axilas)', price: 75 },
                      { name: '10 Sesiones (Cuerpo Completo)', price: 400 },
                    ].map((pkg, i) => (
                      <div key={i} onClick={() => setStep(3)} className="hover-lift" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(223, 178, 140, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.2s', background: '#fff' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#c97282'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(223, 178, 140, 0.2)'; }}>
                        <div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2d1b22' }}>{pkg.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#a0909a', fontWeight: 500, marginTop: '4px' }}>Incluye revisión inicial gratuita</div>
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#c97282' }}>${pkg.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUpWow 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                  <div style={{ background: '#fcf9f8', padding: '20px', borderRadius: '16px', border: '1px dashed rgba(223, 178, 140, 0.4)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Resumen de Compra</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2d1b22' }}>María Fernández</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2d1b22', marginTop: '4px' }}>Brasilera + Medias Piernas</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(223, 178, 140, 0.2)' }}>
                      <div style={{ fontSize: '0.9rem', color: '#a0909a', fontWeight: 600 }}>Total a Pagar</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#c97282' }}>$145</div>
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
                        >PAGO FRACCIONADO / FINANCIADO</button>
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
                            <div style={{ fontWeight: '900', color: '#c97282', fontSize: '1.2rem' }}>5.292,50 BS</div>
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
                            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2d1b22' }}>Abono Inicial Hoy</label>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#a0909a', fontWeight: 800 }}>$</span>
                              <input 
                                type="number" 
                                value={initialPaymentUsd}
                                onChange={(e) => setInitialPaymentUsd(Number(e.target.value))}
                                style={{ width: '100%', padding: '16px 16px 16px 36px', borderRadius: '12px', border: '1.5px solid rgba(223, 178, 140, 0.3)', backgroundColor: '#fff', fontSize: '1rem', color: '#2d1b22', fontWeight: 800, outline: 'none' }} 
                              />
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fff0f2', borderRadius: '10px', border: '1px solid rgba(201,114,130,0.2)' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c97282' }}>Deuda Pendiente:</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#c97282' }}>${145 - initialPaymentUsd} USD</span>
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

                  <button onClick={onClose} style={{ padding: '18px', borderRadius: '16px', background: 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)', color: '#fff', fontWeight: 800, fontSize: '1.05rem', border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(201, 114, 130, 0.25)', transition: 'transform 0.2s, box-shadow 0.2s', marginTop: '10px' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(201, 114, 130, 0.35)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(201, 114, 130, 0.25)'; }}>
                    Confirmar Venta
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
