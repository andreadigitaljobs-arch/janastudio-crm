import React, { createContext, useContext, useState, useCallback } from 'react';
import JanaDialog from '../components/JanaDialog';

const DialogContext = createContext();

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    console.warn("useDialog was called outside of DialogProvider");
    return {
      alert: () => Promise.resolve(true),
      confirm: () => Promise.resolve(false),
      prompt: () => Promise.resolve(null),
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

  const prompt = useCallback((message, title = 'Completa la información', options = {}) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        type: 'prompt',
        inputValue: options.inputValue || '',
        placeholder: options.placeholder || '',
        inputType: options.inputType || 'text',
        confirmText: options.confirmText || 'Continuar',
        cancelText: 'Cancelar',
        resolve
      });
    });
  }, []);

  const handleConfirm = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (dialogState.resolve) dialogState.resolve(true);
  };

  const handleValueConfirm = (value) => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (dialogState.resolve) dialogState.resolve(value);
  };

  const handleCancel = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (dialogState.resolve) dialogState.resolve(dialogState.type === 'prompt' ? null : false);
  };

  return (
    <DialogContext.Provider value={{ confirm, alert, prompt }}>
      {children}
      <JanaDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        inputValue={dialogState.inputValue}
        placeholder={dialogState.placeholder}
        inputType={dialogState.inputType}
        onConfirm={dialogState.type === 'prompt' ? handleValueConfirm : handleConfirm}
        onCancel={handleCancel}
      />
    </DialogContext.Provider>
  );
};
