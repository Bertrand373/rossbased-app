// server/models/RedditPost.js
// Stores ingested Reddit posts from r/semenretention
// Used by the Reddit ingestion service to avoid re-processing
// and by the context builder to generate Oracle community intelligence

const mongoose = require('mongoose');

const redditPostSchema = new mongoose.Schema({
  // Reddit's unique post ID (e.g., "t3_abc123")
  redditId: { type: String, required: true, unique: true, index: true },

  title: { type: String, required: true },
  selftext: { type: String, default: '' },
  author: { type: String, default: '[deleted]' },
  score: { type: Number, default: 0 },
  numComments: { type: Number, default: 0 },
  upvoteRatio: { type: Number, default: 0 },
  flair: { type: String, default: '' },
  permalink: { type: String, default: '' },

  // Top comments (store top 3 by score for context richness)
  topComments: [{
    body: String,
    score: Number,
    author: String
  }],

  // When the post was created on Reddit
  redditCreatedAt: { type: Date },

  // When we ingested it
  ingestedAt: { type: Date, default: Date.now }

}, { timestamps: true });

// Index for efficient lookups during ingestion and context building
redditPostSchema.index({ ingestedAt: -1 });
redditPostSchema.index({ score: -1 });

module.exports = mongoose.model('RedditPost', redditPostSchema);
