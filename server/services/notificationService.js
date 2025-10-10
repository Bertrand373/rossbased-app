// server/services/notificationService.js
// Service for sending push notifications via Firebase Cloud Messaging

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
      throw new Error('Missing required Firebase environment variables');
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
    throw error;
  }
}

// Initialize on module load
initializeFirebase();

// NEW: Check if user preferences allow this notification
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
      'encouragement': 'weeklyProgress', // Use weekly progress for general encouragement
      'streak': 'milestones' // Streak reminders use milestone setting
    };
    
    const prefKey = typeMapping[typeCategory];
    
    if (prefKey && prefs.types && prefs.types[prefKey] === false) {
      console.log(`⏸️ ${notificationType} notifications disabled for ${username}`);
      return false;
    }
    
    // Check quiet hours
    if (prefs.quietHoursEnabled) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
      const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);
      
      const quietStart = startH * 60 + startM;
      const quietEnd = endH * 60 + endM;
      
      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      const isQuietTime = quietStart > quietEnd
        ? (currentMinutes >= quietStart || currentMinutes < quietEnd)
        : (currentMinutes >= quietStart && currentMinutes < quietEnd);
      
      if (isQuietTime) {
        console.log(`🌙 Quiet hours active for ${username} - notification postponed`);
        return false;
      }
    }
    
    return true; // All checks passed
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    return true; // Default to allowing notification on error
  }
}

// Check if user is in quiet hours (legacy function for NotificationSubscription model)
function isInQuietHours(subscription) {
  if (!subscription.quietHours.enabled) return false;
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  const [startHour, startMinute] = subscription.quietHours.start.split(':').map(Number);
  const [endHour, endMinute] = subscription.quietHours.end.split(':').map(Number);
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;
  
  // Handle cases where quiet hours span midnight
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }
  
  return currentTime >= startTime && currentTime < endTime;
}

// Notification content templates
const notificationTemplates = {
  milestone_7: {
    title: '🔥 7 Day Milestone!',
    body: 'Incredible work! You\'ve reached 7 days. Keep going strong!',
    data: { url: '/stats', type: 'milestone', days: '7' }
  },
  milestone_14: {
    title: '💪 14 Day Champion!',
    body: 'Two weeks of strength! You\'re building unstoppable momentum!',
    data: { url: '/stats', type: 'milestone', days: '14' }
  },
  milestone_30: {
    title: '👑 30 Day Master!',
    body: 'One month of excellence! You\'re proving your dedication!',
    data: { url: '/stats', type: 'milestone', days: '30' }
  },
  milestone_60: {
    title: '🌟 60 Day Legend!',
    body: 'Two months of transformation! Your willpower is inspiring!',
    data: { url: '/stats', type: 'milestone', days: '60' }
  },
  milestone_90: {
    title: '🏆 90 Day King!',
    body: 'Three months of mastery! You\'ve reached elite status!',
    data: { url: '/stats', type: 'milestone', days: '90' }
  },
  milestone_180: {
    title: '⚡ 180 Day Titan!',
    body: 'Six months of unwavering discipline! You are unstoppable!',
    data: { url: '/stats', type: 'milestone', days: '180' }
  },
  milestone_365: {
    title: '🎯 365 Day LEGEND!',
    body: 'ONE YEAR! You\'ve achieved what few ever do. Legendary status!',
    data: { url: '/stats', type: 'milestone', days: '365' }
  },
  encouragement_morning: {
    title: '☀️ New Day, New Strength',
    body: 'Good morning, King! Today is another opportunity to prove your power!',
    data: { url: '/', type: 'encouragement' }
  },
  encouragement_evening: {
    title: '🌙 Stay Strong Tonight',
    body: 'Evening is here. Remember your commitment. You\'ve got this!',
    data: { url: '/', type: 'encouragement' }
  },
  urge_high_risk: {
    title: '🚨 Danger Zone Detected',
    body: 'Your patterns suggest high risk. Remember your goals. Stay strong!',
    data: { url: '/emergency', type: 'urge_warning' }
  },
  urge_medium_risk: {
    title: '⚠️ Stay Alert',
    body: 'Detected some risky patterns. Take a moment to refocus.',
    data: { url: '/emergency', type: 'urge_warning' }
  },
  streak_save: {
    title: '💎 Your Streak Matters',
    body: 'Don\'t throw away all your progress. You\'ve worked too hard!',
    data: { url: '/stats', type: 'streak_reminder' }
  }
};

// Send notification to a single device
async function sendNotification(fcmToken, notificationType, customData = {}) {
  try {
    if (!firebaseInitialized) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    // Get notification template
    const template = notificationTemplates[notificationType];
    if (!template) {
      throw new Error(`Unknown notification type: ${notificationType}`);
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
    console.error('❌ Error sending notification:', error);
    return { success: false, error: error.message };
  }
}

// Send notification to a user (looks up their subscriptions and checks preferences)
async function sendNotificationToUser(username, notificationType, customData = {}) {
  try {
    // NEW: Check user preferences first
    const shouldSend = await shouldSendNotification(username, notificationType);
    
    if (!shouldSend) {
      console.log(`⏸️ Skipping ${notificationType} notification for ${username} (user preferences)`);
      return { success: false, reason: 'blocked_by_preferences' };
    }
    
    // Find user's active subscriptions
    const subscriptions = await NotificationSubscription.find({
      username: username,
      isActive: true
    });

    if (subscriptions.length === 0) {
      console.log(`No active subscriptions found for user: ${username}`);
      return { success: false, error: 'No active subscriptions' };
    }

    const results = [];
    
    for (const subscription of subscriptions) {
      // Legacy check for NotificationSubscription model quiet hours
      if (isInQuietHours(subscription)) {
        console.log(`User ${username} is in quiet hours (subscription model), skipping notification`);
        continue;
      }

      // Legacy check for NotificationSubscription preferences
      const notificationCategory = notificationType.split('_')[0];
      if (!subscription.preferences[notificationCategory]) {
        console.log(`User ${username} has disabled ${notificationCategory} notifications (subscription model)`);
        continue;
      }

      // Send notification
      const result = await sendNotification(subscription.fcmToken, notificationType, customData);
      results.push({ subscription: subscription._id, ...result });
    }

    return {
      success: results.some(r => r.success),
      results: results
    };
  } catch (error) {
    console.error('❌ Error sending notification to user:', error);
    return { success: false, error: error.message };
  }
}

// Send bulk notifications (e.g., for daily encouragement)
async function sendBulkNotifications(notificationType, customData = {}) {
  try {
    const subscriptions = await NotificationSubscription.find({ isActive: true });
    console.log(`Sending ${notificationType} to ${subscriptions.length} active subscriptions`);

    const results = [];
    
    for (const subscription of subscriptions) {
      // NEW: Check user preferences
      const shouldSend = await shouldSendNotification(subscription.username, notificationType);
      if (!shouldSend) continue;
      
      // Check quiet hours and preferences (legacy)
      if (isInQuietHours(subscription)) continue;
      
      const notificationCategory = notificationType.split('_')[0];
      if (!subscription.preferences[notificationCategory]) continue;

      const result = await sendNotification(subscription.fcmToken, notificationType, customData);
      results.push({ username: subscription.username, ...result });
      
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

module.exports = {
  sendNotification,
  sendNotificationToUser,
  sendBulkNotifications,
  notificationTemplates,
  shouldSendNotification
};