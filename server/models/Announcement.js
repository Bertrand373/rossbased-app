// server/models/Announcement.js
// App announcements / What's New — published from Admin Cockpit
// Latest announcement's version is the app's display version everywhere

const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  version: { type: String, required: true },       // e.g. "1.1.0"
  title: { type: String, required: true },          // e.g. "Oracle Gets Smarter"
  body: { type: String, required: true },           // Markdown-ish plain text
  publishedBy: { type: String, default: 'rossbased' },
  publishedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Latest-first queries
announcementSchema.index({ publishedAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
