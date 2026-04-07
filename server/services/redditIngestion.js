// server/services/redditIngestion.js
// Fetches hot/top posts from r/semenretention and stores them
// Runs on a cron (every 6 hours) to keep community intelligence fresh
//
// APPROACH (updated April 2026):
// Reddit blocked new API app creation and 403s unauthenticated .json requests.
// Solution: RSS feeds for post discovery + old.reddit.com JSON for comments.
// RSS feeds are officially supported and don't require authentication.
// old.reddit.com JSON endpoints still work with a browser-like User-Agent.
//
// Flow:
// 1. Fetch hot posts from r/semenretention via RSS feed (.rss endpoint)
// 2. For each new post, fetch top 5 comments via old.reddit.com JSON
// 3. Store in RedditPost collection (skip duplicates via redditId)
// 4. Once per day, generate a Haiku summary of recent themes

const RedditPost = require('../models/RedditPost');

const SUBREDDIT = 'semenretention';
const POSTS_PER_FETCH = 25;
const COMMENTS_PER_POST = 5;

// Browser-like UA — Reddit blocks bot-style user agents on old.reddit.com
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Fetch JSON from old.reddit.com with browser-like headers
 * Used for comment fetching (RSS doesn't include comments)
 */
async function oldRedditFetch(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`old.reddit.com fetch error (${response.status}): ${text.substring(0, 200)}`);
  }

  return response.json();
}

/**
 * Parse Reddit RSS feed (Atom XML) into post objects
 * RSS feeds are officially supported and don't require auth
 */
function parseRSSPosts(xml) {
  const posts = [];

  // Extract each <entry> from the Atom feed
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    // Extract fields from each entry
    const getId = entry.match(/<id>(.*?)<\/id>/);
    const getTitle = entry.match(/<title>(.*?)<\/title>/);
    const getContent = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/);
    const getAuthor = entry.match(/<name>(.*?)<\/name>/);
    const getUpdated = entry.match(/<updated>(.*?)<\/updated>/);
    const getLink = entry.match(/<link\s+href="([^"]*?)"/);
    const getCategory = entry.match(/<category[^>]*term="([^"]*?)"/);

    if (!getId || !getTitle) continue;

    // Reddit RSS <id> is the full URL: https://www.reddit.com/r/sub/comments/abc123/title/
    // Extract the Reddit fullname (t3_abc123) from the URL
    const urlMatch = getId[1].match(/\/comments\/([a-z0-9]+)\//);
    const postId = urlMatch ? urlMatch[1] : null;
    if (!postId) continue;

    // Decode HTML entities in title and content
    const decodeHTML = (str) => {
      if (!str) return '';
      return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&nbsp;/g, ' ');
    };

    // Extract selftext from content (strip HTML tags for plain text)
    const rawContent = decodeHTML(getContent ? getContent[1] : '');
    const selftext = rawContent
      .replace(/<[^>]*>/g, ' ')   // Strip HTML tags
      .replace(/\s+/g, ' ')       // Collapse whitespace
      .trim()
      .substring(0, 3000);        // Cap length (matches original)

    // Build permalink from the URL
    const fullUrl = getId[1] || '';
    const permalink = fullUrl.replace('https://www.reddit.com', '');

    posts.push({
      redditId: `t3_${postId}`,
      title: decodeHTML(getTitle[1]),
      selftext,
      author: getAuthor ? decodeHTML(getAuthor[1]) : '[unknown]',
      permalink,
      flair: getCategory ? decodeHTML(getCategory[1]) : '',
      // RSS doesn't provide score/comments — we'll set defaults
      // and update if we successfully fetch the JSON endpoint
      score: 0,
      numComments: 0,
      upvoteRatio: 0,
      redditCreatedAt: getUpdated ? new Date(getUpdated[1]) : new Date()
    });
  }

  return posts;
}

/**
 * Fetch hot posts via RSS feed
 * Returns parsed post objects (without scores — RSS doesn't include them)
 */
async function fetchPostsViaRSS() {
  const url = `https://www.reddit.com/r/${SUBREDDIT}/hot/.rss?limit=${POSTS_PER_FETCH}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      'Accept': 'application/atom+xml, application/xml, text/xml',
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RSS fetch error (${response.status}): ${text.substring(0, 200)}`);
  }

  const xml = await response.text();
  return parseRSSPosts(xml);
}

/**
 * Try to enrich a post with score/comment data from old.reddit.com JSON
 * Non-blocking — if this fails, we still have the post from RSS
 */
async function enrichPostData(post) {
  try {
    if (!post.permalink) return post;

    const data = await oldRedditFetch(`https://old.reddit.com${post.permalink}.json?limit=1`);
    const postData = data?.[0]?.data?.children?.[0]?.data;

    if (postData) {
      post.score = postData.score || 0;
      post.numComments = postData.num_comments || 0;
      post.upvoteRatio = postData.upvote_ratio || 0;
      post.author = postData.author || post.author;
      // Check if stickied
      post._stickied = postData.stickied || false;
    }
  } catch (err) {
    // Non-fatal — we still have RSS data
    console.warn(`[Reddit] Could not enrich post ${post.redditId}: ${err.message}`);
  }

  return post;
}

/**
 * Fetch top comments for a post via old.reddit.com JSON
 */
async function fetchTopComments(permalink) {
  try {
    const data = await oldRedditFetch(`https://old.reddit.com${permalink}.json?sort=top&limit=${COMMENTS_PER_POST + 2}`);
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
    // Fetch hot posts via RSS feed (primary method — always works)
    const rssPosts = await fetchPostsViaRSS();
    console.log(`[Reddit] RSS returned ${rssPosts.length} posts`);

    if (rssPosts.length === 0) {
      console.log('[Reddit] No posts from RSS — possible feed issue');
      return { newPosts: 0, skipped: 0, errors: 0 };
    }

    let newPosts = 0;
    let skipped = 0;
    let errors = 0;

    for (const post of rssPosts) {
      // Skip if we already have this post
      const exists = await RedditPost.findOne({ redditId: post.redditId }).lean();
      if (exists) {
        skipped++;
        continue;
      }

      try {
        // Enrich with score data from old.reddit.com (non-blocking if fails)
        await enrichPostData(post);

        // Skip stickied/pinned posts (usually rules/meta)
        if (post._stickied) {
          skipped++;
          continue;
        }

        // Fetch top comments for this post
        const topComments = await fetchTopComments(post.permalink);

        await RedditPost.create({
          redditId: post.redditId,
          title: post.title,
          selftext: post.selftext,
          author: post.author,
          score: post.score,
          numComments: post.numComments,
          upvoteRatio: post.upvoteRatio,
          flair: post.flair,
          permalink: post.permalink,
          topComments,
          redditCreatedAt: post.redditCreatedAt
        });

        newPosts++;

        // 2 second delay between posts to be respectful to old.reddit.com
        await new Promise(r => setTimeout(r, 2000));
      } catch (postErr) {
        if (postErr.code === 11000) {
          skipped++; // Duplicate key — race condition, harmless
        } else {
          console.error(`[Reddit] Error storing post ${post.redditId}:`, postErr.message);
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
