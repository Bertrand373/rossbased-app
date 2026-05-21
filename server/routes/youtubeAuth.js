// server/routes/youtubeAuth.js
// Lets members link their public YouTube channel ID to their TitanTrack account.
// This is what lets Oracle recognize them when they @-mention it in comments
// under Ross's videos.
//
// Scope: youtube.readonly — we only read the channel ID once. We do NOT
// post or read on the member's behalf after linking. Their YouTube account
// is never used for anything except identity matching.

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ============================================
// AUTH MIDDLEWARE (mirrors discordLink.js pattern)
// ============================================
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return res.status(401).json({ error: 'Unauthorized' });
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

const YOUTUBE_OAUTH_CLIENT_ID = process.env.YOUTUBE_OAUTH_CLIENT_ID;
const YOUTUBE_OAUTH_CLIENT_SECRET = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
const YOUTUBE_LINK_REDIRECT_URI = process.env.YOUTUBE_LINK_REDIRECT_URI
  || 'https://titantrack.app/auth/youtube/link-callback';

// ============================================
// GET /api/auth/youtube/url
// Returns the Google OAuth consent URL the client should redirect to.
// Centralizing this in the server keeps client secret + scope drift bugs away.
// ============================================
router.get('/url', authenticate, async (req, res) => {
  if (!YOUTUBE_OAUTH_CLIENT_ID) {
    return res.status(500).json({ error: 'YouTube OAuth not configured' });
  }

  const params = new URLSearchParams({
    client_id: YOUTUBE_OAUTH_CLIENT_ID,
    redirect_uri: YOUTUBE_LINK_REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    access_type: 'online',
    prompt: 'select_account consent',
    include_granted_scopes: 'true'
  });

  res.json({
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  });
});

// ============================================
// POST /api/auth/youtube/link
// Body: { code }
// Exchanges OAuth code for access token, fetches the user's YouTube channel ID,
// saves it to their TitanTrack account.
// ============================================
router.post('/link', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'No code provided' });

    if (!YOUTUBE_OAUTH_CLIENT_ID || !YOUTUBE_OAUTH_CLIENT_SECRET) {
      console.error('YouTube OAuth client credentials missing');
      return res.status(500).json({ error: 'YouTube OAuth not configured' });
    }

    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: YOUTUBE_OAUTH_CLIENT_ID,
        client_secret: YOUTUBE_OAUTH_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: YOUTUBE_LINK_REDIRECT_URI
      })
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('YouTube link token exchange failed:', tokenRes.status, errBody);
      return res.status(401).json({ error: 'YouTube authentication failed' });
    }

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(401).json({ error: 'YouTube authentication failed' });
    }

    // Fetch the user's primary channel
    const channelsRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    if (!channelsRes.ok) {
      const errBody = await channelsRes.text();
      console.error('YouTube channel fetch failed:', channelsRes.status, errBody);
      return res.status(401).json({ error: 'Failed to fetch YouTube channel' });
    }

    const channelsData = await channelsRes.json();
    const channel = (channelsData.items || [])[0];

    if (!channel || !channel.id) {
      return res.status(400).json({
        error: 'No YouTube channel',
        message: 'This Google account has no YouTube channel. Create one at youtube.com first, then link.'
      });
    }

    const channelId = channel.id;
    const channelTitle = channel.snippet?.title || '';

    // Check if this YouTube channel is already linked to a different account
    const existing = await User.findOne({ youtubeChannelId: channelId });
    if (existing && existing.username !== user.username) {
      return res.status(409).json({
        error: 'YouTube already linked',
        message: 'This YouTube channel is already linked to a different TitanTrack account.'
      });
    }

    user.youtubeChannelId = channelId;
    user.youtubeChannelTitle = channelTitle;
    user.youtubeLinkedAt = new Date();
    await user.save({ validateModifiedOnly: true });

    console.log(`🎬 YouTube linked for ${user.username}: ${channelTitle} (${channelId})`);

    return res.json({
      success: true,
      message: `YouTube linked. Oracle will recognize you in the comments under Ross's videos.`,
      youtubeChannelId: channelId,
      youtubeChannelTitle: channelTitle
    });

  } catch (error) {
    console.error('YouTube link error:', error);
    res.status(500).json({ error: 'Failed to link YouTube account' });
  }
});

// ============================================
// POST /api/auth/youtube/unlink
// Removes the YouTube linkage. Member can re-link any time.
// ============================================
router.post('/unlink', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.youtubeChannelId = null;
    user.youtubeChannelTitle = '';
    user.youtubeLinkedAt = null;
    await user.save({ validateModifiedOnly: true });

    console.log(`🎬 YouTube unlinked for ${user.username}`);
    res.json({ success: true });
  } catch (error) {
    console.error('YouTube unlink error:', error);
    res.status(500).json({ error: 'Failed to unlink YouTube account' });
  }
});

// ============================================
// GET /api/auth/youtube/status
// Returns whether the current user has linked YouTube.
// ============================================
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username })
      .select('youtubeChannelId youtubeChannelTitle youtubeLinkedAt');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      linked: !!user.youtubeChannelId,
      channelId: user.youtubeChannelId || null,
      channelTitle: user.youtubeChannelTitle || '',
      linkedAt: user.youtubeLinkedAt || null
    });
  } catch (error) {
    console.error('YouTube status error:', error);
    res.status(500).json({ error: 'Failed to fetch YouTube status' });
  }
});

module.exports = router;
