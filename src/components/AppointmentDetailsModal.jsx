import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import AnimatedModal from './AnimatedModal';
import { X, Calendar, Clock, User, CheckCircle2, Trash2, Edit2 } from 'lucide-react';

const AppointmentDetailsModal = ({ isOpen, onClose, appointment, staffMember }) => {
  const [loading, setLoading] = useState(false);

  if (!appointment) return null;

  const start = new Date(appointment.scheduled_at || appointment.created_at);
  const timeString = start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateString = start.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const clientName = appointment.clients?.name || 'Cliente sin nombre';
  const serviceName = appointment.services?.name || 'Servicio General';
  const duration = appointment.duration_minutes || appointment.services?.duration_minutes || 60;
  
  const end = new Date(start.getTime() + duration * 60000);
  const endTimeString = end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completado': return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
      case 'En Curso': return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      case 'Cancelada': return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
      default: return { bg: '#fff2f4', text: '#c97282', border: '#fce7ea' }; // Agendado
    }
  };

  const statusColors = getStatusColor(appointment.status);

  return createPortal(
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={`${overlayClass} jana-schedule-modal-overlay`} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(30, 30, 30, 0.45)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 20000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px', animation: overlayClass === 'modal-overlay-exit' ? 'fadeOutDown 0.32s cubic-bezier(0.4, 0, 1, 1) forwards' : 'fadeIn 0.25s ease-out' }}>
          <div className={`${cardClass} jana-schedule-modal-card`} style={{ width: 'min(90vw, 420px)', flexShrink: 0, backgroundColor: '#fcf8f7', borderRadius: '32px', boxShadow: '0 25px 60px rgba(74,48,54,0.2), 0 8px 24px rgba(0,0,0,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: cardClass === 'modal-card-exit' ? 'slideDown 0.32s cubic-bezier(0.4, 0, 1, 1) forwards' : 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)', position: 'relative' }}>
            
            {/* Header */}
            <div style={{ padding: '28px 28px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(223, 178, 140, 0.15)' }}>
              <div>
                <div style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: '999px', background: statusColors.bg, color: statusColors.text, border: `1px solid ${statusColors.border}`, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  {appointment.status || 'Agendado'}
                </div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#2d1b22', letterSpacing: '-0.5px' }}>Detalles de Cita</h2>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#a0909a', transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }} onMouseEnter={e => e.currentTarget.style.color = '#c97282'} onMouseLeave={e => e.currentTarget.style.color = '#a0909a'}>
                <X size={22} strokeWidth={2.5} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Client Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #fdf4f5 0%, #fae6e9 100%)', border: '2px solid rgba(201, 114, 130, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282' }}>
                  <User size={26} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2d1b22' }}>{clientName}</div>
                  <div style={{ fontSize: '0.8rem', color: '#8c767b', fontWeight: 500, marginTop: '2px' }}>{appointment.clients?.phone || 'Sin teléfono'}</div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(223, 178, 140, 0.15)' }} />

              {/* Service & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#fff2f4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', flexShrink: 0 }}>
                    <Calendar size={18} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a0506a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Fecha</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2d1b22', textTransform: 'capitalize' }}>{dateString}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#fff2f4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', flexShrink: 0 }}>
                    <Clock size={18} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a0506a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Horario</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2d1b22' }}>{timeString} - {endTimeString} <span style={{ color: '#a0909a', fontSize: '0.8rem', fontWeight: 500 }}>({duration} min)</span></div>
                  </div>
                </div>
              </div>

              {/* Service Card */}
              <div style={{ background: '#fff', border: '1px solid rgba(223, 178, 140, 0.2)', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(74, 48, 54, 0.03)' }}>
                {staffMember && (
                  <img
                    src={staffMember.image_url || staffMember.photo_url || `https://i.pravatar.cc/150?u=${encodeURIComponent(staffMember.name || '')}`}
                    alt={staffMember.name || ''}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(223,178,140,0.25)' }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2d1b22', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{serviceName}</div>
                  <div style={{ fontSize: '0.75rem', color: '#8c767b', fontWeight: 500 }}>con {staffMember?.name?.split(' ')[0] || 'Especialista'}</div>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#c97282' }}>
                  ${appointment.price_paid || appointment.services?.price || '0'}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '20px 28px 28px', background: '#fff', borderTop: '1px solid rgba(223, 178, 140, 0.15)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className="jana-btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '16px', background: 'linear-gradient(135deg, #c97282 0%, #a0506a 100%)', color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(201, 114, 130, 0.3)' }}
                onClick={() => alert("Cobrar y Completar (Pronto)")}
              >
                <CheckCircle2 size={18} strokeWidth={2.5} /> Cobrar y Completar
              </button>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '14px', background: '#fff2f4', color: '#c97282', border: '1px solid rgba(201,114,130,0.15)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fae6e9'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff2f4'}
                  onClick={() => alert("Reprogramar Cita (Pronto)")}
                >
                  <Edit2 size={16} strokeWidth={2.5} /> Modificar
                </button>
                <button 
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '14px', background: '#fff', color: '#991b1b', border: '1px solid rgba(153, 27, 27, 0.15)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  onClick={() => alert("Cancelar Cita (Pronto)")}
                >
                  <Trash2 size={16} strokeWidth={2.5} /> Cancelar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </AnimatedModal>
  );
};

export default AppointmentDetailsModal;
