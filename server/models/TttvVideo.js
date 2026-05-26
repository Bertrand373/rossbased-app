// server/models/TttvVideo.js
//
// TTTV (TitanTrack TV) episode metadata.
//
// One document per uploaded short. The actual MP4 + poster live in Firebase
// Storage (path tracked here for cleanup); this doc carries everything the
// player and admin list need to render an episode.
//
// Lifecycle:
//   1. Admin uploads via POST /api/tttv/videos. Multer pipes the file bytes
//      through the server, the route uploads to Firebase Storage with
//      firebase-admin, and creates this doc with the resulting public URL.
//   2. isPublished defaults to false so Ross can stage and review before
//      surfacing to members. PATCH /api/tttv/videos/:id flips the flag.
//   3. DELETE /api/tttv/videos/:id removes the doc AND best-effort cleans
//      the Storage files using the saved paths.
//
// "order" is a separate field from "episode" intentionally:
//   - episode = "what number is this in the series" (visible to viewers)
//   - order = "where it sorts in the feed" (admin can reorder without
//             rewriting episode numbers)
// Both default to the same value on creation; reorder UI only touches order.

const mongoose = require('mongoose');

const tttvVideoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },

  // Episode number — what viewers see. Auto-incremented on create unless
  // explicitly set. Not strictly unique (admin might overwrite history).
  episode: { type: Number, default: 0 },

  // Firebase Storage — both the public URL (for <video src>) and the
  // internal path (for deletion).
  storageUrl: { type: String, required: true },
  storagePath: { type: String, required: true },

  // Poster (first-frame thumbnail). Optional — videos can render without one.
  posterUrl: { type: String, default: null },
  posterPath: { type: String, default: null },

  // Extracted by the browser at upload time via video.duration. Used to
  // render "1m 14s" labels in the admin list + feed.
  durationSec: { type: Number, default: 0 },

  // The signature TTTV move: a single italic-serif line that fades in
  // mid-video at the timestamp. Both empty = no overlay.
  oracleOverlay: {
    text: { type: String, default: '' },
    atSec: { type: Number, default: 0 }
  },

  // Publish gate. Members only see isPublished=true via /api/tttv/feed.
  isPublished: { type: Boolean, default: false },

  // Display order in the feed (reorderable independently of episode #).
  order: { type: Number, default: 0 },

  // Audit fields.
  uploadedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  publishedAt: { type: Date, default: null }
});

// Feed queries always filter by isPublished and sort by order then recency,
// so cover those with one compound index.
tttvVideoSchema.index({ isPublished: 1, order: -1, publishedAt: -1 });

module.exports = mongoose.model('TttvVideo', tttvVideoSchema);
