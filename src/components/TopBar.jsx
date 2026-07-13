import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  User, Plus, Bell, MapPin, Calendar, Clock, Sparkles, Search, X, Users, Scissors, CalendarDays
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';

const TopBar = ({
  activeTab, rates, onOpenSale, isStoreOpen = true,
  activeRateType, onToggleRateType, onOpenNotifications, isMobile,
  dbData, onNavigate
}) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const updateUnread = () => {
      const history = notificationService.getHistory();
      setUnreadCount(history.filter(n => !n.read).length);
    };
    updateUnread();
    window.addEventListener('jana_new_notification', updateUnread);
    return () => window.removeEventListener('jana_new_notification', updateUnread);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return { clients: [], services: [], appointments: [] };
    const q = searchQuery.toLowerCase();

    const clients = (dbData?.clients || []).filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.id_card || '').includes(q)
    ).slice(0, 5);

    const services = (dbData?.services || []).filter(s =>
      (s.name || '').toLowerCase().includes(q)
    ).slice(0, 3);

    const appointments = (dbData?.appointments || []).filter(a =>
      (a.clients?.name || '').toLowerCase().includes(q) ||
      (a.services?.name || '').toLowerCase().includes(q) ||
      (a.staff?.name || '').toLowerCase().includes(q)
    ).slice(0, 3);

    return { clients, services, appointments };
  }, [searchQuery, dbData]);

  const hasResults = searchResults.clients.length > 0 || searchResults.services.length > 0 || searchResults.appointments.length > 0;

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

  const handleResultClick = (type, item) => {
    setShowResults(false);
    setSearchQuery('');
    if (type === 'client') {
      onNavigate('clients', { clientId: item.id });
    } else if (type === 'service') {
      onNavigate('services');
    } else if (type === 'appointment') {
      onNavigate('scheduling');
    }
  };

  const renderSearchBar = (widthStyle = {}) => (
    <div ref={searchRef} style={{ position: 'relative', width: '100%', ...widthStyle }}>
      <input
        ref={inputRef}
        className="mi-input"
        type="text"
        placeholder="Buscar clientes, citas, servicios..."
        value={searchQuery}
        onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
        onFocus={() => setShowResults(true)}
        style={{
          width: '100%',
          padding: '10px 40px 10px 14px',
          borderRadius: '12px',
          border: `1px solid ${showResults && searchQuery.length >= 2 ? 'var(--pink-primary)' : 'var(--border-color)'}`,
          background: '#ffffff',
          color: 'var(--text-primary)',
          fontSize: '0.82rem',
          fontWeight: '500',
          outline: 'none',
          boxShadow: showResults && searchQuery.length >= 2 ? '0 4px 20px rgba(201, 114, 130, 0.12)' : 'var(--shadow-card)',
          transition: 'all 0.2s'
        }}
      />
      {searchQuery ? (
        <X
          size={15}
          onClick={() => { setSearchQuery(''); setShowResults(false); inputRef.current?.focus(); }}
          style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer', pointerEvents: 'auto' }}
        />
      ) : (
        <Search size={15} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
      )}

      {/* Results dropdown */}
      {showResults && searchQuery.length >= 2 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0, right: 0,
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid rgba(201, 114, 130, 0.12)',
          boxShadow: '0 12px 40px rgba(201, 114, 130, 0.15)',
          maxHeight: isMobile ? '50vh' : '380px',
          overflowY: 'auto',
          zIndex: 9999,
          padding: '8px'
        }}>
          {!hasResults ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No se encontraron resultados
            </div>
          ) : (
            <>
              {/* Clients */}
              {searchResults.clients.length > 0 && (
                <div>
                  <div style={{ padding: '6px 12px', fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={12} /> Clientes
                  </div>
                  {searchResults.clients.map((c, i) => (
                    <div
                      key={c.id || i}
                      onClick={() => handleResultClick('client', c)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fdf2f3'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #c97282, #a0506a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}>
                        {(c.name || '?')[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{c.phone || c.id_card || ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Services */}
              {searchResults.services.length > 0 && (
                <div style={{ marginTop: searchResults.clients.length > 0 ? '4px' : '0' }}>
                  <div style={{ padding: '6px 12px', fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px', borderTop: searchResults.clients.length > 0 ? '1px solid rgba(201,114,130,0.08)' : 'none', paddingTop: '8px' }}>
                    <Scissors size={12} /> Servicios
                  </div>
                  {searchResults.services.map((s, i) => (
                    <div
                      key={s.id || i}
                      onClick={() => handleResultClick('service', s)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fdf2f3'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(201,114,130,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', flexShrink: 0 }}>
                        <Scissors size={14} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', textWrap: 'balance' }}>{s.name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{s.duration_minutes || 60} min</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Appointments */}
              {searchResults.appointments.length > 0 && (
                <div style={{ marginTop: (searchResults.clients.length > 0 || searchResults.services.length > 0) ? '4px' : '0' }}>
                  <div style={{ padding: '6px 12px', fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px', borderTop: (searchResults.clients.length > 0 || searchResults.services.length > 0) ? '1px solid rgba(201,114,130,0.08)' : 'none', paddingTop: '8px' }}>
                    <CalendarDays size={12} /> Citas
                  </div>
                  {searchResults.appointments.map((a, i) => (
                    <div
                      key={a.id || i}
                      onClick={() => handleResultClick('appointment', a)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fdf2f3'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(201,114,130,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c97282', flexShrink: 0 }}>
                        <CalendarDays size={14} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.clients?.name || 'Cliente'}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textWrap: 'balance' }}>{a.services?.name || ''} · {a.time || ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );

  if (activeTab !== 'dashboard') return null;

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
            className="mi-btn"
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

        {renderSearchBar({ padding: '0 4px' })}

        {/* Third Line: BCV/USDT and Date styled horizontally scrolling & super neat */}
        <div className="no-scrollbar" style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          padding: '2px 4px',
          width: '100%',
          WebkitOverflowScrolling: 'touch'
        }}>
          {rates && rates.usdt > 0 && activeTab === 'dashboard' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '6px 12px', borderRadius: '10px',
              background: '#ffffff', border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)', fontSize: '0.72rem',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.58rem', fontWeight: 500 }}>BCV</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Bs. {rates.bcv?.toFixed(2)}</span>
              </div>
              <div style={{ width: '1px', height: '22px', background: 'var(--border-color)' }} />
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
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
    <div className="topbar-header-row" style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexWrap: 'wrap', gap: '12px',
      paddingLeft: '0',
      paddingTop: '0',
      position: 'relative',
      zIndex: 20,
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      borderRadius: '20px',
      border: '1px solid rgba(201, 114, 130, 0.1)',
      padding: '14px 20px',
      boxShadow: '0 4px 20px rgba(201, 114, 130, 0.06), inset 0 1px 1px rgba(255,255,255,0.9)',
      marginBottom: '20px'
    }}>
      {/* Left: Greeting (or Search Bar in Dashboard) */}
      <div className="topbar-search-wrap" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 350px', minWidth: 0 }}>
        {renderSearchBar({ width: '350px', maxWidth: '100%' })}
      </div>

      {/* Right: Notification Bell & Date Selector */}
      <div className="topbar-actions-wrap" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Rates pill: BCV / USDT */}
        {rates && rates.usdt > 0 && activeTab === 'dashboard' && (
          <div className="topbar-rates-pill" style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 14px', borderRadius: '12px',
            background: '#ffffff', border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-card)', fontSize: '0.78rem',
          }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 500 }}>BCV</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Bs. {rates.bcv?.toFixed(2)}</span>
            </div>
            <div style={{ width: '1px', height: '28px', background: 'var(--border-color)' }} />
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 500 }}>USDT</span>
              <span style={{ color: 'var(--magenta-primary)', fontWeight: 700 }}>Bs. {rates.usdt?.toFixed(2)}</span>
            </div>
          </div>
        )}

        <button
          className="mi-btn"
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
        <div className="topbar-date-pill" style={{
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
