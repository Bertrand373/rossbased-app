// server/services/youtubeContentPipeline.js
// Analyzes YouTube comments (own channel + niche) to detect:
//   1. Repeated questions (FAQ patterns) → content ideas for Ross
//   2. Trending struggles/topics across the niche
//   3. Gaps where Ross hasn't made content yet
// Runs weekly via cron, results stored in memory + available via admin API

const Anthropic = require('@anthropic-ai/sdk');
const { getUnprocessedComments, markCommentsProcessed } = require('./youtubeComments');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const NOTE_MODEL = process.env.NOTE_MODEL || 'claude-haiku-4-5-20251001';

// Cache the latest pipeline report in memory
let cachedReport = null;
let reportTimestamp = 0;

/**
 * Run the content pipeline analysis
 * Processes unprocessed YouTube comments and generates a content report
 */
async function runContentPipeline() {
  try {
    const comments = await getUnprocessedComments(200);

    if (comments.length < 20) {
      console.log(`📊 Content pipeline: only ${comments.length} unprocessed comments, need 20+. Skipping.`);
      return { skipped: true, commentCount: comments.length };
    }

    // Separate own vs niche for the prompt
    const ownComments = comments.filter(c => c.source === 'own');
    const nicheComments = comments.filter(c => c.source === 'niche');

    // Build the comment feed for analysis
    const ownLines = ownComments.map(c =>
      `[${c.videoTitle?.substring(0, 60) || 'video'}] (${c.likeCount} likes): ${c.text.substring(0, 300)}`
    );
    const nicheLines = nicheComments.map(c =>
      `[${c.videoTitle?.substring(0, 60) || 'video'}] (${c.likeCount} likes): ${c.text.substring(0, 300)}`
    );

    const response = await anthropic.messages.create({
      model: NOTE_MODEL,
      max_tokens: 1200,
      system: `You analyze YouTube comments from a semen retention creator's channel and across the niche to generate actionable content intelligence.

Your output is a weekly content brief for the creator (Ross, @rossbased, 10K subscribers). He makes videos about semen retention, masculine transformation, spiritual development, and self-improvement.

Generate a structured JSON report with these sections:
1. "faq_patterns" — Array of 3-5 questions that appear repeatedly. Each has: "question" (the common question in natural language), "frequency" (how many comments touch this), "source" ("own"|"niche"|"both"), "video_opportunity" (brief pitch for a video answering this)
2. "trending_struggles" — Array of 2-3 struggles/pain points trending across comments. Each has: "topic", "description" (1 sentence), "severity" ("low"|"medium"|"high")
3. "content_gaps" — Array of 2-3 topics people are asking about that Ross likely hasn't covered deeply. Each has: "topic", "rationale" (why this would perform well)
4. "niche_pulse" — 2-3 sentences summarizing what the broader SR niche audience is talking about right now

Rules:
- Only report patterns you actually see in the data. Never fabricate.
- Questions that appear 3+ times across different commenters are strong FAQ signals.
- High-like comments indicate topics with broad interest.
- Respond ONLY with valid JSON. No markdown, no backticks, no preamble.`,
      messages: [{
        role: 'user',
        content: `ROSS'S CHANNEL COMMENTS (${ownComments.length} comments):
${ownLines.join('\n') || 'No own-channel comments this period.'}

NICHE-WIDE COMMENTS (${nicheComments.length} comments from other SR creators):
${nicheLines.join('\n') || 'No niche comments this period.'}

Generate the content intelligence report as JSON.`
      }]
    });

    // Parse the AI response
    let report;
    try {
      const raw = response.content[0].text.replace(/```json|```/g, '').trim();
      report = JSON.parse(raw);
    } catch (parseErr) {
      console.error('Content pipeline JSON parse error:', parseErr.message);
      report = { raw: response.content[0].text, parseError: true };
    }

    // Add metadata
    report.generatedAt = new Date().toISOString();
    report.commentsAnalyzed = {
      total: comments.length,
      own: ownComments.length,
      niche: nicheComments.length
    };

    // Cache the report
    cachedReport = report;
    reportTimestamp = Date.now();

    // Mark comments as processed
    const commentIds = comments.map(c => c._id);
    await markCommentsProcessed(commentIds);

    console.log(`📊 Content pipeline complete: ${comments.length} comments → ${report.faq_patterns?.length || 0} FAQ patterns, ${report.content_gaps?.length || 0} gaps`);

    return report;

  } catch (err) {
    console.error('Content pipeline error:', err.message);
    return { error: err.message };
  }
}

/**
 * Get the latest content pipeline report (from cache)
 */
function getLatestReport() {
  return {
    report: cachedReport,
    generatedAt: reportTimestamp ? new Date(reportTimestamp).toISOString() : null,
    age: reportTimestamp ? Math.round((Date.now() - reportTimestamp) / (1000 * 60 * 60)) + ' hours' : 'never'
  };
}

module.exports = {
  runContentPipeline,
  getLatestReport
};
