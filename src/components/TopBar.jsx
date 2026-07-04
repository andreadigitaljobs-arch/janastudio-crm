import React, { useState, useEffect } from 'react';
import {
  User,
  Plus,
  RefreshCw,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';

const TopBar = ({
  activeTab,
  rates,
  onOpenSale,
  isStoreOpen = true,
  activeRateType,
  onToggleRateType,
  onOpenNotifications
}) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeStaff, setActiveStaff] = useState(null);

  useEffect(() => {
    const updateUnread = () => {
      const history = notificationService.getHistory();
      const count = history.filter(n => !n.read).length;
      setUnreadCount(count);
    };

    const handleStaffChange = (e) => {
      setActiveStaff(e.detail);
    };

    updateUnread();
    window.addEventListener('jana_new_notification', updateUnread);
    window.addEventListener('jana_active_staff_changed', handleStaffChange);
    return () => {
      window.removeEventListener('jana_new_notification', updateUnread);
      window.removeEventListener('jana_active_staff_changed', handleStaffChange);
    };
  }, []);

  const getGreeting = () => {
    const options = { timeZone: 'America/Caracas', hour: 'numeric', hour12: false };
    const hour = parseInt(new Date().toLocaleString('en-US', options), 10);
    if (hour >= 5 && hour < 12) return '¡Buenos días,';
    if (hour >= 12 && hour < 19) return '¡Buenas tardes,';
    return '¡Buenas noches,';
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {activeTab !== 'my-profile' && (
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'var(--pink-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--pink-glow)'
            }}>
              {user?.image_url ? (
                <img src={user.image_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <User color="white" size={22} />
              )}
            </div>
            <div style={{
              position: 'absolute',
              bottom: '-1px',
              right: '-1px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: isStoreOpen ? '#4caf50' : '#ff4d4d',
              border: '2px solid var(--bg-primary)'
            }} />
          </div>
        )}
        <div>
          {activeTab === 'my-profile' ? (
            <h1 style={{ fontSize: '22px', fontWeight: '950', letterSpacing: '-0.5px' }}>
              Mi <span className="text-gold">Perfil</span>
            </h1>
          ) : (
            <h1 style={{ fontSize: '22px', fontWeight: '950', letterSpacing: '-0.5px' }}>
              {getGreeting()} <span className="text-gold">
                {user?.name?.split(' ')[0] || 'Belleza'}!
              </span>
            </h1>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: isStoreOpen ? '#4caf50' : '#ff4d4d', textTransform: 'uppercase', letterSpacing: '1px' }}>
              ● SALÓN ABIERTO
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>|</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
              {activeTab === 'my-profile' ? 'INFORMACIÓN PERSONAL' : 'PANEL DE CONTROL'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Rate Toggle Card */}
        <div className="glass-card" style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '14px', border: '1px solid rgba(196,139,159,0.1)' }}>
          <button
            onClick={() => onToggleRateType('bcv')}
            style={{
              padding: '6px 14px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.3s ease',
              background: activeRateType === 'bcv'
                ? 'linear-gradient(135deg, rgba(196,139,159,0.2), rgba(196,139,159,0.05))'
                : 'transparent',
              border: activeRateType === 'bcv'
                ? '1.5px solid var(--pink-primary)'
                : '1.5px solid transparent',
              boxShadow: activeRateType === 'bcv' ? '0 0 15px rgba(196,139,159,0.15)' : 'none'
            }}
          >
            <span style={{
              fontSize: '9px',
              fontWeight: '900',
              color: activeRateType === 'bcv' ? 'var(--pink-primary)' : 'var(--text-muted)',
              letterSpacing: '0.5px'
            }}>
              BCV
            </span>
            <span style={{
              fontSize: '13px',
              fontWeight: '950',
              color: activeRateType === 'bcv' ? 'var(--pink-primary)' : 'white'
            }}>
              {rates.bcv > 0 ? rates.bcv.toFixed(2) : '—'}
            </span>
          </button>

          <button
            onClick={() => onToggleRateType('usdt')}
            style={{
              padding: '6px 14px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.3s ease',
              background: activeRateType === 'usdt'
                ? 'linear-gradient(135deg, rgba(38,166,91,0.2), rgba(38,166,91,0.05))'
                : 'transparent',
              border: activeRateType === 'usdt'
                ? '1.5px solid #26a65b'
                : '1.5px solid transparent',
              boxShadow: activeRateType === 'usdt' ? '0 0 15px rgba(38,166,91,0.15)' : 'none'
            }}
          >
            <span style={{
              fontSize: '9px',
              fontWeight: '900',
              color: activeRateType === 'usdt' ? '#26a65b' : 'var(--text-muted)',
              letterSpacing: '0.5px'
            }}>
              USDT
            </span>
            <span style={{
              fontSize: '13px',
              fontWeight: '950',
              color: activeRateType === 'usdt' ? '#26a65b' : 'white'
            }}>
              {rates.usdt > 0 ? rates.usdt.toFixed(2) : '—'}
            </span>
          </button>

          <div style={{
            padding: '4px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1px'
          }}>
            <span style={{ fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)' }}>GAP</span>
            <span style={{
              fontSize: '11px',
              fontWeight: '900',
              color: rates.gap > 10 ? '#ff4d4d' : '#4caf50',
              backgroundColor: rates.gap > 10 ? 'rgba(255,77,77,0.1)' : 'rgba(76,175,80,0.1)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              {rates.gap > 0 ? rates.gap.toFixed(1) : '0'}%
            </span>
          </div>
        </div>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            color: unreadCount > 0 ? 'var(--pink-primary)' : 'white',
            transition: 'all 0.2s',
            boxShadow: unreadCount > 0 ? '0 0 15px rgba(196,139,159,0.1)' : 'none'
          }}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              backgroundColor: '#ff4d4d',
              color: 'white',
              fontSize: '9px',
              fontWeight: '900',
              borderRadius: '50%',
              minWidth: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 2px',
              border: '2px solid var(--bg-primary)',
              animation: 'pulse 2s infinite'
            }}>
              {unreadCount}
            </div>
          )}
        </button>

        <button
          onClick={onOpenSale}
          style={{
            height: '52px',
            padding: '0 24px',
            borderRadius: '16px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            border: 'none',
            background: 'linear-gradient(135deg, #d4a09a 0%, #c48b9f 50%, #a0506a 100%)',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(196, 139, 159, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          <Plus size={20} /> Nueva Cita
        </button>
      </div>
    </div>
  );
};

export default TopBar;
