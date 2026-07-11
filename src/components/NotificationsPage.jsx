import React, { useState, useEffect } from 'react';
import { Bell, Trash2, CheckCheck, Inbox, Heart, Calendar, DollarSign, User, ArrowLeft, Shield } from 'lucide-react';
import { notificationService } from '../services/notificationService';

const NotificationsPage = ({ isMobile, onNavigate }) => {
  const [notifications, setNotifications] = useState([]);
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    loadNotifications();
    setPermission(notificationService.getPermissionStatus());
    const handleUpdate = () => loadNotifications();
    window.addEventListener('jana_new_notification', handleUpdate);
    return () => window.removeEventListener('jana_new_notification', handleUpdate);
  }, []);

  const loadNotifications = () => {
    setNotifications(notificationService.getHistory());
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  const isSecure = window.isSecureContext;

  const handleRequestPermission = async () => {
    if (!isSecure) {
      alert("⚠️ Conexión no segura (HTTP)");
      return;
    }
    if (isIOS && !isStandalone) {
      alert("📱 iPhone: Pulsa Compartir → Agregar a pantalla de inicio.");
      return;
    }
    const res = await notificationService.requestPermission();
    setPermission(res);
    if (res === 'granted') {
      notificationService.sendNotification('¡Permiso Activado! 🎉', 'Las notificaciones push ya están activadas.');
    }
  };

  const handleSendTestNotification = () => {
    notificationService.injectTestNotifications();
    loadNotifications();
  };

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead();
    loadNotifications();
  };

  const handleClearHistory = () => {
    notificationService.clearHistory();
    loadNotifications();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // --- Permission Banner ---
  const permissionBanner = permission !== 'granted' && (
    <div className="ntf-banner" style={{
      margin: '0 0 20px 0', padding: '16px', borderRadius: '16px',
      background: 'linear-gradient(135deg, #fdf2f4 0%, #fcf0f2 50%, #f6e6ea 100%)',
      border: '1.5px dashed rgba(201, 114, 130, 0.4)',
      display: 'flex', gap: '14px', alignItems: 'center',
      boxShadow: '0 4px 16px rgba(201, 114, 130, 0.04)'
    }}>
      <div className="ntf-banner-icon" style={{
        width: '40px', height: '40px', borderRadius: '12px',
        background: 'linear-gradient(135deg, #c97282, #a0506a)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        boxShadow: '0 4px 12px rgba(201, 114, 130, 0.2)', flexShrink: 0
      }}><Bell size={18} /></div>
      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1f1215', margin: '0 0 2px' }}>¿Activar notificaciones en el dispositivo?</h4>
        <p style={{ fontSize: '0.68rem', color: '#8a8086', margin: 0, lineHeight: 1.4 }}>Recibe recordatorios de citas y alertas en tiempo real al instante.</p>
      </div>
      <button onClick={handleRequestPermission} style={{
        padding: '7px 14px', borderRadius: '10px',
        background: 'linear-gradient(135deg, #c97282, #a0506a)',
        color: '#fff', fontSize: '0.7rem', fontWeight: '700', border: 'none', cursor: 'pointer',
        boxShadow: '0 3px 8px rgba(201, 114, 130, 0.2)'
      }}>Activar</button>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <style>{`
        @keyframes ntfItemIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ntfPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        .ntf-card {
          border-radius: 16px;
          transition: all 0.2s ease;
        }
        .ntf-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(201, 114, 130, 0.08);
        }
      `}</style>

      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '28px', 
        padding: '12px 0 16px 0', 
        flexWrap: 'wrap', 
        gap: '20px',
        position: 'relative',
        width: '100%'
      }}>
        {/* Background Ambient Glow */}
        <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(212,160,154,0.18) 0%, rgba(212,160,154,0) 70%)', pointerEvents: 'none', zIndex: 0 }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 }}>
          <button 
            onClick={() => onNavigate('dashboard')} 
            style={{
              background: '#fff', border: '1px solid rgba(0,0,0,0.06)', 
              width: '36px', height: '36px', borderRadius: '12px',
              color: '#1f1215', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              flexShrink: 0
            }}
          >
            <ArrowLeft size={18} />
          </button>
          {!isMobile && (
            <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'var(--magenta-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(160, 80, 106, 0.15)', flexShrink: 0 }}>
              <Bell size={20} color="white" />
            </div>
          )}
          <div>
            <h1 className="jana-page-title" style={{ margin: 0, fontSize: isMobile ? '20px' : '28px', letterSpacing: '-0.6px', fontWeight: '850', color: 'var(--text-primary)' }}>
              Notificaciones
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: isMobile ? '12px' : '14px', fontWeight: '500' }}>
              Historial y configuración de alertas de tu salón.
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {notifications.length > 0 && (
            <>
              <button 
                onClick={handleMarkAllRead} 
                style={{
                  padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(201, 114, 130, 0.2)',
                  background: '#fff', color: '#a0506a', fontSize: '0.78rem', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <CheckCheck size={14} /> Marcar leídas
              </button>
              <button 
                onClick={handleClearHistory} 
                style={{
                  padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(180, 100, 90, 0.15)',
                  background: '#fff', color: '#8a4560', fontSize: '0.78rem', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Trash2 size={14} /> Limpiar historial
              </button>
            </>
          )}
          <button 
            onClick={handleSendTestNotification} 
            style={{
              padding: '8px 16px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #c97282, #a0506a)',
              color: '#fff', fontSize: '0.78rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 3px 10px rgba(201, 114, 130, 0.15)'
            }}
          >
            Prueba PUSH
          </button>
        </div>
      </div>

      {permissionBanner}

      {/* Main Container */}
      <div style={{
        background: '#fff',
        borderRadius: '24px',
        border: '1px solid rgba(0,0,0,0.06)',
        padding: '24px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.01)',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {notifications.length === 0 ? (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', gap: '18px' }}>
            <div style={{
              width: '90px', height: '90px', borderRadius: '28px',
              background: 'linear-gradient(135deg, #fdf2f4 0%, #f8e8ec 30%, #f5e1e7 60%, #f0d9e1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'ntfPulse 3s ease-in-out infinite',
              boxShadow: '0 8px 32px rgba(201, 114, 130, 0.08)',
              position: 'relative'
            }}>
              <Inbox size={36} style={{ color: '#c97282' }} />
              <div style={{
                position: 'absolute', bottom: '-4px', right: '-4px',
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #c97282, #a0506a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #fff'
              }}><Heart size={14} style={{ color: '#fff', fill: '#fff' }} /></div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1f1215', display: 'block', }}>Todo tranquilo por aquí</span>
              <span style={{ fontSize: '0.8rem', color: '#9e9e9e', display: 'block', marginTop: '6px', lineHeight: '1.5' }}>
                No tienes notificaciones nuevas en este momento.<br/>Te avisaremos cuando pase algo importante. 💕
              </span>
            </div>
          </div>
        ) : (() => {
          const today = new Date();
          today.setHours(0,0,0,0);
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          const grouped = { 'Hoy': [], 'Ayer': [], 'Anteriores': [] };
          notifications.forEach(n => {
            const d = new Date(n.date);
            d.setHours(0,0,0,0);
            if (d.getTime() === today.getTime()) grouped['Hoy'].push(n);
            else if (d.getTime() === yesterday.getTime()) grouped['Ayer'].push(n);
            else grouped['Anteriores'].push(n);
          });

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {Object.entries(grouped).map(([groupName, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={groupName}>
                    <h3 style={{
                      fontSize: '0.85rem', fontWeight: '800', color: '#a0506a',
                      marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px'
                    }}>{groupName}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {items.map((n, idx) => {
                        let IconComponent = Bell;
                        let iconBg = '#8b7cf6';
                        const titleLower = n.title.toLowerCase();
                        if (titleLower.includes('cita') || titleLower.includes('reserva')) { IconComponent = Calendar; iconBg = '#c97282'; }
                        else if (titleLower.includes('pago') || titleLower.includes('cobro') || titleLower.includes('oferta')) { IconComponent = DollarSign; iconBg = '#22c55e'; }
                        else if (titleLower.includes('client')) { IconComponent = User; iconBg = '#3b82f6'; }

                        return (
                          <div 
                            key={n.id} 
                            className="ntf-card" 
                            style={{
                              padding: '16px 20px',
                              opacity: n.read ? 0.75 : 1,
                              background: n.read
                                ? '#ffffff'
                                : 'linear-gradient(135deg, #fdf2f4 0%, #fdf6f7 50%, #f9ebed 100%)',
                              border: n.read
                                ? '1px solid rgba(0,0,0,0.05)'
                                : '1px solid rgba(201, 114, 130, 0.22)',
                              position: 'relative',
                              animation: `ntfItemIn 0.3s ease ${idx * 0.05}s both`,
                              display: 'flex',
                              gap: '16px',
                              alignItems: 'flex-start'
                            }}
                          >
                            {!n.read && (
                              <div style={{
                                position: 'absolute', top: 0, left: 0, bottom: 0,
                                width: '4px', background: 'linear-gradient(180deg, #c97282, #d4a0ae)',
                                borderRadius: '4px 0 0 4px'
                              }} />
                            )}
                            <div style={{
                              width: '42px', height: '42px', borderRadius: '12px',
                              background: n.read ? '#f3f4f6' : iconBg,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: n.read ? '#9ca3af' : '#ffffff', flexShrink: 0,
                              boxShadow: n.read ? 'none' : '0 4px 12px rgba(0,0,0,0.06)'
                            }}>
                              <IconComponent size={18} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
                                <h4 style={{
                                  fontSize: '0.9rem', fontWeight: n.read ? '600' : '750',
                                  color: '#1f1215', margin: 0, display: 'flex', alignItems: 'center', gap: '8px'
                                }}>
                                  {n.title}
                                  {!n.read && (
                                    <span style={{
                                      fontSize: '0.6rem', fontWeight: '800', color: '#c97282',
                                      background: '#fdf2f4', padding: '1px 6px', borderRadius: '6px',
                                      border: '1px solid rgba(201, 114, 130, 0.15)'
                                    }}>Nuevo</span>
                                  )}
                                </h4>
                                <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: '500' }}>
                                  {(() => {
                                    const date = new Date(n.date);
                                    const now = new Date();
                                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                    const yesterday = new Date(today);
                                    yesterday.setDate(yesterday.getDate() - 1);
                                    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                                    const timeStr = date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });
                                    if (compareDate.getTime() === today.getTime()) return `Hoy, ${timeStr}`;
                                    if (compareDate.getTime() === yesterday.getTime()) return `Ayer, ${timeStr}`;
                                    return `${date.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}, ${timeStr}`;
                                  })()}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.8rem', color: '#5c5457', margin: 0, lineHeight: 1.5 }}>
                                {n.body}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default NotificationsPage;
