import React, { useState } from 'react';
import { Sparkles, Calendar as CalendarIcon, Search, Plus, CreditCard, Clock, User, ChevronRight, PlayCircle } from 'lucide-react';
import JanaSelect from './common/JanaSelect';

const DUMMY_PACKAGES = [
  { id: 1, client: 'María Fernández', phone: '+58 412-1234567', package: '8 Sesiones (Piernas + Brasilera)', currentSession: 3, totalSessions: 8, lastSession: 'Hace 20 días', nextSession: 'Hoy', price: 145, paid: 100, pending: 45, status: 'Al día' },
  { id: 2, client: 'Ana López', phone: '+58 424-9876543', package: '5 Sesiones (Axilas)', currentSession: 1, totalSessions: 5, lastSession: 'N/A', nextSession: 'Mañana', price: 60, paid: 20, pending: 40, status: 'Cuota Pendiente' },
  { id: 3, client: 'Sofía Rodríguez', phone: '+58 414-5551212', package: '10 Sesiones (Cuerpo Completo)', currentSession: 8, totalSessions: 10, lastSession: 'Hace 30 días', nextSession: 'Próxima semana', price: 300, paid: 300, pending: 0, status: 'Pagado' },
];

const LaserModule = ({ isMobile }) => {
  const [activeTab, setActiveTab] = useState('packages'); // 'packages' | 'calendar'
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: '#fcf9f8' }}>
      
      {/* Header */}
      <div style={{ padding: '24px 32px 20px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', gap: '20px', backgroundColor: '#fff', borderBottom: '1px solid rgba(223, 178, 140, 0.15)', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2d1b22', margin: '0 0 8px 0', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={28} color="#c97282" />
            Centro Láser
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#a0909a', fontWeight: 500 }}>
            Gestión de paquetes, cuotas y sesiones de depilación láser.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '16px', background: 'linear-gradient(135deg, #c97282 0%, #a0506a 100%)', color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(201, 114, 130, 0.25)' }}>
            <Plus size={18} strokeWidth={2.5} /> Vender Paquete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 32px', backgroundColor: '#fff', borderBottom: '1px solid rgba(223, 178, 140, 0.15)', display: 'flex', gap: '24px', flexShrink: 0 }}>
        <button
          onClick={() => setActiveTab('packages')}
          style={{ padding: '16px 0', background: 'none', border: 'none', borderBottom: activeTab === 'packages' ? '3px solid #c97282' : '3px solid transparent', color: activeTab === 'packages' ? '#2d1b22' : '#a0909a', fontWeight: activeTab === 'packages' ? 800 : 600, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
        >
          <Package size={18} /> Paquetes Activos
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          style={{ padding: '16px 0', background: 'none', border: 'none', borderBottom: activeTab === 'calendar' ? '3px solid #c97282' : '3px solid transparent', color: activeTab === 'calendar' ? '#2d1b22' : '#a0909a', fontWeight: activeTab === 'calendar' ? 800 : 600, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
        >
          <CalendarIcon size={18} /> Calendario Láser
        </button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }} className="jana-scrollbar">
        
        {activeTab === 'packages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* Filters / Search */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={18} color="#a0909a" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder="Buscar clienta por nombre o teléfono..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '16px', border: '1.5px solid rgba(223, 178, 140, 0.25)', backgroundColor: '#fff', fontSize: '0.95rem', color: '#2d1b22', fontWeight: 600, outline: 'none' }}
                />
              </div>
            </div>

            {/* Packages List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {DUMMY_PACKAGES.map(pkg => (
                <div key={pkg.id} style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid rgba(223, 178, 140, 0.15)', boxShadow: '0 4px 24px rgba(74, 48, 54, 0.03)', display: 'flex', flexDirection: 'column', gap: '20px', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fff0f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', fontWeight: 800, fontSize: '1.2rem' }}>
                        {pkg.client.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2d1b22' }}>{pkg.client}</div>
                        <div style={{ fontSize: '0.75rem', color: '#a0909a', fontWeight: 600 }}>{pkg.phone}</div>
                      </div>
                    </div>
                    <div style={{ padding: '6px 12px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: pkg.status === 'Al día' ? '#dcfce7' : pkg.status === 'Cuota Pendiente' ? '#fee2e2' : '#fef3c7', color: pkg.status === 'Al día' ? '#166534' : pkg.status === 'Cuota Pendiente' ? '#991b1b' : '#92400e' }}>
                      {pkg.status}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ background: '#fcf9f8', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2d1b22', borderBottom: '1px solid rgba(223, 178, 140, 0.15)', paddingBottom: '8px' }}>
                      {pkg.package}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#8c767b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <PlayCircle size={14} /> Sesiones Consumidas
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: '#c97282' }}>
                        {pkg.currentSession} <span style={{ fontSize: '0.8rem', color: '#a0909a', fontWeight: 600 }}>/ {pkg.totalSessions}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ width: '100%', height: '6px', background: 'rgba(223,178,140,0.2)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${(pkg.currentSession / pkg.totalSessions) * 100}%`, height: '100%', background: '#c97282', borderRadius: '999px' }} />
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#a0909a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deuda Pendiente</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: pkg.pending > 0 ? '#dc2626' : '#16a34a' }}>${pkg.pending}</div>
                    </div>
                    
                    <button style={{ padding: '8px 16px', borderRadius: '12px', background: '#fff2f4', color: '#c97282', border: '1px solid rgba(201,114,130,0.15)', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                      Agendar Sesión
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '16px', color: '#a0909a' }}>
            <CalendarIcon size={48} strokeWidth={1} color="#dfb28c" />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2d1b22', margin: '0 0 8px 0' }}>Calendario de Máquina Láser</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '400px', lineHeight: 1.5 }}>Aquí diseñaremos la vista para gestionar exclusivamente las citas de la máquina láser Diodo, asegurando que no se solapen.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LaserModule;
