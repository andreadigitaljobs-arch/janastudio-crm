// Servicio de Gestión de Notificaciones para JanaStudio CRM

class NotificationService {
  constructor() {
    this.notificationsKey = 'jana_notifications_list';
    this.swRegistered = false;
    this.initServiceWorker();
  }

  // Inicializar Service Worker
  async initServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registrado con éxito:', registration.scope);
        this.swRegistered = true;
      } catch (error) {
        console.error('Fallo al registrar el Service Worker:', error);
      }
    }
  }

  // Solicitar permiso de notificaciones
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones de escritorio.');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  // Obtener estado actual del permiso
  getPermissionStatus() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }

  // Enviar una notificación (tanto local en primer plano como push si es posible)
  async sendNotification(title, body) {
    // 1. Guardar la notificación en el historial local
    this.saveToHistory(title, body);

    // 2. Intentar disparar notificación nativa si tenemos permiso
    if ('Notification' in window && Notification.permission === 'granted') {
      // Disparar vía Service Worker si está registrado (para soporte premium PWA)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
          body: body,
          icon: '/pwa-icon.png',
          badge: '/favicon.svg',
          vibrate: [200, 100, 200],
          tag: 'astro-crm-alert',
          renotify: true
        });
      } else {
        // Fallback a notificación nativa simple de navegador
        new Notification(title, {
          body: body,
          icon: '/pwa-icon.png'
        });
      }
    }
  }

  // Guardar en local storage para el panel de notificaciones en el CRM
  saveToHistory(title, body) {
    const list = this.getHistory();
    const newNotification = {
      id: Date.now().toString(),
      title,
      body,
      date: new Date().toISOString(),
      read: false
    };
    list.unshift(newNotification);
    localStorage.setItem(this.notificationsKey, JSON.stringify(list.slice(0, 50))); // Límite de 50 en historial
    
    // Disparar un evento personalizado de ventana para que React se entere al instante de la actualización
    window.dispatchEvent(new Event('jana_new_notification'));
  }

  // Obtener historial
  getHistory() {
    try {
      const data = localStorage.getItem(this.notificationsKey);
      return data ? JSON.parse(data) : this.getDefaultNotifications();
    } catch (e) {
      return this.getDefaultNotifications();
    }
  }

  // Marcar todas como leídas
  markAllAsRead() {
    const list = this.getHistory();
    list.forEach(n => n.read = true);
    localStorage.setItem(this.notificationsKey, JSON.stringify(list));
    window.dispatchEvent(new Event('jana_new_notification'));
  }

  // Eliminar historial
  clearHistory() {
    localStorage.setItem(this.notificationsKey, JSON.stringify([]));
    window.dispatchEvent(new Event('jana_new_notification'));
  }

  // Enviar una notificación broadcast a través de Supabase Realtime
  broadcastNotification(supabase, title, body, options = {}) {
    try {
      const channel = supabase.channel('astro-notifications');
      channel.send({
        type: 'broadcast',
        event: 'crm-notification',
        payload: {
          title,
          body,
          recipientRole: options.recipientRole || null,
          recipientId: options.recipientId || null,
          senderId: options.senderId || null
        }
      });
    } catch (e) {
      console.error('Error broadcasting notification:', e);
    }
  }

  // Notificaciones por defecto iniciales
  getDefaultNotifications() {
    return [
      {
        id: 'default-1',
        title: '¡Bienvenido al CRM JanaStudio!',
        body: 'El sistema de notificaciones push está listo. Actívalo para enterarte de citas y cierres semanales.',
        date: new Date().toISOString(),
        read: false
      }
    ];
  }
}

export const notificationService = new NotificationService();
