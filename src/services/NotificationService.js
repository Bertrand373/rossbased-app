// src/services/NotificationService.js
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../config/firebase';

class NotificationService {
  constructor() {
    this.messaging = null;
    this.permission = 'default';
    this.notificationHistory = [];
    this.maxNotificationsPerDay = 3;
    this.minimumGapMinutes = 120;
    
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('Notifications not supported on this device');
      return;
    }
    
    this.permission = Notification.permission;
    
    // Initialize messaging if supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        this.messaging = getMessaging(app);
        this.setupMessageListener();
      } catch (error) {
        console.error('Failed to initialize Firebase messaging:', error);
      }
    }
  }

  async requestPermission() {
    try {
      if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        alert('Your browser does not support notifications. Please use a modern browser like Chrome, Firefox, or Safari.');
        return false;
      }

      if (this.permission === 'granted') {
        console.log('Notification permission already granted');
        return true;
      }

      const permission = await Notification.requestPermission();
      this.permission = permission;

      if (permission === 'granted') {
        console.log('Notification permission granted');
        await this.registerServiceWorker();
        await this.getFCMToken();
        return true;
      } else if (permission === 'denied') {
        alert('Notifications blocked. Please enable them in your browser settings.');
        return false;
      } else {
        console.log('Notification permission dismissed');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      alert('Failed to request notification permission. Error: ' + error.message);
      return false;
    }
  }

  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js'
      );
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  async getFCMToken() {
    try {
      if (!this.messaging) {
        console.warn('Firebase messaging not initialized');
        return null;
      }

      const currentToken = await getToken(this.messaging, {
        vapidKey: 'BFELhhVyYbO3JmmaHRHnHcSwXA2JoPyrjsP1IlcbvZbCkwHhKcbaZD_OD2ahh8Cx_syCOaA6yHaRYW7UgIT1DxQ'
      });

      if (currentToken) {
        console.log('FCM Token obtained:', currentToken);
        localStorage.setItem('fcm_token', currentToken);
        return currentToken;
      } else {
        console.log('No FCM token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  setupMessageListener() {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      this.showNotification(
        payload.notification.title,
        payload.notification.body,
        payload.data
      );
    });
  }

  canSendNotification() {
    const now = Date.now();
    const today = new Date().toDateString();

    this.notificationHistory = this.notificationHistory.filter(n => 
      new Date(n.timestamp).toDateString() === today
    );

    if (this.notificationHistory.length >= this.maxNotificationsPerDay) {
      console.log('Daily notification limit reached');
      return false;
    }

    if (this.notificationHistory.length > 0) {
      const lastNotification = this.notificationHistory[this.notificationHistory.length - 1];
      const minutesSinceLastNotification = (now - lastNotification.timestamp) / 1000 / 60;
      
      if (minutesSinceLastNotification < this.minimumGapMinutes) {
        console.log(`Too soon since last notification (${Math.round(minutesSinceLastNotification)} minutes ago)`);
        return false;
      }
    }

    return true;
  }

  async sendUrgePredictionNotification(riskScore, reason) {
    try {
      if (this.permission !== 'granted') {
        console.log('No notification permission');
        return false;
      }

      if (!this.canSendNotification()) {
        console.log('Rate limit exceeded, notification suppressed');
        return false;
      }

      if (riskScore < 70) {
        console.log('Risk score too low for notification:', riskScore);
        return false;
      }

      const title = '⚠ High Urge Risk Detected';
      const body = `Risk level: ${riskScore}% - Tap for instant help`;
      const data = {
        type: 'urge_prediction',
        riskScore: riskScore.toString(),
        reason: reason,
        timestamp: Date.now().toString()
      };

      const notificationShown = await this.showNotification(title, body, data);

      if (notificationShown) {
        this.notificationHistory.push({
          timestamp: Date.now(),
          riskScore: riskScore,
          reason: reason
        });

        localStorage.setItem('notification_history', JSON.stringify(this.notificationHistory));
      }

      return notificationShown;
    } catch (error) {
      console.error('Error sending urge prediction notification:', error);
      return false;
    }
  }

  async showNotification(title, body, data = {}) {
    try {
      if (!('Notification' in window)) {
        console.warn('Browser does not support notifications');
        return false;
      }

      if (Notification.permission !== 'granted') {
        console.warn('No permission to show notification');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      await registration.showNotification(title, {
        body: body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'urge-prediction',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: data,
        actions: [
          {
            action: 'open',
            title: 'Get Help Now'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      });

      console.log('Notification shown successfully');
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }

  getNotificationStats() {
    const today = new Date().toDateString();
    const todayNotifications = this.notificationHistory.filter(n =>
      new Date(n.timestamp).toDateString() === today
    );

    return {
      todayCount: todayNotifications.length,
      remainingToday: this.maxNotificationsPerDay - todayNotifications.length,
      lastNotification: this.notificationHistory.length > 0
        ? this.notificationHistory[this.notificationHistory.length - 1]
        : null
    };
  }

  clearHistory() {
    this.notificationHistory = [];
    localStorage.removeItem('notification_history');
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem('notification_history');
      if (saved) {
        this.notificationHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading notification history:', error);
    }
  }
}

const notificationService = new NotificationService();
notificationService.loadHistory();

export default notificationService;