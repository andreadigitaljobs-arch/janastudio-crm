import React, { createContext, useContext } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { Bell, CheckCircle, AlertCircle } from 'lucide-react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const notifs = useNotifications();

  return (
    <NotificationContext.Provider value={notifs}>
      {children}
      
      {/* Toast Container Overlay */}
      <div className="toast-container">
        {notifs.toasts.map((t) => (
          <div key={t.id} className="toast animate-scale-in">
            {t.type === 'success' ? <CheckCircle size={20} color="var(--gold-primary)" /> : <AlertCircle size={20} color="#ff453a" />}
            <span style={{ fontSize: '14px', fontWeight: '600' }}>{t.message}</span>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifs = () => useContext(NotificationContext);
