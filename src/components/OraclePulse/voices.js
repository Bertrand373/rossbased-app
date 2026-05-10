// src/components/OraclePulse/voices.js
//
// Voice selector for the ambient Tracker observation slot.
//
// One voice speaks per day. The Oracle community pulse is the default; the
// Almanac is a guest star that only appears on lunar-significant days,
// special events, or master-numerology days — when it has something specific
// to say. Priority order inside the Almanac voice: special event > new/full
// moon > master numerology day.
//
// All math is local (lunar via suncalc, numerology via the same algorithm
// EnergyAlmanac uses). No network calls, no per-user data, no AI calls.

import { getLunarData } from '../../utils/lunarData';

// ────────────────────────────────────────────────────────────────────────────
// Personal Day numerology
// Mirrors the algorithm in EnergyAlmanac.js getDayNumerology so this module
// stays standalone and the two views agree on which day is a master day.
// ────────────────────────────────────────────────────────────────────────────

const reduceToDigit = (num) => {
  while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
    num = String(num).split('').reduce((a, b) => parseInt(a, 10) + parseInt(b, 10), 0);
  }
  return num;
};

const getPersonalDayNumber = (date) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  const allDigits = `${month}${day}${year}`
    .split('')
    .reduce((a, b) => parseInt(a, 10) + parseInt(b, 10), 0);
  return reduceToDigit(allDigits);
};

const ALMANAC_LABEL = 'ALMANAC OBSERVES';

// Hand-curated whisper per special-event type. Avoids the repetition that
// would result from prefixing the event name with the lunarEvents.json
// significance text (which itself starts with the event type plural).
// All 37 entries in lunarEvents.json fall into one of these 7 buckets.
const EVENT_TYPE_OBSERVATIONS = {
  'total-solar-eclipse':    'Total solar eclipse today. The cosmos presses pause — momentary darkness, full reset.',
  'partial-solar-eclipse':  'Partial solar eclipse today. Seed-planting energy under a softer cosmic shadow.',
  'annular-solar-eclipse':  'Annular solar eclipse today. Ring of fire — contained power, perfect tension.',
  'total-lunar-eclipse':    'Lunar eclipse today. Death and rebirth in the shadow — release what you have been holding.',
  'partial-lunar-eclipse':  'Partial lunar eclipse today. Light and shadow in tension — the play of opposites tonight.',
  'penumbral-lunar-eclipse':'Penumbral lunar eclipse today. Subtle shifts. The universe whispering rather than shouting.',
  'supermoon':              'Supermoon tonight. Gravitational pull peaks — expect heightened energy and vivid dreams.',
};

const MASTER_DAY_VOICES = {
  11: {
    theme: 'Illumination',
    observation: 'Personal Day 11 — illumination. Intuition runs electric today. Track what surfaces.',
    body: 'Master Day 11 carries concentrated intuitive energy. Insights arrive sideways today — through dreams, throwaway remarks, sudden recognitions. Master numerology days are rare; treat their pulls with weight.',
  },
  22: {
    theme: 'Master Builder',
    observation: 'Personal Day 22 — master builder. Vision meets execution. Think large scale today.',
    body: 'Master Day 22 fuses the visionary energy of 11 with the grounded structure of 4. This is the rarest day to begin work that needs to outlast you. Aim large and build with discipline — both register today.',
  },
  33: {
    theme: 'Master Teacher',
    observation: 'Personal Day 33 — master teacher. Compassion radiates. Lead by example today.',
    body: 'Master Day 33 is the rarest of the master numbers — selfless service, healing presence. Your example carries weight today in ways you may not see. Lead through what you do, not what you say.',
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Almanac voice composer
// Returns null when nothing significant applies → caller falls back to Oracle.
// ────────────────────────────────────────────────────────────────────────────

const composeAlmanacVoice = (date) => {
  let lunar;
  try {
    lunar = getLunarData(date);
  } catch {
    return null; // lunar math failed → silent fallback to Oracle
  }

  // Priority 1: special event (eclipse, supermoon, equinox-aligned moon).
  // Observation is pulled from EVENT_TYPE_OBSERVATIONS to avoid prefix
  // collision with the lunarEvents.json significance text (which often
  // starts with the event-type plural). Body still uses the rich
  // lunarEvents.json description + significance verbatim.
  if (lunar.specialEvent) {
    const ev = lunar.specialEvent;
    const observation = EVENT_TYPE_OBSERVATIONS[ev.type]
      || `${ev.name} today. The Almanac marks this date.`;
    return {
      source: 'almanac',
      label: ALMANAC_LABEL,
      observation,
      body: `${ev.description} ${ev.significance}`,
      voiceKey: `event:${ev.type}:${date.toISOString().slice(0, 10)}`,
    };
  }

  // Priority 2: significant lunar phase, but only on the actual peak day.
  // PHASE_MAP's "new" and "full" buckets span 2-4 calendar days each. We
  // only want to fire on the single day closest to the true peak — checked
  // by comparing today's illumination to yesterday and tomorrow.
  // New moon = local minimum illumination (~0%).
  // Full moon = local maximum illumination (~100%).
  const yesterday = new Date(date); yesterday.setDate(date.getDate() - 1);
  const tomorrow = new Date(date); tomorrow.setDate(date.getDate() + 1);
  let yLunar = null, tLunar = null;
  try {
    yLunar = getLunarData(yesterday);
    tLunar = getLunarData(tomorrow);
  } catch { /* if neighbor lookup fails, skip the lunar branch */ }

  // Tie-break: when illumination is integer-rounded, two consecutive days
  // can land on 100 (full) or 0 (new). Require strict change on one side
  // so we fire on the last day of the peak streak (closest to declining
  // away from the extreme), guaranteeing at most one fire per phase event.
  const isPeakNew = yLunar && tLunar
    && lunar.phase === 'new'
    && lunar.illumination <= yLunar.illumination
    && lunar.illumination < tLunar.illumination;
  const isPeakFull = yLunar && tLunar
    && lunar.phase === 'full'
    && lunar.illumination >= yLunar.illumination
    && lunar.illumination > tLunar.illumination;

  if (isPeakNew || isPeakFull) {
    const isFull = isPeakFull;
    const observation = isFull
      ? 'Full Moon today. Peak charge in the lunar cycle — emotions run hot and clear.'
      : 'New Moon today. The cycle resets — a quiet day for choosing what to plant.';
    const nextLine = lunar.nextPhase?.label && lunar.nextPhase?.daysUntil
      ? ` Next phase, ${lunar.nextPhase.label}, in ${lunar.nextPhase.daysUntil} days.`
      : '';
    return {
      source: 'almanac',
      label: ALMANAC_LABEL,
      observation,
      body: `${lunar.label}. ${lunar.energy}. Illumination ${lunar.illumination}%, lunar day ${lunar.cycleDay} of ${lunar.cycleTotal}.${nextLine}`,
      voiceKey: `phase:${lunar.phase}:${date.toISOString().slice(0, 10)}`,
    };
  }

  // Priority 3: master numerology day (Personal Day 11, 22, 33).
  const personalDay = getPersonalDayNumber(date);
  const master = MASTER_DAY_VOICES[personalDay];
  if (master) {
    return {
      source: 'almanac',
      label: ALMANAC_LABEL,
      observation: master.observation,
      body: master.body,
      voiceKey: `master:${personalDay}:${date.toISOString().slice(0, 10)}`,
    };
  }

  return null;
};

// ────────────────────────────────────────────────────────────────────────────
// Public picker. Returns null when the Oracle community pulse should play.
// Future voices (cycle insight, peak callback, pattern alert) get added here
// in priority order without touching OraclePulse.js again.
// ────────────────────────────────────────────────────────────────────────────

export const pickTodaysVoice = (date = new Date()) => {
  return composeAlmanacVoice(date);
};

// Test helper exported for ad-hoc preview from a node script. Not used by
// the app at runtime.
export const __composeAlmanacVoiceForTesting = composeAlmanacVoice;
