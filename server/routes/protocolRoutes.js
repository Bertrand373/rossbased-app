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

  // Tag buyer in Kit (two-step: ensure subscriber exists, then tag separately)
  try {
    const kitApiKey = process.env.KIT_API_KEY;
    const kitTagId = process.env.KIT_PROTOCOL_BUYER_TAG_ID;

    if (kitApiKey && kitTagId) {
      // Step 1: Create or find the subscriber
      const subRes = await fetch('https://api.kit.com/v4/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Kit-Api-Key': kitApiKey
        },
        body: JSON.stringify({
          email_address: emailLower
        })
      });

      if (!subRes.ok) {
        const body = await subRes.text();
        console.error('Kit subscriber create error:', subRes.status, body);
      } else {
        // Step 2: Tag the subscriber via the tag endpoint
        const tagRes = await fetch(`https://api.kit.com/v4/tags/${kitTagId}/subscribers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Kit-Api-Key': kitApiKey
          },
          body: JSON.stringify({
            email_address: emailLower
          })
        });

        if (!tagRes.ok) {
          const tagBody = await tagRes.text();
          console.error('Kit tag error:', tagRes.status, tagBody);
        } else {
          console.log(`🏷️ Kit tag 'protocol-buyer' applied to ${emailLower}`);
        }
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
// RESEND DOWNLOAD LINKS PAGE (GET)
// ============================================
router.get('/resend', (req, res) => {
  const message = req.query.msg;
  let banner = '';
  if (message === 'sent') {
    banner = '<p style="color: #4ade80; margin: 0 0 24px 0;">Fresh download links sent. Check your email.</p>';
  } else if (message === 'notfound') {
    banner = '<p style="color: #f87171; margin: 0 0 24px 0;">No purchase found for that email. Double-check the address you used at checkout.</p>';
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Resend PROTOCOL Links</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="font-family: -apple-system, sans-serif; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
      <div style="text-align: center; max-width: 400px; padding: 24px; width: 100%;">
        <h1 style="font-size: 1.25rem; font-weight: 500; margin: 0 0 8px 0;">Resend PROTOCOL Download Links</h1>
        <p style="color: rgba(255,255,255,0.5); line-height: 1.6; margin: 0 0 24px 0;">
          Enter the email you used at checkout. We'll send fresh 48-hour download links.
        </p>
        ${banner}
        <form method="POST" action="/api/protocol/resend">
          <input type="email" name="email" required placeholder="your@email.com" style="width: 100%; padding: 14px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #fff; font-size: 0.9375rem; margin-bottom: 16px; box-sizing: border-box;" />
          <button type="submit" style="width: 100%; padding: 14px 28px; background: #fff; color: #000; font-size: 0.9375rem; font-weight: 600; border: none; border-radius: 10px; cursor: pointer;">
            Send Download Links
          </button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// ============================================
// RESEND DOWNLOAD LINKS HANDLER (POST)
// ============================================
router.post('/resend', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    if (!email) {
      return res.redirect('/api/protocol/resend?msg=notfound');
    }

    // Find the most recent purchase for this email
    const purchase = await ProtocolPurchase.findOne({ email }).sort({ createdAt: -1 });
    if (!purchase) {
      return res.redirect('/api/protocol/resend?msg=notfound');
    }

    // Generate fresh tokens (new 48-hour window)
    const tokenPDF = crypto.randomBytes(32).toString('hex');
    const tokenEPUB = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

    purchase.tokenPDF = tokenPDF;
    purchase.tokenEPUB = tokenEPUB;
    purchase.tokenExpiry = tokenExpiry;
    purchase.downloadedPDF = false;
    purchase.downloadedEPUB = false;
    await purchase.save();

    // Build download URLs and send email
    const baseUrl = process.env.CLIENT_URL || 'https://titantrack.app';
    const pdfUrl = `${baseUrl}/api/protocol/download/pdf/${tokenPDF}`;
    const epubUrl = `${baseUrl}/api/protocol/download/epub/${tokenEPUB}`;

    await resend.emails.send({
      from: 'Ross <noreply@titantrack.app>',
      to: email,
      subject: 'Your PROTOCOL download links (refreshed)',
      html: buildDeliveryEmail(pdfUrl, epubUrl)
    });

    console.log(`📧 Protocol resend links sent to ${email}`);
    return res.redirect('/api/protocol/resend?msg=sent');
  } catch (err) {
    console.error('Protocol resend error:', err);
    return res.redirect('/api/protocol/resend?msg=notfound');
  }
});

// ============================================
// DELIVERY EMAIL HTML
// ============================================
function buildDeliveryEmail(pdfUrl, epubUrl) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
    <body style="margin: 0; padding: 0; background-color: #000000;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#000000" style="background-color: #000000;">
    <tr><td align="center" style="padding: 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="480" style="max-width: 480px; width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff;" bgcolor="#000000">

      <tr><td style="padding: 40px 24px 0 24px;" bgcolor="#000000">
        <h2 style="font-size: 1.25rem; font-weight: 500; margin: 0 0 8px 0; color: #ffffff;">PROTOCOL is yours.</h2>
        <p style="font-size: 0.9375rem; color: #999999; line-height: 1.6; margin: 0 0 28px 0;">
          Download both formats below. These links expire in 48 hours.
        </p>
      </td></tr>

      <tr><td style="padding: 0 24px;" bgcolor="#000000">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right: 12px; padding-bottom: 12px;">
              <a href="${pdfUrl}" style="display: inline-block; padding: 14px 28px; background-color: #ffffff; color: #000000; font-size: 0.9375rem; font-weight: 600; text-decoration: none; border-radius: 10px;">
                Download PDF
              </a>
            </td>
            <td style="padding-bottom: 12px;">
              <a href="${epubUrl}" style="display: inline-block; padding: 14px 28px; background-color: #000000; color: #ffffff; font-size: 0.9375rem; font-weight: 600; text-decoration: none; border-radius: 10px; border: 1px solid #555555;">
                Download EPUB
              </a>
            </td>
          </tr>
        </table>
      </td></tr>

      <tr><td style="padding: 28px 24px 0 24px;" bgcolor="#000000">
        <p style="font-size: 0.9375rem; color: #999999; line-height: 1.6; margin: 0;">
          Start with Chapter 7 if you want results fast... that's the wet dream prevention and urge management system.
        </p>
      </td></tr>

      <tr><td style="padding: 16px 24px 0 24px;" bgcolor="#000000">
        <p style="font-size: 0.9375rem; color: #999999; line-height: 1.6; margin: 0;">
          If your links expire before you download, just reply to this email and I'll send new ones.
        </p>
      </td></tr>

      <tr><td style="padding: 32px 24px 40px 24px;" bgcolor="#000000">
        <p style="font-size: 0.8125rem; color: #555555; line-height: 1.5; margin: 0;">
          — Ross
        </p>
      </td></tr>

    </table>
    </td></tr>
    </table>
    </body>
    </html>
  `;
}

// ============================================
// EXPIRED LINK PAGE
// ============================================
function renderExpiredPage() {
  return `
    <!DOCTYPE html>
    <html>
    <head><title>Link Expired</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="font-family: -apple-system, sans-serif; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
      <div style="text-align: center; max-width: 400px; padding: 24px;">
        <h1 style="font-size: 1.25rem; font-weight: 500;">This download link has expired</h1>
        <p style="color: rgba(255,255,255,0.5); line-height: 1.6;">
          Links are valid for 48 hours after purchase.<br><br>
          <a href="/api/protocol/resend" style="display: inline-block; padding: 12px 24px; background: #fff; color: #000; font-weight: 600; text-decoration: none; border-radius: 10px;">Get Fresh Links</a>
        </p>
      </div>
    </body>
    </html>
  `;
}

module.exports = router;
module.exports.handleProtocolPurchase = handleProtocolPurchase;
