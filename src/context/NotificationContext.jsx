import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const notifs = { toasts, showToast };

  return (
    <NotificationContext.Provider value={notifs}>
      {children}
      
      {/* Toast Container Overlay */}
      <div className="toast-container">
        {notifs.toasts.map((t) => (
          <div key={t.id} className="toast animate-scale-in">
            {t.type === 'success' ? <CheckCircle size={20} color="var(--pink-primary)" /> : <AlertCircle size={20} color="#ff453a" />}
            <span style={{ fontSize: '14px', fontWeight: '600' }}>{t.message}</span>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifs = () => useContext(NotificationContext);
