// server/models/UserRiskProfile.js
// Layer 2: Persistent per-user risk model
// Evolves over time as Oracle observes patterns unique to each user
// This is what makes Oracle "know" a user better than they know themselves

const mongoose = require('mongoose');

const userRiskProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  username: { type: String, required: true, index: true },

  // === RELAPSE PATTERN FINGERPRINT ===
  // Built from streakHistory + Oracle interactions before relapses
  relapsePatterns: {
    // Day ranges where this specific user tends to relapse
    vulnerableDayRanges: [{
      min: Number,
      max: Number,
      occurrences: Number,       // How many relapses fell in this range
      lastOccurrence: Date
    }],

    // Lunar phases present during past relapses
    lunarCorrelations: [{
      phase: String,             // 'Waning Gibbous', 'New Moon', etc.
      count: Number
    }],

    // Topics/sentiments in Oracle conversations before relapse
    preRelapseSignals: [{
      signal: String,            // 'declining_sleep', 'vague_messages', 'rationalization', etc.
      frequency: Number,         // How often this preceded a relapse
      reliability: Number        // 0-1 score of how predictive this signal is
    }],

    // Average benefit score trajectory before relapse
    // e.g., "energy drops 2 points over 5 days before relapse"
    benefitDeclinePattern: {
      metric: String,            // Which metric declines most before relapse
      avgDecline: Number,        // Average decline amount
      daysBeforeRelapse: Number  // How many days before relapse the decline starts
    },

    totalRelapsesAnalyzed: { type: Number, default: 0 }
  },

  // === BEHAVIORAL FINGERPRINT ===
  // How this user interacts with Oracle and the app
  behaviorProfile: {
    // When do they message Oracle? (hour buckets)
    peakHours: [{ hour: Number, count: Number }],

    // Average message quality (word count, specificity)
    avgMessageLength: { type: Number, default: 0 },

    // Do they engage more when struggling or when thriving?
    engagementPattern: {
      type: String,
      enum: ['crisis-driven', 'growth-driven', 'consistent', 'unknown'],
      default: 'unknown'
    },

    // How they respond to different Oracle tones
    responseTonePreference: {
      directConfrontation: { type: Number, default: 0 },   // -1 to 1 (negative = bad outcome)
      philosophicalDepth: { type: Number, default: 0 },
      practicalGuidance: { type: Number, default: 0 },
      empathicSupport: { type: Number, default: 0 }
    },

    // App engagement signals
    avgDailyCheckins: { type: Number, default: 0 },
    usesUrgeToolkit: { type: Boolean, default: false },
    logsBenefitsConsistently: { type: Boolean, default: false }
  },

  // === CURRENT RISK ASSESSMENT ===
  currentRisk: {
    score: { type: Number, default: 0, min: 0, max: 100 },
    factors: [String],           // Active risk factors right now
    lastCalculated: Date,
    trend: {                     // Is risk increasing or decreasing?
      type: String,
      enum: ['rising', 'stable', 'falling', 'unknown'],
      default: 'unknown'
    }
  },

  // === GROWTH TRAJECTORY ===
  // Positive patterns, not just risk
  growthSignals: {
    longestStreakTrend: {         // Are their streaks getting longer?
      type: String,
      enum: ['improving', 'stable', 'declining', 'insufficient_data'],
      default: 'insufficient_data'
    },
    benefitTrend: {              // Are their benefit scores trending up?
      type: String,
      enum: ['improving', 'stable', 'declining', 'insufficient_data'],
      default: 'insufficient_data'
    },
    oracleEngagementDepth: {     // Are their questions getting deeper?
      type: String,
      enum: ['deepening', 'stable', 'surface', 'insufficient_data'],
      default: 'insufficient_data'
    }
  },

  // === PSYCHOLOGICAL MODEL (Layer 6) ===
  // Oracle's evolving understanding of who this person is
  psychProfile: {
    // What motivates them (discovered from conversation patterns)
    primaryMotivation: String,   // 'discipline', 'spiritual', 'attraction', 'health', 'purpose'
    
    // Self-deception patterns Oracle has noticed
    blindSpots: [String],        // e.g., 'rationalizes urges as curiosity', 'avoids discussing triggers'
    
    // What this user lies to themselves about
    recurringThemes: [String],   // Topics they keep returning to
    
    // Growth edges - where they're actively evolving
    growthEdges: [String],       // e.g., 'learning to sit with discomfort', 'building morning routine'
    
    // Summary paragraph Oracle uses for deep context
    oracleSummary: String,       // AI-generated evolving summary of this person
    summaryUpdatedAt: Date
  },

  lastFullAnalysis: Date,        // When risk profile was last comprehensively rebuilt
  analysisVersion: { type: Number, default: 1 }

}, { timestamps: true });

// Index for the daily risk calculation job
userRiskProfileSchema.index({ 'currentRisk.lastCalculated': 1 });
userRiskProfileSchema.index({ 'currentRisk.score': -1 });

module.exports = mongoose.model('UserRiskProfile', userRiskProfileSchema);
