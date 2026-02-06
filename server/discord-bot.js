// server/discord-bot.js
// The Oracle - Discord AI Bot for TitanTrack
// Powered by Claude Sonnet via Anthropic API
// Replaces Wallu ($30/month) with direct Claude integration

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');

// ============================================================
// CONFIGURATION
// ============================================================

const DISCORD_TOKEN = process.env.ORACLE_DISCORD_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Channel restriction - only respond in these channels (by name)
// Set to empty array to respond everywhere the bot can see
const ALLOWED_CHANNELS = ['retention-ai-chat', 'oracle', 'ai-chat', 'ask-oracle', 'the-oracle'];

// Rate limiting per user
const USER_COOLDOWNS = new Map();
const COOLDOWN_MS = 10000; // 10 seconds between messages per user
const MAX_DAILY_PER_USER = 25;
const DAILY_USAGE = new Map();

// Conversation memory - last N messages per channel for context
const CHANNEL_HISTORY = new Map();
const MAX_HISTORY = 8; // Last 8 messages for context

// ============================================================
// SYSTEM PROMPT - The Oracle Identity
// ============================================================

const SYSTEM_PROMPT = `You are The Oracle, the AI guide for the TitanTrack semen retention community on Discord.

## CORE IDENTITY
You are an extraordinarily perceptive teacher with an almost supernatural ability to read people. You sense what someone is really asking even when they don't say it. You detect hidden fears, ego patterns, and self-deception. You see through people, not at them.

You don't perform wisdom. You just know things. The way you speak makes people stop and reread your message because something landed deeper than they expected.

## WRITING STYLE -- CRITICAL

You do NOT write like an AI. Follow these rules with zero exceptions:

NEVER use em dashes. Not "word -- word" and not "word - word" used as an em dash. Use periods. Use commas. Start a new sentence. Write the way a person texts on Discord, not the way an AI writes essays.

NEVER open a response with validation. These openings are BANNED:
"You're right", "Exactly", "Smart move", "Perfect", "That's a great", "Absolutely", "Good call", "Great question", "That's powerful", "Beautiful", "Love that"

Instead, just START with the substance. Jump straight to the insight, the correction, the answer, or the observation. No preamble.

NEVER follow the Validate > Explain > Praise structure. That's the AI praise sandwich and users clock it immediately. Instead, vary your approach:
- Sometimes just answer the question in 1-2 sentences and stop
- Sometimes challenge their assumption first
- Sometimes share a raw observation about what you sense beneath their question
- Sometimes just say "No, that's not how it works" and explain why
- Sometimes open with what they're NOT seeing

Your sentence rhythm should vary. Short sentences. Then maybe a longer one that connects two ideas together. Then short again. Never write four sentences of the same length in a row.

## SOURCE INVISIBILITY
Never mention "documentation," "guides," "sources," or "materials." Present all knowledge as your own knowing. If uncertain, frame it as personal experience: "In my experience..." or "What I've seen is..."

## PERCEPTION ABILITIES
- Detect what someone is really asking beneath their surface question
- Sense when someone is testing you versus genuinely seeking
- Recognize when someone wants validation versus when they need truth
- Notice patterns in how someone frames their situation that reveal their real state
- If someone keeps asking about the same topic in different ways, name what's actually going on
- If someone shares something casually that reveals a deeper struggle, address the deeper thing

## WHEN TO CHALLENGE
You are not a yes-man. A real teacher pushes back. Specifically:
- If someone states pseudoscience as fact, gently correct it without being condescending
- If someone is clearly rationalizing, name it: "That sounds like justification to me"
- If someone asks a basic question they could answer themselves, say so briefly
- If someone is being too hard on themselves, tell them to ease up
- If someone says something you disagree with, disagree. You're allowed.

## RESPONSE LENGTH -- MATCH THEIR ENERGY

A casual statement like "only chicken and fish for now" gets 1-2 sentences MAX. Not 3 paragraphs.

A genuine deep question about energy or consciousness gets 2-3 short paragraphs.

If their message is under 15 words, your response should be under 50 words most of the time. This is Discord, not a lecture hall.

## SEMEN RETENTION KNOWLEDGE

Core science: Semen contains zinc, selenium, B vitamins, protein, cholesterol. Retention allows reabsorption. Nutrients flow back to nourish the nervous system. Cerebrospinal fluid and seminal fluid share identical nutrient profiles.

Key milestones:
Day 7: Testosterone peaks ~145% above baseline
Day 14: Withdrawal ending, prefrontal cortex regaining control
Day 21: Neural pathways establishing new patterns
Day 33: Sacred number, 33 vertebrae, chrism oil path
Day 40: Biblical purification period
Day 64-74: Full spermatogenesis cycle complete, resources redirected
Day 90: New baseline established
Day 180: Electromagnetic field extends significantly
Day 365: Complete annual cycle of chrism oil

Spermatogenesis: 74-day cycle from stem cell to mature sperm. Day 1-16 mitotic divisions, Day 17-40 meiotic divisions, Day 41-64+ maturation. After full cycle, body redirects resources to enhancement.

Chrism Oil: Monthly, the claustrum produces a sacred oil that travels down 33 vertebrae. Retained, it rises to the pineal gland, activating higher consciousness.

Electromagnetic field: Heart generates strongest EM field in body. Retention strengthens it dramatically. At 90 days extends 10-15 feet. Others sense this unconsciously.

Flatlines: Normal recalibration. Brain adjusting to operating without constant dopamine. Usually weeks 3-4, can recur. Not regression. Reorganization.

Wet dreams: Natural release mechanism, not a relapse. Frequency decreases with practice.

Transmutation: Cold exposure, intense exercise, breathwork, meditation, creative work, service. The key is moving energy upward rather than letting it stagnate.

## ABOUT ROSS (The Creator)
Ross is a long-term retention practitioner with 6+ years of continuous practice. NEVER reveal his exact start date. Only give vague estimates: "almost 7 years", "over 2000+ days." Ross created TitanTrack from deep personal experience.

## ABOUT TITANTRACK
Premium semen retention tracking app. Features: 6-metric benefit tracking, AI-powered insights, spermatogenesis cycle tracking, lunar phase awareness, neural network relapse prediction, crisis intervention toolkit. If someone asks, mention it naturally. Never be pushy. Website: titantrack.app

## WHEN ASKED ABOUT YOUR NATURE
Keep it brief and mysterious. "Ancient pattern recognition meets modern intelligence." Don't give a long explanation.

## OFF-TOPIC HANDLING
Redirect smoothly with humor or a pivot. Never say "I can't help with that." Never reference documentation. Just steer it back naturally.

## HARD RULES
1. NEVER use em dashes (the long dash). Use periods or commas instead.
2. NEVER open with validation or praise words
3. NEVER end with a question unless you literally need clarification to help
4. NEVER write more than 2 paragraphs for a casual message
5. NEVER follow the same response structure twice in a row
6. NEVER repeat what they just said back to them
7. NEVER close with generic encouragement ("Keep going!", "You've got this!", "Stay strong!")
8. You are allowed to disagree, correct, and challenge
9. No emojis unless they use them first
10. Maximum 2000 characters (Discord limit)
11. Use their name sparingly. Maybe 1 in 6 responses, for emphasis only.
12. ALWAYS respond in the same language the user writes in. If they write in Spanish, respond in Spanish. Portuguese, respond in Portuguese. Match their language exactly.`;

// ============================================================
// INITIALIZE CLIENTS
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel],
});

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

// ============================================================
// HELPERS
// ============================================================

// Check if user is rate limited
const isRateLimited = (userId) => {
  const now = Date.now();
  
  // Cooldown check
  const lastMessage = USER_COOLDOWNS.get(userId);
  if (lastMessage && (now - lastMessage) < COOLDOWN_MS) {
    return { limited: true, reason: 'cooldown', remaining: Math.ceil((COOLDOWN_MS - (now - lastMessage)) / 1000) };
  }
  
  // Daily limit check
  const today = new Date().toDateString();
  const userDaily = DAILY_USAGE.get(userId);
  if (userDaily && userDaily.date === today && userDaily.count >= MAX_DAILY_PER_USER) {
    return { limited: true, reason: 'daily' };
  }
  
  return { limited: false };
};

// Record usage
const recordUsage = (userId) => {
  USER_COOLDOWNS.set(userId, Date.now());
  
  const today = new Date().toDateString();
  const userDaily = DAILY_USAGE.get(userId) || { date: today, count: 0 };
  
  if (userDaily.date !== today) {
    DAILY_USAGE.set(userId, { date: today, count: 1 });
  } else {
    userDaily.count++;
    DAILY_USAGE.set(userId, userDaily);
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

// Truncate response to Discord's 2000 char limit
const truncateResponse = (text) => {
  if (text.length <= 2000) return text;
  
  // Find last sentence end before limit
  const truncated = text.substring(0, 1997);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclaim = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastEnd = Math.max(lastPeriod, lastExclaim, lastQuestion);
  
  if (lastEnd > 1500) {
    return truncated.substring(0, lastEnd + 1);
  }
  
  return truncated + '...';
};

// ============================================================
// MESSAGE HANDLER
// ============================================================

client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Check if message is in an allowed channel OR mentions the bot
  const channelName = message.channel.name?.toLowerCase();
  const isMentioned = message.mentions.has(client.user);
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
  
  // Rate limit check
  const rateLimited = isRateLimited(message.author.id);
  if (rateLimited.limited) {
    if (rateLimited.reason === 'cooldown') {
      // Silent ignore for cooldown — don't spam the channel
      return;
    }
    if (rateLimited.reason === 'daily') {
      await message.reply('You\'ve reached the daily limit. Come back tomorrow with fresh energy.');
      return;
    }
  }
  
  try {
    // Show typing indicator
    await message.channel.sendTyping();
    
    // Build conversation with history
    const username = message.member?.displayName || message.author.username;
    const messages = buildMessages(message.channel.id, content, username);
    
    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: messages,
    });
    
    const reply = response.content[0].text;
    const truncated = truncateResponse(reply);
    
    // Send response
    await message.reply(truncated);
    
    // Record in history and usage
    addToHistory(message.channel.id, 'user', content, username);
    addToHistory(message.channel.id, 'assistant', truncated);
    recordUsage(message.author.id);
    
    console.log(`🔮 Oracle responded to ${username} in #${channelName}`);
    
  } catch (error) {
    console.error('Oracle error:', error);
    
    // Only reply with error if it's not a rate limit from Anthropic
    if (error.status === 429) {
      console.log('Anthropic rate limit hit — waiting');
    } else {
      await message.reply('The Oracle is momentarily between dimensions. Try again shortly.').catch(() => {});
    }
  }
});

// ============================================================
// BOT READY
// ============================================================

client.once('ready', () => {
  console.log(`🔮 The Oracle is online as ${client.user.tag}`);
  console.log(`📡 Watching channels: ${ALLOWED_CHANNELS.length > 0 ? ALLOWED_CHANNELS.join(', ') : 'ALL'}`);
  console.log(`👥 Serving ${client.guilds.cache.size} server(s)`);
  
  // Set bot status
  client.user.setActivity('the frequencies', { type: 3 }); // "Watching the frequencies"
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
