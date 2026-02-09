// server/routes/discordAuth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { checkAndApplyGrandfather, startFreeTrial } = require('../middleware/subscriptionMiddleware');

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://titantrack.app/auth/discord/callback';

// Exchange code for user data
router.post('/discord', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'No code provided' });
    }

    console.log('Discord auth attempt with redirect URI:', DISCORD_REDIRECT_URI);
    console.log('Discord Client ID configured:', !!DISCORD_CLIENT_ID);
    console.log('Discord Client Secret configured:', !!DISCORD_CLIENT_SECRET);

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT_URI
      })
    });

    // Check if response is OK before parsing JSON
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Discord token exchange failed:', tokenResponse.status, errorText);
      return res.status(401).json({ 
        error: 'Discord authentication failed', 
        details: `Discord returned ${tokenResponse.status}` 
      });
    }

    // Check content type before parsing
    const contentType = tokenResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await tokenResponse.text();
      console.error('Discord returned non-JSON response:', contentType, responseText.substring(0, 500));
      return res.status(401).json({ 
        error: 'Discord authentication failed',
        details: 'Unexpected response format from Discord'
      });
    }

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      console.error('Discord token error:', tokenData);
      return res.status(401).json({ error: 'Discord authentication failed', details: tokenData.error_description || tokenData.error });
    }

    // Get user info from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!userResponse.ok) {
      console.error('Discord user fetch failed:', userResponse.status);
      return res.status(401).json({ error: 'Failed to fetch Discord user info' });
    }

    const discordUser = await userResponse.json();
    console.log('Discord auth for:', discordUser.username, '| Display name:', discordUser.global_name);

    // Check if user exists by discordId or email
    let user = await User.findOne({ 
      $or: [
        { discordId: discordUser.id },
        { email: discordUser.email }
      ]
    });
    const isNewUser = !user;  // Track if this is a new user for Mixpanel

    if (!user) {
      // Create new user
      let username = discordUser.username.substring(0, 20);
      
      // Check if username is taken
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        username = `${username}${Math.floor(Math.random() * 1000)}`;
      }

      user = new User({
        username,
        email: discordUser.email || '',
        password: `discord_${discordUser.id}`,
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordDisplayName: discordUser.global_name || discordUser.username,
        discordAvatar: discordUser.avatar || null,
        startDate: new Date().toISOString().split('T')[0],
        currentStreak: 0,
        longestStreak: 0,
        wetDreamCount: 0,
        relapseCount: 0,
        isPremium: false,
        badges: [
          { id: 1, name: '7-Day Warrior', earned: false, date: null },
          { id: 2, name: '14-Day Monk', earned: false, date: null },
          { id: 3, name: '30-Day Master', earned: false, date: null },
          { id: 4, name: '90-Day King', earned: false, date: null }
        ],
        benefits: {
          energy: 5,
          focus: 5,
          confidence: 5,
          aura: 5,
          sleep: 5,
          workout: 5
        },
        emotionalEntries: [],
        relapseHistory: [],
        benefitHistory: [],
        streakHistory: [{
          id: 1,
          start: new Date(),
          end: null,
          days: 0,
          reason: null
        }],
        // Initialize with empty subscription (will check grandfather below)
        subscription: {
          status: 'none',
          plan: 'none'
        },
        notificationPreferences: {
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          types: {
            milestones: true,
            urgeSupport: true,
            weeklyProgress: true
          },
          dailyReminderEnabled: false,
          dailyReminderTime: '09:00'
        }
      });

      await user.save();
      console.log('Created new user via Discord:', username);
    } else {
      // Update existing user's Discord info
      user.discordId = discordUser.id;
      user.discordUsername = discordUser.username;
      user.discordDisplayName = discordUser.global_name || discordUser.username;
      user.discordAvatar = discordUser.avatar || null;
      await user.save();
      console.log('Updated Discord info for user:', user.username);
    }

    // ============================================
    // GRANDFATHER CHECK - Auto-grant lifetime access
    // ============================================
    // Check if this Discord ID is in the grandfather list
    // Works for both new signups AND existing users linking Discord
    if (discordUser.id && user.subscription?.status !== 'grandfathered') {
      const wasGranted = await checkAndApplyGrandfather(user, discordUser.id);
      if (wasGranted) {
        // Reload user to get updated subscription data
        user = await User.findOne({ username: user.username });
        console.log(`🎖️ Discord OG grandfather access granted to ${user.username}`);
      }
    }

    // Auto-start 7-day free trial for NEW users who weren't grandfathered
    if (isNewUser && user.subscription?.status === 'none') {
      await startFreeTrial(user);
      user = await User.findOne({ username: user.username });
      console.log(`🎁 Auto-started free trial for: ${user.username}`);
    }

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET || 'rossbased_secret_key';
    const token = jwt.sign({ username: user.username }, jwtSecret, { expiresIn: '7d' });

    res.json({
      token,
      isNewUser,  // Send flag to frontend for Mixpanel tracking
      ...user.toObject()
    });

  } catch (error) {
    console.error('Discord auth error:', error);
    res.status(401).json({ error: 'Discord authentication failed', details: error.message });
  }
});

module.exports = router;
