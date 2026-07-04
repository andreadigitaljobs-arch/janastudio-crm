import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useScrollLock } from '../hooks/useScrollLock';

const ModalContext = createContext({ modalCount: 0, pushModal: () => {}, popModal: () => {} });

export const ModalProvider = ({ children }) => {
  const [modalCount, setModalCount] = useState(0);

  const pushModal = useCallback(() => setModalCount(c => c + 1), []);
  const popModal  = useCallback(() => setModalCount(c => Math.max(0, c - 1)), []);

  // Removed legacy scroll lock logic to prevent layout jumps.
  // We now use useScrollLock hook.

  return (
    <ModalContext.Provider value={{ isModalOpen: modalCount > 0, pushModal, popModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);

/**
 * Wrap any modal component with this to auto-register/unregister it.
 * Usage: <ModalShield active={showModal}> ... </ModalShield>
 */
export const ModalShield = ({ active, children }) => {
  const { pushModal, popModal } = useModal();

  useScrollLock(active);

  useEffect(() => {
    if (active) {
      pushModal();
      return () => popModal();
    }
  }, [active]);

  return children;
};
