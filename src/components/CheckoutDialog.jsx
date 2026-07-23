import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, ShieldCheck, X } from 'lucide-react';
import CheckoutPOS from './CheckoutPOS';
import { useScrollLock } from '../hooks/useScrollLock';

export default function CheckoutDialog({
  isOpen,
  isMobile,
  rates,
  initialAppointmentId,
  onClose,
  onNavigate,
}) {
  const closeButtonRef = useRef(null);

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;

    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="checkout-dialog-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="checkout-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-dialog-title"
      >
        <header className="checkout-dialog-header">
          <div className="checkout-dialog-heading">
            <span className="checkout-dialog-icon" aria-hidden="true">
              <CreditCard size={20} />
            </span>
            <div>
              <h2 id="checkout-dialog-title">Caja Jana</h2>
              <p>Cobra servicios finalizados o registra una venta directa.</p>
            </div>
          </div>

          <div className="checkout-dialog-actions">
            <span className="checkout-dialog-security">
              <ShieldCheck size={14} /> Cobro seguro
            </span>
            <button
              type="button"
              className="checkout-dialog-close"
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="Cerrar Caja"
            >
              <X size={19} />
            </button>
          </div>
        </header>

        <div className="checkout-dialog-content no-scrollbar">
          <CheckoutPOS
            isMobile={isMobile}
            rates={rates}
            initialAppointmentId={initialAppointmentId}
            embedded
            onNavigate={onNavigate}
          />
        </div>
      </section>
    </div>,
    document.body
  );
}
