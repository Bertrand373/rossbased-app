// server/models/OracleEvolution.js
// Layers 4 + 7: Oracle's self-improvement records
// Stores self-assessments, voice analysis, pattern discoveries, and prompt proposals
// This is how Oracle evolves itself over time with Ross as the architect

const mongoose = require('mongoose');

const oracleEvolutionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'voice-assessment',      // Layer 4: How Oracle's tone performed
      'pattern-discovery',     // Layer 5: New knowledge Oracle found in data
      'prompt-proposal',       // Layer 7: Proposed changes to system prompt
      'response-strategy',     // Layer 1: Which response approaches work best
      'self-assessment'        // Layer 7: Comprehensive self-review
    ],
    required: true,
    index: true
  },

  // The analysis content (AI-generated)
  content: { type: String, required: true },

  // Structured findings (for programmatic consumption)
  findings: {
    // Layer 1: Response strategy effectiveness
    strategies: [{
      approach: String,        // 'direct_confrontation', 'philosophical', 'practical', 'empathic'
      context: String,         // 'urge_days_20-30', 'flatline_days_40-60', etc.
      successRate: Number,     // 0-100
      sampleSize: Number
    }],

    // Layer 5: Discovered correlations
    correlations: [{
      description: String,     // Human-readable pattern description
      variables: [String],     // e.g., ['lunar_waning_gibbous', 'days_40-50', 'energy_declining']
      strength: Number,        // 0-1 correlation strength
      sampleSize: Number,
      actionable: Boolean      // Can Oracle use this to help users?
    }],

    // Layer 7: Specific prompt modifications proposed
    promptChanges: [{
      section: String,         // Which part of the system prompt to modify
      currentBehavior: String, // What Oracle currently does
      proposedChange: String,  // What Oracle thinks it should do instead
      rationale: String,       // Why, backed by data
      confidence: Number       // 0-1
    }],

    // Layer 4: Anti-patterns discovered
    antiPatterns: [{
      pattern: String,         // Exact phrase or behavior to avoid
      replacement: String,     // What to do instead
      frequency: Number        // How often this was detected
    }]
  },

  // Data window this analysis covers
  dataWindow: {
    from: Date,
    to: Date,
    outcomesAnalyzed: Number,
    interactionsAnalyzed: Number,
    usersAnalyzed: Number
  },

  // Admin review status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'partial'],
    default: 'pending'
  },
  reviewedAt: Date,
  reviewNotes: String          // Ross's notes when reviewing

}, { timestamps: true });

// Index for fetching pending reviews
oracleEvolutionSchema.index({ status: 1, createdAt: -1 });

// TTL: Keep evolution records for 1 year
oracleEvolutionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('OracleEvolution', oracleEvolutionSchema);
