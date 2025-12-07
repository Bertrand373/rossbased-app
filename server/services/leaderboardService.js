// server/services/leaderboardService.js
// Discord Leaderboard & Milestone Announcements
// Clean generated image with user avatars

const User = require('../models/User');
const mongoose = require('mongoose');
const { createCanvas, loadImage } = require('canvas');
const FormData = require('form-data');

// Simple schema to store Discord message IDs
const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: String
});
const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

// Webhook URLs from environment
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
 */
async function getLeaderboardUsers() {
  try {
    const users = await User.find({
      showOnLeaderboard: true,
      discordUsername: { $exists: true, $ne: '', $ne: null }
    })
    .sort({ currentStreak: -1 })
    .limit(13)
    .select('discordUsername discordId discordAvatar currentStreak longestStreak')
    .lean();
    
    return users;
  } catch (error) {
    console.error('❌ Error fetching leaderboard users:', error);
    return [];
  }
}

/**
 * Get Discord avatar URL for a user
 */
function getAvatarUrl(discordId, avatarHash) {
  if (avatarHash) {
    const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${ext}?size=64`;
  } else {
    const defaultIndex = (BigInt(discordId) >> 22n) % 6n;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }
}

/**
 * Generate leaderboard image with user avatars
 * Ultra-clean premium design
 */
async function generateLeaderboardImage(users) {
  const width = 380;
  const rowHeight = 44;
  const headerHeight = 50;
  const bottomPadding = 16;
  const padding = 20;
  const avatarSize = 28;
  
  const height = headerHeight + (users.length * rowHeight) + bottomPadding;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Background - pure black
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  
  // Header - clean white text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 16px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LEADERBOARD', width / 2, 32);
  
  // Draw each user row
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const y = headerHeight + (i * rowHeight) + 28;
    
    // Rank number - subtle gray
    ctx.textAlign = 'left';
    ctx.fillStyle = '#555555';
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText(`${i + 1}`, padding, y);
    
    // Avatar
    const avatarX = padding + 24;
    const avatarY = y - avatarSize / 2 - 4;
    
    try {
      const avatarUrl = getAvatarUrl(user.discordId, user.discordAvatar);
      const avatar = await loadImage(avatarUrl);
      
      // Draw circular avatar - no border
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } catch (err) {
      // Placeholder if avatar fails
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#555555';
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(user.discordUsername[0].toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 4);
      ctx.textAlign = 'left';
    }
    
    // Username - white
    const nameX = avatarX + avatarSize + 12;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px Arial, sans-serif';
    ctx.textAlign = 'left';
    const displayName = user.discordUsername.length > 16 
      ? user.discordUsername.substring(0, 15) + '…' 
      : user.discordUsername;
    ctx.fillText(displayName, nameX, y);
    
    // Streak - gold number, subtle "d"
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFD700';
    ctx.font = '14px Arial, sans-serif';
    const streakNum = `${user.currentStreak}`;
    ctx.fillText(streakNum, width - padding - 14, y);
    ctx.fillStyle = '#555555';
    ctx.fillText('d', width - padding, y);
  }
  
  return canvas.toBuffer('image/png');
}

/**
 * Post leaderboard to Discord with generated image
 */
async function postLeaderboardToDiscord() {
  if (!LEADERBOARD_WEBHOOK) {
    console.log('⚠️ DISCORD_LEADERBOARD_WEBHOOK not configured - skipping leaderboard post');
    return false;
  }
  
  try {
    const users = await getLeaderboardUsers();
    
    if (!users || users.length === 0) {
      const embed = {
        embeds: [{
          color: 0xFFD700,
          title: 'LEADERBOARD',
          description: '```\nNo one on the board yet.\n```'
        }]
      };
      
      await fetch(LEADERBOARD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embed)
      });
      
      console.log('✅ Empty leaderboard posted');
      return true;
    }
    
    console.log('🎨 Generating leaderboard image...');
    const imageBuffer = await generateLeaderboardImage(users);
    
    const form = new FormData();
    form.append('file', imageBuffer, {
      filename: 'leaderboard.png',
      contentType: 'image/png'
    });
    
    const payload = {
      embeds: [{
        color: 0x000000,
        image: { url: 'attachment://leaderboard.png' }
      }]
    };
    form.append('payload_json', JSON.stringify(payload));
    
    // Delete old message if exists
    const existingMessageId = await getSetting('leaderboard_message_id');
    
    if (existingMessageId) {
      try {
        await fetch(`${LEADERBOARD_WEBHOOK}/messages/${existingMessageId}`, {
          method: 'DELETE'
        });
        console.log('🗑️ Deleted old leaderboard message');
      } catch (err) {
        console.log('⚠️ Could not delete old message');
      }
    }
    
    // Post new message with image
    const response = await fetch(`${LEADERBOARD_WEBHOOK}?wait=true`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    if (data.id) {
      await setSetting('leaderboard_message_id', data.id);
      console.log(`✅ Leaderboard image posted to Discord (message ID: ${data.id})`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to post leaderboard to Discord:', error);
    return false;
  }
}

/**
 * Format milestone announcement embed
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
 */
async function postMilestoneToDiscord(discordUsername, days) {
  const webhook = MILESTONE_WEBHOOK;
  
  if (!webhook) {
    console.log('⚠️ No Discord webhook configured for milestones');
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
    
    console.log(`✅ Milestone announced: ${discordUsername} - ${days} days`);
    return true;
  } catch (error) {
    console.error('❌ Failed to post milestone to Discord:', error);
    return false;
  }
}

/**
 * Check if user crossed a milestone and announce it
 */
async function checkAndAnnounceMilestone(username, newStreak) {
  try {
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log(`Milestone check: User ${username} not found`);
      return false;
    }
    
    if (!user.announceDiscordMilestones || !user.discordUsername) {
      return false;
    }
    
    const lastAnnounced = user.lastMilestoneAnnounced || 0;
    
    for (const milestone of MILESTONE_DAYS) {
      if (newStreak >= milestone && lastAnnounced < milestone) {
        await postMilestoneToDiscord(user.discordUsername, milestone);
        
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
 */
async function getUserRank(username) {
  try {
    const currentUser = await User.findOne({ username }).lean();
    
    if (!currentUser || !currentUser.showOnLeaderboard || !currentUser.discordUsername) {
      return null;
    }
    
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
 * Manual trigger for leaderboard
 */
async function triggerLeaderboardPost() {
  console.log('📊 Manual leaderboard trigger requested');
  return await postLeaderboardToDiscord();
}

/**
 * Reset leaderboard message
 */
async function resetLeaderboardMessage() {
  await Settings.deleteOne({ key: 'leaderboard_message_id' });
  console.log('🔄 Leaderboard message ID reset');
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