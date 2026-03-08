// server/routes/protocolRoutes.js
// Handles Protocol ebook delivery: download routes + purchase processing
// Downloads stream files from MongoDB GridFS (never publicly accessible)

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const ProtocolPurchase = require('../models/ProtocolPurchase');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================
// HELPER: Get GridFS bucket
// ============================================
function getGridFSBucket() {
  return new GridFSBucket(mongoose.connection.db, { bucketName: 'protocol' });
}

// ============================================
// HELPER: Find GridFS file by filename
// ============================================
async function findGridFSFile(filename) {
  const bucket = getGridFSBucket();
  const files = await bucket.find({ filename }).toArray();
  return files.length > 0 ? files[0] : null;
}

// ============================================
// DOWNLOAD PDF
// ============================================
router.get('/download/pdf/:token', async (req, res) => {
  try {
    const purchase = await ProtocolPurchase.findOne({ tokenPDF: req.params.token });

    if (!purchase) {
      return res.status(404).send(renderExpiredPage());
    }

    if (new Date() > purchase.tokenExpiry) {
      return res.status(410).send(renderExpiredPage());
    }

    const file = await findGridFSFile('protocol.pdf');
    if (!file) {
      console.error('GridFS file not found: protocol.pdf');
      return res.status(500).send('File not available. Contact contact@rossbased.com');
    }

    // Mark as downloaded
    purchase.downloadedPDF = true;
    await purchase.save();

    // Stream file to buyer
    const bucket = getGridFSBucket();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="The_Protocol_by_Ross.pdf"',
      'Content-Length': file.length
    });
    bucket.openDownloadStreamByName('protocol.pdf').pipe(res);

    console.log(`📥 Protocol PDF downloaded by ${purchase.email}`);
  } catch (err) {
    console.error('Protocol PDF download error:', err);
    res.status(500).send('Download failed. Contact contact@rossbased.com');
  }
});

// ============================================
// DOWNLOAD EPUB
// ============================================
router.get('/download/epub/:token', async (req, res) => {
  try {
    const purchase = await ProtocolPurchase.findOne({ tokenEPUB: req.params.token });

    if (!purchase) {
      return res.status(404).send(renderExpiredPage());
    }

    if (new Date() > purchase.tokenExpiry) {
      return res.status(410).send(renderExpiredPage());
    }

    const file = await findGridFSFile('protocol.epub');
    if (!file) {
      console.error('GridFS file not found: protocol.epub');
      return res.status(500).send('File not available. Contact contact@rossbased.com');
    }

    // Mark as downloaded
    purchase.downloadedEPUB = true;
    await purchase.save();

    // Stream file to buyer
    const bucket = getGridFSBucket();
    res.set({
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': 'attachment; filename="The_Protocol_by_Ross.epub"',
      'Content-Length': file.length
    });
    bucket.openDownloadStreamByName('protocol.epub').pipe(res);

    console.log(`📥 Protocol EPUB downloaded by ${purchase.email}`);
  } catch (err) {
    console.error('Protocol EPUB download error:', err);
    res.status(500).send('Download failed. Contact contact@rossbased.com');
  }
});

// ============================================
// HANDLE PROTOCOL PURCHASE (called from webhook)
// ============================================
async function handleProtocolPurchase(session) {
  const email = session.customer_details?.email || session.customer_email;

  if (!email) {
    console.error('No email found in Protocol checkout session:', session.id);
    return;
  }

  const emailLower = email.toLowerCase().trim();

  // Prevent duplicate processing (Stripe can retry webhooks)
  const existing = await ProtocolPurchase.findOne({ stripeSessionId: session.id });
  if (existing) {
    console.log(`⚠️ Protocol purchase already processed for session ${session.id}`);
    return;
  }

  // Generate signed download tokens (48-hour expiry)
  const tokenPDF = crypto.randomBytes(32).toString('hex');
  const tokenEPUB = crypto.randomBytes(32).toString('hex');
  const tokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  // Create purchase record
  await ProtocolPurchase.create({
    email: emailLower,
    tokenPDF,
    tokenEPUB,
    tokenExpiry,
    stripeSessionId: session.id,
    stripeCustomerId: session.customer || null
  });

  // Build download URLs
  const baseUrl = process.env.CLIENT_URL || 'https://titantrack.app';
  const pdfUrl = `${baseUrl}/api/protocol/download/pdf/${tokenPDF}`;
  const epubUrl = `${baseUrl}/api/protocol/download/epub/${tokenEPUB}`;

  // Send delivery email via Resend
  try {
    await resend.emails.send({
      from: 'Ross <noreply@titantrack.app>',
      to: emailLower,
      subject: 'Your copy of PROTOCOL is ready',
      html: buildDeliveryEmail(pdfUrl, epubUrl)
    });
    console.log(`📧 Protocol delivery email sent to ${emailLower}`);
  } catch (emailErr) {
    console.error('Protocol delivery email failed:', emailErr);
    // Purchase record exists — Ross can manually resend if needed
  }

  // Tag buyer in Kit
  try {
    const kitApiKey = process.env.KIT_API_KEY;
    const kitTagId = process.env.KIT_PROTOCOL_BUYER_TAG_ID;

    if (kitApiKey && kitTagId) {
      const kitRes = await fetch('https://api.kit.com/v4/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Kit-Api-Key': kitApiKey
        },
        body: JSON.stringify({
          email_address: emailLower,
          tags: [kitTagId]
        })
      });

      if (!kitRes.ok) {
        const body = await kitRes.text();
        console.error('Kit API error:', kitRes.status, body);
      } else {
        console.log(`🏷️ Kit tag 'protocol-buyer' applied to ${emailLower}`);
      }
    } else {
      console.log('⚠️ Kit API key or tag ID not set — skipping Kit tagging');
    }
  } catch (kitErr) {
    console.error('Kit tagging error:', kitErr);
    // Non-blocking — purchase and email already handled
  }

  console.log(`✅ Protocol purchase processed for ${emailLower} (session: ${session.id})`);
}

// ============================================
// DELIVERY EMAIL HTML
// ============================================
function buildDeliveryEmail(pdfUrl, epubUrl) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background-color: #000000; color: #ffffff;">
      <h2 style="font-size: 1.25rem; font-weight: 500; margin: 0 0 8px 0; color: #ffffff;">PROTOCOL is yours.</h2>
      <p style="font-size: 0.9375rem; color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 28px 0;">
        Download both formats below. These links expire in 48 hours.
      </p>

      <a href="${pdfUrl}" style="display: inline-block; padding: 14px 28px; background-color: #ffffff; color: #000000; font-size: 0.9375rem; font-weight: 600; text-decoration: none; border-radius: 10px; margin-right: 12px; margin-bottom: 12px;">
        Download PDF
      </a>
      <a href="${epubUrl}" style="display: inline-block; padding: 14px 28px; background-color: transparent; color: #ffffff; font-size: 0.9375rem; font-weight: 600; text-decoration: none; border-radius: 10px; border: 1px solid rgba(255,255,255,0.3); margin-bottom: 12px;">
        Download EPUB
      </a>

      <p style="font-size: 0.9375rem; color: rgba(255,255,255,0.6); line-height: 1.6; margin: 28px 0 0 0;">
        Start with Chapter 7 if you want results fast — that's the wet dream prevention and urge management system.
      </p>
      <p style="font-size: 0.9375rem; color: rgba(255,255,255,0.6); line-height: 1.6; margin: 16px 0 0 0;">
        If your links expire before you download, just reply to this email and I'll send new ones.
      </p>

      <p style="font-size: 0.8125rem; color: rgba(255,255,255,0.3); line-height: 1.5; margin: 32px 0 0 0;">
        — Ross
      </p>
    </div>
  `;
}

// ============================================
// EXPIRED LINK PAGE
// ============================================
function renderExpiredPage() {
  return `
    <!DOCTYPE html>
    <html>
    <head><title>Link Expired</title></head>
    <body style="font-family: -apple-system, sans-serif; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
      <div style="text-align: center; max-width: 400px; padding: 24px;">
        <h1 style="font-size: 1.25rem; font-weight: 500;">This download link has expired</h1>
        <p style="color: rgba(255,255,255,0.5); line-height: 1.6;">
          Links are valid for 48 hours after purchase. Email <a href="mailto:contact@rossbased.com" style="color: #fff;">contact@rossbased.com</a> and I'll send you fresh links.
        </p>
      </div>
    </body>
    </html>
  `;
}

module.exports = router;
module.exports.handleProtocolPurchase = handleProtocolPurchase;
