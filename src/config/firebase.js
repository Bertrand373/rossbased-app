// Firebase Configuration for Titan Track
// This connects your app to Firebase for push notifications

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Your Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyCfnWRLgjDHO35p9UnmThkSti6CIU7hYUY",
  authDomain: "titan-track-notifications.firebaseapp.com",
  projectId: "titan-track-notifications",
  storageBucket: "titan-track-notifications.firebasestorage.app",
  messagingSenderId: "470963974603",
  appId: "1:470963974603:web:0e7bc01cdf40c96b1d464e"
};

// Your Web Push certificate key
export const VAPID_KEY = "BFELhhVyYbO3JmmaHRHnHcSwXA2JoPyrjsP1IlcbvZbCkwHhKcbaZD_OD2ahh8Cx_syCOaA6yHaRYW7UgIT1DxQ";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
let messaging = null;

try {
  // Only initialize messaging if browser supports it
  if (typeof window !== 'undefined' && 'Notification' in window) {
    messaging = getMessaging(app);
  }
} catch (error) {
  console.warn('Firebase messaging not supported in this browser:', error);
}

export { messaging, getToken, onMessage };
export default app;