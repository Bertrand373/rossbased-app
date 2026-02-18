// server/routes/discordLink.js
// Allows existing users to link their Discord account
// If their Discord ID is in the grandfather list, they get lifetime access

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const GrandfatheredMember = require('../models/GrandfatheredMember');
const { checkAndApplyGrandfather } = require('../middleware/subscriptionMiddleware');

// ============================================
// AUTH MIDDLEWARE
// ============================================
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const jwtSecret = process.env.JWT_SECRET || 'rossbased_secret_key';
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
// Use a DIFFERENT redirect URI for linking (not signup)
const DISCORD_LINK_REDIRECT_URI = process.env.DISCORD_LINK_REDIRECT_URI || 'https://titantrack.app/auth/discord/link-callback';

// ============================================
// LINK DISCORD TO EXISTING ACCOUNT
// ============================================
router.post('/link', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'No code provided' });
    }
    
    // Get current user
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // If user already has a Discord linked, reject
    if (user.discordId) {
      return res.status(400).json({ 
        error: 'Discord already linked',
        message: 'Your account already has a Discord connection.'
      });
    }
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_LINK_REDIRECT_URI
      })
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Discord link token exchange failed:', tokenResponse.status, errorText);
      return res.status(401).json({ error: 'Discord authentication failed' });
    }
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      return res.status(401).json({ error: 'Discord authentication failed' });
    }
    
    // Get Discord user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    
    if (!userResponse.ok) {
      return res.status(401).json({ error: 'Failed to fetch Discord user info' });
    }
    
    const discordUser = await userResponse.json();
    
    // CHECK: Is this Discord ID already linked to another TitanTrack account?
    const existingUser = await User.findOne({ discordId: discordUser.id });
    if (existingUser && existingUser.username !== user.username) {
      return res.status(409).json({ 
        error: 'Discord already linked',
        message: 'This Discord account is already linked to a different TitanTrack account.'
      });
    }
    
    // Link Discord to this account
    user.discordId = discordUser.id;
    user.discordUsername = discordUser.username;
    user.discordDisplayName = discordUser.global_name || discordUser.username;
    user.discordAvatar = discordUser.avatar || null;
    await user.save({ validateModifiedOnly: true });
    
    console.log(`🔗 Discord linked for ${user.username}: ${discordUser.username} (${discordUser.id})`);
    
    // Check grandfather status
    let isGrandfathered = false;
    if (user.subscription?.status !== 'grandfathered') {
      isGrandfathered = await checkAndApplyGrandfather(user, discordUser.id);
      if (isGrandfathered) {
        console.log(`🎖️ Grandfather access granted via Discord link for ${user.username}`);
      }
    }
    
    // Reload user to get updated data
    const updatedUser = await User.findOne({ username: user.username });
    
    res.json({
      success: true,
      message: isGrandfathered 
        ? 'Discord linked! Lifetime access granted as an OG member.'
        : 'Discord linked successfully.',
      isGrandfathered,
      discordUsername: discordUser.username,
      discordDisplayName: discordUser.global_name || discordUser.username,
      user: updatedUser.toObject()
    });
    
  } catch (error) {
    console.error('Discord link error:', error);
    res.status(500).json({ error: 'Failed to link Discord account' });
  }
});

// ============================================
// CHECK GRANDFATHER ELIGIBILITY (no auth needed for quick check)
// ============================================
router.get('/grandfather-check/:discordId', async (req, res) => {
  try {
    const member = await GrandfatheredMember.findOne({ discordId: req.params.discordId });
    
    res.json({
      eligible: !!member,
      claimed: member?.claimed || false,
      claimedBy: member?.claimedBy || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Check failed' });
  }
});

module.exports = router;
