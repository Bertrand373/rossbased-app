// Tracker.js - TITANTRACK MODERN MINIMAL
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import './Tracker.css';
import './TrackerSections.css';
import './TrackerButtons.css';

import DatePicker from '../Shared/DatePicker';
import MLWidget from '../MLWidget/MLWidget';
import PredictionDisplay from '../PredictionDisplay/PredictionDisplay';

import { 
  FaFire, 
  FaExclamationTriangle,
  FaInfoCircle, 
  FaEdit,
  FaTimes,
  FaMoon,
  FaShieldAlt,
  FaDiscord,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaUsers,
  FaYoutube,
  FaPlay,
  FaCalendarWeek,
  FaChartLine,
  FaClipboardCheck
} from 'react-icons/fa';

const Tracker = ({ userData, updateUserData, isPremium }) => {
  const navigate = useNavigate();
  const [showSetStartDate, setShowSetStartDate] = useState(!userData.startDate);
  const [showVideo, setShowVideo] = useState(false);
  const [featuredVideoId] = useState('_1CcOqHD57E');
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [modalBenefits, setModalBenefits] = useState({ 
    energy: 5, focus: 5, confidence: 5, aura: 5, sleep: 5, workout: 5 
  });
  
  const trackFillRefs = useRef({
    energy: null, focus: null, confidence: null, aura: null, sleep: null, workout: null
  });
  
  const [startDate, setStartDate] = useState(
    userData.startDate ? new Date(userData.startDate) : new Date()
  );
  const [currentStreak, setCurrentStreak] = useState(userData.currentStreak || 0);
  const [benefitsLogged, setBenefitsLogged] = useState(false);
  
  const today = new Date();

  const calculateNextMilestone = (streak) => {
    const milestones = [7, 14, 30, 90, 180, 365];
    
    if (streak >= 365) {
      const yearsComplete = Math.floor(streak / 365);
      const nextAnniversary = (yearsComplete + 1) * 365;
      return {
        isSageMode: true,
        yearsComplete,
        totalDays: streak,
        daysUntilNextAnniversary: nextAnniversary - streak,
        nextAnniversaryYear: yearsComplete + 1
      };
    }
    
    for (let milestone of milestones) {
      if (streak < milestone) {
        return {
          isSageMode: false,
          target: milestone,
          daysRemaining: milestone - streak,
          progress: (streak / milestone) * 100
        };
      }
    }
    
    return { isSageMode: false, target: 365, daysRemaining: 365 - streak, progress: (streak / 365) * 100 };
  };

  const calculateDaysThisMonth = () => {
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const totalDaysInMonth = differenceInDays(monthEnd, monthStart) + 1;
    
    if (!userData.benefitTracking || userData.benefitTracking.length === 0) {
      return { logged: 0, total: totalDaysInMonth };
    }
    
    const daysLogged = userData.benefitTracking.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= monthStart && entryDate <= monthEnd;
    }).length;
    
    return { logged: daysLogged, total: totalDaysInMonth };
  };

  const nextMilestone = calculateNextMilestone(currentStreak);
  const monthProgress = calculateDaysThisMonth();

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
        sleep: existingBenefits.sleep || existingBenefits.attraction || 5,
        workout: existingBenefits.workout || existingBenefits.gymPerformance || 5
      });
      setBenefitsLogged(true);
    } else {
      setModalBenefits({ energy: 5, focus: 5, confidence: 5, aura: 5, sleep: 5, workout: 5 });
      setBenefitsLogged(false);
    }
  }, [userData.benefitTracking]);

  const handleDateSubmit = (newDate) => {
    try {
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
    } catch (error) {
      console.error("Error setting date:", error);
      toast.error('Error setting date');
    }
  };

  const handleDateCancel = () => setShowSetStartDate(false);
  
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
  }, [userData, today]);

  const daysSinceStart = userData.startDate 
    ? differenceInDays(today, new Date(userData.startDate)) + 1 
    : 0;

  const handleRelapse = () => {
    if (window.confirm('Are you sure you want to log a relapse? This will reset your current streak.')) {
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
      toast.success('Streak reset. New journey begins now.');
    }
  };

  const handleWetDream = () => {
    if (window.confirm('Log a wet dream? Your streak will continue - this is a natural occurrence.')) {
      const now = new Date();
      const updatedWetDreams = [...(userData.wetDreams || []), { date: now, streakDay: currentStreak }];
      
      updateUserData({ wetDreams: updatedWetDreams, lastWetDream: now });
      toast.success('Wet dream logged. Streak continues.');
    }
  };

  const handleUrges = () => navigate('/urge-toolkit');

  const handleBenefitsLog = () => setShowBenefitsModal(true);

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
    
    const benefitEntry = {
      date: new Date(),
      day: currentStreak,
      ...modalBenefits
    };
    
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
    toast.success(existingIndex !== -1 ? 'Benefits updated' : 'Benefits logged');
  };

  const handleDiscordJoin = () => window.open('https://discord.gg/yourserver', '_blank');
  const handleYouTubeSubscribe = () => window.open('https://youtube.com/@yourchannel', '_blank');
  const handleWatchVideo = () => setShowVideo(true);

  const benefitLabels = {
    energy: 'Energy',
    focus: 'Focus', 
    confidence: 'Confidence',
    aura: 'Aura',
    sleep: 'Sleep Quality',
    workout: 'Workout Performance'
  };

  // Date Picker Modal
  if (showSetStartDate) {
    return (
      <div className="tracker-container">
        <div className="modal-overlay">
          <DatePicker
            onSubmit={handleDateSubmit}
            onCancel={handleDateCancel}
            initialDate={userData.startDate ? new Date(userData.startDate) : new Date()}
            title={userData.startDate ? "Edit Start Date" : "Set Your Start Date"}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="tracker-container">
      
      {/* Benefits Modal */}
      {showBenefitsModal && (
        <div className="modal-overlay" onClick={() => setShowBenefitsModal(false)}>
          <div className="benefits-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowBenefitsModal(false)}>
              <FaTimes />
            </button>
            
            <div className="benefits-modal-header">
              <h3>Log Today's Benefits</h3>
              <p>Rate how you're feeling today (1-10)</p>
            </div>
            
            <div className="benefits-modal-sliders">
              {Object.entries(modalBenefits).map(([metric, value]) => (
                <div key={metric} className="benefit-slider-row">
                  <div className="benefit-slider-header">
                    <span className="benefit-label">{benefitLabels[metric]}</span>
                    <span className="benefit-value">{value}</span>
                  </div>
                  <div className="benefit-slider-track">
                    <div 
                      className="benefit-slider-fill" 
                      ref={el => trackFillRefs.current[metric] = el}
                      style={{ width: `${((value - 1) / 9) * 100}%` }}
                    />
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={value}
                      onChange={(e) => handleBenefitChange(metric, e.target.value)}
                      className="benefit-slider"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="benefits-modal-actions">
              <button className="btn-secondary" onClick={() => setShowBenefitsModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleBenefitsSave}>
                Save Benefits
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Video Modal */}
      {showVideo && (
        <div className="modal-overlay" onClick={() => setShowVideo(false)}>
          <div className="video-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowVideo(false)}>
              <FaTimes />
            </button>
            <div className="video-container">
              <iframe
                src={`https://www.youtube.com/embed/${featuredVideoId}?autoplay=1&rel=0`}
                title="Featured Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="tracker-header">
        <div className="tracker-header-content">
          <h1>Dashboard</h1>
          {userData.startDate && (
            <button className="btn-ghost" onClick={() => setShowSetStartDate(true)}>
              <FaEdit />
              <span>Edit Start Date</span>
            </button>
          )}
        </div>
      </header>
      
      {/* Main Grid */}
      <div className="tracker-grid">
        
        {/* Streak Card */}
        <div className="streak-card">
          <div className="streak-date">{format(new Date(), 'EEEE, MMMM d')}</div>
          
          <div className="streak-display">
            <span className="streak-number">{currentStreak}</span>
            <span className="streak-unit">days</span>
          </div>
          
          {/* Milestone Info */}
          <div className="streak-meta">
            <div className="meta-item">
              <FaFire className="meta-icon" />
              <span>
                {nextMilestone.isSageMode 
                  ? `Year ${nextMilestone.yearsComplete} complete`
                  : `${nextMilestone.daysRemaining} days to ${nextMilestone.target}`
                }
              </span>
            </div>
            <div className="meta-item">
              <FaClipboardCheck className="meta-icon" />
              <span>{monthProgress.logged}/{monthProgress.total} logged this month</span>
            </div>
          </div>
          
          {/* Benefits Status */}
          <div className={`benefits-status ${benefitsLogged ? 'logged' : ''}`}>
            {benefitsLogged ? (
              <>
                <FaCheckCircle />
                <span>Today's benefits logged</span>
              </>
            ) : (
              <>
                <FaInfoCircle />
                <span>Log your daily benefits</span>
              </>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="streak-actions">
            <button className="action-btn action-primary" onClick={handleBenefitsLog}>
              <FaChartLine />
              <span>{benefitsLogged ? 'Update Benefits' : 'Log Benefits'}</span>
            </button>
            
            <button className="action-btn action-muted" onClick={handleRelapse}>
              <FaExclamationTriangle />
              <span>Log Relapse</span>
            </button>
            
            <button className="action-btn action-warning" onClick={handleWetDream}>
              <FaMoon />
              <span>Log Wet Dream</span>
            </button>
            
            <button className="action-btn action-default" onClick={handleUrges}>
              <FaShieldAlt />
              <span>Fighting Urges?</span>
            </button>
          </div>
        </div>
        
        {/* Side Column */}
        <div className="tracker-sidebar">
          
          {/* ML Widgets */}
          <MLWidget userData={userData} />
          <PredictionDisplay mode="compact" userData={userData} />
          
          {/* Discord Card */}
          <div className="community-card">
            <div className="community-header">
              <FaDiscord className="community-icon discord" />
              <div>
                <h3>Join the Community</h3>
                <p>Connect with others on the same journey</p>
              </div>
            </div>
            
            <div className="community-stats">
              <div className="stat">
                <FaUsers />
                <span>Active Community</span>
              </div>
              <div className="stat">
                <FaShieldAlt />
                <span>24/7 Support</span>
              </div>
            </div>
            
            {userData.showOnLeaderboard && userData.discordUsername && (
              <div className="community-status">
                <FaCheckCircle />
                <span>Leaderboard: <strong>{userData.discordUsername}</strong></span>
              </div>
            )}
            
            <button className="community-btn discord" onClick={handleDiscordJoin}>
              <FaDiscord />
              <span>Join Discord</span>
              <FaExternalLinkAlt className="external-icon" />
            </button>
          </div>
          
          {/* YouTube Card */}
          <div className="community-card">
            <div className="community-header">
              <FaYoutube className="community-icon youtube" />
              <div>
                <h3>Featured Content</h3>
                <p>Essential knowledge for your journey</p>
              </div>
            </div>
            
            <div className="video-preview" onClick={handleWatchVideo}>
              <img 
                src={`https://img.youtube.com/vi/${featuredVideoId}/maxresdefault.jpg`}
                alt="Featured Video"
              />
              <div className="play-button">
                <FaPlay />
              </div>
            </div>
            
            <div className="community-stats">
              <div className="stat">
                <FaUsers />
                <span>10K+ Subscribers</span>
              </div>
              <div className="stat">
                <FaCalendarWeek />
                <span>Weekly Content</span>
              </div>
            </div>
            
            <button className="community-btn youtube" onClick={handleYouTubeSubscribe}>
              <FaYoutube />
              <span>Subscribe</span>
              <FaExternalLinkAlt className="external-icon" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tracker;