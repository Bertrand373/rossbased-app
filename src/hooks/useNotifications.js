// src/hooks/useNotifications.js - WITH FIREBASE INTEGRATION
import { useState, useEffect } from 'react';
import { messaging, getToken, onMessage } from '../config/firebase';
import { VAPID_KEY } from '../config/firebase';

export const useNotifications = () => {
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);
  const [fcmToken, setFcmToken] = useState(null);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    // Check if notifications and service workers are supported
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window && messaging) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Check for existing FCM token
      const savedToken = localStorage.getItem('fcmToken');
      if (savedToken) {
        setFcmToken(savedToken);
      }
    } else {
      console.warn('Push notifications not supported in this browser');
    }
  }, []);

  // Set up Firebase foreground message listener
  useEffect(() => {
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      // Show notification when app is in foreground
      if (Notification.permission === 'granted') {
        const notificationTitle = payload.notification?.title || 'TitanTrack';
        const notificationOptions = {
          body: payload.notification?.body || 'New notification',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: payload.data
        };

        new Notification(notificationTitle, notificationOptions);
      }
    });

    return () => unsubscribe();
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      throw new Error('Notifications not supported');
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      throw error;
    }
  };

  const subscribeToPush = async () => {
    try {
      if (!messaging) {
        throw new Error('Firebase messaging not initialized');
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Request FCM token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('FCM Token:', token);
        setFcmToken(token);
        
        // Save token to localStorage
        localStorage.setItem('fcmToken', token);
        
        // TODO: Send token to your backend server
        // await fetch('/api/notifications/subscribe', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ token })
        // });
        
        setSubscription({ endpoint: token });
        return token;
      } else {
        throw new Error('Failed to get FCM token');
      }
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      throw error;
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      if (fcmToken) {
        // TODO: Remove token from backend
        // await fetch('/api/notifications/unsubscribe', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ token: fcmToken })
        // });
        
        localStorage.removeItem('fcmToken');
        setFcmToken(null);
      }
      setSubscription(null);
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      throw error;
    }
  };

  const checkExistingSubscription = async () => {
    try {
      if (!isSupported) return null;
      
      const savedToken = localStorage.getItem('fcmToken');
      if (savedToken) {
        setFcmToken(savedToken);
        setSubscription({ endpoint: savedToken });
        return { endpoint: savedToken };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to check subscription:', error);
      return null;
    }
  };

  const sendLocalNotification = async (title, options = {}) => {
    if (!isSupported || permission !== 'granted') {
      console.warn('Cannot send notification: not supported or not permitted');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const notificationOptions = {
        body: options.body || 'TitanTrack notification',
        icon: options.icon || '/icon-192.png',
        badge: options.badge || '/icon-192.png',
        vibrate: options.vibrate || [200, 100, 200],
        data: options.data || { url: '/' },
        tag: options.tag || 'titantrack-notification',
        requireInteraction: options.requireInteraction || false,
        ...options
      };

      await registration.showNotification(title, notificationOptions);
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  };

  return {
    permission,
    isSupported,
    subscription,
    fcmToken,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    checkExistingSubscription,
    sendLocalNotification
  };
};