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
      
      // Find all users with reminders enabled at this hour
      const users = await User.find({
        'notificationPreferences.dailyReminderEnabled': true
      });
      
      let sentCount = 0;
      
      for (const user of users) {
        const reminderTime = user.notificationPreferences?.dailyReminderTime || '09:00';
        const [reminderHour] = reminderTime.split(':').map(Number);
        
        if (currentHour === reminderHour) {
          await sendNotificationToUser(user.username, 'daily_reminder');
          sentCount++;
        }
      }
      
      console.log(`📬 Sent ${sentCount} daily reminders at ${currentTime}`);
      
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
      // Find all users with weekly progress notifications enabled
      const users = await User.find({
        'notificationPreferences.types.weeklyProgress': { $ne: false }
      });
      
      const usernames = users.map(u => u.username);
      await sendBulkNotifications(usernames, 'motivational');
      
      console.log(`✅ Sent weekly motivation to ${usernames.length} users`);
      
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
      const milestones = [7, 14, 30, 60, 90, 180, 365];
      
      // Find users whose current streak is a milestone
      const users = await User.find({
        currentStreak: { $in: milestones },
        'notificationPreferences.types.milestones': { $ne: false }
      });
      
      let sentCount = 0;
      
      for (const user of users) {
        const templateKey = `milestone_${user.currentStreak}`;
        const result = await sendNotificationToUser(user.username, templateKey);
        if (result.success) sentCount++;
      }
      
      console.log(`✅ Sent ${sentCount} milestone notifications`);
      
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
  // Using 13:00 UTC for EST. Render servers run in UTC.
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