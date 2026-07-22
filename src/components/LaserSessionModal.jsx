import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, AlertTriangle, CheckSquare, Sparkles, Loader, Camera } from 'lucide-react';
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
  const [staff, setStaff] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [beforePhoto, setBeforePhoto] = useState(null);
  const [afterPhoto, setAfterPhoto] = useState(null);
  const [photoPreviews, setPhotoPreviews] = useState({ before: '', after: '' });

  const dates = [
    { day: 'Hoy', date: new Date().toISOString().split('T')[0] },
    { day: 'Mañana', date: new Date(Date.now() + 86400000).toISOString().split('T')[0] }
  ];

  const times = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];
  const completedSessions = packageData?.raw?.package_sessions || [];
  const lastSessionAt = completedSessions.map(s => s.consumed_at || s.scheduled_at).filter(Boolean).sort().at(-1);
  const minimumNextDate = (() => { const d = lastSessionAt ? new Date(lastSessionAt) : new Date(); if (lastSessionAt) d.setDate(d.getDate() + Number(packageData?.raw?.session_interval_days || 21)); return d.toISOString().split('T')[0]; })();

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setAgreed(false);
      setNotes('');
      setSuppliesCost(0);
      setPayingInstallmentId(null);
      setBeforePhoto(null);
      setAfterPhoto(null);
      setPhotoPreviews({ before: '', after: '' });
      loadExchangeRate();
      dataService.getStaff().then(rows => {
        const workers = rows.filter(s => !String(s.role || '').toLowerCase().includes('admin'));
        setStaff(workers);
        setSelectedStaffId(workers[0]?.id || '');
      }).catch(console.error);
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

  const handlePhotoChange = (kind, file) => {
    if (!file) return;
    if (kind === 'before') setBeforePhoto(file);
    else setAfterPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreviews(current => ({ ...current, [kind]: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };

  const handlePayInstallment = async (inst) => {
    try {
      setLoading(true);
      await dataService.payPackageInstallment(inst.id, paymentMethod, exchangeRate);

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
    if (!packageData || !selectedStaffId) return;
    if (selectedDate < minimumNextDate) {
      notificationService.sendNotification('Fecha no permitida', `La siguiente sesión debe ser desde el ${new Date(`${minimumNextDate}T12:00:00`).toLocaleDateString()}.`);
      return;
    }
    try {
      setLoading(true);
      const match = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      let hour = Number(match?.[1] || 10);
      const minute = Number(match?.[2] || 0);
      if (match?.[3]?.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (match?.[3]?.toUpperCase() === 'AM' && hour === 12) hour = 0;
      const scheduledAt = new Date(`${selectedDate}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
      const [beforePhotoPath, afterPhotoPath] = await Promise.all([
        beforePhoto ? dataService.uploadLaserProgressPhoto(beforePhoto, packageData.id, 'before') : Promise.resolve(''),
        afterPhoto ? dataService.uploadLaserProgressPhoto(afterPhoto, packageData.id, 'after') : Promise.resolve(''),
      ]);
      await dataService.createAppointmentWithServices({
        client_id: packageData.raw.client_id,
        status: 'Agendado',
        notes: `${notes || 'Sesión láser'} | Paquete ${packageData.id} | Insumos previstos $${suppliesCost}`
      }, [{
        service_id: packageData.raw.service_id,
        staff_id: selectedStaffId,
        price_paid: 0,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: packageData.raw.services?.duration_minutes || 60,
        client_package_id: packageData.id,
        package_supplies_cost: Number(suppliesCost) || 0,
        before_photo_url: beforePhotoPath || null,
        after_photo_url: afterPhotoPath || null,
      }]);

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
                          {nextInstallment.due_at && <div style={{ fontSize: '0.74rem', color: '#991b1b', marginTop: 2 }}>Vence: {new Date(nextInstallment.due_at).toLocaleDateString()}</div>}
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
                          min={minimumNextDate}
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
                    <div><label style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2d1b22', marginBottom: 8, display: 'block' }}>Profesional</label><select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(223,178,140,0.4)' }}><option value="">Selecciona profesional</option>{staff.map(s => <option key={s.id} value={s.id}>{s.display_name || s.name}</option>)}</select></div>
                  </div>

                  {/* Private progress photos */}
                  <div>
                    <label style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2d1b22', marginBottom: 8, display: 'block' }}>
                      Seguimiento fotográfico
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { kind: 'before', label: 'Antes', preview: photoPreviews.before },
                        { kind: 'after', label: 'Después', preview: photoPreviews.after },
                      ].map(photo => (
                        <label key={photo.kind} style={{ minHeight: 112, border: '1px dashed rgba(201,114,130,.45)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', background: '#fcf9f8', position: 'relative' }}>
                          {photo.preview
                            ? <img src={photo.preview} alt={`Vista previa ${photo.label.toLowerCase()}`} style={{ width: '100%', height: 112, objectFit: 'cover' }} />
                            : <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#a0506a', fontSize: 12, fontWeight: 800 }}><Camera size={20} />Foto {photo.label}</span>}
                          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={event => handlePhotoChange(photo.kind, event.target.files?.[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                        </label>
                      ))}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#a0909a', marginTop: 5, display: 'block' }}>Las imágenes quedan privadas y vinculadas a esta sesión.</span>
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
                    {loading ? <Loader className="spin" size={20} /> : 'Agendar sesión en Agenda'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: 'fadeInUpWow 0.5s ease forwards' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #fff0f2 0%, #ffe1e6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', boxShadow: '0 12px 32px rgba(201, 114, 130, 0.2)', marginBottom: '24px' }}>
                  <Sparkles size={40} />
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2d1b22', marginBottom: '12px', letterSpacing: '-0.5px' }}>¡Sesión agendada!</h2>
                <p style={{ fontSize: '0.95rem', color: '#8c767b', fontWeight: 500, lineHeight: 1.5, marginBottom: '32px', maxWidth: '300px' }}>
                  La sesión de <span style={{ fontWeight: 800, color: '#c97282' }}>{packageData?.client || 'la clienta'}</span> quedó en Agenda. Se consumirá del paquete únicamente al completarla en Caja.
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
