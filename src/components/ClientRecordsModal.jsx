import React from 'react';
import { Calendar, ChevronRight, X } from 'lucide-react';
import AnimatedModal from './AnimatedModal';

const statusColors = {
  active: ['rgba(34,197,94,0.1)', '#1f9d55'],
  completed: ['rgba(160,80,106,0.08)', '#a0506a'],
  expired: ['rgba(239,68,68,0.09)', '#dc2626'],
  scheduled: ['rgba(59,130,246,0.09)', '#2563eb'],
  paid: ['rgba(34,197,94,0.1)', '#1f9d55'],
};

export default function ClientRecordsModal({ isOpen, title, subtitle, items = [], emptyMessage = 'No hay registros disponibles.', onClose, onItemClick }) {
  return (
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div
          className={overlayClass}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px', background: 'rgba(74,48,54,0.52)', backdropFilter: 'blur(8px)' }}
        >
          <section
            className={cardClass}
            onClick={(event) => event.stopPropagation()}
            aria-labelledby="client-records-title"
            style={{ width: '100%', maxWidth: '620px', maxHeight: '86vh', overflowY: 'auto', borderRadius: '26px', padding: '24px', background: '#fff', border: '1px solid rgba(212,160,154,.28)', boxShadow: '0 24px 70px rgba(74,48,54,.2)' }}
          >
            <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
              <div>
                <h3 id="client-records-title" style={{ margin: 0, color: 'var(--text-primary)', fontSize: '20px', fontWeight: 900 }}>{title}</h3>
                {subtitle && <p style={{ margin: '5px 0 0', color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.45 }}>{subtitle}</p>}
              </div>
              <button type="button" onClick={onClose} aria-label="Cerrar" style={{ width: '34px', height: '34px', borderRadius: '50%', border: 'none', background: 'rgba(160,80,106,.08)', color: 'var(--magenta-primary)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <X size={17} />
              </button>
            </header>

            {items.length === 0 ? (
              <div style={{ padding: '34px 18px', borderRadius: '18px', textAlign: 'center', background: '#fff8f8', color: 'var(--text-muted)', fontSize: '13px' }}>{emptyMessage}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.map((item) => {
                  const normalizedStatus = String(item.status || '').toLowerCase();
                  const [statusBg, statusColor] = statusColors[normalizedStatus] || ['rgba(160,80,106,.07)', '#8b6972'];
                  const Wrapper = onItemClick ? 'button' : 'article';
                  return (
                    <Wrapper
                      key={item.id}
                      type={onItemClick ? 'button' : undefined}
                      onClick={onItemClick ? () => onItemClick(item) : undefined}
                      style={{ width: '100%', border: '1px solid rgba(212,160,154,.2)', borderRadius: '16px', padding: '14px', background: '#fffafa', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', cursor: onItemClick ? 'pointer' : 'default', color: 'inherit' }}
                    >
                      <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(160,80,106,.08)', color: 'var(--magenta-primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <Calendar size={17} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.title}</strong>
                          {item.status && <span style={{ padding: '2px 7px', borderRadius: '999px', background: statusBg, color: statusColor, fontSize: '9px', fontWeight: 850, textTransform: 'uppercase' }}>{item.statusLabel || item.status}</span>}
                        </div>
                        {item.subtitle && <div style={{ marginTop: '3px', fontSize: '11px', color: 'var(--text-muted)' }}>{item.subtitle}</div>}
                        {item.details?.length > 0 && (
                          <div style={{ marginTop: '7px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {item.details.filter(Boolean).map((detail, index) => <span key={`${item.id}-${index}`} style={{ fontSize: '10px', color: 'var(--text-secondary)', background: 'white', padding: '3px 7px', borderRadius: '8px' }}>{detail}</span>)}
                          </div>
                        )}
                      </div>
                      {item.amount && <strong style={{ color: 'var(--magenta-primary)', fontSize: '14px', whiteSpace: 'nowrap' }}>{item.amount}</strong>}
                      {onItemClick && <ChevronRight size={15} color="var(--text-muted)" />}
                    </Wrapper>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </AnimatedModal>
  );
}