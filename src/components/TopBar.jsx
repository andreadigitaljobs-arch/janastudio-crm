import React, { useState, useEffect } from 'react';
import {
  User, Plus, Bell, MapPin, Calendar, Clock, Sparkles, Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';

const TopBar = ({
  activeTab, rates, onOpenSale, isStoreOpen = true,
  activeRateType, onToggleRateType, onOpenNotifications, isMobile
}) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const updateUnread = () => {
      const history = notificationService.getHistory();
      setUnreadCount(history.filter(n => !n.read).length);
    };
    updateUnread();
    window.addEventListener('jana_new_notification', updateUnread);
    return () => window.removeEventListener('jana_new_notification', updateUnread);
  }, []);

  const getGreeting = () => {
    const options = { timeZone: 'America/Caracas', hour: 'numeric', hour12: false };
    const hour = parseInt(new Date().toLocaleString('en-US', options), 10);
    if (hour >= 5 && hour < 12) return '¡Buenos días';
    if (hour >= 12 && hour < 19) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  const today = new Date().toLocaleDateString('es-VE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const currentTime = new Date().toLocaleTimeString('es-VE', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Caracas'
  });

  const formatDay = (d) => d.charAt(0).toUpperCase() + d.slice(1);

  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '16px',
        paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
        width: '100%'
      }}>
        {/* Top Line: Logo (centered) and Bell (right) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          width: '100%',
          height: '44px'
        }}>
          {/* Empty spacer on left to balance the Bell on right */}
          <div style={{ width: '40px' }} />

          {/* Centered Brand Logo matching Sidebar */}
          <img
            src="/logo.webp"
            alt="Jana Studio"
            style={{
              height: '36px',
              objectFit: 'contain',
              filter: 'brightness(1.0) drop-shadow(0 2px 6px rgba(212, 160, 154, 0.15))'
            }}
          />

          {/* Bell Icon on Right */}
          <button
            onClick={onOpenNotifications}
            style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: '#ffffff', border: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative',
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-card)', transition: 'all 0.2s'
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute', top: '10px', right: '10px',
                backgroundColor: 'var(--magenta-secondary)', width: '7px', height: '7px',
                borderRadius: '50%',
              }} />
            )}
          </button>
        </div>

        {/* Second Line: Search Bar (Dashboard) or Greeting (Other Tabs) */}
        {activeTab === 'dashboard' ? (
          <div style={{ position: 'relative', width: '100%', padding: '0 4px' }}>
            <input 
              type="text" 
              placeholder="Search clients, appointments, services..." 
              style={{
                width: '100%',
                padding: '10px 40px 10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: '#ffffff',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                fontWeight: '500',
                outline: 'none',
                boxShadow: 'var(--shadow-card)'
              }}
            />
            <Search 
              size={15} 
              style={{ 
                position: 'absolute', 
                right: '16px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none'
              }} 
            />
          </div>
        ) : (
          activeTab !== 'dashboard' && (
            <div style={{ padding: '0 4px' }}>
              <h1 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                fontFamily: "'Playfair Display', Georgia, serif",
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {getGreeting().replace('¡', '').replace('!', '')}, {(!user || user.role?.toLowerCase().includes('admin') || user.name?.toLowerCase().includes('administrador')) ? 'Jana' : (user.name?.split(' ')[0] || 'Jana')}
                <Sparkles 
                  size={16} 
                  style={{ 
                    color: 'var(--magenta-secondary)', 
                    animation: 'pulse 2s infinite ease-in-out'
                  }} 
                />
              </h1>
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                margin: '2px 0 0 0',
                fontWeight: '500'
              }}>Aquí tienes un resumen de hoy en Jana Studio.</p>
            </div>
          )
        )}

        {/* Third Line: BCV/USDT and Date styled horizontally scrolling & super neat */}
        <div className="no-scrollbar" style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          padding: '2px 4px',
          width: '100%',
          WebkitOverflowScrolling: 'touch'
        }}>
          {rates && rates.usdt > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '6px 12px', borderRadius: '10px',
              background: '#ffffff', border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)', fontSize: '0.72rem',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.58rem', fontWeight: 500 }}>BCV</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Bs. {rates.bcv?.toFixed(2)}</span>
              </div>
              <div style={{ width: '1px', height: '22px', background: 'var(--border-color)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.58rem', fontWeight: 500 }}>USDT</span>
                <span style={{ color: 'var(--magenta-primary)', fontWeight: 700 }}>Bs. {rates.usdt?.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div style={{
            padding: '6px 12px', borderRadius: '10px', background: '#ffffff',
            border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)',
            display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
            fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)',
            flexShrink: 0
          }}>
            <span>{new Date().toLocaleDateString('es-VE', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '16px', flexWrap: 'wrap', gap: '12px',
      paddingLeft: '0',
      paddingTop: '0'
    }}>
      {/* Left: Greeting (or Search Bar in Dashboard) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {activeTab === 'dashboard' ? (
          <div style={{ position: 'relative', width: '350px' }}>
            <input 
              type="text" 
              placeholder="Search clients, appointments, services..." 
              style={{
                width: '100%',
                padding: '10px 40px 10px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                background: '#ffffff',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontWeight: '500',
                outline: 'none',
                boxShadow: 'var(--shadow-card)',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--pink-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
            <Search 
              size={16} 
              style={{ 
                position: 'absolute', 
                right: '14px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none'
              }} 
            />
          </div>
        ) : (
          <div>
            <h1 style={{
              fontSize: '26px', 
              fontWeight: '700', 
              color: 'var(--text-primary)',
              fontFamily: "'Playfair Display', Georgia, serif",
              margin: 0,
              display: 'flex',
              alignItems: 'center'
            }}>
              {getGreeting().replace('¡', '').replace('!', '')}, {(!user || user.role?.toLowerCase().includes('admin') || user.name?.toLowerCase().includes('administrador')) ? 'Jana' : (user.name?.split(' ')[0] || 'Jana')}
              <Sparkles 
                size={22} 
                style={{ 
                  color: 'var(--magenta-secondary)', 
                  marginLeft: '8px', 
                  animation: 'pulse 2s infinite ease-in-out'
                }} 
              />
            </h1>
            <p style={{
              fontSize: '0.8rem', 
              color: 'var(--text-secondary)', 
              margin: '4px 0 0 0',
              fontWeight: '500'
            }}>Aquí tienes un resumen de hoy en Jana Studio.</p>
          </div>
        )}
      </div>

      {/* Right: Notification Bell & Date Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Rates pill: BCV / USDT */}
        {rates && rates.usdt > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 14px', borderRadius: '12px',
            background: '#ffffff', border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-card)', fontSize: '0.78rem',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.3 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 500 }}>BCV</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Bs. {rates.bcv?.toFixed(2)}</span>
            </div>
            <div style={{ width: '1px', height: '28px', background: 'var(--border-color)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.3 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 500 }}>USDT</span>
              <span style={{ color: 'var(--magenta-primary)', fontWeight: 700 }}>Bs. {rates.usdt?.toFixed(2)}</span>
            </div>
          </div>
        )}

        <button
          onClick={onOpenNotifications}
          style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: '#ffffff', border: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-card)', transition: 'all 0.2s'
          }}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute', top: '10px', right: '10px',
              backgroundColor: 'var(--magenta-secondary)', width: '7px', height: '7px',
              borderRadius: '50%',
            }} />
          )}
        </button>

        {/* Date Dropdown styled exactly like the mockup */}
        <div style={{
          padding: '8px 16px', borderRadius: '12px', background: '#ffffff',
          border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)',
          display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer',
          fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)'
        }}>
          <span>{new Date().toLocaleDateString('es-VE', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>

      </div>
    </div>
  );
};

export default TopBar;
