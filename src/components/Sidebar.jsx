import { useRef, useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  UserCircle,
  Sparkles,
  Package,
  Wallet,
  Star,
  Calendar,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Flower2,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { canAccessModule } from '../utils/roles';

const Sidebar = ({ activeTab, setActiveTab, isMobile, rates, isCollapsed, setIsCollapsed, activeRateType, onToggleRateType }) => {
  const { user, logout } = useAuth();
  const { isModalOpen } = useModal();

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['Admin', 'Recepcionista', 'Caja', 'Manicurista', 'Lashista'] },
    { id: 'scheduling', label: 'Agenda', icon: Calendar, roles: ['Admin', 'Recepcionista', 'Manicurista', 'Lashista'] },
    { id: 'reception', label: 'Recepción', icon: UserCircle, roles: ['Admin', 'Recepcionista'] },
    { id: 'clients', label: 'Clientes', icon: Users, roles: ['Admin', 'Recepcionista', 'Manicurista', 'Lashista'] },
    { id: 'services', label: 'Servicios', icon: Star, roles: ['Admin'] },
    { id: 'costing', label: 'Costeo', icon: Receipt, roles: ['Admin'] },
    { id: 'personnel', label: 'Equipo', icon: Sparkles, roles: ['Admin'] },
    { id: 'inventory', label: 'Inventario', icon: Package, roles: ['Admin', 'Caja'] },
    { id: 'finance', label: 'Finanzas', icon: Wallet, roles: ['Admin', 'Caja'] },
  ];

  const menuItems = allMenuItems.filter(item => canAccessModule(user?.role, item.id));

  const sidebarRef = useRef(null);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [indicatorStyle, setIndicatorStyle] = useState({
    transform: 'translateY(0px)',
    height: '0px',
    opacity: 0
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

  const sidebarStyle = isMobile ? {
    width: '100%', height: 'auto', backgroundColor: 'transparent', display: 'flex', flexDirection: 'column', padding: '0'
  } : {
    width: isCollapsed ? '80px' : '260px', 
    height: '100vh', 
    background: 'linear-gradient(180deg, #2d1f2d 0%, #4a3040 50%, #6b4a5a 100%)',
    display: 'flex', flexDirection: 'column', 
    padding: isCollapsed ? '16px 10px' : '20px 16px', 
    position: 'fixed', left: 0, top: 0, 
    overflowY: 'auto',
    transition: 'all 0.3s ease', zIndex: 100,
    transform: isModalOpen ? 'translateX(-100%)' : 'translateX(0)',
    opacity: isModalOpen ? 0 : 1,
    pointerEvents: isModalOpen ? 'none' : 'auto',
  };

  return (
    <div className="sidebar" style={sidebarStyle}>
      {!isMobile && (
        <div className="logo-container" style={{ marginBottom: isCollapsed ? '16px' : '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', position: 'relative' }}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              position: isCollapsed ? 'static' : 'absolute',
              right: isCollapsed ? 'auto' : '0',
              top: '0',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              marginBottom: isCollapsed ? '16px' : '0'
            }}
          >
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>

          {!isCollapsed && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: '12px'
            }}>
              <img
                src="/logo.png"
                alt="JanaStudio"
                style={{ height: '48px', marginBottom: '4px', filter: 'brightness(1.2) drop-shadow(0 0 12px rgba(196, 139, 159, 0.3))' }}
              />
              <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginTop: '-2px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                Premium Beauty Salon
              </p>
            </div>
          )}
          {isCollapsed && (
            <img
              src="/logo.png"
              alt="JS"
              style={{ height: '36px', marginTop: '4px', filter: 'brightness(1.2) drop-shadow(0 0 8px rgba(196, 139, 159, 0.3))' }}
            />
          )}
        </div>
      )}

      <nav
        onMouseLeave={() => setHoveredTab(null)}
        style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}
      >
        <div
          className="menu-active-indicator"
          style={{
            position: 'absolute',
            left: 0,
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            transition: 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1), height 0.22s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease',
            pointerEvents: 'none',
            zIndex: 0,
            ...indicatorStyle
          }}
        />
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              ref={el => itemRefs.current[index] = el}
              onClick={() => setActiveTab(item.id)}
              onMouseEnter={() => setHoveredTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: isCollapsed ? '12px' : '12px 16px',
                borderRadius: '12px',
                border: 'none',
                background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.2s ease',
                width: '100%',
                textAlign: 'left',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                position: 'relative',
                zIndex: 1
              }}
            >
              <Icon size={20} style={{ color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.4)' }} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {!isCollapsed && rates && rates.usdt > 0 && (
          <div style={{
            padding: '12px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            marginBottom: '12px',
            fontSize: '0.8rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>BCV</span>
              <span style={{ color: 'rgba(255,255,255,0.9)' }}>Bs. {rates.bcv?.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>USDT</span>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Bs. {rates.usdt?.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* User Profile */}
        {!isCollapsed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            marginBottom: '12px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #c48b9f 0%, #a0506a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}>
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.85rem' }}>{user?.name || 'Admin'}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{user?.role || 'Admin'}</div>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: isCollapsed ? '12px' : '12px 16px',
            borderRadius: '12px',
            border: 'none',
            background: 'transparent',
            color: 'rgba(255, 255, 255, 0.5)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            width: '100%',
            textAlign: 'left',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ff6b6b'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
