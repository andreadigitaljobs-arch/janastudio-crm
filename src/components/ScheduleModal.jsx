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
  Search,
  Zap,
  Paintbrush,
  Pen
} from 'lucide-react';
import { GiEyelashes } from 'react-icons/gi';
import { PiHairDryer } from 'react-icons/pi';
import { FaSprayCanSparkles } from 'react-icons/fa6';
import { normalizeForSearch } from '../utils/stringUtils';
import { dataService } from '../services/dataService';
import AnimatedModal from './AnimatedModal';
import JanaSelect from './JanaSelect';
import JanaDatePicker from './JanaDatePicker';
import JanaTimePicker from './JanaTimePicker';
import { isStaffFreeAt } from '../utils/availability';
import { loadStoredSchedules, loadStoredTimeOff } from '../utils/mockStaffSchedules';
import { getBusinessDateKey } from '../utils/dateTime';
import { getRoleKind, getRoleName } from '../utils/roles';

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

const formatDuration = (minutes) => {
  if (!minutes || minutes < 1) return '0 min';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
};

const getCategoryIcon = (category) => {
  const iconMap = {
    'Cabello': <Scissors size={16} />,
    'Cejas & Pestañas': <GiEyelashes size={16} />,
    'Depilación': <FaSprayCanSparkles size={16} />,
    'Peinados': <PiHairDryer size={16} />,
    'Uñas': <Paintbrush size={16} />,
    'Pestañas': <GiEyelashes size={16} />
  };
  return iconMap[category] || <Zap size={16} />;
};

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
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('Todas');
  const serviceCategories = [...new Set(services.map(s => s.category).filter(Boolean))];

  const totalSteps = 5;

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
        setServiceCategoryFilter('Todas');
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

  const applyStaffToAll = (staffId) => {
    setSelectedServices(selectedServices.map(s => ({ ...s, staffId })));
    const member = staffArray.find(s => s.id === staffId);
    if (member) loadStaffAvailability(member);
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
      case 3: return !!selectedDate;
      case 4: return selectedServices.every(s => s.staffId && s.time && !getServiceConflict(s));
      default: return true;
    }
  };

  const showSummaryPanel = !showSuccess && !isEditMode && selectedServices.length > 0 && currentStep !== 1 && currentStep !== 5;

  const getModalDimensions = () => {
    if (isEditMode) {
      return { width: 'min(90vw, 560px)', maxWidth: '560px' };
    }
    switch (currentStep) {
      case 1:
        return { width: 'min(90vw, 540px)', maxWidth: '540px' };
      case 5:
        return { width: 'min(90vw, 680px)', maxWidth: '680px' };
      default:
        // Steps 2, 3, 4 with service lists, double columns, and sidebars
        return { 
          width: showSummaryPanel ? 'min(85vw, 840px)' : 'min(90vw, 840px)', 
          maxWidth: '840px' 
        };
    }
  };

  const modalSize = getModalDimensions();

  return createPortal(
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={`${overlayClass} jana-schedule-modal-overlay`} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(30, 30, 30, 0.45)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 20000, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: showSummaryPanel ? '24px' : '0', padding: '24px', animation: overlayClass === 'modal-overlay-exit' ? 'fadeOutDown 0.32s cubic-bezier(0.4, 0, 1, 1) forwards' : 'fadeIn 0.25s ease-out' }}>
          <div className={`${cardClass} jana-schedule-modal-card`} style={{ width: modalSize.width, maxWidth: modalSize.maxWidth, flexShrink: 0, height: '90vh', maxHeight: '860px', backgroundColor: '#fcf8f7', borderRadius: '32px', boxShadow: '0 25px 60px rgba(74,48,54,0.2), 0 8px 24px rgba(0,0,0,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: cardClass === 'modal-card-exit' ? 'slideDown 0.32s cubic-bezier(0.4, 0, 1, 1) forwards' : 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)', position: 'relative', transition: 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes fadeOutDown {
                from { opacity: 1; }
                to { opacity: 0; }
              }
              @keyframes slideUp {
                from { transform: translateY(60px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
              @keyframes slideDown {
                from { transform: translateY(0) scale(1); opacity: 1; }
                to { transform: translateY(90px) scale(0.88); opacity: 0; }
              }
              @keyframes slideInRight {
                from { transform: translateX(80px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
              @keyframes fadeInDown {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes scaleIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
              }
              .animate-fade-in { animation: fadeIn 0.4s ease-out; }
              .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
              .animate-fade-in-down { animation: fadeInDown 0.3s ease-out; }
              .animate-fade-in-up { animation: fadeInUp 0.3s ease-out; }
              .animate-scale-in { animation: scaleIn 0.3s ease-out; }

              @media (max-width: 900px) {
                .svc-grid { grid-template-columns: 1fr !important; }
                .svc-select-grid { grid-template-columns: 1fr !important; }
              }

              @media (max-width: 560px) {
                .svc-select-grid { grid-template-columns: 1fr !important; }
              }

              .jana-schedule-modal-card .jana-scrollbar::-webkit-scrollbar { display: block !important; width: 6px !important; }
              .jana-schedule-modal-card .jana-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .jana-schedule-modal-card .jana-scrollbar::-webkit-scrollbar-thumb { background: rgba(201, 114, 130,0.3); border-radius: 10px; }
              .jana-schedule-modal-card .jana-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(201, 114, 130,0.5); }
              .jana-schedule-modal-card .jana-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(201, 114, 130,0.3) transparent; }
              .jana-summary-panel::-webkit-scrollbar { display: block !important; width: 4px !important; }
              .jana-summary-panel::-webkit-scrollbar-track { background: transparent; }
              .jana-summary-panel::-webkit-scrollbar-thumb { background: rgba(201, 114, 130,0.25); border-radius: 10px; }
              .jana-summary-panel { scrollbar-width: thin; scrollbar-color: rgba(201, 114, 130,0.2) transparent; }

              @media (max-width: 1250px) {
                .jana-summary-panel { display: none !important; }
                .jana-schedule-modal-card { width: 92vw !important; max-width: 1100px !important; }
              }

              @media (max-width: 640px) {
                .jana-schedule-modal-overlay { padding: 0 !important; }
                .jana-schedule-modal-card { width: 100vw !important; height: 100vh !important; max-width: 100vw !important; max-height: 100vh !important; border-radius: 0 !important; }
                .jana-schedule-header-inner, .jana-schedule-content-inner, .jana-schedule-footer-inner { padding-left: 18px !important; padding-right: 18px !important; }
                .svc-row { flex-wrap: wrap !important; }
                .svc-row > div:first-child { flex-basis: 100% !important; }
                .svc-time-col { width: auto !important; flex: 1 !important; align-items: stretch !important; }
                .svc-time-picker-wrap { margin-top: 6px !important; }
                .svc-actions-col { flex-direction: row !important; margin-top: 6px !important; }
              }
            `}</style>
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
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2d1b22', margin: '0 0 8px 0' }}>
                  {isEditMode ? '¡Cita Actualizada!' : '¡Orden Confirmada!'}
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#a0909a', fontWeight: 500, margin: 0 }}>
                  {isEditMode ? 'Los cambios han sido guardados correctamente.' : 'La orden ha sido registrada exitosamente en la agenda.'}
                </p>
                <div style={{ marginTop: '20px', fontSize: '0.78rem', color: '#c97282', fontWeight: 700 }}>Redirigiendo...</div>

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
                {/* Header with Step indicator (sticky, full-width strip) */}
                <div style={{
                  flexShrink: 0, position: 'sticky', top: 0, zIndex: 10,
                  background: 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)',
                  boxShadow: '0 4px 20px rgba(201, 114, 130,0.35)'
                }}>
                  <div className="jana-schedule-header-inner" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.3px', textShadow: '0 2px 8px rgba(74,30,38,0.15)' }}>
                        {isReprogramOnly ? (
                          <>Reprogramar <span style={{ opacity: 0.85 }}>Turno</span></>
                        ) : isEditMode ? (
                          <>Editar <span style={{ opacity: 0.85 }}>Servicio</span></>
                        ) : (
                          <>Agendar <span style={{ opacity: 0.85 }}>Orden</span></>
                        )}
                      </h2>
                      {!isReprogramOnly && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c97282', backgroundColor: '#fff', padding: '4px 12px', borderRadius: '8px', display: 'inline-block', marginTop: '10px', letterSpacing: '0.3px' }}>
                          Paso {currentStep} de {totalSteps}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
                        {isReprogramOnly ? (
                          <div style={{ fontSize: '0.72rem', color: '#fff', fontWeight: 700 }}>
                            Modo reprogramación rápida para {localClient?.name}
                          </div>
                        ) : [...Array(totalSteps)].map((_, i) => (
                          <div
                            key={i}
                            style={{
                              width: '32px',
                              height: '6px',
                              borderRadius: '3px',
                              backgroundColor: (i + 1) <= currentStep ? '#fff' : 'rgba(255,255,255,0.35)',
                              transition: 'background-color 0.3s ease'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', transition: 'all 0.2s', flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.35)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                    >✕</button>
                  </div>
                </div>

                {/* Scrollable content area */}
                <div className="jana-scrollbar" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  <div className="jana-schedule-content-inner" style={{ width: '100%', boxSizing: 'border-box', padding: '28px 32px', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>

                  {/* STEP 1: CLIENT SELECTION (ambos modos) */}
                  {currentStep === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeInUp 0.4s ease-out' }}>
                      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#fff0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#c97282' }}>
                          <User size={24} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#2d1b22' }}>¿Para qué cliente es la orden?</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0909a' }}>Selecciona una clienta registrada en el sistema.</p>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeInUp 0.4s ease-out' }}>
                      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#fff0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#c97282' }}>
                          <Scissors size={24} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#2d1b22' }}>¿Qué servicio va a realizarse?</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0909a' }}>Escoge uno de los servicios vigentes.</p>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeInUp 0.4s ease-out' }}>
                      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#fff0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#c97282' }}>
                          <Sparkles size={24} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#2d1b22' }}>¿Con qué profesional prefiere atenderse?</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0909a' }}>Selecciona una estilista o especialista asignada.</p>
                      </div>
                      <JanaSelect
                        variant="light"
                        label=""
                        value={localStaff?.id || ''}
                        placeholder="Elige una estilista"
                        onChange={(value) => setLocalStaff(staffArray.find(s => s.id === value))}
                        options={staffArray.filter(s => getRoleKind(s.role) !== 'admin').map(s => ({
                                  value: s.id,
                                  label: getStaffDisplayName(s),
                                  image: s.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100',
                                  subLabel: getRoleName(s.role)
                                }))}
                        showSearch={true}
                      />
                      {localStaff && (
                        <div className="animate-scale-up" style={{
                          padding: '16px', borderRadius: '16px', border: '1.5px solid rgba(223,178,140,0.25)',
                          display: 'flex', alignItems: 'center', gap: '12px', background: '#faf8f7',
                          marginTop: '8px'
                        }}>
                          <img src={localStaff.photo_url || `https://i.pravatar.cc/150?u=${encodeURIComponent(localStaff.name || '')}`} alt={localStaff.name || ''} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#2d1b22' }}>{localStaff.name || ''}</div>
                            <div style={{ fontSize: '0.68rem', color: '#a0909a', fontWeight: 600 }}>{String(localStaff.role || 'Especialista').split('|')[0]}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isEditMode && currentStep === 4 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeInUp 0.4s ease-out' }}>
                      <div>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a0909a', display: 'block', marginBottom: '7px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Fecha de Reserva</label>
                        <JanaDatePicker
                          variant="light"
                          value={dateToISO(selectedDate)}
                          onChange={(e) => e.target.value && setSelectedDate(isoToDate(e.target.value))}
                          inputStyle={{ borderRadius: '12px', height: '44px', fontSize: '0.82rem', fontWeight: 600, paddingLeft: '38px', background: '#fff', border: '1.5px solid rgba(212,160,154,0.3)', color: '#2d1b22' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', background: '#f5ebec', padding: '5px', borderRadius: '14px', border: '1px solid rgba(201, 114, 130,0.12)' }}>
                        <button onClick={() => setIsCustomMode(false)} style={{ flex: 1, height: '36px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: !isCustomMode ? '#c97282' : 'transparent', color: !isCustomMode ? '#fff' : '#8c767b' }}>
                          DISPONIBLES
                        </button>
                        <button onClick={() => setIsCustomMode(true)} style={{ flex: 1, height: '36px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800, border: 'none', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: isCustomMode ? '#c97282' : 'transparent', color: isCustomMode ? '#fff' : '#8c767b' }}>
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
                              <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#faf7f5', textAlign: 'center', fontSize: '0.76rem', color: '#a0909a' }}>Selecciona estilista primero</div>
                            ) : loading ? (
                              <div style={{ textAlign: 'center', padding: '20px', color: '#a0909a', fontSize: '0.76rem', fontWeight: 600 }}>Cargando disponibilidad...</div>
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
                                        backgroundColor: isSel ? '#c97282' : slot.isAvailable ? '#fff' : '#faf7f5',
                                        border: isSel ? '1px solid #c97282' : '1px solid rgba(223,178,140,0.18)',
                                        color: isSel ? '#fff' : slot.isAvailable ? '#2d1b22' : '#c8b6ba',
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeInUp 0.4s ease-out' }}>
                      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#e2fbe9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#16a34a' }}>
                          <Check size={26} strokeWidth={2.5} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#2d1b22' }}>Resumen del Servicio</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0909a' }}>Verifica que todos los datos sean correctos.</p>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #fffcfb 0%, #fff6f7 100%)',
                        border: '1.5px solid rgba(201, 114, 130,0.15)',
                        borderRadius: '20px',
                        padding: '20px',
                        boxShadow: '0 10px 30px rgba(74,48,54,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(223,178,140,0.25)', paddingBottom: '10px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a0909a', letterSpacing: '0.5px' }}>CLIENTA</span>
                          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#2d1b22' }}>{localClient?.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(223,178,140,0.25)', paddingBottom: '10px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a0909a', letterSpacing: '0.5px' }}>SERVICIO</span>
                          <button onClick={() => setCurrentStep(2)} style={{ fontSize: '0.76rem', fontWeight: 700, color: '#2d1b22', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}>{localService?.name}</button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(223,178,140,0.25)', paddingBottom: '10px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a0909a', letterSpacing: '0.5px' }}>ESPECIALISTA</span>
                          <button onClick={() => setCurrentStep(3)} style={{ fontSize: '0.76rem', fontWeight: 700, color: '#2d1b22', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}>{getStaffDisplayName(localStaff)}</button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(223,178,140,0.25)', paddingBottom: '10px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a0909a', letterSpacing: '0.5px' }}>FECHA</span>
                          <button onClick={() => setCurrentStep(4)} style={{ fontSize: '0.76rem', fontWeight: 700, color: '#2d1b22', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}>{selectedDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'short' })}</button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a0909a', letterSpacing: '0.5px' }}>HORARIO</span>
                          <button onClick={() => setCurrentStep(4)} style={{ fontSize: '0.76rem', fontWeight: 700, color: '#a0506a', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}>
                            <Clock size={12} color="#c97282" />
                            {getDisplayTime(isCustomMode ? customTime : selectedSlot)}
                          </button>
                        </div>
                        <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(201, 114, 130,0.06)', borderRadius: '10px', border: '1px dashed rgba(201, 114, 130,0.2)' }}>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: '#a0909a', fontWeight: 600, textAlign: 'center' }}>
                            💡 Toca cualquier campo para cambiarlo
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ══════════════ MODO CREACIÓN (orden con varios servicios) ══════════════ */}
                  {!isEditMode && currentStep === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeInUp 0.4s ease-out', position: 'relative', flex: 1, minHeight: 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }}>
                      <div style={{ textAlign: 'center', marginBottom: '8px', flexShrink: 0 }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#fff0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#c97282' }}>
                          <Scissors size={24} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#2d1b22' }}>¿Qué servicios va a realizarse?</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0909a' }}>Puede elegir uno o varios — cada uno con su propia profesional.</p>
                      </div>

                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <Search size={18} color="#a0909a" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          placeholder="Buscar servicio..."
                          value={serviceSearchQuery}
                          onChange={(e) => setServiceSearchQuery(e.target.value)}
                          style={{
                            width: '100%', padding: '15px 16px 15px 46px', borderRadius: '16px',
                            border: '1.5px solid rgba(212,160,154,0.3)', background: '#fff',
                            fontSize: '0.85rem', fontWeight: 700, color: '#2d1b22', outline: 'none',
                            boxShadow: '0 2px 8px rgba(212,160,154,0.05)', transition: 'all 0.2s'
                          }}
                          onFocus={e => e.currentTarget.style.borderColor = '#c97282'}
                          onBlur={e => e.currentTarget.style.borderColor = 'rgba(212,160,154,0.3)'}
                        />
                        {serviceSearchQuery && (
                          <button
                            onClick={() => setServiceSearchQuery('')}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a0909a', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '4px' }}
                          >×</button>
                        )}
                      </div>

                      {serviceCategories.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px', paddingBottom: '2px', flexShrink: 0, animation: 'fadeInUp 0.4s ease-out 0.15s both' }}>
                          <button
                            onClick={() => setServiceCategoryFilter('Todas')}
                            style={{
                              padding: '8px 10px', borderRadius: '10px', cursor: 'pointer',
                              fontSize: '0.7rem', fontWeight: 700, minWidth: 0,
                              background: serviceCategoryFilter === 'Todas' ? '#c97282' : '#faf3f2',
                              color: serviceCategoryFilter === 'Todas' ? '#fff' : '#a0506a',
                              border: '1px solid ' + (serviceCategoryFilter === 'Todas' ? '#c97282' : 'rgba(160,80,106,0.15)'),
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(201, 114, 130,0.2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                          >
                            <span style={{ display: 'flex', flexShrink: 0 }}><Zap size={14} style={{ color: 'inherit' }} /></span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>Todas</span>
                          </button>
                          {serviceCategories.map((cat, idx) => (
                            <button
                              key={cat}
                              onClick={() => setServiceCategoryFilter(cat)}
                              style={{
                                padding: '8px 10px', borderRadius: '10px', cursor: 'pointer',
                                fontSize: '0.7rem', fontWeight: 700, minWidth: 0,
                                background: serviceCategoryFilter === cat ? '#c97282' : '#faf3f2',
                                color: serviceCategoryFilter === cat ? '#fff' : '#a0506a',
                                border: '1px solid ' + (serviceCategoryFilter === cat ? '#c97282' : 'rgba(160,80,106,0.15)'),
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                animation: `fadeInUp 0.4s ease-out ${0.2 + idx * 0.05}s both`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(201, 114, 130,0.2)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                            >
                              <span style={{ display: 'flex', flexShrink: 0 }}>{getCategoryIcon(cat)}</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{cat}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="svc-select-grid jana-scrollbar" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', paddingBottom: '8px', flex: 1, minHeight: '120px', overflowY: 'auto', overflowX: 'hidden', alignContent: 'start' }}>
                        {services
                          .filter(svc => serviceCategoryFilter === 'Todas' || svc.category === serviceCategoryFilter)
                          .filter(svc => !serviceSearchQuery || normalizeForSearch(svc.name || '').includes(normalizeForSearch(serviceSearchQuery)))
                          .map(svc => {
                          const isSel = selectedServices.some(s => s.service_id === svc.id);
                          const pkg = matchingPkg(svc.id);
                          return (
                            <button
                              key={svc.id}
                              onClick={() => toggleServiceSelection(svc)}
                              style={{
                                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 10px',
                                padding: '10px 14px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer',
                                border: isSel ? '1.5px solid #c97282' : '1px solid rgba(223,178,140,0.16)',
                                background: isSel ? 'rgba(201, 114, 130,0.06)' : '#ffffff',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                animation: 'fadeInUp 0.25s ease-out',
                                transform: 'translateY(0)',
                                opacity: 1,
                                width: '100%',
                                minHeight: '52px',
                                position: 'relative',
                                zIndex: 1
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(201, 114, 130,0.1)';
                                e.currentTarget.style.borderColor = '#c97282';
                                e.currentTarget.style.zIndex = 2;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.borderColor = isSel ? '#c97282' : 'rgba(223,178,140,0.16)';
                                e.currentTarget.style.zIndex = 1;
                              }}
                            >
                              {/* Category Icon */}
                              <div style={{ 
                                color: isSel ? '#c97282' : '#a0909a', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '8px', 
                                background: isSel ? 'rgba(201, 114, 130, 0.12)' : 'rgba(223, 178, 140, 0.08)',
                                flexShrink: 0 
                              }}>
                                {getCategoryIcon(svc.category)}
                              </div>

                              {/* Service Info */}
                              <div style={{ flex: '1 1 140px', minWidth: 0, paddingRight: '8px', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2d1b22', lineHeight: '1.2', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{svc.name}</div>
                                <div style={{ fontSize: '0.7rem', color: '#a0909a', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {formatDuration(svc.duration_minutes || 60)}</span>
                                  {pkg && <span style={{ color: '#16a34a', fontWeight: 800, background: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: '4px' }}>✓ Paquete</span>}
                                </div>
                              </div>

                              {/* Price & Check */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '6px', zIndex: 1, flexShrink: 0, marginLeft: 'auto' }}>
                                <div style={{ color: isSel ? '#c97282' : '#4a3036', fontWeight: 900, fontSize: '0.9rem' }}>
                                  ${Number(svc.price || 0).toFixed(2)}
                                </div>
                                <div style={{ 
                                  width: '20px', 
                                  height: '20px', 
                                  borderRadius: '6px', 
                                  border: isSel ? 'none' : '2px solid rgba(223, 178, 140, 0.4)', 
                                  background: isSel ? '#c97282' : 'transparent',
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  transition: 'all 0.2s'
                                }}>
                                  {isSel && <Check size={14} color="#fff" strokeWidth={3} />}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                        {services
                          .filter(svc => serviceCategoryFilter === 'Todas' || svc.category === serviceCategoryFilter)
                          .filter(svc => !serviceSearchQuery || normalizeForSearch(svc.name || '').includes(normalizeForSearch(serviceSearchQuery)))
                          .length === 0 && (
                          <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.76rem', color: '#a0909a' }}>
                            {serviceSearchQuery ? `No se encontró ningún servicio con "${serviceSearchQuery}"` : 'No hay servicios en esta categoría'}
                          </div>
                        )}
                      </div>
                      </div>
                    </div>
                  )}

                   {!isEditMode && currentStep === 3 && (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeInUp 0.4s ease-out' }}>
                       <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                         <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#fff0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#c97282' }}>
                           <Calendar size={24} />
                         </div>
                         <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#2d1b22' }}>¿Cuándo será la cita?</h3>
                         <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0909a' }}>Define la fecha y hora base de los servicios de esta orden.</p>
                       </div>

                       <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid rgba(223, 178, 140, 0.25)', boxShadow: '0 8px 24px rgba(74,48,54,0.04)', overflow: 'hidden', marginTop: '10px' }}>
                         {/* Fecha Row */}
                         <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                           <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2d1b22', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                             <Calendar size={14} color="#c97282" /> 1. Seleccionar Fecha
                           </label>
                           <JanaDatePicker
                             variant="light"
                             value={dateToISO(selectedDate)}
                             onChange={(e) => e.target.value && setSelectedDate(isoToDate(e.target.value))}
                             autoComplete="off"
                             inputStyle={{ borderRadius: '16px', height: '48px', fontSize: '0.85rem', fontWeight: 700, paddingLeft: '48px', background: '#faf3f2', border: 'none', color: '#2d1b22' }}
                           />
                           <div style={{ fontSize: '0.68rem', color: '#a0909a', fontWeight: 500, lineHeight: '1.4' }}>
                             Elige el día en el que se agendarán todas las citas del grupo.
                           </div>
                         </div>

                         {/* Divider */}
                         <div style={{ height: '1.5px', background: 'rgba(223, 178, 140, 0.15)', marginLeft: '20px', marginRight: '20px' }} />

                         {/* Hora Row */}
                         <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                           <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2d1b22', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                             <Clock size={14} color="#c97282" /> 2. Hora de Inicio General
                           </label>
                           <div style={{ borderRadius: '16px', overflow: 'hidden' }}>
                             <JanaTimePicker variant="light" label="" value={generalTime} onChange={applyGeneralTime} placement="top" />
                           </div>
                           <div style={{ fontSize: '0.68rem', color: '#a0909a', fontWeight: 500, lineHeight: '1.4' }}>
                             Se aplicará por defecto a todos los servicios seleccionados.
                           </div>
                         </div>
                       </div>
                     </div>
                   )}

                   {!isEditMode && currentStep === 4 && (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeInUp 0.4s ease-out', flex: 1, minHeight: 0 }}>
                       <div style={{ textAlign: 'center', marginBottom: '4px', flexShrink: 0 }}>
                         <div style={{ width: '56px', height: '56px', borderRadius: '18px', backgroundColor: '#fff0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#c97282' }}>
                           <Sparkles size={24} />
                         </div>
                         <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#2d1b22' }}>Asigna profesional y horario</h3>
                         <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0909a' }}>Asigna una estilista y confirma el horario para cada servicio.</p>
                       </div>

                       {false && selectedServices.length > 1 && (
                         <div style={{ padding: '12px 16px', borderRadius: '18px', background: 'rgba(201, 114, 130,0.04)', border: '1px solid rgba(201, 114, 130,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                           <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#a0909a', letterSpacing: '0.3px' }}>⚡ ¿MISMA ESPECIALISTA PARA TODOS LOS SERVICIOS?</span>
                           <div style={{ width: '220px' }}>
                             <JanaSelect
                               variant="light"
                               label=""
                               value=""
                               placeholder="Asignar a todos..."
                               onChange={(value) => applyStaffToAll(value)}
                               options={(() => {
                                  const serviceCategories = selectedServices.map(svc => {
                                    const svcData = services.find(s => s.id === svc.service_id);
                                    return (svcData?.category || '').toLowerCase();
                                  });
                                  return staffArray
                                    .filter(s => getRoleKind(s.role) !== 'admin')
                                    .map(s => {
                                      const rawRole = getRoleName(s.role);
                                      const roleLower = rawRole.toLowerCase();
                                      let isRecommended = false;
                                      for (const cat of serviceCategories) {
                                        if (cat.includes('uña') && (roleLower.includes('manicurista') || roleLower.includes('uña'))) {
                                          isRecommended = true;
                                        } else if ((cat.includes('ceja') || cat.includes('pestaña') || cat.includes('lash')) && 
                                                   (roleLower.includes('lashista') || roleLower.includes('ceja') || roleLower.includes('pestaña') || roleLower.includes('eyelash'))) {
                                          isRecommended = true;
                                        } else if ((cat.includes('cabello') || cat.includes('peinado') || cat.includes('corte')) && 
                                                   (roleLower.includes('estilista') || roleLower.includes('peluquera') || roleLower.includes('cabello'))) {
                                          isRecommended = true;
                                        } else if (cat.includes('depila') && (roleLower.includes('depila') || roleLower.includes('esteticista'))) {
                                          isRecommended = true;
                                        }
                                      }
                                      return {
                                        value: s.id,
                                        label: getStaffDisplayName(s),
                                        image: s.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100',
                                        subLabel: isRecommended ? `✨ Recomendada (${rawRole})` : rawRole,
                                        isRecommended
                                      };
                                    })
                                    .sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0));
                                })()}
                                showSearch={true}
                             />
                           </div>
                         </div>
                       )}

                       <div className="svc-grid jana-scrollbar" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', paddingBottom: '8px', flex: 1, minHeight: '200px', overflowY: 'auto', overflowX: 'hidden', alignContent: 'start' }}>
                         {selectedServices.map(svc => {
                           const conflict = getServiceConflict(svc);
                           return (
                             <div key={svc._uid} style={{
                               padding: '14px', borderRadius: '16px',
                               border: conflict ? '1.5px solid #f59e0b' : '1px solid rgba(223,178,140,0.18)',
                               background: conflict ? '#fffbeb' : '#ffffff',
                               boxShadow: '0 4px 12px rgba(74,48,54,0.01)',
                               display: 'flex',
                               flexDirection: 'column',
                               gap: '10px'
                             }}>
                               {/* Service Header Info */}
                               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                 <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2d1b22', lineHeight: '1.3', flex: 1 }}>{svc.name}</div>
                                 <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                   {svc.customized && (
                                     <button onClick={() => resetRowToGeneralTime(svc._uid)} title="Restablecer hora general" style={{ background: 'rgba(201, 114, 130,0.08)', border: 'none', color: '#c97282', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', transition: 'all 0.2s' }}>
                                       <RotateCcw size={12} />
                                     </button>
                                   )}
                                   <button onClick={() => removeServiceRow(svc._uid)} title="Eliminar servicio" style={{ background: 'rgba(239,68,68,0.06)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', transition: 'all 0.2s' }}>
                                     <Trash2 size={12} />
                                   </button>
                                 </div>
                               </div>

                               {/* Selection Controls Row */}
                               <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                 {/* Specialist Select */}
                                 <div style={{ flex: 1, minWidth: 0 }}>
                                   <JanaSelect
                                     options={(() => {
                                        const svcData = services.find(s => s.id === svc.service_id);
                                        const serviceCategory = (svcData?.category || '').toLowerCase();
                                        return staffArray
                                          .filter(s => getRoleKind(s.role) !== 'admin')
                                          .map(s => {
                                            const rawRole = getRoleName(s.role);
                                            const roleLower = rawRole.toLowerCase();
                                            let isRecommended = false;
                                            if (serviceCategory.includes('uña') && (roleLower.includes('manicurista') || roleLower.includes('uña'))) {
                                              isRecommended = true;
                                            } else if ((serviceCategory.includes('ceja') || serviceCategory.includes('pestaña') || serviceCategory.includes('lash')) && 
                                                       (roleLower.includes('lashista') || roleLower.includes('ceja') || roleLower.includes('pestaña') || roleLower.includes('eyelash'))) {
                                              isRecommended = true;
                                            } else if ((serviceCategory.includes('cabello') || serviceCategory.includes('peinado') || serviceCategory.includes('corte')) && 
                                                       (roleLower.includes('estilista') || roleLower.includes('peluquera') || roleLower.includes('cabello'))) {
                                              isRecommended = true;
                                            } else if (serviceCategory.includes('depila') && (roleLower.includes('depila') || roleLower.includes('esteticista'))) {
                                              isRecommended = true;
                                            }
                                            return {
                                              value: s.id,
                                              label: getStaffDisplayName(s),
                                              image: s.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100',
                                              subLabel: isRecommended ? `✨ Recomendada (${rawRole})` : rawRole,
                                              isRecommended
                                            };
                                          })
                                          .sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0));
                                      })()}
                                     variant="light"
                                     label=""
                                     value={svc.staffId || ''}
                                     placeholder="Elige una especialista"
                                     onChange={(value) => setRowStaff(svc._uid, value)}
                                     showSearch={true}
                                   />
                                   {!svc.staffId && (
                                     <div style={{ fontSize: '0.62rem', color: '#dc2626', marginTop: '4px', fontWeight: 700 }}>Requerido</div>
                                   )}
                                 </div>
                                 {/* Time Select */}
                                 <div style={{ width: '135px', flexShrink: 0 }}>
                                   <JanaTimePicker variant="light" label="" value={svc.time} onChange={(v) => setRowTime(svc._uid, v)} placement="top" />
                                 </div>
                                </div>

                               {conflict && (
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.64rem', fontWeight: 650, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '6px 10px', borderRadius: '8px' }}>
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

                  {!isEditMode && currentStep === 5 && (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeInUp 0.4s ease-out' }}>
                       <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                         <div style={{ width: '60px', height: '60px', borderRadius: '20px', backgroundColor: '#e2fbe9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#16a34a', boxShadow: '0 8px 20px rgba(22,163,74,0.15)' }}>
                           <Check size={28} strokeWidth={2.5} />
                         </div>
                         <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#2d1b22' }}>Resumen de la Cita</h3>
                         <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#a0909a' }}>Verifica los datos detallados antes de registrar el turno.</p>
                       </div>

                       <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                           <div style={{ padding: '14px 16px', background: '#ffffff', borderRadius: '18px', border: '1px solid rgba(223, 178, 140, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                               <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(201, 114, 130,0.1)', color: '#c97282', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                                 {localClient?.name?.charAt(0).toUpperCase() || 'C'}
                               </div>
                               <div style={{ minWidth: 0 }}>
                                 <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#a0909a', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Clienta</div>
                                 <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2d1b22', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{localClient?.name}</div>
                               </div>
                             </div>
                             <button onClick={() => setCurrentStep(1)} style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(201, 114, 130,0.06)', border: 'none', color: '#c97282', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', flexShrink: 0 }} title="Editar clienta">
                               <Pen size={12} />
                             </button>
                           </div>

                           <div style={{ padding: '14px 16px', background: '#ffffff', borderRadius: '18px', border: '1px solid rgba(223, 178, 140, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                               <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(201, 114, 130,0.1)', color: '#c97282', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                 <Calendar size={16} />
                               </div>
                               <div style={{ minWidth: 0 }}>
                                 <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#a0909a', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Fecha Base</div>
                                 <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2d1b22', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'capitalize' }}>
                                   {selectedDate.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' })}
                                 </div>
                               </div>
                             </div>
                             <button onClick={() => setCurrentStep(3)} style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(201, 114, 130,0.06)', border: 'none', color: '#c97282', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', flexShrink: 0 }} title="Editar fecha">
                               <Pen size={12} />
                             </button>
                           </div>
                         </div>

                         <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '4px' }}>
                             <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#a0909a', letterSpacing: '0.8px', textTransform: 'uppercase' }}>Servicios Asignados</span>
                             <button onClick={() => setCurrentStep(2)} style={{ background: 'none', border: 'none', color: '#c97282', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline dotted', textUnderlineOffset: '2px' }} title="Agregar o quitar servicios">
                               <Pen size={10} /> Editar Lista
                             </button>
                           </div>
                           {selectedServices.map(svc => {
                             const staffObj = staffArray.find(s => s.id === svc.staffId);
                             return (
                               <div key={svc._uid} style={{
                                 background: '#ffffff',
                                 border: '1px solid rgba(223, 178, 140, 0.18)',
                                 borderRadius: '16px',
                                 padding: '12px 16px',
                                 display: 'flex',
                                 justifyContent: 'space-between',
                                 alignItems: 'center',
                                 gap: '16px',
                                 boxShadow: '0 2px 8px rgba(74,48,54,0.01)'
                               }}>
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
                                   <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#2d1b22' }}>{svc.name}</div>
                                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                     {/* Fila de la especialista asignada */}
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                       <img 
                                         src={staffObj?.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'} 
                                         alt={staffObj?.name}
                                         style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
                                       />
                                       <span style={{ fontSize: '0.68rem', color: '#8b7076', fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                         {getStaffDisplayName(staffObj)} · <span style={{ color: '#c97282', fontWeight: 700 }}>{getDisplayTime(svc.time)}</span>
                                       </span>
                                     </div>
                                     <button onClick={() => setCurrentStep(4)} style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'rgba(201, 114, 130,0.04)', border: 'none', color: '#c97282', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', flexShrink: 0 }} title="Reasignar especialista u hora">
                                       <Pen size={9} />
                                     </button>
                                   </div>
                                 </div>
                                 <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#2d1b22', flexShrink: 0 }}>
                                   ${Number(svc.price || 0).toFixed(2)}
                                 </div>
                               </div>
                             );
                           })}
                         </div>

                         <div style={{
                           marginTop: '8px',
                           padding: '16px 20px',
                           borderRadius: '20px',
                           background: 'linear-gradient(135deg, #fffcfb 0%, #fff2f4 100%)',
                           border: '1.5px dashed rgba(201, 114, 130,0.25)',
                           display: 'flex',
                           justifyContent: 'space-between',
                           alignItems: 'center'
                         }}>
                           <div>
                             <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#a0909a', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Valor Total</div>
                             <div style={{ fontSize: '0.68rem', color: '#c97282', fontWeight: 700, marginTop: '2px' }}>{selectedServices.length} servicios</div>
                           </div>
                           <div style={{ fontSize: '1.6rem', fontWeight: 950, color: '#c97282', letterSpacing: '-0.5px' }}>
                             ${cartTotal.toFixed(2)}
                           </div>
                         </div>
                       </div>
                     </div>
                   )}
                  </div>
                </div>

                {/* Stepper Buttons Footer (sticky, full-width strip) */}
                <div style={{ flexShrink: 0, position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid rgba(223,178,140,0.15)', boxShadow: '0 -6px 20px rgba(74,48,54,0.06)', animation: 'fadeInUp 0.4s ease-out 0.3s both' }}>
                 <div className="jana-schedule-footer-inner" style={{ padding: '16px 32px', display: 'flex', gap: '12px' }}>
                  {currentStep > 1 && !isReprogramOnly && (
                    <button
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      style={{
                        height: '52px',
                        borderRadius: '16px',
                        border: '1.5px solid rgba(201, 114, 130,0.3)',
                        background: '#fff',
                        color: '#c97282',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '0 20px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#fff8fa';
                        e.currentTarget.style.transform = 'translateX(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(201, 114, 130,0.15)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#fff';
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
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
                        height: '56px',
                        borderRadius: '16px',
                        border: 'none',
                        background: isStepValid(currentStep) ? 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)' : '#ebdcd0',
                        color: isStepValid(currentStep) ? '#fff' : '#b29c9e',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        letterSpacing: '0.3px',
                        cursor: isStepValid(currentStep) ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: isStepValid(currentStep) ? '0 10px 28px rgba(201, 114, 130,0.3)' : 'none',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        textTransform: 'uppercase'
                      }}
                      onMouseEnter={e => {
                        if (isStepValid(currentStep)) {
                          e.currentTarget.style.transform = 'translateX(2px)';
                          e.currentTarget.style.boxShadow = '0 12px 32px rgba(201, 114, 130,0.4)';
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.boxShadow = isStepValid(currentStep) ? '0 10px 28px rgba(201, 114, 130,0.3)' : 'none';
                      }}
                    >
                      Siguiente <ArrowRight size={18} strokeWidth={2.5} />
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
                        background: 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)',
                        color: '#fff',
                        fontSize: '1rem',
                        fontWeight: 800,
                        cursor: loading ? 'wait' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        boxShadow: '0 10px 28px rgba(201, 114, 130,0.4)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        letterSpacing: '0.5px',
                        animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both'
                      }}
                      onMouseEnter={e => {
                        if (!loading) {
                          e.currentTarget.style.transform = 'translateY(-3px)';
                          e.currentTarget.style.boxShadow = '0 14px 36px rgba(201, 114, 130,0.5)';
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 10px 28px rgba(201, 114, 130,0.4)';
                      }}
                    >
                      <Check size={20} strokeWidth={3} style={{ animation: loading ? 'none' : 'scaleIn 0.3s ease-out' }} /> {isReprogramOnly ? 'Reprogramar Turno' : isEditMode ? 'Guardar Cambios' : 'Confirmar Orden'}
                    </button>
                  )}
                </div>
                </div>
              </>
            )}
          </div>

          {/* Panel Resumen Orden - hijo flex del overlay, se centra junto al modal como grupo */}
          {showSummaryPanel && (
            <div className="jana-scrollbar jana-summary-panel" style={{
              display: 'flex', flexDirection: 'column', gap: '0',
              borderRadius: '32px', width: '340px', flexShrink: 0,
              background: '#fff',
              boxShadow: '0 25px 60px rgba(74,48,54,0.15)',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1.5px solid rgba(223, 178, 140, 0.15)',
              animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
            {/* Header Rosado */}
            <div style={{
              background: 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)',
              padding: '24px',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} /> Cliente
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, lineHeight: 1.2, }}>{localClient?.name || 'Sin cliente'}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.9, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Calendar size={13} /> {selectedDate?.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' }) || 'Sin fecha'}
              </div>
            </div>

            {/* Contenedor de Servicios */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', borderBottom: '2px solid #fcf8f7' }}>

              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#c97282', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Scissors size={14} /> Servicios
              </div>
              {selectedServices.map((svc, idx) => {
                const svcData = services.find(s => s.id === svc.service_id);
                const staffData = staffArray.find(s => s.id === svc.staffId);
                return (
                  <div key={svc._uid} style={{
                    padding: '14px', borderRadius: '12px',
                    background: '#f9f6f5', border: '1px solid rgba(201, 114, 130,0.2)',
                    animation: `fadeInUp 0.3s ease-out ${0.3 + idx * 0.05}s both`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ color: '#c97282', minWidth: '20px', fontSize: '18px', flexShrink: 0 }}>
                        {getCategoryIcon(svcData?.category)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2d1b22', lineHeight: '1.3' }}>
                          {svc.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#a0909a', marginTop: '3px', fontWeight: 600 }}>
                          ${Number(svc.price || 0).toFixed(2)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeServiceRow(svc._uid)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#c8949c', padding: '4px', display: 'flex', flexShrink: 0
                        }}
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Detalles por servicio */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: '#a0909a', paddingTop: '10px', borderTop: '1px solid rgba(201, 114, 130,0.2)' }}>
                      {svc.staffId && staffData && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Sparkles size={13} style={{ color: '#c97282', flexShrink: 0 }} />
                          <span style={{ fontWeight: 600 }}>{getStaffDisplayName(staffData)}</span>
                        </div>
                      )}
                      {svc.time && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={13} style={{ color: '#c97282', flexShrink: 0 }} />
                          <span style={{ fontWeight: 600 }}>{getDisplayTime(svc.time)}</span>
                        </div>
                      )}
                      {!svc.staffId || !svc.time ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: 700 }}>
                          <AlertTriangle size={13} />
                          {!svc.staffId && !svc.time ? 'Falta profesional y horario' : !svc.staffId ? 'Falta profesional' : 'Falta horario'}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total - Sección Premium */}
            <div style={{
              padding: '20px', borderRadius: '0 0 20px 20px',
              background: 'linear-gradient(135deg, #f5e8eb 0%, #faf5f7 100%)',
              borderTop: '2px solid #f0e0e5',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#a0909a', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total de la Orden</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#c97282', lineHeight: 1 }}>
                ${cartTotal.toFixed(2)}
              </div>
            </div>
          </div>
        )}
        </div>
      )}
    </AnimatedModal>,
    document.body
  );
};

export default ScheduleModal;
