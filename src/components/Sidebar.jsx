import { useRef, useState, useEffect } from 'react';
import {
  BarChart3, Users, UserCircle, Sparkles, Package, Wallet,
  Star, Calendar, LogOut, PanelLeftClose, PanelLeftOpen,
  Receipt, Percent, Settings, Sliders
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
    { id: 'personnel', label: 'Equipo', icon: Sparkles, roles: ['Admin'] },
    { id: 'inventory', label: 'Inventario', icon: Package, roles: ['Admin', 'Caja'] },
    { id: 'finance', label: 'Finanzas', icon: Wallet, roles: ['Admin', 'Caja'] },
    { id: 'finance', label: 'Promociones', icon: Percent, roles: ['Admin'], id: 'promotions' },
    { id: 'finance', label: 'Configuración', icon: Sliders, roles: ['Admin'], id: 'settings' },
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

  const sidebarStyle = isMobile ? {
    width: '100%', height: 'auto', backgroundColor: 'transparent',
    display: 'flex', flexDirection: 'column', padding: '0'
  } : {
    width: isCollapsed ? '70px' : '220px',
    height: '100vh',
    background: 'linear-gradient(180deg, #2d1f2d 0%, #3d2a3a 40%, #4a3040 70%, #5a3d50 100%)',
    display: 'flex', flexDirection: 'column',
    padding: isCollapsed ? '12px 8px' : '16px 12px',
    position: 'fixed', left: 0, top: 0,
    overflowY: 'auto', overflowX: 'hidden',
    transition: 'all 0.3s ease', zIndex: 100,
    transform: isModalOpen ? 'translateX(-100%)' : 'translateX(0)',
    opacity: isModalOpen ? 0 : 1,
    pointerEvents: isModalOpen ? 'none' : 'auto',
  };

  return (
    <div className="sidebar" style={sidebarStyle}>
      {!isMobile && (
        <div style={{
          marginBottom: isCollapsed ? '16px' : '20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '4px', position: 'relative'
        }}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              position: isCollapsed ? 'static' : 'absolute',
              right: isCollapsed ? 'auto' : '0', top: '0',
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
              marginBottom: isCollapsed ? '12px' : '0'
            }}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          {!isCollapsed && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              marginTop: '8px', padding: '8px 0'
            }}>
              <img
                src="/logo.png"
                alt="JanaStudio"
                style={{
                  height: '42px', marginBottom: '4px',
                  filter: 'brightness(1.1) drop-shadow(0 0 12px rgba(196, 139, 159, 0.2))'
                }}
              />
              <p style={{
                fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)',
                letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: '600'
              }}>
                PREMIUM BEAUTY SALON
              </p>
            </div>
          )}
          {isCollapsed && (
            <img
              src="/logo.png"
              alt="JS"
              style={{
                height: '36px', marginTop: '4px',
                filter: 'brightness(1.1) drop-shadow(0 0 8px rgba(196, 139, 159, 0.25))'
              }}
            />
          )}
        </div>
      )}

      <nav
        onMouseLeave={() => setHoveredTab(null)}
        style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative' }}
      >
        <div
          style={{
            position: 'absolute', left: 0, width: '100%',
            backgroundColor: 'rgba(196, 139, 159, 0.2)',
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
              onClick={() => setActiveTab(item.id)}
              onMouseEnter={() => setHoveredTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: isCollapsed ? '9px' : '9px 12px',
                borderRadius: '10px', border: 'none',
                background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer', fontSize: '0.8rem',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.2s ease', width: '100%',
                textAlign: 'left',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                position: 'relative', zIndex: 1
              }}
            >
              <Icon size={17} style={{ color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.35)' }} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
        {/* Salon Brand Card */}
        {!isCollapsed && (
          <div style={{
            padding: '12px', borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.06)',
            marginBottom: '12px', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              width: '100%', height: '60px', borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(196, 139, 159, 0.12) 0%, rgba(160, 80, 106, 0.08) 100%)',
              marginBottom: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Sparkles size={22} color="rgba(196, 139, 159, 0.35)" />
            </div>
            <div style={{
              fontFamily: 'Georgia, serif', fontSize: '0.88rem',
              color: '#ffffff', fontWeight: '500', marginBottom: '2px'
            }}>Jana Studio</div>
            <div style={{
              fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)',
              lineHeight: '1.3'
            }}>Belleza que inspira confianza.</div>
          </div>
        )}

        {/* Exchange Rates */}
        {!isCollapsed && rates && rates.usdt > 0 && (
          <div style={{
            padding: '10px 12px', borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            marginBottom: '12px', fontSize: '0.78rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>BCV</span>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>Bs. {rates.bcv?.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>USDT</span>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Bs. {rates.usdt?.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* User Profile */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 10px', borderRadius: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          marginBottom: '6px'
        }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #c48b9f 0%, #a0506a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 600, fontSize: '0.72rem', flexShrink: 0
          }}>
            {user?.name?.charAt(0) || 'A'}
          </div>
          {!isCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 600, color: '#ffffff', fontSize: '0.72rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {user?.name || 'Administrador'}
              </div>
              <div style={{
                fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {user?.email || 'admin@janastudio.com'}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={logout}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: isCollapsed ? '10px' : '10px 14px',
            borderRadius: '12px', border: 'none', background: 'transparent',
            color: 'rgba(255, 255, 255, 0.4)', cursor: 'pointer',
            fontSize: '0.85rem', width: '100%',
            textAlign: 'left',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ff6b6b'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
