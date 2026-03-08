// server/models/ProtocolPurchase.js
// Tracks Protocol ebook purchases via Stripe one-time payment

const mongoose = require('mongoose');

const protocolPurchaseSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  tokenPDF: { type: String, required: true, unique: true },
  tokenEPUB: { type: String, required: true, unique: true },
  tokenExpiry: { type: Date, required: true },
  downloadedPDF: { type: Boolean, default: false },
  downloadedEPUB: { type: Boolean, default: false },
  stripeSessionId: { type: String, required: true, unique: true },
  stripeCustomerId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Index for token lookups (download routes hit these)
protocolPurchaseSchema.index({ tokenPDF: 1 });
protocolPurchaseSchema.index({ tokenEPUB: 1 });

module.exports = mongoose.model('ProtocolPurchase', protocolPurchaseSchema);
