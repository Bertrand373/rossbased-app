// server/models/YouTubeComment.js
// Stores YouTube comments from own channel and niche-wide videos
// Fed into Community Pulse and Content Pipeline for Oracle awareness

const mongoose = require('mongoose');

const youtubeCommentSchema = new mongoose.Schema({
  // YouTube's native comment ID (prevents duplicates)
  commentId: { type: String, required: true, unique: true },

  // Comment content
  text: { type: String, required: true },

  // Author info (public YouTube display name, not PII)
  authorName: { type: String, default: '' },

  // Video context
  videoId: { type: String, required: true, index: true },
  videoTitle: { type: String, default: '' },

  // Channel context
  channelId: { type: String, required: true, index: true },
  channelTitle: { type: String, default: '' },

  // Is this from Ross's own channel or from the broader niche?
  source: {
    type: String,
    enum: ['own', 'niche'],
    required: true,
    index: true
  },

  // Topics detected (same enum as OracleInteraction for consistency)
  topics: [{
    type: String,
    lowercase: true
  }],

  // Engagement signals
  likeCount: { type: Number, default: 0 },

  // Whether this comment has been processed by the content pipeline
  pipelineProcessed: { type: Boolean, default: false },

  // When the comment was published on YouTube
  publishedAt: { type: Date, required: true },

}, {
  timestamps: true
});

// Prevent duplicate imports
youtubeCommentSchema.index({ commentId: 1 }, { unique: true });

// For community pulse queries (recent own-channel comments)
youtubeCommentSchema.index({ source: 1, createdAt: -1 });

// For content pipeline (unprocessed comments)
youtubeCommentSchema.index({ pipelineProcessed: 1, source: 1, createdAt: -1 });

// TTL: auto-delete after 60 days
youtubeCommentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

module.exports = mongoose.model('YouTubeComment', youtubeCommentSchema);
