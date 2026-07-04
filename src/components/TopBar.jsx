import React, { useState, useEffect } from 'react';
import {
  User,
  Plus,
  RefreshCw,
  Bell,
  MapPin,
  Calendar
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

  const today = new Date().toLocaleDateString('es-VE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      {/* Left Side - Greeting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {activeTab !== 'my-profile' && (
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #c48b9f 0%, #a0506a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(196, 139, 159, 0.25)'
            }}>
              {user?.image_url ? (
                <img src={user.image_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '16px', objectFit: 'cover' }} />
              ) : (
                <User color="white" size={24} />
              )}
            </div>
            <div style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: isStoreOpen ? '#22c55e' : '#ef4444',
              border: '3px solid #ffffff'
            }} />
          </div>
        )}
        <div>
          {activeTab === 'my-profile' ? (
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#2d2d2d', letterSpacing: '-0.5px' }}>
              Mi <span className="text-gradient">Perfil</span>
            </h1>
          ) : (
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#2d2d2d', letterSpacing: '-0.5px' }}>
              {getGreeting()} <span className="text-gradient">
                {user?.name?.split(' ')[0] || 'Belleza'}!
              </span>
            </h1>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: isStoreOpen ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isStoreOpen ? '#22c55e' : '#ef4444'
              }} />
              <span style={{ 
                fontSize: '11px', 
                fontWeight: '600', 
                color: isStoreOpen ? '#16a34a' : '#dc2626',
                letterSpacing: '0.5px'
              }}>
                {isStoreOpen ? 'SALÓN ABIERTO' : 'SALÓN CERRADO'}
              </span>
            </div>
            <span style={{ color: '#d1d5db', fontSize: '11px' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={12} color="#9e9e9e" />
              <span style={{ fontSize: '11px', color: '#9e9e9e', fontWeight: '500' }}>
                {activeTab === 'my-profile' ? 'INFORMACIÓN PERSONAL' : 'Manhattan, NYC'}
              </span>
            </div>
            <span style={{ color: '#d1d5db', fontSize: '11px' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={12} color="#9e9e9e" />
              <span style={{ fontSize: '11px', color: '#9e9e9e', fontWeight: '500' }}>
                {today}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Rate Toggle Card */}
        <div style={{ 
          padding: '6px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px', 
          borderRadius: '14px', 
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.04)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <button
            onClick={() => onToggleRateType('bcv')}
            style={{
              padding: '6px 14px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.3s ease',
              background: activeRateType === 'bcv' ? 'linear-gradient(135deg, rgba(196,139,159,0.15), rgba(196,139,159,0.05))' : 'transparent',
              border: activeRateType === 'bcv' ? '1.5px solid #c48b9f' : '1.5px solid transparent'
            }}
          >
            <span style={{
              fontSize: '9px',
              fontWeight: '700',
              color: activeRateType === 'bcv' ? '#c48b9f' : '#9e9e9e',
              letterSpacing: '0.5px'
            }}>
              BCV
            </span>
            <span style={{
              fontSize: '13px',
              fontWeight: '700',
              color: activeRateType === 'bcv' ? '#c48b9f' : '#2d2d2d'
            }}>
              {rates.bcv > 0 ? rates.bcv.toFixed(2) : '—'}
            </span>
          </button>

          <button
            onClick={() => onToggleRateType('usdt')}
            style={{
              padding: '6px 14px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.3s ease',
              background: activeRateType === 'usdt' ? 'linear-gradient(135deg, rgba(38,166,91,0.15), rgba(38,166,91,0.05))' : 'transparent',
              border: activeRateType === 'usdt' ? '1.5px solid #22c55e' : '1.5px solid transparent'
            }}
          >
            <span style={{
              fontSize: '9px',
              fontWeight: '700',
              color: activeRateType === 'usdt' ? '#22c55e' : '#9e9e9e',
              letterSpacing: '0.5px'
            }}>
              USDT
            </span>
            <span style={{
              fontSize: '13px',
              fontWeight: '700',
              color: activeRateType === 'usdt' ? '#22c55e' : '#2d2d2d'
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
            <span style={{ fontSize: '8px', fontWeight: '700', color: '#9e9e9e' }}>GAP</span>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              color: rates.gap > 10 ? '#dc2626' : '#16a34a',
              backgroundColor: rates.gap > 10 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)',
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
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            color: unreadCount > 0 ? '#c48b9f' : '#6b6b6b',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: '#ef4444',
              color: 'white',
              fontSize: '9px',
              fontWeight: '700',
              borderRadius: '50%',
              minWidth: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 2px',
              border: '2px solid #ffffff',
              animation: 'pulse 2s infinite'
            }}>
              {unreadCount}
            </div>
          )}
        </button>

        {/* Nueva Cita Button */}
        <button
          onClick={onOpenSale}
          style={{
            height: '48px',
            padding: '0 24px',
            borderRadius: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            border: 'none',
            background: 'linear-gradient(135deg, #d4a09a 0%, #c48b9f 50%, #a0506a 100%)',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(196, 139, 159, 0.3)',
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
