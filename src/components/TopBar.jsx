import React, { useState, useEffect } from 'react';
import {
  User, Plus, Bell, MapPin, Calendar, Clock
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

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '24px', flexWrap: 'wrap', gap: '12px',
      paddingLeft: isMobile ? '42px' : '0'
    }}>
      {/* Left: Greeting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div>
          <h1 style={{
            fontSize: isMobile ? '20px' : '26px', 
            fontWeight: '700', 
            color: 'var(--text-primary)',
            fontFamily: "'Playfair Display', Georgia, serif",
            margin: 0
          }}>
            {getGreeting().replace('¡', '').replace('!', '')}, {user?.name?.split(' ')[0] || 'Carolina'} ✨
          </h1>
          <p style={{
            fontSize: '0.8rem', 
            color: 'var(--text-secondary)', 
            margin: '4px 0 0 0',
            fontWeight: '500'
          }}>Here's what's happening at Jana Studio.</p>
        </div>
      </div>

      {/* Right: Notification Bell & Date Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>▼</span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
