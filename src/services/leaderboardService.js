// server/services/leaderboardService.js
// Discord Leaderboard & Milestone Announcements

const User = require('../models/User');

// Webhook URL from environment (you'll add this to Render)
const LEADERBOARD_WEBHOOK = process.env.DISCORD_LEADERBOARD_WEBHOOK;

// Milestone thresholds for Discord announcements
const MILESTONE_DAYS = [30, 90, 180, 365];

/**
 * Fetch top 13 users for leaderboard
 * Only includes users who:
 * - Have opted into leaderboard (showOnLeaderboard: true)
 * - Have a Discord username set
 */
async function getLeaderboardUsers() {
  try {
    const users = await User.find({
      showOnLeaderboard: true,
      discordUsername: { $exists: true, $ne: '', $ne: null }
    })
    .sort({ currentStreak: -1 })
    .limit(13)
    .select('discordUsername currentStreak longestStreak mentorEligible verifiedMentor')
    .lean();
    
    return users;
  } catch (error) {
    console.error('❌ Error fetching leaderboard users:', error);
    return [];
  }
}

/**
 * Format leaderboard for Discord embed
 * Clean, minimalist design matching TitanTrack aesthetic
 */
function formatLeaderboardEmbed(users) {
  if (!users || users.length === 0) {
    return {
      embeds: [{
        color: 0xFFD700,
        description: '```\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n              TITANTRACK\n             LEADERBOARD\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n      No warriors on the board yet.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n            Hold the Flame.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n```'
      }]
    };
  }
  
  // Build the leaderboard rows
  let leaderboardText = '';
  
  users.forEach((user, index) => {
    const rank = String(index + 1).padStart(2, ' ');
    // Truncate long names, pad short ones for alignment
    const name = user.discordUsername.length > 16 
      ? user.discordUsername.substring(0, 15) + '…' 
      : user.discordUsername.padEnd(16, ' ');
    const days = String(user.currentStreak || 0).padStart(4, ' ') + 'd';
    // Verified mentor gets a checkmark
    const verified = user.verifiedMentor ? ' ✓' : '';
    
    leaderboardText += `  ${rank}    ${name}    ${days}${verified}\n`;
  });
  
  const embed = {
    embeds: [{
      color: 0xFFD700,
      description: `\`\`\`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n              TITANTRACK\n             LEADERBOARD\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${leaderboardText}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n            Hold the Flame.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\`\`\``,
      footer: {
        text: `Updated ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at 8:00 AM EST`
      }
    }]
  };
  
  return embed;
}

/**
 * Post leaderboard to Discord
 */
async function postLeaderboardToDiscord() {
  if (!LEADERBOARD_WEBHOOK) {
    console.log('⚠️ DISCORD_LEADERBOARD_WEBHOOK not configured - skipping leaderboard post');
    return false;
  }
  
  try {
    const users = await getLeaderboardUsers();
    const embed = formatLeaderboardEmbed(users);
    
    const response = await fetch(LEADERBOARD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} - ${errorText}`);
    }
    
    console.log(`✅ Leaderboard posted to Discord (${users.length} users)`);
    return true;
  } catch (error) {
    console.error('❌ Failed to post leaderboard to Discord:', error);
    return false;
  }
}

/**
 * Format milestone announcement embed
 * Clean, simple announcement when someone crosses a milestone
 */
function formatMilestoneEmbed(discordUsername, days) {
  return {
    embeds: [{
      color: 0xFFD700,
      description: `\`\`\`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n  ${discordUsername} just crossed ${days} days.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\`\`\``
    }]
  };
}

/**
 * Post milestone announcement to Discord
 */
async function postMilestoneToDiscord(discordUsername, days) {
  if (!LEADERBOARD_WEBHOOK) {
    console.log('⚠️ DISCORD_LEADERBOARD_WEBHOOK not configured - skipping milestone post');
    return false;
  }
  
  try {
    const embed = formatMilestoneEmbed(discordUsername, days);
    
    const response = await fetch(LEADERBOARD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} - ${errorText}`);
    }
    
    console.log(`✅ Milestone announced: ${discordUsername} - ${days} days`);
    return true;
  } catch (error) {
    console.error('❌ Failed to post milestone to Discord:', error);
    return false;
  }
}

/**
 * Check if user crossed a milestone and announce it
 * Called when user data is updated (streak increases)
 */
async function checkAndAnnounceMilestone(username, newStreak) {
  try {
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log(`Milestone check: User ${username} not found`);
      return false;
    }
    
    // Must be opted into leaderboard and have Discord username to get announced
    if (!user.showOnLeaderboard || !user.discordUsername) {
      return false;
    }
    
    const lastAnnounced = user.lastMilestoneAnnounced || 0;
    
    // Check if any milestone was crossed
    for (const milestone of MILESTONE_DAYS) {
      if (newStreak >= milestone && lastAnnounced < milestone) {
        // Announce this milestone
        await postMilestoneToDiscord(user.discordUsername, milestone);
        
        // Update mentor eligibility if 180+ days
        const updateData = { lastMilestoneAnnounced: milestone };
        if (milestone >= 180 && !user.mentorEligible) {
          updateData.mentorEligible = true;
          console.log(`🎖️ ${username} is now mentor eligible (${milestone}+ days)`);
        }
        
        await User.findOneAndUpdate(
          { username },
          { $set: updateData }
        );
        
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error checking milestone:', error);
    return false;
  }
}

/**
 * Get user's current rank on leaderboard
 * Returns null if user is not on leaderboard
 */
async function getUserRank(username) {
  try {
    const users = await User.find({
      showOnLeaderboard: true,
      discordUsername: { $exists: true, $ne: '', $ne: null }
    })
    .sort({ currentStreak: -1 })
    .select('username currentStreak')
    .lean();
    
    const index = users.findIndex(u => u.username === username);
    
    if (index === -1) return null;
    
    return {
      rank: index + 1,
      total: users.length,
      streak: users[index].currentStreak
    };
  } catch (error) {
    console.error('❌ Error getting user rank:', error);
    return null;
  }
}

/**
 * Get all verified mentors
 * For future mentor request feature
 */
async function getVerifiedMentors() {
  try {
    const mentors = await User.find({
      verifiedMentor: true,
      mentorStatus: 'available'
    })
    .select('username discordUsername currentStreak')
    .lean();
    
    return mentors;
  } catch (error) {
    console.error('❌ Error fetching mentors:', error);
    return [];
  }
}

/**
 * Manual trigger for leaderboard (for testing)
 */
async function triggerLeaderboardPost() {
  console.log('📊 Manual leaderboard trigger requested');
  return await postLeaderboardToDiscord();
}

module.exports = {
  getLeaderboardUsers,
  postLeaderboardToDiscord,
  checkAndAnnounceMilestone,
  postMilestoneToDiscord,
  getUserRank,
  getVerifiedMentors,
  triggerLeaderboardPost,
  MILESTONE_DAYS
};
