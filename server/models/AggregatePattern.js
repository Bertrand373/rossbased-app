// server/models/AggregatePattern.js
// Stores anonymized ML patterns for collective improvement
// NO personally identifiable information is stored here

const mongoose = require('mongoose');

const aggregatePatternSchema = new mongoose.Schema({
  // Submission metadata (anonymous)
  submittedAt: {
    type: Date,
    default: Date.now
  },
  
  // Pattern data - streak lengths when relapses occurred
  streakDaysAtRelapse: {
    type: [Number],
    default: []
  },
  
  // Average benefit levels before relapses
  avgBenefitsBeforeRelapse: {
    energy: Number,
    focus: Number,
    confidence: Number,
    aura: Number,
    sleep: Number,
    workout: Number
  },
  
  // Risk factor correlations (0-1 scale)
  riskFactorCorrelations: {
    evening: Number,      // Risk correlation with evening hours
    weekend: Number,      // Risk correlation with weekends
    lowEnergy: Number,    // Risk correlation with low energy
    lowFocus: Number,     // Risk correlation with low focus
    emotionalLoad: Number // Risk correlation with emotional load
  },
  
  // Aggregate stats (no dates or identifying info)
  totalRelapses: {
    type: Number,
    default: 0
  },
  totalDaysTracked: {
    type: Number,
    default: 0
  },
  
  // Model performance metrics
  modelMetrics: {
    precision: Number,
    recall: Number,
    f1Score: Number,
    accuracy: Number
  },
  
  // Version tracking for data format changes
  schemaVersion: {
    type: Number,
    default: 1
  }
}, {
  // Don't store any user references
  timestamps: false
});

// Index for aggregation queries
aggregatePatternSchema.index({ submittedAt: -1 });
aggregatePatternSchema.index({ 'modelMetrics.f1Score': -1 });

const AggregatePattern = mongoose.model('AggregatePattern', aggregatePatternSchema);

module.exports = AggregatePattern;
