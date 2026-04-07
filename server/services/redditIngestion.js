// server/services/redditIngestion.js
// Fetches hot/top posts from r/semenretention and stores them
// Runs on a cron (every 6 hours) to keep community intelligence fresh
//
// APPROACH (updated April 2026):
// Reddit blocked new API app creation and 403s bot-style requests.
// Solution: old.reddit.com JSON endpoints with browser-like headers.
// Fallback chain: old.reddit.com → www.reddit.com
//
// Flow:
// 1. Fetch hot posts from r/semenretention via old.reddit.com JSON
// 2. For each new post, fetch top 5 comments
// 3. Store in RedditPost collection (skip duplicates via redditId)
// 4. Once per day, generate a Haiku summary of recent themes

const RedditPost = require('../models/RedditPost');

const SUBREDDIT = 'semenretention';
const POSTS_PER_FETCH = 25;
const COMMENTS_PER_POST = 5;

// Browser-like headers — Reddit blocks bot-style user agents
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
};

/**
 * Try fetching JSON from multiple Reddit domains with fallbacks
 * Logs detailed info for debugging blocked requests
 */
async function redditJsonFetch(path) {
  const endpoints = [
    `https://old.reddit.com${path}`,
    `https://www.reddit.com${path}`,
  ];

  let lastError = null;

  for (const url of endpoints) {
    try {
      const response = await fetch(url, { headers: BROWSER_HEADERS, redirect: 'follow' });

      console.log(`[Reddit] ${url} → status ${response.status}, content-type: ${response.headers.get('content-type') || 'none'}`);

      if (!response.ok) {
        const text = await response.text();
        console.warn(`[Reddit] ${url} error body: ${text.substring(0, 200)}`);
        lastError = new Error(`${response.status} from ${url}`);
        continue;
      }

      const text = await response.text();

      // Check if we got HTML instead of JSON (redirect to login/blocked page)
      if (text.startsWith('<!') || text.startsWith('<html')) {
        console.warn(`[Reddit] ${url} returned HTML (likely blocked). First 150 chars: ${text.substring(0, 150)}`);
        lastError = new Error(`HTML response from ${url}`);
        continue;
      }

      // Parse JSON
      try {
        const data = JSON.parse(text);
        console.log(`[Reddit] ${url} → JSON parsed OK`);
        return data;
      } catch (parseErr) {
        console.warn(`[Reddit] ${url} JSON parse failed. First 150 chars: ${text.substring(0, 150)}`);
        lastError = new Error(`JSON parse failed from ${url}`);
        continue;
      }
    } catch (fetchErr) {
      console.warn(`[Reddit] ${url} fetch exception: ${fetchErr.message}`);
      lastError = fetchErr;
      continue;
    }
  }

  throw lastError || new Error('All Reddit endpoints failed');
}

/**
 * Fetch top comments for a post
 */
async function fetchTopComments(permalink) {
  try {
    const data = await redditJsonFetch(`${permalink}.json?sort=top&limit=${COMMENTS_PER_POST + 2}`);
    // Reddit returns [post, comments] array
    const commentListing = data[1]?.data?.children || [];

    return commentListing
      .filter(c => c.kind === 't1' && c.data.body && c.data.body !== '[deleted]')
      .slice(0, COMMENTS_PER_POST)
      .map(c => ({
        body: c.data.body.substring(0, 500), // Cap comment length
        score: c.data.score || 0,
        author: c.data.author || '[deleted]'
      }));
  } catch (err) {
    console.error(`[Reddit] Failed to fetch comments for ${permalink}:`, err.message);
    return [];
  }
}

/**
 * Main ingestion function — fetch hot posts and store new ones
 * Returns { newPosts, skipped, errors }
 */
async function ingestRedditPosts() {
  console.log('[Reddit] Starting ingestion from r/' + SUBREDDIT);

  try {
    // Fetch hot posts via JSON endpoint with fallback chain
    const listing = await redditJsonFetch(`/r/${SUBREDDIT}/hot.json?limit=${POSTS_PER_FETCH}`);
    const posts = listing.data?.children || [];

    console.log(`[Reddit] JSON returned ${posts.length} posts`);

    if (posts.length === 0) {
      console.log('[Reddit] No posts returned — endpoint may be blocked from this IP');
      return { newPosts: 0, skipped: 0, errors: 0 };
    }

    let newPosts = 0;
    let skipped = 0;
    let errors = 0;

    for (const item of posts) {
      const post = item.data;

      // Skip stickied/pinned posts (usually rules/meta)
      if (post.stickied) {
        skipped++;
        continue;
      }

      // Skip if we already have this post
      const exists = await RedditPost.findOne({ redditId: post.name }).lean();
      if (exists) {
        skipped++;
        continue;
      }

      try {
        // Fetch top comments for this post
        const topComments = await fetchTopComments(post.permalink);

        await RedditPost.create({
          redditId: post.name,
          title: post.title,
          selftext: (post.selftext || '').substring(0, 3000), // Cap post length
          author: post.author || '[deleted]',
          score: post.score || 0,
          numComments: post.num_comments || 0,
          upvoteRatio: post.upvote_ratio || 0,
          flair: post.link_flair_text || '',
          permalink: post.permalink,
          topComments,
          redditCreatedAt: post.created_utc ? new Date(post.created_utc * 1000) : new Date()
        });

        newPosts++;

        // 2 second delay between comment fetches to be respectful
        await new Promise(r => setTimeout(r, 2000));
      } catch (postErr) {
        if (postErr.code === 11000) {
          skipped++; // Duplicate key — race condition, harmless
        } else {
          console.error(`[Reddit] Error storing post ${post.name}:`, postErr.message);
          errors++;
        }
      }
    }

    console.log(`[Reddit] Ingestion complete: ${newPosts} new, ${skipped} skipped, ${errors} errors`);
    return { newPosts, skipped, errors };

  } catch (err) {
    console.error('[Reddit] Ingestion failed:', err.message);
    return { newPosts: 0, skipped: 0, errors: 1, error: err.message };
  }
}

/**
 * Generate a daily summary of Reddit themes using Haiku
 * Stored in a special RedditPost doc with redditId 'summary-YYYY-MM-DD'
 * This is what gets injected into Oracle's context
 */
async function generateRedditSummary() {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    // Get posts from the last 48 hours, sorted by engagement
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentPosts = await RedditPost.find({
      ingestedAt: { $gte: cutoff },
      redditId: { $not: /^summary-/ } // Exclude previous summaries
    })
      .sort({ score: -1 })
      .limit(20)
      .lean();

    if (recentPosts.length < 3) {
      console.log('[Reddit] Not enough recent posts for summary');
      return null;
    }

    // Build context for Haiku
    const postsContext = recentPosts.map((p, i) => {
      let entry = `${i + 1}. "${p.title}" (score: ${p.score}, comments: ${p.numComments})`;
      if (p.flair) entry += ` [${p.flair}]`;
      if (p.selftext) entry += `\n   ${p.selftext.substring(0, 300)}`;
      if (p.topComments?.length > 0) {
        entry += '\n   Top replies:';
        p.topComments.forEach(c => {
          entry += `\n   - "${c.body.substring(0, 150)}" (score: ${c.score})`;
        });
      }
      return entry;
    }).join('\n\n');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `You analyze r/semenretention posts and extract community themes for an AI guide called Oracle. Your output gets injected into Oracle's system prompt so it knows what the wider community is experiencing.

Rules:
- Identify 3-5 dominant themes/discussions happening right now
- Note any recurring struggles, breakthroughs, or questions
- Include specific day ranges or phases being discussed if mentioned
- Be concise — this is injected into a prompt, not shown to users
- Never include usernames
- Format as a compact briefing, not prose`,
      messages: [{
        role: 'user',
        content: `Here are the top recent posts from r/semenretention:\n\n${postsContext}\n\nSummarize the dominant community themes, recurring questions, and collective experiences.`
      }]
    });

    const summary = response.content[0]?.text?.trim();
    if (!summary) return null;

    // Store the summary with a date-based ID
    const today = new Date().toISOString().split('T')[0];
    const summaryId = `summary-${today}`;

    await RedditPost.findOneAndUpdate(
      { redditId: summaryId },
      {
        redditId: summaryId,
        title: `Daily Reddit Summary — ${today}`,
        selftext: summary,
        score: 0,
        numComments: recentPosts.length,
        ingestedAt: new Date()
      },
      { upsert: true, new: true }
    );

    console.log(`[Reddit] Daily summary generated (${summary.length} chars from ${recentPosts.length} posts)`);
    return summary;

  } catch (err) {
    console.error('[Reddit] Summary generation failed:', err.message);
    return null;
  }
}

module.exports = { ingestRedditPosts, generateRedditSummary };
