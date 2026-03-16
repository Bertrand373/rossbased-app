// Tracker.js - TITANTRACK
// UPDATED: AI pattern alert now uses bottom sheet (force-open when risk elevated)
// UPDATED: Added mutual exclusion between pattern alert sheet and EnergyAlmanac
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import './Tracker.css';
import '../../styles/BottomSheet.css';
import useSheetSwipe from '../../hooks/useSheetSwipe';
import '../PredictionDisplay/PredictionDisplay.css';
import DatePicker from '../Shared/DatePicker';
import PatternInsightCard from '../PatternInsight/PatternInsightCard';
import EnergyAlmanac from '../EnergyAlmanac/EnergyAlmanac';
import OnboardingGuide from '../OnboardingGuide/OnboardingGuide';
import OraclePulse from '../OraclePulse/OraclePulse';
import { getLunarData } from '../../utils/lunarData';

// NEW: Import InterventionService for ML feedback loop
import interventionService from '../../services/InterventionService';

// Mixpanel Analytics
import { trackDailyLog, trackStreakReset } from '../../utils/mixpanel';

const Tracker = ({ userData, updateUserData, isPremium, onUpgrade }) => {
  const navigate = useNavigate();

  // Timezone-safe date utility — convert any date value to "yyyy-MM-dd" for storage
  const toDateString = (val) => {
    if (!val) return null;
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    return format(new Date(val), 'yyyy-MM-dd');
  };

  // Parse any stored date (string or legacy Date) to local midnight for math
  const toLocalMidnight = (val) => {
    if (!val) return null;
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    // Legacy Date object — extract UTC components to avoid timezone shift
    const d = new Date(val);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  };
  
  // FIXED: Only show date picker if user has completed onboarding but hasn't set date
  const [showDatePicker, setShowDatePicker] = useState(!userData.startDate && userData.hasSeenOnboarding);
  const [showBenefits, setShowBenefits] = useState(false);
  const [showStreakOptions, setShowStreakOptions] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetType, setResetType] = useState(null);
  
  // Pattern alert sheet — forced open by headless AI detector
  const [showPatternAlert, setShowPatternAlert] = useState(false);
  const [patternSheetReady, setPatternSheetReady] = useState(false);
  const [patternPrediction, setPatternPrediction] = useState(null);
  const patternInterventionIdRef = useRef(null);
  
  // Onboarding starts hidden — only shows after user clears the paywall
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Show onboarding for ALL new users — teaching app basics isn't a premium feature
  useEffect(() => {
    if (!userData.hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [userData.hasSeenOnboarding]);
  
  // Deferred login toast — fires after route swap has settled
  // If onboarding will show, leave toast in sessionStorage for handleOnboardingComplete
  useEffect(() => {
    const msg = sessionStorage.getItem('login_toast');
    if (msg && userData.hasSeenOnboarding) {
      const duration = parseInt(sessionStorage.getItem('login_toast_duration') || '2500', 10);
      sessionStorage.removeItem('login_toast');
      sessionStorage.removeItem('login_toast_duration');
      // Small delay ensures Toaster is fully mounted and visible
      setTimeout(() => toast.success(msg, { duration }), 300);
    }
  }, []);
  
  // FIXED: Initialize from sessionStorage to prevent almanac flash on tab switches
  const [isPatternAlertShowing, setIsPatternAlertShowing] = useState(
    sessionStorage.getItem('pattern_alert_active') === 'true' && 
    sessionStorage.getItem('pattern_insight_dismissed') !== 'true'
  );
  
  const [benefits, setBenefits] = useState({ 
    energy: 5, focus: 5, confidence: 5, aura: 5, sleep: 5, workout: 5,
    anxiety: 5, mood: 5, clarity: 5
  });
  
  // Track if user touched any emotional slider (prevents logging defaults as real data)
  const [emotionalTouched, setEmotionalTouched] = useState(false);
  
  // Peak State Recording — prompt after high benefit logs
  const [showPeakPrompt, setShowPeakPrompt] = useState(false);
  const [peakMessage, setPeakMessage] = useState('');
  const [showLogLock, setShowLogLock] = useState(false);
  
  // Bottom sheet animation state
  const [sheetReady, setSheetReady] = useState(false);
  const [benefitsReady, setBenefitsReady] = useState(false);
  const [peakSheetReady, setPeakSheetReady] = useState(false);
  const sheetPanelRef = useRef(null);
  
  // Live clock state - updates every minute
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const fillRefs = useRef({});
  const snapRafRef = useRef({});
  const benefitsRef = useRef(benefits);
  const sliderTouchRef = useRef({ startX: 0, startY: 0, axis: null, key: null });
  
  // Post-log insight flash
  const [postLogInsight, setPostLogInsight] = useState(null);
  const insightTimerRef = useRef(null);
  
  // Body scroll lock removed - parent containers now have overflow:hidden
  
  // Use stored currentStreak for consistency across all tabs
  const streak = userData.currentStreak || 1;

  // Free users get 14 lifetime benefit logs (not per-streak, total)
  // Once used, upgrade to Premium for unlimited logging
  const FREE_LOG_LIMIT = 14;
  const totalLogs = userData.benefitTracking?.length || 0;
  const canLogBenefits = isPremium || totalLogs < FREE_LOG_LIMIT;

  const todayEntry = userData.benefitTracking?.find(
    b => format(new Date(b.date), 'yyyy-MM-dd') === format(currentTime, 'yyyy-MM-dd')
  );
  const todayLogged = !!todayEntry;
  const todayScore = todayEntry 
    ? (((todayEntry.energy || 5) + (todayEntry.focus || 5) + (todayEntry.confidence || 5) + 
       (todayEntry.aura || 5) + (todayEntry.sleep || 5) + (todayEntry.workout || 5)) / 6).toFixed(1)
    : null;

  // Live clock effect - updates every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every 60 seconds
    
    return () => clearInterval(timer);
  }, []);

  // Bottom sheet animation: trigger .open class after mount
  useEffect(() => {
    if (showStreakOptions || showResetConfirm || showLogLock || showDatePicker) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSheetReady(true));
      });
    } else {
      setSheetReady(false);
    }
  }, [showStreakOptions, showResetConfirm, showLogLock, showDatePicker]);

  // Pattern alert sheet animation
  useEffect(() => {
    if (showPatternAlert) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPatternSheetReady(true));
      });
    } else {
      setPatternSheetReady(false);
    }
  }, [showPatternAlert]);

  // Sync almanac visibility with pattern alert sheet
  useEffect(() => {
    setIsPatternAlertShowing(showPatternAlert);
  }, [showPatternAlert]);

  // Benefits sheet - dedicated state to prevent race conditions
  useEffect(() => {
    if (showBenefits) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setBenefitsReady(true));
      });
    } else {
      setBenefitsReady(false);
      setPostLogInsight(null);
      if (insightTimerRef.current) {
        clearTimeout(insightTimerRef.current);
        insightTimerRef.current = null;
      }
    }
  }, [showBenefits]);

  // Peak state sheet animation
  useEffect(() => {
    if (showPeakPrompt) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPeakSheetReady(true));
      });
    } else {
      setPeakSheetReady(false);
    }
  }, [showPeakPrompt]);

  // Load existing benefits for today
  useEffect(() => {
    const existing = userData.benefitTracking?.find(
      b => format(new Date(b.date), 'yyyy-MM-dd') === format(currentTime, 'yyyy-MM-dd')
    );
    if (existing) {
      setBenefits({
        energy: existing.energy || 5,
        focus: existing.focus || 5,
        confidence: existing.confidence || 5,
        aura: existing.aura || 5,
        sleep: existing.sleep || 5,
        workout: existing.workout || 5,
        anxiety: existing.anxiety || 5,
        mood: existing.mood || 5,
        clarity: existing.clarity || 5
      });
      // If this entry already has emotional data, mark as touched
      if (typeof existing.anxiety === 'number') {
        setEmotionalTouched(true);
      }
    }
  }, [userData.benefitTracking, currentTime]);

  // Keep benefitsRef in sync for snap animation (avoids stale closures)
  useEffect(() => { benefitsRef.current = benefits; }, [benefits]);

  // Cleanup snap animations on unmount
  useEffect(() => {
    return () => {
      Object.values(snapRafRef.current).forEach(id => cancelAnimationFrame(id));
      if (insightTimerRef.current) clearTimeout(insightTimerRef.current);
    };
  }, []);

  // Milestone calculation
  const getNextMilestone = () => {
    const milestones = [7, 14, 30, 60, 90, 180, 365];
    if (streak >= 365) {
      const years = Math.floor(streak / 365);
      return `Year ${years}`;
    }
    const next = milestones.find(m => streak < m);
    return next ? `${next - streak} to ${next}` : null;
  };

  const milestone = getNextMilestone();

  // FIXED: Handle onboarding complete - show date picker if needed
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Defer API call so it doesn't break React's state batching
    setTimeout(() => updateUserData({ hasSeenOnboarding: true }), 0);
    
    // Fire deferred login toast now that onboarding overlay is gone
    const msg = sessionStorage.getItem('login_toast');
    if (msg) {
      const duration = parseInt(sessionStorage.getItem('login_toast_duration') || '2500', 10);
      sessionStorage.removeItem('login_toast');
      sessionStorage.removeItem('login_toast_duration');
      setTimeout(() => toast.success(msg, { duration }), 600);
    }
  };


  // Date submit - no toast, modal closing is confirmation
  const handleDateSubmit = (date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const picked = new Date(date);
    picked.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((now - picked) / (1000 * 60 * 60 * 24));
    // ONE-BASED COUNTING: Day 1 = start day (matches calendar display)
    const newStreak = Math.max(1, daysDiff + 1);
    
    const dateStr = toDateString(date);
    
    // Update streakHistory to include the current active streak
    // This is required for the Calendar to properly display streak days
    let updatedStreakHistory = [...(userData.streakHistory || [])];
    
    // Find and remove any existing active streak (no end date)
    const activeStreakIndex = updatedStreakHistory.findIndex(s => !s.end);
    if (activeStreakIndex !== -1) {
      updatedStreakHistory.splice(activeStreakIndex, 1);
    }
    
    // Add the new active streak with the selected start date
    updatedStreakHistory.push({
      id: updatedStreakHistory.length + 1,
      start: dateStr,
      end: null,
      days: newStreak,
      reason: null,
      trigger: null
    });
    
    updateUserData({
      startDate: dateStr,
      currentStreak: newStreak,
      longestStreak: Math.max(userData.longestStreak || 0, newStreak),
      streakHistory: updatedStreakHistory
    });
    setShowDatePicker(false);
  };

  // Bottom sheet: animate close then run callback
  const closeSheet = useCallback((callback) => {
    setSheetReady(false);
    setTimeout(() => {
      callback();
    }, 300);
  }, []);

  // Benefits sheet: dedicated close handler
  const closeBenefits = useCallback((callback) => {
    setBenefitsReady(false);
    setTimeout(() => {
      callback();
    }, 300);
  }, []);

  // Peak state sheet: animate close then run callback
  const closePeakSheet = useCallback((callback) => {
    setPeakSheetReady(false);
    setTimeout(() => {
      callback();
    }, 300);
  }, []);

  // Swipe-to-dismiss — non-passive native listeners so iOS respects preventDefault
  const isEditingDate = showDatePicker && !!userData.startDate;
  const trackerSheetVisible = showStreakOptions || showResetConfirm || showLogLock || showPeakPrompt || showPatternAlert || isEditingDate;
  const handleSwipeDismiss = useCallback(() => {
    setShowStreakOptions(false);
    setShowResetConfirm(false);
    setShowLogLock(false);
    setShowBenefits(false);
    setShowPeakPrompt(false);
    setShowDatePicker(false);
    setPeakMessage('');
    if (patternInterventionIdRef.current) {
      interventionService.recordResponse(patternInterventionIdRef.current, 'dismissed');
      patternInterventionIdRef.current = null;
      sessionStorage.setItem('pattern_insight_dismissed', 'true');
      sessionStorage.removeItem('pattern_alert_active');
      setIsPatternAlertShowing(false);
    }
    setShowPatternAlert(false);
  }, []);
  useSheetSwipe(sheetPanelRef, trackerSheetVisible, () => {
    // Clear all ready states immediately — backdrop CSS transition fades in sync with panel
    setSheetReady(false);
    setBenefitsReady(false);
    setPeakSheetReady(false);
    setPatternSheetReady(false);
    setTimeout(handleSwipeDismiss, 300);
  });

  // Reset streak (relapse) - keep toast, this is significant
  const handleReset = () => {
    const now = new Date();
    const todayStr = toDateString(now);
    const history = [...(userData.streakHistory || [])];
    const currentIdx = history.findIndex(s => !s.end);
    const lunar = getLunarData(now);
    
    if (currentIdx !== -1) {
      history[currentIdx] = { 
        ...history[currentIdx], 
        start: toDateString(history[currentIdx].start), // normalize legacy
        end: todayStr, 
        days: streak, 
        reason: 'relapse',
        moonPhase: lunar.phase,
        moonIllumination: lunar.illumination
      };
    }
    // ONE-BASED COUNTING: New streak starts at Day 1 (today)
    history.push({ start: todayStr, end: null, days: 1 });

    updateUserData({
      currentStreak: 1,
      startDate: todayStr,
      streakHistory: history,
      lastRelapse: todayStr, 
      relapseCount: (userData.relapseCount || 0) + 1 
    });

    // NEW: Notify InterventionService for ML feedback loop
    // This marks any pending interventions within 48-hour window as "failed"
    try {
      const markedCount = interventionService.onRelapse(now);
      if (markedCount > 0) {
        console.log(`📊 Marked ${markedCount} pending interventions as relapse`);
      }
    } catch (error) {
      console.warn('InterventionService error:', error);
    }

    setShowResetConfirm(false);
    setShowStreakOptions(false);
    toast.success('Streak reset. New journey begins.');
    
    // Track with Mixpanel
    trackStreakReset(streak);
  };

  // Wet dream - no streak reset, just log
  const handleLogWetDream = () => {
    const wetDreams = userData.wetDreams || [];
    const lunar = getLunarData(new Date());
    wetDreams.push({ date: new Date(), streakDay: streak, moonPhase: lunar.phase, moonIllumination: lunar.illumination });
    updateUserData({ wetDreams });
    setShowResetConfirm(false);
    setShowStreakOptions(false);
    toast.success('Wet dream logged.');
  };

  // Benefits list for modal
  const benefitsList = [
    { key: 'energy', label: 'Energy', desc: 'Physical vitality throughout the day' },
    { key: 'focus', label: 'Focus', desc: 'Mental clarity and concentration' },
    { key: 'confidence', label: 'Confidence', desc: 'Self-assurance in interactions' },
    { key: 'aura', label: 'Aura', desc: 'Presence and magnetism others notice' },
    { key: 'sleep', label: 'Sleep', desc: 'Quality and restfulness of sleep' },
    { key: 'workout', label: 'Body', desc: 'How your physical body feels today' }
  ];

  // Emotional state sliders (optional, saves alongside benefits)
  const emotionalList = [
    { key: 'anxiety', label: 'Calm', desc: '1 = anxious · 10 = calm' },
    { key: 'mood', label: 'Mood', desc: '1 = volatile · 10 = stable' },
    { key: 'clarity', label: 'Drive', desc: '1 = unmotivated · 10 = unstoppable' }
  ];

  // Handle benefit change — stores raw float for continuous drag movement
  const handleBenefitChange = useCallback((key, value) => {
    const rawValue = parseFloat(value);
    setBenefits(prev => ({ ...prev, [key]: rawValue }));
    
    // Mark emotional sliders as touched if user interacts with one
    if (['anxiety', 'mood', 'clarity'].includes(key)) {
      setEmotionalTouched(true);
    }
  }, []);

  // Touch intent detection — lock to horizontal (slider) or vertical (scroll) axis
  const handleSliderTouchStart = useCallback((key, e) => {
    const t = e.touches[0];
    sliderTouchRef.current = { startX: t.clientX, startY: t.clientY, axis: null, key };
  }, []);

  const handleSliderTouchMove = useCallback((key, e) => {
    const ref = sliderTouchRef.current;
    if (ref.key !== key) return;
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - ref.startX);
    const dy = Math.abs(t.clientY - ref.startY);

    // Determine axis after 8px of movement
    if (!ref.axis) {
      if (dx < 8 && dy < 8) return; // Not enough movement yet
      ref.axis = dx >= dy ? 'horizontal' : 'vertical';
    }

    // Vertical intent — let the list scroll, don't touch the slider
    if (ref.axis === 'vertical') return;

    // Horizontal intent — update slider, block scroll + sheet swipe
    e.preventDefault();
    e.stopPropagation();
    const input = e.currentTarget;
    const rect = input.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (t.clientX - rect.left) / rect.width));
    const val = 1 + ratio * 9;
    setBenefits(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleSliderTouchEnd = useCallback((key) => {
    const ref = sliderTouchRef.current;
    if (ref.key !== key) return;
    if (ref.axis === 'horizontal') {
      handleSliderSnap(key);
    }
    sliderTouchRef.current = { startX: 0, startY: 0, axis: null, key: null };
  }, []);

  // Magnetic snap — on finger lift, glide thumb to nearest integer
  const handleSliderSnap = useCallback((key) => {
    if (snapRafRef.current[key]) cancelAnimationFrame(snapRafRef.current[key]);
    
    const rawValue = benefitsRef.current[key];
    const targetValue = Math.round(rawValue);
    
    // Already at integer — just clean up state
    if (Math.abs(rawValue - targetValue) < 0.01) {
      setBenefits(prev => ({ ...prev, [key]: targetValue }));
      return;
    }
    
    const startValue = rawValue;
    const distance = targetValue - startValue;
    const duration = 140; // ms — fast but perceptible glide
    const startTime = performance.now();
    
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic — fast start, gentle landing into the notch
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = progress < 1 ? startValue + distance * eased : targetValue;
      
      // Update both thumb (via state) and fill bar (via DOM) each frame
      setBenefits(prev => ({ ...prev, [key]: val }));
      if (fillRefs.current[key]) {
        fillRefs.current[key].style.transform = `scaleX(${(val - 1) / 9})`;
      }
      
      if (progress < 1) {
        snapRafRef.current[key] = requestAnimationFrame(animate);
      }
    };
    
    snapRafRef.current[key] = requestAnimationFrame(animate);
  }, []);

  // Compute post-log insight — scored engine
  // Every possible insight gets a surprise score. Highest wins.
  // More data = richer insights. This is what makes logging addictive.
  const computePostLogInsight = useCallback((savedBenefits, allLogs) => {
    const phase = getCurrentPhaseName(streak);
    const dayLabel = `Day ${streak} · ${phase}`;
    const coreKeys = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    // === FIRST LOG — no candidates possible ===
    if (allLogs.length <= 1) {
      return { phase: dayLabel, line: 'Pattern recognition begins', sub: 'Your first data point is locked in' };
    }

    const previousLogs = allLogs.slice(0, -1);
    const candidates = [];

    // ------------------------------------------------------------------
    // 1. ALL-TIME PEAK (score: 95) — single metric highest ever
    // ------------------------------------------------------------------
    for (const key of coreKeys) {
      const prevMax = Math.max(...previousLogs.map(l => l[key] || 0));
      if (savedBenefits[key] > prevMax && savedBenefits[key] >= 8) {
        candidates.push({ score: 95, insight: {
          phase: dayLabel,
          line: `${cap(key)} at its highest`,
          sub: `All-time peak · ${savedBenefits[key]}/10`
        }});
        break; // Only report one peak
      }
    }

    // ------------------------------------------------------------------
    // 2. ELITE DAY (score: 90) — all 6 core metrics ≥ 7
    // ------------------------------------------------------------------
    if (coreKeys.every(k => savedBenefits[k] >= 7)) {
      const priorElite = previousLogs.filter(l => coreKeys.every(k => (l[k] || 0) >= 7)).length;
      const total = priorElite + 1;
      candidates.push({ score: 90, insight: {
        phase: dayLabel,
        line: 'All 6 metrics above 7',
        sub: total <= 1 ? 'First time. Remember this state.' : `${total} elite days out of ${allLogs.length} logs`
      }});
    }

    // ------------------------------------------------------------------
    // 3. CROSS-METRIC CORRELATION (score: 85) — needs 10+ logs
    //    "When Sleep is 8+, Confidence averages 8.4"
    // ------------------------------------------------------------------
    if (allLogs.length >= 10) {
      const pairs = [
        ['sleep','energy'],['sleep','focus'],['sleep','confidence'],
        ['workout','energy'],['workout','confidence'],['workout','aura'],
        ['energy','confidence'],['energy','aura'],['focus','clarity']
      ];
      let best = null;
      for (const [a, b] of pairs) {
        const highA = previousLogs.filter(l => (l[a] || 0) >= 8);
        const lowA = previousLogs.filter(l => (l[a] || 0) <= 4);
        if (highA.length >= 3 && lowA.length >= 2) {
          const avgHigh = highA.reduce((s, l) => s + (l[b] || 5), 0) / highA.length;
          const avgLow = lowA.reduce((s, l) => s + (l[b] || 5), 0) / lowA.length;
          const gap = avgHigh - avgLow;
          if (gap >= 2 && (!best || gap > best.gap)) {
            best = { a, b, avgHigh: avgHigh.toFixed(1), gap };
          }
        }
      }
      if (best) {
        candidates.push({ score: 85, insight: {
          phase: dayLabel,
          line: `When ${cap(best.a)} is 8+, ${cap(best.b)} averages ${best.avgHigh}`,
          sub: 'Your data reveals the connection'
        }});
      }
    }

    // ------------------------------------------------------------------
    // 4. BEST WEEK EVER (score: 82) — highest 7-day composite average
    //    Excludes 'workout' — prevents training frequency from biasing composite
    // ------------------------------------------------------------------
    if (allLogs.length >= 14) {
      const compKeys = coreKeys.filter(k => k !== 'workout');
      const last7 = allLogs.slice(-7);
      const weekAvg = last7.reduce((s, l) => s + compKeys.reduce((a, k) => a + (l[k] || 5), 0) / compKeys.length, 0) / last7.length;
      let isBest = true;
      for (let i = 0; i <= allLogs.length - 14; i++) {
        const w = allLogs.slice(i, i + 7);
        const wAvg = w.reduce((s, l) => s + compKeys.reduce((a, k) => a + (l[k] || 5), 0) / compKeys.length, 0) / w.length;
        if (wAvg >= weekAvg) { isBest = false; break; }
      }
      if (isBest) {
        candidates.push({ score: 82, insight: {
          phase: dayLabel,
          line: 'Best 7-day average yet',
          sub: `Overall score: ${weekAvg.toFixed(1)}`
        }});
      }
    }

    // ------------------------------------------------------------------
    // 5. LOG STREAK (score: 80/65) — consecutive days logged
    // ------------------------------------------------------------------
    const sortedDates = allLogs.map(l => format(new Date(l.date), 'yyyy-MM-dd')).sort().reverse();
    const uniqueDates = [...new Set(sortedDates)];
    let logStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const curr = new Date(uniqueDates[i - 1]);
      const prev = new Date(uniqueDates[i]);
      if (Math.round((curr - prev) / (1000 * 60 * 60 * 24)) === 1) { logStreak++; } else { break; }
    }
    if (logStreak >= 7) {
      candidates.push({ score: 80, insight: {
        phase: dayLabel,
        line: `${logStreak} days logged straight`,
        sub: 'The data compounds. So do you.'
      }});
    } else if (logStreak >= 3) {
      candidates.push({ score: 65, insight: {
        phase: dayLabel,
        line: `${logStreak} days logged in a row`,
        sub: 'Consistency builds clarity'
      }});
    }

    // ------------------------------------------------------------------
    // 6. DAY-OF-WEEK PATTERN (score: 75/60) — needs 14+ logs
    //    "You peak on Tuesdays" or "Mondays are your toughest"
    //    Excludes 'workout' metric — prevents training schedule from biasing results
    // ------------------------------------------------------------------
    if (allLogs.length >= 14) {
      const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const dowKeys = coreKeys.filter(k => k !== 'workout');
      const buckets = {};
      allLogs.forEach(l => {
        const dow = new Date(l.date).getDay();
        if (!buckets[dow]) buckets[dow] = [];
        buckets[dow].push(dowKeys.reduce((s, k) => s + (l[k] || 5), 0) / dowKeys.length);
      });
      let bestD = null, worstD = null;
      for (const [dow, scores] of Object.entries(buckets)) {
        if (scores.length < 2) continue;
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (!bestD || avg > bestD.avg) bestD = { dow: parseInt(dow), avg };
        if (!worstD || avg < worstD.avg) worstD = { dow: parseInt(dow), avg };
      }
      if (bestD && worstD && bestD.avg - worstD.avg >= 1.5) {
        const todayDow = new Date().getDay();
        if (todayDow === bestD.dow) {
          candidates.push({ score: 75, insight: {
            phase: dayLabel,
            line: `${dayNames[bestD.dow]}s are your strongest day`,
            sub: `Average score: ${bestD.avg.toFixed(1)}`
          }});
        } else if (todayDow === worstD.dow) {
          candidates.push({ score: 75, insight: {
            phase: dayLabel,
            line: `${dayNames[worstD.dow]}s tend to be your toughest`,
            sub: 'Awareness is your edge'
          }});
        } else {
          candidates.push({ score: 60, insight: {
            phase: dayLabel,
            line: `You peak on ${dayNames[bestD.dow]}s`,
            sub: `${bestD.avg.toFixed(1)} vs ${worstD.avg.toFixed(1)} on ${dayNames[worstD.dow]}s`
          }});
        }
      }
    }

    // ------------------------------------------------------------------
    // 7. PHASE TRANSITION PROXIMITY (score: 72)
    //    "2 days from Emotional Processing"
    // ------------------------------------------------------------------
    for (const threshold of [14, 45, 90, 180]) {
      const daysLeft = threshold - streak;
      if (daysLeft > 0 && daysLeft <= 3) {
        candidates.push({ score: 72, insight: {
          phase: dayLabel,
          line: `${daysLeft} day${daysLeft > 1 ? 's' : ''} from ${getCurrentPhaseName(threshold + 1)}`,
          sub: 'New territory ahead'
        }});
        break;
      }
    }

    // ------------------------------------------------------------------
    // 8. WEEKLY TREND SHIFT (score: 70) — ±1.5 from last week's avg
    //    Excludes 'workout' — lift-day comparisons handled by candidate #10
    // ------------------------------------------------------------------
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentLogs = previousLogs.filter(l => new Date(l.date) >= weekAgo);
    if (recentLogs.length >= 2) {
      const trendKeys = coreKeys.filter(k => k !== 'workout');
      let biggestShift = { key: null, delta: 0 };
      for (const key of trendKeys) {
        const avg = recentLogs.reduce((s, l) => s + (l[key] || 5), 0) / recentLogs.length;
        const delta = savedBenefits[key] - avg;
        if (Math.abs(delta) > Math.abs(biggestShift.delta) && Math.abs(delta) >= 1.5) {
          biggestShift = { key, delta };
        }
      }
      if (biggestShift.key) {
        const arrow = biggestShift.delta > 0 ? '↑' : '↓';
        const val = Math.abs(biggestShift.delta).toFixed(1);
        candidates.push({ score: 70, insight: {
          phase: dayLabel,
          line: `${cap(biggestShift.key)} ${arrow} ${val} from last week`,
          sub: biggestShift.delta > 0 ? 'The practice is working' : 'Awareness is the first step'
        }});
      }
    }

    // ------------------------------------------------------------------
    // 9. TOTAL LOG MILESTONES (score: 68) — 10, 25, 50, 100, etc.
    // ------------------------------------------------------------------
    const logMilestones = [10, 25, 50, 100, 150, 200, 365];
    if (logMilestones.includes(allLogs.length)) {
      candidates.push({ score: 68, insight: {
        phase: dayLabel,
        line: `${allLogs.length} logs recorded`,
        sub: allLogs.length >= 100 ? 'Deep data. Deep self-knowledge.' : 'Every log sharpens the picture'
      }});
    }

    // ==================================================================
    // WORKOUT-AWARE INSIGHTS (10-16)
    // Mine userData.workoutLog for spermatogenesis cycle correlations,
    // PRs, emotional cross-refs, and streak-long performance trends
    // ==================================================================
    const workoutLog = userData.workoutLog || [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayWorkout = workoutLog.find(w => format(new Date(w.date), 'yyyy-MM-dd') === todayStr);

    // ------------------------------------------------------------------
    // 10. LIFT-DAY BENEFIT BOOST (score: 86) — needs 5+ workout days
    //     "Days you lift, Energy averages 8.1 vs 6.2"
    //     Scans core + emotional metrics (all higher = better after calm migration)
    // ------------------------------------------------------------------
    if (workoutLog.length >= 5 && allLogs.length >= 10) {
      const workoutDates = new Set(workoutLog.map(w => format(new Date(w.date), 'yyyy-MM-dd')));
      const liftDayLogs = previousLogs.filter(l => workoutDates.has(format(new Date(l.date), 'yyyy-MM-dd')));
      const restDayLogs = previousLogs.filter(l => !workoutDates.has(format(new Date(l.date), 'yyyy-MM-dd')));
      
      if (liftDayLogs.length >= 3 && restDayLogs.length >= 3) {
        const allMetrics = [...coreKeys, 'anxiety', 'mood', 'clarity'];
        const metricLabel = { anxiety: 'Calm' }; // display name overrides
        let bestBoost = null;
        for (const key of allMetrics) {
          const liftWith = liftDayLogs.filter(l => typeof l[key] === 'number');
          const restWith = restDayLogs.filter(l => typeof l[key] === 'number');
          if (liftWith.length < 3 || restWith.length < 3) continue;
          const liftAvg = liftWith.reduce((s, l) => s + l[key], 0) / liftWith.length;
          const restAvg = restWith.reduce((s, l) => s + l[key], 0) / restWith.length;
          const boost = liftAvg - restAvg;
          if (boost >= 1.0 && (!bestBoost || boost > bestBoost.boost)) {
            bestBoost = { key, liftAvg: liftAvg.toFixed(1), restAvg: restAvg.toFixed(1), boost };
          }
        }
        if (bestBoost) {
          const displayName = metricLabel[bestBoost.key] || cap(bestBoost.key);
          const line = `${displayName}: ${bestBoost.liftAvg} on lift days vs ${bestBoost.restAvg} on rest days`;
          candidates.push({ score: 86, insight: {
            phase: dayLabel,
            line,
            sub: `Across ${liftDayLogs.length} training days`
          }});
        }
      }
    }

    // ------------------------------------------------------------------
    // 11. SPERMA CYCLE PHASE STRENGTH (score: 88) — needs 8+ workouts
    //     "Your lifts peak during Maturation (days 37-72)"
    //     Groups workouts into 3 sperma phases, compares total volume
    // ------------------------------------------------------------------
    if (workoutLog.length >= 8) {
      const phases = [
        { name: 'Formation', min: 1, max: 24 },
        { name: 'Development', min: 25, max: 48 },
        { name: 'Maturation', min: 49, max: 72 }
      ];
      const phaseData = phases.map(p => {
        const workouts = workoutLog.filter(w => w.spermaDay >= p.min && w.spermaDay <= p.max);
        if (workouts.length === 0) return { ...p, avgVolume: 0, count: 0 };
        const volumes = workouts.map(w => 
          (w.exercises || []).reduce((s, e) => {
            const sets = e.sets || 0, reps = e.reps || 0;
            return s + (e.weight > 0 ? e.weight * sets * reps : sets * reps);
          }, 0)
        );
        return { ...p, avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length, count: workouts.length };
      });
      
      const validPhases = phaseData.filter(p => p.count >= 2);
      if (validPhases.length >= 2) {
        validPhases.sort((a, b) => b.avgVolume - a.avgVolume);
        const strongest = validPhases[0];
        const weakest = validPhases[validPhases.length - 1];
        if (strongest.avgVolume > 0 && weakest.avgVolume > 0) {
          const ratio = strongest.avgVolume / weakest.avgVolume;
          if (ratio >= 1.15) {
            candidates.push({ score: 88, insight: {
              phase: dayLabel,
              line: `Lifts peak during ${strongest.name} phase`,
              sub: `Days ${strongest.min}-${strongest.max} of your cycle · ${strongest.count} sessions`
            }});
          }
        }
      }
    }

    // ------------------------------------------------------------------
    // 12. WORKOUT + TODAY CROSS-REFERENCE (score: 78) — if logged today
    //     "You lifted today — Workout metric: 9/10"
    // ------------------------------------------------------------------
    if (todayWorkout && todayWorkout.exercises?.length > 0) {
      const exerciseCount = todayWorkout.exercises.length;
      const totalVolume = todayWorkout.exercises.reduce((s, e) => {
        const sets = e.sets || 0, reps = e.reps || 0;
        return s + (e.weight > 0 ? e.weight * sets * reps : sets * reps);
      }, 0);
      const hasWeighted = todayWorkout.exercises.some(e => e.weight > 0);
      const workoutScore = savedBenefits.workout || 5;
      
      if (workoutScore >= 8) {
        candidates.push({ score: 78, insight: {
          phase: dayLabel,
          line: `${exerciseCount} exercises logged · Body rated ${workoutScore}/10`,
          sub: totalVolume > 0 ? `${totalVolume.toLocaleString()}${hasWeighted ? ' lbs' : ' reps'} total volume` : 'Training data locked in'
        }});
      }
    }

    // ------------------------------------------------------------------
    // 13. EXERCISE PR DETECTION (score: 92) — weight PR or volume PR
    //     Weight PR: "Bench Press PR: 225 lbs"
    //     Volume PR: "Push-ups PR: 100 reps (4×25)" — for bodyweight exercises
    // ------------------------------------------------------------------
    if (todayWorkout && todayWorkout.exercises?.length > 0 && workoutLog.length >= 2) {
      let prFound = false;
      for (const exercise of todayWorkout.exercises) {
        if (!exercise.name) continue;
        const nameLower = exercise.name.toLowerCase();
        const priorExercises = workoutLog
          .filter(w => format(new Date(w.date), 'yyyy-MM-dd') !== todayStr)
          .flatMap(w => (w.exercises || []))
          .filter(e => e.name && e.name.toLowerCase() === nameLower);
        
        if (priorExercises.length < 1) continue;

        // Weight PR — highest weight ever
        if (exercise.weight > 0) {
          const priorWeights = priorExercises.filter(e => e.weight > 0).map(e => e.weight);
          if (priorWeights.length >= 1) {
            const prevMax = Math.max(...priorWeights);
            if (exercise.weight > prevMax) {
              candidates.push({ score: 92, insight: {
                phase: dayLabel,
                line: `${exercise.name} PR: ${exercise.weight} lbs`,
                sub: `Previous best: ${prevMax} lbs · Day ${streak}`
              }});
              prFound = true; break;
            }
          }
        }
        
        // Volume PR — highest sets × reps (for bodyweight or any exercise)
        const todayVol = (exercise.sets || 0) * (exercise.reps || 0);
        if (todayVol > 0) {
          const priorVols = priorExercises
            .map(e => (e.sets || 0) * (e.reps || 0))
            .filter(v => v > 0);
          if (priorVols.length >= 1) {
            const prevMaxVol = Math.max(...priorVols);
            if (todayVol > prevMaxVol) {
              candidates.push({ score: 91, insight: {
                phase: dayLabel,
                line: `${exercise.name} volume PR: ${todayVol} reps`,
                sub: `Previous best: ${prevMaxVol} reps · ${exercise.sets}×${exercise.reps}`
              }});
              prFound = true; break;
            }
          }
        }
      }
    }

    // ------------------------------------------------------------------
    // 14. TRAINING CONSISTENCY (score: 73) — weekly frequency
    //     "3 workouts this week — your most consistent stretch"
    // ------------------------------------------------------------------
    if (workoutLog.length >= 3) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeek = workoutLog.filter(w => new Date(w.date) >= oneWeekAgo);
      
      if (thisWeek.length >= 3) {
        // Check if this is the most workouts in any 7-day window
        let isBestWeek = true;
        for (let i = 0; i < workoutLog.length; i++) {
          const windowStart = new Date(workoutLog[i].date);
          const windowEnd = new Date(windowStart);
          windowEnd.setDate(windowEnd.getDate() + 7);
          const windowCount = workoutLog.filter(w => {
            const d = new Date(w.date);
            return d >= windowStart && d < windowEnd;
          }).length;
          if (windowCount > thisWeek.length) { isBestWeek = false; break; }
        }
        
        if (isBestWeek && thisWeek.length >= 4) {
          candidates.push({ score: 73, insight: {
            phase: dayLabel,
            line: `${thisWeek.length} workouts in 7 days`,
            sub: 'Most consistent training week yet'
          }});
        } else {
          candidates.push({ score: 62, insight: {
            phase: dayLabel,
            line: `${thisWeek.length} workouts this week`,
            sub: 'Training + retention = compounding power'
          }});
        }
      }
    }

    // ------------------------------------------------------------------
    // 15. STREAK-LONG VOLUME TREND (score: 84) — needs 6+ workouts
    //     "Total volume up 34% since Day 1" — THE retention proof
    // ------------------------------------------------------------------
    if (workoutLog.length >= 6) {
      const sorted = [...workoutLog].sort((a, b) => new Date(a.date) - new Date(b.date));
      const calcVolume = (w) => (w.exercises || []).reduce((s, e) => {
        const sets = e.sets || 0, reps = e.reps || 0;
        return s + (e.weight > 0 ? e.weight * sets * reps : sets * reps);
      }, 0);
      
      // Compare first 3 workouts avg vs last 3 workouts avg
      const early = sorted.slice(0, 3);
      const recent = sorted.slice(-3);
      const earlyAvg = early.reduce((s, w) => s + calcVolume(w), 0) / early.length;
      const recentAvg = recent.reduce((s, w) => s + calcVolume(w), 0) / recent.length;
      
      if (earlyAvg > 0 && recentAvg > earlyAvg) {
        const pctIncrease = Math.round(((recentAvg - earlyAvg) / earlyAvg) * 100);
        if (pctIncrease >= 10) {
          candidates.push({ score: 84, insight: {
            phase: dayLabel,
            line: `Training volume up ${pctIncrease}% since you started`,
            sub: `${workoutLog.length} sessions tracked · retention fuels performance`
          }});
        }
      }
    }

    // ------------------------------------------------------------------
    // 16. WEEKLY TRAINING FREQUENCY × EMOTIONAL STATE (score: 83)
    //     "Weeks with 3+ workouts, Anxiety averages 3.1 vs 5.8"
    //     Buckets weeks by training count, compares emotional metrics
    // ------------------------------------------------------------------
    if (workoutLog.length >= 6 && allLogs.length >= 14) {
      // Build weekly buckets (ISO week)
      const getWeekKey = (d) => {
        const dt = new Date(d);
        const jan1 = new Date(dt.getFullYear(), 0, 1);
        const weekNum = Math.ceil(((dt - jan1) / 86400000 + jan1.getDay() + 1) / 7);
        return `${dt.getFullYear()}-W${weekNum}`;
      };
      
      const weekWorkoutCounts = {};
      workoutLog.forEach(w => {
        const wk = getWeekKey(w.date);
        weekWorkoutCounts[wk] = (weekWorkoutCounts[wk] || 0) + 1;
      });
      
      const highTrainWeeks = new Set(Object.entries(weekWorkoutCounts).filter(([, c]) => c >= 3).map(([k]) => k));
      const lowTrainWeeks = new Set(Object.entries(weekWorkoutCounts).filter(([, c]) => c <= 1).map(([k]) => k));
      
      if (highTrainWeeks.size >= 2 && lowTrainWeeks.size >= 2) {
        const emotionalKeys = ['anxiety', 'mood', 'clarity'];
        const highLogs = previousLogs.filter(l => highTrainWeeks.has(getWeekKey(l.date)) && typeof l.anxiety === 'number');
        const lowLogs = previousLogs.filter(l => lowTrainWeeks.has(getWeekKey(l.date)) && typeof l.anxiety === 'number');
        
        if (highLogs.length >= 3 && lowLogs.length >= 3) {
          let bestEmotional = null;
          
          // All emotional metrics — higher is better (calm scale already flipped)
          const emotionalLabel = { anxiety: 'Calm', mood: 'Mood', clarity: 'Drive' };
          for (const key of ['anxiety', 'mood', 'clarity']) {
            const hWith = highLogs.filter(l => typeof l[key] === 'number');
            const lWith = lowLogs.filter(l => typeof l[key] === 'number');
            if (hWith.length < 3 || lWith.length < 3) continue;
            const hAvg = hWith.reduce((s, l) => s + l[key], 0) / hWith.length;
            const lAvg = lWith.reduce((s, l) => s + l[key], 0) / lWith.length;
            const boost = hAvg - lAvg;
            if (boost >= 1.0 && (!bestEmotional || boost > bestEmotional.delta)) {
              bestEmotional = { key: emotionalLabel[key], highAvg: hAvg.toFixed(1), lowAvg: lAvg.toFixed(1), delta: boost };
            }
          }
          
          if (bestEmotional) {
            const line = `${bestEmotional.key}: ${bestEmotional.highAvg} in heavy training weeks vs ${bestEmotional.lowAvg} in light weeks`;
            candidates.push({ score: 83, insight: {
              phase: dayLabel,
              line,
              sub: 'Weeks with 3+ sessions vs 0-1'
            }});
          }
        }
      }
    }

    // === RETURN HIGHEST SCORING, or phase fallback ===
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].insight;
    }

    const phaseMessages = {
      'Initial Adaptation': 'Building the foundation',
      'Emotional Processing': 'Old patterns releasing',
      'Mental Expansion': 'Clarity is compounding',
      'Spiritual Integration': 'Deep transformation in progress',
      'Mastery & Purpose': 'Operating at a different level'
    };
    return { phase: dayLabel, line: phaseMessages[phase] || 'Data locked in', sub: `${allLogs.length} logs recorded` };
  }, [streak, userData.workoutLog]);

  // Save benefits
  const saveBenefits = () => {
    const today = format(currentTime, 'yyyy-MM-dd');
    const existing = userData.benefitTracking || [];
    const existingIdx = existing.findIndex(b => 
      format(new Date(b.date), 'yyyy-MM-dd') === today
    );
    
    const rounded = {
      energy: Math.round(benefits.energy),
      focus: Math.round(benefits.focus),
      confidence: Math.round(benefits.confidence),
      aura: Math.round(benefits.aura),
      sleep: Math.round(benefits.sleep),
      workout: Math.round(benefits.workout)
    };
    
    // Tag with lunar phase for streak-lunar correlation engine
    const lunar = getLunarData(new Date());
    
    const entry = { 
      date: new Date(), 
      ...rounded,
      ...(emotionalTouched ? {
        anxiety: Math.round(benefits.anxiety),
        mood: Math.round(benefits.mood),
        clarity: Math.round(benefits.clarity)
      } : {}),
      streakDay: streak,
      moonPhase: lunar.phase,
      moonIllumination: lunar.illumination
    };
    
    if (existingIdx >= 0) {
      existing[existingIdx] = entry;
    } else {
      existing.push(entry);
    }
    
    updateUserData({ benefitTracking: existing });
    
    // Show post-log insight (sliders fade, insight overlays same-height sheet)
    const insight = computePostLogInsight(rounded, existing);
    setPostLogInsight(insight);
    
    // Auto-dismiss after 3.5s → close sheet → fire peak prompt if needed
    insightTimerRef.current = setTimeout(() => {
      setPostLogInsight(null);
      closeBenefits(() => {
        setShowBenefits(false);
        
        const coreAvg = (rounded.energy + rounded.focus + rounded.confidence + rounded.aura + rounded.sleep + rounded.workout) / 6;
        if (coreAvg >= 7) {
          const recordings = userData.peakRecordings || [];
          const lastRecording = recordings.length > 0 ? recordings[recordings.length - 1] : null;
          const daysSinceLast = lastRecording 
            ? Math.floor((Date.now() - new Date(lastRecording.date).getTime()) / (1000 * 60 * 60 * 24)) 
            : Infinity;
          
          if (daysSinceLast >= 7) {
            setTimeout(() => setShowPeakPrompt(true), 400);
          }
        }
      });
    }, 2000);
    
    trackDailyLog(rounded, streak);
  };

  // Pattern alert: headless detector callback — opens sheet
  const handlePatternAlert = useCallback(({ prediction, interventionId }) => {
    setPatternPrediction(prediction);
    patternInterventionIdRef.current = interventionId;
    setShowPatternAlert(true);
    setIsPatternAlertShowing(true);
  }, []);

  // Pattern alert: close sheet and record response
  const closePatternAlert = useCallback((response = 'dismissed') => {
    if (patternInterventionIdRef.current) {
      interventionService.recordResponse(patternInterventionIdRef.current, response);
      patternInterventionIdRef.current = null;
    }
    sessionStorage.setItem('pattern_insight_dismissed', 'true');
    sessionStorage.removeItem('pattern_alert_active');
    setPatternSheetReady(false);
    setIsPatternAlertShowing(false);
    setTimeout(() => {
      setShowPatternAlert(false);
      setPatternPrediction(null);
    }, 300);
  }, []);

  // Pattern alert: user tapped "I'm struggling" → urge toolkit
  const handlePatternStruggling = () => {
    const riskScore = patternPrediction?.riskScore;
    closePatternAlert('struggling');
    setTimeout(() => {
      navigate('/urge-toolkit', {
        state: {
          fromPrediction: true,
          riskScore
        }
      });
    }, 350);
  };

  // Helpers for prediction sheet content
  const getRiskLevel = (score) => {
    if (score >= 70) return 'High';
    if (score >= 50) return 'Elevated';
    return 'Low';
  };

  const getCurrentPhaseName = (streakDay) => {
    if (streakDay <= 14) return 'Initial Adaptation';
    if (streakDay <= 45) return 'Emotional Processing';
    if (streakDay <= 90) return 'Mental Expansion';
    if (streakDay <= 180) return 'Spiritual Integration';
    return 'Mastery & Purpose';
  };

  // Save Peak State Recording
  const savePeakRecording = () => {
    if (!peakMessage.trim()) return;
    
    const recordings = userData.peakRecordings || [];
    recordings.push({
      message: peakMessage.trim(),
      date: new Date(),
      streakDay: streak,
      avgScore: Math.round(((benefits.energy + benefits.focus + benefits.confidence + benefits.aura + benefits.sleep + benefits.workout) / 6) * 10) / 10
    });
    
    updateUserData({ peakRecordings: recordings });
    closePeakSheet(() => {
      setShowPeakPrompt(false);
      setPeakMessage('');
      toast.success('Transmission recorded.');
    });
  };


  return (
    <div className="tracker">
      
      {/* Onboarding Guide - First time only */}
      {showOnboarding && (
        <OnboardingGuide 
          onComplete={handleOnboardingComplete}
        />
      )}
      
      {/* Benefits Modal - Bottom Sheet */}
      {showBenefits && (
        <div className={`sheet-backdrop${benefitsReady ? ' open' : ''}`} onClick={() => closeBenefits(() => setShowBenefits(false))}>
          <div ref={sheetPanelRef} className={`sheet-panel benefits-sheet${benefitsReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <div 
              className="sheet-header"
            />
            <div className="benefits-modal">
              <h2 className={postLogInsight ? 'fading' : ''}>Log Benefits</h2>
              
              <div className={`benefits-list${postLogInsight ? ' fading' : ''}`} data-no-swipe="true">
                {benefitsList.map(({ key, label, desc }) => (
                  <div key={key} className="benefit-row">
                    <div className="benefit-info">
                      <span>{label}</span>
                      <span className="benefit-num">{Math.round(benefits[key])}/10</span>
                    </div>
                    <div className="benefit-slider">
                      <div 
                        className="benefit-fill" 
                        ref={el => fillRefs.current[key] = el}
                        style={{ transform: `scaleX(${(benefits[key] - 1) / 9})` }}
                      />
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="any"
                        value={benefits[key]}
                        onChange={e => handleBenefitChange(key, e.target.value)}
                        onTouchStart={e => handleSliderTouchStart(key, e)}
                        onTouchMove={e => handleSliderTouchMove(key, e)}
                        onTouchEnd={() => handleSliderTouchEnd(key)}
                        onPointerUp={() => handleSliderSnap(key)}
                      />
                    </div>
                    <span className="benefit-desc">{desc}</span>
                  </div>
                ))}

                {/* Emotional State - optional */}
                <div className="benefits-section-divider">
                  <span>How You Feel</span>
                </div>

                {emotionalList.map(({ key, label, desc }) => (
                  <div key={key} className="benefit-row">
                    <div className="benefit-info">
                      <span>{label}</span>
                      <span className="benefit-num">{Math.round(benefits[key])}/10</span>
                    </div>
                    <div className="benefit-slider">
                      <div 
                        className="benefit-fill" 
                        ref={el => fillRefs.current[key] = el}
                        style={{ transform: `scaleX(${(benefits[key] - 1) / 9})` }}
                      />
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="any"
                        value={benefits[key]}
                        onChange={e => handleBenefitChange(key, e.target.value)}
                        onTouchStart={e => handleSliderTouchStart(key, e)}
                        onTouchMove={e => handleSliderTouchMove(key, e)}
                        onTouchEnd={() => handleSliderTouchEnd(key)}
                        onPointerUp={() => handleSliderSnap(key)}
                      />
                    </div>
                    <span className="benefit-desc">{desc}</span>
                  </div>
                ))}
              </div>
              
              <div className={`benefits-actions${postLogInsight ? ' fading' : ''}`}>
                <button className="btn-primary" onClick={saveBenefits}>Save</button>
                <button className="btn-ghost" onClick={() => closeBenefits(() => setShowBenefits(false))}>Cancel</button>
              </div>
              
              {postLogInsight && (
                <div className="post-log-insight">
                  <span className="post-log-insight-phase">{postLogInsight.phase}</span>
                  <span className="post-log-insight-line">{postLogInsight.line}</span>
                  {postLogInsight.sub && <span className="post-log-insight-sub">{postLogInsight.sub}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Peak State Recording — Bottom Sheet */}
      {showPeakPrompt && (
        <div className={`sheet-backdrop${peakSheetReady ? ' open' : ''}`} onClick={() => closePeakSheet(() => { setShowPeakPrompt(false); setPeakMessage(''); })}>
          <div ref={sheetPanelRef} className={`sheet-panel peak-sheet${peakSheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <div 
              className="sheet-header"
            />
            <div className="peak-prompt">
              <div className="peak-prompt-header">
                <span className="peak-prompt-signal">PEAK STATE DETECTED</span>
                <h2 className="peak-prompt-title">Leave a transmission</h2>
                <p className="peak-prompt-desc">Record a message for when the noise returns. Your future self will see this during moments of weakness.</p>
              </div>
              
              <textarea
                className="peak-prompt-input"
                placeholder="Write to your future self..."
                value={peakMessage}
                onChange={e => setPeakMessage(e.target.value)}
                maxLength={500}
                rows={4}
                autoFocus
              />
              
              <div className="peak-prompt-meta">
                <span>Day {streak}</span>
                <span>{peakMessage.length}/500</span>
              </div>
              
              <div className="peak-prompt-actions">
                <button 
                  className="btn-primary" 
                  onClick={savePeakRecording}
                  disabled={!peakMessage.trim()}
                >
                  Save
                </button>
                <button className="btn-ghost" onClick={() => closePeakSheet(() => { setShowPeakPrompt(false); setPeakMessage(''); })}>
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Streak Options */}
      {showStreakOptions && (
        <div className={`sheet-backdrop${sheetReady ? ' open' : ''}`} onClick={() => closeSheet(() => setShowStreakOptions(false))}>
          <div ref={sheetPanelRef} className={`sheet-panel tracker-sheet${sheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <div 
              className="sheet-header"
            />
            <div className="sheet">
              <h3 className="sheet-title">Streak Options</h3>
              <div className="sheet-content">
                {isPremium && (
                  <>
                    <div className="streak-gold-toggle">
                      <div className="streak-gold-toggle-text">
                        <span className="streak-gold-toggle-label">Oracle's Gold</span>
                        <span className={`streak-gold-swatch${userData.streakColorGold ? ' active' : ''}`} />
                      </div>
                      <button 
                        className={`streak-gold-switch${userData.streakColorGold ? ' active' : ''}`}
                        onClick={() => updateUserData({ streakColorGold: !userData.streakColorGold })}
                      >
                        <span className="streak-gold-knob" />
                      </button>
                    </div>
                    <div className="sheet-divider" />
                  </>
                )}
                <button onClick={() => closeSheet(() => { setShowStreakOptions(false); setShowDatePicker(true); })}>
                  Edit start date
                </button>
                <div className="sheet-divider" />
                <button 
                  onClick={() => closeSheet(() => { setShowStreakOptions(false); setResetType('wetdream'); setShowResetConfirm(true); })}
                >
                  Log wet dream
                </button>
                <div className="sheet-divider" />
                <button 
                  className="danger" 
                  onClick={() => closeSheet(() => { setShowStreakOptions(false); setResetType('relapse'); setShowResetConfirm(true); })}
                >
                  Reset streak
                </button>
              </div>
              <button className="cancel" onClick={() => closeSheet(() => setShowStreakOptions(false))}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirm */}
      {showResetConfirm && (
        <div className={`sheet-backdrop${sheetReady ? ' open' : ''}`} onClick={() => closeSheet(() => setShowResetConfirm(false))}>
          <div ref={sheetPanelRef} className={`sheet-panel tracker-sheet${sheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <div 
              className="sheet-header"
            />
            <div className="confirm-modal">
              <h2>{resetType === 'wetdream' ? 'Log wet dream?' : 'Reset streak?'}</h2>
              <p>
                {resetType === 'wetdream' 
                  ? 'This will be logged but won\'t affect your streak. Wet dreams are natural.'
                  : 'Your current streak will be saved to history.'
                }
              </p>
              <div className="confirm-actions">
                <button 
                  className={resetType === 'relapse' ? 'btn-danger' : 'btn-primary'} 
                  onClick={resetType === 'wetdream' ? handleLogWetDream : handleReset}
                >
                  {resetType === 'wetdream' ? 'Log it' : 'Reset'}
                </button>
                <button className="btn-ghost" onClick={() => closeSheet(() => setShowResetConfirm(false))}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Benefit Logging Lock — Free users past 14 lifetime logs */}
      {showLogLock && (
        <div className={`sheet-backdrop${sheetReady ? ' open' : ''}`} onClick={() => closeSheet(() => setShowLogLock(false))}>
          <div ref={sheetPanelRef} className={`sheet-panel tracker-sheet${sheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <div 
              className="sheet-header"
            />
            <div className="confirm-modal">
              <h2>Free Logs Used</h2>
              <p>
                You've used all {FREE_LOG_LIMIT} free benefit logs. 
                Go Premium for unlimited logging, full analytics, and ML predictions.
              </p>
              <div className="confirm-actions">
                <button className="btn-primary" onClick={() => closeSheet(() => { setShowLogLock(false); onUpgrade(); })}>Upgrade</button>
                <button className="btn-ghost" onClick={() => closeSheet(() => setShowLogLock(false))}>Not now</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Picker — Bottom Sheet (first-time setup + edit mode) */}
      {showDatePicker && (
        <div className={`sheet-backdrop${sheetReady ? ' open' : ''}`} onClick={userData.startDate ? () => closeSheet(() => setShowDatePicker(false)) : undefined}>
          <div ref={sheetPanelRef} className={`sheet-panel tracker-sheet${sheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <div 
              className="sheet-header"
            />
            <DatePicker
              onSubmit={(date) => closeSheet(() => handleDateSubmit(date))}
              onCancel={userData.startDate ? () => closeSheet(() => setShowDatePicker(false)) : null}
              initialDate={userData.startDate ? toLocalMidnight(userData.startDate) : new Date()}
              title={userData.startDate ? "Edit start date" : "When did you start?"}
            />
          </div>
        </div>
      )}

      {/* AI Pattern Detector — headless, opens sheet when risk elevated */}
      <PatternInsightCard 
        userData={userData} 
        onAlert={handlePatternAlert}
      />

      {/* Pattern Alert Sheet — AI prediction bottom sheet */}
      {showPatternAlert && patternPrediction && (() => {
        const riskScore = patternPrediction.riskScore || 0;
        const patterns = patternPrediction.patterns;
        const currentPhaseName = getCurrentPhaseName(streak);
        const hasPatterns = patterns?.streak?.isHighRiskDay || 
                            patterns?.time?.isHighRiskTime || 
                            patterns?.benefits?.hasSignificantDrop || 
                            patternPrediction?.factors?.inPurgePhase ||
                            patternPrediction?.factors?.emotionalProcessingPhase;
        return (
          <div className={`sheet-backdrop${patternSheetReady ? ' open' : ''}`} onClick={() => closePatternAlert('dismissed')}>
            <div ref={sheetPanelRef} className={`sheet-panel prediction-sheet${patternSheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
              <div 
                className="sheet-header"
              />

              {/* Score */}
              <div className="prediction-header">
                <p className="prediction-label">Pattern Analysis</p>
                <div className="prediction-score-row">
                  <span className="prediction-score">{riskScore}</span>
                  <span className="prediction-percent">%</span>
                </div>
                <p className="prediction-level">{getRiskLevel(riskScore)} Risk</p>
              </div>

              {/* Scrollable middle content */}
              <div className="prediction-scroll-content" data-no-swipe>
                {/* Why this alert */}
                {hasPatterns && (
                  <div className="prediction-insights">
                    <p className="insight-section-label">Why this alert</p>

                    {patterns?.streak?.isHighRiskDay && (
                      <div className="insight-block">
                        <p className="insight-title">Day {patterns.streak.currentDay}</p>
                        <p className="insight-detail">
                          You've relapsed {patterns.streak.relapsesInRange} of {patterns.streak.totalRelapses} times between days {patterns.streak.rangeDays[0]}-{patterns.streak.rangeDays[1]}
                        </p>
                      </div>
                    )}

                    {patterns?.time?.isHighRiskTime && (
                      <div className="insight-block">
                        <p className="insight-title">Evening hours</p>
                        <p className="insight-detail">
                          {patterns.time.eveningPercentage}% of your relapses happened after 8pm
                        </p>
                      </div>
                    )}

                    {patterns?.benefits?.hasSignificantDrop && patterns.benefits.drops.map((drop, i) => (
                      <div className="insight-block" key={i}>
                        <p className="insight-title">{drop.metric} dropped</p>
                        <p className="insight-detail">
                          From {drop.from} → {drop.to} over the last {patterns.benefits.daysCovered} days
                        </p>
                      </div>
                    ))}

                    {(patternPrediction?.factors?.inPurgePhase || patternPrediction?.factors?.emotionalProcessingPhase) && !patterns?.streak?.isHighRiskDay && (
                      <div className="insight-block">
                        <p className="insight-title">{currentPhaseName} phase</p>
                        <p className="insight-detail">
                          {streak <= 45 
                            ? 'Days 15-45 often bring intense emotional processing as suppressed feelings surface'
                            : `You're in the ${currentPhaseName} phase of your journey`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Historical match */}
                {patterns?.historical && (
                  <div className="prediction-insights">
                    <p className="insight-section-label">Historical match</p>
                    <p className="historical-line">
                      Similar conditions on Day {patterns.historical.matchDay}
                    </p>
                    <p className="historical-outcome">
                      {patterns.historical.daysUntilRelapse > 0 
                        ? `Relapsed ${patterns.historical.daysUntilRelapse} days later`
                        : 'Relapsed same day'
                      }
                    </p>
                  </div>
                )}

                {/* Disclaimer */}
                <p className="prediction-disclaimer">
                  Pattern awareness, not prediction. Dismiss if you're feeling fine.
                </p>
              </div>

              {/* Sticky footer — actions */}
              <div className="prediction-actions">
                <button className="btn-primary" onClick={handlePatternStruggling}>
                  I'm struggling
                </button>
                <button className="btn-ghost" onClick={() => closePatternAlert('fine')}>
                  I'm fine
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Energy Almanac — rendered outside strip to avoid sheet bleed */}
      <EnergyAlmanac 
        userData={userData}
        isPatternAlertShowing={isPatternAlertShowing}
      />

      {/* Meta strip — phase left, date right */}
      <div className="tracker-meta-strip">
        <span className="tracker-meta-phase">
          {getCurrentPhaseName(streak)}
          <span className="tracker-meta-dot">·</span>
          Day {streak}
        </span>
        <span className="tracker-meta-date">
          {format(currentTime, 'EEEE, MMMM d')}
          <span className="time-separator">·</span>
          {format(currentTime, 'h:mm a')}
        </span>
      </div>

      {/* Main content group */}
      <main className="tracker-main">
        
        {/* ONBOARDING TARGET: streak-counter */}
        <button className="streak streak-counter" onClick={() => setShowStreakOptions(true)}>
          <span className={`streak-num${userData.streakColorGold ? ' oracle-gold' : ''}`}>{streak}</span>
          <span className={`streak-unit${userData.streakColorGold ? ' oracle-gold' : ''}`}>days</span>
        </button>
        
        {milestone && (
          <p className="milestone">{milestone}</p>
        )}
        
      </main>

      {/* Footer */}
      <footer className="tracker-footer">
        {/* ONBOARDING TARGET: benefits-trigger */}
        <button 
          className={`${todayLogged ? 'btn-logged' : 'btn-primary'} benefits-trigger`}
          onClick={() => canLogBenefits ? setShowBenefits(true) : setShowLogLock(true)}
        >
          {todayLogged ? `${todayScore} ✓` : 'Log Today'}
        </button>
      </footer>

      {/* Oracle bar — pinned bottom, matches Calendar moon bar */}
      <div className="tracker-oracle-bar">
        <OraclePulse isPremium={isPremium} isGold={userData.streakColorGold} />
      </div>
      
    </div>
  );
};

export default Tracker;
