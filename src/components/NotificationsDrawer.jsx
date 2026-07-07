import React, { useState, useEffect } from 'react';
import { Bell, X, ShieldAlert, Trash2, CheckCheck, Sparkles, Smartphone, BellRing, Inbox } from 'lucide-react';
import { notificationService } from '../services/notificationService';

const NotificationsDrawer = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [permission, setPermission] = useState('default');
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setClosing(false);
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

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 350);
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

  const visible = isOpen && !closing;

  return (
    <>
      <style>{`
        @keyframes ntfSlideUp {
          from { transform: translateY(100%) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes ntfSlideDown {
          from { transform: translateY(0) scale(1); opacity: 1; }
          to { transform: translateY(100%) scale(0.95); opacity: 0; }
        }
        @keyframes ntfFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ntfFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes ntfItemIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ntfPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>

      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: isOpen ? 'rgba(15, 8, 12, 0.55)' : 'transparent',
        zIndex: 5000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        backdropFilter: isOpen ? 'blur(8px)' : 'blur(0)',
        animation: isOpen ? 'ntfFadeIn 0.3s ease forwards' : 'ntfFadeOut 0.3s ease forwards',
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'background-color 0.35s ease'
      }}>
        <div onClick={handleClose} style={{ position: 'absolute', inset: 0 }} />

        {/* Bottom Sheet */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '85vh',
          background: 'linear-gradient(165deg, #fffafb 0%, #ffffff 40%, #fdf6f8 100%)',
          borderRadius: '28px 28px 0 0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: visible
            ? 'ntfSlideUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards'
            : 'ntfSlideDown 0.35s cubic-bezier(0.55, 0, 1, 0.45) forwards',
          boxShadow: '0 -8px 40px rgba(160, 80, 106, 0.15), 0 -2px 12px rgba(160, 80, 106, 0.08)'
        }}>
          {/* Drag Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
            <div style={{
              width: '36px', height: '4px', borderRadius: '4px',
              background: 'rgba(212, 160, 154, 0.3)'
            }} />
          </div>

          {/* Header */}
          <div style={{
            padding: '4px 24px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #c97282 0%, #a0506a 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 16px rgba(160, 80, 106, 0.3)'
              }}>
                <BellRing size={20} />
              </div>
              <div>
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: '800',
                  color: '#2d1b22',
                  fontFamily: "'Playfair Display', Georgia, serif",
                  margin: 0,
                  letterSpacing: '-0.02em'
                }}>Notificaciones</h3>
                {notifications.length > 0 && (
                  <span style={{ fontSize: '0.68rem', color: '#a0506a', fontWeight: '600' }}>
                    {notifications.filter(n => !n.read).length > 0
                      ? `${notifications.filter(n => !n.read).length} sin leer`
                      : 'Todo al día'
                    }
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(160, 80, 106, 0.06)',
                border: '1.5px solid rgba(160, 80, 106, 0.1)',
                borderRadius: '14px',
                width: '38px', height: '38px',
                color: '#a0506a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(160, 80, 106, 0.12)';
                e.currentTarget.style.transform = 'rotate(90deg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(160, 80, 106, 0.06)';
                e.currentTarget.style.transform = 'rotate(0deg)';
              }}
            >
              <X size={17} strokeWidth={2.5} />
            </button>
          </div>

          {/* Permission Banner */}
          {permission !== 'granted' && (
            <div style={{
              margin: '0 20px 14px',
              padding: '16px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #fdf2f4 0%, #fce8ec 100%)',
              border: '1px solid rgba(201, 114, 130, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              animation: 'ntfItemIn 0.4s ease 0.1s both'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #c97282, #a0506a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#ffffff', flexShrink: 0
                }}>
                  <Smartphone size={17} />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#2d1b22', display: 'block', lineHeight: '1.3' }}>
                    Activa las notificaciones
                  </span>
                  {!isSecure ? (
                    <span style={{ fontSize: '0.68rem', color: '#b91c1c', display: 'block', marginTop: '3px', fontWeight: '600' }}>
                      Requiere HTTPS para funcionar.
                    </span>
                  ) : isIOS && !isStandalone ? (
                    <span style={{ fontSize: '0.68rem', color: '#a0506a', display: 'block', marginTop: '3px', fontWeight: '600' }}>
                      iPhone: Pulsa Compartir → Agregar a pantalla de inicio.
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: '#8a7078', display: 'block', marginTop: '3px', lineHeight: 1.4 }}>
                      Recibe alertas al instaje cuando haya nuevas citas.
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleRequestPermission}
                style={{
                  padding: '10px 0',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #c97282, #a0506a)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 3px 12px rgba(160, 80, 106, 0.25)',
                  transition: 'all 0.2s',
                  letterSpacing: '0.02em'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              >
                {!isSecure ? 'Ver requisitos' : isIOS && !isStandalone ? 'Ver guía' : 'Activar ahora'}
              </button>
            </div>
          )}

          {/* Actions Bar */}
          {notifications.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '8px',
              padding: '0 20px 14px',
              animation: 'ntfItemIn 0.4s ease 0.15s both'
            }}>
              <button
                onClick={handleMarkAllRead}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: '10px',
                  background: 'rgba(160, 80, 106, 0.06)',
                  border: '1px solid rgba(160, 80, 106, 0.1)',
                  color: '#a0506a',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(160, 80, 106, 0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(160, 80, 106, 0.06)'}
              >
                <CheckCheck size={13} /> Marcar leídas
              </button>
              <button
                onClick={handleClearHistory}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
              >
                <Trash2 size={13} /> Limpiar
              </button>
            </div>
          )}

          {/* Notification List */}
          <div className="no-scrollbar" style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {permission === 'granted' && (
              <button
                onClick={handleSendTestNotification}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(201,114,130,0.08) 0%, rgba(160,80,106,0.05) 100%)',
                  border: '1.5px dashed rgba(201, 114, 130, 0.3)',
                  color: '#a0506a',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.25s ease',
                  animation: 'ntfItemIn 0.4s ease 0.2s both'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(201,114,130,0.12)';
                  e.currentTarget.style.borderColor = 'rgba(201, 114, 130, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,114,130,0.08) 0%, rgba(160,80,106,0.05) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(201, 114, 130, 0.3)';
                }}
              >
                <Sparkles size={14} /> Probar notificación push
              </button>
            )}

            {notifications.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 20px',
                gap: '14px'
              }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '22px',
                  background: 'linear-gradient(135deg, #fdf2f4 0%, #fce8ec 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'ntfPulse 3s ease-in-out infinite'
                }}>
                  <Inbox size={30} style={{ color: '#c9a0aa' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#2d1b22', display: 'block' }}>
                    Todo tranquilo
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#a0909a', display: 'block', marginTop: '4px' }}>
                    No hay notificaciones por ahora
                  </span>
                </div>
              </div>
            ) : (
              notifications.map((n, idx) => (
                <div
                  key={n.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '16px',
                    background: n.read
                      ? '#ffffff'
                      : 'linear-gradient(135deg, #fdf2f4 0%, #ffffff 100%)',
                    border: n.read
                      ? '1px solid rgba(212, 160, 154, 0.1)'
                      : '1.5px solid rgba(201, 114, 130, 0.2)',
                    position: 'relative',
                    transition: 'all 0.25s ease',
                    animation: `ntfItemIn 0.35s ease ${0.1 + idx * 0.05}s both`
                  }}
                >
                  {/* Unread indicator */}
                  {!n.read && (
                    <div style={{
                      position: 'absolute',
                      top: '16px', right: '14px',
                      width: '8px', height: '8px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #c97282, #e8a0b0)',
                      boxShadow: '0 0 8px rgba(201, 114, 130, 0.4)',
                      animation: 'ntfPulse 2s ease-in-out infinite'
                    }} />
                  )}

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    {/* Notification icon */}
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '10px',
                      background: n.read
                        ? 'rgba(160, 80, 106, 0.05)'
                        : 'linear-gradient(135deg, #c97282, #a0506a)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: n.read ? '#c9a0aa' : '#ffffff',
                      flexShrink: 0
                    }}>
                      <Bell size={15} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        color: '#2d1b22',
                        margin: '0 0 3px 0',
                        paddingRight: '12px',
                        lineHeight: '1.3'
                      }}>
                        {n.title}
                      </h4>
                      <p style={{
                        fontSize: '0.72rem',
                        color: '#7a6a72',
                        margin: '0 0 6px 0',
                        lineHeight: '1.45'
                      }}>
                        {n.body}
                      </p>
                      <span style={{
                        fontSize: '0.6rem',
                        color: '#b0a0a8',
                        fontWeight: '600'
                      }}>
                        {new Date(n.date).toLocaleDateString('es-VE', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationsDrawer;
