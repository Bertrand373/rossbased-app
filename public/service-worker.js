/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'titantrack-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/helmet.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',  // ADDED: iOS PWA icon
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[Service Worker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // IMPORTANT: Let icon requests pass through directly
  if (event.request.url.includes('apple-touch-icon') || 
      event.request.url.includes('favicon') ||
      event.request.url.includes('.png') ||
      event.request.url.includes('.ico')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
        .catch(() => fetch(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(() => {
        // Return offline page if available
        return caches.match('/index.html');
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  // Clean, premium fallbacks - no emojis
  let notificationData = {
    title: 'TitanTrack',
    body: 'You have a new update.',
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: {
          url: data.url || '/',
          dateOfArrival: Date.now(),
          primaryKey: data.primaryKey || 1
        }
      };
    } catch (error) {
      console.error('[Service Worker] Error parsing push data:', error);
    }
  }
  
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [200, 100, 200],
    data: notificationData.data,
    actions: [
      {
        action: 'open',
        title: 'View',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Dismiss'
      }
    ],
    requireInteraction: false,
    tag: 'titantrack-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

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