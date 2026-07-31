import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, Send, Clock, CheckCircle, XCircle, AlertTriangle, 
  Trash2, RefreshCw, Filter, Calendar, MessageCircle, 
  ChevronDown, ChevronUp, Settings, Loader
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { notificationService } from '../services/notificationService';

const STATUS_CONFIG = {
  pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Clock, label: 'Pendiente' },
  sent: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle, label: 'Enviado' },
  failed: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: XCircle, label: 'Fallido' },
  cancelled: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: XCircle, label: 'Cancelado' },
};

const TYPE_CONFIG = {
  birthday: { label: 'Cumpleaños', color: '#ec4899', icon: '🎂' },
  reminder: { label: 'Recordatorio', color: '#3b82f6', icon: '📅' },
  thank_you: { label: 'Agradecimiento', color: '#10b981', icon: '💖' },
  promotion: { label: 'Promoción', color: '#8b5cf6', icon: '🎉' },
  custom: { label: 'Personalizado', color: '#6b7280', icon: '✉️' },
};

const NotificationQueuePanel = ({ isMobile }) => {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ pending: 0, sent: 0, failed: 0, today: 0, by_type: {} });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [templates, setTemplates] = useState({});
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateValue, setTemplateValue] = useState('');
  const [processingQueue, setProcessingQueue] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notifs, statsData, templatesData] = await Promise.all([
        dataService.getNotificationQueue({ limit: 200 }),
        dataService.getNotificationStats(),
        dataService.getNotificationTemplates()
      ]);
      setNotifications(notifs);
      setStats(statsData);
      setTemplates(templatesData);
    } catch (err) {
      console.error('Error loading notification data:', err);
      notificationService.sendNotification('Error', 'No se pudo cargar la cola de notificaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (filter !== 'all' && n.status !== filter) return false;
      if (typeFilter !== 'all' && n.type !== typeFilter) return false;
      return true;
    });
  }, [notifications, filter, typeFilter]);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta notificación?')) return;
    try {
      await dataService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      notificationService.sendNotification('Éxito', 'Notificación eliminada.');
    } catch (err) {
      notificationService.sendNotification('Error', 'No se pudo eliminar.');
    }
  };

  const handleCancel = async (id) => {
    try {
      await dataService.cancelNotification(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'cancelled' } : n));
      notificationService.sendNotification('Éxito', 'Notificación cancelada.');
    } catch (err) {
      notificationService.sendNotification('Error', 'No se pudo cancelar.');
    }
  };

  const handleSaveTemplate = async (type) => {
    try {
      await dataService.saveNotificationTemplate(type, templateValue);
      setTemplates(prev => ({ ...prev, [type]: templateValue }));
      setEditingTemplate(null);
      notificationService.sendNotification('Éxito', 'Plantilla guardada.');
    } catch (err) {
      notificationService.sendNotification('Error', 'No se pudo guardar la plantilla.');
    }
  };

  const handleQueueBirthdays = async () => {
    try {
      const count = await dataService.queueBirthdayNotifications();
      notificationService.sendNotification('Éxito', `${count} notificación(es) de cumpleaños encolada(s).`);
      loadData();
    } catch (err) {
      notificationService.sendNotification('Error', 'No se pudieron encolar cumpleaños.');
    }
  };

  const handleQueueLaserReminders = async () => {
    try {
      const count = await dataService.queueLaserReminders();
      notificationService.sendNotification('Éxito', `${count} recordatorio(s) de láser encolado(s).`);
      loadData();
    } catch (err) {
      notificationService.sendNotification('Error', 'No se pudieron encolar recordatorios.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const renderStats = () => (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
      gap: '12px', 
      marginBottom: '20px' 
    }}>
      {[
        { label: 'Pendientes', value: stats.pending, color: '#f59e0b', icon: Clock },
        { label: 'Enviadas', value: stats.sent, color: '#10b981', icon: CheckCircle },
        { label: 'Fallidas', value: stats.failed, color: '#ef4444', icon: XCircle },
        { label: 'Hoy', value: stats.today, color: '#3b82f6', icon: Calendar },
      ].map((stat, i) => (
        <div key={i} style={{
          padding: '16px',
          borderRadius: '14px',
          background: 'white',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: `${stat.color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <stat.icon size={18} color={stat.color} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>{stat.value}</div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderFilters = () => (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: '4px', background: 'white', borderRadius: '10px', padding: '4px', border: '1px solid var(--border-color)' }}>
        {['all', 'pending', 'sent', 'failed'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: filter === s ? 'var(--pink-primary)' : 'transparent',
              color: filter === s ? 'white' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            {s === 'all' ? 'Todas' : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '4px', background: 'white', borderRadius: '10px', padding: '4px', border: '1px solid var(--border-color)' }}>
        {['all', 'birthday', 'reminder', 'thank_you', 'promotion'].map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: typeFilter === t ? TYPE_CONFIG[t]?.color || 'var(--pink-primary)' : 'transparent',
              color: typeFilter === t ? 'white' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            {TYPE_CONFIG[t]?.icon} {TYPE_CONFIG[t]?.label || t}
          </button>
        ))}
      </div>
    </div>
  );

  const renderNotificationCard = (notif) => {
    const statusCfg = STATUS_CONFIG[notif.status] || STATUS_CONFIG.pending;
    const typeCfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.custom;
    const isExpanded = expandedId === notif.id;

    return (
      <div key={notif.id} style={{
        background: 'white',
        borderRadius: '14px',
        border: '1px solid var(--border-color)',
        marginBottom: '8px',
        overflow: 'hidden',
      }}>
        <div
          onClick={() => setExpandedId(isExpanded ? null : notif.id)}
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: `${typeCfg.color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            flexShrink: 0,
          }}>
            {typeCfg.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{notif.recipient_name}</span>
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                color: statusCfg.color,
                background: statusCfg.bg,
                padding: '2px 6px',
                borderRadius: '6px',
              }}>
                {statusCfg.label}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {notif.message?.substring(0, 60)}{notif.message?.length > 60 ? '...' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatDate(notif.scheduled_for)}</span>
            {isExpanded ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
          </div>
        </div>
        
        {isExpanded && (
          <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ marginTop: '12px', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>MENSAJE COMPLETO:</div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5' }}>{notif.message}</div>
            </div>
            {notif.recipient_phone && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                📱 {notif.recipient_phone}
              </div>
            )}
            {notif.error_message && (
              <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(239,68,68,0.05)', borderRadius: '8px', fontSize: '11px', color: '#ef4444' }}>
                ⚠️ {notif.error_message}
              </div>
            )}
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              {notif.status === 'pending' && (
                <button
                  onClick={() => handleCancel(notif.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'white',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => handleDelete(notif.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.05)',
                  color: '#ef4444',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Trash2 size={12} /> Eliminar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTemplates = () => (
    <div style={{
      background: 'white',
      borderRadius: '14px',
      border: '1px solid var(--border-color)',
      padding: '20px',
      marginTop: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Settings size={16} color="var(--pink-primary)" />
        <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Plantillas de Mensajes</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Object.entries(TYPE_CONFIG).filter(([key]) => key !== 'custom').map(([key, config]) => (
          <div key={key} style={{ padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>{config.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{config.label}</span>
              </div>
              <button
                onClick={() => {
                  setEditingTemplate(key);
                  setTemplateValue(templates[key] || '');
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'white',
                  fontSize: '10px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Editar
              </button>
            </div>
            {editingTemplate === key ? (
              <div>
                <textarea
                  value={templateValue}
                  onChange={(e) => setTemplateValue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    minHeight: '60px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
                <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleSaveTemplate(key)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'var(--pink-primary)',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingTemplate(null)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'white',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {templates[key] || 'Sin plantilla configurada'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bell size={20} color="var(--pink-primary)" />
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Cola de Notificaciones</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>Preparación para integración WhatsApp</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          style={{
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Actualizar
        </button>
      </div>

      {renderStats()}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={handleQueueBirthdays}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #ec4899 0%, #d946a8 100%)',
            color: 'white',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          🎂 Encolar Cumpleaños
        </button>
        <button
          onClick={handleQueueLaserReminders}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          📅 Encolar Recordatorios Láser
        </button>
      </div>

      {renderFilters()}

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader className="spin" size={24} />
            <div style={{ marginTop: '12px', fontSize: '13px' }}>Cargando notificaciones...</div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Bell size={32} style={{ opacity: 0.5 }} />
            <div style={{ marginTop: '12px', fontSize: '13px' }}>No hay notificaciones en la cola</div>
          </div>
        ) : (
          filteredNotifications.map(renderNotificationCard)
        )}
      </div>

      {renderTemplates()}
    </div>
  );
};

export default NotificationQueuePanel;
