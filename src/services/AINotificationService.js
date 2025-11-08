// src/services/AINotificationService.js
// Handles sending Firebase Cloud Messaging notifications for AI predictions

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

class AINotificationService {
  /**
   * Send AI prediction notification through Firebase backend
   * @param {string} username - User's username
   * @param {number} riskScore - Risk score (0-100)
   * @param {string} reason - Reason for the prediction
   * @returns {Promise<boolean>} Success status
   */
  async sendAIPredictionNotification(username, riskScore, reason) {
    try {
      // Don't send notifications for low risk
      if (riskScore < 70) {
        console.log('Risk score too low for notification:', riskScore);
        return false;
      }

      // Get FCM token from localStorage
      const fcmToken = localStorage.getItem('fcmToken');
      
      if (!fcmToken) {
        console.warn('No FCM token available - user may not have enabled notifications');
        return false;
      }

      // Determine notification type based on risk level
      let notificationType;
      if (riskScore >= 80) {
        notificationType = 'urge_high_risk';
      } else if (riskScore >= 70) {
        notificationType = 'urge_medium_risk';
      } else {
        notificationType = 'urge_alert';
      }

      console.log(`🔔 Sending AI prediction notification: ${notificationType} (${riskScore}%)`);

      // Send notification through backend
      const response = await fetch(`${API_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          notificationType,
          customData: {
            riskScore: riskScore.toString(),
            reason: reason,
            source: 'ai_prediction',
            timestamp: Date.now().toString()
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ AI prediction notification sent successfully');
        
        // Also show local browser notification as backup
        this.showLocalNotification(riskScore, reason);
        
        return true;
      } else {
        console.error('❌ Failed to send AI notification:', result.reason || result.error);
        
        // Fallback to local notification
        this.showLocalNotification(riskScore, reason);
        
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending AI prediction notification:', error);
      
      // Fallback to local notification
      this.showLocalNotification(riskScore, reason);
      
      return false;
    }
  }

  /**
   * Show local browser notification as fallback
   * @param {number} riskScore - Risk score
   * @param {string} reason - Reason for prediction
   */
  async showLocalNotification(riskScore, reason) {
    try {
      if (!('Notification' in window)) {
        console.warn('Browser does not support notifications');
        return;
      }

      if (Notification.permission !== 'granted') {
        console.warn('No permission to show notification');
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      let title, body;
      if (riskScore >= 80) {
        title = '🚨 CRITICAL: High Relapse Risk';
        body = 'AI detected critical risk patterns. Take action now!';
      } else if (riskScore >= 70) {
        title = '⚠️ WARNING: Elevated Relapse Risk';
        body = 'AI detected concerning patterns. Stay vigilant!';
      } else {
        title = '⚡ AI Alert: Risk Detected';
        body = 'Your patterns suggest increased risk.';
      }

      await registration.showNotification(title, {
        body: body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'ai-prediction',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        data: {
          type: 'ai_prediction',
          riskScore: riskScore.toString(),
          reason: reason,
          url: '/urge-prediction'
        },
        actions: [
          {
            action: 'view',
            title: 'View Details'
          },
          {
            action: 'emergency',
            title: 'Emergency Help'
          }
        ]
      });

      console.log('✅ Local notification shown as fallback');
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  /**
   * Test notification system
   * @param {string} username - User's username
   */
  async testNotification(username) {
    try {
      console.log('🧪 Testing AI notification system...');
      
      const result = await this.sendAIPredictionNotification(
        username,
        75,
        'Test notification from AI system'
      );

      return result;
    } catch (error) {
      console.error('Error testing notification:', error);
      return false;
    }
  }
}

const aiNotificationService = new AINotificationService();
export default aiNotificationService;