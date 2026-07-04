import React, { useState, useEffect } from 'react';
import {
  User, Plus, Bell, MapPin, Calendar, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';

const TopBar = ({
  activeTab, rates, onOpenSale, isStoreOpen = true,
  activeRateType, onToggleRateType, onOpenNotifications
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

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '24px', flexWrap: 'wrap', gap: '16px'
    }}>
      {/* Left: Greeting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #c48b9f 0%, #a0506a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(196, 139, 159, 0.3)'
          }}>
            {user?.image_url ? (
              <img src={user.image_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <User color="white" size={22} />
            )}
          </div>
          <div style={{
            position: 'absolute', bottom: '0', right: '0',
            width: '14px', height: '14px', borderRadius: '50%',
            backgroundColor: isStoreOpen ? '#22c55e' : '#ef4444',
            border: '3px solid #faf5f5'
          }} />
        </div>
        <div>
          <h1 style={{
            fontSize: '22px', fontWeight: '700', color: '#2d2d2d',
            letterSpacing: '-0.3px', margin: 0
          }}>
            {getGreeting()}, <span className="text-gradient">
              {user?.role === 'Admin' ? 'Administradora' : user?.name?.split(' ')[0] || 'Belleza'}!
            </span> ✨
          </h1>
          <p style={{
            fontSize: '0.82rem', color: '#9e9e9e', margin: '4px 0 0 0',
            fontStyle: 'italic'
          }}>
            Tu pasión hace brillar cada detalle.
          </p>
        </div>
      </div>

      {/* Right: Chips + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Location Chip */}
        <div style={{
          padding: '8px 14px', borderRadius: '12px', background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'rgba(196, 139, 159, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <MapPin size={14} color="#c48b9f" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '600', color: '#2d2d2d' }}>Sucursal Principal</div>
            <div style={{ fontSize: '0.68rem', color: '#9e9e9e' }}>Maracay, Venezuela</div>
          </div>
        </div>

        {/* Date/Time Chip */}
        <div style={{
          padding: '8px 14px', borderRadius: '12px', background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'rgba(196, 139, 159, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Calendar size={14} color="#c48b9f" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '600', color: '#2d2d2d', textTransform: 'capitalize' }}>
              {formatDay(today.split(',')[0])}, {today.split(',').slice(1).join(',').trim()}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#9e9e9e' }}>{currentTime}</div>
          </div>
        </div>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: '#ffffff', border: '1px solid rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative',
            color: unreadCount > 0 ? '#c48b9f' : '#6b6b6b',
            boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            transition: 'all 0.2s'
          }}
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute', top: '6px', right: '6px',
              backgroundColor: '#ef4444', color: 'white',
              fontSize: '9px', fontWeight: '700', borderRadius: '50%',
              minWidth: '16px', height: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 2px', border: '2px solid #ffffff',
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
            height: '44px', padding: '0 22px', borderRadius: '12px',
            fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '0.88rem', border: 'none',
            background: 'linear-gradient(135deg, #d4a09a 0%, #c48b9f 50%, #a0506a 100%)',
            color: 'white', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(196, 139, 159, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          <Calendar size={18} /> Nueva Cita
        </button>
      </div>
    </div>
  );
};

export default TopBar;
