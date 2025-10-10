// server/models/NotificationSubscription.js
// Database schema for storing FCM tokens and notification preferences

const mongoose = require('mongoose');

const notificationSubscriptionSchema = new mongoose.Schema({
  // User identification
  username: {
    type: String,
    required: true,
    index: true
  },
  
  // FCM token from Firebase
  fcmToken: {
    type: String,
    required: true,
    unique: true
  },
  
  // Notification preferences
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  
  // Notification types user wants to receive
  notificationTypes: {
    milestones: { type: Boolean, default: true },
    dailyReminder: { type: Boolean, default: true },
    motivational: { type: Boolean, default: true },
    relapseSupport: { type: Boolean, default: true }
  },
  
  // User's preferred time for daily reminders (24-hour format)
  reminderTime: {
    type: String,
    default: '09:00' // 9 AM default
  },
  
  // Quiet hours (no notifications during these times)
  quietHours: {
    enabled: { type: Boolean, default: false },
    start: { type: String, default: '22:00' }, // 10 PM
    end: { type: String, default: '08:00' } // 8 AM
  },
  
  // Track when user subscribed and last notification sent
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  
  lastNotificationSent: {
    type: Date
  },
  
  // Track failed notification attempts
  failedAttempts: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Create indexes for faster queries
notificationSubscriptionSchema.index({ username: 1, notificationsEnabled: 1 });
notificationSubscriptionSchema.index({ fcmToken: 1 });

const NotificationSubscription = mongoose.model('NotificationSubscription', notificationSubscriptionSchema);

module.exports = NotificationSubscription;