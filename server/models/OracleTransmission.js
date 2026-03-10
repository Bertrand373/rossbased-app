// server/models/OracleTransmission.js
// Stores Oracle-initiated proactive messages (transmissions + interventions)
// These appear in the user's Oracle chat when they open the app

const mongoose = require('mongoose');

const oracleTransmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  username: { type: String, required: true, index: true },

  // The message Oracle wants to deliver
  message: { type: String, required: true },

  // What triggered this transmission
  source: {
    type: String,
    enum: [
      'risk_intervention',    // Layer 3: Risk score crossed threshold
      'aggregate_pattern',    // Daily aggregate transmission (cohort-matched)
      'pattern_discovery',    // Layer 5: Oracle discovered something relevant
      'reengagement'          // User gone quiet for 3+ days
    ],
    required: true
  },

  // Context data (for analytics)
  context: {
    riskScore: Number,
    streakDay: Number,
    matchCriteria: String,     // Why this user was targeted (e.g., "days 14-21, waning moon")
    patternId: String          // Reference to OracleEvolution discovery if applicable
  },

  // Delivery tracking
  delivered: { type: Boolean, default: false },
  deliveredAt: Date,
  pushSent: { type: Boolean, default: false },
  pushSentAt: Date,

  // Read tracking
  read: { type: Boolean, default: false },
  readAt: Date

}, { timestamps: true });

// Fetch unread transmissions for a user
oracleTransmissionSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Cleanup: auto-delete after 30 days
oracleTransmissionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('OracleTransmission', oracleTransmissionSchema);
