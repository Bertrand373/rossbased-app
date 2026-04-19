// server/services/emailAgent.js
// ============================================================
// EMAIL AGENT — Autonomous Email Pipeline
// ============================================================
//
// Gathers community intelligence → writes email in Ross's voice →
// creates Kit broadcast → manages warmup tiers automatically.
//
// Kit V4 API: https://developers.kit.com/v4
// Uses tags (not segments) for subscriber targeting.

const Anthropic = require('@anthropic-ai/sdk');
const EmailAgentState = require('../models/EmailAgentState');
const User = require('../models/User');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const KIT_API_KEY = process.env.KIT_API_KEY;
const KIT_API_BASE = 'https://api.kit.com/v4';

const TIER_LABELS = {
  1: 'Engaged openers (~120)',
  2: 'Opened in 90 days (~300-500)',
  3: 'Confirmed subscribers (~800+)',
  4: 'Full list (~1,300)'
};

// ============================================================
// INTELLIGENCE GATHERING — Same data sources as existing !email
// ============================================================

async function gatherIntelligence() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 1. Community Pulse
  let pulse = '';
  try {
    const { getCommunityPulse } = require('./communityPulse');
    pulse = await getCommunityPulse() || '';
  } catch {}

  // 2. YouTube comments (last 7 days)
  let ytComments = [];
  try {
    const { getRecentOwnComments } = require('./youtubeComments');
    ytComments = await getRecentOwnComments(168);
  } catch {}

  // 3. Lunar phase
  let lunar = {};
  try {
    lunar = require('../utils/lunarData').getLunarData();
  } catch {}

  // 4. Streak distribution
  const streakers = await User.find(
    { startDate: { $exists: true } }, { startDate: 1 }
  ).lean();
  const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
  const streakDays = streakers.map(u => {
    if (typeof u.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(u.startDate)) {
      const [y, m, d] = u.startDate.split('-').map(Number);
      return Math.max(1, Math.floor((todayMid - new Date(y, m - 1, d)) / 86400000) + 1);
    }
    const s = new Date(u.startDate); s.setHours(0, 0, 0, 0);
    return Math.max(1, Math.floor((todayMid - s) / 86400000) + 1);
  });

  const streakDistribution = {
    totalTracking: streakDays.length,
    under30: streakDays.filter(d => d < 30).length,
    range30to90: streakDays.filter(d => d >= 30 && d < 90).length,
    range90to180: streakDays.filter(d => d >= 90 && d < 180).length,
    over180: streakDays.filter(d => d >= 180).length
  };

  // 5. Trending Oracle topics
  let trendingTopics = [];
  try {
    const DiscordMemory = require('../models/DiscordMemory');
    const recentNotes = await DiscordMemory.aggregate([
      { $match: { createdAt: { $gt: sevenDaysAgo } } },
      { $unwind: '$topics' },
      { $group: { _id: '$topics', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    trendingTopics = recentNotes.map(t => ({ topic: t._id, count: t.count }));
  } catch {}

  // 6. Sentiment distribution
  let sentimentDist = [];
  try {
    const DiscordMemory = require('../models/DiscordMemory');
    const sentiments = await DiscordMemory.aggregate([
      { $match: { createdAt: { $gt: sevenDaysAgo }, sentiment: { $exists: true } } },
      { $group: { _id: '$sentiment', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    sentimentDist = sentiments.map(s => ({ sentiment: s._id, count: s.count }));
  } catch {}

  // 7. Discord themes from CommunityPulse
  let discordThemes = [];
  try {
    const CommunityPulse = require('../models/CommunityPulse');
    const recentPulses = await CommunityPulse.find({
      createdAt: { $gt: sevenDaysAgo }
    }).sort({ createdAt: -1 }).limit(20).lean();
    const topicCounts = {};
    recentPulses.forEach(p => {
      (p.topics || []).forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
    });
    discordThemes = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([topic, count]) => ({ topic, count }));
  } catch {}

  return {
    pulse,
    ytComments,
    lunar,
    streakDistribution,
    trendingTopics,
    sentimentDist,
    discordThemes
  };
}

// ============================================================
// PAST BROADCASTS — Fetch recent emails to avoid repeats
// ============================================================

async function getRecentBroadcasts(limit = 10) {
  if (!KIT_API_KEY) return [];
  try {
    const res = await fetch(`${KIT_API_BASE}/broadcasts?per_page=${limit}`, {
      headers: { 'X-Kit-Api-Key': KIT_API_KEY }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const broadcasts = data.broadcasts || [];
    return broadcasts
      .filter(b => b.subject && b.subject !== 'New Broadcast')
      .map(b => ({
        subject: b.subject,
        snippet: (b.content || '').replace(/<[^>]*>/g, '').substring(0, 200).trim()
      }));
  } catch (err) {
    console.error('[EmailAgent] Failed to fetch past broadcasts:', err.message);
    return [];
  }
}

// ============================================================
// DRAFT GENERATION — Claude writes email in Ross's voice
// ============================================================

async function generateEmailDraft(intel) {
  // Fetch past broadcasts to prevent repeats in subject AND content
  const pastBroadcasts = await getRecentBroadcasts();

  // Build data block for Claude (same format as existing buildWeeklyEmailDraft)
  let dataBlock = 'COMMUNITY INTELLIGENCE DATA:\n\n';

  if (intel.lunar?.label) {
    dataBlock += `LUNAR PHASE: ${intel.lunar.label} (${intel.lunar.illumination || '?'}% illuminated)\n`;
    dataBlock += `Energy: ${intel.lunar.energy || 'N/A'}\n\n`;
  }

  const sd = intel.streakDistribution;
  dataBlock += `STREAK DISTRIBUTION (${sd.totalTracking} practitioners tracking):\n`;
  dataBlock += `Under 30 days: ${sd.under30} | 30-90 days: ${sd.range30to90} | 90-180 days: ${sd.range90to180} | 180+ days: ${sd.over180}\n\n`;

  if (intel.trendingTopics.length > 0) {
    dataBlock += `TOP ORACLE TOPICS THIS WEEK:\n`;
    intel.trendingTopics.forEach(t => { dataBlock += `- ${t.topic}: ${t.count} conversations\n`; });
    dataBlock += '\n';
  }

  if (intel.sentimentDist.length > 0) {
    dataBlock += `COMMUNITY SENTIMENT THIS WEEK:\n`;
    intel.sentimentDist.forEach(s => { dataBlock += `- ${s.sentiment}: ${s.count}\n`; });
    dataBlock += '\n';
  }

  if (intel.discordThemes.length > 0) {
    dataBlock += `DISCORD CONVERSATION THEMES:\n`;
    intel.discordThemes.forEach(t => { dataBlock += `- ${t.topic}: ${t.count} mentions\n`; });
    dataBlock += '\n';
  }

  if (intel.pulse) {
    dataBlock += `COMMUNITY PULSE SUMMARY:\n${intel.pulse.substring(0, 1500)}\n\n`;
  }

  if (intel.ytComments.length > 0) {
    dataBlock += `YOUTUBE COMMENTS THIS WEEK (${intel.ytComments.length} total, top samples):\n`;
    intel.ytComments.slice(0, 15).forEach(c => {
      dataBlock += `- "${c.text.substring(0, 200)}"\n`;
    });
    dataBlock += '\n';
  }

  const emailPrompt = `You are ghostwriting a weekly email for Ross, the creator of TitanTrack (a semen retention tracking app) and author of "The Protocol" ebook. This email goes to his subscriber list.

Ross's voice rules (NON-NEGOTIABLE):
- Opens with a HOOK. Never "Hey" or "Hope you're doing well." Hit them with something specific and confrontational right away.
- Short punchy sentences. "Yea. It can get crazy. It probably will." That rhythm.
- Uses "brother" or "my friend" naturally (not every email, but when it fits).
- Uses ... (ellipsis) for pauses. NEVER em dashes. NEVER en dashes. NEVER semicolons.
- Uses CAPS for emphasis on key phrases. Not constantly, but when something needs to HIT.
- Casual grammar is intentional. "Its" not "It's" sometimes. "Im" not "I'm" sometimes.
- References frequency, energy, vibration, aura naturally.
- Zero filler. Every sentence earns its place or it gets cut.
- Signs off as "-Ross"
- Speaks from 7+ years of personal retention experience (2,500+ day streak).

SYNTHESIS RULES (CRITICAL):
- NEVER cite raw numbers, counts, or percentages. No "48 men crossed 180 days." Ross would write about what the pattern MEANS.
- NEVER use the word "Oracle" in the email body. He talks about what he's SEEING in his community.
- NEVER list data categories. No "sentiment was..." No "trending topics included..."
- ONE specific detail can ground the email (a single vivid observation, a pattern that emerged).
- The data should make you THINK something. Write THAT thought.

STRUCTURE:
- Subject line (compelling, 5-8 words, no clickbait)
- Opening line that hooks immediately
- 2-3 short paragraphs covering the week's real patterns or observations
- Close with a thought that sits with them
- Sign off as "-Ross"

Total length: 150-250 words. Tight. Every sentence earns its place.

ANTI-FABRICATION RULE (CRITICAL):
NEVER invent specific community moments, quotes, or anecdotes. If you reference something a community member said or did, it MUST come directly from the data provided below. If the data doesn't give you a vivid specific moment, close with a thought instead of a fake story. Do NOT make up "one man wrote..." or "someone in the community said..." unless the exact quote is in the data.

PREVIOUS EMAILS (do NOT repeat these angles, metaphors, themes, or subject structures):
${pastBroadcasts.length > 0 ? pastBroadcasts.map(b => `- "${b.subject}" — ${b.snippet || '(no preview)'}...`).join('\n') : '- (no previous emails found)'}
Pick a completely DIFFERENT angle, topic, metaphor, and subject line than anything above. If you notice a theme you're about to reuse (e.g. "gap", "furnace", "quiet"), STOP and find a fresh angle from the data.

${dataBlock}

Write the complete email now. Output ONLY the email with the subject line on the first line prefixed with "SUBJECT: ".`;

  const response = await anthropic.messages.create({
    model: process.env.EMAIL_AGENT_MODEL || 'claude-opus-4-7',
    max_tokens: 1000,
    messages: [{ role: 'user', content: emailPrompt }]
  });

  const raw = response.content[0].text.trim();

  // Parse subject and body
  let subject = 'Weekly Transmission';
  let body = raw;

  const subjectMatch = raw.match(/^SUBJECT:\s*(.+)/i);
  if (subjectMatch) {
    subject = subjectMatch[1].trim();
    body = raw.substring(subjectMatch[0].length).trim();
  }

  // Strip any AI tells
  body = body
    .replace(/—/g, '...')   // em dash → ellipsis
    .replace(/–/g, '...')   // en dash → ellipsis
    .replace(/;/g, '.')     // semicolons → periods

  return { subject, body };
}

// ============================================================
// KIT API — Create, schedule, cancel broadcasts
// ============================================================

// Convert plain-text body (with blank-line paragraph breaks) to HTML paragraphs.
// Kit V4 renders broadcast content as HTML, so raw newlines collapse into one paragraph.
// We wrap each paragraph in <p> tags (minimal HTML, no styling, no logos) so the email
// still reads as a personal plain-text note but renders with proper paragraph breaks.
function plainTextToHtmlParagraphs(text) {
  if (!text) return '';
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => {
      const escaped = p
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<p>${escaped.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}

async function createKitBroadcast(subject, body, tagId, sendAt) {
  if (!KIT_API_KEY) throw new Error('KIT_API_KEY not set in environment');

  // Step 1: Create the broadcast (Kit V4 uses flat fields, NOT nested under "broadcast")
  const createPayload = {
    subject,
    content: plainTextToHtmlParagraphs(body),
    description: `Email Agent — Auto-generated ${new Date().toISOString().split('T')[0]}`,
    public: false
  };

  const createRes = await fetch(`${KIT_API_BASE}/broadcasts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kit-Api-Key': KIT_API_KEY
    },
    body: JSON.stringify(createPayload)
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Kit create broadcast failed (${createRes.status}): ${errText}`);
  }

  const created = await createRes.json();
  const broadcastId = created.broadcast?.id;
  if (!broadcastId) throw new Error('Kit returned no broadcast ID');

  console.log(`[EmailAgent] Kit broadcast created: ${broadcastId}`);

  // Step 2: Update with subscriber_filter if a tag ID is provided
  if (tagId) {
    const updatePayload = {
      subscriber_filter: [
        {
          all: [
            { type: 'tag', ids: [parseInt(tagId)] }
          ]
        }
      ]
    };

    const updateRes = await fetch(`${KIT_API_BASE}/broadcasts/${broadcastId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Kit-Api-Key': KIT_API_KEY
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error(`[EmailAgent] Kit update subscriber_filter failed (${updateRes.status}): ${errText}`);
      // Non-blocking — broadcast exists, Ross can manually set recipients in Kit
    } else {
      console.log(`[EmailAgent] Kit broadcast ${broadcastId} filtered to tag ${tagId}`);
    }
  }

  return broadcastId;
}

async function deleteKitBroadcast(broadcastId) {
  if (!KIT_API_KEY) return false;

  try {
    const res = await fetch(`${KIT_API_BASE}/broadcasts/${broadcastId}`, {
      method: 'DELETE',
      headers: { 'X-Kit-Api-Key': KIT_API_KEY }
    });
    return res.ok;
  } catch (err) {
    console.error(`[EmailAgent] Delete broadcast ${broadcastId} failed:`, err.message);
    return false;
  }
}

// ============================================================
// MAIN PIPELINE — Gather intel → draft → create broadcast
// ============================================================

async function runEmailPipeline() {
  const state = await EmailAgentState.getState();
  const currentTier = state.currentTier;
  const tagId = state.tierTags[`tier${currentTier}`] || '';
  const tierLabel = TIER_LABELS[currentTier] || 'Unknown';

  console.log(`[EmailAgent] Pipeline starting — Tier ${currentTier} (${tierLabel})`);

  // 1. Gather intelligence
  const intel = await gatherIntelligence();

  // 2. Generate draft
  const { subject, body } = await generateEmailDraft(intel);

  // 3. Create broadcast in Kit (as draft — Ross sends manually or via approval)
  let kitBroadcastId = null;
  const sendAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now

  try {
    kitBroadcastId = await createKitBroadcast(subject, body, tagId, sendAt);
  } catch (err) {
    console.error('[EmailAgent] Kit broadcast creation failed:', err.message);
    // Still return the draft even if Kit fails — Ross can copy it manually
  }

  return {
    subject,
    body,
    tier: currentTier,
    tierLabel,
    mode: state.approvalMode,
    kitBroadcastId,
    sendAt: sendAt.toISOString(),
    intel: {
      topTopics: intel.trendingTopics.slice(0, 5),
      lunar: intel.lunar,
      streaks: intel.streakDistribution,
      ytCommentCount: intel.ytComments.length
    }
  };
}

// ============================================================
// EVALUATE LAST SEND — Check open rates, auto-promote tiers
// ============================================================

async function evaluateLastSend(broadcastId) {
  if (!KIT_API_KEY) return null;

  try {
    // If no broadcastId provided, we can't evaluate
    if (!broadcastId) return null;

    const res = await fetch(`${KIT_API_BASE}/broadcasts/${broadcastId}`, {
      headers: { 'X-Kit-Api-Key': KIT_API_KEY }
    });

    if (!res.ok) return null;
    const data = await res.json();
    const b = data.broadcast;
    if (!b) return null;

    const stats = b.stats || {};
    const openRate = stats.open_rate || 0;
    const clickRate = stats.click_rate || 0;
    const recipients = stats.recipients || 0;
    const unsubscribes = stats.unsubscribes || 0;

    // Update state
    const state = await EmailAgentState.getState();
    state.lastBroadcast = {
      kitBroadcastId: broadcastId,
      subject: b.subject,
      sentAt: new Date(),
      openRate,
      clickRate,
      recipientCount: recipients,
      tier: state.currentTier
    };

    // Auto-promote tier if consistently good
    if (openRate >= 0.50) {
      state.consecutiveGoodSends += 1;
    } else {
      state.consecutiveGoodSends = 0;
    }

    let tierDecision = `Staying at tier ${state.currentTier}`;

    // After 3 consecutive 50%+ sends, promote to next tier
    if (state.consecutiveGoodSends >= 3 && state.currentTier < 4) {
      const nextTier = state.currentTier + 1;
      const nextTagId = state.tierTags[`tier${nextTier}`];
      if (nextTagId || nextTier === 4) {
        state.currentTier = nextTier;
        state.consecutiveGoodSends = 0;
        tierDecision = `PROMOTED to tier ${nextTier} (${TIER_LABELS[nextTier]})`;
      } else {
        tierDecision = `Ready for tier ${nextTier} but tag not configured. Run !agent tier ${nextTier} <tag_id>`;
      }
    }

    // Demote if open rate drops below 20%
    if (openRate < 0.20 && state.currentTier > 1) {
      state.currentTier -= 1;
      state.consecutiveGoodSends = 0;
      tierDecision = `DEMOTED to tier ${state.currentTier} (open rate too low)`;
    }

    state.totalSent += 1;
    await state.save();

    return {
      openRate,
      clickRate,
      recipients,
      unsubscribes,
      tierDecision,
      newTier: state.currentTier
    };
  } catch (err) {
    console.error('[EmailAgent] Evaluate error:', err.message);
    return null;
  }
}

// ============================================================
// CANCEL — Delete a scheduled broadcast
// ============================================================

async function cancelScheduledBroadcast(broadcastId) {
  return await deleteKitBroadcast(broadcastId);
}

// ============================================================
// CONFIG SETTERS
// ============================================================

async function setTierTag(tier, tagId) {
  const state = await EmailAgentState.getState();
  state.tierTags[`tier${tier}`] = tagId;
  await state.save();
  return state;
}

async function setApprovalMode(mode) {
  const state = await EmailAgentState.getState();
  state.approvalMode = mode;
  await state.save();
  return state;
}

async function setCadence(cadence) {
  const state = await EmailAgentState.getState();
  state.cadence = cadence;
  await state.save();
  return state;
}

// ============================================================
// STATUS
// ============================================================

async function getAgentStatus() {
  const state = await EmailAgentState.getState();
  return {
    currentTier: state.currentTier,
    tierLabel: TIER_LABELS[state.currentTier],
    approvalMode: state.approvalMode,
    cadence: state.cadence,
    sendDay: state.sendDay === 0 ? 'Sunday' : state.sendDay === 5 ? 'Friday' : `Day ${state.sendDay}`,
    sendHour: `${state.sendHour}:00 ET`,
    totalSent: state.totalSent,
    consecutiveGoodSends: state.consecutiveGoodSends,
    lastSend: state.lastBroadcast ? {
      subject: state.lastBroadcast.subject,
      sentAt: state.lastBroadcast.sentAt,
      openRate: state.lastBroadcast.openRate !== null
        ? `${(state.lastBroadcast.openRate * 100).toFixed(1)}%`
        : 'pending',
      tier: state.lastBroadcast.tier,
      recipients: state.lastBroadcast.recipientCount
    } : null,
    tierTags: state.tierTags,
    warmupContext: state.warmupContext
  };
}

module.exports = {
  runEmailPipeline,
  evaluateLastSend,
  cancelScheduledBroadcast,
  setTierTag,
  setApprovalMode,
  setCadence,
  getAgentStatus,
  TIER_LABELS
};
