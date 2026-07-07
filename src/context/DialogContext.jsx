import React, { createContext, useContext, useState, useCallback } from 'react';
import JanaDialog from '../components/JanaDialog';

const DialogContext = createContext();

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    console.warn("useDialog was called outside of DialogProvider");
    return {
      alert: (msg) => new Promise(resolve => { window.alert(msg); resolve(true); }),
      confirm: (msg) => new Promise(resolve => resolve(window.confirm(msg)))
    };
  }
  return context;
};

export const DialogProvider = ({ children }) => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    resolve: null
  });

  const confirm = useCallback((message, title = 'Confirmación') => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        type: 'confirm',
        confirmText: 'Sí, continuar',
        cancelText: 'Cancelar',
        resolve
      });
    });
  }, []);

  const alert = useCallback((message, title = 'Aviso') => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        type: 'alert',
        confirmText: 'Entendido',
        cancelText: '',
        resolve
      });
    });
  }, []);

  const handleConfirm = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (dialogState.resolve) dialogState.resolve(true);
  };

  const handleCancel = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (dialogState.resolve) dialogState.resolve(false);
  };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      <JanaDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </DialogContext.Provider>
  );
};
