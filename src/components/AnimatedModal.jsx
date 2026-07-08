import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ModalShield } from '../context/ModalContext';
import { useScrollLock } from '../hooks/useScrollLock';

/**
 * AnimatedModal — transparent animation wrapper with render-prop pattern.
 *
 * Usage:
 *   <AnimatedModal isOpen={show}>
 *     {(overlayClass, cardClass) => (
 *       <div className={overlayClass} style={{ position:'fixed', inset:0, zIndex:1000, ... }}>
 *         <div className={cardClass} style={{ ... }}>
 *           ...content...
 *         </div>
 *       </div>
 *     )}
 *   </AnimatedModal>
 *
 * overlayClass — 'modal-overlay-enter' or 'modal-overlay-exit'
 * cardClass    — 'modal-card-enter'    or 'modal-card-exit'
 */
const AnimatedModal = ({ isOpen, children }) => {
  // Keep mounted=true during exit animation so CSS can run
  const [mounted, setMounted] = useState(isOpen);
  const [phase, setPhase] = useState(isOpen ? 'enter' : 'exit');
  const timer = useRef(null);

  useScrollLock(isOpen);

  useEffect(() => {
    clearTimeout(timer.current);
    if (isOpen) {
      setMounted(true);
      setPhase('enter');
    } else {
      if (!mounted) return;
      setPhase('exit');
      timer.current = setTimeout(() => setMounted(false), 350);
    }
    return () => clearTimeout(timer.current);
  }, [isOpen, mounted]);

  if (!mounted) return null;

  const overlayClass = phase === 'enter' ? 'modal-overlay-enter' : 'modal-overlay-exit';
  const cardClass    = phase === 'enter' ? 'modal-card-enter'    : 'modal-card-exit';

  return createPortal(
    <ModalShield active={isOpen}>
      {children(overlayClass, cardClass)}
    </ModalShield>,
    document.body
  );
};

export default AnimatedModal;
