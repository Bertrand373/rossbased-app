// server/services/oracleRepetitionGuard.js
// Keeps Oracle pulses feeling fresh by tracking the shape of recent ones and
// blocking the LLM from repeating itself.
//
// Three jobs:
//  1. Build a "DO NOT REPEAT" block from the last N pulses (sources, traditions,
//     opening phrases, key nouns, tones) that gets injected into the system prompt.
//  2. Post-generation novelty check via embedding cosine similarity vs recent
//     pulses — if too close, the generator regenerates with stronger guidance.
//  3. Fingerprint a pulse (extract sources cited, tradition, lead source, opening,
//     key nouns, tone) so it can be stored and fed back next cycle.

const CommunityPulse = require('../models/CommunityPulse');
const { generateEmbedding, isVectorSearchEnabled } = require('./embeddings');
const { TRADITIONS } = require('./oracleCorrelationEngine');

// How many recent pulses we consider for repetition checks
const RECENT_WINDOW = 30;

// Cosine-similarity threshold above which a new pulse is "too similar"
const NOVELTY_THRESHOLD = 0.86;

// Tones Oracle can adopt. The prompt picks one each cycle and rotates.
const TONES = [
  'celebratory', 'concerning', 'suspicious', 'mundane', 'contrarian',
  'deadpan', 'urgent', 'reverent', 'dryly_humorous', 'matter_of_fact', 'foreboding'
];

// Source name patterns for lead-source detection in generated text
const SOURCE_PATTERNS = [
  { source: 'reddit', regex: /\b(reddit|subreddit|r\/semenretention)\b/i },
  { source: 'youtube_own', regex: /\b(channel|video|youtube)\b/i },
  { source: 'youtube_niche', regex: /\b(other channels|niche|across youtube)\b/i },
  { source: 'discord', regex: /\b(discord|server|chat)\b/i },
  { source: 'inapp', regex: /\b(many of you|some of you|a number of you|the urges? tab|the app|your logs?|the cohort)\b/i },
  { source: 'lunar', regex: /\b(moon|lunar|waxing|waning|new moon|full moon|eclipse)\b/i }
];

// Tradition keyword bank — used to infer which tradition a pulse leaned on
const TRADITION_KEYWORDS = {
  egyptian: ['duat', 'geb', 'osiris', 'isis', 'ka ', ' ba ', 'horus', 'ra ', 'egyptian', 'pharaoh', 'thoth', 'book of the dead'],
  taoist: ['tao', 'qi', 'jing', 'shen', 'dantian', 'microcosmic orbit', 'taoist', 'wu wei', 'yin', 'yang'],
  vedic: ['ojas', 'brahmacharya', 'kundalini', 'chakra', 'prana', 'samadhi', 'vedic', 'yogic', 'shakti', 'sanskrit'],
  hermetic: ['hermetic', 'as above so below', 'kybalion', 'mentalism', 'hermes trismegistus', 'seven principles'],
  greek_orphic: ['orphic', 'dionysus', 'apollo', 'greek myth', 'eros', 'logos'],
  christian_mystic: ['chrism', 'christ', 'holy spirit', 'gospel', 'monastic', 'desert father'],
  tantric: ['tantric', 'tantra', 'shiva', 'shakti', 'left-hand', 'right-hand path'],
  scientific: ['dopamine', 'testosterone', 'neurotransmitter', 'hpa axis', 'cortisol', 'neuroplasticity', 'vagus', 'serotonin', 'oxytocin'],
  jungian: ['shadow', 'anima', 'animus', 'archetype', 'individuation', 'jung', 'collective unconscious'],
  stoic: ['stoic', 'marcus aurelius', 'epictetus', 'seneca', 'amor fati'],
  sufi: ['sufi', 'rumi', 'nafs', 'fana', 'dervish'],
  kabbalistic: ['kabbalah', 'sephirot', 'tree of life', 'ein sof', 'zohar'],
  gnostic: ['gnostic', 'sophia', 'demiurge', 'pleroma', 'archon'],
  alchemical: ['alchemy', 'alchemical', 'philosophers stone', 'solve et coagula', 'nigredo', 'albedo', 'rubedo'],
  shamanic: ['shamanic', 'shaman', 'spirit journey', 'totem', 'ayahuasca', 'plant medicine']
};

/**
 * Compute cosine similarity between two equal-length vectors.
 */
function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Infer which sources a generated pulse mentions, in order of first appearance.
 * Returns array of source names, deduped, in lead-first order.
 */
function detectSourcesCited(text) {
  const found = [];
  // For each source, find earliest match index in the text
  const matches = [];
  for (const { source, regex } of SOURCE_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      matches.push({ source, index: match.index });
    }
  }
  matches.sort((a, b) => a.index - b.index);
  for (const m of matches) {
    if (!found.includes(m.source)) found.push(m.source);
  }
  return found;
}

/**
 * Infer which wisdom tradition a pulse leaned on, if any.
 */
function detectTraditionCited(text) {
  const lower = text.toLowerCase();
  let best = { tradition: '', hits: 0 };
  for (const [tradition, keywords] of Object.entries(TRADITION_KEYWORDS)) {
    let hits = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) hits += 1;
    }
    if (hits > best.hits) best = { tradition, hits };
  }
  return best.hits > 0 ? best.tradition : '';
}

/**
 * Extract the first 5 lowercase words from the headline as an opening fingerprint.
 */
function extractOpeningPhrase(headline) {
  if (!headline) return '';
  return headline
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .join(' ');
}

/**
 * Pull standout content nouns the LLM leaned on (used for cooldown).
 * We hand-curate a list of high-leverage words that, if repeated, create
 * the "same energy" feeling — these are the ones we want on a cooldown.
 */
const COOLDOWN_NOUNS = [
  'magnetism', 'threshold', 'frequency', 'vibration', 'alignment', 'transmutation',
  'territory', 'protocol', 'mechanism', 'cycle', 'mirror', 'chamber', 'doorway',
  'lineage', 'inheritance', 'witness', 'silence', 'descent', 'ascent', 'shadow',
  'crucible', 'forge', 'temple', 'pillar', 'crown', 'flame', 'current', 'tide',
  'reservoir', 'wellspring', 'kindling', 'embers', 'gateway', 'horizon', 'aperture',
  'lattice', 'membrane', 'circuit', 'covenant', 'rite', 'invocation', 'oath'
];

function extractKeyNouns(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const noun of COOLDOWN_NOUNS) {
    if (new RegExp(`\\b${noun}\\b`).test(lower)) found.push(noun);
  }
  return found;
}

/**
 * Build the full fingerprint for a generated pulse, ready to store.
 * Note: `tone` should be supplied by the generator (it picks the tone target);
 * everything else is inferred from the text.
 */
function fingerprintPulse({ headline, body, tone }) {
  const combined = `${headline}\n\n${body}`;
  const sourcesCited = detectSourcesCited(combined);
  return {
    sourcesCited,
    leadSource: sourcesCited[0] || '',
    traditionCited: detectTraditionCited(combined),
    openingPhrase: extractOpeningPhrase(headline),
    keyNouns: extractKeyNouns(combined),
    tone: tone || ''
  };
}

/**
 * Generate an embedding for a pulse. Returns null if embeddings aren't configured.
 */
async function embedPulse({ headline, body }) {
  if (!isVectorSearchEnabled()) return null;
  return generateEmbedding(`${headline}\n\n${body}`);
}

/**
 * Fetch fingerprint context from the last N pulses to feed into the prompt.
 * Returns the "do not repeat" block as a string, plus structured data the
 * generator can use to pick a fresh tone/tradition/lead source.
 */
async function getRepetitionContext() {
  const recent = await CommunityPulse.find()
    .sort({ createdAt: -1 })
    .limit(RECENT_WINDOW)
    .select('headline sourcesCited leadSource traditionCited openingPhrase keyNouns tone embedding')
    .lean();

  // Aggregate what's been used recently
  const usedTones = new Set();
  const usedTraditions = new Set();
  const usedLeadSources = new Set();
  const usedNouns = new Set();
  const usedOpenings = new Set();
  const recentHeadlines = [];
  const recentEmbeddings = [];

  // Apply different cooldown windows per fingerprint dimension
  recent.forEach((p, idx) => {
    recentHeadlines.push(p.headline);
    if (p.embedding && p.embedding.length > 0) recentEmbeddings.push(p.embedding);
    if (idx < 10) {
      // Tighter cooldowns for recent 10
      if (p.tone) usedTones.add(p.tone);
      if (p.traditionCited) usedTraditions.add(p.traditionCited);
      if (p.leadSource) usedLeadSources.add(p.leadSource);
      if (p.openingPhrase) usedOpenings.add(p.openingPhrase);
    }
    if (idx < 15) {
      // Noun cooldown is slightly longer — these create the strongest "same feel"
      for (const n of (p.keyNouns || [])) usedNouns.add(n);
    }
  });

  // Pick allowed pools (what hasn't been used in the cooldown window)
  const freshTones = TONES.filter(t => !usedTones.has(t));
  const freshTraditions = TRADITIONS.filter(t => !usedTraditions.has(t));
  const allSources = ['reddit', 'youtube_own', 'youtube_niche', 'discord', 'inapp', 'lunar'];
  const freshLeadSources = allSources.filter(s => !usedLeadSources.has(s));

  // Build the prompt block
  const lines = [];
  lines.push('## REPETITION GUARD — DO NOT REPEAT');
  lines.push('');
  lines.push(`Recent pulse headlines (do NOT echo their themes, vocabulary, or structure):`);
  recentHeadlines.slice(0, 10).forEach((h, i) => lines.push(`  ${i + 1}. ${h}`));
  lines.push('');

  if (usedOpenings.size > 0) {
    lines.push(`Opening phrases you JUST used (do not start with anything resembling these):`);
    Array.from(usedOpenings).forEach(op => lines.push(`  - "${op}..."`));
    lines.push('');
  }

  if (usedNouns.size > 0) {
    lines.push(`Words on cooldown (do NOT use any of these in this pulse): ${Array.from(usedNouns).join(', ')}`);
    lines.push('');
  }

  if (usedTraditions.size > 0) {
    lines.push(`Traditions just referenced (pick a DIFFERENT one): ${Array.from(usedTraditions).join(', ')}`);
    lines.push(`Fresh traditions you may pull from: ${freshTraditions.length > 0 ? freshTraditions.join(', ') : '(all traditions are in cooldown, pick the least-used)'}`);
    lines.push('');
  }

  if (usedLeadSources.size > 0) {
    lines.push(`Lead sources just used (lead with a DIFFERENT one): ${Array.from(usedLeadSources).join(', ')}`);
    lines.push(`Fresh lead sources you may anchor on: ${freshLeadSources.length > 0 ? freshLeadSources.join(', ') : '(all sources recently used, rotate to least-recent)'}`);
    lines.push('');
  }

  if (usedTones.size > 0) {
    lines.push(`Tones just used (pick a DIFFERENT tone): ${Array.from(usedTones).join(', ')}`);
    lines.push(`Fresh tones available: ${freshTones.length > 0 ? freshTones.join(', ') : TONES.join(', ')}`);
  }

  return {
    promptBlock: lines.join('\n'),
    recentEmbeddings,
    suggestedTone: freshTones[Math.floor(Math.random() * freshTones.length)] || TONES[Math.floor(Math.random() * TONES.length)],
    suggestedTradition: freshTraditions[Math.floor(Math.random() * freshTraditions.length)] || TRADITIONS[Math.floor(Math.random() * TRADITIONS.length)],
    suggestedLeadSource: freshLeadSources[Math.floor(Math.random() * freshLeadSources.length)] || allSources[Math.floor(Math.random() * allSources.length)],
    avoidNouns: Array.from(usedNouns),
    avoidOpenings: Array.from(usedOpenings)
  };
}

/**
 * Check that a newly-generated pulse is sufficiently novel vs recent ones.
 * Returns { passed: boolean, maxSimilarity: number, reason?: string }.
 * If embeddings aren't configured, this is a soft-pass.
 */
async function checkNovelty({ headline, body, recentEmbeddings }) {
  if (!recentEmbeddings || recentEmbeddings.length === 0) {
    return { passed: true, maxSimilarity: 0, reason: 'no_baseline' };
  }
  if (!isVectorSearchEnabled()) {
    return { passed: true, maxSimilarity: 0, reason: 'embeddings_disabled' };
  }

  const embedding = await generateEmbedding(`${headline}\n\n${body}`);
  if (!embedding) {
    return { passed: true, maxSimilarity: 0, reason: 'embedding_failed' };
  }

  let maxSim = 0;
  for (const prior of recentEmbeddings) {
    const sim = cosine(embedding, prior);
    if (sim > maxSim) maxSim = sim;
  }

  return {
    passed: maxSim < NOVELTY_THRESHOLD,
    maxSimilarity: Number(maxSim.toFixed(3)),
    embedding,
    reason: maxSim >= NOVELTY_THRESHOLD ? 'too_similar' : 'novel'
  };
}

module.exports = {
  getRepetitionContext,
  checkNovelty,
  fingerprintPulse,
  embedPulse,
  TONES,
  NOVELTY_THRESHOLD,
  RECENT_WINDOW
};
