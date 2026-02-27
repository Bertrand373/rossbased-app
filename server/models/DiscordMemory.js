// server/models/DiscordMemory.js
// Persistent conversation memory for Discord Oracle users
// Survives deploys and restarts — no more amnesia
// Also stores passively extracted streak data for non-linked users

const mongoose = require('mongoose');

const discordMemorySchema = new mongoose.Schema({
  discordUserId: { type: String, required: true, unique: true, index: true },
  username: { type: String },  // Latest known Discord username

  // Rolling conversation history (capped at 50 messages, ~5 days at 10/day)
  // Only the most recent 14 get sent to Claude on each call (cost control)
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, maxlength: 400 }, // Truncated for storage efficiency
    timestamp: { type: Date, default: Date.now }
  }],

  // Passively extracted streak data (from what users mention in conversation)
  lastKnownStreak: {
    day: Number,              // "I'm on day 45" → 45
    mentionedAt: Date,        // When they said it
    confidence: { type: String, enum: ['exact', 'approximate'], default: 'exact' }
  },

  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: false  // We manage updatedAt manually for efficiency
});

// Auto-expire documents after 7 days of inactivity
discordMemorySchema.index({ updatedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model('DiscordMemory', discordMemorySchema);
