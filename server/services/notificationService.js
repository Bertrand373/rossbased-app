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

// Check if user preferences allow this notification
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
  if (!subscription.quietHours || !subscription.quietHours.enabled) return false;
  
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
    // Check user preferences first
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
      if (subscription.preferences && !subscription.preferences[notificationCategory]) {
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
async function sendBulkNotifications(usernames, notificationType, customData = {}) {
  try {
    console.log(`Sending ${notificationType} to ${usernames.length} users`);

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

// Check and send milestone notification
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

module.exports = {
  sendNotification,
  sendNotificationToUser,
  sendBulkNotifications,
  checkAndSendMilestoneNotification,
  notificationTemplates,
  shouldSendNotification
};