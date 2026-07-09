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
  Clock,
  RotateCcw,
  Trash2,
  Search
} from 'lucide-react';
import { normalizeForSearch } from '../utils/stringUtils';
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

const CONFLICT_MESSAGES = {
  day_off: 'Esta especialista tiene el día libre.',
  time_off: 'Esta especialista no trabaja ese día (día libre puntual).',
  outside_hours: 'Fuera de su horario de trabajo.',
  conflict: 'Se cruza con otra cita ya agendada.',
  self_conflict: 'Ya está asignada a otro servicio de esta misma orden a esa hora.'
};

const getDisplayTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const getStaffDisplayName = (member) => String(member?.name || '').split('(')[0].trim();

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
  appointmentToEdit = null,  // ← fila aplanada de appointment_services en modo edición
  isReprogramOnly = false,    // ← ir directo a reprogramar fecha/hora
}) => {
  const isEditMode = !!appointmentToEdit;
  const staffArray = Array.isArray(staff) ? staff : [];

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(defaultDate || new Date());
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [localClient, setLocalClient] = useState(client || null);
  const [clientActivePackages, setClientActivePackages] = useState([]);

  // ── Estado modo EDICIÓN (un solo servicio) ──────────────────────────────
  const [localService, setLocalService] = useState(service || null);
  const [localStaff, setLocalStaff] = useState(initialStaff || null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [customTime, setCustomTime] = useState('10:00');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customConflict, setCustomConflict] = useState(null);
  const [dayAvailabilityCtx, setDayAvailabilityCtx] = useState({ schedules: [], timeOff: [], appointmentsForDay: [] });

  // ── Estado modo CREACIÓN (orden con varios servicios) ───────────────────
  const [selectedServices, setSelectedServices] = useState([]); // [{ _uid, service_id, name, price, duration_minutes, staffId, time, customized }]
  const [generalTime, setGeneralTime] = useState('10:00');
  const [staffAvailability, setStaffAvailability] = useState({}); // { [staffId]: { schedules, timeOff, appointmentsForDay, dateKey } }
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');

  const totalSteps = isEditMode ? 5 : 4;

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

  // ── Disponibilidad modo EDICIÓN ─────────────────────────────────────────
  useEffect(() => {
    if (isOpen && isEditMode && localStaff) {
      loadAvailability();
    }
  }, [isOpen, isEditMode, selectedDate, localStaff, localService]);

  const loadAvailability = async () => {
    if (!localStaff) return;
    try {
      setLoading(true);
      const safeDate = selectedDate instanceof Date && !isNaN(selectedDate) ? selectedDate : new Date();
      const dateKey = dateToISO(safeDate);
      const durationMinutes = localService?.duration_minutes || 60;

      const [busyServices, schedules, timeOff] = await Promise.all([
        dataService.getStaffBusyServicesForDate(localStaff.id, dateKey),
        Promise.resolve(loadStoredSchedules([localStaff])),
        Promise.resolve(loadStoredTimeOff())
      ]);
      const appointmentsForDay = (busyServices || [])
        .filter(s => s.id !== appointmentToEdit?.id) // no chocar contra sí misma al editar
        .map(s => ({ staff_id: localStaff.id, scheduled_at: s.scheduled_at, duration_minutes: s.duration_minutes, id: s.id }));
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
          slots.push({ time: timeStr, isAvailable: result.free, reason: result.reason });
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

  const handleCustomTimeChange = (value) => {
    setCustomTime(value);
    if (!localStaff) return;
    const dateKey = dateToISO(selectedDate);
    const durationMinutes = localService?.duration_minutes || 60;
    const [h, m] = value.split(':').map(Number);
    const result = isStaffFreeAt(localStaff.id, dateKey, h * 60 + m, durationMinutes, dayAvailabilityCtx);
    setCustomConflict(result.free ? null : result.reason);
  };

  // ── Disponibilidad modo CREACIÓN (por profesional) ──────────────────────
  const loadStaffAvailability = async (staffMember) => {
    if (!staffMember) return;
    const dateKey = dateToISO(selectedDate);
    try {
      const busy = await dataService.getStaffBusyServicesForDate(staffMember.id, dateKey);
      const schedules = loadStoredSchedules([staffMember]);
      const timeOff = loadStoredTimeOff();
      const appointmentsForDay = (busy || []).map(b => ({ staff_id: staffMember.id, scheduled_at: b.scheduled_at, duration_minutes: b.duration_minutes, id: b.id }));
      setStaffAvailability(prev => ({ ...prev, [staffMember.id]: { schedules, timeOff, appointmentsForDay, dateKey } }));
    } catch (err) {
      console.error('Error cargando disponibilidad de profesional:', err);
    }
  };

  useEffect(() => {
    if (isEditMode) return;
    const staffIds = [...new Set(selectedServices.map(s => s.staffId).filter(Boolean))];
    staffIds.forEach(id => {
      const member = staffArray.find(s => s.id === id);
      if (member) loadStaffAvailability(member);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const getServiceConflict = (svc) => {
    if (!svc.staffId || !svc.time) return null;
    const [h, m] = svc.time.split(':').map(Number);
    const startMin = h * 60 + m;
    const duration = svc.duration_minutes || 60;
    const endMin = startMin + duration;

    // Conflicto con otro servicio de ESTA MISMA orden asignado a la misma profesional
    const sameStaffOthers = selectedServices.filter(s => s.staffId === svc.staffId && s._uid !== svc._uid && s.time);
    for (const other of sameStaffOthers) {
      const [oh, om] = other.time.split(':').map(Number);
      const oStart = oh * 60 + om;
      const oEnd = oStart + (other.duration_minutes || 60);
      if (startMin < oEnd && oStart < endMin) return 'self_conflict';
    }

    // Conflicto con la agenda real de la profesional
    const ctx = staffAvailability[svc.staffId];
    if (ctx && ctx.dateKey === dateToISO(selectedDate)) {
      const result = isStaffFreeAt(svc.staffId, ctx.dateKey, startMin, duration, ctx);
      if (!result.free) return result.reason;
    }
    return null;
  };

  // Prepopulate step selection and direct steps
  useEffect(() => {
    if (isOpen) {
      if (appointmentToEdit) {
        const editClient = clients.find(c => c.id === appointmentToEdit.client_id) ||
          appointmentToEdit.clients || null;
        const editService = services.find(s => s.id === appointmentToEdit.service_id) ||
          appointmentToEdit.services || null;
        const editStaff = staffArray.find(s => s.id === appointmentToEdit.staff_id) ||
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
        setCurrentStep(isReprogramOnly ? 4 : 5);
      } else {
        setLocalClient(client || null);
        setServiceSearchQuery('');
        setSelectedServices(
          service ? [{
            _uid: `${service.id}-${Date.now()}`,
            service_id: service.id,
            name: service.name,
            price: service.price,
            duration_minutes: service.duration_minutes || 60,
            staffId: initialStaff?.id || null,
            time: initialTime || generalTime,
            customized: false
          }] : []
        );

        if (client && service) {
          setCurrentStep(3);
        } else if (client) {
          setCurrentStep(2);
        } else {
          setCurrentStep(1);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, client, service, initialStaff, appointmentToEdit]);

  useEffect(() => {
    if (initialTime && isEditMode) {
      setCustomTime(initialTime);
      if (availableSlots.some(s => s.time === initialTime)) {
        setSelectedSlot(initialTime);
      } else {
        setIsCustomMode(true);
      }
    }
  }, [initialTime, availableSlots, isEditMode]);

  // ── Acciones carrito de servicios (modo creación) ───────────────────────
  const toggleServiceSelection = (svc) => {
    const exists = selectedServices.find(s => s.service_id === svc.id);
    if (exists) {
      setSelectedServices(selectedServices.filter(s => s.service_id !== svc.id));
      return;
    }
    setSelectedServices([...selectedServices, {
      _uid: `${svc.id}-${Date.now()}`,
      service_id: svc.id,
      name: svc.name,
      price: svc.price,
      duration_minutes: svc.duration_minutes || 60,
      staffId: null,
      time: generalTime,
      customized: false
    }]);
  };

  const removeServiceRow = (uid) => {
    setSelectedServices(selectedServices.filter(s => s._uid !== uid));
  };

  const setRowStaff = (uid, staffId) => {
    setSelectedServices(selectedServices.map(s => s._uid === uid ? { ...s, staffId } : s));
    const member = staffArray.find(s => s.id === staffId);
    if (member) loadStaffAvailability(member);
  };

  const setRowTime = (uid, time) => {
    setSelectedServices(selectedServices.map(s => s._uid === uid ? { ...s, time, customized: true } : s));
  };

  const resetRowToGeneralTime = (uid) => {
    setSelectedServices(selectedServices.map(s => s._uid === uid ? { ...s, time: generalTime, customized: false } : s));
  };

  const applyGeneralTime = (value) => {
    setGeneralTime(value);
    setSelectedServices(selectedServices.map(s => s.customized ? s : { ...s, time: value }));
  };

  const cartTotal = selectedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  // ── Guardar ──────────────────────────────────────────────────────────────
  const handleSchedule = async () => {
    if (isEditMode) {
      const timeToUse = isCustomMode ? customTime : selectedSlot;
      if (!timeToUse || !localClient || !localService || !localStaff) return;

      const [hours, minutes] = timeToUse.split(':');
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      if (isReprogramOnly) {
        try {
          setLoading(true);
          await dataService.updateAppointmentService(appointmentToEdit.id, {
            scheduled_at: scheduledAt.toISOString()
          });
          setShowSuccess(true);
          setTimeout(() => { onSave ? onSave() : onClose(); setShowSuccess(false); }, 2200);
        } catch (err) {
          console.error('Error reprogramando servicio:', err);
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        await dataService.updateAppointmentService(appointmentToEdit.id, {
          service_id: localService.id,
          staff_id: localStaff.id,
          price_paid: localService.price,
          duration_minutes: localService.duration_minutes || 60,
          scheduled_at: scheduledAt.toISOString()
        });
        setShowSuccess(true);
        setTimeout(() => { onSave ? onSave() : onClose(); setShowSuccess(false); }, 2200);
      } catch (err) {
        console.error('Error editando servicio:', err);
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Modo creación: orden con uno o varios servicios ──
    if (!localClient || selectedServices.length === 0) return;
    if (selectedServices.some(s => !s.staffId || !s.time)) return;

    const servicesPayload = selectedServices.map(s => {
      const [h, m] = s.time.split(':').map(Number);
      const dt = new Date(selectedDate);
      dt.setHours(h, m, 0, 0);
      return {
        service_id: s.service_id,
        staff_id: s.staffId,
        price_paid: s.price,
        scheduled_at: dt.toISOString(),
        duration_minutes: s.duration_minutes
      };
    });

    try {
      setLoading(true);
      await dataService.createAppointmentWithServices(
        { client_id: localClient.id, status: 'Agendado' },
        servicesPayload
      );

      if (onSchedule) {
        onSchedule(servicesPayload[0]?.scheduled_at);
      }

      setShowSuccess(true);
      setTimeout(() => {
        if (onSave) onSave();
        else onClose();
        setShowSuccess(false);
      }, 2200);
    } catch (err) {
      console.error('Error creando orden:', err);
    } finally {
      setLoading(false);
    }
  };

  const matchingPkg = (svcId) => clientActivePackages.find(p => p.service_id === svcId);

  const isStepValid = (step) => {
    if (isEditMode) {
      switch (step) {
        case 1: return !!localClient;
        case 2: return !!localService;
        case 3: return !!localStaff;
        case 4: return isCustomMode ? !!customTime : !!selectedSlot;
        default: return true;
      }
    }
    switch (step) {
      case 1: return !!localClient;
      case 2: return selectedServices.length > 0;
      case 3: return selectedServices.every(s => s.staffId && s.time && !getServiceConflict(s));
      default: return true;
    }
  };

  return createPortal(
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={overlayClass} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(74, 48, 54, 0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 20000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className={`${cardClass} jana-scrollbar`} style={{ maxWidth: '640px', width: '100%', maxHeight: '92vh', overflowY: 'auto', borderRadius: '32px', padding: '36px', backgroundColor: '#fff', boxShadow: '0 25px 60px rgba(74,48,54,0.18), 0 8px 24px rgba(0,0,0,0.06)', border: '1px solid rgba(223,178,140,0.15)', display: 'flex', flexDirection: 'column' }}>
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
                  {isEditMode ? '¡Cita Actualizada!' : '¡Orden Confirmada!'}
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#a0868c', fontWeight: 500, margin: 0 }}>
                  {isEditMode ? 'Los cambios han sido guardados correctamente.' : 'La orden ha sido registrada exitosamente en la agenda.'}
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
                      {isReprogramOnly ? (
                        <>Reprogramar <span style={{ color: '#db8c95' }}>Turno</span></>
                      ) : isEditMode ? (
                        <>Editar <span style={{ color: '#db8c95' }}>Servicio</span></>
                      ) : (
                        <>Agendar <span style={{ color: '#db8c95' }}>Orden</span></>
                      )}
                    </h2>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                      {isReprogramOnly ? (
                        <div style={{ fontSize: '0.72rem', color: '#db8c95', fontWeight: 700 }}>
                          Modo reprogramación rápida para {localClient?.name}
                        </div>
                      ) : [...Array(totalSteps)].map((_, i) => (
                        <div
                          key={i}
                          style={{
                            width: '32px',
                            height: '6px',
                            borderRadius: '3px',
                            backgroundColor: (i + 1) <= currentStep ? '#db8c95' : '#f3e8e9',
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

                  {/* STEP 1: CLIENT SELECTION (ambos modos) */}
                  {currentStep === 1 && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#fff0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#db8c95' }}>
                          <User size={24} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#3d2b30' }}>¿Para qué cliente es la orden?</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0868c' }}>Selecciona una clienta registrada en el sistema.</p>
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

                  {/* ══════════════ MODO EDICIÓN (servicio único) ══════════════ */}
                  {isEditMode && currentStep === 2 && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#fff0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#db8c95' }}>
                          <Scissors size={24} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#3d2b30' }}>¿Qué servicio va a realizarse?</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0868c' }}>Escoge uno de los servicios vigentes.</p>
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
                      {localService && matchingPkg(localService.id) && (
                        <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '12px' }}>
                          <span>✓ Paquete activo disponible ({matchingPkg(localService.id).total_sessions - matchingPkg(localService.id).used_sessions} sesiones restantes)</span>
                        </div>
                      )}
                    </div>
                  )}

                  {isEditMode && currentStep === 3 && (
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

                  {isEditMode && currentStep === 4 && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a0868c', display: 'block', marginBottom: '7px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Fecha de Reserva</label>
                        <JanaDatePicker
                          variant="light"
                          value={dateToISO(selectedDate)}
                          onChange={(e) => e.target.value && setSelectedDate(isoToDate(e.target.value))}
                          inputStyle={{ borderRadius: '12px', height: '44px', fontSize: '0.82rem', fontWeight: 600, paddingLeft: '38px', background: '#fff', border: '1.5px solid rgba(212,160,154,0.3)', color: '#3d2b30' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', background: '#f5ebec', padding: '5px', borderRadius: '14px', border: '1px solid rgba(219,140,149,0.12)' }}>
                        <button onClick={() => setIsCustomMode(false)} style={{ flex: 1, height: '36px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: !isCustomMode ? '#db8c95' : 'transparent', color: !isCustomMode ? '#fff' : '#8c767b' }}>
                          DISPONIBLES
                        </button>
                        <button onClick={() => setIsCustomMode(true)} style={{ flex: 1, height: '36px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: isCustomMode ? '#db8c95' : 'transparent', color: isCustomMode ? '#fff' : '#8c767b' }}>
                          PERSONALIZADO
                        </button>
                      </div>

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

                  {isEditMode && currentStep === 5 && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#e2fbe9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#16a34a' }}>
                          <Check size={26} strokeWidth={2.5} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#3d2b30' }}>Resumen del Servicio</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0868c' }}>Verifica que todos los datos sean correctos.</p>
                      </div>
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
                          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#3d2b30' }}>{localClient?.name}</span>
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
                        <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(219,140,149,0.06)', borderRadius: '10px', border: '1px dashed rgba(219,140,149,0.2)' }}>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: '#a0868c', fontWeight: 600, textAlign: 'center' }}>
                            💡 Toca cualquier campo para cambiarlo
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ══════════════ MODO CREACIÓN (orden con varios servicios) ══════════════ */}
                  {!isEditMode && currentStep === 2 && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#fff0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#db8c95' }}>
                          <Scissors size={24} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#3d2b30' }}>¿Qué servicios va a realizarse?</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0868c' }}>Puede elegir uno o varios — cada uno con su propia profesional.</p>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <Search size={15} color="#a0868c" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          placeholder="Buscar servicio..."
                          value={serviceSearchQuery}
                          onChange={(e) => setServiceSearchQuery(e.target.value)}
                          style={{
                            width: '100%', padding: '11px 14px 11px 38px', borderRadius: '12px',
                            border: '1.5px solid rgba(212,160,154,0.3)', background: '#fff',
                            fontSize: '0.8rem', fontWeight: 600, color: '#3d2b30', outline: 'none'
                          }}
                        />
                        {serviceSearchQuery && (
                          <button
                            onClick={() => setServiceSearchQuery('')}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a0868c', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '4px' }}
                          >×</button>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }} className="jana-scrollbar">
                        {services
                          .filter(svc => !serviceSearchQuery || normalizeForSearch(svc.name || '').includes(normalizeForSearch(serviceSearchQuery)))
                          .map(svc => {
                          const isSel = selectedServices.some(s => s.service_id === svc.id);
                          const pkg = matchingPkg(svc.id);
                          return (
                            <button
                              key={svc.id}
                              onClick={() => toggleServiceSelection(svc)}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                                padding: '12px 14px', borderRadius: '14px', textAlign: 'left', cursor: 'pointer',
                                border: isSel ? '1.5px solid #db8c95' : '1px solid rgba(223,178,140,0.2)',
                                background: isSel ? 'rgba(219,140,149,0.08)' : '#faf8f7'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3d2b30' }}>{svc.name}</div>
                                <div style={{ fontSize: '0.68rem', color: '#a0868c', marginTop: '2px' }}>
                                  ${Number(svc.price || 0).toFixed(2)} · {svc.duration_minutes || 60} min
                                  {pkg && <span style={{ color: '#16a34a', fontWeight: 700 }}> · ✓ Paquete activo</span>}
                                </div>
                              </div>
                              {isSel && <Check size={18} color="#db8c95" style={{ flexShrink: 0 }} />}
                            </button>
                          );
                        })}
                        {services.filter(svc => !serviceSearchQuery || normalizeForSearch(svc.name || '').includes(normalizeForSearch(serviceSearchQuery))).length === 0 && (
                          <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.76rem', color: '#a0868c' }}>
                            No se encontró ningún servicio con "{serviceSearchQuery}"
                          </div>
                        )}
                      </div>

                      {selectedServices.length > 0 && (
                        <div style={{ padding: '10px 14px', background: '#fff0f2', borderRadius: '12px', fontSize: '0.74rem', color: '#a0506a', fontWeight: 700, textAlign: 'center' }}>
                          {selectedServices.length} servicio{selectedServices.length > 1 ? 's' : ''} seleccionado{selectedServices.length > 1 ? 's' : ''} · Total ${cartTotal.toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}

                  {!isEditMode && currentStep === 3 && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#fff0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#db8c95' }}>
                          <Sparkles size={24} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#3d2b30' }}>Asigna profesional y horario</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0868c' }}>Todo el mismo día. Pueden atenderla a la vez o en momentos distintos.</p>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.62rem', fontWeight: 800, color: '#a0868c', display: 'block', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Fecha</label>
                          <JanaDatePicker
                            variant="light"
                            value={dateToISO(selectedDate)}
                            onChange={(e) => e.target.value && setSelectedDate(isoToDate(e.target.value))}
                            inputStyle={{ borderRadius: '12px', height: '42px', fontSize: '0.78rem', fontWeight: 600, paddingLeft: '34px', background: '#fff', border: '1.5px solid rgba(212,160,154,0.3)', color: '#3d2b30' }}
                          />
                        </div>
                        <div style={{ width: '140px' }}>
                          <label style={{ fontSize: '0.62rem', fontWeight: 800, color: '#a0868c', display: 'block', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Hora general</label>
                          <JanaTimePicker variant="light" label="" value={generalTime} onChange={applyGeneralTime} />
                        </div>
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#a0868c', marginTop: '-8px' }}>
                        La hora general se aplica a todos los servicios que no hayas personalizado individualmente.
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto', paddingRight: '2px' }} className="jana-scrollbar">
                        {selectedServices.map(svc => {
                          const conflict = getServiceConflict(svc);
                          return (
                            <div key={svc._uid} style={{
                              padding: '14px', borderRadius: '16px',
                              border: conflict ? '1.5px solid #f59e0b' : '1px solid rgba(223,178,140,0.2)',
                              background: conflict ? '#fffbeb' : '#faf8f7'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3d2b30' }}>{svc.name}</div>
                                <button onClick={() => removeServiceRow(svc._uid)} style={{ background: 'none', border: 'none', color: '#c8949c', cursor: 'pointer', display: 'flex' }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div style={{ flex: 1.4 }}>
                                  <select
                                    value={svc.staffId || ''}
                                    onChange={(e) => setRowStaff(svc._uid, e.target.value)}
                                    style={{
                                      width: '100%', fontSize: '0.74rem', fontWeight: 600, padding: '8px 10px', borderRadius: '10px',
                                      border: svc.staffId ? '1px solid rgba(223,178,140,0.3)' : '1.5px solid #dc2626',
                                      background: svc.staffId ? '#fff' : '#fef2f2', color: '#3d2b30'
                                    }}
                                  >
                                    <option value="">Elegir profesional...</option>
                                    {staffArray.map(s => (
                                      <option key={s.id} value={s.id}>{getStaffDisplayName(s)}</option>
                                    ))}
                                  </select>
                                </div>
                                <div style={{ width: '120px' }}>
                                  <JanaTimePicker variant="light" label="" value={svc.time} onChange={(v) => setRowTime(svc._uid, v)} />
                                </div>
                                {svc.customized && (
                                  <button onClick={() => resetRowToGeneralTime(svc._uid)} title="Usar hora general" style={{ background: 'none', border: 'none', color: '#a0868c', cursor: 'pointer', display: 'flex', padding: '4px' }}>
                                    <RotateCcw size={14} />
                                  </button>
                                )}
                              </div>
                              {conflict && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.66rem', fontWeight: 650, color: '#d97706', marginTop: '8px' }}>
                                  <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                                  <span>{CONFLICT_MESSAGES[conflict] || 'Cruce de horario potencial.'}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!isEditMode && currentStep === 4 && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#e2fbe9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#16a34a' }}>
                          <Check size={26} strokeWidth={2.5} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#3d2b30' }}>Resumen de la Orden</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0868c' }}>Verifica que todos los datos sean correctos.</p>
                      </div>

                      <div style={{
                        background: 'linear-gradient(135deg, #fffcfb 0%, #fff6f7 100%)',
                        border: '1.5px solid rgba(219,140,149,0.15)',
                        borderRadius: '20px',
                        padding: '18px',
                        boxShadow: '0 10px 30px rgba(74,48,54,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(223,178,140,0.25)', paddingBottom: '10px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a0868c', letterSpacing: '0.5px' }}>CLIENTA</span>
                          <button onClick={() => setCurrentStep(1)} style={{ fontSize: '0.76rem', fontWeight: 700, color: '#3d2b30', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}>{localClient?.name}</button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(223,178,140,0.25)', paddingBottom: '10px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a0868c', letterSpacing: '0.5px' }}>FECHA</span>
                          <button onClick={() => setCurrentStep(3)} style={{ fontSize: '0.76rem', fontWeight: 700, color: '#3d2b30', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}>{selectedDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'short' })}</button>
                        </div>

                        {selectedServices.map(svc => (
                          <div key={svc._uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed rgba(223,178,140,0.15)' }}>
                            <div>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3d2b30' }}>{svc.name}</div>
                              <div style={{ fontSize: '0.66rem', color: '#a0868c' }}>
                                {getStaffDisplayName(staffArray.find(s => s.id === svc.staffId))} · {getDisplayTime(svc.time)}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4a3036' }}>${Number(svc.price || 0).toFixed(2)}</span>
                          </div>
                        ))}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px' }}>
                          <span style={{ fontWeight: 800, color: '#3d2b30', fontSize: '0.9rem' }}>Total</span>
                          <span style={{ fontWeight: 800, color: '#db8c95', fontSize: '1.05rem' }}>${cartTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stepper Buttons Footer */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '32px', flexShrink: 0 }}>
                  {currentStep > 1 && !isReprogramOnly && (
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

                  {currentStep < totalSteps && !isReprogramOnly ? (
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
                      disabled={loading}
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
                        cursor: loading ? 'wait' : 'pointer',
                        opacity: loading ? 0.7 : 1,
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
                      <Check size={20} strokeWidth={3} /> {isReprogramOnly ? 'Reprogramar Turno' : isEditMode ? 'Guardar Cambios' : 'Confirmar Orden'}
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
