import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, HelpCircle, X, CheckCircle } from 'lucide-react';

/**
 * JanaDialog — Modal premium que reemplaza alert(), confirm() y prompt() del navegador.
 * Tipos: 'alert' | 'confirm' | 'confirm-danger' | 'prompt' | 'warning'
 */
const TYPE_CONFIG = {
  'alert': {
    icon: Info,
    iconBg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    iconShadow: 'rgba(59,130,246,0.35)',
    confirmClass: 'btn-blue',
    confirmStyle: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      color: '#fff',
      boxShadow: '0 6px 20px rgba(59,130,246,0.35)',
    },
  },
  'confirm': {
    icon: HelpCircle,
    iconBg: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    iconShadow: 'rgba(168,85,247,0.35)',
    confirmStyle: {
      background: 'linear-gradient(135deg, #c97282 0%, #a0506a 100%)',
      color: '#fff',
      boxShadow: '0 6px 20px rgba(160,80,106,0.35)',
    },
  },
  'confirm-danger': {
    icon: Trash2,
    iconBg: 'linear-gradient(135deg, #ef4444, #b91c1c)',
    iconShadow: 'rgba(239,68,68,0.35)',
    confirmStyle: {
      background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
      color: '#fff',
      boxShadow: '0 6px 20px rgba(239,68,68,0.35)',
    },
  },
  'warning': {
    icon: AlertTriangle,
    iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
    iconShadow: 'rgba(245,158,11,0.35)',
    confirmStyle: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      color: '#fff',
      boxShadow: '0 6px 20px rgba(245,158,11,0.35)',
    },
  },
  'prompt': {
    icon: CheckCircle,
    iconBg: 'linear-gradient(135deg, #c97282, #a0506a)',
    iconShadow: 'rgba(201,114,130,0.35)',
    confirmStyle: {
      background: 'linear-gradient(135deg, #c97282 0%, #a0506a 100%)',
      color: '#fff',
      boxShadow: '0 6px 20px rgba(160,80,106,0.35)',
    },
  },
};

const JanaDialog = ({
  isOpen,
  title,
  message,
  type = 'confirm',
  inputValue = '',
  placeholder = '',
  inputType = 'text',
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  customFooter = null,
}) => {
  const [val, setVal] = useState(inputValue);
  const [visible, setVisible] = useState(false);
  const [animOut, setAnimOut] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setVal(inputValue);
      setAnimOut(false);
      requestAnimationFrame(() => setVisible(true));
      if (type === 'prompt') setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setAnimOut(true);
      setTimeout(() => setVisible(false), 220);
    }
  }, [isOpen, inputValue, type]);

  if (!visible && !isOpen) return null;

  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG['confirm'];
  const IconComp = cfg.icon;
  const showCancel = type !== 'alert';

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(74, 48, 54, 0.35)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 99999999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    opacity: animOut ? 0 : 1,
    transition: 'opacity 0.22s ease',
  };

  const cardStyle = {
    maxWidth: '420px',
    width: '100%',
    background: '#fff',
    borderRadius: '28px',
    padding: '36px 32px 28px',
    boxShadow: '0 32px 80px rgba(74,48,54,0.18), 0 8px 24px rgba(0,0,0,0.06)',
    border: '1px solid rgba(223,178,140,0.15)',
    textAlign: 'center',
    position: 'relative',
    transform: animOut ? 'scale(0.94) translateY(10px)' : 'scale(1) translateY(0)',
    opacity: animOut ? 0 : 1,
    transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.22s ease',
  };

  return createPortal(
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget && showCancel) onCancel?.(); }}>
      <div style={cardStyle}>
        {/* Close X */}
        {showCancel && (
          <button
            onClick={onCancel}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(212,160,154,0.08)', border: 'none',
              width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#9a7a82', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,160,154,0.08)'; e.currentTarget.style.color = '#9a7a82'; }}
          >
            <X size={15} />
          </button>
        )}

        {/* Icon Badge */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '20px',
          background: cfg.iconBg,
          boxShadow: `0 12px 30px ${cfg.iconShadow}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          animation: 'janaDialogIconPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          <IconComp size={28} color="#fff" strokeWidth={2.2} />
        </div>

        {/* Title */}
        {title && (
          <h3 style={{
            fontSize: '1.15rem', fontWeight: 800, color: '#3d2b30',
            margin: '0 0 10px', lineHeight: 1.3,
            fontFamily: "'Outfit', sans-serif",
          }}>
            {title}
          </h3>
        )}

        {/* Message */}
        {message && (
          <p style={{
            fontSize: '0.9rem', color: '#7a5c65', lineHeight: 1.6,
            margin: '0 0 24px', fontWeight: 500,
          }}>
            {message}
          </p>
        )}

        {/* Prompt input */}
        {type === 'prompt' && (
          <div style={{ marginBottom: '24px' }}>
            <input
              ref={inputRef}
              type={inputType}
              value={val}
              onChange={e => setVal(e.target.value)}
              placeholder={placeholder}
              onKeyDown={e => {
                if (e.key === 'Enter') onConfirm?.(val);
                if (e.key === 'Escape') onCancel?.();
              }}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 16px',
                border: '1.5px solid rgba(201,114,130,0.25)',
                borderRadius: '12px',
                fontSize: '0.95rem', fontWeight: 600, color: '#3d2b30',
                background: '#fdf8f8',
                outline: 'none',
                transition: 'border-color 0.2s',
                textAlign: 'center',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(201,114,130,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,114,130,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(201,114,130,0.25)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        )}

        {/* Footer Buttons */}
        {customFooter ? customFooter : (
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {showCancel && (
              <button
                onClick={onCancel}
                style={{
                  flex: 1, padding: '13px 16px',
                  borderRadius: '14px',
                  border: '1.5px solid rgba(201,114,130,0.2)',
                  background: 'rgba(255,255,255,0.8)',
                  color: '#7a5c65', fontWeight: 700, fontSize: '0.88rem',
                  cursor: 'pointer', transition: 'all 0.2s',
                  fontFamily: "'Outfit', sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,114,130,0.06)'; e.currentTarget.style.borderColor = 'rgba(201,114,130,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(201,114,130,0.2)'; }}
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={() => onConfirm?.(type === 'prompt' ? val : true)}
              style={{
                flex: showCancel ? 1.4 : 2,
                padding: '13px 16px',
                borderRadius: '14px',
                border: 'none',
                fontWeight: 800, fontSize: '0.9rem',
                cursor: 'pointer', transition: 'all 0.2s',
                fontFamily: "'Outfit', sans-serif",
                ...cfg.confirmStyle,
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes janaDialogIconPop {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default JanaDialog;
