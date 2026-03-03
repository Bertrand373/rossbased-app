// server/utils/lunarData.js
// Server-side lunar utility — suncalc-powered
// Used by transmissionRoutes.js and Oracle system prompt in app.js
// CommonJS for Node.js backend

const SunCalc = require('suncalc');
const path = require('path');
const lunarEvents = require('../data/lunarEvents.json');

// Default location for moonrise/moonset (New York)
const DEFAULT_LAT = 40.7128;
const DEFAULT_LNG = -74.0060;

// Phase thresholds (matched to client-side behavior)
const PHASE_MAP = [
  { max: 0.0508, phase: 'new',              label: 'New Moon',        emoji: '🌑' },
  { max: 0.2498, phase: 'waxing-crescent',  label: 'Waxing Crescent', emoji: '🌒' },
  { max: 0.3125, phase: 'first-quarter',    label: 'First Quarter',   emoji: '🌓' },
  { max: 0.4404, phase: 'waxing-gibbous',   label: 'Waxing Gibbous',  emoji: '🌔' },
  { max: 0.5589, phase: 'full',             label: 'Full Moon',       emoji: '🌕' },
  { max: 0.7164, phase: 'waning-gibbous',   label: 'Waning Gibbous',  emoji: '🌖' },
  { max: 0.7790, phase: 'last-quarter',     label: 'Last Quarter',    emoji: '🌗' },
  { max: 0.9649, phase: 'waning-crescent',  label: 'Waning Crescent', emoji: '🌘' },
  { max: 1.0001, phase: 'new',              label: 'New Moon',        emoji: '🌑' }
];

const ENERGY_MAP = {
  'new':              'New beginnings, intention setting, introspection',
  'waxing-crescent':  'Building momentum, taking action on intentions',
  'first-quarter':    'Challenges arise, decision points, commitment',
  'waxing-gibbous':   'Refinement, adjustment, patience before fruition',
  'full':             'Peak energy, culmination, heightened emotions',
  'waning-gibbous':   'Gratitude, sharing wisdom, integration',
  'last-quarter':     'Release, forgiveness, letting go',
  'waning-crescent':  'Rest, reflection, preparation for renewal'
};

const classifyPhase = (scPhase) => {
  for (const entry of PHASE_MAP) {
    if (scPhase < entry.max) return entry;
  }
  return PHASE_MAP[0];
};

const getNextPhaseTransition = (date) => {
  const current = SunCalc.getMoonIllumination(date);
  const currentEntry = classifyPhase(current.phase);
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  let checkDate = new Date(date.getTime() + SIX_HOURS);
  
  for (let i = 0; i < 200; i++) {
    const check = SunCalc.getMoonIllumination(checkDate);
    const checkEntry = classifyPhase(check.phase);
    if (checkEntry.phase !== currentEntry.phase) {
      const daysUntil = Math.round((checkDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24) * 10) / 10;
      return { label: checkEntry.label, date: checkDate, daysUntil };
    }
    checkDate = new Date(checkDate.getTime() + SIX_HOURS);
  }
  return { label: 'Unknown', date: null, daysUntil: null };
};

const getSpecialEvent = (date) => {
  const dateStr = date.toISOString().slice(0, 10);
  return lunarEvents.find(e => e.date === dateStr) || null;
};

const formatMoonTime = (date, timezone = 'America/New_York') => {
  if (!date || isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: timezone 
  });
};

/**
 * Get comprehensive lunar data (server-side)
 * Used for Oracle context and Daily Transmission
 */
function getLunarData(date = new Date(), timezone = 'America/New_York', lat = DEFAULT_LAT, lng = DEFAULT_LNG) {
  const d = date instanceof Date ? date : new Date(date);
  
  const moonIllum = SunCalc.getMoonIllumination(d);
  const moonTimes = SunCalc.getMoonTimes(d, lat, lng);
  const entry = classifyPhase(moonIllum.phase);
  
  const synodicMonth = 29.53058867;
  const lunarAge = Math.round(moonIllum.phase * synodicMonth * 10) / 10;
  const illumination = Math.round(moonIllum.fraction * 100);
  
  const moonrise = formatMoonTime(moonTimes.rise, timezone);
  const moonset = formatMoonTime(moonTimes.set, timezone);
  const nextPhase = getNextPhaseTransition(d);
  const specialEvent = getSpecialEvent(d);
  const energy = ENERGY_MAP[entry.phase] || '';
  
  return {
    phase: entry.phase,
    label: entry.label,
    emoji: entry.emoji,
    illumination,
    lunarAge,
    cycleDay: Math.ceil(lunarAge) || 1,
    cycleTotal: Math.round(synodicMonth),
    moonrise,
    moonset,
    nextPhase: {
      label: nextPhase.label,
      daysUntil: nextPhase.daysUntil
    },
    specialEvent,
    energy
  };
}

/**
 * Build lunar context block for Oracle system prompt
 */
function buildLunarContext(timezone = 'America/New_York') {
  const data = getLunarData(new Date(), timezone);
  
  let context = `\n\nLUNAR CONTEXT:
Phase: ${data.label} (${data.illumination}% illuminated)
Cycle Day: ${data.cycleDay} of ${data.cycleTotal}
Moonrise: ${data.moonrise || 'N/A'} | Moonset: ${data.moonset || 'N/A'}
Next Phase: ${data.nextPhase.label} in ${data.nextPhase.daysUntil} days
Energy: ${data.energy}`;

  if (data.specialEvent) {
    context += `\nSpecial Event: ${data.specialEvent.name}`;
    if (data.specialEvent.peakTimeUTC) {
      // Convert UTC peak time to user timezone
      const [h, m] = data.specialEvent.peakTimeUTC.split(':');
      const peakDate = new Date();
      peakDate.setUTCHours(parseInt(h), parseInt(m), 0, 0);
      const localPeak = peakDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', minute: '2-digit', hour12: true, timeZone: timezone 
      });
      context += ` — peaks at ${localPeak}`;
    }
    if (data.specialEvent.visibility) {
      context += `\nVisibility: ${data.specialEvent.visibility}`;
    }
  }

  context += `\nReference lunar phases naturally when relevant. The moon's cycle mirrors internal rhythms. Weave lunar awareness into guidance without being robotic about it.\n`;

  return context;
}

module.exports = { getLunarData, buildLunarContext };
