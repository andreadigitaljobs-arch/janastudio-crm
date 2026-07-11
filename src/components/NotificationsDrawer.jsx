import React, { useState, useEffect } from 'react';
import { Bell, X, Trash2, CheckCheck, Sparkles, Smartphone, BellRing, Inbox, Heart, Calendar, DollarSign, User, ArrowLeft } from 'lucide-react';
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
  const permissionBanner = null;


  // ─── Shared Actions Bar ────────────────────────────────────
  const actionsBar = notifications.length > 0 && (
    <div style={{ display: 'flex', gap: '8px', padding: isMobile ? '0 20px 14px' : '0 0 14px', animation: 'ntfItemIn 0.4s ease 0.15s both' }}>
      <button onClick={handleMarkAllRead} style={{
        flex: 1, padding: '9px 0', borderRadius: '12px',
        background: 'linear-gradient(135deg, #fdf2f4, #f8e8ec)',
        border: '1px solid rgba(201, 114, 130, 0.2)',
        color: '#a0506a', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
        transition: 'all 0.25s ease'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #f8e8ec, #f0d9e1)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(201,114,130,0.15)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #fdf2f4, #f8e8ec)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
      ><CheckCheck size={14} /> Marcar leídas</button>
      <button onClick={handleClearHistory} style={{
        flex: 1, padding: '9px 0', borderRadius: '12px',
        background: 'linear-gradient(135deg, #fae8e4, #f5d8d2)',
        border: '1px solid rgba(180, 100, 90, 0.2)',
        color: '#8a4560', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
        transition: 'all 0.25s ease'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #f5d8d2, #edc4bc)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(180,100,90,0.15)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #fae8e4, #f5d8d2)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
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
            <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1f1215', display: 'block', }}>Todo tranquilo</span>
            <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginTop: '6px', lineHeight: '1.5' }}>No hay notificaciones nuevas.<br/>Vuelve más tarde 💕</span>
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

          return Object.entries(grouped).map(([groupName, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={groupName} style={{ marginBottom: '8px' }}>
                <h4 style={isMobile
                  ? { fontSize: '0.95rem', fontWeight: 800, color: '#1f1215', marginBottom: '8px', paddingLeft: '4px' }
                  : { fontSize: '0.75rem', fontWeight: 800, color: '#a0506a', marginBottom: '8px', paddingLeft: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }
                }>{groupName}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '2px' : '8px' }}>
                  {items.map((n, idx) => {
                    let IconComponent = Bell;
                    let iconBg = '#8b7cf6';
                    const titleLower = n.title.toLowerCase();
                    if (titleLower.includes('cita') || titleLower.includes('reserva')) { IconComponent = Calendar; iconBg = '#c97282'; }
                    else if (titleLower.includes('pago') || titleLower.includes('cobro') || titleLower.includes('oferta')) { IconComponent = DollarSign; iconBg = '#22c55e'; }
                    else if (titleLower.includes('client')) { IconComponent = User; iconBg = '#3b82f6'; }

                    if (isMobile) {
                      return (
                        <div
                          key={n.id}
                          className="ntf-card-flat"
                          style={{
                            display: 'flex', gap: '12px', alignItems: 'flex-start',
                            padding: '14px 4px', cursor: 'default',
                            animation: `ntfItemIn 0.4s ease ${0.1 + idx * 0.06}s both`
                          }}
                        >
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0,
                            background: iconBg, color: '#ffffff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}><IconComponent size={17} /></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                              <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1f1215', margin: 0, lineHeight: '1.3', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {n.title}
                                {!n.read && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c97282', flexShrink: 0 }} />}
                              </h4>
                              <span style={{ fontSize: '0.68rem', color: '#9ca3af', fontWeight: '500', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                {new Date(n.date).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p style={{
                              fontSize: '0.76rem', color: '#8a8086', margin: '3px 0 0 0', lineHeight: '1.45',
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                            }}>{n.body}</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={n.id} className="ntf-card" style={{
                        padding: '14px 16px', borderRadius: '16px',
                        opacity: n.read ? 0.7 : 1,
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
                          e.currentTarget.style.opacity = '1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = n.read
                          ? 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)'
                          : 'linear-gradient(135deg, #fdf2f4 0%, #f8e8ec 40%, #f5e1e7 100%)';
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                        if (n.read) e.currentTarget.style.opacity = '0.7';
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
                          }}><IconComponent size={16} /></div>
                          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                            <h4 style={{ fontSize: n.read ? '0.78rem' : '0.85rem', fontWeight: n.read ? '600' : '800', color: n.read ? '#4a3f44' : '#1f1215', margin: '0 0 4px 0', lineHeight: '1.3', wordBreak: 'break-word' }}>{n.title}</h4>
                            <p style={{ fontSize: '0.7rem', color: n.read ? '#8a8086' : '#5b4b5b', margin: '0 0 6px 0', lineHeight: '1.5', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{n.body}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                fontSize: '0.6rem', color: '#9ca3af', fontWeight: '600',
                                background: 'rgba(0,0,0,0.03)', padding: '2px 8px', borderRadius: '6px'
                              }}>
                                {new Date(n.date).toLocaleDateString('es-VE', { hour: '2-digit', minute: '2-digit' })}
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
                    );
                  })}
                </div>
              </div>
            );
          });
      })()}
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
          .ntf-card-flat { border-radius: 14px; transition: background 0.15s ease; }
          .ntf-card-flat:active { background: rgba(0,0,0,0.03); }
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
            {/* Header — plain back arrow + title, no gradient blob */}
            <div style={{ padding: '4px 20px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button onClick={handleClose} style={{
                background: 'transparent', border: 'none', width: '32px', height: '32px',
                color: '#1f1215', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}><ArrowLeft size={22} /></button>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1f1215', margin: 0 }}>Notificaciones</h3>
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
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1f1215', margin: 0 }}>Notificaciones</h3>
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

          {/* <div style={{ padding: '16px 24px 0' }}>{permissionBanner}</div> */}
          <div style={{ padding: '0 24px' }}>{actionsBar}</div>
          {listContent}
        </div>
      </div>
    </>
  );
};

export default NotificationsDrawer;
