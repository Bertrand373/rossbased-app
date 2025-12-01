// Tracker.js - TITANTRACK MODERN MINIMAL
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import './Tracker.css';

import DatePicker from '../Shared/DatePicker';

import { 
  FaCheck,
  FaTimes,
  FaMoon,
  FaShieldAlt,
  FaChevronRight,
  FaDiscord
} from 'react-icons/fa';

const Tracker = ({ userData, updateUserData, isPremium }) => {
  const navigate = useNavigate();
  const [showSetStartDate, setShowSetStartDate] = useState(!userData.startDate);
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [modalBenefits, setModalBenefits] = useState({ 
    energy: 5, focus: 5, confidence: 5, aura: 5, sleep: 5, workout: 5 
  });
  
  const trackFillRefs = useRef({});
  
  const [startDate, setStartDate] = useState(
    userData.startDate ? new Date(userData.startDate) : new Date()
  );
  const [currentStreak, setCurrentStreak] = useState(userData.currentStreak || 0);
  const [benefitsLogged, setBenefitsLogged] = useState(false);
  
  const today = new Date();

  const calculateNextMilestone = (streak) => {
    const milestones = [7, 14, 30, 60, 90, 180, 365];
    
    if (streak >= 365) {
      const yearsComplete = Math.floor(streak / 365);
      return { isSageMode: true, yearsComplete, totalDays: streak };
    }
    
    for (let milestone of milestones) {
      if (streak < milestone) {
        return { target: milestone, daysRemaining: milestone - streak };
      }
    }
    
    return { target: 365, daysRemaining: 365 - streak };
  };

  const nextMilestone = calculateNextMilestone(currentStreak);

  useEffect(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existingBenefits = userData.benefitTracking?.find(
      benefit => format(new Date(benefit.date), 'yyyy-MM-dd') === todayStr
    );
    
    if (existingBenefits) {
      setModalBenefits({
        energy: existingBenefits.energy || 5,
        focus: existingBenefits.focus || 5,
        confidence: existingBenefits.confidence || 5,
        aura: existingBenefits.aura || 5,
        sleep: existingBenefits.sleep || 5,
        workout: existingBenefits.workout || 5
      });
      setBenefitsLogged(true);
    } else {
      setBenefitsLogged(false);
    }
  }, [userData.benefitTracking]);

  const handleDateSubmit = (newDate) => {
    const calculatedStreak = differenceInDays(today, newDate) + 1;
    const newStreak = calculatedStreak > 0 ? calculatedStreak : 0;
    
    updateUserData({
      startDate: newDate,
      currentStreak: newStreak,
      longestStreak: Math.max(userData.longestStreak || 0, newStreak)
    });
    
    setStartDate(newDate);
    setCurrentStreak(newStreak);
    setShowSetStartDate(false);
    toast.success('Start date updated');
  };
  
  useEffect(() => {
    if (userData.startDate) {
      const startDateObj = new Date(userData.startDate);
      setStartDate(startDateObj);
      
      if (!isNaN(startDateObj.getTime())) {
        const calculatedStreak = differenceInDays(today, startDateObj) + 1;
        setCurrentStreak(calculatedStreak > 0 ? calculatedStreak : 0);
      }
    }
    
    if (userData.currentStreak !== undefined) {
      setCurrentStreak(userData.currentStreak);
    }
  }, [userData]);

  const daysSinceStart = userData.startDate 
    ? differenceInDays(today, new Date(userData.startDate)) + 1 
    : 0;

  const handleRelapse = () => {
    if (window.confirm('Reset your streak?')) {
      const now = new Date();
      const updatedHistory = [...(userData.streakHistory || [])];
      const currentStreakIndex = updatedHistory.findIndex(streak => 
        streak.end === null || streak.end === undefined
      );
      
      if (currentStreakIndex !== -1) {
        updatedHistory[currentStreakIndex] = {
          ...updatedHistory[currentStreakIndex],
          end: now,
          days: daysSinceStart,
          reason: 'relapse'
        };
      }
      
      updatedHistory.push({ start: now, end: null, days: 0 });
      
      updateUserData({
        currentStreak: 0,
        startDate: now,
        lastRelapse: now,
        relapseCount: (userData.relapseCount || 0) + 1,
        streakHistory: updatedHistory
      });
      
      setStartDate(now);
      setCurrentStreak(0);
      setShowActionsMenu(false);
      toast.success('New journey begins');
    }
  };

  const handleWetDream = () => {
    if (window.confirm('Log wet dream? Your streak continues.')) {
      const now = new Date();
      const updatedWetDreams = [...(userData.wetDreams || []), { date: now, streakDay: currentStreak }];
      updateUserData({ wetDreams: updatedWetDreams, lastWetDream: now });
      setShowActionsMenu(false);
      toast.success('Logged');
    }
  };

  const handleUrges = () => {
    setShowActionsMenu(false);
    navigate('/urge-toolkit');
  };

  const handleDiscordJoin = () => {
    window.open('https://discord.gg/yourserver', '_blank');
    setShowActionsMenu(false);
  };

  const updateTrackFill = useCallback((metric, value) => {
    const fillElement = trackFillRefs.current[metric];
    if (fillElement) {
      const percentage = ((value - 1) / 9) * 100;
      fillElement.style.width = `${percentage}%`;
    }
  }, []);

  useEffect(() => {
    Object.keys(modalBenefits).forEach(metric => {
      updateTrackFill(metric, modalBenefits[metric]);
    });
  }, [modalBenefits, updateTrackFill]);

  const handleBenefitChange = (metric, value) => {
    const numValue = parseInt(value, 10);
    setModalBenefits(prev => ({ ...prev, [metric]: numValue }));
    updateTrackFill(metric, numValue);
  };

  const handleBenefitsSave = () => {
    const todayDate = format(new Date(), 'yyyy-MM-dd');
    const existingIndex = userData.benefitTracking?.findIndex(
      benefit => format(new Date(benefit.date), 'yyyy-MM-dd') === todayDate
    ) ?? -1;
    
    const benefitEntry = { date: new Date(), day: currentStreak, ...modalBenefits };
    
    let updatedTracking;
    if (existingIndex !== -1) {
      updatedTracking = [...userData.benefitTracking];
      updatedTracking[existingIndex] = benefitEntry;
    } else {
      updatedTracking = [...(userData.benefitTracking || []), benefitEntry];
    }
    
    updateUserData({ benefitTracking: updatedTracking });
    setBenefitsLogged(true);
    setShowBenefitsModal(false);
    toast.success('Saved');
  };

  const benefits = [
    { key: 'energy', label: 'Energy' },
    { key: 'focus', label: 'Focus' },
    { key: 'confidence', label: 'Confidence' },
    { key: 'aura', label: 'Aura' },
    { key: 'sleep', label: 'Sleep' },
    { key: 'workout', label: 'Workout' }
  ];

  // Date Picker
  if (showSetStartDate) {
    return (
      <div className="tracker">
        <div className="modal-overlay">
          <DatePicker
            onSubmit={handleDateSubmit}
            onCancel={() => setShowSetStartDate(false)}
            initialDate={userData.startDate ? new Date(userData.startDate) : new Date()}
            title={userData.startDate ? "Edit Start Date" : "When did you start?"}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="tracker">
      
      {/* Benefits Modal */}
      {showBenefitsModal && (
        <div className="modal-overlay" onClick={() => setShowBenefitsModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowBenefitsModal(false)}>
              <FaTimes />
            </button>
            
            <div className="modal-header">
              <h2>How do you feel?</h2>
              <p>Rate today's benefits</p>
            </div>
            
            <div className="benefits-grid">
              {benefits.map(({ key, label }) => (
                <div key={key} className="benefit-item">
                  <div className="benefit-header">
                    <span className="benefit-label">{label}</span>
                    <span className="benefit-value">{modalBenefits[key]}</span>
                  </div>
                  <div className="benefit-track">
                    <div 
                      className="benefit-fill" 
                      ref={el => trackFillRefs.current[key] = el}
                      style={{ width: `${((modalBenefits[key] - 1) / 9) * 100}%` }}
                    />
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={modalBenefits[key]}
                      onChange={(e) => handleBenefitChange(key, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <button className="modal-save" onClick={handleBenefitsSave}>
              Save
            </button>
          </div>
        </div>
      )}

      {/* Actions Menu */}
      {showActionsMenu && (
        <div className="modal-overlay" onClick={() => setShowActionsMenu(false)}>
          <div className="actions-menu" onClick={e => e.stopPropagation()}>
            {!userData.showOnLeaderboard && (
              <>
                <button className="action-item discord" onClick={handleDiscordJoin}>
                  <FaDiscord />
                  <span>Join Discord</span>
                  <FaChevronRight className="chevron" />
                </button>
                <div className="action-divider" />
              </>
            )}
            <button className="action-item" onClick={handleUrges}>
              <FaShieldAlt />
              <span>Fighting urges</span>
              <FaChevronRight className="chevron" />
            </button>
            <button className="action-item" onClick={handleWetDream}>
              <FaMoon />
              <span>Log wet dream</span>
              <FaChevronRight className="chevron" />
            </button>
            <div className="action-divider" />
            <button className="action-item danger" onClick={handleRelapse}>
              <span>Reset streak</span>
              <FaChevronRight className="chevron" />
            </button>
            <button className="action-cancel" onClick={() => setShowActionsMenu(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="tracker-main">
        
        {/* Date */}
        <p className="tracker-date">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
        
        {/* Streak */}
        <div className="tracker-streak" onClick={() => setShowSetStartDate(true)}>
          <span className="streak-number">{currentStreak}</span>
          <span className="streak-label">days</span>
        </div>
        
        {/* Milestone */}
        <p className="tracker-milestone">
          {nextMilestone.isSageMode 
            ? `Year ${nextMilestone.yearsComplete} complete`
            : `${nextMilestone.daysRemaining} days to ${nextMilestone.target}`
          }
        </p>
        
        {/* Benefits Status */}
        {benefitsLogged && (
          <div className="tracker-status">
            <FaCheck />
            <span>Today logged</span>
          </div>
        )}

        {/* Discord Leaderboard Status */}
        {userData.showOnLeaderboard && userData.discordUsername && (
          <div className="tracker-discord">
            <FaDiscord />
            <span>Leaderboard: {userData.discordUsername}</span>
          </div>
        )}
        
      </main>

      {/* Actions */}
      <footer className="tracker-footer">
        <button 
          className="primary-action"
          onClick={() => setShowBenefitsModal(true)}
        >
          {benefitsLogged ? 'Update benefits' : 'Log benefits'}
        </button>
        
        <button 
          className="secondary-action"
          onClick={() => setShowActionsMenu(true)}
        >
          More actions
        </button>
      </footer>
      
    </div>
  );
};

export default Tracker;