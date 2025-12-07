// server/routes/notifications.js
// API endpoints for notification management

const express = require('express');
const router = express.Router();
const NotificationSubscription = require('../models/NotificationSubscription');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const { 
  sendNotificationToUser, 
  sendBulkNotifications,
  notificationTemplates
} = notificationService;

// checkAndSendMilestoneNotification may or may not be exported
const checkAndSendMilestoneNotification = notificationService.checkAndSendMilestoneNotification || (
  async function(username, currentStreak) {
    // Fallback implementation if not exported
    const milestones = [7, 14, 30, 60, 90, 180, 365];
    if (!milestones.includes(currentStreak)) {
      return { success: false, reason: `${currentStreak} is not a milestone day` };
    }
    const templateKey = `milestone_${currentStreak}`;
    if (!notificationTemplates[templateKey]) {
      return { success: false, reason: `No template for milestone_${currentStreak}` };
    }
    return await sendNotificationToUser(username, templateKey);
  }
);

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
    
    // IMPORTANT: Handle case where fcmToken exists under different username
    // (e.g., user deleted account and re-created, or device switched users)
    // First, remove any existing subscription with this fcmToken (different user)
    await NotificationSubscription.deleteMany({ 
      fcmToken: fcmToken, 
      username: { $ne: username } 
    });
    
    // Now upsert the subscription for this username
    const subscription = await NotificationSubscription.findOneAndUpdate(
      { username },
      {
        $set: {
          fcmToken,
          notificationsEnabled: notificationsEnabled !== false,
          failedAttempts: 0,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Notification subscription saved for: ${username}`);
    
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
        dailyReminderTime: '09:00',
        timezone: 'America/New_York'
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
      dailyReminderTime,
      timezone
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
      dailyReminderTime: dailyReminderTime || '09:00',
      timezone: timezone || 'America/New_York'
    };
    
    user.notificationPreferences = preferences;
    await user.save();
    
    console.log(`✅ Updated notification preferences for: ${username} (timezone: ${preferences.timezone})`);
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

// Save notification preferences (POST version for Profile component)
router.post('/notification-preferences/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { 
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      types,
      dailyReminderEnabled,
      dailyReminderTime,
      timezone,
      fcmToken
    } = req.body;
    
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
      dailyReminderTime: dailyReminderTime || '09:00',
      timezone: timezone || 'America/New_York'
    };
    
    user.notificationPreferences = preferences;
    await user.save();
    
    // Also update FCM token in subscription if provided
    if (fcmToken) {
      await NotificationSubscription.findOneAndUpdate(
        { username },
        { fcmToken, notificationsEnabled: true },
        { upsert: true }
      );
    }
    
    console.log(`✅ Saved notification preferences for: ${username} (timezone: ${preferences.timezone})`);
    res.json({ 
      success: true, 
      message: 'Preferences saved successfully',
      preferences: user.notificationPreferences
    });
    
  } catch (error) {
    console.error('❌ Error saving notification preferences:', error);
    res.status(500).json({ 
      error: 'Failed to save preferences',
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

// ============================================================================
// DEBUG/TESTING ENDPOINT - Comprehensive notification testing
// ============================================================================
router.post('/debug-test', async (req, res) => {
  try {
    const { username, notificationType, sendActual = false } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const debugInfo = {
      username,
      notificationType: notificationType || 'daily_reminder',
      timestamp: new Date().toISOString(),
      serverTime: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
      checks: {},
      wouldSend: true,
      blockReasons: [],
      actualSendResult: null
    };
    
    // 1. Check if user exists
    const user = await User.findOne({ username });
    debugInfo.checks.userExists = !!user;
    
    if (!user) {
      debugInfo.wouldSend = false;
      debugInfo.blockReasons.push('User not found in database');
      return res.json(debugInfo);
    }
    
    // 2. Check subscription exists and has FCM token
    const subscription = await NotificationSubscription.findOne({ username });
    debugInfo.checks.subscriptionExists = !!subscription;
    debugInfo.checks.hasValidFcmToken = !!(subscription?.fcmToken);
    debugInfo.checks.subscriptionEnabled = subscription?.notificationsEnabled ?? false;
    
    if (!subscription) {
      debugInfo.wouldSend = false;
      debugInfo.blockReasons.push('No notification subscription found - user needs to enable notifications');
    } else if (!subscription.fcmToken) {
      debugInfo.wouldSend = false;
      debugInfo.blockReasons.push('No FCM token - browser push not registered');
    } else if (!subscription.notificationsEnabled) {
      debugInfo.wouldSend = false;
      debugInfo.blockReasons.push('Notifications disabled at subscription level');
    }
    
    // 3. Get user preferences
    const prefs = user.notificationPreferences || {};
    debugInfo.userPreferences = {
      quietHoursEnabled: prefs.quietHoursEnabled || false,
      quietHoursStart: prefs.quietHoursStart || '22:00',
      quietHoursEnd: prefs.quietHoursEnd || '08:00',
      dailyReminderEnabled: prefs.dailyReminderEnabled || false,
      dailyReminderTime: prefs.dailyReminderTime || '09:00',
      timezone: prefs.timezone || 'America/New_York',
      types: prefs.types || { milestones: true, urgeSupport: true, weeklyProgress: true }
    };
    
    // 4. Check quiet hours (using user's timezone)
    const userTimezone = prefs.timezone || 'America/New_York';
    let userNow;
    try {
      userNow = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
    } catch (e) {
      userNow = new Date();
    }
    const currentMinutes = userNow.getHours() * 60 + userNow.getMinutes();
    debugInfo.checks.userTimezone = userTimezone;
    debugInfo.checks.userLocalTime = `${String(userNow.getHours()).padStart(2, '0')}:${String(userNow.getMinutes()).padStart(2, '0')}`;
    debugInfo.checks.currentTimeMinutes = currentMinutes;
    
    if (prefs.quietHoursEnabled) {
      const [startH, startM] = (prefs.quietHoursStart || '22:00').split(':').map(Number);
      const [endH, endM] = (prefs.quietHoursEnd || '08:00').split(':').map(Number);
      
      const quietStart = startH * 60 + startM;
      const quietEnd = endH * 60 + endM;
      
      debugInfo.checks.quietHoursRange = `${prefs.quietHoursStart} - ${prefs.quietHoursEnd}`;
      debugInfo.checks.quietStartMinutes = quietStart;
      debugInfo.checks.quietEndMinutes = quietEnd;
      
      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      const isQuietTime = quietStart > quietEnd
        ? (currentMinutes >= quietStart || currentMinutes < quietEnd)
        : (currentMinutes >= quietStart && currentMinutes < quietEnd);
      
      debugInfo.checks.isInQuietHours = isQuietTime;
      
      if (isQuietTime) {
        debugInfo.wouldSend = false;
        debugInfo.blockReasons.push(`Currently in quiet hours (${prefs.quietHoursStart} - ${prefs.quietHoursEnd})`);
      }
    } else {
      debugInfo.checks.isInQuietHours = false;
      debugInfo.checks.quietHoursRange = 'Disabled';
    }
    
    // 5. Check notification type preference
    const type = notificationType || 'daily_reminder';
    const typeCategory = type.split('_')[0];
    
    // Map notification types to preference keys
    const typeMapping = {
      'milestone': 'milestones',
      'daily': 'dailyReminder', // Special handling
      'urge': 'urgeSupport',
      'weekly': 'weeklyProgress',
      'encouragement': 'weeklyProgress',
      'motivational': 'weeklyProgress',
      'streak': 'milestones'
    };
    
    const prefKey = typeMapping[typeCategory];
    debugInfo.checks.notificationType = type;
    debugInfo.checks.typeCategory = typeCategory;
    debugInfo.checks.mappedPreferenceKey = prefKey;
    
    // Special handling for daily reminder
    if (typeCategory === 'daily') {
      debugInfo.checks.dailyReminderEnabled = prefs.dailyReminderEnabled || false;
      debugInfo.checks.dailyReminderTime = prefs.dailyReminderTime || '09:00';
      
      if (!prefs.dailyReminderEnabled) {
        debugInfo.wouldSend = false;
        debugInfo.blockReasons.push('Daily reminders are disabled in preferences');
      } else {
        // Check if current hour matches reminder time (in user's timezone)
        const [reminderH] = (prefs.dailyReminderTime || '09:00').split(':').map(Number);
        const currentHour = userNow.getHours();
        debugInfo.checks.currentHour = currentHour;
        debugInfo.checks.reminderHour = reminderH;
        debugInfo.checks.hoursMatch = currentHour === reminderH;
        
        if (currentHour !== reminderH) {
          debugInfo.checks.schedulerWouldSkip = true;
          debugInfo.checks.schedulerNote = `Scheduler runs hourly. Would fire at ${String(reminderH).padStart(2, '0')}:00 ${userTimezone}, current local hour is ${String(currentHour).padStart(2, '0')}:00`;
        }
      }
    } else if (prefKey && prefs.types) {
      const isTypeEnabled = prefs.types[prefKey] !== false;
      debugInfo.checks.typeEnabled = isTypeEnabled;
      
      if (!isTypeEnabled) {
        debugInfo.wouldSend = false;
        debugInfo.blockReasons.push(`${prefKey} notifications are disabled in preferences`);
      }
    }
    
    // 6. Check template exists
    const templateExists = !!notificationTemplates[type];
    debugInfo.checks.templateExists = templateExists;
    
    if (!templateExists) {
      debugInfo.checks.availableTemplates = Object.keys(notificationTemplates);
      debugInfo.blockReasons.push(`Template '${type}' not found. Available: ${Object.keys(notificationTemplates).join(', ')}`);
    } else {
      debugInfo.templatePreview = {
        title: notificationTemplates[type].title,
        body: notificationTemplates[type].body
      };
    }
    
    // 7. User streak info (for milestone context)
    debugInfo.userInfo = {
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0
    };
    
    // Final determination
    debugInfo.wouldSend = debugInfo.blockReasons.length === 0;
    
    // 8. Actually send if requested and would succeed
    if (sendActual && debugInfo.wouldSend) {
      debugInfo.actualSendAttempted = true;
      const result = await sendNotificationToUser(username, type, { debug: 'true' });
      debugInfo.actualSendResult = result;
    }
    
    // Summary
    debugInfo.summary = debugInfo.wouldSend 
      ? '✅ All checks passed - notification would be sent'
      : `❌ Blocked by: ${debugInfo.blockReasons.join('; ')}`;
    
    res.json(debugInfo);
    
  } catch (error) {
    console.error('❌ Error in debug-test:', error);
    res.status(500).json({ 
      error: 'Debug test failed',
      details: error.message 
    });
  }
});

// ============================================================================
// LIST ALL AVAILABLE NOTIFICATION TEMPLATES
// ============================================================================
router.get('/templates', async (req, res) => {
  try {
    const templates = Object.entries(notificationTemplates).map(([key, value]) => ({
      key,
      title: value.title,
      body: value.body,
      category: key.split('_')[0]
    }));
    
    res.json({
      success: true,
      count: templates.length,
      templates
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// ============================================================================
// GET ALL SUBSCRIBED USERS (for testing)
// ============================================================================
router.get('/subscribed-users', async (req, res) => {
  try {
    const subscriptions = await NotificationSubscription.find({ notificationsEnabled: true })
      .select('username notificationsEnabled createdAt')
      .lean();
    
    res.json({
      success: true,
      count: subscriptions.length,
      users: subscriptions.map(s => ({
        username: s.username,
        enabled: s.notificationsEnabled,
        subscribedAt: s.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get subscribed users' });
  }
});

module.exports = router;