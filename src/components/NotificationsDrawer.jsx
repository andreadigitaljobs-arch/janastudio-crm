import React, { useState, useEffect } from 'react';
import { Bell, X, Trash2, CheckCheck, Sparkles, Smartphone, BellRing, Inbox, Heart } from 'lucide-react';
import { notificationService } from '../services/notificationService';

const NotificationsDrawer = ({ isOpen, onClose, isMobile }) => {
  const [notifications, setNotifications] = useState([]);
  const [permission, setPermission] = useState('default');
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) { setClosing(false); loadNotifications(); setPermission(notificationService.getPermissionStatus()); }
    const handleUpdate = () => loadNotifications();
    window.addEventListener('jana_new_notification', handleUpdate);
    return () => window.removeEventListener('jana_new_notification', handleUpdate);
  }, [isOpen]);

  const loadNotifications = () => { setNotifications(notificationService.getHistory()); };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, isMobile ? 400 : 300);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  const isSecure = window.isSecureContext;

  const handleRequestPermission = async () => {
    if (!isSecure) { await alert("⚠️ Conexión no segura (HTTP)"); return; }
    if (isIOS && !isStandalone) { await alert("📱 iPhone: Pulsa Compartir → Agregar a pantalla de inicio."); return; }
    const res = await notificationService.requestPermission();
    setPermission(res);
    if (res === 'granted') notificationService.sendNotification('¡Permiso Activado! 🎉', 'Las notificaciones push ya están activadas.');
  };

  const handleSendTestNotification = () => {
    notificationService.sendNotification('Jana Beauty CRM 🚀', '¡Funciona de maravilla! La prueba de notificaciones está activa.');
  };

  const handleMarkAllRead = () => { notificationService.markAllAsRead(); };
  const handleClearHistory = () => { notificationService.clearHistory(); };

  const visible = isOpen && !closing;
  const unreadCount = notifications.filter(n => !n.read).length;

  const unreadDot = { position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', borderRadius: '50%', background: 'linear-gradient(135deg, #c97282, #d4a0ae)', boxShadow: '0 0 10px rgba(201, 114, 130, 0.6)', border: '2px solid #fff' };

  // ─── Shared Permission Banner ──────────────────────────────
  const permissionBanner = permission !== 'granted' && (
    <div className="ntf-banner" style={{
      margin: isMobile ? '0 20px 14px' : '0 0 16px',
      padding: '18px', borderRadius: '20px',
              background: 'linear-gradient(135deg, #fdf2f4 0%, #f8e8ec 50%, #f5e1e7 100%)',
              border: '1px solid rgba(201, 114, 130, 0.2)',
      display: 'flex', flexDirection: 'column', gap: '12px',
      position: 'relative', overflow: 'hidden',
      animation: 'ntfItemIn 0.4s ease 0.1s both',
      transition: 'all 0.3s ease'
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(244, 114, 146, 0.12)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{
        position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px',
        borderRadius: '50%', background: 'linear-gradient(135deg, rgba(244,114,146,0.08), rgba(251,113,133,0.05))',
        filter: 'blur(10px)'
      }} />
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #c97282, #a0506a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0,
          boxShadow: '0 4px 16px rgba(201, 114, 130, 0.3)',
          transition: 'all 0.3s ease'
        }}><Smartphone size={18} /></div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1f1215', display: 'block' }}>Activa las notificaciones</span>
          {!isSecure ? (
            <span style={{ fontSize: '0.68rem', color: '#a0506a', display: 'block', marginTop: '3px', fontWeight: '600' }}>Requiere HTTPS para funcionar.</span>
          ) : isIOS && !isStandalone ? (
            <span style={{ fontSize: '0.68rem', color: '#8a4560', display: 'block', marginTop: '3px', fontWeight: '600' }}>iPhone: Compartir → Agregar a pantalla de inicio.</span>
          ) : (
            <span style={{ fontSize: '0.68rem', color: '#6b5b6b', display: 'block', marginTop: '3px', lineHeight: 1.4 }}>Recibe alertas instantáneas como un WhatsApp.</span>
          )}
        </div>
      </div>
      <button onClick={handleRequestPermission} style={{
        padding: '11px 0', borderRadius: '14px', fontSize: '0.78rem', fontWeight: '700',
        background: 'linear-gradient(135deg, #c97282, #a0506a, #8a4560)', color: 'white',
        border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(201, 114, 130, 0.3)',
        transition: 'all 0.3s ease', letterSpacing: '0.03em', position: 'relative'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(244, 63, 94, 0.4)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(244, 63, 94, 0.3)'; }}
      >{!isSecure ? 'Ver requisitos' : isIOS && !isStandalone ? 'Ver guía' : '✨ Activar ahora'}</button>
    </div>
  );

  // ─── Shared Actions Bar ────────────────────────────────────
  const actionsBar = notifications.length > 0 && (
    <div style={{ display: 'flex', gap: '8px', padding: isMobile ? '0 20px 14px' : '0 0 14px', animation: 'ntfItemIn 0.4s ease 0.15s both' }}>
      <button onClick={handleMarkAllRead} style={{
        flex: 1, padding: '9px 0', borderRadius: '12px',
        background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        color: '#059669', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
        transition: 'all 0.25s ease'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #d1fae5, #a7f3d0)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #ecfdf5, #d1fae5)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
      ><CheckCheck size={14} /> Marcar leídas</button>
      <button onClick={handleClearHistory} style={{
        flex: 1, padding: '9px 0', borderRadius: '12px',
        background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
        border: '1px solid rgba(249, 115, 22, 0.2)',
        color: '#ea580c', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
        transition: 'all 0.25s ease'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #ffedd5, #fed7aa)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.15)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #fff7ed, #ffedd5)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
      ><Trash2 size={14} /> Limpiar</button>
    </div>
  );

  // ─── Shared Notification List ──────────────────────────────
  const listContent = (
    <div className="no-scrollbar" style={{
      flex: 1, overflowY: 'auto',
      padding: isMobile ? '4px 16px 20px' : '4px 20px 20px',
      display: 'flex', flexDirection: 'column', gap: '10px'
    }}>
      {permission === 'granted' && (
        <button onClick={handleSendTestNotification} style={{
          width: '100%', padding: '12px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #fdf2f8, #fce7f3)',
          border: '1.5px dashed rgba(236, 72, 153, 0.3)',
          color: '#db2777', fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          transition: 'all 0.3s ease', animation: 'ntfItemIn 0.4s ease 0.2s both',
          position: 'relative', overflow: 'hidden'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #fce7f3, #fbcfe8)'; e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(236, 72, 153, 0.15)'; e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.4)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #fdf2f8, #fce7f3)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.3)'; }}
        ><Sparkles size={14} /> Probar notificación push</button>
      )}
      {notifications.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: '16px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '24px',
            background: 'linear-gradient(135deg, #fdf2f4 0%, #f8e8ec 30%, #f5e1e7 60%, #f0d9e1 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'ntfPulse 3s ease-in-out infinite',
            boxShadow: '0 8px 32px rgba(201, 114, 130, 0.12)',
            position: 'relative'
          }}>
            <Inbox size={32} style={{ color: '#c97282' }} />
            <div style={{
              position: 'absolute', bottom: '-4px', right: '-4px',
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #c97282, #a0506a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #fff'
            }}><Heart size={12} style={{ color: '#fff', fill: '#fff' }} /></div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1f1215', display: 'block', fontFamily: "'Playfair Display', Georgia, serif" }}>Todo tranquilo</span>
            <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginTop: '6px', lineHeight: '1.5' }}>No hay notificaciones nuevas.<br/>Vuelve más tarde 💕</span>
          </div>
        </div>
      ) : (
        notifications.map((n, idx) => (
          <div key={n.id} className="ntf-card" style={{
            padding: '14px 16px', borderRadius: '16px',
            background: n.read
              ? 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)'
              : 'linear-gradient(135deg, #fdf2f4 0%, #f8e8ec 40%, #f5e1e7 100%)',
            border: n.read
              ? '1px solid rgba(212, 160, 154, 0.1)'
              : '1.5px solid rgba(201, 114, 130, 0.25)',
            position: 'relative', transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
            animation: `ntfItemIn 0.4s ease ${0.1 + idx * 0.06}s both`,
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            if (!n.read) {
              e.currentTarget.style.background = 'linear-gradient(135deg, #f5e1e7 0%, #edcdd6 40%, #f0d9e1 100%)';
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(201, 114, 130, 0.12)';
            } else {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.04)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = n.read
              ? 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)'
              : 'linear-gradient(135deg, #fdf2f4 0%, #f8e8ec 40%, #f5e1e7 100%)';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            {/* Unread glow */}
            {!n.read && <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'linear-gradient(180deg, #c97282, #d4a0ae)', borderRadius: '0 4px 4px 0' }} />}
            {!n.read && (
              <div style={{
                position: 'absolute', top: '16px', right: '14px',
                width: '8px', height: '8px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #c97282, #d4a0ae)',
                  boxShadow: '0 0 10px rgba(201, 114, 130, 0.5)',
                animation: 'ntfPulse 2s ease-in-out infinite'
              }} />
            )}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '12px',
                background: n.read
                  ? 'linear-gradient(135deg, #fdf2f4, #f8e8ec)'
                  : 'linear-gradient(135deg, #c97282, #a0506a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: n.read ? '#d4a0ae' : '#ffffff', flexShrink: 0,
                boxShadow: n.read ? 'none' : '0 4px 14px rgba(201, 114, 130, 0.25)',
                transition: 'all 0.3s ease'
              }}><Bell size={15} /></div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1f1215', margin: '0 0 4px 0', lineHeight: '1.3', wordBreak: 'break-word' }}>{n.title}</h4>
                <p style={{ fontSize: '0.7rem', color: '#6b5b6b', margin: '0 0 6px 0', lineHeight: '1.5', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{n.body}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '0.6rem', color: '#9ca3af', fontWeight: '600',
                    background: 'rgba(0,0,0,0.03)', padding: '2px 8px', borderRadius: '6px'
                  }}>
                    {new Date(n.date).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {!n.read && (
                    <span style={{
                      fontSize: '0.55rem', fontWeight: '700', color: '#c97282',
                      background: 'linear-gradient(135deg, #fdf2f4, #f8e8ec)',
                      padding: '2px 7px', borderRadius: '6px',
                      border: '1px solid rgba(201,114,130,0.15)'
                    }}>Nuevo</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ═══════════════════ MOBILE: Bottom Sheet ═══════════════════
  if (isMobile) {
    return (
      <>
        <style>{`
          @keyframes ntfSlideUp { from { transform: translateY(100%) scale(0.92); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
          @keyframes ntfSlideDown { from { transform: translateY(0) scale(1); opacity: 1; } to { transform: translateY(100%) scale(0.92); opacity: 0; } }
          @keyframes ntfFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes ntfFadeOut { from { opacity: 1; } to { opacity: 0; } }
          @keyframes ntfItemIn { from { opacity: 0; transform: translateY(16px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes ntfPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
          @keyframes ntfShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          @keyframes ntfGradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
          .ntf-banner:hover .ntf-banner-icon { transform: rotate(-8deg) scale(1.1); }
          .ntf-banner .ntf-banner-icon { transition: transform 0.3s ease; }
        `}</style>
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: isOpen ? 'rgba(15, 5, 10, 0.6)' : 'transparent',
          zIndex: 5000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          backdropFilter: isOpen ? 'blur(12px) saturate(1.2)' : 'blur(0)',
          animation: isOpen ? 'ntfFadeIn 0.3s ease forwards' : 'ntfFadeOut 0.4s ease forwards',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}>
          <div onClick={handleClose} style={{ position: 'absolute', inset: 0 }} />
          <div style={{
            position: 'relative', width: '100%', maxWidth: '480px', maxHeight: '88vh',
            background: 'linear-gradient(165deg, #fffafb 0%, #ffffff 30%, #fef8fa 60%, #fdf5f7 100%)',
            borderRadius: '32px 32px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            animation: visible ? 'ntfSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards' : 'ntfSlideDown 0.4s cubic-bezier(0.55, 0, 1, 0.45) forwards',
            boxShadow: '0 -12px 48px rgba(201, 114, 130, 0.1), 0 -4px 16px rgba(160, 80, 106, 0.06)'
          }}>
            {/* Gradient top accent */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
              background: 'linear-gradient(90deg, #a0506a, #c97282, #d4a0ae, #c97282, #a0506a)',
              backgroundSize: '200% 100%',
              animation: 'ntfGradientShift 4s ease infinite'
            }} />
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '4px', background: 'linear-gradient(90deg, #e8b4be, #d4a0ae)' }} />
            </div>
            {/* Header */}
            <div style={{ padding: '4px 24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '16px',
                  background: 'linear-gradient(135deg, #c97282 0%, #a0506a 50%, #8a4560 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff',
                  boxShadow: '0 6px 20px rgba(201, 114, 130, 0.35)',
                  transition: 'all 0.3s ease', position: 'relative',
                  backgroundSize: '200% 200%',
                  animation: 'ntfGradientShift 3s ease infinite'
                }}>
                  <BellRing size={22} />
                  {unreadCount > 0 && (
                    <div style={{
                      position: 'absolute', top: '-4px', right: '-4px',
                      width: '20px', height: '20px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #c97282, #d4a0ae)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: '800', color: '#fff',
                      border: '2px solid #fff',
                      boxShadow: '0 2px 8px rgba(201, 114, 130, 0.4)',
                      animation: 'ntfPulse 2s ease-in-out infinite'
                    }}>{unreadCount}</div>
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1f1215', fontFamily: "'Playfair Display', Georgia, serif", margin: 0 }}>Notificaciones</h3>
                  <span style={{ fontSize: '0.68rem', color: '#d4a0ae', fontWeight: '600' }}>
                    {notifications.length === 0 ? 'Sin novedades' : unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día ✨'}
                  </span>
                </div>
              </div>
              <button onClick={handleClose} style={{
                background: 'linear-gradient(135deg, rgba(244,63,94,0.06), rgba(244,63,94,0.03))',
                border: '1.5px solid rgba(244, 63, 94, 0.1)',
                borderRadius: '14px', width: '40px', height: '40px', color: '#c97282', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #c97282, #a0506a)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'rotate(90deg) scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(201,114,130,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,114,130,0.06), rgba(201,114,130,0.03))'; e.currentTarget.style.color = '#c97282'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              ><X size={18} strokeWidth={2.5} /></button>
            </div>
            {permissionBanner}
            {actionsBar}
            {listContent}
          </div>
        </div>
      </>
    );
  }

  // ═══════════════════ DESKTOP: Floating Panel ════════════════
  return (
    <>
      <style>{`
        @keyframes ntfDesktopFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ntfDesktopFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes ntfDesktopPopIn { from { opacity: 0; transform: translateY(-50%) translateX(-50%) scale(0.9); } to { opacity: 1; transform: translateY(-50%) translateX(-50%) scale(1); } }
        @keyframes ntfDesktopPopOut { from { opacity: 1; transform: translateY(-50%) translateX(-50%) scale(1); } to { opacity: 0; transform: translateY(-50%) translateX(-50%) scale(0.9); } }
        @keyframes ntfItemIn { from { opacity: 0; transform: translateY(16px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes ntfPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
        @keyframes ntfGradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes ntfFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .ntf-desktop-panel { transition: box-shadow 0.3s ease; }
        .ntf-desktop-panel:hover { box-shadow: 0 24px 72px rgba(201, 114, 130, 0.15), 0 8px 24px rgba(160, 80, 106, 0.08), 0 0 0 1px rgba(201, 114, 130, 0.15) !important; }
      `}</style>
      <div style={{
        position: 'fixed', inset: 0,
        backgroundColor: isOpen ? 'rgba(15, 5, 10, 0.4)' : 'transparent',
        zIndex: 5000,
        animation: isOpen ? 'ntfDesktopFadeIn 0.25s ease forwards' : 'ntfDesktopFadeOut 0.3s ease forwards',
        pointerEvents: isOpen ? 'auto' : 'none',
        backdropFilter: isOpen ? 'blur(8px) saturate(1.1)' : 'blur(0)',
        transition: 'backdrop-filter 0.3s ease'
      }}>
        <div onClick={handleClose} style={{ position: 'absolute', inset: 0 }} />

        <div className="ntf-desktop-panel" style={{
          position: 'absolute', top: '50%', left: '50%',
          width: '440px', maxHeight: '80vh',
          background: 'linear-gradient(165deg, #fffafb 0%, #ffffff 25%, #fef8fa 55%, #fdf5f7 100%)',
          borderRadius: '28px', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          animation: visible
            ? 'ntfDesktopPopIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards'
            : 'ntfDesktopPopOut 0.3s cubic-bezier(0.55, 0, 1, 0.45) forwards',
          boxShadow: '0 20px 64px rgba(201, 114, 130, 0.12), 0 6px 20px rgba(160, 80, 106, 0.06), 0 0 0 1px rgba(201, 114, 130, 0.08)',
          transform: 'translateY(-50%) translateX(-50%)',
          transformOrigin: 'center center'
        }}>
          {/* Gradient top accent */}
          <div style={{
            height: '3px',
            background: 'linear-gradient(90deg, #a0506a, #c97282, #d4a0ae, #c97282, #a0506a)',
            backgroundSize: '200% 100%',
            animation: 'ntfGradientShift 4s ease infinite'
          }} />

          {/* Header */}
          <div style={{ padding: '22px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(244, 114, 146, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #c97282 0%, #a0506a 50%, #8a4560 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff',
                boxShadow: '0 5px 18px rgba(201, 114, 130, 0.3)',
                position: 'relative', backgroundSize: '200% 200%',
                animation: 'ntfGradientShift 3s ease infinite'
              }}>
                <BellRing size={20} />
                {unreadCount > 0 && (
                  <div style={{
                    position: 'absolute', top: '-3px', right: '-3px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.55rem', fontWeight: '800', color: '#fff',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 8px rgba(201, 114, 130, 0.4)',
                    animation: 'ntfPulse 2s ease-in-out infinite'
                  }}>{unreadCount}</div>
                )}
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1f1215', fontFamily: "'Playfair Display', Georgia, serif", margin: 0 }}>Notificaciones</h3>
                <span style={{ fontSize: '0.65rem', color: '#d4a0ae', fontWeight: '600' }}>
                  {notifications.length === 0 ? 'Sin novedades' : unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día ✨'}
                </span>
              </div>
            </div>
            <button onClick={handleClose} style={{
              background: 'linear-gradient(135deg, rgba(244,63,94,0.06), rgba(244,63,94,0.03))',
              border: '1.5px solid rgba(244, 63, 94, 0.1)',
              borderRadius: '12px', width: '38px', height: '38px', color: '#c97282', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #c97282, #a0506a)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'rotate(90deg) scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(201,114,130,0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,114,130,0.06), rgba(201,114,130,0.03))'; e.currentTarget.style.color = '#c97282'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            ><X size={17} strokeWidth={2.5} /></button>
          </div>

          <div style={{ padding: '16px 24px 0' }}>{permissionBanner}</div>
          <div style={{ padding: '0 24px' }}>{actionsBar}</div>
          {listContent}
        </div>
      </div>
    </>
  );
};

export default NotificationsDrawer;
