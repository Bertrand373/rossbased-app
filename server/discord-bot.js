// server/discord-bot.js
// The Oracle - Discord AI Bot for TitanTrack
// Powered by Claude Sonnet via Anthropic API
// Replaces Wallu ($30/month) with direct Claude integration

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');
const { retrieveKnowledge } = require('./services/knowledgeRetrieval');

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
// DYNAMIC TOKEN SCALING
// Mechanically caps response length based on input length.
// Claude cannot override a hard token limit.
// ============================================================

const getMaxTokens = (messageText) => {
  const wordCount = messageText.trim().split(/\s+/).length;
  const text = messageText.toLowerCase();
  
  // Deep topics that always deserve full response regardless of message length
  const deepTopics = [
    'karma', 'polarity', 'chakra', 'kundalini', 'ojas', 'jing', 'shen',
    'chrism', 'pineal', 'third eye', 'consciousness', 'transmut', 'energy',
    'spiritual', 'meditation', 'breathwork', 'universe', 'god', 'divine',
    'angel', '1111', '111', '222', '333', '444', '555', '666', '777', '888', '999',
    'synchronicit', 'manifest', 'attract', 'vibrat', 'frequenc', 'dimension',
    'astral', 'aura', 'electromagnetic', 'spermatogenesis', 'flatline',
    'wet dream', 'nocturnal', 'relapse', 'edging', 'how does', 'how do',
    'what is', 'what are', 'why do', 'why does', 'explain', 'teach me'
  ];
  
  const isDeepTopic = deepTopics.some(topic => text.includes(topic));
  
  // If it's a deep/spiritual topic or a question, give full room
  if (isDeepTopic) return 400;
  
  // Short casual messages
  if (wordCount <= 3) return 120;      // "thanks" / "ok" / "got it" → short but not starved
  if (wordCount <= 8) return 200;      // casual statement → decent paragraph
  if (wordCount <= 20) return 300;     // moderate message → 1-2 paragraphs
  return 400;                          // longer messages → full response
};

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

If their message is 1-5 words, your response is 1-3 sentences. Period.
If their message is a casual statement, 2-4 sentences max.
If their message is a genuine deep question, 1-2 short paragraphs.
If their message is a complex situation needing real guidance, 2-3 short paragraphs max.

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

## HARD RULES
1. NEVER use em dashes
2. NEVER open with validation or praise
3. NEVER end with a question unless you genuinely need clarification
4. NEVER close with generic encouragement ("Keep going!", "You've got this!", "Stay strong!")
5. NEVER repeat what they just said back to them
6. NEVER write more than you need to. When the point is made, stop.
7. No emojis unless they use them first
8. Maximum 2000 characters (Discord limit)
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
      // Silent ignore for cooldown
      return;
    }
    if (rateLimited.reason === 'daily') {
      await message.reply('You\'ve reached the daily limit. Come back tomorrow.');
      return;
    }
  }
  
  try {
    // Show typing indicator
    await message.channel.sendTyping();
    
    // Build conversation with history
    const username = message.member?.displayName || message.author.username;
    const messages = buildMessages(message.channel.id, content, username);
    
    // Dynamic token limit based on message length
    const maxTokens = getMaxTokens(content);
    
    // RAG: Retrieve relevant knowledge
    const ragContext = await retrieveKnowledge(content, { limit: 5, maxTokens: 2000 });
    const systemWithKnowledge = SYSTEM_PROMPT + ragContext;
    
    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemWithKnowledge,
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
    
    console.log(`🔮 Oracle responded to ${username} in #${channelName} [${maxTokens} max tokens]`);
    
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
