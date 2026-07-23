import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Clock3, Play, Receipt, RefreshCw, Scissors, Sparkles, UserRound,
} from 'lucide-react';
import { getStaffDisplayName } from '../utils/stringUtils';

const SALON_TOKENS = {
  ink: '#3f3035',
  muted: '#937b83',
  rose: '#b65f7b',
  roseSoft: '#f8ecef',
  blush: '#fff8f8',
  border: 'rgba(160,80,106,0.14)',
  success: '#26935c',
  successSoft: '#edf9f2',
  warning: '#b8791f',
  warningSoft: '#fff7e8',
  shadow: '0 14px 36px rgba(100,54,68,0.09)',
};

const STATUS_META = {
  'en silla': {
    label: 'En preparación',
    eyebrow: 'Sala de bienvenida',
    color: SALON_TOKENS.warning,
    background: SALON_TOKENS.warningSoft,
    action: 'Comenzar servicio',
    icon: Play,
  },
  'en tratamiento': {
    label: 'Servicio en curso',
    eyebrow: 'Estación activa',
    color: SALON_TOKENS.rose,
    background: SALON_TOKENS.roseSoft,
    action: 'Finalizar servicio',
    icon: CheckCircle2,
  },
  'por pagar': {
    label: 'Lista para caja',
    eyebrow: 'Servicio finalizado',
    color: SALON_TOKENS.success,
    background: SALON_TOKENS.successSoft,
    action: 'Abrir en Caja',
    icon: Receipt,
  },
};

const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

const getServiceNames = (appointment) => {
  const names = (appointment.appointment_services || [])
    .map((service) => service.services?.name)
    .filter(Boolean);
  return names.join(' + ') || appointment.services?.name || 'Servicio sin nombre';
};

const getStaffNames = (appointment) => {
  const names = (appointment.appointment_services || [])
    .map((service) => service.staff)
    .filter(Boolean)
    .map(getStaffDisplayName);
  return [...new Set(names)].join(', ')
    || (appointment.staff ? getStaffDisplayName(appointment.staff) : 'Profesional por confirmar');
};

const getDuration = (appointment) => {
  const serviceDuration = (appointment.appointment_services || [])
    .reduce((sum, service) => sum + (Number(service.duration_minutes) || 0), 0);
  return serviceDuration || Number(appointment.services?.duration_minutes) || 60;
};

const formatElapsed = (startValue, now) => {
  const start = new Date(startValue).getTime();
  if (!Number.isFinite(start)) return 'Recién registrada';
  const minutes = Math.max(0, Math.floor((now - start) / 60000));
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours} h${remainder ? ` ${remainder} min` : ''}`;
};

export default function LiveSalonPanel({
  appointments = [],
  loading = false,
  isMobile = false,
  error = '',
  onRefresh,
  onStart,
  onFinish,
  onCheckout,
}) {
  const [now, setNow] = useState(Date.now());
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const liveAppointments = useMemo(() => {
    const statusOrder = { 'por pagar': 0, 'en tratamiento': 1, 'en silla': 2 };
    return appointments
      .filter((appointment) => STATUS_META[normalizeStatus(appointment.status)])
      .sort((a, b) => (
        statusOrder[normalizeStatus(a.status)] - statusOrder[normalizeStatus(b.status)]
        || new Date(a.created_at || 0) - new Date(b.created_at || 0)
      ));
  }, [appointments]);

  const metrics = useMemo(() => ({
    preparing: liveAppointments.filter((appointment) => normalizeStatus(appointment.status) === 'en silla').length,
    active: liveAppointments.filter((appointment) => normalizeStatus(appointment.status) === 'en tratamiento').length,
    checkout: liveAppointments.filter((appointment) => normalizeStatus(appointment.status) === 'por pagar').length,
  }), [liveAppointments]);

  const visibleAppointments = showAll ? liveAppointments : liveAppointments.slice(0, 3);

  const handleAction = (appointment) => {
    const status = normalizeStatus(appointment.status);
    if (status === 'en silla') onStart?.(appointment.id);
    if (status === 'en tratamiento') onFinish?.(appointment.id);
    if (status === 'por pagar') onCheckout?.(appointment.id);
  };

  return (
    <section
      aria-labelledby="live-salon-title"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: isMobile ? '16px' : '18px',
        borderRadius: '20px',
        border: `1px solid ${SALON_TOKENS.border}`,
        background: 'linear-gradient(145deg, #fff 0%, #fffafa 72%, #f9eef1 100%)',
        boxShadow: SALON_TOKENS.shadow,
      }}
    >
      <div aria-hidden="true" style={{ position: 'absolute', width: '150px', height: '150px', borderRadius: '50%', border: `1px solid ${SALON_TOKENS.border}`, top: '-86px', right: '-48px' }} />
      <header style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '12px', display: 'grid', placeItems: 'center', color: '#fff', background: SALON_TOKENS.rose, boxShadow: '0 8px 18px rgba(160,80,106,0.2)' }}>
              <Sparkles size={17} />
            </div>
            <div>
              <h4 id="live-salon-title" style={{ margin: 0, color: SALON_TOKENS.ink, fontFamily: 'var(--font-display)', fontSize: '0.92rem', fontWeight: 800 }}>Salón en vivo</h4>
              <div style={{ marginTop: '2px', color: SALON_TOKENS.muted, fontSize: '0.61rem' }}>Operación actual del estudio</div>
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Actualizar Salón en vivo"
          onClick={onRefresh}
          disabled={loading}
          style={{ width: '36px', height: '36px', borderRadius: '11px', border: `1px solid ${SALON_TOKENS.border}`, background: '#fff', color: SALON_TOKENS.rose, display: 'grid', placeItems: 'center', cursor: loading ? 'wait' : 'pointer' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '7px', marginBottom: '14px' }}>
        {[
          { label: 'Preparándose', value: metrics.preparing, color: SALON_TOKENS.warning },
          { label: 'En servicio', value: metrics.active, color: SALON_TOKENS.rose },
          { label: 'Para cobrar', value: metrics.checkout, color: SALON_TOKENS.success },
        ].map((metric) => (
          <div key={metric.label} style={{ padding: '9px 6px', borderRadius: '12px', textAlign: 'center', background: '#fff', border: `1px solid ${SALON_TOKENS.border}` }}>
            <div style={{ color: metric.color, fontSize: '1.05rem', fontWeight: 850, lineHeight: 1 }}>{metric.value}</div>
            <div style={{ marginTop: '4px', color: SALON_TOKENS.muted, fontSize: '0.54rem', lineHeight: 1.2 }}>{metric.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div role="alert" style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '12px', color: '#9b5f13', background: SALON_TOKENS.warningSoft, border: '1px solid rgba(184,121,31,0.2)', fontSize: '0.61rem', lineHeight: 1.45 }}>
          {error}
        </div>
      )}

      {liveAppointments.length === 0 ? (
        <div style={{ position: 'relative', padding: '24px 14px', borderRadius: '16px', textAlign: 'center', background: SALON_TOKENS.blush, border: `1px dashed ${SALON_TOKENS.border}` }}>
          <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
            {[0, 1, 2].map((station) => (
              <div key={station} style={{ width: '38px', height: '38px', borderRadius: '13px', display: 'grid', placeItems: 'center', background: '#fff', color: '#d7b2bd', border: `1px solid ${SALON_TOKENS.border}` }}>
                <Scissors size={14} />
              </div>
            ))}
          </div>
          <strong style={{ display: 'block', color: SALON_TOKENS.ink, fontSize: '0.74rem' }}>El salón está libre</strong>
          <span style={{ display: 'block', marginTop: '4px', color: SALON_TOKENS.muted, fontSize: '0.61rem', lineHeight: 1.45 }}>Al iniciar una atención aparecerá aquí con su estación y profesional.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {visibleAppointments.map((appointment, index) => {
            const status = normalizeStatus(appointment.status);
            const meta = STATUS_META[status];
            const ActionIcon = meta.icon;
            const timeOrigin = status === 'en tratamiento'
              ? appointment.started_at || appointment.scheduled_at || appointment.created_at
              : status === 'por pagar'
                ? appointment.completed_at || appointment.started_at || appointment.created_at
                : appointment.created_at || appointment.scheduled_at;
            return (
              <article key={appointment.id} style={{ padding: '13px', borderRadius: '16px', background: '#fff', border: `1px solid ${SALON_TOKENS.border}`, boxShadow: '0 6px 18px rgba(100,54,68,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div aria-label={`Estación ${index + 1}`} style={{ width: '42px', height: '42px', flexShrink: 0, borderRadius: '14px', display: 'grid', placeItems: 'center', color: meta.color, background: meta.background, border: `1px solid ${meta.color}22` }}>
                    <Scissors size={17} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ color: meta.color, fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{meta.eyebrow}</div>
                        <strong style={{ display: 'block', marginTop: '2px', color: SALON_TOKENS.ink, fontSize: '0.76rem', lineHeight: 1.25 }}>{appointment.clients?.name || 'Clienta'}</strong>
                      </div>
                      <span style={{ padding: '3px 7px', borderRadius: '999px', whiteSpace: 'nowrap', color: meta.color, background: meta.background, fontSize: '0.53rem', fontWeight: 800 }}>{meta.label}</span>
                    </div>
                    <div style={{ marginTop: '7px', display: 'flex', flexDirection: 'column', gap: '4px', color: SALON_TOKENS.muted, fontSize: '0.6rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Sparkles size={11} /> {getServiceNames(appointment)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><UserRound size={11} /> {getStaffNames(appointment)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Clock3 size={11} /> {formatElapsed(timeOrigin, now)} · {getDuration(appointment)} min estimados</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAction(appointment)}
                  disabled={loading}
                  style={{
                    width: '100%', minHeight: '40px', marginTop: '11px', borderRadius: '11px',
                    border: `1px solid ${meta.color}26`, background: meta.background, color: meta.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    cursor: loading ? 'wait' : 'pointer', fontSize: '0.64rem', fontWeight: 800,
                  }}
                >
                  <ActionIcon size={13} /> {meta.action}
                </button>
              </article>
            );
          })}
          {liveAppointments.length > 3 && (
            <button type="button" onClick={() => setShowAll((current) => !current)} style={{ minHeight: '38px', border: 'none', background: 'transparent', color: SALON_TOKENS.rose, cursor: 'pointer', fontSize: '0.63rem', fontWeight: 750 }}>
              {showAll ? 'Ver menos estaciones' : `Ver las ${liveAppointments.length} atenciones`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
