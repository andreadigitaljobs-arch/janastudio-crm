import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  Check,
  AlertTriangle,
  Calendar,
  Sparkles,
  Scissors,
  ArrowRight,
  ArrowLeft,
  Clock
} from 'lucide-react';
import { dataService } from '../services/dataService';
import AnimatedModal from './AnimatedModal';
import JanaSelect from './JanaSelect';
import JanaDatePicker from './JanaDatePicker';
import JanaTimePicker from './JanaTimePicker';
import { isStaffFreeAt } from '../utils/availability';
import { loadStoredSchedules, loadStoredTimeOff } from '../utils/mockStaffSchedules';
import { getBusinessDateKey } from '../utils/dateTime';

const dateToISO = (date) => getBusinessDateKey(date);
const isoToDate = (iso) => iso ? new Date(`${iso}T00:00:00`) : new Date();

const ScheduleModal = ({
  isOpen,
  onClose,
  client,
  service,
  staff,
  initialStaff,
  onSchedule,
  defaultDate,
  initialTime,
  clients = [],
  services = [],
  onSave,
  appointmentToEdit = null,  // ← objeto cita completo para modo edición
}) => {
  const isEditMode = !!appointmentToEdit;
  const staffArray = Array.isArray(staff) ? staff : [];

  // Step wizard state: 1 (Client), 2 (Service), 3 (Staff), 4 (Date/Time), 5 (Summary)
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(defaultDate || new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [customTime, setCustomTime] = useState('10:00');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customConflict, setCustomConflict] = useState(null);
  const [dayAvailabilityCtx, setDayAvailabilityCtx] = useState({ schedules: [], timeOff: [], appointmentsForDay: [] });
  const [loading, setLoading] = useState(false);

  const [localClient, setLocalClient] = useState(client || null);
  const [localService, setLocalService] = useState(service || null);
  const [localStaff, setLocalStaff] = useState(initialStaff || null);
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
  }, [isOpen, selectedDate, localStaff, localService]);

  // Prepopulate step selection and direct steps
  useEffect(() => {
    if (isOpen) {
      if (appointmentToEdit) {
        // Modo edición: pre-cargar todos los campos con los datos de la cita
        const editClient = clients.find(c => c.id === appointmentToEdit.client_id) ||
          appointmentToEdit.clients || null;
        const editService = services.find(s => s.id === appointmentToEdit.service_id) ||
          appointmentToEdit.services || null;
        const staffArray2 = Array.isArray(staff) ? staff : [];
        const editStaff = staffArray2.find(s => s.id === appointmentToEdit.staff_id) ||
          appointmentToEdit.staff || null;

        setLocalClient(editClient);
        setLocalService(editService);
        setLocalStaff(editStaff);

        if (appointmentToEdit.scheduled_at) {
          const dt = new Date(appointmentToEdit.scheduled_at);
          setSelectedDate(dt);
          const hh = dt.getHours().toString().padStart(2, '0');
          const mm = dt.getMinutes().toString().padStart(2, '0');
          setCustomTime(`${hh}:${mm}`);
          setIsCustomMode(true);
        }
        // Ir directo al paso de resumen para poder ver todo y cambiar lo que quiera
        setCurrentStep(5);
      } else {
        setLocalClient(client || null);
        setLocalService(service || null);
        setLocalStaff(initialStaff || null);

        // Determine logical starting step based on provided props
        if (client) {
          if (service) {
            setCurrentStep(3);
          } else {
            setCurrentStep(2);
          }
        } else {
          setCurrentStep(1);
        }
      }
    }
  }, [isOpen, client, service, initialStaff, appointmentToEdit]);

  // Prellenar el turno si venimos de un click en la grilla de la Agenda
  useEffect(() => {
    if (initialTime) {
      setCustomTime(initialTime);
      if (availableSlots.some(s => s.time === initialTime)) {
        setSelectedSlot(initialTime);
      } else {
        setIsCustomMode(true);
      }
    }
  }, [initialTime, availableSlots]);

  const loadAvailability = async () => {
    if (!localStaff) return;
    try {
      setLoading(true);
      const safeDate = selectedDate instanceof Date && !isNaN(selectedDate) ? selectedDate : new Date();
      const dateKey = dateToISO(safeDate);
      const durationMinutes = localService?.duration_minutes || 60;

      const [allApps, schedules, timeOff] = await Promise.all([
        dataService.getAppointmentsByState(['Agendado', 'En Silla', 'Por Pagar']),
        Promise.resolve(loadStoredSchedules([localStaff])),
        Promise.resolve(loadStoredTimeOff())
      ]);
      const appointmentsForDay = (allApps || []).filter(a =>
        a.staff_id === localStaff.id &&
        getBusinessDateKey(new Date(a.scheduled_at || a.created_at)) === dateKey
      );
      const ctx = { schedules, timeOff, appointmentsForDay };
      setDayAvailabilityCtx(ctx);

      const slots = [];
      const startHour = 8;
      const endHour = 20;
      const now = new Date();
      const isToday = safeDate.toDateString() === now.toDateString();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();

      for (let hour = startHour; hour < endHour; hour++) {
        for (let min of [0, 30]) {
          if (isToday && (hour < currentHour || (hour === currentHour && min <= currentMinutes))) {
            continue;
          }

          const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
          const result = isStaffFreeAt(localStaff.id, dateKey, hour * 60 + min, durationMinutes, ctx);

          slots.push({
            time: timeStr,
            isAvailable: result.free,
            reason: result.reason
          });
        }
      }
      setAvailableSlots(slots);

      if (customTime) {
        const [ch, cm] = customTime.split(':').map(Number);
        const customResult = isStaffFreeAt(localStaff.id, dateKey, ch * 60 + cm, durationMinutes, ctx);
        setCustomConflict(customResult.free ? null : customResult.reason);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const CONFLICT_MESSAGES = {
    day_off: 'Esta especialista tiene el día libre.',
    time_off: 'Esta especialista no trabaja ese día (día libre puntual).',
    outside_hours: 'Fuera de su horario de trabajo.',
    conflict: 'Se cruza con otra cita ya agendada.'
  };

  const handleCustomTimeChange = (value) => {
    setCustomTime(value);
    if (!localStaff) return;
    const dateKey = dateToISO(selectedDate);
    const durationMinutes = localService?.duration_minutes || 60;
    const [h, m] = value.split(':').map(Number);
    const result = isStaffFreeAt(localStaff.id, dateKey, h * 60 + m, durationMinutes, dayAvailabilityCtx);
    setCustomConflict(result.free ? null : result.reason);
  };

  const [showSuccess, setShowSuccess] = useState(false);

  const handleSchedule = async () => {
    const timeToUse = isCustomMode ? customTime : selectedSlot;
    if (!timeToUse) return;
    
    const [hours, minutes] = timeToUse.split(':');
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (onSchedule) {
      onSchedule(scheduledAt.toISOString());
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 2200);
    } else if (onSave) {
      if (!localClient || !localService || !localStaff) return;
      try {
        setLoading(true);
        if (isEditMode) {
          // ── MODO EDICIÓN: actualizar cita existente ──
          await dataService.updateAppointment(appointmentToEdit.id, {
            client_id: localClient.id,
            service_id: localService.id,
            staff_id: localStaff.id,
            total_price: localService.price,
            scheduled_at: scheduledAt.toISOString()
          });
        } else {
          // ── MODO CREACIÓN: nueva cita ──
          await dataService.createAppointment({
            client_id: localClient.id,
            service_id: localService.id,
            staff_id: localStaff.id,
            status: 'Agendado',
            total_price: localService.price,
            scheduled_at: scheduledAt.toISOString()
          });
        }
        setShowSuccess(true);
        setTimeout(() => {
          onSave();
          setShowSuccess(false);
        }, 2200);
      } catch (err) {
        console.error(isEditMode ? 'Error editando cita:' : 'Error creando cita:', err);
      } finally {
        setLoading(false);
      }
    }
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
  const getStaffDisplayName = (member) => String(member?.name || '').split('(')[0].trim();

  // Validate step completion state
  const isStepValid = (step) => {
    switch (step) {
      case 1:
        return !!localClient;
      case 2:
        return !!localService;
      case 3:
        return !!localStaff;
      case 4:
        return isCustomMode ? !!customTime : !!selectedSlot;
      default:
        return true;
    }
  };

  return createPortal(
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={overlayClass} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(74, 48, 54, 0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 20000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className={`${cardClass} jana-scrollbar`} style={{ maxWidth: '600px', width: '100%', maxHeight: '92vh', overflowY: 'auto', borderRadius: '32px', padding: '36px', backgroundColor: '#fff', boxShadow: '0 25px 60px rgba(74,48,54,0.18), 0 8px 24px rgba(0,0,0,0.06)', border: '1px solid rgba(223,178,140,0.15)', display: 'flex', flexDirection: 'column' }}>
            {showSuccess ? (
              <div className="animate-scale-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', boxShadow: '0 12px 30px rgba(34, 197, 94, 0.35)',
                  marginBottom: '24px',
                  animation: 'successPulse 1.8s infinite'
                }}>
                  <Check size={40} strokeWidth={3} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3d2b30', margin: '0 0 8px 0' }}>
                  {isEditMode ? '¡Cita Actualizada!' : '¡Turno Confirmado!'}
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#a0868c', fontWeight: 500, margin: 0 }}>
                  {isEditMode ? 'Los cambios han sido guardados correctamente.' : 'La cita ha sido registrada exitosamente en la agenda.'}
                </p>
                <div style={{ marginTop: '20px', fontSize: '0.78rem', color: '#db8c95', fontWeight: 700 }}>Redirigiendo...</div>
                
                <style>{`
                  @keyframes successPulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.06); box-shadow: 0 16px 36px rgba(34, 197, 94, 0.45); }
                    100% { transform: scale(1); }
                  }
                `}</style>
              </div>
            ) : (
              <>
                {/* Header with Step indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3d2b30', margin: 0, letterSpacing: '-0.3px' }}>
                  {isEditMode ? (
                    <>Editar <span style={{ color: '#db8c95' }}>Cita</span></>
                  ) : (
                    <>Agendar <span style={{ color: '#db8c95' }}>Turno</span></>
                  )}
                </h2>
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <div
                      key={s}
                      style={{
                        width: '32px',
                        height: '6px',
                        borderRadius: '3px',
                        backgroundColor: s <= currentStep ? '#db8c95' : '#f3e8e9',
                        transition: 'background-color 0.3s ease'
                      }}
                    />
                  ))}
                </div>
              </div>
              <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(74,48,54,0.05)', border: 'none', color: '#8c767b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(219,140,149,0.12)'; e.currentTarget.style.color = '#db8c95'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(74,48,54,0.05)'; e.currentTarget.style.color = '#8c767b'; }}
              >✕</button>
            </div>

            {/* Stepper Views */}
            <div style={{ flex: 1, minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              
              {/* STEP 1: CLIENT SELECTION */}
              {currentStep === 1 && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#fff0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#db8c95' }}>
                      <User size={24} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#3d2b30' }}>¿Para qué cliente es la cita?</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0868c' }}>Selecciona una clienta registrada en el sistema de base de datos.</p>
                  </div>
                  <JanaSelect
                    variant="light"
                    label=""
                    value={localClient?.id || ''}
                    placeholder="Elige una clienta"
                    onChange={(value) => setLocalClient(clients.find(c => c.id === value))}
                    options={clients.map(c => ({
                      value: c.id,
                      label: `${c.name}${c.id_card ? ` (V-${c.id_card})` : ''}`
                    }))}
                    showSearch={true}
                  />
                </div>
              )}

              {/* STEP 2: SERVICE SELECTION */}
              {currentStep === 2 && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#fff0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#db8c95' }}>
                      <Scissors size={24} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#3d2b30' }}>¿Qué servicio va a realizarse?</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0868c' }}>Escoge uno de los servicios y especialidades vigentes.</p>
                  </div>
                  <JanaSelect
                    variant="light"
                    label=""
                    value={localService?.id || ''}
                    placeholder="Elige un servicio"
                    onChange={(value) => setLocalService(services.find(s => s.id === value))}
                    options={services.map(s => ({
                      value: s.id,
                      label: `${s.name} - $${Number(s.price || 0).toFixed(2)}`
                    }))}
                    showSearch={true}
                  />
                  {matchingPkg && (
                    <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '12px' }}>
                      <span>✓ Paquete activo disponible ({matchingPkg.total_sessions - matchingPkg.used_sessions} sesiones restantes)</span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: STAFF SELECTION */}
              {currentStep === 3 && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#fff0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#db8c95' }}>
                      <Sparkles size={24} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#3d2b30' }}>¿Con qué profesional prefiere atenderse?</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0868c' }}>Selecciona una estilista o especialista asignada.</p>
                  </div>
                  <JanaSelect
                    variant="light"
                    label=""
                    value={localStaff?.id || ''}
                    placeholder="Elige una estilista"
                    onChange={(value) => setLocalStaff(staffArray.find(s => s.id === value))}
                    options={staffArray.map(s => ({
                      value: s.id,
                      label: getStaffDisplayName(s)
                    }))}
                    showSearch={true}
                  />

                  {localStaff && (
                    <div className="animate-scale-up" style={{
                      padding: '16px', borderRadius: '16px', border: '1.5px solid rgba(223,178,140,0.25)',
                      display: 'flex', alignItems: 'center', gap: '12px', background: '#faf8f7',
                      marginTop: '8px'
                    }}>
                      <img src={localStaff.photo_url || `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(localStaff.name || '')}&radius=50`} alt={localStaff.name || ''} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#3d2b30' }}>{localStaff.name || ''}</div>
                        <div style={{ fontSize: '0.68rem', color: '#a0868c', fontWeight: 600 }}>{String(localStaff.role || 'Especialista').split('|')[0]}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: DATE & TIME SELECTION */}
              {currentStep === 4 && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Date Input */}
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a0868c', display: 'block', marginBottom: '7px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Fecha de Reserva</label>
                    <JanaDatePicker
                      variant="light"
                      value={dateToISO(selectedDate)}
                      onChange={(e) => e.target.value && setSelectedDate(isoToDate(e.target.value))}
                      inputStyle={{ borderRadius: '12px', height: '44px', fontSize: '0.82rem', fontWeight: 600, paddingLeft: '38px', background: '#fff', border: '1.5px solid rgba(212,160,154,0.3)', color: '#3d2b30' }}
                    />
                  </div>

                  {/* Toggle Horarios */}
                  <div style={{ display: 'flex', gap: '10px', background: '#f5ebec', padding: '5px', borderRadius: '14px', border: '1px solid rgba(219,140,149,0.12)' }}>
                    <button onClick={() => setIsCustomMode(false)} style={{ flex: 1, height: '36px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: !isCustomMode ? '#db8c95' : 'transparent', color: !isCustomMode ? '#fff' : '#8c767b' }}>
                      DISPONIBLES
                    </button>
                    <button onClick={() => setIsCustomMode(true)} style={{ flex: 1, height: '36px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: isCustomMode ? '#db8c95' : 'transparent', color: isCustomMode ? '#fff' : '#8c767b' }}>
                      PERSONALIZADO
                    </button>
                  </div>

                  {/* Picker / Slots */}
                  <div style={{ flex: 1 }}>
                    {isCustomMode ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', padding: '12px 0' }}>
                        <div style={{ width: '160px' }}>
                          <JanaTimePicker variant="light" label="" value={customTime} onChange={handleCustomTimeChange} />
                        </div>
                        {customConflict && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.68rem', fontWeight: '650', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '10px 14px', borderRadius: '12px', width: '100%' }}>
                            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                            <span>{CONFLICT_MESSAGES[customConflict] || 'Cruce de horario potencial.'}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {!localStaff ? (
                          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#faf7f5', textAlign: 'center', fontSize: '0.76rem', color: '#a0868c' }}>Selecciona estilista primero</div>
                        ) : loading ? (
                          <div style={{ textAlign: 'center', padding: '20px', color: '#a0868c', fontSize: '0.76rem', fontWeight: 600 }}>Cargando disponibilidad...</div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '6px', maxHeight: '160px', overflowY: 'auto' }} className="jana-scrollbar">
                            {availableSlots.map(slot => {
                              const isSel = selectedSlot === slot.time;
                              return (
                                <button
                                  key={slot.time}
                                  disabled={!slot.isAvailable}
                                  onClick={() => setSelectedSlot(slot.time)}
                                  style={{
                                    padding: '8px 0', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '750', cursor: slot.isAvailable ? 'pointer' : 'not-allowed',
                                    backgroundColor: isSel ? '#db8c95' : slot.isAvailable ? '#fff' : '#faf7f5',
                                    border: isSel ? '1px solid #db8c95' : '1px solid rgba(223,178,140,0.18)',
                                    color: isSel ? '#fff' : slot.isAvailable ? '#3d2b30' : '#c8b6ba',
                                    opacity: slot.isAvailable ? 1 : 0.6
                                  }}
                                >
                                  {getDisplayTime(slot.time)}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: BOOKING TICKET SUMMARY */}
              {currentStep === 5 && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#e2fbe9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#16a34a' }}>
                      <Check size={26} strokeWidth={2.5} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#3d2b30' }}>Resumen del Turno</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0868c' }}>Verifica que todos los datos de la reserva sean correctos.</p>
                  </div>

                  {/* Premium Ticket Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #fffcfb 0%, #fff6f7 100%)',
                    border: '1.5px solid rgba(219,140,149,0.15)',
                    borderRadius: '20px',
                    padding: '20px',
                    boxShadow: '0 10px 30px rgba(74,48,54,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(223,178,140,0.25)', paddingBottom: '10px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a0868c', letterSpacing: '0.5px' }}>CLIENTA</span>
                      <button onClick={() => setCurrentStep(1)} style={{ fontSize: '0.76rem', fontWeight: 700, color: '#3d2b30', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}>{localClient?.name}</button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(223,178,140,0.25)', paddingBottom: '10px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a0868c', letterSpacing: '0.5px' }}>SERVICIO</span>
                      <button onClick={() => setCurrentStep(2)} style={{ fontSize: '0.76rem', fontWeight: 700, color: '#3d2b30', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}>{localService?.name}</button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(223,178,140,0.25)', paddingBottom: '10px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a0868c', letterSpacing: '0.5px' }}>ESPECIALISTA</span>
                      <button onClick={() => setCurrentStep(3)} style={{ fontSize: '0.76rem', fontWeight: 700, color: '#3d2b30', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}>{getStaffDisplayName(localStaff)}</button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(223,178,140,0.25)', paddingBottom: '10px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a0868c', letterSpacing: '0.5px' }}>FECHA</span>
                      <button onClick={() => setCurrentStep(4)} style={{ fontSize: '0.76rem', fontWeight: 700, color: '#3d2b30', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}>{selectedDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'short' })}</button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a0868c', letterSpacing: '0.5px' }}>HORARIO</span>
                      <button onClick={() => setCurrentStep(4)} style={{ fontSize: '0.76rem', fontWeight: 700, color: '#a0506a', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}>
                        <Clock size={12} color="#db8c95" />
                        {getDisplayTime(isCustomMode ? customTime : selectedSlot)}
                      </button>
                    </div>
                    {isEditMode && (
                      <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(219,140,149,0.06)', borderRadius: '10px', border: '1px dashed rgba(219,140,149,0.2)' }}>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#a0868c', fontWeight: 600, textAlign: 'center' }}>
                          💡 Toca cualquier campo para cambiarlo
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Stepper Buttons Footer */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px', flexShrink: 0 }}>
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  style={{
                    height: '52px',
                    borderRadius: '16px',
                    border: '1.5px solid rgba(219,140,149,0.3)',
                    background: '#fff',
                    color: '#db8c95',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '0 20px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fff8fa'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <ArrowLeft size={16} /> Atrás
                </button>
              )}

              {currentStep < 5 ? (
                <button
                  disabled={!isStepValid(currentStep)}
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  style={{
                    flex: 1,
                    height: '52px',
                    borderRadius: '16px',
                    border: 'none',
                    background: isStepValid(currentStep) ? 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)' : '#ebdcd0',
                    color: isStepValid(currentStep) ? '#fff' : '#b29c9e',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    cursor: isStepValid(currentStep) ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: isStepValid(currentStep) ? '0 8px 24px rgba(219,140,149,0.25)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Siguiente <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSchedule}
                  style={{
                    flex: 1,
                    height: '60px',
                    minHeight: '60px',
                    flexShrink: 0,
                    borderRadius: '16px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 10px 28px rgba(219,140,149,0.4)',
                    transition: 'all 0.25s ease',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(219,140,149,0.45)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 10px 28px rgba(219,140,149,0.4)';
                  }}
                >
                  <Check size={20} strokeWidth={3} /> {isEditMode ? 'Guardar Cambios' : 'Confirmar Turno'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )}
</AnimatedModal>,
document.body
);
};

export default ScheduleModal;
