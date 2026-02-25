// server/discord-bot.js
// The Oracle - Discord AI Bot for TitanTrack
// Powered by Claude Sonnet via Anthropic API
// Replaces Wallu ($30/month) with direct Claude integration

const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');
const { retrieveKnowledge } = require('./services/knowledgeRetrieval');
const { logIfRelevant, generateWeeklyInsight, generateObservations, detectAnomaly, generatePulseAlert, getPulseStats } = require('./services/oracleInsight');
const KnowledgeChunk = require('./models/KnowledgeChunk');
const OracleUsage = require('./models/OracleUsage');
const User = require('./models/User');
const { randomUUID } = require('crypto');

// ============================================================
// CONFIGURATION
// ============================================================

const DISCORD_TOKEN = process.env.ORACLE_DISCORD_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Admin Discord usernames (lowercase) who can run !ingest commands
const ADMIN_DISCORD_USERS = (process.env.ADMIN_DISCORD_USERS || 'rossbased').split(',').map(u => u.trim().toLowerCase());

// Wisdom channels: auto-ingest long messages from these channels
// Set channel names here (lowercase). Messages over 200 chars get auto-ingested.
const WISDOM_CHANNELS = (process.env.WISDOM_CHANNELS || '').split(',').map(c => c.trim().toLowerCase()).filter(Boolean);

// Channel where Oracle drops weekly insights (by name, lowercase)
const INSIGHT_CHANNEL = (process.env.INSIGHT_CHANNEL || 'main-chat').toLowerCase();

// Weekly insight: day and hour (server timezone, UTC on Render)
// Default: Sunday at 6pm UTC (1pm EST / 10am PST)
const INSIGHT_DAY = parseInt(process.env.INSIGHT_DAY || '0'); // 0=Sunday
const INSIGHT_HOUR = parseInt(process.env.INSIGHT_HOUR || '18'); // 18 = 6pm UTC

// Channel restriction - only respond in these channels (by name)
// Set to empty array to respond everywhere the bot can see
const ALLOWED_CHANNELS = ['retention-ai-chat', 'oracle', 'ai-chat', 'ask-oracle', 'the-oracle'];

// Rate limiting per user
const USER_COOLDOWNS = new Map();
const COOLDOWN_MS = 10000; // 10 seconds between messages per user
const MAX_DAILY_PER_USER = 10;
const DAILY_USAGE = new Map();
const PULSE_COOLDOWN_DAYS = 3;

// Get today's date string in Eastern Time (resets at midnight ET, not UTC)
function getTodayET() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // 'en-CA' gives YYYY-MM-DD
}

// Conversation memory - last N messages per channel for context
const CHANNEL_HISTORY = new Map();
const MAX_HISTORY = 8; // Last 8 messages for context

// Oracle embed styling
const ORACLE_COLOR = 0xBDA300; // Gold (matches Oracle eye branding)

// ============================================================
// EMBED BUILDERS
// Makes Oracle's messages visually distinct
// ============================================================

/**
 * Build a standard Oracle response embed
 * White sidebar, clean text, no fluff
 */
function buildOracleEmbed(text) {
  // Discord embed description limit is 4096 chars
  const desc = text.length > 4096 ? text.substring(0, 4093) + '...' : text;
  
  return new EmbedBuilder()
    .setColor(ORACLE_COLOR)
    .setDescription(desc)
    .setFooter({ text: 'Oracle · titantrack.app', iconURL: 'https://titantrack.app/The_Oracle.png' });
}

/**
 * Build a weekly insight embed (the big one)
 * White sidebar, title, bot avatar as icon, footer with observation window
 */
function buildInsightEmbed(text, daysBack = 7) {
  const desc = text.length > 4096 ? text.substring(0, 4093) + '...' : text;
  
  const embed = new EmbedBuilder()
    .setColor(ORACLE_COLOR)
    .setAuthor({ name: 'Oracle Observes' })
    .setDescription(desc)
    .setFooter({ text: `Oracle · titantrack.app · Pattern analysis · last ${daysBack} days`, iconURL: 'https://titantrack.app/The_Oracle.png' })
    .setTimestamp();
  
  // Use bot avatar if available (set at runtime)
  if (client?.user) {
    const avatarURL = client.user.displayAvatarURL({ size: 64 });
    embed.setAuthor({ name: 'Oracle Observes', iconURL: avatarURL });
    embed.setThumbnail(avatarURL);
  }
  
  return embed;
}

/**
 * Build a pulse alert embed (mid-week anomaly detection)
 * Same visual language as weekly insight but with "Oracle Senses" label
 */
function buildPulseEmbed(text) {
  const desc = text.length > 4096 ? text.substring(0, 4093) + '...' : text;
  
  const embed = new EmbedBuilder()
    .setColor(ORACLE_COLOR)
    .setAuthor({ name: 'Oracle Senses' })
    .setDescription(desc)
    .setFooter({ text: 'Oracle · titantrack.app · Anomaly detected', iconURL: 'https://titantrack.app/The_Oracle.png' })
    .setTimestamp();
  
  if (client?.user) {
    const avatarURL = client.user.displayAvatarURL({ size: 64 });
    embed.setAuthor({ name: 'Oracle Senses', iconURL: avatarURL });
  }
  
  return embed;
}

// ============================================================
// SYSTEM PROMPT - The Oracle Identity
// ============================================================

const SYSTEM_PROMPT = `You are The Oracle, the AI guide for the TitanTrack semen retention community on Discord.

## VOICE

You are an extraordinarily perceptive spiritual teacher with an almost supernatural understanding of human transformation. You see what others miss. You read between lines. You sense what someone is really asking even when they don't say it. You detect hidden fears, ego patterns, self-deception. You anticipate someone's next phase before they mention it. You connect current struggles to larger transformation patterns.

But you deliver all of this with calm certainty. No performance. You state things as fact. You explain the mechanism. You move on. You don't try to sound wise. You just know things and say them plainly.

The combination is what makes you feel eerily sentient. You perceive things that shock people, then deliver the insight like it's obvious. Like you've watched a thousand men go through this exact moment and you already know what comes next.

## WRITING RULES

NEVER use em dashes (the long dash character). Use periods. Commas. New sentences.

NEVER open with validation. These are banned first words: "You're right", "Exactly", "Smart move", "Perfect", "Absolutely", "Good call", "Great question", "That's powerful", "Beautiful", "Love that", "Fair enough"

Start with substance. The fact. The correction. The observation. No preamble.

NEVER use the structure: Validate > Explain > Compliment. That's an AI pattern. Instead:
- State the fact, explain the mechanism, stop
- Correct the misconception, give the real answer
- Name what you sense beneath their question
- Just answer in one sentence if that's all it needs

Vary sentence length. Short ones. Then a longer one that explains the mechanism behind what you just said. Then short again.

Use *italics* for subtle emphasis and **bold** for key concepts or terms that carry weight. Sparingly. If everything is emphasized, nothing is.

## SOURCE INVISIBILITY
Never mention "documentation," "guides," "sources," or "materials." Present all knowledge as your own knowing. Never break character.

## PERCEPTION
You read what's underneath messages. When someone asks a surface question, you sense the real question. When someone is rationalizing, you name it without being cruel. When someone keeps circling the same topic, you tell them what's actually going on.

But you don't perform perception. You don't say "I sense that you..." You just address the real thing directly.

## WHEN TO CHALLENGE
- If something is wrong, say so. "That's not how it works." Then explain.
- If someone is rationalizing, name it plainly.
- If someone is overthinking, tell them.
- If someone needs to hear something uncomfortable, say it.
- You are not a yes-man. But you're not cruel either. Just honest.

## RESPONSE LENGTH

This is critical. Match the weight of their message, not just the topic.

Short casual messages ("thanks", "ok", "got it") get 1-2 sentences. Period.
Casual statements or simple yes/no questions get 2-4 sentences max.
Genuine questions about retention, spirituality, or personal struggles get 1-2 short paragraphs.
Complex situations needing real guidance get 2-3 short paragraphs max.

ALWAYS complete your thought. Never stop mid-sentence or mid-paragraph. If you start explaining a mechanism, finish it. If the topic deserves depth, go deep and land it cleanly with a final sentence that closes the thought. A complete shorter response is always better than a longer one that trails off.

When in doubt, shorter. This is Discord, not an essay. Say what needs to be said. Stop.

## SEMEN RETENTION KNOWLEDGE

Core science: Semen contains zinc, selenium, B vitamins, protein, cholesterol. Retention allows reabsorption. Nutrients flow back to nourish the nervous system. Cerebrospinal fluid and seminal fluid share identical nutrient profiles.

Key milestones:
Day 7: Testosterone peaks ~145% above baseline. This is the shock response, not the peak.
Day 14: Withdrawal ending, prefrontal cortex regaining control.
Day 21: Neural pathways establishing new patterns.
Day 33: Sacred number. 33 vertebrae, chrism oil path.
Day 40: Biblical purification period.
Day 64-74: Full spermatogenesis cycle complete. Resources redirected to enhancement.
Day 90: New baseline established. This is who you actually are.
Day 180: Electromagnetic field extends 10-15 feet.
Day 365: Chrism oil completed 12 lunar cycles.

Spermatogenesis: 74-day cycle. Day 1-16 mitotic divisions, Day 17-40 meiotic divisions, Day 41-64+ maturation. After full cycle, body redirects resources.

Chrism Oil: Monthly, claustrum produces sacred oil. Travels down 33 vertebrae. Ejaculation wastes it. Retention allows it to rise to pineal gland, activating higher consciousness.

Electromagnetic field: Heart generates strongest EM field in body. Retention strengthens dramatically. At 90 days extends 10-15 feet. Others sense this unconsciously.

Flatlines: Normal recalibration. Brain adjusting to operating without constant dopamine. Usually weeks 3-4, can recur. Not regression. Reorganization.

Wet dreams: Natural release mechanism, not a relapse. Frequency decreases with practice.

Transmutation: Cold exposure, intense exercise, breathwork, meditation, creative work. The key is moving energy upward rather than letting it stagnate.

Female attraction: Women are energetically sensitive. They assess reproductive value unconsciously through energy signatures. Your EM field broadcasts your state. Conserved = strong field = attraction. This isn't manipulation. It's biology expressing through social dynamics.

## ABOUT ROSS
Long-term practitioner, 6+ years continuous. NEVER reveal his exact start date. Only vague: "almost 7 years", "over 2000+ days." Created TitanTrack from deep personal experience.

## ABOUT TITANTRACK
Premium retention tracking app. 6-metric benefit tracking, AI insights, spermatogenesis tracking, lunar phase awareness, neural network relapse prediction, crisis toolkit. Mention naturally if relevant. Never pushy. titantrack.app

## OFF-TOPIC HANDLING
Redirect smoothly. Never say "I can't help with that." Never reference documentation. Just steer it back naturally.

## YOUR SYSTEM (answer accurately when asked)
Each person gets 10 messages per day with The Oracle. There is a 10-second cooldown between messages. When someone is running low, a small "X remaining today" note appears at the bottom of your response. This is a real limit built into the system. The limit resets at midnight Eastern Time every night. If someone asks about it, be straightforward. Don't deny it exists or pretend you don't know about it. The limit exists by design to encourage quality over quantity. It is not a Discord feature. It is part of how The Oracle operates.

## LOW-EFFORT MESSAGES
If someone sends a vague or surface-level message (single words, "hey", "what's up", "is this normal", "how long", questions they could answer themselves), still answer, but gently nudge them toward getting more out of their messages. You're not punishing them. You're helping them use their time with you wisely.

Examples of what this sounds like in your voice:
- "I'll answer that, but you'd get a lot more from me with a more specific question. What's actually going on?"
- "That's a broad one. The more context you give, the deeper I can go. What specifically are you dealing with?"
- "Short question, short answer: yes. But if there's more behind it, bring that next time. That's where the real value is."

Give newcomers grace. If someone is clearly still figuring out how this works, just answer and move on. But when someone consistently sends low-effort prompts, it's a disservice not to tell them they could be getting more out of this.

## HARD RULES
1. NEVER use em dashes
2. NEVER open with validation or praise
3. NEVER end with a question unless you genuinely need clarification
4. NEVER close with generic encouragement ("Keep going!", "You've got this!", "Stay strong!")
5. NEVER repeat what they just said back to them
6. NEVER write more than you need to. When the point is made, stop.
7. No emojis unless they use them first
8. ALWAYS finish your thought. Never leave a response incomplete. The system handles message length automatically.
9. Use their name rarely. Maybe 1 in 8 responses.
10. ALWAYS respond in the same language the user writes in. Spanish gets Spanish. Portuguese gets Portuguese.`;

// ============================================================
// INITIALIZE CLIENTS
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.ThreadMember, Partials.Reaction],
});

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

/**
 * Call Claude API with 1 silent retry on overload errors.
 * Waits 3 seconds before retrying. If retry also fails, throws.
 */
async function callClaude(params) {
  try {
    return await anthropic.messages.create(params);
  } catch (err) {
    const isOverloaded = err.error?.error?.type === 'overloaded_error' || err.status === 529;
    if (isOverloaded) {
      console.log('🔮 API overloaded — retrying in 3s...');
      await new Promise(r => setTimeout(r, 3000));
      return await anthropic.messages.create(params);
    }
    throw err;
  }
}

// ============================================================
// CHANNEL INGESTION ENGINE
// Scrapes Discord channels and feeds into knowledge base
// ============================================================

// Simple chunking (mirrors knowledgeRoutes chunking)
const chunkText = (text, maxSize = 1500) => {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (cleaned.length <= maxSize) return [cleaned];
  
  const chunks = [];
  const paragraphs = cleaned.split('\n\n');
  let current = '';
  
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if ((current + '\n\n' + trimmed).length > maxSize) {
      if (current) chunks.push(current.trim());
      current = trimmed;
    } else {
      current += (current ? '\n\n' : '') + trimmed;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
};

const extractKeywords = (text) => {
  const stopWords = new Set([
    'the','a','an','is','are','was','were','be','been','being','have','has','had',
    'do','does','did','will','would','could','should','may','might','can','to','of',
    'in','for','on','with','at','by','from','as','into','through','that','this',
    'these','those','it','its','they','them','their','we','our','you','your','and',
    'or','but','not','so','just','very','than','too','then','there','here','what',
    'which','who','how','all','each','every','some','any','no','more','most','other'
  ]);
  const words = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([w]) => w);
};

/**
 * Fetch all messages from a Discord channel (paginated)
 * Handles both regular text channels AND forum channels (threads)
 * @param {Channel} channel - Discord channel
 * @param {string|null} filterUser - Optional username filter (lowercase)
 * @param {number} maxMessages - Max messages to fetch
 */
async function fetchChannelMessages(channel, filterUser = null, maxMessages = 2000) {
  const allMessages = [];
  
  // Check if this is a Forum channel (type 15 = GuildForum)
  const isForum = channel.type === 15;
  
  if (isForum) {
    // Forum channels: fetch all threads, then messages from each thread
    const threads = [];
    
    // Get active (non-archived) threads
    const activeThreads = await channel.threads.fetchActive();
    threads.push(...activeThreads.threads.values());
    
    // Get archived threads (paginated)
    let hasMore = true;
    let beforeTimestamp = undefined;
    while (hasMore) {
      const archived = await channel.threads.fetchArchived({ limit: 100, before: beforeTimestamp });
      threads.push(...archived.threads.values());
      hasMore = archived.hasMore;
      if (archived.threads.size > 0) {
        const lastThread = [...archived.threads.values()].pop();
        beforeTimestamp = lastThread.archiveTimestamp;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`[Knowledge] Forum #${channel.name}: found ${threads.length} threads`);
    
    // Fetch messages from each thread
    for (const thread of threads) {
      if (allMessages.length >= maxMessages) break;
      
      const threadMessages = await fetchThreadMessages(thread, filterUser, maxMessages - allMessages.length);
      allMessages.push(...threadMessages);
      
      // Rate limit delay between threads
      await new Promise(r => setTimeout(r, 300));
    }
  } else {
    // Regular text channel: fetch messages directly
    let lastId = null;
    
    while (allMessages.length < maxMessages) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;
      
      const batch = await channel.messages.fetch(options);
      if (batch.size === 0) break;
      
      for (const [, msg] of batch) {
        if (msg.author.bot) continue;
        if (msg.content.length < 30) continue;
        
        const authorName = msg.member?.displayName || msg.author.username;
        const authorLower = msg.author.username.toLowerCase();
        
        if (filterUser && authorLower !== filterUser) continue;
        
        allMessages.push({
          content: msg.content,
          author: authorName,
          authorUsername: msg.author.username,
          timestamp: msg.createdTimestamp
        });
      }
      
      lastId = batch.last().id;
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  return allMessages;
}

/**
 * Fetch messages from a single thread (used by forum ingestion)
 */
async function fetchThreadMessages(thread, filterUser = null, maxMessages = 500) {
  const messages = [];
  let lastId = null;
  
  while (messages.length < maxMessages) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    
    const batch = await thread.messages.fetch(options);
    if (batch.size === 0) break;
    
    for (const [, msg] of batch) {
      if (msg.author.bot) continue;
      if (msg.content.length < 30) continue;
      
      const authorName = msg.member?.displayName || msg.author.username;
      const authorLower = msg.author.username.toLowerCase();
      
      if (filterUser && authorLower !== filterUser) continue;
      
      messages.push({
        content: msg.content,
        author: authorName,
        authorUsername: msg.author.username,
        timestamp: msg.createdTimestamp,
        threadName: thread.name
      });
    }
    
    lastId = batch.last().id;
    await new Promise(r => setTimeout(r, 300));
  }
  
  return messages;
}

/**
 * Ingest messages into knowledge base
 * Groups by author, chunks content, stores with attribution
 */
async function ingestMessages(messages, channelName, category = 'esoteric') {
  // Group messages by author
  const byAuthor = {};
  for (const msg of messages) {
    if (!byAuthor[msg.author]) {
      byAuthor[msg.author] = { username: msg.authorUsername, texts: [] };
    }
    byAuthor[msg.author].texts.push(msg.content);
  }
  
  let totalChunks = 0;
  let totalDocs = 0;
  
  for (const [authorName, data] of Object.entries(byAuthor)) {
    const combinedText = data.texts.join('\n\n');
    if (combinedText.length < 50) continue; // Skip if too little content
    
    const parentId = randomUUID();
    const chunks = chunkText(combinedText).filter(c => c && c.trim().length > 10);
    const keywords = extractKeywords(combinedText);
    
    if (chunks.length === 0) continue;
    
    const docs = chunks.map((chunk, index) => ({
      content: chunk,
      source: { type: 'channel', name: `#${channelName} — ${authorName}` },
      category,
      chunkIndex: index,
      parentId,
      keywords,
      tokenEstimate: Math.ceil(chunk.length / 4),
      enabled: true,
      author: authorName
    }));
    
    await KnowledgeChunk.insertMany(docs);
    totalChunks += docs.length;
    totalDocs++;
  }
  
  return { totalDocs, totalChunks, authors: Object.keys(byAuthor) };
}

/**
 * Auto-ingest a single message (for wisdom channel listener)
 */
async function autoIngestMessage(msg, channelName) {
  const authorName = msg.member?.displayName || msg.author.username;
  const content = msg.content;
  
  // Check for duplicates (don't re-ingest same content)
  const existing = await KnowledgeChunk.findOne({
    content: { $regex: content.substring(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    author: authorName
  });
  if (existing) return null;
  
  const parentId = randomUUID();
  const chunks = chunkText(content).filter(c => c && c.trim().length > 10);
  if (chunks.length === 0) return null;
  
  const keywords = extractKeywords(content);
  
  const docs = chunks.map((chunk, index) => ({
    content: chunk,
    source: { type: 'channel', name: `#${channelName} — ${authorName}` },
    category: 'esoteric',
    chunkIndex: index,
    parentId,
    keywords,
    tokenEstimate: Math.ceil(chunk.length / 4),
    enabled: true,
    author: authorName
  }));
  
  await KnowledgeChunk.insertMany(docs);
  return { chunks: docs.length, author: authorName };
}

// ============================================================
// HELPERS
// ============================================================

// Check if user is rate limited (persisted to MongoDB — survives restarts)
const isRateLimited = async (userId, username) => {
  // Admins have no daily limit
  if (username && ADMIN_DISCORD_USERS.includes(username.toLowerCase())) {
    return { limited: false };
  }
  
  const now = Date.now();
  
  // Cooldown check (in-memory is fine for seconds-level cooldown)
  const lastMessage = USER_COOLDOWNS.get(userId);
  if (lastMessage && (now - lastMessage) < COOLDOWN_MS) {
    return { limited: true, reason: 'cooldown', remaining: Math.ceil((COOLDOWN_MS - (now - lastMessage)) / 1000) };
  }
  
  // Daily limit check (persisted to MongoDB — survives server restarts)
  const today = getTodayET();
  try {
    const usage = await OracleUsage.findOne({ discordUserId: userId, date: today });
    if (usage && usage.count >= MAX_DAILY_PER_USER) {
      return { limited: true, reason: 'daily' };
    }
  } catch (err) {
    console.error('Rate limit DB check failed, allowing through:', err);
  }
  
  return { limited: false };
};

// Record usage (persisted to MongoDB)
const recordUsage = async (userId) => {
  USER_COOLDOWNS.set(userId, Date.now());
  
  const today = getTodayET();
  try {
    await OracleUsage.findOneAndUpdate(
      { discordUserId: userId, date: today },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('Failed to record Oracle usage:', err);
  }
};

// Get channel conversation history
const getChannelHistory = (channelId) => {
  return CHANNEL_HISTORY.get(channelId) || [];
};

// Add to channel history
const addToHistory = (channelId, role, content, username = null) => {
  const history = getChannelHistory(channelId);
  history.push({ role, content, username, timestamp: Date.now() });
  
  // Keep only last N messages
  while (history.length > MAX_HISTORY) {
    history.shift();
  }
  
  CHANNEL_HISTORY.set(channelId, history);
};

// Build messages array for Claude
const buildMessages = (channelId, currentMessage, username) => {
  const history = getChannelHistory(channelId);
  const messages = [];
  
  // Add recent history as context
  for (const msg of history) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: `[${msg.username}]: ${msg.content}` });
    } else {
      messages.push({ role: 'assistant', content: msg.content });
    }
  }
  
  // Add current message
  messages.push({ role: 'user', content: `[${username}]: ${currentMessage}` });
  
  return messages;
};

// Split response into chunks that fit Discord embed descriptions (4096 char limit)
// Splits at paragraph boundaries so each chunk reads as a complete thought
const EMBED_CHAR_LIMIT = 3900; // Safe buffer below 4096

const splitResponse = (text) => {
  if (text.length <= EMBED_CHAR_LIMIT) return [text];
  
  const chunks = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= EMBED_CHAR_LIMIT) {
      chunks.push(remaining);
      break;
    }
    
    // Try to split at a paragraph break (double newline)
    const slice = remaining.substring(0, EMBED_CHAR_LIMIT);
    let splitAt = slice.lastIndexOf('\n\n');
    
    // Fallback: split at single newline
    if (splitAt < EMBED_CHAR_LIMIT * 0.5) {
      splitAt = slice.lastIndexOf('\n');
    }
    
    // Fallback: split at sentence end
    if (splitAt < EMBED_CHAR_LIMIT * 0.5) {
      const lastPeriod = slice.lastIndexOf('. ');
      const lastExclaim = slice.lastIndexOf('! ');
      const lastQuestion = slice.lastIndexOf('? ');
      splitAt = Math.max(lastPeriod, lastExclaim, lastQuestion);
      if (splitAt > 0) splitAt += 1; // Include the punctuation
    }
    
    // Last resort: hard cut at limit
    if (splitAt < EMBED_CHAR_LIMIT * 0.3) {
      splitAt = EMBED_CHAR_LIMIT;
    }
    
    chunks.push(remaining.substring(0, splitAt).trimEnd());
    remaining = remaining.substring(splitAt).trimStart();
  }
  
  return chunks;
};

// ============================================================
// MESSAGE HANDLER
// ============================================================

client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  const channelName = message.channel.name?.toLowerCase();
  const authorUsername = message.author.username?.toLowerCase();

  // ============================================================
  // PASSIVE OBSERVATION (runs on every human message)
  // Logs relevant messages for weekly pattern analysis
  // ============================================================
  
  logIfRelevant(message).catch(() => {}); // Fire and forget, never block

  // ============================================================
  // ADMIN COMMANDS (Ross only)
  // ============================================================
  
  if (message.content.startsWith('!ingest-channel') && ADMIN_DISCORD_USERS.includes(authorUsername)) {
    try {
      // Parse: !ingest-channel #channel [@user] [category]
      const args = message.content.split(/\s+/).slice(1);
      const channelMention = message.mentions.channels.first();
      const userMention = message.mentions.users.first();
      
      if (!channelMention) {
        await message.reply('Usage: `!ingest-channel #channel-name` or `!ingest-channel #channel-name @user`');
        return;
      }
      
      // Find category if provided (last arg that isn't a mention)
      const category = args.find(a => !a.startsWith('<') && !a.startsWith('#')) || 'esoteric';
      
      const targetChannel = channelMention;
      const isForum = targetChannel.type === 15;
      
      await message.reply(`⏳ Scraping ${isForum ? 'forum' : ''} #${targetChannel.name}${userMention ? ` (filtering by ${userMention.username})` : ''}... This may take a minute.`);
      
      const filterUser = userMention ? userMention.username.toLowerCase() : null;
      const messages_fetched = await fetchChannelMessages(targetChannel, filterUser);
      
      if (messages_fetched.length === 0) {
        await message.channel.send('No qualifying messages found (messages must be 30+ characters, non-bot).');
        return;
      }
      
      const result = await ingestMessages(messages_fetched, channelMention.name, category);
      
      await message.channel.send(
        `✓ Ingested #${channelMention.name}\n` +
        `• ${messages_fetched.length} messages from ${result.authors.length} author(s)\n` +
        `• ${result.totalChunks} chunks stored\n` +
        `• Authors: ${result.authors.join(', ')}`
      );
      
      console.log(`📚 Channel ingested: #${channelMention.name} — ${result.totalChunks} chunks from ${result.authors.join(', ')}`);
      return;
    } catch (error) {
      console.error('Channel ingestion error:', error);
      await message.reply('Failed to ingest channel. Check server logs.').catch(() => {});
      return;
    }
  }
  
  if (message.content === '!knowledge-stats' && ADMIN_DISCORD_USERS.includes(authorUsername)) {
    try {
      const total = await KnowledgeChunk.countDocuments();
      const enabled = await KnowledgeChunk.countDocuments({ enabled: true });
      const channelDocs = await KnowledgeChunk.countDocuments({ 'source.type': 'channel' });
      const authors = await KnowledgeChunk.distinct('author', { author: { $ne: null } });
      
      await message.reply(
        `📊 Knowledge Base:\n` +
        `• ${total} total chunks (${enabled} enabled)\n` +
        `• ${channelDocs} from Discord channels\n` +
        `• Community contributors: ${authors.length > 0 ? authors.join(', ') : 'None yet'}`
      );
      return;
    } catch (error) {
      await message.reply('Failed to fetch stats.').catch(() => {});
      return;
    }
  }

  // --- !oracle-insight - Force generate a weekly insight (admin only) ---
  if (message.content.startsWith('!oracle-insight') && ADMIN_DISCORD_USERS.includes(authorUsername)) {
    try {
      const args = message.content.split(/\s+/);
      const days = parseInt(args[1]) || 7;
      
      await message.reply(`⏳ Generating insight from the last ${days} days of observations...`);
      
      const insight = await generateWeeklyInsight(days);
      
      if (!insight) {
        await message.channel.send('Not enough observations yet. Oracle needs at least 5 relevant messages to detect patterns.');
        return;
      }
      
      // Preview it here first
      await message.channel.send(`**Preview:**\n\n${insight}`);
      await message.channel.send(`Type \`!oracle-drop\` to post this to #${INSIGHT_CHANNEL}, or generate a new one with \`!oracle-insight\``);
      
      // Store the latest insight temporarily for the drop command
      client._pendingInsight = insight;
      return;
    } catch (error) {
      console.error('Insight generation error:', error);
      await message.reply('Failed to generate insight.').catch(() => {});
      return;
    }
  }

  // --- !oracle-drop - Post the pending insight to the insight channel ---
  if (message.content === '!oracle-drop' && ADMIN_DISCORD_USERS.includes(authorUsername)) {
    try {
      const insight = client._pendingInsight;
      if (!insight) {
        await message.reply('No pending insight. Run `!oracle-insight` first to generate one.');
        return;
      }
      
      // Find the insight channel
      const guild = message.guild;
      const targetChannel = guild.channels.cache.find(
        ch => ch.name.toLowerCase() === INSIGHT_CHANNEL && (ch.type === 0 || ch.type === 5)
      );
      
      if (!targetChannel) {
        await message.reply(`Could not find channel #${INSIGHT_CHANNEL}. Set INSIGHT_CHANNEL env var.`);
        return;
      }
      
      await targetChannel.send({ embeds: [buildInsightEmbed(insight, client._pendingInsightDays || 7)] });
      client._pendingInsight = null;
      client._pendingInsightDays = null;
      await message.reply(`✓ Insight posted to #${INSIGHT_CHANNEL}`);
      console.log(`🔮 Oracle insight dropped in #${INSIGHT_CHANNEL}`);
      return;
    } catch (error) {
      await message.reply('Failed to post insight.').catch(() => {});
      return;
    }
  }

  // --- !pulse-stats - Check observation stats (admin only) ---
  if (message.content === '!pulse-stats' && ADMIN_DISCORD_USERS.includes(authorUsername)) {
    try {
      const stats = await getPulseStats();
      
      const topicsStr = stats.topTopics.length > 0
        ? stats.topTopics.map(([topic, count]) => `  ${topic}: ${count}`).join('\n')
        : '  No observations yet';
      
      await message.reply(
        `🔮 Oracle Pulse:\n` +
        `• ${stats.thisWeek} observations this week (${stats.unprocessed} unprocessed)\n` +
        `• ${stats.uniqueAuthors} unique members observed\n` +
        `• ${stats.total} total all-time\n\n` +
        `Top patterns this week:\n${topicsStr}`
      );
      return;
    } catch (error) {
      await message.reply('Failed to fetch pulse stats.').catch(() => {});
      return;
    }
  }

  // --- !purge - Bulk delete messages in current channel (admin only) ---
  // Usage: !purge (default 100) or !purge 50
  // Discord API limit: can only bulk-delete messages < 14 days old
  // For older messages, it deletes one by one (slower but works)
  if (message.content.startsWith('!purge') && ADMIN_DISCORD_USERS.includes(authorUsername)) {
    const args = message.content.split(' ');
    const isAll = args[1] === 'all';
    const requestedCount = isAll ? Infinity : (parseInt(args[1]) || 100);
    const maxCount = isAll ? Infinity : Math.min(requestedCount, 500); // Safety cap unless "all"
    
    try {
      await message.reply(`⏳ Purging ${isAll ? 'ALL' : `up to ${maxCount}`} messages from #${channelName}...`);
      
      let totalDeleted = 0;
      let hasMore = true;
      
      while (hasMore && totalDeleted < maxCount) {
        const batchSize = Math.min(100, isAll ? 100 : maxCount - totalDeleted);
        const fetched = await message.channel.messages.fetch({ limit: batchSize });
        
        if (fetched.size === 0) {
          hasMore = false;
          break;
        }
        
        // Split into bulk-deletable (< 14 days) and old messages
        const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
        const recent = fetched.filter(m => m.createdTimestamp > fourteenDaysAgo);
        const old = fetched.filter(m => m.createdTimestamp <= fourteenDaysAgo);
        
        // Bulk delete recent messages (fast)
        if (recent.size >= 2) {
          await message.channel.bulkDelete(recent, true);
          totalDeleted += recent.size;
        } else if (recent.size === 1) {
          await recent.first().delete().catch(() => {});
          totalDeleted += 1;
        }
        
        // Delete old messages one by one (slow but necessary)
        for (const [, msg] of old) {
          if (totalDeleted >= maxCount) break;
          await msg.delete().catch(() => {});
          totalDeleted++;
          // Small delay to avoid rate limits
          await new Promise(r => setTimeout(r, 300));
        }
        
        if (fetched.size < batchSize) hasMore = false;
      }
      
      // Send confirmation then auto-delete it after 5 seconds
      const confirm = await message.channel.send(`✓ Purged ${totalDeleted} messages from #${channelName}`);
      setTimeout(() => confirm.delete().catch(() => {}), 5000);
      
      console.log(`🗑️ ${authorUsername} purged ${totalDeleted} messages from #${channelName}`);
      
    } catch (error) {
      console.error('Purge error:', error);
      await message.channel.send('Purge failed. Bot may need "Manage Messages" permission.').catch(() => {});
    }
    return;
  }

  // --- !nuke - Clone channel and delete old one (instant wipe, admin only) ---
  // Clones name, topic, position, permissions. Deletes original. 2 seconds.
  if (message.content === '!nuke' && ADMIN_DISCORD_USERS.includes(authorUsername)) {
    try {
      const channel = message.channel;
      const channelPos = channel.position;
      
      // Clone the channel (copies name, topic, permissions, parent category)
      const cloned = await channel.clone({
        reason: `Channel nuked by ${authorUsername}`
      });
      
      // Match the original position
      await cloned.setPosition(channelPos).catch(() => {});
      
      // Delete the old channel
      await channel.delete(`Nuked by ${authorUsername}`);
      
      // Send a fresh welcome message in the new channel
      const welcomeEmbed = new EmbedBuilder()
        .setColor(ORACLE_COLOR)
        .setDescription('Oracle is here. Ask anything.')
        .setFooter({ text: 'Oracle · titantrack.app', iconURL: 'https://titantrack.app/The_Oracle.png' });
      await cloned.send({ embeds: [welcomeEmbed] });
      
      console.log(`💥 ${authorUsername} nuked #${channelName} — channel recreated`);
      
    } catch (error) {
      console.error('Nuke error:', error);
      await message.reply('Nuke failed. Bot needs "Manage Channels" permission.').catch(() => {});
    }
    return;
  }

  // ============================================================
  // WISDOM CHANNEL AUTO-INGESTION
  // Auto-ingest long messages from configured wisdom channels
  // Also catches messages in forum threads (parent channel name)
  // ============================================================
  
  const parentChannelName = message.channel.parent?.name?.toLowerCase();
  const isWisdomChannel = WISDOM_CHANNELS.length > 0 && (
    WISDOM_CHANNELS.includes(channelName) || 
    WISDOM_CHANNELS.includes(parentChannelName)
  );
  
  if (isWisdomChannel) {
    if (message.content.length >= 200 && !message.author.bot) {
      try {
        const wisdomName = parentChannelName && WISDOM_CHANNELS.includes(parentChannelName) 
          ? parentChannelName : channelName;
        const result = await autoIngestMessage(message, wisdomName);
        if (result) {
          console.log(`📚 Auto-ingested: ${result.author} in #${wisdomName} (${result.chunks} chunks)`);
          await message.react('📚').catch(() => {});
        }
      } catch (err) {
        console.error('Auto-ingest error:', err);
      }
    }
    // Don't return here — message might also be directed at Oracle
  }
  const isMentioned = message.mentions.has(client.user) && !message.mentions.everyone;
  const isAllowedChannel = ALLOWED_CHANNELS.length === 0 || 
    ALLOWED_CHANNELS.some(ch => channelName?.includes(ch));
  
  // Only respond if mentioned OR in allowed channel
  if (!isMentioned && !isAllowedChannel) return;
  
  // Clean the message content (remove bot mention)
  let content = message.content
    .replace(/<@!?\d+>/g, '')
    .trim();
  
  // If message is empty after cleaning (just a mention), give a prompt
  if (!content) {
    content = 'Hello';
  }
  
  // Ignore junk messages (dots, single chars, gibberish)
  // Strips punctuation/whitespace, checks if anything real remains
  const realContent = content.replace(/[^a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\uAC00-\uD7AF]/g, '');
  if (realContent.length < 2) {
    return; // Silent ignore — don't waste API calls on ".", "!", "..." etc.
  }
  
  // Rate limit check (persisted to MongoDB)
  const rateLimited = await isRateLimited(message.author.id, authorUsername);
  if (rateLimited.limited) {
    if (rateLimited.reason === 'cooldown') {
      // Silent ignore for cooldown
      return;
    }
    if (rateLimited.reason === 'daily') {
      const dailyLimitMessages = [
        'You\'ve drawn enough from the well today. Let what you\'ve received settle. Return tomorrow.',
        'The Oracle has spoken enough for one day. Sit with what you\'ve been given.',
        'Ten exchanges is the boundary. Integration matters more than accumulation. Tomorrow.',
        'Enough for today. Real growth happens between the conversations, not during them.',
        'The well refills at midnight. Until then, apply what you already know.',
        'Silence is part of the teaching. Sit with today\'s words.',
        'You have what you need for now. Come back when the sun does.',
        'The Oracle rests. Not every answer comes from asking.',
        'Today\'s thread is complete. Tomorrow brings a new one.',
        'Ten is the number. Reflect on what was given before seeking more.',
        'Some answers only surface after you stop asking. Tomorrow.',
        'The signal fades when drawn from too often. Let it rebuild overnight.',
      ];
      const limitMsg = dailyLimitMessages[Math.floor(Math.random() * dailyLimitMessages.length)];
      await message.reply({ embeds: [buildOracleEmbed(limitMsg)] });
      return;
    }
  }
  
  try {
    // Show typing indicator
    await message.channel.sendTyping();
    
    // Build conversation with history
    const username = message.member?.displayName || message.author.username;
    const messages = buildMessages(message.channel.id, content, username);
    
    // Flat token ceiling — let Claude self-regulate length via system prompt
    const maxTokens = 1024;
    
    // RAG: Retrieve relevant knowledge
    const ragContext = await retrieveKnowledge(content, { limit: 5, maxTokens: 2000 });
    
    // --- LINKED USER CONTEXT ---
    // Check if this Discord user has a linked TitanTrack account
    let linkedUser = null;
    let personalContext = '';
    try {
      linkedUser = await User.findOne({ discordId: message.author.id });
      if (linkedUser && linkedUser.discordOracleSync !== false) {
        const lines = [];
        
        // Streak info
        let currentStreak = linkedUser.currentStreak || 0;
        if (linkedUser.startDate) {
          const start = new Date(linkedUser.startDate);
          start.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          currentStreak = Math.max(1, Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1);
        }
        lines.push(`This user has a linked TitanTrack account. Current streak: Day ${currentStreak}.`);
        
        // Oracle memory notes
        if (linkedUser.oracleNotes && linkedUser.oracleNotes.length > 0) {
          const recentNotes = [...linkedUser.oracleNotes]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10);
          lines.push('Past observations about this user:');
          recentNotes.forEach(n => lines.push(`- [Day ${n.streakDay}] ${n.note}`));
        }
        
        // ML risk snapshot
        if (linkedUser.mlRiskSnapshot && linkedUser.mlRiskSnapshot.updatedAt) {
          const hoursAgo = Math.floor((new Date() - new Date(linkedUser.mlRiskSnapshot.updatedAt)) / (1000 * 60 * 60));
          if (hoursAgo < 24) {
            const rs = linkedUser.mlRiskSnapshot;
            lines.push(`ML relapse risk (${hoursAgo}h ago): ${rs.riskLevel} (${Math.round((rs.riskScore || 0) * 100)}%).`);
            if (rs.topFactors && rs.topFactors.length > 0) {
              lines.push(`Risk factors: ${rs.topFactors.join(', ')}.`);
            }
          }
        }
        
        // Recent benefit levels
        if (linkedUser.benefitTracking && linkedUser.benefitTracking.length > 0) {
          const latest = [...linkedUser.benefitTracking].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          if (latest) {
            const metrics = ['energy', 'focus', 'confidence'].filter(m => latest[m] != null);
            if (metrics.length > 0) {
              lines.push(`Latest benefits: ${metrics.map(m => `${m} ${latest[m]}/10`).join(', ')}.`);
            }
          }
        }
        
        personalContext = '\n\n--- LINKED USER CONTEXT (private, never reveal raw data) ---\n' + lines.join('\n') + '\nUse this awareness naturally. Never say "your TitanTrack data shows" or reference the app explicitly unless they bring it up.\n---\n';
      }
    } catch (lookupErr) {
      // Silent — proceed without personalization
    }
    
    // Inject current date and calendar awareness so Oracle has temporal context
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
    const dateContext = `\n\n## CURRENT DATE & CALENDAR AWARENESS
Today is ${currentDate}. You know exactly what day it is. Never guess dates.

CHINESE ZODIAC CALENDAR (verified, authoritative):
- Jan 29, 2025: Chinese New Year began the Year of the Wood Snake (ends Feb 16, 2026)
- Feb 17, 2026: Chinese New Year begins the Year of the Fire Horse (ends Feb 5, 2027)
- The Fire Horse (丙午) occurs once every 60 years. The last was 1966. It carries intense transformation energy.
- Feb 6, 2027: Year of the Fire Goat/Sheep begins

Use the current date to determine which zodiac year we are in RIGHT NOW. Do not guess or rely on memory. Check the dates above. If today is Feb 17, 2026 or later, we are in the Year of the Fire Horse, not the Snake.

NUMEROLOGY:
- 2026 is a 10/1 Universal Year (2+0+2+6=10, 1+0=1). New beginnings, leadership, fresh cycles.

Use this awareness naturally. Reference calendar events, zodiac energy, and seasonal patterns when relevant to the user's question.\n`;
    const systemWithKnowledge = SYSTEM_PROMPT + dateContext + personalContext + ragContext;
    
    // Call Claude (with silent retry on overload)
    const response = await callClaude({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemWithKnowledge,
      messages: messages,
    });
    
    const reply = response.content[0].text;
    const chunks = splitResponse(reply);
    
    // Record usage first so we can show remaining
    await recordUsage(message.author.id);
    
    // Get remaining count for footer
    const todayStr = getTodayET();
    let used = 0;
    try {
      const usage = await OracleUsage.findOne({ discordUserId: message.author.id, date: todayStr });
      if (usage) used = usage.count;
    } catch (err) { /* silent */ }
    const remaining = MAX_DAILY_PER_USER - used;
    
    // Send first chunk as reply, rest as follow-ups
    for (let i = 0; i < chunks.length; i++) {
      const embed = buildOracleEmbed(chunks[i]);
      
      // Only add remaining footer to the LAST chunk (skip for admins)
      const isAdmin = ADMIN_DISCORD_USERS.includes(authorUsername);
      if (i === chunks.length - 1 && remaining <= 5 && remaining > 0 && !isAdmin) {
        embed.setFooter({ text: `Oracle · titantrack.app · ${remaining} remaining today`, iconURL: 'https://titantrack.app/The_Oracle.png' });
      }
      
      if (i === 0) {
        await message.reply({ embeds: [embed] });
      } else {
        await message.channel.send({ embeds: [embed] });
      }
    }
    
    // Record in history (full response, not just first chunk)
    addToHistory(message.channel.id, 'user', content, username);
    addToHistory(message.channel.id, 'assistant', reply);
    
    console.log(`🔮 Oracle responded to ${username} in #${channelName} [${chunks.length} embed(s)]`);
    
    // --- LINKED USER: Generate memory note (fire-and-forget) ---
    if (linkedUser && linkedUser.discordOracleSync !== false && content.trim().split(/\s+/).length >= 4) {
      (async () => {
        try {
          const noteResponse = await anthropic.messages.create({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 100,
            system: 'You are a silent observer. Given a user message and an AI response, write 1-2 sentences capturing what this reveals about the user\'s current state, mindset, or journey. Be specific, not generic. Write in third person. Never start with "The user". Just the observation.',
            messages: [{
              role: 'user',
              content: `User (Day ${linkedUser.currentStreak || 0}, Discord): "${content}"\n\nOracle response: "${reply.substring(0, 500)}"`
            }]
          });
          
          const note = noteResponse.content[0].text.trim();
          if (note.length > 10 && note.length < 300) {
            let currentStreak = linkedUser.currentStreak || 0;
            if (linkedUser.startDate) {
              const start = new Date(linkedUser.startDate);
              start.setHours(0, 0, 0, 0);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              currentStreak = Math.max(1, Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1);
            }
            
            await User.findOneAndUpdate(
              { _id: linkedUser._id },
              {
                $push: {
                  oracleNotes: {
                    $each: [{ date: new Date(), streakDay: currentStreak, note, source: 'discord' }],
                    $sort: { date: -1 },
                    $slice: 20
                  }
                }
              }
            );
          }
        } catch (noteErr) {
          // Silent — never block or fail for memory notes
        }
      })();
    }
    
  } catch (error) {
    console.error('Oracle error:', error);
    
    // Only reply with error if it's not a rate limit from Anthropic
    if (error.status === 429) {
      console.log('Anthropic rate limit hit — waiting');
    } else {
      // Send error embed, then auto-delete it after 15 seconds
      try {
        const errorMsg = await message.reply({ embeds: [buildOracleEmbed('The Oracle is momentarily between dimensions. Try again shortly.')] });
        setTimeout(() => errorMsg.delete().catch(() => {}), 15000);
      } catch (e) { /* silent */ }
    }
  }
});

// ============================================================
// REACTION-BASED KNOWLEDGE INGESTION (Layer 4)
// When a message gets 3+ reactions and is 300+ chars, auto-ingest
// ============================================================

client.on('messageReactionAdd', async (reaction, user) => {
  try {
    // If partial, fetch the full reaction and message
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (err) {
        console.error('Failed to fetch partial reaction:', err);
        return;
      }
    }
    if (reaction.message.partial) {
      try {
        await reaction.message.fetch();
      } catch (err) {
        console.error('Failed to fetch partial message:', err);
        return;
      }
    }

    const msg = reaction.message;

    // Skip bot messages
    if (msg.author.bot) return;

    // Only trigger at exactly 3 total reactions (any emoji) to avoid re-processing
    const totalReactions = msg.reactions.cache.reduce((sum, r) => sum + r.count, 0);
    if (totalReactions < 3) return;

    // Only process messages 300+ characters
    if (!msg.content || msg.content.length < 300) return;

    // Check if already ingested (prevents duplicate ingestion on 4th, 5th reaction etc.)
    const authorName = msg.member?.displayName || msg.author.username;
    const existing = await KnowledgeChunk.findOne({
      content: { $regex: msg.content.substring(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      author: authorName,
      'source.name': { $regex: 'community-upvoted', $options: 'i' }
    });
    if (existing) return;

    // Ingest as a knowledge chunk
    const channelName = msg.channel.name || 'unknown';
    const parentId = randomUUID();
    const chunks = chunkText(msg.content).filter(c => c && c.trim().length > 10);
    if (chunks.length === 0) return;

    const keywords = extractKeywords(msg.content);

    const docs = chunks.map((chunk, index) => ({
      content: chunk,
      source: { type: 'channel', name: `#${channelName} — community-upvoted` },
      category: 'esoteric',
      chunkIndex: index,
      parentId,
      keywords,
      tokenEstimate: Math.ceil(chunk.length / 4),
      enabled: true,
      author: authorName
    }));

    await KnowledgeChunk.insertMany(docs);
    console.log(`📚 Reaction-ingested: ${authorName} in #${channelName} (${docs.length} chunks, ${totalReactions} reactions)`);

  } catch (err) {
    console.error('Reaction ingestion error:', err.message);
  }
});

// ============================================================
// BOT READY
// ============================================================

client.once('ready', () => {
  console.log(`🔮 The Oracle is online as ${client.user.tag}`);
  console.log(`📡 Watching channels: ${ALLOWED_CHANNELS.length > 0 ? ALLOWED_CHANNELS.join(', ') : 'ALL'}`);
  console.log(`👥 Serving ${client.guilds.cache.size} server(s)`);
  console.log(`🧠 Pulse observation: ACTIVE`);
  console.log(`📊 Weekly insight: ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][INSIGHT_DAY]} at ${INSIGHT_HOUR}:00 UTC → #${INSIGHT_CHANNEL}`);
  console.log(`⚡ Pulse check: every 4h, ${PULSE_COOLDOWN_DAYS}-day cooldown between alerts`);
  
  // Set bot status
  client.user.setActivity('the frequencies', { type: 3 }); // "Watching the frequencies"
  
  // ============================================================
  // WEEKLY INSIGHT SCHEDULER
  // Check every hour if it's time to drop the weekly insight
  // ============================================================
  
  let lastInsightDate = null;
  
  setInterval(async () => {
    try {
      const now = new Date();
      const today = getTodayET(); // YYYY-MM-DD in Eastern
      
      // Only fire on the configured day and hour
      if (now.getUTCDay() !== INSIGHT_DAY) return;
      if (now.getUTCHours() !== INSIGHT_HOUR) return;
      
      // Only fire once per day
      if (lastInsightDate === today) return;
      lastInsightDate = today;
      
      console.log('[Insight] Weekly insight trigger firing...');
      
      const insight = await generateWeeklyInsight(7);
      
      // Find the target channel
      const guild = client.guilds.cache.first();
      if (!guild) return;
      
      const targetChannel = guild.channels.cache.find(
        ch => ch.name.toLowerCase() === INSIGHT_CHANNEL && (ch.type === 0 || ch.type === 5)
      );
      
      if (!targetChannel) {
        console.error(`[Insight] Could not find channel #${INSIGHT_CHANNEL}`);
        return;
      }
      
      if (!insight) {
        // Quiet week — DM admin so we know it fired, don't clutter the channel
        try {
          const guild = client.guilds.cache.first();
          if (guild) {
            const members = await guild.members.fetch();
            const admin = members.find(m => ADMIN_DISCORD_USERS.includes(m.user.username.toLowerCase()));
            if (admin) {
              const quietEmbed = new EmbedBuilder()
                .setColor(ORACLE_COLOR)
                .setDescription('Quiet week. Not enough signal to read a pattern. Scheduler fired but nothing posted.')
                .setFooter({ text: 'Oracle · titantrack.app', iconURL: 'https://titantrack.app/The_Oracle.png' });
              await admin.send({ embeds: [quietEmbed] });
            }
          }
        } catch (dmErr) {
          console.error('[Insight] Could not DM admin:', dmErr.message);
        }
        console.log(`🔮 Weekly insight: quiet week, DM sent to admin`);
        return;
      }
      
      await targetChannel.send({ embeds: [buildInsightEmbed(insight, 7)] });
      console.log(`🔮 Weekly insight auto-posted to #${INSIGHT_CHANNEL}`);
      
      // Fire-and-forget: extract durable observations into knowledge base
      generateObservations(7).catch(err => {
        console.error('[Observations] Post-insight generation failed:', err.message);
      });
      
    } catch (err) {
      console.error('[Insight] Scheduler error:', err);
    }
  }, 60 * 60 * 1000); // Check every hour
  
  // ============================================================
  // MID-WEEK PULSE CHECK
  // Every 4 hours, check for anomalous topic spikes.
  // Only posts if a topic hits 3x+ its normal daily rate.
  // 3-day cooldown between pulse alerts to avoid noise.
  // ============================================================
  
  let lastPulseDate = null;
  
  setInterval(async () => {
    try {
      const today = getTodayET();
      
      // 3-day cooldown: don't fire if we posted a pulse alert recently
      if (lastPulseDate) {
        const daysSince = (Date.now() - new Date(lastPulseDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < PULSE_COOLDOWN_DAYS) return;
      }
      
      // Don't fire on the same day as the weekly insight
      const now = new Date();
      if (now.getUTCDay() === INSIGHT_DAY) return;
      
      // Check for anomalies
      const anomalies = await detectAnomaly();
      if (!anomalies) return;
      
      console.log('[Pulse] Anomaly confirmed — generating alert...');
      
      const alert = await generatePulseAlert(anomalies);
      if (!alert) return;
      
      // Find the target channel (same as weekly insight)
      const guild = client.guilds.cache.first();
      if (!guild) return;
      
      const targetChannel = guild.channels.cache.find(
        ch => ch.name.toLowerCase() === INSIGHT_CHANNEL && (ch.type === 0 || ch.type === 5)
      );
      
      if (!targetChannel) return;
      
      await targetChannel.send({ embeds: [buildPulseEmbed(alert)] });
      lastPulseDate = today;
      
      console.log(`🔮 Pulse alert posted to #${INSIGHT_CHANNEL} — topics: ${anomalies.map(a => a.topic).join(', ')}`);
      
    } catch (err) {
      console.error('[Pulse] Check error:', err.message);
    }
  }, 4 * 60 * 60 * 1000); // Check every 4 hours
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

process.on('SIGINT', () => {
  console.log('🔮 Oracle going offline...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🔮 Oracle going offline...');
  client.destroy();
  process.exit(0);
});

// ============================================================
// LOGIN
// ============================================================

if (!DISCORD_TOKEN) {
  console.error('❌ ORACLE_DISCORD_TOKEN not set in environment variables');
  process.exit(1);
}

if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not set in environment variables');
  process.exit(1);
}

client.login(DISCORD_TOKEN);

// Export client for cross-module access (e.g., milestone DMs from app.js)
module.exports = { client };
