// server/services/notificationScheduler.js
// Scheduled jobs for automatic notification sending and Discord leaderboard

const cron = require('node-cron');
const NotificationSubscription = require('../models/NotificationSubscription');
const { sendNotificationToUser, sendBulkNotifications } = require('./notificationService');
const { postLeaderboardToDiscord } = require('./leaderboardService');
const User = require('../models/User');

// Daily reminder notifications
// Runs every hour and checks which users should receive their daily reminder
function scheduleDailyReminders() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running daily reminder check...');
    
    try {
      const currentHour = new Date().getHours();
      const currentTime = `${String(currentHour).padStart(2, '0')}:00`;
      
      // Find all subscriptions with reminders enabled at this hour
      const subscriptions = await NotificationSubscription.find({
        notificationsEnabled: true,
        'notificationTypes.dailyReminder': true,
        reminderTime: { $regex: `^${currentTime.substring(0, 2)}:` } // Match hour
      });
      
      console.log(`📬 Found ${subscriptions.length} users for daily reminders at ${currentTime}`);
      
      for (const subscription of subscriptions) {
        await sendNotificationToUser(subscription.username, 'daily_reminder');
      }
      
    } catch (error) {
      console.error('❌ Error in daily reminder scheduler:', error);
    }
  });
  
  console.log('✅ Daily reminder scheduler started');
}

// Weekly motivational messages
// Sends every Monday at 9 AM
function scheduleWeeklyMotivation() {
  // Run every Monday at 9:00 AM
  cron.schedule('0 9 * * 1', async () => {
    console.log('💪 Sending weekly motivational messages...');
    
    try {
      const subscriptions = await NotificationSubscription.find({
        notificationsEnabled: true,
        'notificationTypes.motivational': true
      });
      
      const usernames = subscriptions.map(s => s.username);
      await sendBulkNotifications(usernames, 'motivational');
      
    } catch (error) {
      console.error('❌ Error in weekly motivation scheduler:', error);
    }
  });
  
  console.log('✅ Weekly motivation scheduler started');
}

// Milestone check - runs multiple times per day
// Checks user streaks and sends push notifications for milestones
function scheduleMilestoneChecks() {
  // Run every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('🏆 Checking for milestone achievements...');
    
    try {
      // Get all users with active subscriptions
      const subscriptions = await NotificationSubscription.find({
        notificationsEnabled: true,
        'notificationTypes.milestones': true
      });
      
      for (const subscription of subscriptions) {
        // Get user data to check current streak
        const user = await User.findOne({ username: subscription.username });
        
        if (user && user.currentStreak) {
          const milestones = [7, 14, 30, 60, 90, 180, 365];
          
          // Check if current streak is a milestone
          if (milestones.includes(user.currentStreak)) {
            // Check if we already sent notification for this milestone today
            const lastSent = subscription.lastNotificationSent;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (!lastSent || lastSent < today) {
              const templateKey = `milestone_${user.currentStreak}`;
              await sendNotificationToUser(subscription.username, templateKey);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error in milestone check scheduler:', error);
    }
  });
  
  console.log('✅ Milestone check scheduler started');
}

// Discord Leaderboard - Daily at 8 AM EST
// Posts the top 13 leaderboard to Discord
function scheduleLeaderboardPost() {
  // 8 AM EST = 13:00 UTC (standard time) or 12:00 UTC (daylight saving)
  // Using 13:00 UTC for EST. Adjust if your server uses a different timezone.
  // Render servers typically run in UTC.
  cron.schedule('0 13 * * *', async () => {
    console.log('📊 Posting daily leaderboard to Discord...');
    
    try {
      const success = await postLeaderboardToDiscord();
      if (success) {
        console.log('✅ Daily leaderboard posted successfully');
      } else {
        console.log('⚠️ Leaderboard post returned false');
      }
    } catch (error) {
      console.error('❌ Error posting leaderboard:', error);
    }
  });
  
  console.log('✅ Discord leaderboard scheduler started (8 AM EST daily)');
}

// Initialize all schedulers
function initializeSchedulers() {
  console.log('🚀 Initializing notification schedulers...');
  
  scheduleDailyReminders();
  scheduleWeeklyMotivation();
  scheduleMilestoneChecks();
  scheduleLeaderboardPost();
  
  console.log('✅ All notification schedulers initialized successfully');
}

module.exports = {
  initializeSchedulers
};