// server/models/YouTubeOracleReply.js
// Tracks every Oracle reply posted to YouTube comments. Serves three jobs:
//   1. Audit log for moderation + kill switch (delete by replyCommentId)
//   2. Per-video quota enforcement (1/2/3 per video by tier)
//   3. Dedup — we only respond once to any given parent comment

const mongoose = require('mongoose');

const youtubeOracleReplySchema = new mongoose.Schema({
  // The TitanTrack user who triggered Oracle by @-mentioning it
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  username: { type: String, required: true },

  // The parent comment we replied to (YouTube comment ID)
  parentCommentId: { type: String, required: true, unique: true },

  // The reply we posted (YouTube comment ID, populated on success)
  replyCommentId: { type: String, default: null },

  // Video context
  videoId: { type: String, required: true, index: true },
  videoTitle: { type: String, default: '' },

  // What the member asked
  questionText: { type: String, required: true, maxlength: 2000 },

  // What Oracle said
  responseText: { type: String, default: '', maxlength: 4000 },

  // Tier at the time of reply (snapshot)
  tier: {
    type: String,
    enum: ['grandfathered', 'practitioner', 'ascended', 'admin', 'beta'],
    required: true
  },

  // Status of the reply attempt
  status: {
    type: String,
    enum: ['posted', 'rejected_quota', 'rejected_filter', 'rejected_substance', 'generation_failed', 'post_failed', 'deleted'],
    required: true,
    index: true
  },

  // Failure reason (when status indicates failure)
  errorMessage: { type: String, default: '' },

  // Timestamps
  postedAt: { type: Date, default: null },
}, {
  timestamps: true
});

// Per-video quota check: how many Oracle replies has this user gotten on this video today
youtubeOracleReplySchema.index({ userId: 1, videoId: 1, status: 1, createdAt: -1 });

// Admin dashboard: recent replies, recent errors
youtubeOracleReplySchema.index({ status: 1, createdAt: -1 });

// TTL: auto-delete after 180 days to keep collection small (audit log purpose has limited shelf life)
youtubeOracleReplySchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports = mongoose.model('YouTubeOracleReply', youtubeOracleReplySchema);
