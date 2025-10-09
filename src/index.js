// index.js - WITH FIREBASE SERVICE WORKER REGISTRATION
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// REGISTER BOTH SERVICE WORKERS FOR PWA AND FIREBASE
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Register main service worker for PWA
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });

    // Register Firebase messaging service worker
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('✅ Firebase Messaging SW registered:', registration.scope);
      })
      .catch((error) => {
        console.error('❌ Firebase Messaging SW registration failed:', error);
      });
  });
}