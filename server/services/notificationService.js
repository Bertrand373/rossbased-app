// server/services/notificationService.js
// Service for sending push notifications via Firebase Cloud Messaging
// FULLY FIXED VERSION - Timezone-aware, correct field names, bulletproof

const admin = require('firebase-admin');
const NotificationSubscription = require('../models/NotificationSubscription');
const User = require('../models/User');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;
  
  try {
    // Get Firebase credentials from environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    // Validate that all required environment variables are present
    if (!projectId || !privateKey || !clientEmail) {
      console.warn('⚠️ Missing Firebase environment variables - notifications disabled');
      return;
    }
    
    // Initialize Firebase Admin with environment variables
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
        clientEmail: clientEmail
      }),
      projectId: projectId
    });
    
    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
  }
}

// Initialize on module load
initializeFirebase();

// ============================================================================
// TIMEZONE UTILITY
// ============================================================================

/**
 * Get current hour and minutes in a specific timezone
 * @param {string} timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns {{hours: number, minutes: number, totalMinutes: number}}
 */
function getCurrentTimeInTimezone(timezone) {
  try {
    const now = new Date();
    const options = { hour: 'numeric', minute: 'numeric', hour12: false, timeZone: timezone };
    const timeStr = new Intl.DateTimeFormat('en-US', options).format(now);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return {
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes
    };
  } catch (error) {
    // If timezone is invalid, fall back to UTC
    console.warn(`⚠️ Invalid timezone "${timezone}", falling back to UTC`);
    const now = new Date();
    return {
      hours: now.getUTCHours(),
      minutes: now.getUTCMinutes(),
      totalMinutes: now.getUTCHours() * 60 + now.getUTCMinutes()
    };
  }
}

// ============================================================================
// PREFERENCE CHECKING - TIMEZONE AWARE
// ============================================================================

/**
 * Check if user preferences allow this notification
 * Now timezone-aware for quiet hours
 */
async function shouldSendNotification(username, notificationType) {
  try {
    // Fetch user's notification preferences from User model
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log(`❌ User not found: ${username}`);
      return false;
    }
    
    const prefs = user.notificationPreferences;
    
    // If no preferences set, allow all notifications (default behavior)
    if (!prefs) {
      return true;
    }
    
    // Check if this notification type is enabled
    const typeCategory = notificationType.split('_')[0]; // e.g., 'milestone', 'urge', 'weekly'
    
    // Map notification types to preference keys
    const typeMapping = {
      'milestone': 'milestones',
      'urge': 'urgeSupport',
      'weekly': 'weeklyProgress',
      'encouragement': 'weeklyProgress',
      'streak': 'milestones',
      'daily': 'dailyReminder',
      'motivational': 'weeklyProgress'
    };
    
    const prefKey = typeMapping[typeCategory];
    
    // Special handling for daily reminder - check if specifically enabled
    if (typeCategory === 'daily') {
      if (!prefs.dailyReminderEnabled) {
        console.log(`⏸️ Daily reminders disabled for ${username}`);
        return false;
      }
    } else if (prefKey && prefs.types && prefs.types[prefKey] === false) {
      console.log(`⏸️ ${notificationType} notifications disabled for ${username}`);
      return false;
    }
    
    // Check quiet hours - NOW TIMEZONE AWARE
    if (prefs.quietHoursEnabled) {
      const timezone = prefs.timezone || 'America/New_York';
      const userTime = getCurrentTimeInTimezone(timezone);
      const currentMinutes = userTime.totalMinutes;
      
      const [startH, startM] = (prefs.quietHoursStart || '22:00').split(':').map(Number);
      const [endH, endM] = (prefs.quietHoursEnd || '08:00').split(':').map(Number);
      
      const quietStart = startH * 60 + startM;
      const quietEnd = endH * 60 + endM;
      
      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      const isQuietTime = quietStart > quietEnd
        ? (currentMinutes >= quietStart || currentMinutes < quietEnd)
        : (currentMinutes >= quietStart && currentMinutes < quietEnd);
      
      if (isQuietTime) {
        console.log(`🌙 Quiet hours active for ${username} (${timezone}: ${userTime.hours}:${String(userTime.minutes).padStart(2, '0')}) - notification blocked`);
        return false;
      }
    }
    
    return true; // All checks passed
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    return true; // Default to allowing notification on error
  }
}

// ============================================================================
// NOTIFICATION TEMPLATES - Discreet, mature, non-embarrassing
// ============================================================================
const notificationTemplates = {
  // DAILY REMINDER
  daily_reminder: {
    title: 'TitanTrack',
    body: 'Log your day.',
    data: { url: '/', type: 'daily_reminder' }
  },
  
  // WEEKLY MOTIVATIONAL (Monday)
  motivational: {
    title: 'TitanTrack',
    body: 'New week. Stay locked in.',
    data: { url: '/', type: 'motivational' }
  },
  
  // MILESTONES - Clean, confident, no emojis
  milestone_7: {
    title: 'Day 7',
    body: 'First week done. Keep building.',
    data: { url: '/stats', type: 'milestone', days: '7' }
  },
  milestone_14: {
    title: 'Day 14',
    body: 'Two weeks. Momentum is real.',
    data: { url: '/stats', type: 'milestone', days: '14' }
  },
  milestone_30: {
    title: 'Day 30',
    body: 'One month. You\'re different now.',
    data: { url: '/stats', type: 'milestone', days: '30' }
  },
  milestone_60: {
    title: 'Day 60',
    body: 'Two months in. Stay the course.',
    data: { url: '/stats', type: 'milestone', days: '60' }
  },
  milestone_90: {
    title: 'Day 90',
    body: 'Quarter year. This is who you are now.',
    data: { url: '/stats', type: 'milestone', days: '90' }
  },
  milestone_180: {
    title: 'Day 180',
    body: 'Six months. Rare territory.',
    data: { url: '/stats', type: 'milestone', days: '180' }
  },
  milestone_365: {
    title: 'Day 365',
    body: 'One year. Few make it here.',
    data: { url: '/stats', type: 'milestone', days: '365' }
  },
  
  // ENCOURAGEMENT - Subtle, respectful
  encouragement_morning: {
    title: 'TitanTrack',
    body: 'New day. Stay focused.',
    data: { url: '/', type: 'encouragement' }
  },
  encouragement_evening: {
    title: 'TitanTrack',
    body: 'End of day. How\'d you hold up?',
    data: { url: '/', type: 'encouragement' }
  },
  
  // URGE SUPPORT - Calm, grounding
  urge_high_risk: {
    title: 'TitanTrack',
    body: 'Breathe. This will pass.',
    data: { url: '/emergency', type: 'urge_warning' }
  },
  urge_medium_risk: {
    title: 'TitanTrack',
    body: 'Take a moment. Refocus.',
    data: { url: '/emergency', type: 'urge_warning' }
  },
  
  // STREAK REMINDER
  streak_save: {
    title: 'TitanTrack',
    body: 'You know what to do.',
    data: { url: '/stats', type: 'streak_reminder' }
  },
  
  // WEEKLY PROGRESS
  weekly_progress: {
    title: 'TitanTrack',
    body: 'Your weekly summary is ready.',
    data: { url: '/stats', type: 'weekly_progress' }
  }
};

// ============================================================================
// SEND NOTIFICATION TO SINGLE DEVICE
// ============================================================================

async function sendNotification(fcmToken, notificationType, customData = {}) {
  try {
    if (!firebaseInitialized) {
      console.warn('⚠️ Firebase not initialized - cannot send notification');
      return { success: false, error: 'Firebase not initialized' };
    }

    // Get notification template
    const template = notificationTemplates[notificationType];
    if (!template) {
      console.error(`❌ Unknown notification type: ${notificationType}`);
      return { success: false, error: `Unknown notification type: ${notificationType}` };
    }

    // Prepare message
    const message = {
      token: fcmToken,
      notification: {
        title: template.title,
        body: template.body
      },
      data: {
        ...template.data,
        ...customData,
        timestamp: Date.now().toString()
      },
      webpush: {
        fcmOptions: {
          link: template.data.url
        },
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
          requireInteraction: false
        }
      }
    };

    // Send message
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent successfully:', response);
    return { success: true, messageId: response };
  } catch (error) {
    // Handle specific Firebase errors
    if (error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token') {
      console.log(`⚠️ Invalid/expired FCM token - marking for cleanup`);
      return { success: false, error: 'invalid_token', shouldRemove: true };
    }
    
    console.error('❌ Error sending notification:', error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// SEND NOTIFICATION TO USER - FIXED VERSION
// ============================================================================

async function sendNotificationToUser(username, notificationType, customData = {}) {
  try {
    // Check user preferences first
    const shouldSend = await shouldSendNotification(username, notificationType);
    
    if (!shouldSend) {
      return { success: false, reason: 'blocked_by_preferences' };
    }
    
    // Find user's subscription - FIXED: use correct field name
    const subscription = await NotificationSubscription.findOne({
      username: username,
      notificationsEnabled: true  // FIXED: was 'isActive' which doesn't exist
    });

    if (!subscription) {
      console.log(`📭 No active subscription for ${username}`);
      return { success: false, reason: 'no_subscription' };
    }

    if (!subscription.fcmToken) {
      console.log(`📭 No FCM token for ${username}`);
      return { success: false, reason: 'no_fcm_token' };
    }

    // Send notification
    const result = await sendNotification(subscription.fcmToken, notificationType, customData);
    
    // If token is invalid, disable the subscription
    if (result.shouldRemove) {
      console.log(`🧹 Disabling invalid subscription for ${username}`);
      await NotificationSubscription.updateOne(
        { _id: subscription._id },
        { $set: { notificationsEnabled: false, failedAttempts: (subscription.failedAttempts || 0) + 1 } }
      );
    }
    
    // Update last notification sent timestamp on success
    if (result.success) {
      await NotificationSubscription.updateOne(
        { _id: subscription._id },
        { $set: { lastNotificationSent: new Date() } }
      );
    }

    return result;
  } catch (error) {
    console.error(`❌ Error sending notification to ${username}:`, error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// SEND BULK NOTIFICATIONS
// ============================================================================

async function sendBulkNotifications(usernames, notificationType, customData = {}) {
  try {
    console.log(`📤 Sending ${notificationType} to ${usernames.length} users`);

    const results = [];
    
    for (const username of usernames) {
      const result = await sendNotificationToUser(username, notificationType, customData);
      results.push({ username, ...result });
      
      // Add small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Sent ${successCount}/${results.length} notifications successfully`);

    return {
      success: true,
      totalSent: successCount,
      totalFailed: results.length - successCount,
      results: results
    };
  } catch (error) {
    console.error('❌ Error sending bulk notifications:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// MILESTONE NOTIFICATION HELPER
// ============================================================================

async function checkAndSendMilestoneNotification(username, currentStreak) {
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

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  sendNotification,
  sendNotificationToUser,
  sendBulkNotifications,
  checkAndSendMilestoneNotification,
  notificationTemplates,
  shouldSendNotification,
  getCurrentTimeInTimezone
};