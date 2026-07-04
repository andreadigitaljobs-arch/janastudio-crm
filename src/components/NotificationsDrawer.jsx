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
      await alert("⚠️ Conexión no segura (HTTP):\n\nLos navegadores bloquean las notificaciones push por seguridad en conexiones HTTP (cuando usas una IP local como 192.168.x.x).\n\nPara probar en tu teléfono:\n1. Si es Android: puedes conectar el teléfono por USB y usar Chrome Port Forwarding (localhost).\n2. Si es iPhone o Android: se requiere un túnel seguro HTTPS (como ngrok o Cloudflare).");
      return;
    }

    if (isIOS && !isStandalone) {
      await alert("📱 Requisito de iPhone:\n\nApple no permite activar notificaciones desde el navegador Safari.\n\nPara activarlas:\n1. Pulsa el botón 'Compartir' en Safari (icono de cuadrado con flecha arriba).\n2. Selecciona 'Agregar a la pantalla de inicio'.\n3. Abre la app desde tu pantalla de inicio e inténtalo de nuevo.");
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
      '¡Funciona genial! Esta notificación llegará a tu teléfono o computadora de forma instantánea.'
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
      backgroundColor: 'rgba(0,0,0,0.85)',
      zIndex: 5000,
      display: 'flex',
      justifyContent: 'flex-end',
      backdropFilter: isOpen ? 'blur(8px)' : 'blur(0px)',
      opacity: isOpen ? 1 : 0,
      pointerEvents: isOpen ? 'auto' : 'none',
      transition: 'opacity 0.3s ease, backdrop-filter 0.3s ease'
    }}>
      {/* Click outside overlay to close */}
      <div onClick={onClose} style={{ flex: 1 }} />

      {/* Drawer Card Content */}
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '450px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid rgba(212,160,154,0.3)',
        borderRadius: '0',
        background: 'rgba(18, 18, 18, 0.98)',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={22} className="text-pink" />
            <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'white', margin: 0 }}>Notificaciones Jana</h3>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Permission Banner (PWA Config) */}
        {permission !== 'granted' && (
          <div style={{
            margin: '16px 24px 0 24px',
            padding: '16px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(212,160,154,0.15), rgba(0,0,0,0.3))',
            border: '1.5px solid rgba(212,160,154,0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Smartphone size={20} className="text-pink" style={{ flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '13px', fontWeight: '850', color: 'white', display: 'block' }}>Habilitar Notificaciones Push</span>
                
                {/* Dynamic warning context */}
                {!isSecure ? (
                  <span style={{ fontSize: '11px', color: '#ffb3b3', display: 'block', marginTop: '3px', fontWeight: '600' }}>
                    ⚠️ Requiere HTTPS (Conexión segura). Estás conectado vía IP local sin cifrar (HTTP).
                  </span>
                ) : isIOS && !isStandalone ? (
                  <span style={{ fontSize: '11px', color: '#ffeb9c', display: 'block', marginTop: '3px', fontWeight: '600' }}>
                    📱 iPhone detectado: Pulsa Compartir y selecciona "Agregar a pantalla de inicio" para habilitar.
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '3px' }}>
                    Recibe alertas instantáneas en tu dispositivo como un mensaje de WhatsApp cuando haya nuevos cobros.
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={handleRequestPermission}
              className="btn-pink" 
              style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: '900' }}
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
            fontSize: '11px',
            color: 'var(--text-muted)',
            borderBottom: '1px solid rgba(255,255,255,0.04)'
          }}>
            <button 
              onClick={handleMarkAllRead} 
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <CheckCheck size={14} className="text-pink" /> Marcar leídas
            </button>
            <button 
              onClick={handleClearHistory} 
              style={{ background: 'none', border: 'none', color: '#ff4d4d', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Trash2 size={14} /> Limpiar historial
            </button>
          </div>
        )}

        {/* List Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {permission === 'granted' && (
            <button 
              onClick={handleSendTestNotification}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px dashed rgba(212,160,154,0.3)',
                color: 'var(--pink-primary)',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
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
              <Bell size={40} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: '13px', fontWeight: '800' }}>Sin notificaciones nuevas</span>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: n.read ? 'rgba(255,255,255,0.02)' : 'rgba(212,160,154,0.04)',
                  border: n.read ? '1px solid rgba(255,255,255,0.05)' : '1.5px solid rgba(212,160,154,0.25)',
                  position: 'relative',
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
                    backgroundColor: 'var(--pink-primary)'
                  }} />
                )}
                <h4 style={{ fontSize: '13px', fontWeight: '900', color: 'white', margin: '0 0 4px 0', paddingRight: '12px' }}>
                  {n.title}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: '1.5' }}>
                  {n.body}
                </p>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {new Date(n.date).toLocaleDateString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default NotificationsDrawer;
