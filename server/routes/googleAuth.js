// server/routes/googleAuth.js
const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google OAuth endpoint
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'No credential provided' });
    }

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;
    
    console.log('Google auth for:', email);

    // Check if user exists
    let user = await User.findOne({ email });
    const isNewUser = !user;  // Track if this is a new user for Mixpanel
    
    if (!user) {
      // Create new user from Google data
      const username = email.split('@')[0].substring(0, 20);
      
      // Check if username is taken, add random suffix if so
      let finalUsername = username;
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        finalUsername = `${username}${Math.floor(Math.random() * 1000)}`;
      }
      
      user = new User({
        username: finalUsername,
        email,
        password: `google_${googleId}`, // Placeholder, they'll use Google to login
        googleId,
        startDate: null, // Let user set their own start date via DatePicker
        currentStreak: 0,
        longestStreak: 0,
        isPremium: false,
        benefits: {
          energy: 5,
          focus: 5,
          confidence: 5,
          aura: 5,
          sleep: 5,
          workout: 5
        },
        // Initialize with empty subscription
        subscription: {
          status: 'none',
          plan: 'none'
        },
        emotionalEntries: [],
        relapseHistory: [],
        benefitHistory: []
      });
      
      await user.save();
      console.log('Created new user via Google:', finalUsername);
    } else if (!user.googleId) {
      // Link Google to existing account
      user.googleId = googleId;
      await user.save();
      console.log('Linked Google to existing user:', user.username);
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
    console.error('Google auth error:', error);
    res.status(401).json({ error: 'Google authentication failed', details: error.message });
  }
});

module.exports = router;
