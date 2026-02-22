// Tracker.js - TITANTRACK
// UPDATED: Replaced DailyTransmission with EnergyAlmanac
// UPDATED: Added mutual exclusion between PatternInsightCard and EnergyAlmanac
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import './Tracker.css';
import DatePicker from '../Shared/DatePicker';
import PatternInsightCard from '../PatternInsight/PatternInsightCard';
import EnergyAlmanac from '../EnergyAlmanac/EnergyAlmanac';
import OnboardingGuide from '../OnboardingGuide/OnboardingGuide';
import DailyQuote from '../DailyQuote/DailyQuote';

// NEW: Import InterventionService for ML feedback loop
import interventionService from '../../services/InterventionService';

// Mixpanel Analytics
import { trackDailyLog, trackStreakReset } from '../../utils/mixpanel';

const Tracker = ({ userData, updateUserData, isPremium, onUpgrade }) => {
  // FIXED: Only show date picker if user has completed onboarding but hasn't set date
  const [showDatePicker, setShowDatePicker] = useState(!userData.startDate && userData.hasSeenOnboarding);
  const [showBenefits, setShowBenefits] = useState(false);
  const [showStreakOptions, setShowStreakOptions] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetType, setResetType] = useState(null);
  
  // Onboarding starts hidden — only shows after user clears the paywall
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Only trigger onboarding AFTER user has cleared the paywall
  useEffect(() => {
    if (!userData.hasSeenOnboarding && isPremium) {
      setShowOnboarding(true);
    }
  }, [isPremium, userData.hasSeenOnboarding]);
  
  // Deferred login toast — fires after route swap has settled
  // (OAuth redirects cause full page reload → route tree swap eats toasts fired during login)
  useEffect(() => {
    const msg = sessionStorage.getItem('login_toast');
    if (msg) {
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
    anxiety: 5, mood: 5, clarity: 5, processing: 5
  });
  
  // Track if user touched any emotional slider (prevents logging defaults as real data)
  const [emotionalTouched, setEmotionalTouched] = useState(false);
  
  // Peak State Recording — prompt after high benefit logs
  const [showPeakPrompt, setShowPeakPrompt] = useState(false);
  const [peakMessage, setPeakMessage] = useState('');
  const [showLogLock, setShowLogLock] = useState(false);
  
  // Live clock state - updates every minute
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const fillRefs = useRef({});
  
  // Body scroll lock removed - parent containers now have overflow:hidden
  
  // Use stored currentStreak for consistency across all tabs
  const streak = userData.currentStreak || 1;

  // Free users can log benefits for the first 30 days of each streak
  // Resets automatically on relapse (streak goes back to 1)
  const canLogBenefits = isPremium || streak <= 30;

  const todayLogged = userData.benefitTracking?.some(
    b => format(new Date(b.date), 'yyyy-MM-dd') === format(currentTime, 'yyyy-MM-dd')
  );

  // Live clock effect - updates every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every 60 seconds
    
    return () => clearInterval(timer);
  }, []);

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
        clarity: existing.clarity || 5,
        processing: existing.processing || 5
      });
      // If this entry already has emotional data, mark as touched
      if (typeof existing.anxiety === 'number') {
        setEmotionalTouched(true);
      }
    }
  }, [userData.benefitTracking, currentTime]);

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
    // Set date picker BEFORE hiding onboarding to prevent flash
    if (!userData.startDate) {
      setShowDatePicker(true);
    }
    setShowOnboarding(false);
    // Defer API call so it doesn't break React's state batching
    setTimeout(() => updateUserData({ hasSeenOnboarding: true }), 0);
  };

  // Handle onboarding trigger for date picker
  const handleOnboardingDateTrigger = () => {
    setShowOnboarding(false);
    setShowDatePicker(true);
    updateUserData({ hasSeenOnboarding: true });
  };

  // Date submit - no toast, modal closing is confirmation
  const handleDateSubmit = (date) => {
    const now = new Date();
    const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    // ONE-BASED COUNTING: Day 1 = start day (matches calendar display)
    const newStreak = Math.max(1, daysDiff + 1);
    
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
      start: date,
      end: null,
      days: newStreak,
      reason: null,
      trigger: null
    });
    
    updateUserData({
      startDate: date,
      currentStreak: newStreak,
      longestStreak: Math.max(userData.longestStreak || 0, newStreak),
      streakHistory: updatedStreakHistory
    });
    setShowDatePicker(false);
  };

  // Reset streak (relapse) - keep toast, this is significant
  const handleReset = () => {
    const now = new Date();
    const history = [...(userData.streakHistory || [])];
    const currentIdx = history.findIndex(s => !s.end);
    
    if (currentIdx !== -1) {
      history[currentIdx] = { ...history[currentIdx], end: now, days: streak, reason: 'relapse' };
    }
    // ONE-BASED COUNTING: New streak starts at Day 1
    history.push({ start: now, end: null, days: 1 });

    updateUserData({
      currentStreak: 1,
      startDate: now,
      streakHistory: history,
      lastRelapse: now, 
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
    wetDreams.push({ date: new Date(), streakDay: streak });
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
    { key: 'workout', label: 'Workout', desc: 'Physical performance and recovery' }
  ];

  // Emotional state sliders (optional, saves alongside benefits)
  const emotionalList = [
    { key: 'anxiety', label: 'Anxiety', desc: '1 = calm · 10 = severe' },
    { key: 'mood', label: 'Mood', desc: '1 = volatile · 10 = stable' },
    { key: 'clarity', label: 'Clarity', desc: '1 = foggy · 10 = sharp' },
    { key: 'processing', label: 'Processing', desc: '1 = blocked · 10 = flowing' }
  ];

  // Handle benefit change
  const handleBenefitChange = useCallback((key, value) => {
    const newValue = parseInt(value);
    setBenefits(prev => ({ ...prev, [key]: newValue }));
    
    // Mark emotional sliders as touched if user interacts with one
    if (['anxiety', 'mood', 'clarity', 'processing'].includes(key)) {
      setEmotionalTouched(true);
    }
    
    // Update fill bar visually - use ((value - 1) / 9) to match slider thumb position
    // Range is 1-10, so value 1 = 0% fill, value 10 = 100% fill
    if (fillRefs.current[key]) {
      fillRefs.current[key].style.width = `${((newValue - 1) / 9) * 100}%`;
    }
  }, []);

  // Save benefits
  const saveBenefits = () => {
    const today = format(currentTime, 'yyyy-MM-dd');
    const existing = userData.benefitTracking || [];
    const existingIdx = existing.findIndex(b => 
      format(new Date(b.date), 'yyyy-MM-dd') === today
    );
    
    // Only include emotional fields if user actually touched them
    const entry = { 
      date: new Date(), 
      energy: benefits.energy,
      focus: benefits.focus,
      confidence: benefits.confidence,
      aura: benefits.aura,
      sleep: benefits.sleep,
      workout: benefits.workout,
      ...(emotionalTouched ? {
        anxiety: benefits.anxiety,
        mood: benefits.mood,
        clarity: benefits.clarity,
        processing: benefits.processing
      } : {}),
      streakDay: streak 
    };
    
    if (existingIdx >= 0) {
      existing[existingIdx] = entry;
    } else {
      existing.push(entry);
    }
    
    updateUserData({ benefitTracking: existing });
    setShowBenefits(false);
    toast.success('Benefits logged.');
    
    // Peak State Detection — average of 6 core benefits ≥ 7 triggers prompt
    // Throttle: only show if no recordings exist OR most recent is 7+ days old
    const coreAvg = (benefits.energy + benefits.focus + benefits.confidence + benefits.aura + benefits.sleep + benefits.workout) / 6;
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
    
    // Track with Mixpanel
    trackDailyLog(benefits, streak);
  };

  // NEW: Callback for PatternInsightCard visibility changes
  const handlePatternAlertVisibilityChange = useCallback((isShowing) => {
    setIsPatternAlertShowing(isShowing);
  }, []);

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
    setShowPeakPrompt(false);
    setPeakMessage('');
    toast.success('Transmission recorded.');
  };

  // Show date picker if no start date set
  if (showDatePicker) {
    return (
      <div className="tracker">
        <div className="overlay">
          <DatePicker
            onSubmit={handleDateSubmit}
            onCancel={userData.startDate ? () => setShowDatePicker(false) : null}
            initialDate={userData.startDate ? new Date(userData.startDate) : new Date()}
            title={userData.startDate ? "Edit start date" : "When did you start?"}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="tracker">
      
      {/* Onboarding Guide - First time only */}
      {showOnboarding && isPremium && (
        <OnboardingGuide 
          onComplete={handleOnboardingComplete}
          onTriggerDatePicker={handleOnboardingDateTrigger}
        />
      )}
      
      {/* Benefits Modal */}
      {showBenefits && (
        <div className="overlay">
          <div className="benefits-modal" onClick={e => e.stopPropagation()}>
            <h2>Log Benefits</h2>
            <p>Rate today's benefits</p>
            
            <div className="benefits-list">
              {benefitsList.map(({ key, label, desc }) => (
                <div key={key} className="benefit-row">
                  <div className="benefit-info">
                    <span>{label}</span>
                    <span className="benefit-num">{benefits[key]}/10</span>
                  </div>
                  <div className="benefit-slider">
                    <div 
                      className="benefit-fill" 
                      ref={el => fillRefs.current[key] = el}
                      style={{ width: `${((benefits[key] - 1) / 9) * 100}%` }}
                    />
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={benefits[key]}
                      onChange={e => handleBenefitChange(key, e.target.value)}
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
                    <span className="benefit-num">{benefits[key]}/10</span>
                  </div>
                  <div className="benefit-slider">
                    <div 
                      className="benefit-fill" 
                      ref={el => fillRefs.current[key] = el}
                      style={{ width: `${((benefits[key] - 1) / 9) * 100}%` }}
                    />
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={benefits[key]}
                      onChange={e => handleBenefitChange(key, e.target.value)}
                    />
                  </div>
                  <span className="benefit-desc">{desc}</span>
                </div>
              ))}
            </div>
            
            <div className="benefits-actions">
              <button className="btn-primary" onClick={saveBenefits}>Save</button>
              <button className="btn-ghost" onClick={() => setShowBenefits(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Peak State Recording Prompt */}
      {showPeakPrompt && (
        <div className="overlay">
          <div className="peak-prompt" onClick={e => e.stopPropagation()}>
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
                Save Transmission
              </button>
              <button className="btn-ghost" onClick={() => { setShowPeakPrompt(false); setPeakMessage(''); }}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Streak Options */}
      {showStreakOptions && (
        <div className="overlay">
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-content">
              <button onClick={() => { setShowStreakOptions(false); setShowDatePicker(true); }}>
                Edit start date
              </button>
              <div className="sheet-divider" />
              <button 
                onClick={() => { setResetType('wetdream'); setShowResetConfirm(true); }}
              >
                Log wet dream
              </button>
              <div className="sheet-divider" />
              <button 
                className="danger" 
                onClick={() => { setResetType('relapse'); setShowResetConfirm(true); }}
              >
                Reset streak
              </button>
            </div>
            <button className="cancel" onClick={() => setShowStreakOptions(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirm */}
      {showResetConfirm && (
        <div className="overlay">
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
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
              <button className="btn-ghost" onClick={() => setShowResetConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Benefit Logging Lock — Free users past day 30 */}
      {showLogLock && (
        <div className="overlay">
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <h2>Logging Locked</h2>
            <p>
              Benefit tracking is available for the first 30 days of each streak. 
              You're on day {streak} — upgrade to Premium for unlimited logging and full analytics.
            </p>
            <div className="confirm-actions">
              <button className="btn-primary" onClick={() => { setShowLogLock(false); onUpgrade(); }}>Upgrade</button>
              <button className="btn-ghost" onClick={() => setShowLogLock(false)}>Not now</button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      {/* Energy Almanac - Fixed at top */}
      {/* Only shows when PatternInsightCard is NOT showing */}
      <EnergyAlmanac 
        userData={userData}
        isPatternAlertShowing={isPatternAlertShowing}
      />
      
      {/* Main - Centers in remaining space */}
      <main className="tracker-main">
        {/* AI Pattern Insight - inside tracker-main so it's always visible */}
        <PatternInsightCard 
          userData={userData} 
          onVisibilityChange={handlePatternAlertVisibilityChange}
        />
        <p className="date">
          {format(currentTime, 'EEEE, MMMM d')}
          <span className="time-separator">·</span>
          <span className="time">{format(currentTime, 'h:mm a')}</span>
        </p>
        
        {/* ONBOARDING TARGET: streak-counter */}
        <button className="streak streak-counter" onClick={() => setShowStreakOptions(true)}>
          <span className="streak-num">{streak}</span>
          <span className="streak-unit">days</span>
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
          {todayLogged ? 'Logged Today ✓' : canLogBenefits ? 'Log Today' : 'Log Today 🔒'}
        </button>
      </footer>

      {/* Daily Quote - visual floor */}
      <DailyQuote />
      
    </div>
  );
};

export default Tracker;
