// server/models/OracleOutcome.js
// Tracks whether Oracle advice led to positive outcomes
// Snapshot user state at conversation time, compare 48h later

const mongoose = require('mongoose');

const outcomeSchema = new mongoose.Schema({
  username: { type: String, required: true, index: true },
  
  // What was happening when the Oracle spoke
  snapshot: {
    streakDay: Number,
    phase: String,
    benefitLevels: {
      energy: Number,
      focus: Number,
      confidence: Number
    },
    hadRecentUrge: Boolean,
    urgeIntensity: Number,
    topic: String  // What the conversation was broadly about
  },
  
  // What the Oracle said (summary, not full response)
  oracleNote: String,  // Reuse the Haiku-generated memory note
  
  // Outcome measured 48h later
  outcome: {
    measured: { type: Boolean, default: false },
    measuredAt: Date,
    streakDay: Number,          // Still on streak or relapsed?
    streakMaintained: Boolean,  // Most important signal
    benefitDelta: {
      energy: Number,
      focus: Number,
      confidence: Number
    },
    hadUrge: Boolean,
    overcameUrge: Boolean
  },

  // When to measure (48h after conversation)
  measureAt: { type: Date, required: true, index: true },
  
}, { timestamps: true });

// TTL: auto-delete after 90 days
outcomeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Index for the measurement job
outcomeSchema.index({ 'outcome.measured': 1, measureAt: 1 });

module.exports = mongoose.model('OracleOutcome', outcomeSchema);
