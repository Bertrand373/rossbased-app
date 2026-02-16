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
const MILESTONE_DAYS = [30, 60, 90, 180, 365];

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
 * Download image from URL and return as Buffer
 */
async function downloadImage(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('❌ Error downloading image:', error);
    return null;
  }
}

/**
 * Format fallback text leaderboard (when image fails)
 */
function formatTextLeaderboard(users) {
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
        footer: { text: `Updated ${estTimestamp} EST` }
      }]
    };
  }
  
  let leaderboardText = '';
  users.forEach((user, index) => {
    const rank = index + 1;
    const displayName = user.discordDisplayName || user.discordUsername || 'Unknown';
    const truncatedName = displayName.length > 14 ? displayName.substring(0, 13) + '…' : displayName;
    const days = user.currentStreak || 0;
    const paddedRank = rank.toString().padStart(2, ' ');
    const paddedName = truncatedName.padEnd(14, ' ');
    const paddedDays = days.toString().padStart(4, ' ');
    leaderboardText += `${paddedRank}  ${paddedName}  ${paddedDays}d\n`;
  });
  
  return {
    embeds: [{
      color: 0x000000,
      title: 'LEADERBOARD',
      url: 'https://titantrack.app',
      description: `\`\`\`\n${leaderboardText}\`\`\`\n[Join the leaderboard →](https://titantrack.app)`,
      footer: { text: `Updated ${estTimestamp} EST` }
    }]
  };
}

/**
 * Post CTA message below the leaderboard
 * Deletes old CTA first, then posts new one
 */
async function postCtaToDiscord() {
  if (!LEADERBOARD_WEBHOOK) {
    return false;
  }
  
  try {
    const existingCtaId = await getSetting('leaderboard_cta_message_id');
    
    // Delete old CTA message first
    if (existingCtaId) {
      try {
        await fetch(`${LEADERBOARD_WEBHOOK}/messages/${existingCtaId}`, {
          method: 'DELETE'
        });
        console.log('🗑️ Deleted old CTA message');
      } catch (e) {
        console.log('⚠️ Could not delete old CTA message');
      }
    }
    
    // Post new CTA message as embed (embeds support clickable links)
    const ctaPayload = {
      embeds: [{
        color: 0x000000,
        description: `You already know the benefits are real. You've felt them.\n\nBut feeling it and seeing the full pattern are two different things.\n\n**[titantrack.app](https://titantrack.app)**\n\n*Free lifetime access for Discord members who joined before February 17th, 2026.*`
      }]
    };
    
    const response = await fetch(`${LEADERBOARD_WEBHOOK}?wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ctaPayload)
    });
    
    if (!response.ok) {
      console.error('❌ Failed to post CTA:', response.status);
      return false;
    }
    
    const data = await response.json();
    if (data.id) {
      await setSetting('leaderboard_cta_message_id', data.id);
      console.log(`✅ CTA posted (message ID: ${data.id})`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to post CTA to Discord:', error);
    return false;
  }
}

/**
 * Post leaderboard to Discord
 * Tries image first, falls back to text embed
 * Then posts CTA message below
 */
async function postLeaderboardToDiscord() {
  if (!LEADERBOARD_WEBHOOK) {
    console.log('⚠️ No Discord webhook configured for leaderboard');
    return false;
  }
  
  try {
    const users = await getLeaderboardUsers();
    const existingMessageId = await getSetting('leaderboard_message_id');
    
    // Try to generate image
    const imageUrl = await generateLeaderboardImage(users);
    
    if (imageUrl) {
      // Download the image
      const imageBuffer = await downloadImage(imageUrl);
      
      if (imageBuffer) {
        // Post new message with attachment using FormData
        // NOTE: We delete old message AFTER successful post (not before)
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', imageBuffer, { filename: 'leaderboard.png', contentType: 'image/png' });
        
        // Post new message with attachment using https module for proper multipart
        const https = require('https');
        const url = new URL(`${LEADERBOARD_WEBHOOK}?wait=true`);
        
        return new Promise((resolve, reject) => {
          const request = https.request({
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: formData.getHeaders()
          }, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', async () => {
              if (response.statusCode === 200) {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.id) {
                    await setSetting('leaderboard_message_id', parsed.id);
                    console.log(`✅ Leaderboard posted with attachment (message ID: ${parsed.id})`);
                    
                    // NOW delete old message (only after successful post)
                    if (existingMessageId) {
                      try {
                        await fetch(`${LEADERBOARD_WEBHOOK}/messages/${existingMessageId}`, {
                          method: 'DELETE'
                        });
                        console.log('🗑️ Deleted old leaderboard message');
                      } catch (e) {
                        console.log('⚠️ Could not delete old message (may already be gone)');
                      }
                    }
                    
                    // Post CTA message below the leaderboard
                    await postCtaToDiscord();
                  }
                  resolve(true);
                } catch (e) {
                  console.log('✅ Leaderboard posted');
                  // Still try to post CTA
                  await postCtaToDiscord();
                  resolve(true);
                }
              } else {
                console.error('❌ Discord error:', response.statusCode, data);
                reject(new Error(`Discord failed: ${response.statusCode}`));
              }
            });
          });
          
          request.on('error', reject);
          formData.pipe(request);
        });
      }
    }
    
    // Fallback: Text-only leaderboard
    const messagePayload = formatTextLeaderboard(users);
    
    if (existingMessageId) {
      const editUrl = `${LEADERBOARD_WEBHOOK}/messages/${existingMessageId}`;
      const editResponse = await fetch(editUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload)
      });
      
      if (editResponse.ok) {
        console.log(`✅ Leaderboard updated (edited message ${existingMessageId})`);
        // Post CTA after fallback update too
        await postCtaToDiscord();
        return true;
      }
    }
    
    const response = await fetch(`${LEADERBOARD_WEBHOOK}?wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messagePayload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    if (data.id) {
      await setSetting('leaderboard_message_id', data.id);
      console.log(`✅ Leaderboard posted to Discord (message ID: ${data.id})`);
    }
    
    // Post CTA after fallback post too
    await postCtaToDiscord();
    
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
      color: 0x2f3136,
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
 * Now uses showOnLeaderboard instead of separate announceDiscordMilestones flag
 * If you're on the leaderboard, you get milestone announcements automatically
 */
async function checkAndAnnounceMilestone(username, newStreak) {
  try {
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log(`Milestone check: User ${username} not found`);
      return false;
    }
    
    // Auto-announce for anyone on the leaderboard with a Discord username
    if (!user.showOnLeaderboard || !user.discordUsername) {
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
 * SCHEDULED DAILY MILESTONE CHECK
 * Runs once daily to catch all milestones - even if users don't open the app
 * Calculates streak from startDate for accuracy
 */
async function runScheduledMilestoneCheck() {
  console.log('🏆 Running scheduled milestone check for all leaderboard users...');
  
  try {
    // Get all users on the leaderboard with Discord usernames
    const users = await User.find({
      showOnLeaderboard: true,
      discordUsername: { $exists: true, $ne: '', $ne: null },
      startDate: { $exists: true, $ne: null }
    }).lean();
    
    let announcedCount = 0;
    
    for (const user of users) {
      // Calculate their actual current streak from startDate
      const currentStreak = calculateStreakFromStartDate(user.startDate);
      const lastAnnounced = user.lastMilestoneAnnounced || 0;
      
      // Check each milestone threshold
      for (const milestone of MILESTONE_DAYS) {
        // Only announce if they're AT or JUST PAST the milestone (within 2 days)
        // This prevents mass retroactive announcements for existing users
        const justCrossedMilestone = currentStreak >= milestone && currentStreak <= milestone + 2;
        
        if (justCrossedMilestone && lastAnnounced < milestone) {
          // They just crossed this milestone - announce it!
          await postMilestoneToDiscord(user, milestone);
          
          // Update their record
          const updateData = { 
            lastMilestoneAnnounced: milestone,
            currentStreak: currentStreak // Also sync their streak while we're at it
          };
          
          if (milestone >= 180 && !user.mentorEligible) {
            updateData.mentorEligible = true;
            console.log(`🎖️ ${user.username} is now mentor eligible (${milestone}+ days)`);
          }
          
          await User.findOneAndUpdate(
            { _id: user._id },
            { $set: updateData }
          );
          
          announcedCount++;
          
          // Only announce highest unannounced milestone per user per run
          break;
        }
      }
    }
    
    console.log(`✅ Scheduled milestone check complete: ${announcedCount} announcements made`);
    return { success: true, announced: announcedCount };
    
  } catch (error) {
    console.error('❌ Error in scheduled milestone check:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Manually announce a milestone for a user (for catch-up announcements)
 * @param {string} discordUsername - The Discord username to find the user
 * @param {number} days - The milestone day count to announce
 */
async function manualMilestoneAnnounce(discordUsername, days) {
  try {
    // Try Discord username first, then fall back to TitanTrack username
    let user = await User.findOne({ discordUsername });
    if (!user) {
      user = await User.findOne({ username: discordUsername });
    }
    
    if (!user) {
      console.log(`Manual milestone: User ${discordUsername} not found`);
      return { success: false, error: 'User not found' };
    }
    
    const success = await postMilestoneToDiscord(user, days);
    
    if (success) {
      // Update their lastMilestoneAnnounced so we don't double-announce
      await User.findOneAndUpdate(
        { _id: user._id },
        { $set: { lastMilestoneAnnounced: days } }
      );
      
      return { success: true, user: user.discordDisplayName || user.discordUsername };
    }
    
    return { success: false, error: 'Failed to post to Discord' };
  } catch (error) {
    console.error('❌ Error in manual milestone announce:', error);
    return { success: false, error: error.message };
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
  manualMilestoneAnnounce,
  runScheduledMilestoneCheck,  // NEW: Daily scheduled check
  getUserRank,
  getVerifiedMentors,
  triggerLeaderboardPost,
  resetLeaderboardMessage,
  MILESTONE_DAYS
};