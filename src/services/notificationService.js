// Servicio de Gestión de Notificaciones para JanaStudio CRM

class NotificationService {
  constructor() {
    this.notificationsKey = 'jana_notifications_list';
    this.swRegistered = false;
    this.scheduleServiceWorkerRegistration();
  }

  scheduleServiceWorkerRegistration() {
    if (!('serviceWorker' in navigator)) return;
    // El SW usa una estrategia cache-first pensada para los assets con hash
    // del build de producción; en `vite dev` pisa las peticiones de HMR y
    // módulos dinámicos, causando "Failed to fetch" en consola.
    if (!import.meta.env.PROD) return;

    const register = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => this.initServiceWorker(), { timeout: 3000 });
      } else {
        setTimeout(() => this.initServiceWorker(), 1500);
      }
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }

  // Inicializar Service Worker sin bloquear el primer render
  async initServiceWorker() {
    if (this.swRegistered) return;

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
          icon: '/pwa-icon.webp',
          badge: '/favicon.webp',
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

  // Inyectar notificaciones realistas de prueba (Hoy, Ayer, Anteriores)
  injectTestNotifications() {
    const now = new Date();
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    
    const older = new Date();
    older.setDate(now.getDate() - 3);

    const testNotifs = [
      {
        title: "Nueva Cita Registrada 📅",
        body: "María Corina reservó Extensiones de Pestañas con Isabella R. para mañana a las 3:00 PM.",
        date: now.toISOString()
      },
      {
        title: "Pago Confirmado 💳",
        body: "Se registró un cobro exitoso por $65.00 a nombre de Valentina S. vía Transferencia.",
        date: now.toISOString()
      },
      {
        title: "Alerta de Inventario ⚠️",
        body: "El producto 'Pestañas Clásicas 0.15 C' ha bajado del stock mínimo establecido. Quedan 2 unidades.",
        date: yesterday.toISOString()
      },
      {
        title: "Cumpleaños de Cliente 🎉",
        body: "Hoy cumple años tu cliente consentida Laura G. ¡Envíale una felicitación o una oferta especial!",
        date: yesterday.toISOString()
      },
      {
        title: "Copia de Seguridad Lista ✅",
        body: "La base de datos segura se ha respaldado automáticamente a la nube con éxito.",
        date: older.toISOString()
      }
    ];

    const list = this.getHistory();
    testNotifs.forEach((n, idx) => {
      list.unshift({
        id: (Date.now() + idx).toString(),
        title: n.title,
        body: n.body,
        date: n.date,
        read: false
      });
    });

    localStorage.setItem(this.notificationsKey, JSON.stringify(list.slice(0, 50)));
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
        date: new Date(Date.now() - 300000).toISOString(),
        read: false
      },
      {
        id: 'default-2',
        title: 'Nueva cita programada',
        body: 'Isabella Rodríguez agendó una cita de Pestañas Clásicas para mañana a las 10:00 AM.',
        date: new Date(Date.now() - 600000).toISOString(),
        read: false
      },
      {
        id: 'default-3',
        title: 'Cita completada',
        body: 'Valentina García finalizó su tratamiento de Diseño de Cejas. Ingreso registrado: Bs. 35.000.',
        date: new Date(Date.now() - 1200000).toISOString(),
        read: true
      },
      {
        id: 'default-4',
        title: 'Recordatorio semanal',
        body: 'Tienes 12 citas pendientes esta semana. Revisa tu agenda para preparar los materiales.',
        date: new Date(Date.now() - 3600000).toISOString(),
        read: true
      },
      {
        id: 'default-5',
        title: 'Stock bajo en inventario',
        body: 'El producto "Adhesivo Premium Lash" tiene solo 3 unidades restantes. Considera reabastecer.',
        date: new Date(Date.now() - 7200000).toISOString(),
        read: false
      },
      {
        id: 'default-6',
        title: 'Resumen del día',
        body: 'Hoy se completaron 8 citas con un ingreso total de Bs. 127.500. ¡Buen trabajo, Jana!',
        date: new Date(Date.now() - 14400000).toISOString(),
        read: true
      }
    ];
  }
}

export const notificationService = new NotificationService();
