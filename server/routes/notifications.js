// server/routes/notifications.js
// API endpoints for notification management

const express = require('express');
const router = express.Router();
const NotificationSubscription = require('../models/NotificationSubscription');
const { 
  sendNotificationToUser, 
  sendBulkNotifications,
  checkAndSendMilestoneNotification 
} = require('../services/notificationService');

// Subscribe to notifications (store FCM token)
router.post('/subscribe', async (req, res) => {
  try {
    const { username, fcmToken, notificationsEnabled } = req.body;
    
    // Validate input
    if (!username || !fcmToken) {
      return res.status(400).json({ 
        error: 'Missing required fields: username and fcmToken' 
      });
    }
    
    // Check if subscription already exists
    let subscription = await NotificationSubscription.findOne({ username });
    
    if (subscription) {
      // Update existing subscription
      subscription.fcmToken = fcmToken;
      subscription.notificationsEnabled = notificationsEnabled !== false;
      subscription.failedAttempts = 0;
      await subscription.save();
      
      console.log(`✅ Updated notification subscription for: ${username}`);
    } else {
      // Create new subscription
      subscription = new NotificationSubscription({
        username,
        fcmToken,
        notificationsEnabled: notificationsEnabled !== false
      });
      await subscription.save();
      
      console.log(`✅ Created new notification subscription for: ${username}`);
    }
    
    res.json({ 
      success: true, 
      message: 'Subscribed to notifications successfully',
      subscription 
    });
    
  } catch (error) {
    console.error('❌ Error subscribing to notifications:', error);
    res.status(500).json({ 
      error: 'Failed to subscribe to notifications',
      details: error.message 
    });
  }
});

// Unsubscribe from notifications
router.post('/unsubscribe', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Find and disable subscription
    const subscription = await NotificationSubscription.findOne({ username });
    
    if (subscription) {
      subscription.notificationsEnabled = false;
      await subscription.save();
      
      console.log(`✅ Disabled notifications for: ${username}`);
      res.json({ 
        success: true, 
        message: 'Unsubscribed from notifications successfully' 
      });
    } else {
      res.status(404).json({ 
        error: 'Subscription not found' 
      });
    }
    
  } catch (error) {
    console.error('❌ Error unsubscribing from notifications:', error);
    res.status(500).json({ 
      error: 'Failed to unsubscribe from notifications',
      details: error.message 
    });
  }
});

// Update notification preferences
router.put('/preferences', async (req, res) => {
  try {
    const { 
      username, 
      notificationTypes, 
      reminderTime, 
      quietHours 
    } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const subscription = await NotificationSubscription.findOne({ username });
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Update preferences
    if (notificationTypes) {
      subscription.notificationTypes = {
        ...subscription.notificationTypes,
        ...notificationTypes
      };
    }
    
    if (reminderTime) {
      subscription.reminderTime = reminderTime;
    }
    
    if (quietHours) {
      subscription.quietHours = {
        ...subscription.quietHours,
        ...quietHours
      };
    }
    
    await subscription.save();
    
    console.log(`✅ Updated notification preferences for: ${username}`);
    res.json({ 
      success: true, 
      message: 'Preferences updated successfully',
      subscription 
    });
    
  } catch (error) {
    console.error('❌ Error updating notification preferences:', error);
    res.status(500).json({ 
      error: 'Failed to update preferences',
      details: error.message 
    });
  }
});

// Get user's notification preferences
router.get('/preferences/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const subscription = await NotificationSubscription.findOne({ username });
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    res.json({ 
      success: true, 
      subscription 
    });
    
  } catch (error) {
    console.error('❌ Error fetching notification preferences:', error);
    res.status(500).json({ 
      error: 'Failed to fetch preferences',
      details: error.message 
    });
  }
});

// Send notification to specific user (manual trigger)
router.post('/send', async (req, res) => {
  try {
    const { username, templateKey, customData } = req.body;
    
    if (!username || !templateKey) {
      return res.status(400).json({ 
        error: 'Missing required fields: username and templateKey' 
      });
    }
    
    const result = await sendNotificationToUser(username, templateKey, customData);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Notification sent successfully',
        messageId: result.messageId 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        reason: result.reason,
        error: result.error 
      });
    }
    
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    res.status(500).json({ 
      error: 'Failed to send notification',
      details: error.message 
    });
  }
});

// Send bulk notifications (admin only - add auth middleware in production)
router.post('/send-bulk', async (req, res) => {
  try {
    const { usernames, templateKey, customData } = req.body;
    
    if (!usernames || !Array.isArray(usernames) || !templateKey) {
      return res.status(400).json({ 
        error: 'Missing required fields: usernames (array) and templateKey' 
      });
    }
    
    const result = await sendBulkNotifications(usernames, templateKey, customData);
    
    res.json({ 
      success: true, 
      message: 'Bulk notifications sent',
      stats: result 
    });
    
  } catch (error) {
    console.error('❌ Error sending bulk notifications:', error);
    res.status(500).json({ 
      error: 'Failed to send bulk notifications',
      details: error.message 
    });
  }
});

// Check and send milestone notification
router.post('/check-milestone', async (req, res) => {
  try {
    const { username, currentStreak } = req.body;
    
    if (!username || currentStreak === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: username and currentStreak' 
      });
    }
    
    const result = await checkAndSendMilestoneNotification(username, currentStreak);
    
    res.json({ 
      success: result.success,
      reason: result.reason,
      messageId: result.messageId 
    });
    
  } catch (error) {
    console.error('❌ Error checking milestone:', error);
    res.status(500).json({ 
      error: 'Failed to check milestone',
      details: error.message 
    });
  }
});

// Test endpoint to send a test notification
router.post('/test', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const result = await sendNotificationToUser(username, 'daily_reminder', {
      test: 'true'
    });
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Test notification sent successfully!' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        reason: result.reason,
        message: 'Failed to send test notification' 
      });
    }
    
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    res.status(500).json({ 
      error: 'Failed to send test notification',
      details: error.message 
    });
  }
});

module.exports = router;