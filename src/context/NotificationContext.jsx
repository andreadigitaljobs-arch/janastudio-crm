import React, { createContext, useContext } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const TOAST_ICONS = {
  success: <CheckCircle size={20} color="var(--pink-primary)" />,
  error: <AlertCircle size={20} color="#ff453a" />,
  warning: <AlertCircle size={20} color="#e0a030" />,
  info: <Loader2 size={20} color="var(--pink-primary)" className="animate-spin" />
};

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
            {TOAST_ICONS[t.type] || TOAST_ICONS.success}
            <span style={{ fontSize: '14px', fontWeight: '600' }}>{t.message}</span>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifs = () => useContext(NotificationContext);
