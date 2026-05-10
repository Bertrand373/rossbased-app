// server/scripts/backfill-email-broadcasts.js
// ============================================================
// One-shot backfill: seed EmailBroadcast from Kit's recent broadcasts
// and measure performance for each.
//
// Idempotent — running twice skips ones already in the DB.
//
// Usage: cd ~/Desktop/rossbased-app/server && node scripts/backfill-email-broadcasts.js
// ============================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const EmailBroadcast = require('../models/EmailBroadcast');
const emailAgent = require('../services/emailAgent');

const KIT_API_KEY = process.env.KIT_API_KEY;
const KIT_API_BASE = 'https://api.kit.com/v4';

if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI not set');
  process.exit(1);
}
if (!KIT_API_KEY) {
  console.error('❌ KIT_API_KEY not set');
  process.exit(1);
}

// Convert Kit's HTML body back to the plain-text Ross-style format we feed Opus.
// Kit stores body as HTML (we wrap paragraphs in <p>...</p>), so undo that.
function htmlToPlainText(html) {
  if (!html) return '';
  return html
    .replace(/<\/?p[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchRecentKitBroadcasts(limit = 20) {
  const res = await fetch(`${KIT_API_BASE}/broadcasts?per_page=${limit}`, {
    headers: { 'X-Kit-Api-Key': KIT_API_KEY }
  });
  if (!res.ok) {
    throw new Error(`Kit list broadcasts failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.broadcasts || [];
}

async function backfill() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const broadcasts = await fetchRecentKitBroadcasts(20);
  console.log(`📊 Fetched ${broadcasts.length} broadcasts from Kit`);

  // Process oldest-first so the rolling 5-send average builds correctly
  // as we measure each broadcast.
  broadcasts.sort((a, b) => {
    const aDate = new Date(a.published_at || a.send_at || a.created_at || 0);
    const bDate = new Date(b.published_at || b.send_at || b.created_at || 0);
    return aDate - bDate;
  });

  let created = 0;
  let skipped = 0;

  for (const b of broadcasts) {
    if (!b.id) continue;
    if (!b.subject || b.subject === 'New Broadcast') {
      console.log(`  ⏭️  Skipping broadcast ${b.id}: empty/placeholder subject`);
      continue;
    }

    const sentAtRaw = b.published_at || b.send_at || b.created_at;
    if (!sentAtRaw) {
      console.log(`  ⏭️  Skipping broadcast ${b.id} ("${b.subject}"): no send timestamp`);
      continue;
    }

    const kitBroadcastId = String(b.id);
    const existing = await EmailBroadcast.findOne({ kitBroadcastId });
    if (existing) {
      console.log(`  ⏭️  Skipping ${kitBroadcastId} ("${b.subject}"): already in DB`);
      skipped++;
      continue;
    }

    const body = htmlToPlainText(b.content || '');

    try {
      await EmailBroadcast.create({
        kitBroadcastId,
        subject: b.subject,
        body,
        intelSnapshot: {},
        modelUsed: 'historical-backfill',
        sentAt: new Date(sentAtRaw)
      });
      console.log(`  ✅ Created ${kitBroadcastId}: "${b.subject}"`);
      created++;

      const result = await emailAgent.measureBroadcastPerformance(kitBroadcastId);
      if (result) {
        console.log(
          `     📊 Open rate: ${(result.openRate * 100).toFixed(1)}% · ` +
          `Tier: ${result.performanceTier} · Recipients: ${result.recipients}`
        );
      } else {
        console.log(`     ⚠️  Stats not available for ${kitBroadcastId} (broadcast may not have been sent)`);
      }
    } catch (err) {
      if (err.code === 11000) {
        console.log(`  ⏭️  ${kitBroadcastId} race-condition duplicate — skipping`);
        skipped++;
      } else {
        console.error(`  ❌ Error backfilling ${kitBroadcastId}: ${err.message}`);
      }
    }
  }

  console.log(`\nBackfilled ${created} broadcasts, ${skipped} skipped (already present)`);
  await mongoose.disconnect();
  process.exit(0);
}

backfill().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
