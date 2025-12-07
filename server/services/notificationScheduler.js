// server/services/notificationScheduler.js
// Scheduled jobs for automatic notification sending and Discord leaderboard
// TIMEZONE-AWARE VERSION

const cron = require('node-cron');
const NotificationSubscription = require('../models/NotificationSubscription');
const { sendNotificationToUser, sendBulkNotifications } = require('./notificationService');
const { postLeaderboardToDiscord } = require('./leaderboardService');
const User = require('../models/User');

// ============================================================================
// TIMEZONE UTILITIES
// ============================================================================

/**
 * Get the current hour in a specific timezone
 * @param {string} timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns {number} - Current hour (0-23) in that timezone
 */
function getCurrentHourInTimezone(timezone) {
  try {
    const now = new Date();
    const options = { hour: 'numeric', hour12: false, timeZone: timezone };
    const hourStr = new Intl.DateTimeFormat('en-US', options).format(now);
    return parseInt(hourStr, 10);
  } catch (error) {
    // If timezone is invalid, fall back to UTC
    console.warn(`⚠️ Invalid timezone "${timezone}", falling back to UTC`);
    return new Date().getUTCHours();
  }
}

/**
 * Get the current day of week in a specific timezone (0 = Sunday, 1 = Monday, etc.)
 * @param {string} timezone - IANA timezone string
 * @returns {number} - Day of week (0-6)
 */
function getCurrentDayInTimezone(timezone) {
  try {
    const now = new Date();
    const options = { weekday: 'short', timeZone: timezone };
    const dayStr = new Intl.DateTimeFormat('en-US', options).format(now);
    const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    return dayMap[dayStr] ?? new Date().getDay();
  } catch (error) {
    return new Date().getDay();
  }
}

// ============================================================================
// DAILY REMINDER SCHEDULER - TIMEZONE AWARE
// ============================================================================

/**
 * Daily reminder notifications
 * Runs every hour and checks which users should receive their daily reminder
 * based on their local timezone
 */
function scheduleDailyReminders() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    const utcHour = new Date().getUTCHours();
    console.log(`⏰ Running daily reminder check... (UTC hour: ${utcHour})`);
    
    try {
      // Find all users with reminders enabled
      const users = await User.find({
        'notificationPreferences.dailyReminderEnabled': true
      });
      
      let sentCount = 0;
      let checkedCount = 0;
      
      for (const user of users) {
        checkedCount++;
        const prefs = user.notificationPreferences || {};
        const reminderTime = prefs.dailyReminderTime || '09:00';
        const timezone = prefs.timezone || 'America/New_York'; // Default to EST if not set
        
        const [reminderHour] = reminderTime.split(':').map(Number);
        const userCurrentHour = getCurrentHourInTimezone(timezone);
        
        // Check if current hour in user's timezone matches their reminder hour
        if (userCurrentHour === reminderHour) {
          const result = await sendNotificationToUser(user.username, 'daily_reminder');
          if (result.success) {
            sentCount++;
            console.log(`  ✅ Sent daily reminder to ${user.username} (${timezone}, local hour: ${userCurrentHour})`);
          }
        }
      }
      
      console.log(`📬 Daily reminder check complete: ${sentCount}/${checkedCount} sent`);
      
    } catch (error) {
      console.error('❌ Error in daily reminder scheduler:', error);
    }
  });
  
  console.log('✅ Daily reminder scheduler started (timezone-aware)');
}

// ============================================================================
// WEEKLY MOTIVATIONAL MESSAGES - TIMEZONE AWARE
// ============================================================================

/**
 * Weekly motivational messages
 * Sends every Monday at 9 AM in each user's local timezone
 */
function scheduleWeeklyMotivation() {
  // Run every hour (we check user timezone inside)
  cron.schedule('0 * * * *', async () => {
    const utcDay = new Date().getUTCDay();
    
    // Quick exit if it's not Sunday, Monday, or Tuesday in UTC
    // (covers all possible Monday local times globally)
    if (utcDay !== 0 && utcDay !== 1 && utcDay !== 2) {
      return;
    }
    
    try {
      // Find all users with weekly progress notifications enabled
      const users = await User.find({
        'notificationPreferences.types.weeklyProgress': { $ne: false }
      });
      
      let sentCount = 0;
      
      for (const user of users) {
        const timezone = user.notificationPreferences?.timezone || 'America/New_York';
        const userDay = getCurrentDayInTimezone(timezone);
        const userHour = getCurrentHourInTimezone(timezone);
        
        // Send at 9 AM local time on Monday
        if (userDay === 1 && userHour === 9) {
          const result = await sendNotificationToUser(user.username, 'motivational');
          if (result.success) {
            sentCount++;
          }
        }
      }
      
      if (sentCount > 0) {
        console.log(`💪 Sent weekly motivation to ${sentCount} users`);
      }
      
    } catch (error) {
      console.error('❌ Error in weekly motivation scheduler:', error);
    }
  });
  
  console.log('✅ Weekly motivation scheduler started (timezone-aware)');
}

// ============================================================================
// MILESTONE CHECK SCHEDULER
// ============================================================================

/**
 * Milestone notifications
 * Checks user streaks every 6 hours and sends push notifications for milestones
 */
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
        // Check if we already sent this milestone notification
        const lastMilestone = user.lastMilestoneNotified || 0;
        
        if (lastMilestone !== user.currentStreak) {
          const templateKey = `milestone_${user.currentStreak}`;
          const result = await sendNotificationToUser(user.username, templateKey);
          
          if (result.success) {
            sentCount++;
            // Mark this milestone as notified to prevent duplicates
            await User.updateOne(
              { _id: user._id },
              { $set: { lastMilestoneNotified: user.currentStreak } }
            );
          }
        }
      }
      
      console.log(`✅ Sent ${sentCount} milestone notifications`);
      
    } catch (error) {
      console.error('❌ Error in milestone check scheduler:', error);
    }
  });
  
  console.log('✅ Milestone check scheduler started');
}

// ============================================================================
// DISCORD LEADERBOARD SCHEDULER
// ============================================================================

/**
 * Discord Leaderboard - Daily at 8 AM EST
 * Posts the top 13 leaderboard to Discord
 */
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

// ============================================================================
// INITIALIZE ALL SCHEDULERS
// ============================================================================

function initializeSchedulers() {
  console.log('🚀 Initializing notification schedulers...');
  console.log(`   Server timezone: UTC (${new Date().toISOString()})`);
  
  scheduleDailyReminders();
  scheduleWeeklyMotivation();
  scheduleMilestoneChecks();
  scheduleLeaderboardPost();
  
  console.log('✅ All notification schedulers initialized successfully');
}

module.exports = {
  initializeSchedulers,
  // Export utilities for testing
  getCurrentHourInTimezone,
  getCurrentDayInTimezone
};