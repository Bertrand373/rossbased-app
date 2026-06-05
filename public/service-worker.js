/* eslint-disable no-restricted-globals */

// Bumping this version forces the service worker to re-activate on every
// client's next load, which runs the nuclear cache purge below (with
// skipWaiting + clients.claim) — the surest way to flush a browser that's
// holding a stale bundle (e.g. Safari showing an old deploy). Bump it on
// any deploy where clients must not keep serving cached assets.
const CACHE_NAME = 'titantrack-v10';

// Only precache files with STABLE names (not hashed by CRA)
const SHELL_URLS = [
  '/',
  '/index.html',
  '/helmet.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png'
];

// Install event - cache only stable-name assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(SHELL_URLS);
      })
      .catch((error) => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - NUCLEAR: delete ALL caches and start fresh
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating - purging all caches...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          console.log('[Service Worker] Deleting cache:', name);
          return caches.delete(name);
        })
      );
    }).then(() => {
      console.log('[Service Worker] All caches deleted, re-caching shell...');
      return caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS));
    })
  );
  self.clients.claim();
});

// Fetch event - smart strategy based on request type
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests (API calls, CDNs, etc.)
  if (url.origin !== location.origin) return;

  // STRATEGY 1: Hashed static assets (/static/js/main.abc123.js)
  // These are immutable — cache forever, serve from cache first
  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // STRATEGY 2: Images and icons — cache first, network fallback
  if (url.pathname.match(/\.(png|jpg|jpeg|ico|svg|webp)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => caches.match('/icon-192.png'));
      })
    );
    return;
  }

  // STRATEGY 3: Navigation requests (HTML) — stale-while-revalidate.
  // Serve the cached app shell INSTANTLY (zero network wait → the black
  // pulsing loader paints immediately, with no blank/white gap for iOS to
  // flash during the native-splash handoff), then refresh the cached shell
  // in the background so the next launch is up to date. Deploys are picked
  // up on the next open; bump CACHE_NAME to force an immediate update.
  if (event.request.mode === 'navigate') {
    // OAuth callbacks must always hit the network — serving a cached shell
    // here would bypass the server-side handshake and break sign-in.
    if (url.pathname.startsWith('/auth/')) {
      event.respondWith(
        fetch(event.request).catch(() => caches.match('/index.html'))
      );
      return;
    }

    event.respondWith(
      caches.match('/index.html').then((cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
            return response;
          })
          .catch(() => cached);
        // Cached shell first for an instant paint; fall through to the
        // network only on a true cold cache (first ever load / post-purge).
        return cached || networkFetch;
      })
    );
    return;
  }

  // STRATEGY 4: Everything else — stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
      return cached || networkFetch;
    })
  );
});

// NOTE: Push notifications are handled by firebase-messaging-sw.js
// Do NOT add a push handler here - it causes duplicate notifications

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          const urlToOpen = event.notification.data?.url || '/';
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync event (optional - for future use)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Add your sync logic here
      Promise.resolve()
    );
  }
});

// Message event - communication between service worker and app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
