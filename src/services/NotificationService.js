// src/services/NotificationService.js
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../config/firebase';

class NotificationService {
  constructor() {
    this.messaging = null;
    this.permission = 'default';
    this.notificationHistory = [];
    this.maxNotificationsPerDay = 3;
    this.minimumGapMinutes = 120; // 2 hours between notifications
    
    // Initialize messaging if supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      this.messaging = getMessaging(app);
      this.permission = Notification.permission;
      this.setupMessageListener();
    }
  }

  // Ask user for notification permission
  async requestPermission() {
    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
      }

      // Check if permission already granted
      if (this.permission === 'granted') {
        console.log('Notification permission already granted');
        return true;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      this.permission = permission;

      if (permission === 'granted') {
        console.log('Notification permission granted');
        await this.registerServiceWorker();
        await this.getFCMToken();
        return true;
      } else {
        console.log('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Register the service worker for background notifications
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

  // Get Firebase Cloud Messaging token
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
        // Store token in localStorage for potential backend use
        localStorage.setItem('fcm_token', currentToken);
        return currentToken;
      } else {
        console.log('No FCM token available. Request permission first.');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  // Listen for foreground messages (when app is open)
  setupMessageListener() {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      // Show notification even when app is open
      this.showNotification(
        payload.notification.title,
        payload.notification.body,
        payload.data
      );
    });
  }

  // Check if we can send another notification (rate limiting)
  canSendNotification() {
    const now = Date.now();
    const today = new Date().toDateString();

    // Clean old notifications from history (older than today)
    this.notificationHistory = this.notificationHistory.filter(n => 
      new Date(n.timestamp).toDateString() === today
    );

    // Check daily limit
    if (this.notificationHistory.length >= this.maxNotificationsPerDay) {
      console.log('Daily notification limit reached');
      return false;
    }

    // Check minimum gap between notifications
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

  // Send urge prediction notification
  async sendUrgePredictionNotification(riskScore, reason) {
    try {
      // Check if we have permission
      if (this.permission !== 'granted') {
        console.log('No notification permission');
        return false;
      }

      // Check rate limiting
      if (!this.canSendNotification()) {
        console.log('Rate limit exceeded, notification suppressed');
        return false;
      }

      // Only send if risk is high enough (70%+)
      if (riskScore < 70) {
        console.log('Risk score too low for notification:', riskScore);
        return false;
      }

      const title = '⚠️ High Urge Risk Detected';
      const body = `Risk level: ${riskScore}% - Tap for instant help`;
      const data = {
        type: 'urge_prediction',
        riskScore: riskScore.toString(),
        reason: reason,
        timestamp: Date.now().toString()
      };

      // Show the notification
      const notificationShown = await this.showNotification(title, body, data);

      if (notificationShown) {
        // Record notification in history
        this.notificationHistory.push({
          timestamp: Date.now(),
          riskScore: riskScore,
          reason: reason
        });

        // Save to localStorage for persistence
        localStorage.setItem('notification_history', JSON.stringify(this.notificationHistory));
      }

      return notificationShown;
    } catch (error) {
      console.error('Error sending urge prediction notification:', error);
      return false;
    }
  }

  // Show notification (works in foreground and background)
  async showNotification(title, body, data = {}) {
    try {
      // If browser doesn't support notifications
      if (!('Notification' in window)) {
        console.warn('Browser does not support notifications');
        return false;
      }

      // If we don't have permission
      if (Notification.permission !== 'granted') {
        console.warn('No permission to show notification');
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Show notification through service worker
      await registration.showNotification(title, {
        body: body,
        icon: '/logo192.png', // Uses Create React App default icon
        badge: '/logo192.png',
        tag: 'urge-prediction', // Replaces previous notifications
        requireInteraction: true, // Stays until user interacts
        vibrate: [200, 100, 200], // Vibration pattern
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

  // Get notification statistics
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

  // Clear notification history (for testing)
  clearHistory() {
    this.notificationHistory = [];
    localStorage.removeItem('notification_history');
  }

  // Load notification history from localStorage
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

// Create singleton instance
const notificationService = new NotificationService();

// Load history on initialization
notificationService.loadHistory();

export default notificationService;