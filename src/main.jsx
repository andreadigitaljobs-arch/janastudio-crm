import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { NotificationProvider } from './context/NotificationContext'
import { AuthProvider } from './context/AuthContext'
import { ModalProvider } from './context/ModalContext'

import { DialogProvider } from './context/DialogContext'
import AppErrorBoundary from './components/AppErrorBoundary'

createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>
    <AuthProvider>
      <DialogProvider>
        <NotificationProvider>
          <ModalProvider>
            <App />
          </ModalProvider>
        </NotificationProvider>
      </DialogProvider>
    </AuthProvider>
  </AppErrorBoundary>
)

// Registrar Service Worker para caché de imágenes y PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[Jana SW] Registrado:', reg.scope);
      })
      .catch((err) => {
        console.warn('[Jana SW] Error al registrar:', err);
      });
  });
}

