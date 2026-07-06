// Service Worker para la PWA de Astro Barber CRM
self.addEventListener('push', function(event) {
  let data = { title: 'Astro Barber CRM', body: 'Nueva notificación recibida.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Astro Barber CRM', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/pwa-icon.webp',
    badge: '/favicon.webp',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      { action: 'explore', title: 'Ver CRM', icon: '/favicon.webp' },
      { action: 'close', title: 'Cerrar', icon: '/favicon.webp' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action !== 'close') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
