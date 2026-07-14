import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Users, UserCircle, Sparkles, Package, Wallet,
  Star, Calendar, LogOut, PanelLeftClose, PanelLeftOpen,
  Receipt, Percent, Settings, Sliders, FileText, X, Activity
} from 'lucide-react';
import LaserGunIcon from './LaserGunIcon';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { canAccessModule } from '../utils/roles';

const Sidebar = ({ activeTab, setActiveTab, isMobile, rates, isCollapsed, setIsCollapsed, activeRateType, onToggleRateType, isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { isModalOpen } = useModal();

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['Admin', 'Recepcionista', 'Caja', 'Manicurista', 'Lashista'] },
    { id: 'scheduling', label: 'Agenda', icon: Calendar, roles: ['Admin', 'Recepcionista', 'Manicurista', 'Lashista'] },
    { id: 'reception', label: 'Recepción', icon: UserCircle, roles: ['Admin', 'Recepcionista'] },
    { id: 'laser', label: 'Centro Láser', icon: LaserGunIcon, roles: ['Admin', 'Recepcionista'] },
    { id: 'clients', label: 'Clientes', icon: Users, roles: ['Admin', 'Recepcionista', 'Manicurista', 'Lashista'] },
    { id: 'diagnosis', label: 'Diagnóstico Capilar', icon: Activity, roles: ['Admin', 'Recepcionista', 'Manicurista', 'Lashista'] },
    { id: 'services', label: 'Servicios', icon: Star, roles: ['Admin'] },
    { id: 'personnel', label: 'Equipo', icon: Sparkles, roles: ['Admin'] },
    { id: 'inventory', label: 'Inventario', icon: Package, roles: ['Admin', 'Caja'] },
    { id: 'finance', label: 'Finanzas', icon: Wallet, roles: ['Admin', 'Caja'] },
    { id: 'reports', label: 'Reportes', icon: FileText, roles: ['Admin'] },
    { id: 'promotions', label: 'Promociones', icon: Percent, roles: ['Admin'] },
    { id: 'settings', label: 'Configuración', icon: Sliders, roles: ['Admin'] },
  ];

  const menuItems = allMenuItems
    .filter(item => canAccessModule(user?.role, item.id || item.id))
    .filter((item, index, self) => self.findIndex(i => i.label === item.label) === index);

  const sidebarRef = useRef(null);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  const showTooltip = (e, label) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 10 });
  };
  const hideTooltip = () => setTooltip(null);

  const effectiveCollapsed = isMobile ? false : isCollapsed;

  const sidebarStyle = {
    width: effectiveCollapsed ? '70px' : '230px',
    minWidth: effectiveCollapsed ? '70px' : '230px',
    flexShrink: 0,
    height: 'calc(100vh - 20px)',
    position: 'sticky',
    top: '10px',
    margin: '10px 0 10px 10px',
    background: 'rgba(255, 255, 255, 0.70)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(201, 114, 130, 0.15)',
    borderRadius: '24px',
    boxShadow: '0 8px 32px rgba(160, 80, 106, 0.06)',
    display: 'flex', 
    flexDirection: 'column',
    padding: effectiveCollapsed ? '8px 8px' : '8px 8px',
    overflowY: 'hidden', 
    overflowX: 'hidden',
    transition: 'all 0.3s ease',
    zIndex: 10,
  };

  const handleItemClick = (id) => {
    setActiveTab(id);
    if (isMobile && onClose) onClose();
  };

  const handleLogout = () => {
    if (isMobile && onClose) onClose();
    logout();
  };

  return (
    <div className="sidebar" ref={sidebarRef} style={sidebarStyle}>
      {/* Mobile close button + Logo header */}
      <div className="mi-enter-up mi-delay-1" style={{
        gap: effectiveCollapsed ? '16px' : '16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        position: 'relative',
        marginBottom: effectiveCollapsed ? '8px' : '0',
        paddingBottom: '10px',
        borderBottom: '1px solid rgba(201, 114, 130, 0.12)',
      }}>
        {isMobile && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute', right: '0', top: '0',
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        )}

        {!isMobile && (
          <button
            onClick={() => {
              setIsCollapsed(!isCollapsed);
              hideTooltip();
            }}
            aria-label={effectiveCollapsed ? 'Expandir menú' : 'Contraer menú'}
            style={{
              position: effectiveCollapsed ? 'relative' : 'absolute',
              right: effectiveCollapsed ? 'auto' : '0', top: '0',
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              marginBottom: effectiveCollapsed ? '8px' : '0',
              padding: '4px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201, 114, 130, 0.08)'; showTooltip(e, effectiveCollapsed ? 'Expandir menú' : 'Contraer menú'); }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; hideTooltip(); }}
          >
            {effectiveCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        )}

        {!effectiveCollapsed && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            marginTop: '4px', padding: '4px 0'
          }}>
            <img
              src="/logo.webp"
              alt="JanaStudio"
            style={{
              height: '38px', marginBottom: '2px',
              filter: 'brightness(1.0) drop-shadow(0 2px 8px rgba(212, 160, 154, 0.15))'
            }}
          />
          </div>
        )}
        {effectiveCollapsed && (
          <img
            src="/logo.webp"
            alt="JS"
            style={{
              height: '32px', marginTop: '4px',
              filter: 'brightness(1.0) drop-shadow(0 2px 6px rgba(212, 160, 154, 0.15))'
            }}
          />
        )}
      </div>

      <nav
        className="mi-enter-up mi-delay-2"
        onMouseLeave={() => setHoveredTab(null)}
        style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative', flex: 1, minHeight: 0, overflowY: 'hidden', overflowX: 'hidden', marginTop: '10px' }}
      >
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div key={item.id} style={{ position: 'relative', width: '100%' }}>
              <motion.div
                className="relative"
                initial={false}
                whileHover="hover"
              >
                {/* Floating Active Indicator (The "Liquid" Drop) */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="active-pill-jana"
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(to right, #a0506a, #c97282)',
                        borderRadius: '1.8rem',
                        boxShadow: '0 8px 24px rgba(160, 80, 106, 0.25)',
                        zIndex: 0,
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </AnimatePresence>

                <button
                  onClick={() => handleItemClick(item.id)}
                  onMouseEnter={(e) => { setHoveredTab(item.id); if (effectiveCollapsed) showTooltip(e, item.label); }}
                  onMouseLeave={hideTooltip}
                  aria-label={effectiveCollapsed ? item.label : undefined}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: effectiveCollapsed ? '0' : '14px',
                    padding: effectiveCollapsed ? '10px' : '10px 18px',
                    borderRadius: '1.8rem',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: isActive ? '#ffffff' : '#8a6870',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    letterSpacing: '0.025em',
                    transition: 'all 0.3s ease',
                    textAlign: 'left',
                    justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                    position: 'relative',
                    zIndex: 10,
                  }}
                >
                  <motion.div
                    variants={{
                      hover: { rotate: index % 2 === 0 ? 10 : -10, scale: 1.2 }
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon size={18} style={{ color: isActive ? '#ffffff' : 'rgba(138, 104, 112, 0.6)' }} strokeWidth={2.0} />
                  </motion.div>

                  {!effectiveCollapsed && (
                    <span className="text-[14px] tracking-wide relative overflow-hidden" style={{ fontFamily: "'Manrope', sans-serif" }}>
                      {item.label}
                    </span>
                  )}

                  {/* Sparkle effect on active */}
                  {isActive && !effectiveCollapsed && (
                    <motion.div
                      className="absolute right-4"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      style={{ display: 'flex', alignItems: 'center' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="white" className="animate-pulse">
                        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
                      </svg>
                    </motion.div>
                  )}
                </button>
              </motion.div>
            </div>
          );
        })}
      </nav>
 
      <div className="mi-enter-up mi-delay-3 no-scrollbar" style={{ flexShrink: 0, paddingTop: '16px', marginTop: '12px', borderTop: '1px dashed rgba(201, 114, 130, 0.15)', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
        {!effectiveCollapsed ? (
          <button
            className="mi-btn"
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '12px 18px',
              borderRadius: '20px',
              border: '1px solid rgba(160, 80, 106, 0.12)',
              background: '#ffffff',
              boxShadow: '0 4px 12px rgba(160, 80, 106, 0.04)',
              color: '#a0506a', cursor: 'pointer',
              fontSize: '0.72rem', width: '100%',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              textAlign: 'center',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(160, 80, 106, 0.04)'; e.currentTarget.style.borderColor = 'rgba(160, 80, 106, 0.2)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(160, 80, 106, 0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = 'rgba(160, 80, 106, 0.12)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(160, 80, 106, 0.04)'; }}
          >
            <LogOut size={14} style={{ color: '#a0506a' }} />
            <span>Cerrar Sesión</span>
          </button>
        ) : (
          <button
            className="mi-btn"
            onClick={handleLogout}
            aria-label="Cerrar Sesión"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '10px',
              borderRadius: '12px',
              border: '1px solid rgba(201, 114, 130, 0.15)',
              background: 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(8px)',
              color: '#a0506a', cursor: 'pointer',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201, 114, 130, 0.12)'; e.currentTarget.style.borderColor = 'rgba(201, 114, 130, 0.3)'; showTooltip(e, 'Cerrar Sesión'); }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(201, 114, 130, 0.15)'; hideTooltip(); }}
          >
            <LogOut size={18} />
          </button>
        )}
      </div>

      {tooltip && createPortal(
        <div
          style={{
            position: 'fixed',
            top: tooltip.top,
            left: tooltip.left,
            transform: 'translateY(-50%)',
            background: 'linear-gradient(135deg, #c9788c 0%, #a0506a 100%)',
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.2px',
            padding: '6px 11px',
            borderRadius: '8px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 99999,
            boxShadow: '0 6px 18px rgba(160, 80, 106, 0.35)',
          }}
          className="sidebar-tooltip-portal"
        >
          {tooltip.label}
        </div>,
        document.body
      )}
    </div>
  );
};

export default Sidebar;
