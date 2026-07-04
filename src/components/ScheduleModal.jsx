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

const ScheduleModal = ({ isOpen, onClose, client, service, staff, onSchedule, defaultDate }) => {
  const [selectedDate, setSelectedDate] = useState(defaultDate || new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [customTime, setCustomTime] = useState('10:00');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && staff) {
      loadAvailability();
    }
  }, [isOpen, selectedDate, staff]);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      // 1. Get all appointments for this staff on this day
      const safeDate = selectedDate instanceof Date && !isNaN(selectedDate) ? selectedDate : new Date();
      const dateStr = safeDate.toISOString().split('T')[0];
      const allApps = await dataService.getAppointmentsByState(['Agendado', 'En Silla', 'Por Pagar']);
      const dailyApps = (allApps || []).filter(a => 
        a.staff_id === staff?.id && 
        (a.scheduled_at?.startsWith(dateStr) || (!a.scheduled_at && a.created_at?.startsWith(dateStr)))
      );

      // 2. Generate slots from 8:00 AM to 8:00 PM
      const slots = [];
      const startHour = 0;
      const endHour = 24;
      const now = new Date();
      const isToday = selectedDate.toDateString() === now.toDateString();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let min of [0, 30]) {
          // Check if it's today and the time has already passed
          if (isToday && (hour < currentHour || (hour === currentHour && min <= currentMinutes))) {
            continue;
          }

          const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
          
          // Check if slot is occupied
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

  const handleSchedule = () => {
    const timeToUse = isCustomMode ? customTime : selectedSlot;
    if (!timeToUse || !onSchedule) return;
    
    const [hours, minutes] = timeToUse.split(':');
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    onSchedule(scheduledAt.toISOString());
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

  return createPortal(
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 20000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className={`glass-card ${cardClass}`} style={{ maxWidth: '600px', width: '100%', borderRadius: '32px', padding: '32px', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '900' }}>Agendar <span className="text-gold">Turno</span></h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{service?.name} con {staff?.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer' }}><X /></button>
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
              backgroundColor: !isCustomMode ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
              border: !isCustomMode ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
              color: !isCustomMode ? 'var(--gold-primary)' : 'white'
            }}
          >
            HORARIOS DISPONIBLES
          </button>
          <button 
            onClick={() => setIsCustomMode(true)}
            style={{ 
              flex: 1, height: '40px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s',
              backgroundColor: isCustomMode ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
              border: isCustomMode ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
              color: isCustomMode ? 'var(--gold-primary)' : 'white'
            }}
          >
            PERSONALIZADO
          </button>
        </div>

        {/* Slots Grid / Custom Time Input */}
        <div style={{ marginBottom: '32px' }}>
          {isCustomMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', padding: '24px 0' }}>
              <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Ingresa la hora deseada</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock size={20} color="var(--gold-primary)" />
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(212,175,55,0.3)',
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
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '16px', letterSpacing: '1px' }}>SELECCIONA UN TURNO</label>
              {loading ? (
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
                          backgroundColor: selectedSlot === slot.time ? 'var(--gold-primary)' : slot.isAvailable ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
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
          className="btn-gold" 
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
