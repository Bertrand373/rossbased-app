// server/services/leaderboardService.js
// Discord Leaderboard & Milestone Announcements
// With htmlcsstoimage.com integration for avatar display

const User = require('../models/User');
const mongoose = require('mongoose');

// Simple schema to store Discord message IDs
const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: String
});
const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

// Webhook URLs from environment
const LEADERBOARD_WEBHOOK = process.env.DISCORD_LEADERBOARD_WEBHOOK;
const MILESTONE_WEBHOOK = process.env.DISCORD_MILESTONE_WEBHOOK || LEADERBOARD_WEBHOOK;

// htmlcsstoimage.com credentials
const HCTI_USER_ID = process.env.HCTI_USER_ID;
const HCTI_API_KEY = process.env.HCTI_API_KEY;

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
 * Calculate current streak from start date
 * This ensures accuracy even if user hasn't opened the app
 */
function calculateStreakFromStartDate(startDate) {
  if (!startDate) return 0;
  
  const start = new Date(startDate);
  const today = new Date();
  const daysDiff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, daysDiff + 1); // Day 1 = start day
}

/**
 * Get Discord avatar URL for a user
 * Falls back to default Discord avatar if no custom avatar
 */
function getDiscordAvatarUrl(discordId, avatarHash, size = 64) {
  if (avatarHash && discordId) {
    // User has a custom avatar
    const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${extension}?size=${size}`;
  } else if (discordId) {
    // Default avatar based on user ID (Discord's new system)
    const defaultIndex = (BigInt(discordId) >> 22n) % 6n;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }
  // Fallback - generic default
  return `https://cdn.discordapp.com/embed/avatars/0.png`;
}

/**
 * Generate HTML for leaderboard image
 * Clean design with uniform styling
 */
function generateLeaderboardHTML(users) {
  // Generate timestamp in EST
  const now = new Date();
  const estTimestamp = now.toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const rows = users.map((user, index) => {
    const rank = index + 1;
    const displayName = user.discordDisplayName || user.discordUsername || 'Unknown';
    const truncatedName = displayName.length > 16 ? displayName.substring(0, 15) + '…' : displayName;
    const avatarUrl = getDiscordAvatarUrl(user.discordId, user.discordAvatar, 64);
    const days = user.currentStreak || 0;
    
    // All ranks same subtle color - clean and uniform
    return `
      <div style="display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.04);">
        <span style="width: 28px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.4);">${rank}</span>
        <img src="${avatarUrl}" style="width: 36px; height: 36px; border-radius: 50%; margin-right: 12px; object-fit: cover;" />
        <span style="flex: 1; font-size: 14px; color: #ffffff; font-weight: 500;">${truncatedName}</span>
        <span style="font-size: 14px; color: rgba(255,255,255,0.7); font-weight: 500; font-variant-numeric: tabular-nums;">${days}d</span>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 0; background: #000000; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;">
      <div style="width: 380px; background: #000000; overflow: hidden;">
        
        <!-- Header -->
        <div style="padding: 24px 16px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06);">
          <div style="font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.35); letter-spacing: 0.15em; margin-bottom: 6px;">TITANTRACK</div>
          <div style="font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">LEADERBOARD</div>
        </div>
        
        <!-- User Rows -->
        <div style="padding: 8px 0;">
          ${rows}
        </div>
        
        <!-- Footer with link -->
        <div style="padding: 16px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);">
          <div style="font-size: 13px; color: #ffffff; font-weight: 600;">titantrack.app</div>
          <div style="font-size: 10px; color: rgba(255,255,255,0.25); margin-top: 6px;">${estTimestamp} EST</div>
        </div>
        
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate leaderboard image using htmlcsstoimage.com
 * Returns image URL or null if failed
 */
async function generateLeaderboardImage(users) {
  if (!HCTI_USER_ID || !HCTI_API_KEY) {
    console.log('⚠️ HCTI credentials not configured - skipping image generation');
    return null;
  }

  if (!users || users.length === 0) {
    return null;
  }

  try {
    const html = generateLeaderboardHTML(users);
    
    const response = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${HCTI_USER_ID}:${HCTI_API_KEY}`).toString('base64')
      },
      body: JSON.stringify({
        html: html,
        css: '',
        google_fonts: 'Inter',
        selector: 'div',
        ms_delay: 500,
        device_scale: 2
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HCTI API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('✅ Leaderboard image generated:', data.url);
    return data.url;

  } catch (error) {
    console.error('❌ Error generating leaderboard image:', error);
    return null;
  }
}

/**
 * Fetch top 13 users for leaderboard
 * Now calculates streak dynamically from startDate for accuracy
 */
async function getLeaderboardUsers() {
  try {
    const users = await User.find({
      showOnLeaderboard: true,
      discordUsername: { $exists: true, $ne: '', $ne: null },
      startDate: { $exists: true, $ne: null }
    })
    .select('discordUsername discordDisplayName discordId discordAvatar startDate currentStreak longestStreak mentorEligible verifiedMentor')
    .lean();
    
    // Calculate live streak for each user and sort
    const usersWithLiveStreak = users.map(user => ({
      ...user,
      currentStreak: calculateStreakFromStartDate(user.startDate)
    }));
    
    // Sort by calculated streak (descending) and take top 13
    usersWithLiveStreak.sort((a, b) => b.currentStreak - a.currentStreak);
    
    return usersWithLiveStreak.slice(0, 13);
  } catch (error) {
    console.error('❌ Error fetching leaderboard users:', error);
    return [];
  }
}

/**
 * Format leaderboard for Discord
 * Uses content-only approach with image for cleaner display (no grey embed wrapper)
 */
function formatLeaderboardMessage(users, imageUrl = null) {
  // Generate timestamp in EST
  const now = new Date();
  const estTimestamp = now.toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  if (!users || users.length === 0) {
    return {
      embeds: [{
        color: 0x000000,
        title: 'LEADERBOARD',
        url: 'https://titantrack.app',
        description: '```\nNo one on the board yet.\n```\n[Join the leaderboard →](https://titantrack.app)',
        footer: {
          text: `Updated ${estTimestamp} EST`
        }
      }]
    };
  }
  
  // If we have an image, use minimal embed (hides ugly URL, minimal wrapper)
  if (imageUrl) {
    return {
      embeds: [{
        color: 0x000000,
        image: {
          url: imageUrl
        }
      }],
      content: '**[Join the leaderboard →](<https://titantrack.app>)**'
    };
  }
  
  // Fallback: Text-only leaderboard with embed
  let leaderboardText = '';
  
  users.forEach((user, index) => {
    const rank = String(index + 1).padStart(2, ' ');
    const displayName = user.discordDisplayName || user.discordUsername;
    const name = displayName.length > 14 
      ? displayName.substring(0, 13) + '…' 
      : displayName.padEnd(14, ' ');
    const days = String(user.currentStreak || 0).padStart(4, ' ') + 'd';
    
    leaderboardText += `${rank}  ${name} ${days}\n`;
  });
  
  return {
    embeds: [{
      color: 0x000000,
      title: 'LEADERBOARD',
      url: 'https://titantrack.app',
      description: `\`\`\`\n${leaderboardText}\`\`\`\n[Join the leaderboard →](https://titantrack.app)`,
      footer: {
        text: `Updated ${estTimestamp} EST`
      }
    }]
  };
}

/**
 * Post leaderboard to Discord (or edit existing)
 */
async function postLeaderboardToDiscord() {
  if (!LEADERBOARD_WEBHOOK) {
    console.log('⚠️ DISCORD_LEADERBOARD_WEBHOOK not configured - skipping leaderboard post');
    return false;
  }
  
  try {
    const users = await getLeaderboardUsers();
    
    // Try to generate image with avatars
    const imageUrl = await generateLeaderboardImage(users);
    
    const message = formatLeaderboardMessage(users, imageUrl);
    
    // Check if we have an existing message to edit
    const existingMessageId = await getSetting('leaderboard_message_id');
    
    if (existingMessageId) {
      // Try to edit existing message
      const editUrl = `${LEADERBOARD_WEBHOOK}/messages/${existingMessageId}`;
      const editResponse = await fetch(editUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      
      if (editResponse.ok) {
        console.log(`✅ Leaderboard updated (edited message ${existingMessageId})`);
        return true;
      } else {
        console.log('⚠️ Could not edit existing message, posting new one...');
      }
    }
    
    // Post new message
    const response = await fetch(`${LEADERBOARD_WEBHOOK}?wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} - ${errorText}`);
    }
    
    // Save message ID for future edits
    const data = await response.json();
    if (data.id) {
      await setSetting('leaderboard_message_id', data.id);
      console.log(`✅ Leaderboard posted to Discord (message ID: ${data.id})`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to post leaderboard to Discord:', error);
    return false;
  }
}

/**
 * Format milestone announcement embed
 * Uses display name if available
 */
function formatMilestoneEmbed(user, days) {
  const displayName = user.discordDisplayName || user.discordUsername;
  return {
    embeds: [{
      color: 0xFFD700,
      description: `**${displayName}** just crossed **${days} days**.`
    }]
  };
}

/**
 * Post milestone announcement to Discord
 */
async function postMilestoneToDiscord(user, days) {
  const webhook = MILESTONE_WEBHOOK;
  
  if (!webhook) {
    console.log('⚠️ No Discord webhook configured for milestones');
    return false;
  }
  
  try {
    const embed = formatMilestoneEmbed(user, days);
    
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} - ${errorText}`);
    }
    
    const displayName = user.discordDisplayName || user.discordUsername;
    console.log(`✅ Milestone announced: ${displayName} - ${days} days`);
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
        await postMilestoneToDiscord(user, milestone);
        
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
      discordUsername: { $exists: true, $ne: '', $ne: null },
      startDate: { $exists: true, $ne: null }
    })
    .select('username startDate')
    .lean();
    
    // Calculate live streaks and sort
    const usersWithLiveStreak = users.map(user => ({
      username: user.username,
      currentStreak: calculateStreakFromStartDate(user.startDate)
    }));
    
    usersWithLiveStreak.sort((a, b) => b.currentStreak - a.currentStreak);
    
    const index = usersWithLiveStreak.findIndex(u => u.username === username);
    
    if (index === -1) return null;
    
    return {
      rank: index + 1,
      total: usersWithLiveStreak.length,
      streak: usersWithLiveStreak[index].currentStreak
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
    .select('username discordUsername discordDisplayName currentStreak')
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