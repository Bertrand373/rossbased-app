// public/firebase-messaging-sw.js
// This file handles notifications when the app is closed or in background

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyCfnWRLgjDHO35p9UnmThkSti6CIU7hYUY",
  authDomain: "titan-track-notifications.firebaseapp.com",
  projectId: "titan-track-notifications",
  storageBucket: "titan-track-notifications.firebasestorage.app",
  messagingSenderId: "470963974603",
  appId: "1:470963974603:web:0e7bc01cdf40c96b1d464e"
});

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages (when app is closed)
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);

  const notificationTitle = payload.notification.title || '⚠️ Titan Track Alert';
  const notificationOptions = {
    body: payload.notification.body || 'High urge risk detected',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'urge-prediction',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: payload.data || {}
  };

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click (when user taps notification)
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  // Close the notification
  event.notification.close();

  // Handle different actions
  if (event.action === 'dismiss') {
    // User dismissed, do nothing
    return;
  }

  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            // Focus the existing window and navigate to prediction page
            return client.focus().then(() => {
              // Send message to client to navigate
              client.postMessage({
                type: 'NAVIGATE_TO_PREDICTION',
                data: event.notification.data
              });
            });
          }
        }

        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow('/#/urge-prediction');
        }
      })
  );
});

// Handle notification close (when user dismisses without clicking)
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Track dismissal (could send analytics here)
  const data = event.notification.data;
  console.log('User dismissed notification for risk:', data.riskScore);
});