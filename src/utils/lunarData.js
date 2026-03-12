// src/utils/lunarData.js
// Shared lunar utility - suncalc-powered, replaces inline calculations
// Used by Calendar.js and EnergyAlmanac.js
// Phase 1: Accurate moon engine | Phase 2: Eclipse/event awareness

import SunCalc from 'suncalc';
import lunarEvents from '../data/lunarEvents.json';

// Default location for moonrise/moonset (New York)
const DEFAULT_LAT = 40.7128;
const DEFAULT_LNG = -74.0060;

const PHASE_MAP = [
  { max: 0.0508, phase: 'new',              isSignificant: true,  label: 'New Moon',        emoji: '\u{1F311}' },
  { max: 0.2498, phase: 'waxing-crescent',  isSignificant: false, label: 'Waxing Crescent', emoji: '\u{1F312}' },
  { max: 0.3125, phase: 'first-quarter',    isSignificant: false, label: 'First Quarter',   emoji: '\u{1F313}' },
  { max: 0.4404, phase: 'waxing-gibbous',   isSignificant: false, label: 'Waxing Gibbous',  emoji: '\u{1F314}' },
  { max: 0.5589, phase: 'full',             isSignificant: true,  label: 'Full Moon',       emoji: '\u{1F315}' },
  { max: 0.7164, phase: 'waning-gibbous',   isSignificant: false, label: 'Waning Gibbous',  emoji: '\u{1F316}' },
  { max: 0.7790, phase: 'last-quarter',     isSignificant: false, label: 'Last Quarter',    emoji: '\u{1F317}' },
  { max: 0.9649, phase: 'waning-crescent',  isSignificant: false, label: 'Waning Crescent', emoji: '\u{1F318}' },
  { max: 1.0001, phase: 'new',              isSignificant: true,  label: 'New Moon',        emoji: '\u{1F311}' }
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

const formatMoonTime = (date) => {
  if (!date || isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const getLunarData = (date, lat = DEFAULT_LAT, lng = DEFAULT_LNG) => {
  const d = date instanceof Date ? date : new Date(date);
  
  // Normalize to noon for phase classification so the label is identical
  // whether called at midnight (calendar day cells) or 2 PM (moon bar).
  // Moonrise/moonset still use the original date for accuracy.
  const noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  const moonIllum = SunCalc.getMoonIllumination(noon);
  const moonTimes = SunCalc.getMoonTimes(d, lat, lng);
  const entry = classifyPhase(moonIllum.phase);
  
  const synodicMonth = 29.53058867;
  const lunarAge = Math.round(moonIllum.phase * synodicMonth * 10) / 10;
  const illumination = Math.round(moonIllum.fraction * 100);
  
  const moonrise = formatMoonTime(moonTimes.rise);
  const moonset = formatMoonTime(moonTimes.set);
  const nextPhase = getNextPhaseTransition(noon);
  const specialEvent = getSpecialEvent(d);
  const energy = ENERGY_MAP[entry.phase] || '';
  
  return {
    phase: entry.phase,
    isSignificant: entry.isSignificant,
    label: entry.label,
    emoji: entry.emoji,
    illumination,
    lunarAge,
    cycleDay: Math.ceil(lunarAge) || 1,
    cycleTotal: 30,
    moonrise,
    moonset,
    nextPhase: { label: nextPhase.label, date: nextPhase.date, daysUntil: nextPhase.daysUntil },
    specialEvent,
    energy,
    _rawPhase: moonIllum.phase
  };
};

export const getMoonPhase = (date = new Date()) => {
  const data = getLunarData(date);
  return {
    phase: data.label,
    emoji: data.emoji,
    illumination: data.illumination,
    energy: data.energy,
    cycleDay: Math.floor(data.lunarAge)
  };
};

export default getLunarData;
