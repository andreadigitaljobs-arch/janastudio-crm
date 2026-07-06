import { useRef, useState, useEffect } from 'react';
import {
  BarChart3, Users, UserCircle, Sparkles, Package, Wallet,
  Star, Calendar, LogOut, PanelLeftClose, PanelLeftOpen,
  Receipt, Percent, Settings, Sliders, FileText, X
} from 'lucide-react';
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
    width: effectiveCollapsed ? '70px' : '220px',
    minWidth: effectiveCollapsed ? '70px' : '220px',
    flexShrink: 0,
    height: '100vh',
    position: 'sticky',
    top: 0,
    background: '#fbf8f7',
    borderRight: '1px solid rgba(212, 160, 154, 0.2)',
    display: 'flex', flexDirection: 'column',
    padding: effectiveCollapsed ? '12px 8px' : '16px 12px',
    overflowY: 'auto', overflowX: 'hidden',
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
        marginBottom: effectiveCollapsed ? '16px' : '20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '4px', position: 'relative'
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
            style={{
              position: effectiveCollapsed ? 'static' : 'absolute',
              right: effectiveCollapsed ? 'auto' : '0', top: '0',
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              marginBottom: effectiveCollapsed ? '12px' : '0'
            }}
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
              src="/logo.png"
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
            src="/logo.png"
            alt="JS"
            style={{
              height: '36px', marginTop: '4px',
              filter: 'brightness(1.0) drop-shadow(0 2px 6px rgba(212, 160, 154, 0.15))'
            }}
          />
        )}
      </div>

      <nav
        onMouseLeave={() => setHoveredTab(null)}
        style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative' }}
      >
        <div
          style={{
            position: 'absolute', left: 0, width: '100%',
            backgroundColor: 'var(--pink-secondary)',
            borderRadius: '12px',
            transition: 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1), height 0.22s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease',
            pointerEvents: 'none', zIndex: 0,
            ...indicatorStyle
          }}
        />
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id + item.label}
              ref={el => itemRefs.current[index] = el}
              onClick={() => handleItemClick(item.id)}
              onMouseEnter={() => setHoveredTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: effectiveCollapsed ? '10px' : '10px 14px',
                borderRadius: '12px', border: 'none',
                background: isActive ? 'var(--pink-secondary)' : 'transparent',
                color: isActive ? 'var(--magenta-primary)' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '0.82rem',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.2s ease', width: '100%',
                textAlign: 'left',
                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                position: 'relative', zIndex: 1
              }}
            >
              <Icon size={17} style={{ color: isActive ? 'var(--magenta-primary)' : 'var(--text-muted)' }} />
              {!effectiveCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
        {!effectiveCollapsed && rates && rates.usdt > 0 && (
          <div style={{
            padding: '10px 12px', borderRadius: '12px',
            backgroundColor: 'var(--bg-tertiary)',
            marginBottom: '12px', fontSize: '0.78rem',
            border: '1px solid rgba(212, 160, 154, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>BCV</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Bs. {rates.bcv?.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>USDT</span>
              <span style={{ color: 'var(--magenta-primary)', fontWeight: 600 }}>Bs. {rates.usdt?.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', borderRadius: '14px',
          backgroundColor: 'var(--bg-tertiary)',
          marginBottom: '8px',
          border: '1px solid rgba(212, 160, 154, 0.1)',
          cursor: 'pointer'
        }}>
          {user?.image_url ? (
            <img src={user.image_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'var(--pink-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 600, fontSize: '0.8rem', flexShrink: 0
            }}>
              {user?.name?.charAt(0) || 'A'}
            </div>
          )}
          {!effectiveCollapsed && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{
                fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.75rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {user?.name || 'Carolina M.'}
              </div>
              <div style={{
                fontSize: '0.62rem', color: 'var(--text-muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontWeight: 500
              }}>
                {user?.role || 'Admin'}
              </div>
            </div>
          )}
          {!effectiveCollapsed && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>▼</span>
          )}
        </div>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: effectiveCollapsed ? '10px' : '10px 14px',
            borderRadius: '12px', border: 'none', background: 'transparent',
            color: 'var(--text-secondary)', cursor: 'pointer',
            fontSize: '0.82rem', width: '100%',
            textAlign: 'left',
            justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ff6b6b'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <LogOut size={18} style={{ color: 'var(--text-muted)' }} />
          {!effectiveCollapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
