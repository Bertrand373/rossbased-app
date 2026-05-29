// server/models/Announcement.js
// App announcements / What's New — published from Admin Cockpit.
// Latest announcement's version is the app's display version everywhere.
//
// SCHEMA HISTORY:
//   v1 — body: required String (markdown-ish plain text). Single vertical
//        scroll in WhatsNew sheet.
//   v2 — slides: array of {image, title?, body?, cta?}. Horizontal swipable
//        carousel in WhatsNew sheet. body becomes optional fallback for
//        legacy announcements; new announcements use slides[].
//
// Backward-compat rule: an announcement is valid if it has at least one of
//   - body (legacy text)
//   - slides[] with ≥1 image
// The sheet renderer prefers slides[] when present, falls back to body.

const mongoose = require('mongoose');

const slideSchema = new mongoose.Schema({
  image: { type: String, required: true },            // URL — Firebase Storage CDN
  title: { type: String, default: '' },               // Optional HTML title beneath image
  body: { type: String, default: '' },                // Optional HTML caption beneath title
  cta: {
    label: { type: String, default: '' },             // e.g. "Open Journal"
    route: { type: String, default: '' },             // e.g. "/" or "/circles" — deep link
  },
}, { _id: false });

const announcementSchema = new mongoose.Schema({
  version: { type: String, required: true },          // e.g. "1.5.0"
  title: { type: String, default: '' },               // Optional top-of-sheet headline
  body: { type: String, default: '' },                // Legacy markdown-ish text (v1)
  slides: { type: [slideSchema], default: [] },       // New visual deck (v2)
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  publishedBy: { type: String, default: 'rossbased' },
  publishedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Validate at least one of body or slides[] is present — empty announcement
// is meaningless and would render an empty sheet.
announcementSchema.pre('validate', function (next) {
  const hasBody = this.body && this.body.trim().length > 0;
  const hasSlides = Array.isArray(this.slides) && this.slides.length > 0;
  if (!hasBody && !hasSlides) {
    return next(new Error('Announcement must have either body or at least one slide.'));
  }
  next();
});

// Latest-first queries
announcementSchema.index({ publishedAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
