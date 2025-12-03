// Tracker.js - TITANTRACK
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import './Tracker.css';
import DatePicker from '../Shared/DatePicker';
import PatternInsightCard from '../PatternInsight/PatternInsightCard';

// NEW: Import InterventionService for ML feedback loop
import interventionService from '../../services/InterventionService';

const Tracker = ({ userData, updateUserData }) => {
  const [showDatePicker, setShowDatePicker] = useState(!userData.startDate);
  const [showBenefits, setShowBenefits] = useState(false);
  const [showStreakOptions, setShowStreakOptions] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetType, setResetType] = useState(null);
  
  const [benefits, setBenefits] = useState({ 
    energy: 5, focus: 5, confidence: 5, aura: 5, sleep: 5, workout: 5 
  });
  
  // Live clock state - updates every minute
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const fillRefs = useRef({});
  
  // Use stored currentStreak for consistency across all tabs
  const streak = userData.currentStreak || 0;

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
        workout: existing.workout || 5
      });
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

  // Date submit - no toast, modal closing is confirmation
  const handleDateSubmit = (date) => {
    const now = new Date();
    const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    const newStreak = Math.max(0, daysDiff);
    updateUserData({
      startDate: date,
      currentStreak: newStreak,
      longestStreak: Math.max(userData.longestStreak || 0, newStreak)
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
    history.push({ start: now, end: null, days: 0 });

    updateUserData({
      currentStreak: 0,
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
      console.warn('InterventionService notification error:', error);
    }

    setShowResetConfirm(false);
    setShowStreakOptions(false);
    setResetType(null);
    toast.success('Relapse logged');
  };

  // Log wet dream - no toast, modal closing is confirmation
  const handleLogWetDream = () => {
    updateUserData({
      wetDreams: [...(userData.wetDreams || []), { date: new Date(), streakDay: streak }],
      lastWetDream: new Date()
    });

    setShowResetConfirm(false);
    setShowStreakOptions(false);
    setResetType(null);
  };

  // Benefits
  const updateFill = useCallback((key, val) => {
    if (fillRefs.current[key]) {
      fillRefs.current[key].style.width = `${((val - 1) / 9) * 100}%`;
    }
  }, []);

  useEffect(() => {
    Object.entries(benefits).forEach(([k, v]) => updateFill(k, v));
  }, [benefits, updateFill]);

  const handleBenefitChange = (key, val) => {
    const num = parseInt(val, 10);
    setBenefits(prev => ({ ...prev, [key]: num }));
    updateFill(key, num);
  };

  // Save benefits - no toast, modal closing is confirmation
  const saveBenefits = () => {
    const todayStr = format(currentTime, 'yyyy-MM-dd');
    const existing = userData.benefitTracking || [];
    const idx = existing.findIndex(b => format(new Date(b.date), 'yyyy-MM-dd') === todayStr);
    
    const entry = { date: new Date(), day: streak, ...benefits };
    const updated = idx !== -1 
      ? existing.map((b, i) => i === idx ? entry : b)
      : [...existing, entry];

    updateUserData({ benefitTracking: updated });
    setShowBenefits(false);
  };

  const benefitsList = [
    { key: 'energy', label: 'Energy', desc: '1 = drained, 10 = energized' },
    { key: 'focus', label: 'Focus', desc: '1 = scattered, 10 = laser' },
    { key: 'confidence', label: 'Confidence', desc: '1 = low, 10 = high' },
    { key: 'aura', label: 'Aura', desc: '1 = dim, 10 = radiant' },
    { key: 'sleep', label: 'Sleep', desc: '1 = poor, 10 = excellent' },
    { key: 'workout', label: 'Workout', desc: '1 = weak, 10 = strong' }
  ];

  // Date picker screen
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
      
      {/* AI Pattern Insight - ambient, non-intrusive */}
      <PatternInsightCard userData={userData} />
      
      {/* Benefits Modal */}
      {showBenefits && (
        <div className="overlay" onClick={() => setShowBenefits(false)}>
          <div className="benefits-modal" onClick={e => e.stopPropagation()}>
            <h2>How do you feel?</h2>
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
              <button className="btn-ghost" onClick={() => setShowBenefits(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveBenefits}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Streak Options */}
      {showStreakOptions && (
        <div className="overlay" onClick={() => setShowStreakOptions(false)}>
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
        <div className="overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <h2>{resetType === 'wetdream' ? 'Log wet dream?' : 'Reset streak?'}</h2>
            <p>
              {resetType === 'wetdream' 
                ? 'This will be logged but won\'t affect your streak. Wet dreams are natural.'
                : 'Your current streak will be saved to history.'
              }
            </p>
            <div className="confirm-actions">
              <button className="btn-ghost" onClick={() => setShowResetConfirm(false)}>Cancel</button>
              <button 
                className={resetType === 'relapse' ? 'btn-danger' : 'btn-primary'} 
                onClick={resetType === 'wetdream' ? handleLogWetDream : handleReset}
              >
                {resetType === 'wetdream' ? 'Log it' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="tracker-main">
        <p className="date">
          {format(currentTime, 'EEEE, MMMM d')}
          <span className="time-separator">·</span>
          <span className="time">{format(currentTime, 'h:mm a')}</span>
        </p>
        
        <button className="streak" onClick={() => setShowStreakOptions(true)}>
          <span className="streak-num">{streak}</span>
          <span className="streak-unit">days</span>
        </button>
        
        {milestone && (
          <p className="milestone">{milestone}</p>
        )}
      </main>

      {/* Footer */}
      <footer className="tracker-footer">
        <button 
          className={todayLogged ? 'btn-logged' : 'btn-primary'}
          onClick={() => setShowBenefits(true)}
        >
          {todayLogged ? 'Logged Today ✓' : 'Log Today'}
        </button>
      </footer>
      
    </div>
  );
};

export default Tracker;