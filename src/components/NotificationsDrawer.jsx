import React, { useState, useEffect } from 'react';
import { Bell, X, ShieldAlert, Trash2, CheckCheck, Sparkles, Smartphone } from 'lucide-react';
import { notificationService } from '../services/notificationService';

const NotificationsDrawer = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      setPermission(notificationService.getPermissionStatus());
    }

    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('jana_new_notification', handleUpdate);
    return () => window.removeEventListener('jana_new_notification', handleUpdate);
  }, [isOpen]);

  const loadNotifications = () => {
    setNotifications(notificationService.getHistory());
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  const isSecure = window.isSecureContext;

  const handleRequestPermission = async () => {
    if (!isSecure) {
      await alert("⚠️ Conexión no segura (HTTP):\n\nLos navegadores bloquean las notificaciones push por seguridad en conexiones HTTP.\n\nPara probar en tu teléfono:\n1. Si es Android: puedes conectar el teléfono por USB y usar Chrome Port Forwarding.\n2. Se requiere un túnel seguro HTTPS.");
      return;
    }

    if (isIOS && !isStandalone) {
      await alert("📱 Requisito de iPhone:\n\nApple no permite activar notificaciones desde el navegador Safari.\n\nPara activarlas:\n1. Pulsa el botón 'Compartir' en Safari.\n2. Selecciona 'Agregar a la pantalla de inicio'.\n3. Abre la app desde tu pantalla de inicio.");
      return;
    }

    const res = await notificationService.requestPermission();
    setPermission(res);
    if (res === 'granted') {
      notificationService.sendNotification(
        '¡Permiso Activado! 🎉',
        'Las notificaciones push del CRM de Jana Beauty ya están activadas en este dispositivo.'
      );
    }
  };

  const handleSendTestNotification = () => {
    notificationService.sendNotification(
      'Jana Beauty CRM 🚀',
      '¡Funciona de maravilla! La prueba de notificaciones está activa.'
    );
  };

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead();
  };

  const handleClearHistory = () => {
    notificationService.clearHistory();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(30, 15, 20, 0.4)',
      zIndex: 5000,
      display: 'flex',
      justifyContent: 'flex-end',
      backdropFilter: isOpen ? 'blur(12px)' : 'blur(0px)',
      opacity: isOpen ? 1 : 0,
      pointerEvents: isOpen ? 'auto' : 'none',
      transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), backdrop-filter 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Click outside overlay to close */}
      <div onClick={onClose} style={{ flex: 1 }} />

      {/* Drawer Card Content */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid rgba(212,160,154,0.25)',
        background: 'linear-gradient(170deg, rgba(253, 246, 248, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)',
        boxShadow: '-10px 0 40px rgba(160, 80, 106, 0.1)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(212, 160, 154, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #fff2f4 0%, #fae1e6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--magenta-secondary)',
              boxShadow: '0 2px 8px rgba(160, 80, 106, 0.08)'
            }}>
              <Bell size={20} />
            </div>
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '700', 
              color: 'var(--text-primary)', 
              fontFamily: "'Playfair Display', Georgia, serif",
              margin: 0 
            }}>Notificaciones</h3>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(160, 80, 106, 0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(160, 80, 106, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(160, 80, 106, 0.05)'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Permission Banner (PWA Config) */}
        {permission !== 'granted' && (
          <div style={{
            margin: '16px 20px 0 20px',
            padding: '16px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, rgba(212,160,154,0.12) 0%, rgba(250,225,230,0.4) 100%)',
            border: '1px solid rgba(212,160,154,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(160, 80, 106, 0.04)'
          }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Smartphone size={18} style={{ color: 'var(--magenta-primary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)', display: 'block' }}>Habilitar Notificaciones Push</span>
                
                {/* Dynamic warning context */}
                {!isSecure ? (
                  <span style={{ fontSize: '0.68rem', color: '#b91c1c', display: 'block', marginTop: '3px', fontWeight: '600' }}>
                    ⚠️ Requiere HTTPS (Conexión segura). Conexión local HTTP activa.
                  </span>
                ) : isIOS && !isStandalone ? (
                  <span style={{ fontSize: '0.68rem', color: 'var(--magenta-primary)', display: 'block', marginTop: '3px', fontWeight: '600' }}>
                    📱 iPhone detectado: Pulsa Compartir y selecciona "Agregar a pantalla de inicio".
                  </span>
                ) : (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginTop: '3px', lineHeight: 1.4 }}>
                    Recibe alertas instantáneas en tu dispositivo como un mensaje de WhatsApp cuando haya nuevas citas.
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={handleRequestPermission}
              style={{ 
                padding: '8px 16px', 
                borderRadius: '10px', 
                fontSize: '0.72rem', 
                fontWeight: '700',
                background: 'var(--magenta-secondary)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(160, 80, 106, 0.15)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
            >
              {!isSecure ? 'Ver requisitos de red' : isIOS && !isStandalone ? 'Ver guía de instalación' : 'Activar Notificaciones'}
            </button>
          </div>
        )}

        {/* Quick Actions (If there are notifications) */}
        {notifications.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 24px',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            borderBottom: '1px solid rgba(212, 160, 154, 0.12)'
          }}>
            <button 
              onClick={handleMarkAllRead} 
              style={{ background: 'none', border: 'none', color: 'var(--magenta-secondary)', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <CheckCheck size={14} /> Marcar leídas
            </button>
            <button 
              onClick={handleClearHistory} 
              style={{ background: 'none', border: 'none', color: '#ff4d4d', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Trash2 size={14} /> Limpiar historial
            </button>
          </div>
        )}

        {/* List Content */}
        <div className="no-scrollbar" style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {permission === 'granted' && (
            <button 
              onClick={handleSendTestNotification}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '12px',
                background: 'rgba(212,160,154,0.05)',
                border: '1px dashed rgba(212,160,154,0.3)',
                color: 'var(--magenta-primary)',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,160,154,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(212,160,154,0.05)'}
            >
              <Sparkles size={14} /> Probar notificación push en vivo
            </button>
          )}

          {notifications.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '60%',
              gap: '12px',
              color: 'var(--text-muted)'
            }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: '#fcf8f9', border: '1px solid rgba(212, 160, 154, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', marginBottom: '8px'
              }}>
                <Bell size={24} style={{ opacity: 0.4 }} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>Sin notificaciones nuevas</span>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                style={{
                  padding: '14px 16px',
                  borderRadius: '16px',
                  background: n.read ? '#ffffff' : 'rgba(212, 160, 154, 0.08)',
                  border: n.read ? '1.5px solid rgba(212, 160, 154, 0.08)' : '1.5px solid rgba(212, 160, 154, 0.25)',
                  position: 'relative',
                  boxShadow: '0 2px 8px rgba(160, 80, 106, 0.02)',
                  transition: 'all 0.2s'
                }}
              >
                {!n.read && (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--magenta-secondary)'
                  }} />
                )}
                <h4 style={{ fontSize: '0.8rem', fontWeight: '750', color: 'var(--text-primary)', margin: '0 0 4px 0', paddingRight: '12px' }}>
                  {n.title}
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                  {n.body}
                </p>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                  {new Date(n.date).toLocaleDateString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsDrawer;
