// server/services/leaderboardService.js
// Discord Leaderboard & Milestone Announcements

const User = require('../models/User');
const mongoose = require('mongoose');

// Simple schema to store Discord message IDs
const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: String
});
const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

// Webhook URLs from environment (add these to Render)
const LEADERBOARD_WEBHOOK = process.env.DISCORD_LEADERBOARD_WEBHOOK;
const MILESTONE_WEBHOOK = process.env.DISCORD_MILESTONE_WEBHOOK || LEADERBOARD_WEBHOOK;

// Milestone thresholds for Discord announcements
const MILESTONE_DAYS = [30, 90, 180, 365];

/**
 * Store a setting in the database
 */
async function setSetting(key, value) {
  await Settings.findOneAndUpdate(
    { key },
    { key, value },
    { upsert: true }
  );
}

/**
 * Get a setting from the database
 */
async function getSetting(key) {
  const setting = await Settings.findOne({ key });
  return setting?.value || null;
}

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
    console.error('âŒ Error fetching leaderboard users:', error);
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
        title: 'TITANTRACK LEADERBOARD',
        description: '```\nNo one on the board yet.\n```',
        footer: {
          text: 'Hold the Flame.'
        }
      }]
    };
  }
  
  // Build the leaderboard rows
  let leaderboardText = '';
  
  users.forEach((user, index) => {
    const rank = String(index + 1).padStart(2, ' ');
    // Truncate long names for mobile
    const name = user.discordUsername.length > 14 
      ? user.discordUsername.substring(0, 13) + 'â€¦' 
      : user.discordUsername.padEnd(14, ' ');
    const days = String(user.currentStreak || 0).padStart(3, ' ') + 'd';
    // Verified mentor gets a checkmark
    const verified = user.verifiedMentor ? ' âœ“' : '';
    
    leaderboardText += `${rank}  ${name} ${days}${verified}\n`;
  });
  
  const embed = {
    embeds: [{
      color: 0xFFD700,
      title: 'TITANTRACK LEADERBOARD',
      description: `\`\`\`\n${leaderboardText}\`\`\``,
      footer: {
        text: `Hold the Flame. â€¢ Updated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      }
    }]
  };
  
  return embed;
}

/**
 * Post leaderboard to Discord (or edit existing)
 */
async function postLeaderboardToDiscord() {
  if (!LEADERBOARD_WEBHOOK) {
    console.log('âš ï¸ DISCORD_LEADERBOARD_WEBHOOK not configured - skipping leaderboard post');
    return false;
  }
  
  try {
    const users = await getLeaderboardUsers();
    const embed = formatLeaderboardEmbed(users);
    
    // Check if we have an existing message to edit
    const existingMessageId = await getSetting('leaderboard_message_id');
    
    if (existingMessageId) {
      // Try to edit existing message
      const editUrl = `${LEADERBOARD_WEBHOOK}/messages/${existingMessageId}`;
      const editResponse = await fetch(editUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embed)
      });
      
      if (editResponse.ok) {
        console.log(`âœ… Leaderboard updated (edited message ${existingMessageId})`);
        return true;
      } else {
        console.log('âš ï¸ Could not edit existing message, posting new one...');
      }
    }
    
    // Post new message
    const response = await fetch(`${LEADERBOARD_WEBHOOK}?wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} - ${errorText}`);
    }
    
    // Save message ID for future edits
    const data = await response.json();
    if (data.id) {
      await setSetting('leaderboard_message_id', data.id);
      console.log(`âœ… Leaderboard posted to Discord (message ID: ${data.id})`);
    }
    
    return true;
  } catch (error) {
    console.error('âŒ Failed to post leaderboard to Discord:', error);
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
      description: `**${discordUsername}** just crossed **${days} days**.`
    }]
  };
}

/**
 * Post milestone announcement to Discord
 * Uses DISCORD_MILESTONE_WEBHOOK if set, otherwise falls back to LEADERBOARD_WEBHOOK
 */
async function postMilestoneToDiscord(discordUsername, days) {
  const webhook = MILESTONE_WEBHOOK;
  
  if (!webhook) {
    console.log('âš ï¸ No Discord webhook configured for milestones - skipping milestone post');
    return false;
  }
  
  try {
    const embed = formatMilestoneEmbed(discordUsername, days);
    
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} - ${errorText}`);
    }
    
    console.log(`âœ… Milestone announced: ${discordUsername} - ${days} days`);
    return true;
  } catch (error) {
    console.error('âŒ Failed to post milestone to Discord:', error);
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
          console.log(`ðŸŽ–ï¸ ${username} is now mentor eligible (${milestone}+ days)`);
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
    console.error('âŒ Error checking milestone:', error);
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
    console.error('âŒ Error getting user rank:', error);
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
    console.error('âŒ Error fetching mentors:', error);
    return [];
  }
}

/**
 * Manual trigger for leaderboard (for testing)
 */
async function triggerLeaderboardPost() {
  console.log('ðŸ“Š Manual leaderboard trigger requested');
  return await postLeaderboardToDiscord();
}

/**
 * Reset leaderboard message (posts fresh instead of editing)
 */
async function resetLeaderboardMessage() {
  await Settings.deleteOne({ key: 'leaderboard_message_id' });
  console.log('ðŸ”„ Leaderboard message ID reset - next post will create new message');
  return true;
}

module.exports = {
  getLeaderboardUsers,
  postLeaderboardToDiscord,
  checkAndAnnounceMilestone,
  postMilestoneToDiscord,
  getUserRank,
  getVerifiedMentors,
  triggerLeaderboardPost,
  resetLeaderboardMessage,
  MILESTONE_DAYS
};