// server/routes/notifications.js
// API endpoints for notification management

const express = require('express');
const router = express.Router();
const NotificationSubscription = require('../models/NotificationSubscription');
const User = require('../models/User');
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

// UPDATED: Get user's notification preferences from User model
router.get('/preferences/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Get preferences from User model instead of NotificationSubscription
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Also get subscription info for backward compatibility
    const subscription = await NotificationSubscription.findOne({ username });
    
    res.json({ 
      success: true, 
      preferences: user.notificationPreferences || {
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        types: {
          milestones: true,
          urgeSupport: true,
          weeklyProgress: true
        },
        dailyReminderEnabled: false,
        dailyReminderTime: '09:00'
      },
      subscription: subscription || null
    });
    
  } catch (error) {
    console.error('❌ Error fetching notification preferences:', error);
    res.status(500).json({ 
      error: 'Failed to fetch preferences',
      details: error.message 
    });
  }
});

// UPDATED: Update notification preferences in User model
router.put('/preferences', async (req, res) => {
  try {
    const { 
      username, 
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      types,
      dailyReminderEnabled,
      dailyReminderTime
    } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Update preferences in User model
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Build preferences object
    const preferences = {
      quietHoursEnabled: quietHoursEnabled || false,
      quietHoursStart: quietHoursStart || '22:00',
      quietHoursEnd: quietHoursEnd || '08:00',
      types: types || { milestones: true, urgeSupport: true, weeklyProgress: true },
      dailyReminderEnabled: dailyReminderEnabled || false,
      dailyReminderTime: dailyReminderTime || '09:00'
    };
    
    user.notificationPreferences = preferences;
    await user.save();
    
    console.log(`✅ Updated notification preferences for: ${username}`);
    res.json({ 
      success: true, 
      message: 'Preferences updated successfully',
      preferences: user.notificationPreferences
    });
    
  } catch (error) {
    console.error('❌ Error updating notification preferences:', error);
    res.status(500).json({ 
      error: 'Failed to update preferences',
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