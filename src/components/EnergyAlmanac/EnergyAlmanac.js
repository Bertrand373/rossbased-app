// src/components/EnergyAlmanac/EnergyAlmanac.js
// Personal Energy Almanac - Cycle-based daily forecast
// Replaces DailyTransmission with pure client-side calculations
// No API costs - all math done locally
// UPDATED: Expanded modal uses shared BottomSheet.css pattern

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import './EnergyAlmanac.css';
import '../../styles/BottomSheet.css';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

const API_URL = process.env.REACT_APP_API_URL || 'https://rossbased-app.onrender.com';

// ============================================================
// LUNAR NEW YEAR DATES (for accurate Chinese Zodiac)
// ============================================================

const LUNAR_NEW_YEAR_DATES = {
  2020: '2020-01-25', 2021: '2021-02-12', 2022: '2022-02-01',
  2023: '2023-01-22', 2024: '2024-02-10', 2025: '2025-01-29',
  2026: '2026-02-17', 2027: '2027-02-06', 2028: '2028-01-26',
  2029: '2029-02-13', 2030: '2030-02-03'
};

/**
 * Get the Chinese zodiac year for a given date
 * Accounts for Lunar New Year (year doesn't start Jan 1)
 */
const getChineseYear = (date) => {
  const year = date.getFullYear();
  const lnyDate = LUNAR_NEW_YEAR_DATES[year];
  
  if (lnyDate && date < new Date(lnyDate)) {
    return year - 1; // Before Lunar New Year = previous year's animal
  }
  return year;
};

// ============================================================
// CALCULATION ENGINES
// ============================================================

/**
 * Calculate moon phase (0-29.53 day cycle)
 */
const getMoonPhase = (date = new Date()) => {
  const knownNewMoon = new Date('2025-01-29T12:36:00Z');
  const lunarCycle = 29.53058867;
  
  const daysSinceKnown = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
  const currentCycleDay = ((daysSinceKnown % lunarCycle) + lunarCycle) % lunarCycle;
  
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * currentCycleDay / lunarCycle)) / 2 * 100);
  
  let phase, emoji, energy;
  if (currentCycleDay < 1.5 || currentCycleDay >= 28.5) {
    phase = 'New Moon'; emoji = '🌑';
    energy = 'New beginnings, intention setting, introspection';
  } else if (currentCycleDay < 7.38) {
    phase = 'Waxing Crescent'; emoji = '🌒';
    energy = 'Building momentum, taking action on intentions';
  } else if (currentCycleDay < 9.23) {
    phase = 'First Quarter'; emoji = '🌓';
    energy = 'Challenges arise, decision points, commitment';
  } else if (currentCycleDay < 13.0) {
    phase = 'Waxing Gibbous'; emoji = '🌔';
    energy = 'Refinement, adjustment, patience before fruition';
  } else if (currentCycleDay < 16.5) {
    phase = 'Full Moon'; emoji = '🌕';
    energy = 'Peak energy, culmination, heightened emotions';
  } else if (currentCycleDay < 21.15) {
    phase = 'Waning Gibbous'; emoji = '🌖';
    energy = 'Gratitude, sharing wisdom, integration';
  } else if (currentCycleDay < 23.0) {
    phase = 'Last Quarter'; emoji = '🌗';
    energy = 'Release, forgiveness, letting go';
  } else {
    phase = 'Waning Crescent'; emoji = '🌘';
    energy = 'Rest, reflection, preparation for renewal';
  }
  
  return { phase, emoji, illumination, energy, cycleDay: Math.floor(currentCycleDay) };
};

/**
 * Calculate spermatogenesis cycle position (72-day cycle)
 */
const getSpermatogenesisPhase = (streakDays) => {
  const cycleLength = 72;
  const position = streakDays % cycleLength;
  
  let phase, description;
  if (position <= 16) {
    phase = 'Mitotic Division';
    description = 'Stem cells multiplying. Foundation building.';
  } else if (position <= 40) {
    phase = 'Meiotic Division';
    description = 'Deep cellular transformation underway.';
  } else if (position <= 64) {
    phase = 'Maturation';
    description = 'Peak nutrient retention. Maximum reabsorption.';
  } else {
    phase = 'Complete Reabsorption';
    description = 'Highest transmutation potential.';
  }
  
  const cycleNumber = Math.floor(streakDays / cycleLength) + 1;
  
  return { position, cycleLength, phase, description, cycleNumber };
};

/**
 * Calculate Personal Day number (numerology)
 */
const getPersonalDay = (birthDate, currentDate = new Date()) => {
  if (!birthDate) return null;
  
  const birth = new Date(birthDate);
  const birthMonth = birth.getMonth() + 1;
  const birthDay = birth.getDate();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentYear = currentDate.getFullYear();
  
  const reduceToDigit = (num) => {
    while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
      num = String(num).split('').reduce((a, b) => parseInt(a) + parseInt(b), 0);
    }
    return num;
  };
  
  const birthSum = reduceToDigit(birthMonth + birthDay);
  const yearSum = reduceToDigit(
    String(currentYear).split('').reduce((a, b) => parseInt(a) + parseInt(b), 0)
  );
  const dateSum = reduceToDigit(currentMonth + currentDay);
  
  const personalDay = reduceToDigit(birthSum + yearSum + dateSum);
  
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
 * Calculate Chinese Zodiac with proper Lunar New Year dates
 */
const getChineseZodiac = (birthDate, currentDate = new Date()) => {
  if (!birthDate) return null;
  
  const birth = new Date(birthDate);
  
  const animals = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 
                   'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
  const elements = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
  
  const birthChineseYear = getChineseYear(birth);
  const currentChineseYear = getChineseYear(currentDate);
  
  const animalIndex = (birthChineseYear - 4) % 12;
  const elementIndex = Math.floor(((birthChineseYear - 4) % 10) / 2);
  const yinYang = birthChineseYear % 2 === 0 ? 'Yang' : 'Yin';
  
  const animal = animals[animalIndex];
  const element = elements[elementIndex];
  
  const currentAnimalIndex = (currentChineseYear - 4) % 12;
  const currentAnimal = animals[currentAnimalIndex];
  
  const conflictPairs = {
    'Rat': 'Horse', 'Horse': 'Rat',
    'Ox': 'Goat', 'Goat': 'Ox',
    'Tiger': 'Monkey', 'Monkey': 'Tiger',
    'Rabbit': 'Rooster', 'Rooster': 'Rabbit',
    'Dragon': 'Dog', 'Dog': 'Dragon',
    'Snake': 'Pig', 'Pig': 'Snake'
  };
  
  const compatibleGroups = [
    ['Rat', 'Dragon', 'Monkey'],
    ['Ox', 'Snake', 'Rooster'],
    ['Tiger', 'Horse', 'Dog'],
    ['Rabbit', 'Goat', 'Pig']
  ];
  
  let yearEnergy, yearType;
  if (animal === currentAnimal) {
    yearType = 'benming';
    yearEnergy = 'Ben Ming Nian (本命年) - Your birth year returns. Wear red for protection.';
  } else if (conflictPairs[animal] === currentAnimal) {
    yearType = 'conflict';
    yearEnergy = `Conflict Year - ${animal} and ${currentAnimal} clash. Navigate with awareness.`;
  } else if (compatibleGroups.find(g => g.includes(animal) && g.includes(currentAnimal))) {
    yearType = 'harmonious';
    yearEnergy = `Harmonious Year - ${currentAnimal} supports your ${animal} energy.`;
  } else {
    yearType = 'neutral';
    yearEnergy = 'Neutral Year - Standard conditions. Success through personal effort.';
  }
  
  return { animal, element, yinYang, currentAnimal, yearEnergy, yearType };
};

/**
 * Generate synthesized forecast
 */
const generateForecast = (moonData, spermaData, personalDay, zodiac, streakDays) => {
  const forecasts = [];
  
  if (spermaData.position <= 16) {
    forecasts.push(`Day ${streakDays}. Foundation phase of cycle ${spermaData.cycleNumber}. Energy accumulating.`);
  } else if (spermaData.position <= 40) {
    forecasts.push(`Day ${streakDays}. Deep transformation in cycle ${spermaData.cycleNumber}. Profound work beneath the surface.`);
  } else if (spermaData.position <= 64) {
    forecasts.push(`Day ${streakDays}. Peak maturation in cycle ${spermaData.cycleNumber}. Channel this power consciously.`);
  } else {
    forecasts.push(`Day ${streakDays}. Full reabsorption in cycle ${spermaData.cycleNumber}. Transmutation potential highest.`);
  }
  
  if (moonData.phase === 'Full Moon') {
    forecasts.push('Full moon amplifies your field. Others notice your presence.');
  } else if (moonData.phase === 'New Moon') {
    forecasts.push('New moon favors intention setting. What you focus on plants seeds.');
  } else if (moonData.phase.includes('Waxing')) {
    forecasts.push('Lunar energy building. Good for action and momentum.');
  } else {
    forecasts.push('Lunar energy releasing. Good for reflection and letting go.');
  }
  
  if (personalDay) {
    if ([11, 22, 33].includes(personalDay.number)) {
      forecasts.push(`Master number ${personalDay.number}. Heightened spiritual frequency.`);
    }
  }
  
  return forecasts.join(' ');
};

// ============================================================
// COMPONENT
// ============================================================

const EnergyAlmanac = ({ userData, isPatternAlertShowing }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiSynthesis, setAiSynthesis] = useState(null);

  // Bottom sheet state
  const [showContent, setShowContent] = useState(false);
  const [sheetReady, setSheetReady] = useState(false);
  const sheetPanelRef = useRef(null);
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const isDragging = useRef(false);

  // Lock body scroll when sheet is open
  useBodyScrollLock(showContent);

  // Sheet mount/unmount + animation
  useEffect(() => {
    if (isExpanded) {
      setShowContent(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSheetReady(true));
      });
    } else {
      setSheetReady(false);
      const timer = setTimeout(() => setShowContent(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Animated close
  const closeSheet = useCallback((cb) => {
    setSheetReady(false);
    setTimeout(cb, 300);
  }, []);

  const handleClose = useCallback(() => closeSheet(() => setIsExpanded(false)), [closeSheet]);

  // Swipe-to-dismiss
  const onTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
    isDragging.current = false;
  }, []);

  const onTouchMove = useCallback((e) => {
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta < 0) return;
    if (delta > 10) {
      isDragging.current = true;
      touchDeltaY.current = delta;
      if (sheetPanelRef.current) {
        sheetPanelRef.current.style.transform = `translateY(${delta}px)`;
        sheetPanelRef.current.style.transition = 'none';
      }
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    if (sheetPanelRef.current) {
      sheetPanelRef.current.style.transition = '';
      sheetPanelRef.current.style.transform = '';
    }
    if (touchDeltaY.current > 80) {
      handleClose();
    }
    isDragging.current = false;
  }, [handleClose]);
  
  const calculations = useMemo(() => {
    const today = new Date();
    const streakDays = userData?.currentStreak || 1;
    const birthDate = userData?.birthDate;
    
    const moon = getMoonPhase(today);
    const sperma = getSpermatogenesisPhase(streakDays);
    const personalDay = getPersonalDay(birthDate, today);
    const zodiac = getChineseZodiac(birthDate, today);
    const forecast = generateForecast(moon, sperma, personalDay, zodiac, streakDays);
    
    return { moon, sperma, personalDay, zodiac, forecast, streakDays };
  }, [userData?.currentStreak, userData?.birthDate]);

  // Fetch AI-generated synthesis
  useEffect(() => {
    const fetchSynthesis = async () => {
      const token = localStorage.getItem('token');
      if (!token || !userData?.startDate) return;

      const { moon, sperma, personalDay, zodiac, streakDays } = calculations;

      const todayKey = new Date().toLocaleDateString('en-CA');
      const cacheKey = `synthesis_${todayKey}_${streakDays}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setAiSynthesis(cached);
        return;
      }

      try {
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const response = await fetch(`${API_URL}/api/transmission/synthesis`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            streakDays,
            sperma: { position: sperma.position, cycleLength: sperma.cycleLength, cycleNumber: sperma.cycleNumber, phase: sperma.phase, description: sperma.description },
            moon: { phase: moon.phase, illumination: moon.illumination, energy: moon.energy },
            personalDay: personalDay ? { number: personalDay.number, theme: personalDay.theme, guidance: personalDay.guidance } : null,
            zodiac: zodiac ? { animal: zodiac.animal, element: zodiac.element, yinYang: zodiac.yinYang, currentAnimal: zodiac.currentAnimal, yearType: zodiac.yearType, yearEnergy: zodiac.yearEnergy } : null,
            timezone: detectedTimezone
          })
        });

        if (response.ok) {
          const data = await response.json();
          setAiSynthesis(data.synthesis);
          Object.keys(localStorage).forEach(k => {
            if (k.startsWith('synthesis_') && k !== cacheKey) localStorage.removeItem(k);
          });
          localStorage.setItem(cacheKey, data.synthesis);
        }
      } catch (err) {
        console.error('Synthesis fetch error:', err);
      }
    };

    fetchSynthesis();
  }, [calculations, userData?.startDate]);
  
  if (isPatternAlertShowing || !userData?.startDate) {
    return null;
  }
  
  const { moon, sperma, personalDay, zodiac, forecast } = calculations;
  
  return (
    <>
      {/* Ghost line — single clean data point, tappable */}
      <p className="almanac-ghost" onClick={() => setIsExpanded(true)}>
        <span className="almanac-ghost-phase">{sperma.phase}</span>
        <span className="almanac-ghost-dot">·</span>
        <span className="almanac-ghost-day">Day {sperma.position} of {sperma.cycleLength}</span>
      </p>
      
      {/* Expanded Bottom Sheet */}
      {showContent && (
        <div className={`sheet-backdrop almanac-backdrop${sheetReady ? ' open' : ''}`} onClick={handleClose}>
          <div 
            ref={sheetPanelRef}
            className={`sheet-panel almanac-sheet${sheetReady ? ' open' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div 
              className="sheet-header"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            />

            {/* Header */}
            <div className="almanac-modal-header">
              <h2>Today's Alignment</h2>
            </div>
            
            {/* Scrollable Content */}
            <div className="almanac-modal-scroll">
              <div className="almanac-modal-body">
                
                {/* Spermatogenesis */}
                <div className="almanac-row">
                  <span className="almanac-row-label">Spermatogenesis</span>
                  <div className="almanac-row-header">
                    <span className="almanac-row-title">{sperma.phase}</span>
                    <span className="almanac-row-value">Day {sperma.position} of {sperma.cycleLength}</span>
                  </div>
                  <span className="almanac-row-phase">Cycle {sperma.cycleNumber}</span>
                  <span className="almanac-row-desc">{sperma.description}</span>
                  <div className="almanac-progress">
                    <div 
                      className="almanac-progress-fill" 
                      style={{ width: `${(sperma.position / sperma.cycleLength) * 100}%` }}
                    />
                  </div>
                </div>
                
                {/* Moon Phase */}
                <div className="almanac-row">
                  <span className="almanac-row-label">Lunar Phase</span>
                  <div className="almanac-row-header">
                    <span className="almanac-row-title">{moon.emoji} {moon.phase}</span>
                    <span className="almanac-row-value">{moon.illumination}% illuminated</span>
                  </div>
                  <span className="almanac-row-desc">{moon.energy}</span>
                </div>
                
                {/* Personal Day */}
                {personalDay && (
                  <div className="almanac-row">
                    <span className="almanac-row-label">Personal Day</span>
                    <div className="almanac-row-header">
                      <span className="almanac-row-title">{personalDay.number} · {personalDay.theme}</span>
                    </div>
                    <span className="almanac-row-desc">{personalDay.guidance}</span>
                  </div>
                )}
                
                {/* Chinese Zodiac */}
                {zodiac && (
                  <div className={`almanac-row almanac-zodiac ${zodiac.yearType}`}>
                    <span className="almanac-row-label">Chinese Zodiac</span>
                    <div className="almanac-row-header">
                      <span className="almanac-row-title">{zodiac.element} {zodiac.animal}</span>
                      <span className="almanac-row-value">{zodiac.yinYang}</span>
                    </div>
                    <span className="almanac-row-desc">{zodiac.yearEnergy}</span>
                  </div>
                )}
                
                {/* Synthesis */}
                <div className="almanac-synthesis">
                  <span className="almanac-synthesis-label">Synthesis</span>
                  <p className="almanac-synthesis-text">{aiSynthesis || forecast}</p>
                </div>
                
                {/* Birth Date Prompt */}
                {!userData?.birthDate && (
                  <div className="almanac-prompt">
                    Add birth date in Profile for numerology & zodiac insights
                  </div>
                )}
                
              </div>
            </div>
            
            {/* Footer with Done button */}
            <div className="almanac-modal-footer">
              <button 
                className="almanac-btn-ghost" 
                onClick={handleClose}
              >
                Done
              </button>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
};

export default EnergyAlmanac;
