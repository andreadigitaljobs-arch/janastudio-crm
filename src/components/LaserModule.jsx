import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, TrendingUp, Plus, Search, Filter, AlertCircle, X, ChevronRight, CheckCircle2, User, Trash2, CalendarClock, Package, PlayCircle } from 'lucide-react';
import LaserPackageModal from './LaserPackageModal';
import LaserSessionModal from './LaserSessionModal';
import AnimatedModal from './AnimatedModal';

const DUMMY_PACKAGES = [
  { id: 1, client: 'María Fernández', phone: '+58 412-1234567', package: '8 Sesiones (Piernas + Brasilera)', currentSession: 3, totalSessions: 8, lastSession: 'Hace 20 días', nextSession: 'Hoy', price: 145, paid: 100, pending: 45, status: 'Al día' },
  { id: 2, client: 'Ana López', phone: '+58 424-9876543', package: '5 Sesiones (Axilas)', currentSession: 1, totalSessions: 5, lastSession: 'N/A', nextSession: 'Mañana', price: 60, paid: 20, pending: 40, status: 'Cuota Pendiente' },
  { id: 3, client: 'Sofía Rodríguez', phone: '+58 414-5551212', package: '10 Sesiones (Cuerpo Completo)', currentSession: 8, totalSessions: 10, lastSession: 'Hace 30 días', nextSession: 'Próxima semana', price: 300, paid: 300, pending: 0, status: 'Pagado' },
];

const LaserModule = ({ isMobile }) => {
  const [activeTab, setActiveTab] = useState('packages'); // 'packages' | 'calendar'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isSellPackageOpen, setIsSellPackageOpen] = useState(false);
  const [selectedPackageForSession, setSelectedPackageForSession] = useState(null);
  
  // New states for calendar mockups
  const [isBlockTimeOpen, setIsBlockTimeOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [calendarSlots, setCalendarSlots] = useState([
    { time: '08:00 AM', status: 'available' },
    { time: '09:00 AM', status: 'booked', client: 'María Fernández', package: 'Piernas + Brasilera', session: '4/8', debt: 0, tag: 'Al día', tagColor: '#16a34a' },
    { time: '10:00 AM', status: 'available' },
    { time: '11:00 AM', status: 'booked', client: 'Ana López', package: 'Axilas', session: '2/5', debt: 40, tag: 'Debe $40', tagColor: '#dc2626' },
    { time: '12:00 PM', status: 'blocked', reason: 'Mantenimiento' },
    { time: '01:00 PM', status: 'available' },
    { time: '02:00 PM', status: 'available' },
    { time: '03:00 PM', status: 'booked', client: 'Sofía Rodríguez', package: 'Cuerpo Completo', session: '1/10', debt: 0, tag: 'Al día', tagColor: '#16a34a' },
    { time: '04:00 PM', status: 'available' },
    { time: '05:00 PM', status: 'available' },
    { time: '06:00 PM', status: 'available' },
  ]);

  const handleUnblock = (index) => {
    const newSlots = [...calendarSlots];
    newSlots[index] = { ...newSlots[index], status: 'available', reason: null };
    setCalendarSlots(newSlots);
  };

  const handlePrevDay = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const handleNextDay = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  };

  const formattedDate = currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);


  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile ? 'calc(100px + env(safe-area-inset-bottom, 12px))' : '40px' }}>
      
      {/* HEADER EXACTLY LIKE AGENDA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: isMobile ? '100%' : 'auto', gap: '12px' }}>
          <div>
            <h1 className="jana-page-title">
              Centro Láser
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#a0909a', margin: '6px 0 0 0', fontWeight: 500 }}>
              Gestión de paquetes, cuotas y sesiones de depilación láser.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={() => setIsSellPackageOpen(true)}
          style={{
            padding: isMobile ? '12px 20px' : '8px 18px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)',
            color: '#fff', fontSize: isMobile ? '0.95rem' : '0.82rem', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            flex: isMobile ? '1 1 100%' : 'none',
            boxShadow: '0 4px 15px rgba(201, 114, 130,0.25)',
            transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(201, 114, 130,0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(201, 114, 130,0.25)';
          }}
        >
          <Plus size={15} /> Vender Paquete
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid rgba(223, 178, 140, 0.15)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('packages')}
          style={{ padding: '0 0 12px 0', background: 'none', border: 'none', borderBottom: activeTab === 'packages' ? '3px solid #c97282' : '3px solid transparent', color: activeTab === 'packages' ? '#2d1b22' : '#a0909a', fontWeight: activeTab === 'packages' ? 800 : 600, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', marginBottom: '-2px' }}
        >
          <Package size={18} /> Paquetes Activos
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          style={{ padding: '0 0 12px 0', background: 'none', border: 'none', borderBottom: activeTab === 'calendar' ? '3px solid #c97282' : '3px solid transparent', color: activeTab === 'calendar' ? '#2d1b22' : '#a0909a', fontWeight: activeTab === 'calendar' ? 800 : 600, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', marginBottom: '-2px' }}
        >
          <CalendarIcon size={18} /> Calendario Láser
        </button>
      </div>

      {/* Content Area */}
      <div style={{ position: 'relative' }}>
        
        {activeTab === 'packages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUpWow 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            
            {/* Filters / Search */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={18} color="#a0909a" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder="Buscar clienta por nombre o teléfono..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '16px', border: '1px solid rgba(223, 178, 140, 0.25)', backgroundColor: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(10px)', fontSize: '0.95rem', color: '#2d1b22', fontWeight: 600, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#c97282';
                    e.target.style.boxShadow = '0 0 0 3px rgba(201, 114, 130, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(223, 178, 140, 0.25)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Packages List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
              {DUMMY_PACKAGES.map(pkg => (
                <div key={pkg.id} className="agenda-glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.7)', transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(74, 48, 54, 0.08)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(74, 48, 54, 0.04)'; }}>
                  
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #fff0f2 0%, #ffe1e6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', fontWeight: 900, fontSize: '1.4rem', border: '2px solid #fff', boxShadow: '0 4px 12px rgba(201,114,130,0.15)' }}>
                        {pkg.client.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#2d1b22', letterSpacing: '-0.3px' }}>{pkg.client}</div>
                        <div style={{ fontSize: '0.8rem', color: '#a0909a', fontWeight: 600 }}>{pkg.phone}</div>
                      </div>
                    </div>
                    <div style={{ 
                      padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, 
                      backgroundColor: pkg.status === 'Al día' ? '#fff0f2' : pkg.status === 'Cuota Pendiente' ? '#ffe1e6' : '#fcf9f8', 
                      color: pkg.status === 'Al día' ? '#c97282' : pkg.status === 'Cuota Pendiente' ? '#a0506a' : '#a0909a', 
                      border: `1px solid ${pkg.status === 'Al día' ? 'rgba(201,114,130,0.2)' : pkg.status === 'Cuota Pendiente' ? 'rgba(160,80,106,0.2)' : 'rgba(160,144,154,0.2)'}` 
                    }}>
                      {pkg.status}
                    </div>
                  </div>

                  {/* Info Box */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.6)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid rgba(223, 178, 140, 0.15)' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2d1b22', paddingBottom: '10px', borderBottom: '1px dashed rgba(223, 178, 140, 0.3)' }}>
                      <span style={{ color: '#c97282', marginRight: '6px' }}>✦</span>
                      {pkg.package}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#8c767b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <PlayCircle size={14} color="#c97282" /> Sesiones Consumidas
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#c97282' }}>
                        {pkg.currentSession} <span style={{ fontSize: '0.85rem', color: '#a0909a', fontWeight: 700 }}>/ {pkg.totalSessions}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ width: '100%', height: '8px', background: 'rgba(201,114,130,0.1)', borderRadius: '999px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ width: `${(pkg.currentSession / pkg.totalSessions) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #c48b9f 0%, #c97282 100%)', borderRadius: '999px', transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                    </div>
                  </div>

                  {/* Payment Info & Action */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#a0909a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Deuda Pendiente</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: pkg.pending > 0 ? '#a0506a' : '#c97282', letterSpacing: '-0.5px' }}>${pkg.pending}</div>
                    </div>
                    
                    <button 
                      onClick={() => setSelectedPackageForSession(pkg)}
                      className="btn-press"
                      style={{ padding: '10px 20px', borderRadius: '14px', background: '#fff', color: '#c97282', border: '1px solid rgba(201,114,130,0.2)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(201,114,130,0.05)' }} 
                      onMouseEnter={e => { e.currentTarget.style.background = '#fff0f2'; e.currentTarget.style.borderColor = 'rgba(201,114,130,0.4)'; }} 
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'rgba(201,114,130,0.2)'; }}
                    >
                      Agendar Sesión
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div style={{ display: 'flex', gap: '24px', flexDirection: isMobile ? 'column' : 'row', animation: 'fadeInUpWow 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            
            {/* Sidebar with mini calendar / summary */}
            <div style={{ flex: '1', background: 'rgba(255, 255, 255, 0.7)', borderRadius: '24px', padding: '24px', boxShadow: '0 8px 32px rgba(201, 114, 130, 0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.5)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#2d1b22', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={20} color="#c97282" /> Máquina Láser
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(201, 114, 130, 0.05) 0%, rgba(201, 114, 130, 0.15) 100%)', borderRadius: '16px', border: '1px solid rgba(201,114,130,0.1)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#c97282', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hoy</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2d1b22', letterSpacing: '-0.5px', marginTop: '4px' }}>8 Citas</div>
                  <div style={{ fontSize: '0.85rem', color: '#a0909a', fontWeight: 600, marginTop: '4px' }}>4 horas de uso estimado</div>
                </div>
                
                <div 
                  onClick={() => setIsBlockTimeOpen(true)}
                  className="btn-press"
                  style={{ padding: '16px', background: '#fff', borderRadius: '16px', border: '1px dashed rgba(223,178,140,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#dfb28c', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} 
                  onMouseEnter={e => { e.currentTarget.style.background = '#fffaf5'; }} 
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                >
                  <Plus size={18} /> Bloquear Horario
                </div>
              </div>
            </div>

            {/* Main Schedule Area Mockup */}
            <div style={{ flex: '3', background: 'rgba(255, 255, 255, 0.8)', borderRadius: '24px', padding: '24px', boxShadow: '0 8px 32px rgba(201, 114, 130, 0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.5)', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
              
              {/* Fake timeline header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(201,114,130,0.1)' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2d1b22', margin: 0, textTransform: 'capitalize' }}>{capitalizedDate}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handlePrevDay} className="btn-press" style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#fff', border: '1px solid rgba(201,114,130,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', cursor: 'pointer' }}>{'<'}</button>
                  <button onClick={handleNextDay} className="btn-press" style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#fff', border: '1px solid rgba(201,114,130,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', cursor: 'pointer' }}>{'>'}</button>
                </div>
              </div>

              {/* Timeline slots dynamically generated */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, paddingRight: '4px', overflowY: 'auto', maxHeight: isMobile ? 'none' : '500px' }}>
                {calendarSlots.map((slot, idx) => (
                  <div key={idx} className="fade-in-stagger" style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>
                    <div style={{ width: '70px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: '#a0909a', paddingTop: '12px', flexShrink: 0 }}>{slot.time}</div>
                    
                    {slot.status === 'booked' && (
                      <div className="hover-lift booked-slot" style={{ flex: 1, background: slot.debt > 0 ? 'linear-gradient(135deg, #fff 0%, #fef2f2 100%)' : 'linear-gradient(135deg, #fff 0%, #fff0f2 100%)', borderRadius: '16px', padding: '16px', borderLeft: `4px solid ${slot.debt > 0 ? '#dc2626' : '#c97282'}`, boxShadow: `0 2px 10px ${slot.debt > 0 ? 'rgba(220,38,38,0.05)' : 'rgba(201,114,130,0.05)'}`, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2d1b22' }}>{slot.client}</div>
                            <div style={{ fontSize: '0.8rem', color: slot.debt > 0 ? '#dc2626' : '#c97282', fontWeight: 700, margin: '4px 0 0 0' }}>
                              <div style={{ marginBottom: '2px' }}>{slot.package}</div>
                              <div style={{ opacity: 0.85 }}>Sesión {slot.session}</div>
                            </div>
                          </div>
                          <div style={{ background: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, color: slot.tagColor, border: `1px solid ${slot.tagColor}33`, whiteSpace: 'nowrap', flexShrink: 0 }}>{slot.tag}</div>
                        </div>
                        
                        {/* Hover Actions */}
                        <div 
                          className="unlock-overlay"
                          style={{ position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', transition: 'all 0.2s ease', backdropFilter: 'blur(2px)' }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              alert('La funcionalidad de posponer cita abrirá el calendario principal.');
                            }}
                            className="btn-press"
                            style={{ background: '#fff', border: '1px solid rgba(223, 178, 140, 0.5)', color: '#dfb28c', padding: '8px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(223, 178, 140, 0.1)' }}
                          >
                            <CalendarClock size={16} /> Posponer
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnblock(idx);
                            }}
                            className="btn-press"
                            style={{ background: '#fff', border: '1px solid rgba(201, 114, 130, 0.5)', color: '#c97282', padding: '8px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(201, 114, 130, 0.1)' }}
                          >
                            <Trash2 size={16} /> Eliminar
                          </button>
                        </div>
                      </div>
                    )}
              
                    {slot.status === 'available' && (
                      <div 
                        onClick={() => setIsSellPackageOpen(true)}
                        className="btn-press"
                        style={{ flex: 1, background: 'rgba(255,255,255,0.4)', borderRadius: '16px', border: '1px dashed rgba(201,114,130,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', fontSize: '0.85rem', fontWeight: 600, minHeight: '60px', cursor: 'pointer' }} 
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.8)'} 
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'}
                      >
                        + Agendar cita
                      </div>
                    )}
              
                    {slot.status === 'blocked' && (
                      <div 
                        className="blocked-slot"
                        style={{ flex: 1, background: '#f5f0f2', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0909a', fontSize: '0.85rem', fontWeight: 700, minHeight: '60px', border: '1px solid rgba(160, 144, 154, 0.1)', position: 'relative', overflow: 'hidden' }}
                      >
                        <span>Bloqueado: {slot.reason}</span>
                        <div 
                          className="unlock-overlay"
                          onClick={() => handleUnblock(idx)}
                          style={{ position: 'absolute', inset: 0, background: 'rgba(201, 114, 130, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.3s ease' }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <X size={16} /> Desbloquear
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      <LaserPackageModal 
        isOpen={isSellPackageOpen} 
        onClose={() => setIsSellPackageOpen(false)} 
        isMobile={isMobile} 
      />

      <LaserSessionModal 
        isOpen={!!selectedPackageForSession} 
        onClose={() => setSelectedPackageForSession(null)} 
        isMobile={isMobile} 
        packageData={selectedPackageForSession} 
      />

      {/* Block Time Mockup Modal */}
      <AnimatedModal isOpen={isBlockTimeOpen}>
        {(overlayClass, cardClass) => (
          <div className={`modal-overlay ${overlayClass}`} style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(45, 27, 34, 0.4)', backdropFilter: 'blur(8px)' }}>
            <div className={`modal-card ${cardClass}`} style={{ background: '#fff', padding: '32px', borderRadius: '24px', width: '90%', maxWidth: '400px', boxSizing: 'border-box' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#2d1b22', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#c97282" /> Bloquear Horario Láser
              </h3>
              <p style={{ color: '#a0909a', fontSize: '0.9rem', marginBottom: '24px' }}>Selecciona el rango de horas en el que la máquina láser estará en mantenimiento o inactiva.</p>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
                <input type="text" defaultValue="12:00 PM" style={{ flex: 1, minWidth: 0, padding: '12px', borderRadius: '12px', border: '1px solid rgba(201, 114, 130, 0.4)', outline: 'none', textAlign: 'center', fontWeight: 700, color: '#2d1b22', boxSizing: 'border-box' }} />
                <span style={{ color: '#a0909a', flexShrink: 0 }}>a</span>
                <input type="text" defaultValue="02:00 PM" style={{ flex: 1, minWidth: 0, padding: '12px', borderRadius: '12px', border: '1px solid rgba(201, 114, 130, 0.4)', outline: 'none', textAlign: 'center', fontWeight: 700, color: '#2d1b22', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setIsBlockTimeOpen(false)} className="btn-press" style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#f5f0f2', border: 'none', color: '#a0909a', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={() => setIsBlockTimeOpen(false)} className="btn-press" style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(201,114,130,0.25)' }}>Bloquear</button>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

    </div>
  );
};

export default LaserModule;
