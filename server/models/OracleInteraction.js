// server/models/OracleInteraction.js
// Captures structured metadata from every Oracle interaction (app + Discord)
// No full messages stored — only classified metadata for aggregate intelligence

const mongoose = require('mongoose');

const oracleInteractionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  discordUserId: { type: String, index: true }, // For Discord-only users without app accounts
  username: { type: String, index: true },       // App username or Discord username
  source: { type: String, enum: ['app', 'discord'], required: true },
  timestamp: { type: Date, default: Date.now, index: true },

  // User state snapshot at time of interaction
  streakDay: Number,
  spermaDay: Number,           // position in 74-day cycle
  spermaCycle: Number,          // which cycle number
  phase: String,               // 'Initial Adaptation', 'Emotional Processing', etc.

  // Classification output (from lightweight Haiku call)
  topics: [{
    type: String,
    enum: [
      'flatline', 'urge', 'attraction', 'energy', 'workout', 'sleep',
      'spiritual', 'relationship', 'career', 'wet_dream', 'diet',
      'meditation', 'motivation', 'relapse_fear', 'benefits',
      'science', 'protocol', 'general'
    ]
  }],
  sentiment: {
    type: String,
    enum: ['distressed', 'anxious', 'neutral', 'curious', 'confident', 'grateful']
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high']
  },

  // Pre-relapse language detection
  relapseRiskLanguage: { type: Boolean, default: false },

  // Did this user relapse within 48 hours of this interaction?
  // Backfilled when a relapse is detected via the user update endpoint
  relapseWithin48h: { type: Boolean, default: null }
}, {
  timestamps: true
});

// Indexes for aggregate queries
oracleInteractionSchema.index({ timestamp: -1 });
oracleInteractionSchema.index({ topics: 1, timestamp: -1 });
oracleInteractionSchema.index({ streakDay: 1, topics: 1 });
oracleInteractionSchema.index({ sentiment: 1, phase: 1 });
oracleInteractionSchema.index({ relapseRiskLanguage: 1, relapseWithin48h: 1 });

module.exports = mongoose.model('OracleInteraction', oracleInteractionSchema);
