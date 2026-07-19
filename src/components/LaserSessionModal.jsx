import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, AlertTriangle, CheckSquare, Sparkles, Plus, DollarSign, Loader } from 'lucide-react';
import AnimatedModal from './AnimatedModal';
import { dataService } from '../services/dataService';
import { notificationService } from '../services/notificationService';

const LaserSessionModal = ({ isOpen, onClose, isMobile, packageData }) => {
  const [agreed, setAgreed] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('10:00 AM');
  const [notes, setNotes] = useState('');
  const [suppliesCost, setSuppliesCost] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Installment payment states
  const [payingInstallmentId, setPayingInstallmentId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [exchangeRate, setExchangeRate] = useState(1);

  const dates = [
    { day: 'Hoy', date: new Date().toISOString().split('T')[0] },
    { day: 'Mañana', date: new Date(Date.now() + 86400000).toISOString().split('T')[0] }
  ];

  const times = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setAgreed(false);
      setNotes('');
      setSuppliesCost(0);
      setPayingInstallmentId(null);
      loadExchangeRate();
    }
  }, [isOpen]);

  const loadExchangeRate = async () => {
    try {
      const rates = await dataService.getExchangeRates();
      if (rates && rates.bcv) {
        setExchangeRate(rates.bcv);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePayInstallment = async (inst) => {
    try {
      setLoading(true);
      // 1. Update installment status
      await dataService.updatePackageInstallment(inst.id, {
        status: 'paid',
        paid_at: new Date().toISOString()
      });

      // 2. Add transaction
      // Determinar descripción basada en el número de cuota
      // Cuota 1: Pago Empleada (30%), Cuota 2: Pago Socia (40%), Cuota 3: Local (30%)
      let description = `Pago Cuota ${inst.installment_number} Paquete Láser - ${packageData.client}`;
      if (packageData.totalSessions === 8) {
        if (inst.installment_number === 1) description += ' (Destinado a Empleada - 30%)';
        if (inst.installment_number === 2) description += ' (Destinado a Socia/Insumos - 40%)';
        if (inst.installment_number === 3) description += ' (Destinado a Local - 30%)';
      }

      await dataService.addTransaction({
        client_id: packageData.raw?.client_id,
        amount: inst.amount,
        type: 'Ingreso',
        description,
        payment_method: paymentMethod,
        usd_rate: exchangeRate
      });

      notificationService.sendNotification('Éxito', `Cuota ${inst.installment_number} cobrada correctamente.`);
      setPayingInstallmentId(null);
      
      // Invalidate cache and reload
      dataService.invalidateOperationalCache();
      onClose();
    } catch (err) {
      console.error(err);
      notificationService.sendNotification('Error', 'No se pudo registrar el pago de la cuota.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSession = async () => {
    if (!packageData) return;
    try {
      setLoading(true);

      // Consumir la sesión y registrar el costo de insumos de la socia
      await dataService.usePackageSession(
        packageData.id,
        null,
        notes || `Sesión agendada para el ${selectedDate} a las ${selectedTime}`,
        suppliesCost
      );

      // Crear movimiento de caja o notificación si los insumos superaron cierto límite
      if (suppliesCost > 0) {
        await dataService.addTransaction({
          client_id: packageData.raw?.client_id,
          amount: suppliesCost,
          type: 'Egreso',
          description: `Costo Insumos Sesión Láser - ${packageData.client}`,
          payment_method: 'Caja Chica',
          usd_rate: exchangeRate
        });
      }

      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      notificationService.sendNotification('Error', err.message || 'No se pudo registrar la sesión.');
    } finally {
      setLoading(false);
    }
  };

  // Find next pending installment
  const pendingInstallments = (packageData?.raw?.package_installments || [])
    .filter(i => i.status === 'pending')
    .sort((a, b) => a.installment_number - b.installment_number);

  const nextInstallment = pendingInstallments[0];

  return (
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={`modal-overlay ${overlayClass}`} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(45, 27, 34, 0.4)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '20px' }}>
          <div className={`modal-card ${cardClass}`} style={{ width: '100%', maxWidth: '500px', backgroundColor: '#fff', borderRadius: isMobile ? '28px 28px 0 0' : '28px', maxHeight: isMobile ? '90vh' : '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(74, 48, 54, 0.15)', overflow: 'hidden' }}>
            
            {/* Header */}
            {!isSuccess && (
              <div style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(223, 178, 140, 0.15)', backgroundColor: '#fff' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#2d1b22', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={20} color="#c97282" />
                    Registrar Sesión Láser
                  </h3>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#a0909a', fontWeight: 600 }}>
                    Control de Sesiones e Insumos
                  </p>
                </div>
                <button onClick={onClose} className="btn-press" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f0f2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0909a', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Content */}
            {!isSuccess ? (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }} className="jana-scrollbar">
              
                  {/* Context / Reminder */}
                  <div style={{ background: '#fcf9f8', padding: '20px', borderRadius: '16px', border: '1px solid rgba(223, 178, 140, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #fff0f2 0%, #ffe1e6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', fontWeight: 900, fontSize: '1.2rem' }}>
                        {packageData?.client?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2d1b22' }}>{packageData?.client || 'Clienta'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#c97282', fontWeight: 700 }}>Sesión {packageData ? packageData.currentSession + 1 : 1} de {packageData?.totalSessions || 8}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#a0909a', fontWeight: 600 }}>{packageData?.package || 'Paquete Láser'}</div>
                  </div>

                  {/* Expiration warning */}
                  {packageData?.raw?.expires_at && (
                    <div style={{ fontSize: '0.8rem', color: '#a0909a', fontWeight: 600 }}>
                      Vence el: {new Date(packageData.raw.expires_at).toLocaleDateString()}
                    </div>
                  )}

                  {/* Outstanding Debt / Pay Installment */}
                  {nextInstallment && (
                    <div style={{ background: '#fff0f2', border: '1px solid rgba(220, 38, 38, 0.3)', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <AlertTriangle size={20} color="#dc2626" style={{ marginTop: '2px' }} />
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#991b1b' }}>Cuota {nextInstallment.installment_number} Pendiente: ${nextInstallment.amount}</div>
                          <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '4px', fontWeight: 500 }}>
                            {packageData.totalSessions === 8 && nextInstallment.installment_number === 2 && 'Esta cuota corresponde al 40% (Insumos/Socia).'}
                            {packageData.totalSessions === 8 && nextInstallment.installment_number === 3 && 'Esta cuota corresponde al 30% (Local).'}
                            Por favor regístrala antes de la sesión.
                          </div>
                        </div>
                      </div>
                      
                      {payingInstallmentId !== nextInstallment.id ? (
                        <button 
                          onClick={() => setPayingInstallmentId(nextInstallment.id)}
                          style={{ alignSelf: 'flex-start', padding: '8px 16px', borderRadius: '10px', background: '#dc2626', color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          Cobrar Cuota Ahora
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid rgba(201,114,130,0.3)' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a0909a' }}>MÉTODO DE PAGO</label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {['Efectivo', 'Zelle', 'Pago Móvil'].map(m => (
                              <button 
                                key={m}
                                onClick={() => setPaymentMethod(m)}
                                style={{ flex: 1, padding: '6px', borderRadius: '8px', border: paymentMethod === m ? '1.5px solid #c97282' : '1px solid #e2e8f0', background: '#fff', fontSize: '0.75rem', fontWeight: 700 }}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                          <button 
                            disabled={loading}
                            onClick={() => handlePayInstallment(nextInstallment)}
                            style={{ padding: '8px', borderRadius: '8px', background: '#c97282', color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.8rem', marginTop: '4px', cursor: 'pointer' }}
                          >
                            {loading ? 'Procesando...' : `Confirmar Pago de $${nextInstallment.amount}`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual Supplies Cost Tracking */}
                  <div>
                    <label style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2d1b22', marginBottom: '8px', display: 'block' }}>
                      Costo de Insumos de esta Sesión (USD)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#a0909a', fontWeight: 800 }}>$</span>
                      <input 
                        type="number" 
                        value={suppliesCost}
                        onChange={(e) => setSuppliesCost(Number(e.target.value))}
                        style={{ width: '100%', padding: '14px 16px 14px 32px', borderRadius: '14px', border: '1.5px solid rgba(223, 178, 140, 0.4)', fontSize: '1rem', color: '#2d1b22', fontWeight: 700, outline: 'none' }} 
                        placeholder="0.00"
                      />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#a0909a', marginTop: '4px', display: 'block' }}>
                      Este monto se restará del cobro de la socia.
                    </span>
                  </div>

                  {/* Date & Time Selection */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2d1b22', marginBottom: '8px', display: 'block' }}>Fecha y Hora</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="date" 
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(223,178,140,0.4)', outline: 'none', fontWeight: 600 }}
                        />
                        <select 
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(223,178,140,0.4)', outline: 'none', fontWeight: 600 }}
                        >
                          {times.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2d1b22', marginBottom: '8px', display: 'block' }}>Notas de la sesión</label>
                    <textarea 
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Ej. Revisión de piel ok, potencia 12J..."
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(223,178,140,0.4)', outline: 'none', minHeight: '80px', fontFamily: 'inherit' }}
                    />
                  </div>

                  {/* Consent check */}
                  <div 
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: agreed ? 'rgba(201, 114, 130, 0.05)' : '#fff', border: agreed ? '1px solid rgba(201, 114, 130, 0.3)' : '1px solid rgba(223, 178, 140, 0.3)', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setAgreed(!agreed)}
                  >
                    <div style={{ marginTop: '2px', color: agreed ? '#c97282' : '#a0909a' }}>
                      <CheckSquare size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2d1b22' }}>Confirmación del Procedimiento</div>
                      <div style={{ fontSize: '0.8rem', color: '#a0909a', marginTop: '4px', fontWeight: 500, lineHeight: 1.4 }}>Confirmo que se aplicaron las pautas de seguridad para láser diodo.</div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '24px 32px', borderTop: '1px solid rgba(223, 178, 140, 0.15)', backgroundColor: '#fff' }}>
                  <button 
                    onClick={handleConfirmSession}
                    disabled={!agreed || loading}
                    style={{ 
                      width: '100%', padding: '18px', borderRadius: '16px', 
                      background: agreed ? 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)' : '#f5f0f2', 
                      color: agreed ? '#fff' : '#a0909a', 
                      fontWeight: 800, fontSize: '1.05rem', border: 'none', cursor: agreed ? 'pointer' : 'not-allowed', 
                      boxShadow: agreed ? '0 8px 24px rgba(201, 114, 130, 0.25)' : 'none', 
                      transition: 'all 0.2s' 
                    }}
                  >
                    {loading ? <Loader className="spin" size={20} /> : 'Registrar Sesión y Consumir'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: 'fadeInUpWow 0.5s ease forwards' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #fff0f2 0%, #ffe1e6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', boxShadow: '0 12px 32px rgba(201, 114, 130, 0.2)', marginBottom: '24px' }}>
                  <Sparkles size={40} />
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2d1b22', marginBottom: '12px', letterSpacing: '-0.5px' }}>¡Sesión Registrada!</h2>
                <p style={{ fontSize: '0.95rem', color: '#8c767b', fontWeight: 500, lineHeight: 1.5, marginBottom: '32px', maxWidth: '300px' }}>
                  La sesión de <span style={{ fontWeight: 800, color: '#c97282' }}>{packageData?.client || 'la clienta'}</span> ha sido registrada exitosamente.
                </p>
                <button 
                  onClick={onClose}
                  style={{ 
                    width: '100%', padding: '18px', borderRadius: '16px', 
                    background: 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)', 
                    color: '#fff', fontWeight: 800, fontSize: '1.05rem', border: 'none', cursor: 'pointer', 
                    boxShadow: '0 8px 24px rgba(201, 114, 130, 0.25)', transition: 'all 0.2s' 
                  }}
                >
                  Entendido, volver a Inicio
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </AnimatedModal>
  );
};

export default LaserSessionModal;
