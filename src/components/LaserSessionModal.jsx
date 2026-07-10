import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, AlertTriangle, CheckSquare, Sparkles, Plus } from 'lucide-react';
import AnimatedModal from './AnimatedModal';

const LaserSessionModal = ({ isOpen, onClose, isMobile, packageData }) => {
  const [agreed, setAgreed] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const dates = [
    { day: 'Vie', date: '10' },
    { day: 'Sáb', date: '11' },
    { day: 'Lun', date: '13' },
    { day: 'Mar', date: '14' },
    { day: 'Mié', date: '15' }
  ];

  const times = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];
  

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
                    Agendar Sesión Láser
                  </h3>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#a0909a', fontWeight: 600 }}>
                    Máquina Diodo Exclusiva
                  </p>
                </div>
                <button onClick={onClose} className="btn-press" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f0f2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0909a', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }} onMouseEnter={e => { e.currentTarget.style.background = '#ffe1e6'; e.currentTarget.style.color = '#c97282'; }} onMouseLeave={e => { e.currentTarget.style.background = '#f5f0f2'; e.currentTarget.style.color = '#a0909a'; }}>
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

                  {/* Outstanding Debt Alert (if any) */}
                  {packageData?.pending > 0 && (
                    <div style={{ background: '#fff0f2', border: '1px solid rgba(220, 38, 38, 0.3)', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <AlertTriangle size={20} color="#dc2626" style={{ marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#991b1b' }}>Cuota Pendiente: ${packageData.pending}</div>
                        <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '4px', fontWeight: 500 }}>Recuerda cobrar esta cuota antes de pasar a la clienta a cabina.</div>
                      </div>
                    </div>
                  )}

                  {/* Date & Time Selection */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 800, color: '#2d1b22', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={16} color="#c97282" /> Fecha de la Sesión
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        {dates.map((d, i) => {
                          const isSelected = selectedDate === d.date && !isCustomDate;
                          return (
                            <div 
                              key={i} 
                              onClick={() => { setSelectedDate(d.date); setIsCustomDate(false); }}
                              style={{ 
                                padding: '12px 0', borderRadius: '16px', 
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                border: isSelected ? '2px solid #c97282' : '1px solid rgba(223, 178, 140, 0.4)',
                                background: isSelected ? '#fff0f2' : '#fff',
                                color: isSelected ? '#c97282' : '#a0909a',
                                cursor: 'pointer', transition: 'all 0.2s',
                                boxShadow: isSelected ? '0 4px 12px rgba(201, 114, 130, 0.15)' : 'none'
                              }}
                            >
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>{d.day}</span>
                              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: isSelected ? '#2d1b22' : '#2d1b22' }}>{d.date}</span>
                            </div>
                          );
                        })}
                        <div 
                          onClick={() => { setIsCustomDate(true); setSelectedDate(''); }}
                          style={{ 
                            padding: '12px 0', borderRadius: '16px', 
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                            border: isCustomDate ? '2px solid #c97282' : '1px dashed rgba(223, 178, 140, 0.6)',
                            background: isCustomDate ? '#fff0f2' : 'rgba(255,255,255,0.5)',
                            color: isCustomDate ? '#c97282' : '#a0909a',
                            cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: isCustomDate ? '0 4px 12px rgba(201, 114, 130, 0.15)' : 'none'
                          }}
                        >
                          <Plus size={20} />
                          <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>Otra</span>
                        </div>
                      </div>
                      {isCustomDate && (
                        <div style={{ marginTop: '12px', animation: 'fadeIn 0.3s ease' }}>
                          <input 
                            type="text" 
                            placeholder="Ej. 25/08/2026"
                            value={selectedDate || ''}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1.5px solid rgba(201, 114, 130, 0.4)', backgroundColor: '#fff', fontSize: '1rem', color: '#2d1b22', fontWeight: 700, outline: 'none' }} 
                          />
                        </div>
                      )}
                    </div>
                    
                    <div style={{ opacity: selectedDate ? 1 : 0.5, pointerEvents: selectedDate ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                      <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 800, color: '#2d1b22', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={16} color="#c97282" /> Hora (Disponibilidad Máquina)
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        {times.map((t, i) => {
                          const isSelected = selectedTime === t && !isCustomTime;
                          return (
                            <div 
                              key={i}
                              onClick={() => { setSelectedTime(t); setIsCustomTime(false); }}
                              style={{ 
                                padding: '14px 8px', borderRadius: '14px', textAlign: 'center',
                                border: isSelected ? '2px solid #c97282' : '1px solid rgba(223, 178, 140, 0.4)',
                                background: isSelected ? '#fff0f2' : '#fff',
                                color: isSelected ? '#c97282' : '#2d1b22',
                                fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                              }}
                            >
                              {t}
                            </div>
                          );
                        })}
                        <div 
                          onClick={() => { setIsCustomTime(true); setSelectedTime(''); }}
                          style={{ 
                            padding: '14px 8px', borderRadius: '14px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            border: isCustomTime ? '2px solid #c97282' : '1px dashed rgba(223, 178, 140, 0.6)',
                            background: isCustomTime ? '#fff0f2' : 'rgba(255,255,255,0.5)',
                            color: isCustomTime ? '#c97282' : '#a0909a',
                            fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          <Plus size={16} /> Otra
                        </div>
                      </div>
                      {isCustomTime && (
                        <div style={{ marginTop: '12px', animation: 'fadeIn 0.3s ease' }}>
                          <input 
                            type="text" 
                            placeholder="Ej. 10:15 AM"
                            value={selectedTime || ''}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1.5px solid rgba(201, 114, 130, 0.4)', backgroundColor: '#fff', fontSize: '1rem', color: '#2d1b22', fontWeight: 700, outline: 'none' }} 
                          />
                        </div>
                      )}
                    </div>
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
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2d1b22' }}>Consentimiento Informado</div>
                      <div style={{ fontSize: '0.8rem', color: '#a0909a', marginTop: '4px', fontWeight: 500, lineHeight: 1.4 }}>Confirmo que la clienta ha firmado el consentimiento de depilación láser para esta área.</div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '24px 32px', borderTop: '1px solid rgba(223, 178, 140, 0.15)', backgroundColor: '#fff' }}>
                  <button 
                    onClick={() => setIsSuccess(true)}
                    disabled={!agreed || !selectedDate || !selectedTime}
                    style={{ 
                      width: '100%', padding: '18px', borderRadius: '16px', 
                      background: (agreed && selectedDate && selectedTime) ? 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)' : '#f5f0f2', 
                      color: (agreed && selectedDate && selectedTime) ? '#fff' : '#a0909a', 
                      fontWeight: 800, fontSize: '1.05rem', border: 'none', cursor: (agreed && selectedDate && selectedTime) ? 'pointer' : 'not-allowed', 
                      boxShadow: (agreed && selectedDate && selectedTime) ? '0 8px 24px rgba(201, 114, 130, 0.25)' : 'none', 
                      transition: 'all 0.2s' 
                    }}
                  >
                    Agendar Sesión
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: 'fadeInUpWow 0.5s ease forwards' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #fff0f2 0%, #ffe1e6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', boxShadow: '0 12px 32px rgba(201, 114, 130, 0.2)', marginBottom: '24px' }}>
                  <Sparkles size={40} />
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2d1b22', marginBottom: '12px', letterSpacing: '-0.5px' }}>¡Sesión Agendada!</h2>
                <p style={{ fontSize: '0.95rem', color: '#8c767b', fontWeight: 500, lineHeight: 1.5, marginBottom: '32px', maxWidth: '300px' }}>
                  La sesión de <span style={{ fontWeight: 800, color: '#c97282' }}>{packageData?.client || 'la clienta'}</span> ha sido programada exitosamente para el <strong style={{ color: '#2d1b22' }}>{selectedDate}</strong> a las <strong style={{ color: '#2d1b22' }}>{selectedTime}</strong>.
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
