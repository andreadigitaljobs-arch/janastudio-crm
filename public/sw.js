// Service Worker — Jana Studio CRM
// Estrategia: Cache-First para TODAS las imágenes (locales + Supabase Storage)
// Las fotos de clientes se guardan permanentemente y nunca se ven en blanco.

const CACHE_VERSION = 'v5';
const STATIC_CACHE  = `jana-static-${CACHE_VERSION}`;
const IMAGE_CACHE   = `jana-images-${CACHE_VERSION}`;  // Imágenes locales
const REMOTE_CACHE  = `jana-remote-${CACHE_VERSION}`;  // Fotos Supabase/externas

// Assets estáticos de la app que se precargan en install
const STATIC_ASSETS = [
  '/',
  '/favicon.webp',
  '/logo.webp',
  '/fondo_carga.png',
  '/fondo_carga_mobile.png',
  '/salon_banner_full.png',
  '/pwa-icon.webp',
  '/icons.svg'
];

// ─────────────────────────────────────────────────────────────────────────────
// INSTALL: precachear assets estáticos críticos
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATE: limpiar cachés de versiones anteriores
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const validCaches = [STATIC_CACHE, IMAGE_CACHE, REMOTE_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function isImageRequest(request, url) {
  return (
    request.destination === 'image' ||
    /\.(webp|png|jpg|jpeg|gif|svg|avif)(\?.*)?$/i.test(url.pathname)
  );
}

function isSupabaseStorage(url) {
  // Matches: *.supabase.co/storage/v1/object/... or supabase.io storage URLs
  return (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.io')
  ) && url.pathname.includes('/storage/');
}

function isStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    /\.(webp|png|jpg|jpeg|gif|svg|css|js|woff2|avif)(\?.*)?$/i.test(url.pathname)
  );
}

// Cache-First: serve from cache, fallback to network and cache the result
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      // Clone before consuming
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Offline and not cached — return a transparent 1px placeholder
    // so the <img> tag never shows a broken icon
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

// Network-First: try network, fallback to cache (for HTML navigation)
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return cache.match(request);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH: interceptar todas las peticiones
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones no-HTTP (chrome-extension://, etc.)
  if (!event.request.url.startsWith('http')) return;

  // Ignorar peticiones POST/PUT/DELETE (mutaciones de API, no caché)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Navegación HTML → Network-First (para recibir updates de la app)
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(networkFirst(event.request, STATIC_CACHE));
    return;
  }

  // 2. Fotos de clientes desde Supabase Storage → Cache-First PERMANENTE
  //    Una vez descargada, siempre se sirve desde caché. Nunca en blanco.
  if (isSupabaseStorage(url) && isImageRequest(event.request, url)) {
    event.respondWith(cacheFirst(event.request, REMOTE_CACHE));
    return;
  }

  // 3. Assets estáticos locales (imágenes, fuentes, CSS, JS) → Cache-First
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request, IMAGE_CACHE));
    return;
  }

  // 4. Resto de peticiones (API de Supabase, auth, etc.) → Network normal
  // No interceptar para no interferir con llamadas de datos en tiempo real
});

// ─────────────────────────────────────────────────────────────────────────────
// MENSAJE: limpiar caché de imágenes remotas bajo petición del app
// Usar: navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_IMAGES' })
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_IMAGES') {
    caches.delete(REMOTE_CACHE).then(() => {
      event.ports[0]?.postMessage({ success: true });
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS (sin cambios)
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('push', function(event) {
  let data = { title: 'Jana Studio CRM', body: 'Nueva notificación recibida.' };
  if (event.data) {
    try { data = event.data.json(); }
    catch (e) { data = { title: 'Jana Studio CRM', body: event.data.text() }; }
  }

  const options = {
    body: data.body,
    icon: '/pwa-icon.webp',
    badge: '/favicon.webp',
    vibrate: [100, 50, 100],
    data: { dateOfArrival: Date.now(), primaryKey: '1' },
    actions: [
      { action: 'explore', title: 'Ver CRM', icon: '/favicon.webp' },
      { action: 'close',   title: 'Cerrar',  icon: '/favicon.webp' }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action !== 'close') {
    event.waitUntil(clients.openWindow('/'));
  }
});
