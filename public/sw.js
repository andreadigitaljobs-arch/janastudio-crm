// Service Worker para la PWA de Jana Studio CRM
const CACHE_NAME = 'jana-studio-assets-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.webp',
  '/logo.webp',
  '/logo.png',
  '/fondo_carga.png',
  '/fondo_carga_mobile.png',
  '/login_bg1.webp',
  '/login_bg2.webp',
  '/login_bg3.webp',
  '/login_bg4.webp',
  '/pwa-icon.webp',
  '/icons.svg'
];

// Instalar y precachear assets clave
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precachando assets principales para carga instantánea');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar peticiones con estrategia Cache-First para imágenes/assets
self.addEventListener('fetch', (event) => {
  // Ignorar esquemas no soportados por la Cache API (como chrome-extension://)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);
  
  // Solo interceptar peticiones del mismo origen para imágenes y recursos estáticos
  const isStaticAsset = 
    event.request.destination === 'image' || 
    ASSETS_TO_CACHE.includes(url.pathname) ||
    url.pathname.match(/\.(webp|png|jpg|jpeg|svg|css|js|woff2)$/);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Servir desde caché al instante
          return cachedResponse;
        }
        
        // Si no está en caché, descargar de red, guardar en caché y devolver
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});

// Notificaciones Push
self.addEventListener('push', function(event) {
  let data = { title: 'Jana Studio CRM', body: 'Nueva notificación recibida.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Jana Studio CRM', body: event.data.text() };
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
