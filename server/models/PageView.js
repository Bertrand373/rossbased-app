// server/models/PageView.js
// Lightweight page view tracking for admin analytics
// Each document = one page view event

const mongoose = require('mongoose');

const pageViewSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  page: { type: String, required: true },
  sessionId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: false // we use our own timestamp field
});

// Indexes for fast analytics queries
pageViewSchema.index({ timestamp: -1 });
pageViewSchema.index({ userId: 1, timestamp: -1 });
pageViewSchema.index({ sessionId: 1, timestamp: 1 });
pageViewSchema.index({ page: 1, timestamp: -1 });

// Auto-delete after 90 days to prevent unbounded growth
pageViewSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 86400 });

module.exports = mongoose.model('PageView', pageViewSchema);
