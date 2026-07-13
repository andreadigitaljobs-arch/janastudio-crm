import React, { useState, useMemo } from 'react';
import { MessageCircle, CheckCircle, Search, Cake, Sparkles } from 'lucide-react';
import {
  getBirthdaysWithCountdown,
  filterBirthdaysByPeriod,
  groupBirthdaysByMonth,
  formatBirthdayDate,
} from '../utils/birthdays';
import { buildBirthdayMessage } from '../utils/birthdayMessage';

const FILTERS = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'year', label: 'Año completo' },
];

const getWhatsAppNumber = (phone) => {
  if (!phone) return '';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0') && clean.length === 11) return '58' + clean.slice(1);
  if (clean.length === 10) return '58' + clean;
  return clean;
};

const getInitials = (name = '') => (
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
);

const daysLeftLabel = (daysLeft) => {
  if (daysLeft === 0) return '¡Hoy!';
  if (daysLeft === 1) return 'Mañana';
  return `En ${daysLeft} días`;
};

const BirthdayModule = ({ clients, isMobile, demoMode, onToggleDemo }) => {
  const [filter, setFilter] = useState('today');
  const [search, setSearch] = useState('');
  const [contacted, setContacted] = useState({});

  const allBirthdays = useMemo(() => getBirthdaysWithCountdown(clients), [clients]);

  const filtered = useMemo(() => {
    let list = filterBirthdaysByPeriod(allBirthdays, filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => (c.name || '').toLowerCase().includes(q));
    }
    return list;
  }, [allBirthdays, filter, search]);

  const groups = useMemo(
    () => (filter === 'year' ? groupBirthdaysByMonth(filtered) : null),
    [filter, filtered]
  );

  const toggleContacted = (id) => setContacted((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleWhatsApp = (client) => {
    const message = buildBirthdayMessage(client.name);
    const url = `https://wa.me/${getWhatsAppNumber(client.phone)}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    toggleContacted(client.id);
  };

  const renderCard = (c) => {
    const isFeatured = c.daysLeft === 0;
    const isSoon = c.daysLeft > 0 && c.daysLeft <= 7;

    return (
      <div
        key={c.id}
        className="glass-card interactive-hover-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: isFeatured ? '16px 18px' : '13px 16px',
          borderRadius: '18px',
          background: isFeatured
            ? 'linear-gradient(120deg, rgba(160,80,106,0.16) 0%, rgba(248,219,217,0.45) 100%)'
            : (contacted[c.id] ? 'rgba(160,80,106,0.04)' : 'white'),
          border: isFeatured ? '1px solid var(--pink-primary)' : '1px solid var(--border-color)',
          boxShadow: isFeatured ? '0 10px 28px rgba(160,80,106,0.16)' : 'none',
          position: 'relative',
        }}
      >
        <div style={{
          width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
          background: isFeatured ? 'var(--magenta-gradient)' : 'linear-gradient(135deg, rgba(160,80,106,0.22), rgba(160,80,106,0.1))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid white', boxShadow: '0 2px 6px rgba(160,80,106,0.15)',
        }}>
          {isFeatured ? (
            <Cake size={18} color="white" />
          ) : (
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--pink-primary)' }}>{getInitials(c.name)}</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? '16px' : '14px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.3', minWidth: 0 }}>{c.name}</div>
            {c.isDemo && (
              <span style={{ fontSize: '9px', fontWeight: '750', color: 'var(--pink-primary)', background: 'rgba(160,80,106,0.15)', padding: '2px 6px', borderRadius: '8px', flexShrink: 0 }}>demo</span>
            )}
          </div>
          <div style={{ fontSize: isMobile ? '14px' : '12.5px', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: '500', whiteSpace: 'nowrap' }}>
            {isMobile
              ? `${c.targetDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · ${c.turningAge} años`
              : `${formatBirthdayDate(c.targetDate)} · Cumple ${c.turningAge} años`}
          </div>
        </div>

        <div style={{
          fontSize: isMobile ? '13px' : '11px', fontWeight: '750',
          color: isFeatured ? 'white' : (isSoon ? 'var(--pink-primary)' : 'var(--text-secondary)'),
          padding: isMobile ? '8px 12px' : '5px 12px', borderRadius: '10px',
          background: isFeatured ? 'var(--magenta-gradient)' : (isSoon ? 'rgba(160,80,106,0.12)' : 'rgba(160,80,106,0.05)'),
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {daysLeftLabel(c.daysLeft)}
        </div>

        {!isMobile && (
          <button
            onClick={() => !c.isDemo && handleWhatsApp(c)}
            disabled={c.isDemo}
            title={c.isDemo ? 'Clienta demo, sin WhatsApp real' : undefined}
            className="btn-interactive"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: isMobile ? '10px 14px' : '7px 14px',
              borderRadius: '12px', fontSize: isMobile ? '13px' : '11.5px', fontWeight: '750', flexShrink: 0,
              color: c.isDemo ? 'var(--text-muted)' : '#128C7E',
              backgroundColor: c.isDemo ? 'rgba(160,80,106,0.06)' : 'rgba(18,140,126,0.06)',
              border: c.isDemo ? '1px solid var(--border-color)' : '1px solid rgba(18,140,126,0.15)',
              cursor: c.isDemo ? 'not-allowed' : 'pointer',
            }}
          >
            <MessageCircle size={13} color={c.isDemo ? 'var(--text-muted)' : '#128C7E'} /> Felicitar
          </button>
        )}
        <button
          onClick={() => toggleContacted(c.id)}
          title="Marcar como felicitada"
          style={{
            padding: '8px', borderRadius: '12px', border: 'none', flexShrink: 0,
            background: contacted[c.id] ? 'var(--success, #4caf82)' : 'rgba(160,80,106,0.06)',
            cursor: 'pointer', display: 'flex',
          }}
        >
          <CheckCircle size={18} color={contacted[c.id] ? 'white' : 'var(--text-muted)'} />
        </button>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Demo preview toggle */}
      <div
        onClick={onToggleDemo}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
          padding: '10px 16px', borderRadius: '14px', marginBottom: '16px', cursor: 'pointer',
          border: demoMode ? '1px solid var(--pink-primary)' : '1px solid var(--border-color)',
          background: demoMode ? 'rgba(160,80,106,0.08)' : 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={15} color="var(--pink-primary)" />
          <span style={{ fontSize: isMobile ? '14px' : '12.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Vista previa con clientas demo 🐱
          </span>
        </div>
        <div style={{
          width: '38px', height: '22px', borderRadius: '20px', flexShrink: 0, position: 'relative',
          background: demoMode ? 'var(--magenta-gradient)' : 'rgba(160,80,106,0.15)', transition: 'all 0.2s',
        }}>
          <div style={{
            position: 'absolute', top: '2px', left: demoMode ? '18px' : '2px',
            width: '18px', height: '18px', borderRadius: '50%', background: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'all 0.2s',
          }} />
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Buscar clienta por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', padding: isMobile ? '12px 14px 12px 40px' : '10px 14px 10px 40px', borderRadius: '12px',
            border: '1px solid var(--border-color)', backgroundColor: 'white',
            fontSize: isMobile ? '15px' : '13px', color: 'var(--text-primary)', outline: 'none',
          }}
        />
      </div>

      {/* Filter pills */}
      <div style={isMobile
        ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }
        : { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: isMobile ? '12px 16px' : '7px 16px', borderRadius: isMobile ? '14px' : '20px',
              border: filter === f.key ? '1px solid var(--pink-primary)' : '1px solid var(--border-color)',
              backgroundColor: filter === f.key ? 'rgba(160, 80, 106,0.1)' : 'white',
              color: filter === f.key ? 'var(--pink-primary)' : 'var(--text-secondary)',
              fontSize: isMobile ? '14px' : '12px', fontWeight: '700', cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 20px', color: 'var(--text-muted)', gap: '10px',
        }}>
          <Cake size={36} color="var(--pink-primary)" style={{ opacity: 0.5 }} />
          <div style={{ fontSize: '13px', fontWeight: '600' }}>No hay cumpleaños en este rango.</div>
        </div>
      ) : groups ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {groups.map((g) => (
            <div key={g.monthIndex}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                <h3 style={{
                  fontSize: isMobile ? '16px' : '13px', fontWeight: '850', color: 'var(--text-primary)',
                  textTransform: 'uppercase', letterSpacing: '0.4px', margin: 0,
                }}>
                  {g.month}
                </h3>
                <span style={{ fontSize: isMobile ? '14px' : '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  · {g.clients.length} {g.clients.length === 1 ? 'cumpleaños' : 'cumpleaños'}
                </span>
              </div>
              <div style={{
                height: '2px', width: '100%', borderRadius: '2px', marginBottom: '14px',
                background: 'linear-gradient(90deg, var(--pink-primary), rgba(160,80,106,0))',
              }} />
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(440px, 1fr))', gap: '10px' }}>
                {g.clients.map(renderCard)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(440px, 1fr))', gap: '10px' }}>
          {filtered.map(renderCard)}
        </div>
      )}
    </div>
  );
};

export default BirthdayModule;
