// src/utils/lunarData.js
// Shared lunar utility - suncalc-powered, replaces inline calculations
// Used by Calendar.js and EnergyAlmanac.js
// Phase 1: Accurate moon engine | Phase 2: Eclipse/event awareness

import SunCalc from 'suncalc';
import lunarEvents from '../data/lunarEvents.json';

// Default location for moonrise/moonset (New York)
const DEFAULT_LAT = 40.7128;
const DEFAULT_LNG = -74.0060;

// Phase thresholds (matched to existing Calendar.js behavior)
// suncalc phase: 0 = new moon, 0.25 = first quarter, 0.5 = full moon, 0.75 = last quarter
const PHASE_MAP = [
  { max: 0.0508, phase: 'new',              isSignificant: true,  label: 'New Moon',        emoji: '🌑' },
  { max: 0.2498, phase: 'waxing-crescent',  isSignificant: false, label: 'Waxing Crescent', emoji: '🌒' },
  { max: 0.3125, phase: 'first-quarter',    isSignificant: false, label: 'First Quarter',   emoji: '🌓' },
  { max: 0.4404, phase: 'waxing-gibbous',   isSignificant: false, label: 'Waxing Gibbous',  emoji: '🌔' },
  { max: 0.5589, phase: 'full',             isSignificant: true,  label: 'Full Moon',       emoji: '🌕' },
  { max: 0.7164, phase: 'waning-gibbous',   isSignificant: false, label: 'Waning Gibbous',  emoji: '🌖' },
  { max: 0.7790, phase: 'last-quarter',     isSignificant: false, label: 'Last Quarter',    emoji: '🌗' },
  { max: 0.9649, phase: 'waning-crescent',  isSignificant: false, label: 'Waning Crescent', emoji: '🌘' },
  { max: 1.0001, phase: 'new',              isSignificant: true,  label: 'New Moon',        emoji: '🌑' }
];

// Energy descriptions (from EnergyAlmanac.js getMoonPhase)
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

/**
 * Classify suncalc phase value (0-1) into named phase
 */
const classifyPhase = (scPhase) => {
  for (const entry of PHASE_MAP) {
    if (scPhase < entry.max) return entry;
  }
  return PHASE_MAP[0]; // fallback: new moon
};

/**
 * Find next phase transition by scanning forward
 * Returns { label, date, daysUntil }
 */
const getNextPhaseTransition = (date) => {
  const current = SunCalc.getMoonIllumination(date);
  const currentEntry = classifyPhase(current.phase);
  
  // Scan forward in 6-hour increments (fast + accurate enough)
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  let checkDate = new Date(date.getTime() + SIX_HOURS);
  
  for (let i = 0; i < 200; i++) { // max ~50 days
    const check = SunCalc.getMoonIllumination(checkDate);
    const checkEntry = classifyPhase(check.phase);
    
    if (checkEntry.phase !== currentEntry.phase) {
      const daysUntil = Math.round((checkDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24) * 10) / 10;
      return {
        label: checkEntry.label,
        date: checkDate,
        daysUntil
      };
    }
    checkDate = new Date(checkDate.getTime() + SIX_HOURS);
  }
  
  return { label: 'Unknown', date: null, daysUntil: null };
};

/**
 * Check if a date matches a special lunar event
 * Returns event object or null
 */
const getSpecialEvent = (date) => {
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const event = lunarEvents.find(e => e.date === dateStr);
  return event || null;
};

/**
 * Format moonrise/moonset time for display
 */
const formatMoonTime = (date) => {
  if (!date || isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

// =============================================================================
// MAIN EXPORT: getLunarData(date)
// Returns SAME shape as old Calendar.js getLunarData + new fields
// =============================================================================

/**
 * Get comprehensive lunar data for a given date
 * 
 * @param {Date} date - The date to calculate for
 * @param {number} lat - Latitude for moonrise/moonset (default: NYC)
 * @param {number} lng - Longitude for moonrise/moonset (default: NYC)
 * @returns {Object} Lunar data object
 * 
 * Backward-compatible fields (same as old getLunarData):
 *   phase, isSignificant, label, emoji, illumination, lunarAge
 * 
 * New fields:
 *   moonrise, moonset, nextPhase, specialEvent, energy
 */
export const getLunarData = (date, lat = DEFAULT_LAT, lng = DEFAULT_LNG) => {
  const d = date instanceof Date ? date : new Date(date);
  
  // Core suncalc calculations
  const moonIllum = SunCalc.getMoonIllumination(d);
  const moonTimes = SunCalc.getMoonTimes(d, lat, lng);
  
  // Phase classification
  const entry = classifyPhase(moonIllum.phase);
  
  // Lunar age (days into cycle, 0-29.53)
  const synodicMonth = 29.53058867;
  const lunarAge = Math.round(moonIllum.phase * synodicMonth * 10) / 10;
  
  // Illumination percentage (real suncalc value, not cosine approx)
  const illumination = Math.round(moonIllum.fraction * 100);
  
  // Moonrise/moonset
  const moonrise = formatMoonTime(moonTimes.rise);
  const moonset = formatMoonTime(moonTimes.set);
  
  // Next phase transition
  const nextPhase = getNextPhaseTransition(d);
  
  // Special event check (Phase 2)
  const specialEvent = getSpecialEvent(d);
  
  // Energy description (for EnergyAlmanac compatibility)
  const energy = ENERGY_MAP[entry.phase] || '';
  
  return {
    // Backward-compatible (Calendar.js consumers)
    phase: entry.phase,
    isSignificant: entry.isSignificant,
    label: entry.label,
    emoji: entry.emoji,
    illumination,
    lunarAge,
    // New fields
    moonrise,
    moonset,
    nextPhase: {
      label: nextPhase.label,
      date: nextPhase.date,
      daysUntil: nextPhase.daysUntil
    },
    specialEvent,
    energy,
    // Raw suncalc phase (0-1) for future correlation work
    // TODO Phase 4: Use this for streak-lunar correlation tagging
    _rawPhase: moonIllum.phase
  };
};

/**
 * EnergyAlmanac-compatible wrapper
 * Returns shape matching old getMoonPhase(): { phase, emoji, illumination, energy, cycleDay }
 */
export const getMoonPhase = (date = new Date()) => {
  const data = getLunarData(date);
  return {
    phase: data.label,           // EnergyAlmanac uses display label ("Full Moon" not "full")
    emoji: data.emoji,
    illumination: data.illumination,
    energy: data.energy,
    cycleDay: Math.floor(data.lunarAge)
  };
};

export default getLunarData;
