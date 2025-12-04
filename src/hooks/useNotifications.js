// src/hooks/useNotifications.js - WITH BACKEND INTEGRATION
import { useState, useEffect, useCallback } from 'react';
import { messaging, getToken, onMessage } from '../config/firebase';
import { VAPID_KEY } from '../config/firebase';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

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
        console.log('✅ FCM Token obtained:', token);
        
        // Save token to state and localStorage
        setFcmToken(token);
        localStorage.setItem('fcmToken', token);
        
        // Send token to backend
        const username = localStorage.getItem('username');
        if (username) {
          await fetch(`${API_URL}/api/notifications/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username,
              fcmToken: token,
              notificationsEnabled: true
            })
          });
          console.log('✅ Subscribed to backend notifications');
        }
        
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
      const username = localStorage.getItem('username');
      
      if (username) {
        await fetch(`${API_URL}/api/notifications/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
        console.log('✅ Unsubscribed from backend notifications');
      }
      
      localStorage.removeItem('fcmToken');
      setFcmToken(null);
      setSubscription(null);
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      throw error;
    }
  };

  const checkExistingSubscription = useCallback(async () => {
    try {
      if (!isSupported) return null;
      
      const savedToken = localStorage.getItem('fcmToken');
      const username = localStorage.getItem('username');
      
      if (!savedToken || !username) {
        return null;
      }
      
      // Try to verify with backend, but fall back to localStorage if it fails
      try {
        const response = await fetch(`${API_URL}/api/notifications/preferences/${username}`);
        
        if (response.ok) {
          const data = await response.json();
          // Check both possible data structures from backend
          const isEnabled = data.notificationsEnabled || 
                           (data.subscription && data.subscription.notificationsEnabled);
          if (isEnabled) {
            setFcmToken(savedToken);
            setSubscription({ endpoint: savedToken });
            return { endpoint: savedToken };
          }
        }
      } catch (fetchError) {
        // Backend check failed, but we have a local token - trust it
        console.warn('Backend subscription check failed, using localStorage:', fetchError);
        setFcmToken(savedToken);
        setSubscription({ endpoint: savedToken });
        return { endpoint: savedToken };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to check subscription:', error);
      return null;
    }
  }, [isSupported]);

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