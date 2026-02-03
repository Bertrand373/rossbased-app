// src/components/EnergyAlmanac/EnergyAlmanac.js
// Personal Energy Almanac - Cycle-based daily forecast
// Replaces DailyTransmission with pure client-side calculations
// No API costs - all math done locally

import React, { useState, useEffect, useMemo } from 'react';
import './EnergyAlmanac.css';

// ============================================================
// CALCULATION ENGINES
// ============================================================

/**
 * Calculate moon phase (0-29.53 day cycle)
 * Returns phase name and percentage illumination
 */
const getMoonPhase = (date = new Date()) => {
  // Known new moon: January 6, 2000 at 18:14 UTC
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const lunarCycle = 29.53058867; // days
  
  const daysSinceKnown = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
  const currentCycleDay = daysSinceKnown % lunarCycle;
  const normalizedDay = currentCycleDay < 0 ? currentCycleDay + lunarCycle : currentCycleDay;
  
  // Calculate illumination (0-100%)
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * normalizedDay / lunarCycle)) / 2 * 100);
  
  // Determine phase name
  let phase, emoji, energy;
  if (normalizedDay < 1.85) {
    phase = 'New Moon';
    emoji = '🌑';
    energy = 'New beginnings, intention setting, introspection';
  } else if (normalizedDay < 7.38) {
    phase = 'Waxing Crescent';
    emoji = '🌒';
    energy = 'Building momentum, taking action on intentions';
  } else if (normalizedDay < 9.23) {
    phase = 'First Quarter';
    emoji = '🌓';
    energy = 'Challenges arise, decision points, commitment';
  } else if (normalizedDay < 14.77) {
    phase = 'Waxing Gibbous';
    emoji = '🌔';
    energy = 'Refinement, adjustment, patience before fruition';
  } else if (normalizedDay < 16.61) {
    phase = 'Full Moon';
    emoji = '🌕';
    energy = 'Peak energy, culmination, heightened emotions';
  } else if (normalizedDay < 22.15) {
    phase = 'Waning Gibbous';
    emoji = '🌖';
    energy = 'Gratitude, sharing wisdom, integration';
  } else if (normalizedDay < 23.99) {
    phase = 'Last Quarter';
    emoji = '🌗';
    energy = 'Release, forgiveness, letting go';
  } else {
    phase = 'Waning Crescent';
    emoji = '🌘';
    energy = 'Rest, reflection, preparation for renewal';
  }
  
  return { phase, emoji, illumination, energy, cycleDay: Math.floor(normalizedDay) };
};

/**
 * Calculate spermatogenesis cycle position
 * Full cycle: 64-74 days (we use 72 as average)
 */
const getSpermatogenesisPhase = (streakDays) => {
  const cycleLength = 72;
  const position = streakDays % cycleLength;
  
  let phase, description;
  if (position <= 16) {
    phase = 'Mitotic Division';
    description = 'Stem cells multiplying. Foundation building. Energy accumulating.';
  } else if (position <= 40) {
    phase = 'Meiotic Division';
    description = 'Genetic diversity creating. Deep cellular work. Transformation underway.';
  } else if (position <= 64) {
    phase = 'Maturation';
    description = 'Full development phase. Peak nutrient retention. Maximum reabsorption.';
  } else {
    phase = 'Complete Reabsorption';
    description = 'Cycle complete. Body optimizing. Highest transmutation potential.';
  }
  
  // Calculate cycle number
  const cycleNumber = Math.floor(streakDays / cycleLength) + 1;
  
  return { position, cycleLength, phase, description, cycleNumber };
};

/**
 * Calculate numerology Personal Day number
 * Formula: Birth Month + Birth Day + Current Month + Current Day + Current Year
 * Reduce to single digit (except master numbers 11, 22, 33)
 */
const getPersonalDay = (birthDate, currentDate = new Date()) => {
  if (!birthDate) return null;
  
  const birth = new Date(birthDate);
  const birthMonth = birth.getMonth() + 1;
  const birthDay = birth.getDate();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentYear = currentDate.getFullYear();
  
  // Reduce each component
  const reduceToDigit = (num) => {
    while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
      num = String(num).split('').reduce((a, b) => parseInt(a) + parseInt(b), 0);
    }
    return num;
  };
  
  const sum = birthMonth + birthDay + currentMonth + currentDay + 
              String(currentYear).split('').reduce((a, b) => parseInt(a) + parseInt(b), 0);
  
  const personalDay = reduceToDigit(sum);
  
  const meanings = {
    1: { theme: 'Initiative', guidance: 'Start new projects. Take leadership. Assert yourself.' },
    2: { theme: 'Cooperation', guidance: 'Partnership favored. Patience required. Diplomacy wins.' },
    3: { theme: 'Expression', guidance: 'Creative energy high. Communicate freely. Social connections.' },
    4: { theme: 'Foundation', guidance: 'Build structure. Practical work. Discipline rewarded.' },
    5: { theme: 'Change', guidance: 'Expect the unexpected. Adapt quickly. Freedom calls.' },
    6: { theme: 'Responsibility', guidance: 'Family matters. Service to others. Harmony at home.' },
    7: { theme: 'Reflection', guidance: 'Introspection day. Study and analyze. Trust intuition.' },
    8: { theme: 'Power', guidance: 'Business and finance favored. Authority recognized. Manifest.' },
    9: { theme: 'Completion', guidance: 'Release what no longer serves. Endings bring beginnings.' },
    11: { theme: 'Illumination', guidance: 'Master number day. Heightened intuition. Spiritual downloads.' },
    22: { theme: 'Master Builder', guidance: 'Master number day. Large visions. Practical idealism.' },
    33: { theme: 'Master Teacher', guidance: 'Master number day. Selfless service. Healing presence.' }
  };
  
  return { number: personalDay, ...meanings[personalDay] };
};

/**
 * Calculate Life Path number from birth date
 */
const getLifePath = (birthDate) => {
  if (!birthDate) return null;
  
  const birth = new Date(birthDate);
  const month = birth.getMonth() + 1;
  const day = birth.getDate();
  const year = birth.getFullYear();
  
  const reduceToDigit = (num) => {
    while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
      num = String(num).split('').reduce((a, b) => parseInt(a) + parseInt(b), 0);
    }
    return num;
  };
  
  const monthReduced = reduceToDigit(month);
  const dayReduced = reduceToDigit(day);
  const yearReduced = reduceToDigit(String(year).split('').reduce((a, b) => parseInt(a) + parseInt(b), 0));
  
  return reduceToDigit(monthReduced + dayReduced + yearReduced);
};

/**
 * Calculate Chinese Zodiac sign and element from birth year
 */
const getChineseZodiac = (birthDate, currentYear = new Date().getFullYear()) => {
  if (!birthDate) return null;
  
  const birth = new Date(birthDate);
  const birthYear = birth.getFullYear();
  
  const animals = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 
                   'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
  const elements = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
  
  const animalIndex = (birthYear - 4) % 12;
  const elementIndex = Math.floor(((birthYear - 4) % 10) / 2);
  const yinYang = birthYear % 2 === 0 ? 'Yang' : 'Yin';
  
  const animal = animals[animalIndex];
  const element = elements[elementIndex];
  
  // Current year animal
  const currentAnimalIndex = (currentYear - 4) % 12;
  const currentAnimal = animals[currentAnimalIndex];
  
  // Compatibility check
  const compatibleGroups = [
    ['Rat', 'Dragon', 'Monkey'],
    ['Ox', 'Snake', 'Rooster'],
    ['Tiger', 'Horse', 'Dog'],
    ['Rabbit', 'Goat', 'Pig']
  ];
  
  const conflictPairs = {
    'Rat': 'Horse', 'Horse': 'Rat',
    'Ox': 'Goat', 'Goat': 'Ox',
    'Tiger': 'Monkey', 'Monkey': 'Tiger',
    'Rabbit': 'Rooster', 'Rooster': 'Rabbit',
    'Dragon': 'Dog', 'Dog': 'Dragon',
    'Snake': 'Pig', 'Pig': 'Snake'
  };
  
  let yearEnergy;
  if (animal === currentAnimal) {
    yearEnergy = 'Ben Ming Nian (Birth Year) - Take extra care, wear red for protection';
  } else if (conflictPairs[animal] === currentAnimal) {
    yearEnergy = 'Conflict Year - Navigate challenges with patience and awareness';
  } else if (compatibleGroups.find(g => g.includes(animal) && g.includes(currentAnimal))) {
    yearEnergy = 'Harmonious Year - Natural support and favorable conditions';
  } else {
    yearEnergy = 'Neutral Year - Standard conditions, rely on personal effort';
  }
  
  return { animal, element, yinYang, currentAnimal, yearEnergy };
};

/**
 * Generate synthesized forecast based on all cycles
 */
const generateForecast = (moonData, spermaData, personalDay, zodiac, streakDays) => {
  const forecasts = [];
  
  // Spermatogenesis insight (always available)
  if (spermaData.position <= 16) {
    forecasts.push(`Day ${streakDays} places you in the foundation phase of cycle ${spermaData.cycleNumber}. Energy is accumulating at the cellular level.`);
  } else if (spermaData.position <= 40) {
    forecasts.push(`Deep transformation underway in cycle ${spermaData.cycleNumber}. Your body is doing profound work beneath the surface.`);
  } else if (spermaData.position <= 64) {
    forecasts.push(`Entering peak maturation in cycle ${spermaData.cycleNumber}. Maximum nutrient retention. Channel this power consciously.`);
  } else {
    forecasts.push(`Full reabsorption active in cycle ${spermaData.cycleNumber}. Your body has optimized for retention. Transmutation potential is highest.`);
  }
  
  // Moon phase synergy
  if (moonData.phase === 'Full Moon') {
    forecasts.push('Full moon amplifies your energy field. Others may notice your presence more today.');
  } else if (moonData.phase === 'New Moon') {
    forecasts.push('New moon favors intention setting. What you focus on today plants seeds.');
  } else if (moonData.phase.includes('Waxing')) {
    forecasts.push('Lunar energy is building. Good day for taking action and building momentum.');
  } else {
    forecasts.push('Lunar energy in release phase. Good for reflection, integration, and letting go.');
  }
  
  // Numerology layer (if birth date provided)
  if (personalDay) {
    if (personalDay.number === 7) {
      forecasts.push('Personal Day 7 calls for solitude and introspection. Trust your inner knowing.');
    } else if (personalDay.number === 1) {
      forecasts.push('Personal Day 1 supports new initiatives. Your leadership energy is heightened.');
    } else if (personalDay.number === 8) {
      forecasts.push('Personal Day 8 favors business and material matters. Manifestation potential is strong.');
    } else if ([11, 22, 33].includes(personalDay.number)) {
      forecasts.push(`Master number ${personalDay.number} day. Heightened spiritual frequency. Pay attention to signs.`);
    }
  }
  
  // Chinese zodiac layer (if birth date provided)
  if (zodiac && zodiac.yearEnergy.includes('Harmonious')) {
    forecasts.push('Year of the ' + zodiac.currentAnimal + ' supports your ' + zodiac.animal + ' energy.');
  }
  
  return forecasts.slice(0, 3).join(' ');
};

// ============================================================
// COMPONENT
// ============================================================

const EnergyAlmanac = ({ userData, isPatternAlertShowing }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calculate all cycles
  const calculations = useMemo(() => {
    const today = new Date();
    const streakDays = userData?.currentStreak || 1;
    const birthDate = userData?.birthDate;
    
    const moon = getMoonPhase(today);
    const sperma = getSpermatogenesisPhase(streakDays);
    const personalDay = getPersonalDay(birthDate, today);
    const lifePath = getLifePath(birthDate);
    const zodiac = getChineseZodiac(birthDate);
    
    const forecast = generateForecast(moon, sperma, personalDay, zodiac, streakDays);
    
    return { moon, sperma, personalDay, lifePath, zodiac, forecast, streakDays };
  }, [userData?.currentStreak, userData?.birthDate]);
  
  // Don't render if pattern alert is showing
  if (isPatternAlertShowing) {
    return null;
  }
  
  // Don't render if no start date
  if (!userData?.startDate) {
    return null;
  }
  
  const { moon, sperma, personalDay, zodiac, forecast, streakDays } = calculations;
  
  const handleExpand = () => {
    setIsExpanded(true);
  };
  
  const handleClose = () => {
    setIsExpanded(false);
  };
  
  return (
    <>
      {/* Collapsed Card */}
      <div 
        className={`energy-almanac ${isExpanded ? 'hidden-for-expand' : ''}`}
        onClick={handleExpand}
      >
        <div className="almanac-header">
          <span className="almanac-icon">◈</span>
          <span className="almanac-label">Today's Alignment</span>
          <span className="almanac-expand-hint">+</span>
        </div>
        
        {/* Quick Stats Row */}
        <div className="almanac-quick-stats">
          <div className="quick-stat">
            <span className="stat-emoji">{moon.emoji}</span>
            <span className="stat-label">{moon.phase}</span>
          </div>
          <div className="quick-stat-divider">·</div>
          <div className="quick-stat">
            <span className="stat-value">Day {sperma.position}</span>
            <span className="stat-label">of 72</span>
          </div>
          {personalDay && (
            <>
              <div className="quick-stat-divider">·</div>
              <div className="quick-stat">
                <span className="stat-value">{personalDay.number}</span>
                <span className="stat-label">{personalDay.theme}</span>
              </div>
            </>
          )}
        </div>
        
        {/* Forecast Preview */}
        <p className="almanac-forecast-preview">
          {forecast.substring(0, 120)}{forecast.length > 120 ? '...' : ''}
        </p>
      </div>
      
      {/* Expanded Overlay */}
      {isExpanded && (
        <>
          <div className="almanac-overlay" onClick={handleClose} />
          <div className="almanac-expanded">
            <div className="almanac-header">
              <span className="almanac-icon">◈</span>
              <span className="almanac-label">Today's Alignment</span>
              <button className="almanac-close" onClick={handleClose}>×</button>
            </div>
            
            {/* Full Cycles Display */}
            <div className="almanac-cycles">
              
              {/* Spermatogenesis */}
              <div className="cycle-row">
                <div className="cycle-icon">⟳</div>
                <div className="cycle-content">
                  <div className="cycle-title">
                    <span className="cycle-name">Spermatogenesis</span>
                    <span className="cycle-value">Day {sperma.position} of {sperma.cycleLength}</span>
                  </div>
                  <div className="cycle-phase">{sperma.phase} · Cycle {sperma.cycleNumber}</div>
                  <div className="cycle-bar">
                    <div 
                      className="cycle-progress" 
                      style={{ width: `${(sperma.position / sperma.cycleLength) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Moon Phase */}
              <div className="cycle-row">
                <div className="cycle-icon">{moon.emoji}</div>
                <div className="cycle-content">
                  <div className="cycle-title">
                    <span className="cycle-name">Lunar Phase</span>
                    <span className="cycle-value">{moon.illumination}% illuminated</span>
                  </div>
                  <div className="cycle-phase">{moon.phase}</div>
                  <div className="cycle-desc">{moon.energy}</div>
                </div>
              </div>
              
              {/* Personal Day (if birth date) */}
              {personalDay && (
                <div className="cycle-row">
                  <div className="cycle-icon cycle-number">{personalDay.number}</div>
                  <div className="cycle-content">
                    <div className="cycle-title">
                      <span className="cycle-name">Personal Day</span>
                      <span className="cycle-value">{personalDay.theme}</span>
                    </div>
                    <div className="cycle-desc">{personalDay.guidance}</div>
                  </div>
                </div>
              )}
              
              {/* Chinese Zodiac (if birth date) */}
              {zodiac && (
                <div className="cycle-row">
                  <div className="cycle-icon">龍</div>
                  <div className="cycle-content">
                    <div className="cycle-title">
                      <span className="cycle-name">{zodiac.element} {zodiac.animal}</span>
                      <span className="cycle-value">{zodiac.yinYang}</span>
                    </div>
                    <div className="cycle-desc">{zodiac.yearEnergy}</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Full Forecast */}
            <div className="almanac-forecast-full">
              <div className="forecast-label">Today's Synthesis</div>
              <p className="forecast-text">{forecast}</p>
            </div>
            
            {/* Birth Date Prompt (if not set) */}
            {!userData?.birthDate && (
              <div className="almanac-birth-prompt">
                <span>Add your birth date in Profile for numerology and zodiac insights</span>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default EnergyAlmanac;
