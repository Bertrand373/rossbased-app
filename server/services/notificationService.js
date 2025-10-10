// server/services/notificationService.js
// Service for sending push notifications via Firebase Cloud Messaging

const admin = require('firebase-admin');
const NotificationSubscription = require('../models/NotificationSubscription');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;
  
  try {
    const serviceAccount = require('../firebase-service-account.json');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
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

// Check if user is in quiet hours
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
  daily_reminder: {
    title: '💪 Daily Check-In',
    body: 'How are you feeling today? Log your progress and stay strong!',
    data: { url: '/', type: 'reminder' }
  },
  motivational: {
    title: '🛡️ Weekly Motivation',
    body: 'Every day you resist is a victory. Keep building your legacy!',
    data: { url: '/urge-toolkit', type: 'motivational' }
  },
  relapse_support: {
    title: '🌅 Fresh Start',
    body: 'One setback doesn\'t define you. You\'ve got this. Start fresh today!',
    data: { url: '/urge-toolkit', type: 'support' }
  }
};

// Send notification to a specific user
async function sendNotificationToUser(username, templateKey, customData = {}) {
  try {
    // Find user's subscription
    const subscription = await NotificationSubscription.findOne({
      username,
      notificationsEnabled: true
    });
    
    if (!subscription) {
      console.log(`⚠️ No active subscription found for user: ${username}`);
      return { success: false, reason: 'no_subscription' };
    }
    
    // Check quiet hours
    if (isInQuietHours(subscription)) {
      console.log(`🌙 User ${username} is in quiet hours, skipping notification`);
      return { success: false, reason: 'quiet_hours' };
    }
    
    // Get notification template
    const template = notificationTemplates[templateKey];
    if (!template) {
      console.error(`❌ Invalid template key: ${templateKey}`);
      return { success: false, reason: 'invalid_template' };
    }
    
    // Check if user wants this notification type
    const notificationType = template.data.type;
    if (subscription.notificationTypes[notificationType] === false) {
      console.log(`⚠️ User ${username} has disabled ${notificationType} notifications`);
      return { success: false, reason: 'notification_type_disabled' };
    }
    
    // Prepare FCM message
    const message = {
      token: subscription.fcmToken,
      notification: {
        title: template.title,
        body: template.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png'
      },
      data: {
        ...template.data,
        ...customData,
        timestamp: new Date().toISOString()
      },
      webpush: {
        fcmOptions: {
          link: `https://app.rossbased.com${template.data.url}`
        }
      }
    };
    
    // Send the notification
    const response = await admin.messaging().send(message);
    
    // Update last notification sent time
    subscription.lastNotificationSent = new Date();
    subscription.failedAttempts = 0;
    await subscription.save();
    
    console.log(`✅ Notification sent successfully to ${username}:`, response);
    return { success: true, messageId: response };
    
  } catch (error) {
    console.error(`❌ Error sending notification to ${username}:`, error);
    
    // Handle invalid token errors
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      // Remove invalid token
      await NotificationSubscription.deleteOne({ username });
      console.log(`🗑️ Removed invalid token for user: ${username}`);
    } else {
      // Increment failed attempts
      const subscription = await NotificationSubscription.findOne({ username });
      if (subscription) {
        subscription.failedAttempts += 1;
        await subscription.save();
      }
    }
    
    return { success: false, error: error.message };
  }
}

// Send notification to multiple users
async function sendBulkNotifications(usernames, templateKey, customData = {}) {
  const results = await Promise.allSettled(
    usernames.map(username => sendNotificationToUser(username, templateKey, customData))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;
  
  console.log(`📊 Bulk send complete: ${successful} successful, ${failed} failed`);
  
  return {
    total: results.length,
    successful,
    failed,
    results
  };
}

// Check and send milestone notifications for a user
async function checkAndSendMilestoneNotification(username, currentStreak) {
  const milestones = [7, 14, 30, 60, 90, 180, 365];
  
  if (milestones.includes(currentStreak)) {
    const templateKey = `milestone_${currentStreak}`;
    console.log(`🎉 Milestone detected for ${username}: ${currentStreak} days`);
    return await sendNotificationToUser(username, templateKey);
  }
  
  return { success: false, reason: 'not_a_milestone' };
}

module.exports = {
  sendNotificationToUser,
  sendBulkNotifications,
  checkAndSendMilestoneNotification,
  notificationTemplates
};