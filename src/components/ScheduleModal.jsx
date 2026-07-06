import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  ChevronRight,
  ChevronLeft,
  Check
} from 'lucide-react';
import { dataService } from '../services/dataService';
import AnimatedModal from './AnimatedModal';

const ScheduleModal = ({ 
  isOpen, 
  onClose, 
  client, 
  service, 
  staff, 
  onSchedule, 
  defaultDate,
  clients = [],
  services = [],
  onSave
}) => {
  const isSingleStaff = staff && !Array.isArray(staff) && typeof staff === 'object';
  const staffArray = Array.isArray(staff) ? staff : [];

  const [selectedDate, setSelectedDate] = useState(defaultDate || new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [customTime, setCustomTime] = useState('10:00');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [localClient, setLocalClient] = useState(client || null);
  const [localService, setLocalService] = useState(service || null);
  const [localStaff, setLocalStaff] = useState(isSingleStaff ? staff : null);
  const [clientActivePackages, setClientActivePackages] = useState([]);

  // Fetch client packages when client changes
  useEffect(() => {
    if (localClient?.id) {
      dataService.getClientPackages(localClient.id).then(pkgs => {
        setClientActivePackages((pkgs || []).filter(p => p.status === 'active' && (p.total_sessions - p.used_sessions) > 0));
      }).catch(err => console.error("Error loading packages in ScheduleModal:", err));
    } else {
      setClientActivePackages([]);
    }
  }, [localClient?.id]);

  useEffect(() => {
    if (isOpen && localStaff) {
      loadAvailability();
    }
  }, [isOpen, selectedDate, localStaff]);

  const loadAvailability = async () => {
    if (!localStaff) return;
    try {
      setLoading(true);
      const safeDate = selectedDate instanceof Date && !isNaN(selectedDate) ? selectedDate : new Date();
      const dateStr = safeDate.toISOString().split('T')[0];
      const allApps = await dataService.getAppointmentsByState(['Agendado', 'En Silla', 'Por Pagar']);
      const dailyApps = (allApps || []).filter(a => 
        a.staff_id === localStaff.id && 
        (a.scheduled_at?.startsWith(dateStr) || (!a.scheduled_at && a.created_at?.startsWith(dateStr)))
      );

      const slots = [];
      const startHour = 8; // Restrict standard slots from 8:00 AM to 8:00 PM for beauty salon aesthetics
      const endHour = 20;
      const now = new Date();
      const isToday = selectedDate.toDateString() === now.toDateString();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let min of [0, 30]) {
          if (isToday && (hour < currentHour || (hour === currentHour && min <= currentMinutes))) {
            continue;
          }

          const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
          const isOccupied = dailyApps.some(a => {
            const appDate = new Date(a.scheduled_at || a.created_at);
            return appDate.getHours() === hour && appDate.getMinutes() === min;
          });

          slots.push({
            time: timeStr,
            isAvailable: !isOccupied,
            isOccupied
          });
        }
      }
      setAvailableSlots(slots);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    const timeToUse = isCustomMode ? customTime : selectedSlot;
    if (!timeToUse) return;
    
    const [hours, minutes] = timeToUse.split(':');
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (onSchedule) {
      onSchedule(scheduledAt.toISOString());
    } else if (onSave) {
      if (!localClient || !localService || !localStaff) return;
      try {
        setLoading(true);
        await dataService.createAppointment({
          client_id: localClient.id,
          service_id: localService.id,
          staff_id: localStaff.id,
          status: 'Agendado',
          total_price: localService.price,
          scheduled_at: scheduledAt.toISOString()
        });
        onSave();
      } catch (err) {
        console.error("Error creating appointment:", err);
      } finally {
        setLoading(false);
      }
    }
    onClose();
  };

  const getDisplayTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const matchingPkg = localService && clientActivePackages.find(p => p.service_id === localService.id);

  return createPortal(
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 20000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className={`glass-card ${cardClass}`} style={{ maxWidth: '600px', width: '100%', borderRadius: '32px', padding: '32px', border: '1px solid rgba(196,139,159,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '950' }}>Agendar <span className="text-gold">Turno</span></h2>
                {localService && localStaff && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{localService?.name} con {localStaff?.name}</p>
                )}
              </div>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X /></button>
            </div>

            {/* Dynamic Selectors if not pre-specified */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {!client && clients.length > 0 && (
                <div>
                  <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', letterSpacing: '1px' }}>SELECCIONAR CLIENTE</label>
                  <select 
                    value={localClient?.id || ''} 
                    onChange={(e) => setLocalClient(clients.find(c => c.id === e.target.value))}
                    style={{ width: '100%', height: '38px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', padding: '0 8px', fontSize: '12px', outline: 'none' }}
                  >
                    <option value="" style={{ backgroundColor: 'black' }}>-- Selecciona un Cliente --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id} style={{ backgroundColor: 'black' }}>{c.name} (V-{c.id_card})</option>
                    ))}
                  </select>
                </div>
              )}

              {!service && services.length > 0 && (
                <div>
                  <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', letterSpacing: '1px' }}>SELECCIONAR SERVICIO</label>
                  <select 
                    value={localService?.id || ''} 
                    onChange={(e) => setLocalService(services.find(s => s.id === e.target.value))}
                    style={{ width: '100%', height: '38px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', padding: '0 8px', fontSize: '12px', outline: 'none' }}
                  >
                    <option value="" style={{ backgroundColor: 'black' }}>-- Selecciona un Servicio --</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id} style={{ backgroundColor: 'black' }}>{s.name} - ${s.price}</option>
                    ))}
                  </select>
                  {matchingPkg && (
                    <div style={{ fontSize: '10px', color: '#34c759', fontWeight: '800', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>✓ Cliente tiene paquete activo ({matchingPkg.total_sessions - matchingPkg.used_sessions} sesiones restantes)</span>
                    </div>
                  )}
                </div>
              )}

              {!isSingleStaff && staffArray.length > 0 && (
                <div>
                  <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', letterSpacing: '1px' }}>SELECCIONAR ESTILISTA</label>
                  <select 
                    value={localStaff?.id || ''} 
                    onChange={(e) => setLocalStaff(staffArray.find(s => s.id === e.target.value))}
                    style={{ width: '100%', height: '38px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', padding: '0 8px', fontSize: '12px', outline: 'none' }}
                  >
                    <option value="" style={{ backgroundColor: 'black' }}>-- Selecciona un Estilista --</option>
                    {staffArray.map(s => (
                      <option key={s.id} value={s.id} style={{ backgroundColor: 'black' }}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Date Selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px 20px', borderRadius: '16px' }}>
              <button onClick={() => {
                const prev = new Date(selectedDate);
                prev.setDate(selectedDate.getDate() - 1);
                setSelectedDate(prev);
              }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><ChevronLeft /></button>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: '800', fontSize: '16px' }}>
                  {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>

              <button onClick={() => {
                const next = new Date(selectedDate);
                next.setDate(selectedDate.getDate() + 1);
                setSelectedDate(next);
              }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><ChevronRight /></button>
            </div>

            {/* Selection Mode Toggle */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button 
                onClick={() => setIsCustomMode(false)}
                style={{ 
                  flex: 1, height: '40px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s',
                  backgroundColor: !isCustomMode ? 'rgba(196,139,159,0.1)' : 'rgba(255,255,255,0.02)',
                  border: !isCustomMode ? '1px solid var(--pink-primary)' : '1px solid rgba(255,255,255,0.05)',
                  color: !isCustomMode ? 'var(--pink-primary)' : 'white'
                }}
              >
                HORARIOS DISPONIBLES
              </button>
              <button 
                onClick={() => setIsCustomMode(true)}
                style={{ 
                  flex: 1, height: '40px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s',
                  backgroundColor: isCustomMode ? 'rgba(196,139,159,0.1)' : 'rgba(255,255,255,0.02)',
                  border: isCustomMode ? '1px solid var(--pink-primary)' : '1px solid rgba(255,255,255,0.05)',
                  color: isCustomMode ? 'var(--pink-primary)' : 'white'
                }}
              >
                PERSONALIZADO
              </button>
            </div>

            {/* Slots Grid / Custom Time Input */}
            <div style={{ marginBottom: '32px' }}>
              {isCustomMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', padding: '24px 0' }}>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--pink-primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Ingresa la hora deseada</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Clock size={20} color="var(--pink-primary)" />
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(196,139,159,0.3)',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '22px',
                        fontWeight: '800',
                        padding: '10px 18px',
                        outline: 'none',
                        fontFamily: 'Outfit, sans-serif',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--pink-primary)', marginBottom: '16px', letterSpacing: '1px' }}>SELECCIONA UN TURNO</label>
                  {!localStaff ? (
                    <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Selecciona un estilista para ver turnos disponibles
                    </div>
                  ) : loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>Cargando disponibilidad...</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px', maxHeight: '250px', overflowY: 'auto', padding: '4px' }}>
                      {availableSlots.map(slot => {
                        const time12 = getDisplayTime(slot.time);

                        return (
                          <button
                            key={slot.time}
                            disabled={!slot.isAvailable}
                            onClick={() => setSelectedSlot(slot.time)}
                            style={{
                              padding: '12px 0',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '800',
                              cursor: slot.isAvailable ? 'pointer' : 'not-allowed',
                              backgroundColor: selectedSlot === slot.time ? 'var(--pink-primary)' : slot.isAvailable ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                              border: selectedSlot === slot.time ? 'none' : '1px solid rgba(255,255,255,0.05)',
                              color: selectedSlot === slot.time ? 'black' : slot.isAvailable ? 'white' : 'rgba(255,255,255,0.1)',
                              transition: 'all 0.2s',
                              textDecoration: !slot.isAvailable ? 'line-through' : 'none'
                            }}
                          >
                            {time12}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <button 
              onClick={handleSchedule}
              disabled={isCustomMode ? !customTime : !selectedSlot}
              className="btn-pink" 
              style={{ width: '100%', height: '56px', borderRadius: '16px', fontSize: '16px', gap: '10px', opacity: (isCustomMode ? customTime : selectedSlot) ? 1 : 0.5 }}
            >
              <Check size={20} /> CONFIRMAR PARA LAS {isCustomMode ? getDisplayTime(customTime) : getDisplayTime(selectedSlot)}
            </button>
          </div>
        </div>
      )}
    </AnimatedModal>,
    document.body
  );
};

export default ScheduleModal;
