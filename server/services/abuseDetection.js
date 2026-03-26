// server/services/abuseDetection.js
// Real-time multi-account detection — runs after every new signup.
// If the signup IP already has 1+ other accounts, DMs Ross on Discord immediately.

const User = require('../models/User');

/**
 * Check if a new signup IP is shared with existing accounts.
 * If suspicious, DM Ross via Discord bot.
 * 
 * @param {string} ip - The IP of the new signup
 * @param {string} newUsername - The username just created
 * @param {string} method - 'app', 'discord', or 'google'
 */
async function checkSignupAbuse(ip, newUsername, method = 'app') {
  if (!ip) return;
  
  try {
    // Find all OTHER accounts that have used this IP
    const otherAccounts = await User.find(
      { 'aiUsage.lastIP': ip, username: { $ne: newUsername } },
      'username subscription.status createdAt discordUsername'
    ).lean();
    
    if (otherAccounts.length === 0) return; // Clean IP, nothing to report
    
    // Build alert message
    const accountList = otherAccounts.map(a => {
      const status = a.subscription?.status || 'none';
      const created = a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '?';
      return `  • ${a.username} (${status}, joined ${created})`;
    }).join('\n');
    
    const alertMsg = [
      `🚨 **Multi-Account Alert**`,
      ``,
      `New signup **${newUsername}** (via ${method}) shares IP \`${ip}\` with ${otherAccounts.length} existing account${otherAccounts.length > 1 ? 's' : ''}:`,
      ``,
      accountList,
      ``,
      `→ Admin: titantrack.app/admin (Users tab → search "${newUsername}")`,
    ].join('\n');
    
    console.log(`🚨 ABUSE ALERT: ${newUsername} shares IP ${ip} with ${otherAccounts.map(a => a.username).join(', ')}`);
    
    // DM Ross via Discord bot
    try {
      const discordBot = require('../discord-bot');
      if (discordBot.client && discordBot.client.isReady()) {
        const rossUser = await discordBot.client.users.fetch(process.env.ROSS_DISCORD_ID || '').catch(() => null);
        if (rossUser) {
          await rossUser.send(alertMsg);
          console.log('📩 Abuse alert DM sent to Ross');
        }
      }
    } catch (dmErr) {
      console.log('Could not DM abuse alert (non-blocking):', dmErr.message);
    }
    
  } catch (err) {
    console.error('Abuse detection check failed (non-blocking):', err.message);
  }
}

module.exports = { checkSignupAbuse };
