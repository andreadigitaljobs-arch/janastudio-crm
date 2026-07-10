import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart3, Users, UserCircle, Sparkles, Package, Wallet,
  Star, Calendar, LogOut, PanelLeftClose, PanelLeftOpen,
  Receipt, Percent, Settings, Sliders, FileText, X, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { canAccessModule } from '../utils/roles';

const MENU_COLORS = [
  { bg: 'rgba(201, 114, 130, 0.12)', icon: '#c97282' },
  { bg: 'rgba(160, 80, 106, 0.12)', icon: '#a0506a' },
  { bg: 'rgba(186, 130, 160, 0.12)', icon: '#ba82a0' },
  { bg: 'rgba(201, 148, 130, 0.12)', icon: '#c99482' },
  { bg: 'rgba(160, 130, 80, 0.12)', icon: '#a08250' },
  { bg: 'rgba(130, 160, 120, 0.12)', icon: '#82a078' },
  { bg: 'rgba(120, 140, 180, 0.12)', icon: '#788cb4' },
  { bg: 'rgba(160, 120, 180, 0.12)', icon: '#a078b4' },
  { bg: 'rgba(180, 120, 140, 0.12)', icon: '#b4788c' },
  { bg: 'rgba(201, 114, 130, 0.12)', icon: '#c97282' },
  { bg: 'rgba(150, 150, 160, 0.12)', icon: '#9696a0' },
];

const Sidebar = ({ activeTab, setActiveTab, isMobile, rates, isCollapsed, setIsCollapsed, activeRateType, onToggleRateType, isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { isModalOpen } = useModal();

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['Admin', 'Recepcionista', 'Caja', 'Manicurista', 'Lashista'] },
    { id: 'scheduling', label: 'Agenda', icon: Calendar, roles: ['Admin', 'Recepcionista', 'Manicurista', 'Lashista'] },
    { id: 'reception', label: 'Recepción', icon: UserCircle, roles: ['Admin', 'Recepcionista'] },
    { id: 'laser', label: 'Centro Láser', icon: Zap, roles: ['Admin', 'Recepcionista'] },
    { id: 'clients', label: 'Clientes', icon: Users, roles: ['Admin', 'Recepcionista', 'Manicurista', 'Lashista'] },
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
  const [indicatorStyle, setIndicatorStyle] = useState({
    transform: 'translateY(0px)', height: '0px', opacity: 0
  });
  const itemRefs = useRef([]);
  const [tooltip, setTooltip] = useState(null);

  const showTooltip = (e, label) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 10 });
  };
  const hideTooltip = () => setTooltip(null);

  const updateIndicator = (element) => {
    if (!element) return;
    setIndicatorStyle({
      transform: `translateY(${element.offsetTop}px)`,
      height: `${element.offsetHeight}px`,
      opacity: 1
    });
  };

  const displayedTab = hoveredTab || activeTab;

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeIndex = menuItems.findIndex(item => item.id === displayedTab);
      if (activeIndex !== -1 && itemRefs.current[activeIndex]) {
        updateIndicator(itemRefs.current[activeIndex]);
      }
    }, 20);
    return () => clearTimeout(timer);
  }, [displayedTab, menuItems, isCollapsed]);

  const effectiveCollapsed = isMobile ? false : isCollapsed;

  const sidebarStyle = {
    width: effectiveCollapsed ? '70px' : '230px',
    minWidth: effectiveCollapsed ? '70px' : '230px',
    flexShrink: 0,
    height: '100vh',
    position: 'sticky',
    top: 0,
    background: 'linear-gradient(180deg, #fefaf9 0%, #fdf6f5 40%, #fcf2f1 100%)',
    borderRight: '1px solid rgba(201, 114, 130, 0.1)',
    display: 'flex', flexDirection: 'column',
    padding: effectiveCollapsed ? '16px 8px' : '12px 8px',
    overflowY: 'hidden', overflowX: 'hidden',
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
      <div style={{
        gap: effectiveCollapsed ? '24px' : '28px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        position: 'relative',
        marginBottom: effectiveCollapsed ? '16px' : '0'
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
            onClick={() => setIsCollapsed(!isCollapsed)}
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
            marginTop: '8px', padding: '8px 0'
          }}>
            <img
              src="/logo.webp"
              alt="JanaStudio"
            style={{
              height: '42px', marginBottom: '4px',
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
        onMouseLeave={() => setHoveredTab(null)}
        style={{ display: 'flex', flexDirection: 'column', gap: '3px', position: 'relative', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
      >
        <div
          style={{
            position: 'absolute', left: 0, width: '100%',
            background: 'linear-gradient(135deg, rgba(201, 114, 130, 0.15) 0%, rgba(160, 80, 106, 0.1) 100%)',
            borderRadius: '14px',
            border: '1px solid rgba(201, 114, 130, 0.15)',
            boxShadow: '0 2px 8px rgba(201, 114, 130, 0.08)',
            transition: 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1), height 0.22s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease',
            pointerEvents: 'none', zIndex: 0,
            ...indicatorStyle
          }}
        />
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const colors = MENU_COLORS[index % MENU_COLORS.length];
          return (
            <button
              key={item.id + item.label}
              ref={el => itemRefs.current[index] = el}
              onClick={() => handleItemClick(item.id)}
              onMouseEnter={(e) => { setHoveredTab(item.id); if (effectiveCollapsed) showTooltip(e, item.label); }}
              onMouseLeave={hideTooltip}
              aria-label={effectiveCollapsed ? item.label : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: effectiveCollapsed ? '0' : '12px',
                padding: effectiveCollapsed ? '11px' : '10px 14px',
                borderRadius: '14px', border: isActive ? '1px solid rgba(201, 114, 130, 0.12)' : '1px solid transparent',
                background: 'transparent',
                color: isActive ? '#a0506a' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 500,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', width: '100%',
                textAlign: 'left',
                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                position: 'relative', zIndex: 1,
                transform: 'scale(1)'
              }}
              onMouseOver={(e) => {
                if (!isActive) {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.transformOrigin = 'left center';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '10px',
                background: isActive ? colors.bg : 'rgba(212, 160, 154, 0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                flexShrink: 0,
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                boxShadow: isActive ? `0 2px 8px ${colors.bg}` : 'none'
              }}>
                <Icon size={16} style={{ color: isActive ? colors.icon : 'var(--text-muted)' }} />
              </div>
              {!effectiveCollapsed && (
                <span style={{
                  transition: 'color 0.2s ease',
                  letterSpacing: '0.2px'
                }}>{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ flexShrink: 0, paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative' }}>
        {!effectiveCollapsed ? (
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 14px',
              borderRadius: '16px',
              border: '1px solid rgba(201, 114, 130, 0.15)',
              background: 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(8px)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: '0.82rem', width: '100%',
              textAlign: 'left',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201, 114, 130, 0.06)'; e.currentTarget.style.borderColor = 'rgba(201, 114, 130, 0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(201, 114, 130, 0.15)'; }}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'rgba(201, 114, 130, 0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <LogOut size={16} style={{ color: '#a0506a' }} />
            </div>
            <span>Cerrar Sesión</span>
          </button>
        ) : (
          <button
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
