// server/models/OracleNote.js
// Premium "Oracle Notes" — highlights + marginalia on Oracle chat responses.
// A note has a colored highlight on a passage and (optionally) a private
// marginalia note. Surfaced inline in chat and aggregated in the Library view.

const mongoose = require('mongoose');

const COLORS = ['amber', 'rose', 'azure', 'sage'];

const oracleNoteSchema = new mongoose.Schema({
  username: { type: String, required: true, index: true },
  threadId: { type: String, required: true },
  threadTitle: { type: String, default: '' }, // snapshot — Library survives thread rename/delete
  messageTimestamp: { type: String, required: true }, // ISO timestamp of source Oracle message
  // Position in the message's *rendered* (markdown-stripped) plain text.
  // We also keep the highlighted text + ~30char context for re-anchoring
  // if upstream content ever drifts.
  startOffset: { type: Number, required: true, min: 0 },
  endOffset: { type: Number, required: true, min: 0 },
  highlightedText: { type: String, required: true },
  contextBefore: { type: String, default: '' },
  contextAfter: { type: String, default: '' },
  color: { type: String, enum: COLORS, default: 'amber' },
  note: { type: String, default: '', maxlength: 1000 }
}, { timestamps: true });

// In-thread render — get all notes for a thread in one query
oracleNoteSchema.index({ username: 1, threadId: 1 });

// Library view — chronological list of all of a user's notes
oracleNoteSchema.index({ username: 1, updatedAt: -1 });

module.exports = mongoose.model('OracleNote', oracleNoteSchema);
module.exports.COLORS = COLORS;
