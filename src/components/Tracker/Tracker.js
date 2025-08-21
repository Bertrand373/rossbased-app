// components/Tracker/Tracker.js - UPDATED: Shortened milestone text for uniform card heights
import React, { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Tracker.css';

// Components
import DatePicker from '../Shared/DatePicker';

// Icons - UPDATED: Added YouTube icon import
import { 
  FaCrown, 
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
  FaCalendarAlt
} from 'react-icons/fa';

const Tracker = ({ userData, updateUserData, isPremium }) => {
  const navigate = useNavigate();
  const [showSetStartDate, setShowSetStartDate] = useState(!userData.startDate);
  
  // Initialize with the current date if no start date exists
  const [startDate, setStartDate] = useState(
    userData.startDate ? new Date(userData.startDate) : new Date()
  );
  
  const [currentStreak, setCurrentStreak] = useState(userData.currentStreak || 0);
  
  // Benefit tracking states - Sleep Quality replaces Attraction
  const [todayBenefits, setTodayBenefits] = useState({ 
    energy: 5, 
    focus: 5, 
    confidence: 5, 
    aura: 5, 
    sleep: 5,  // CHANGED: sleep replaces attraction
    workout: 5 
  });
  const [benefitsLogged, setBenefitsLogged] = useState(false);
  
  const today = new Date();

  // Check if benefits are already logged for today
  useEffect(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existingBenefits = userData.benefitTracking?.find(
      benefit => format(new Date(benefit.date), 'yyyy-MM-dd') === todayStr
    );
    
    if (existingBenefits) {
      setTodayBenefits({
        energy: existingBenefits.energy,
        focus: existingBenefits.focus,
        confidence: existingBenefits.confidence,
        aura: existingBenefits.aura,
        sleep: existingBenefits.sleep || existingBenefits.attraction || 5, // MIGRATION: Handle old attraction data
        workout: existingBenefits.workout || existingBenefits.gymPerformance || 5
      });
      setBenefitsLogged(true);
    }
  }, [userData.benefitTracking]);

  // React DatePicker handlers
  const handleDateSubmit = (newDate) => {
    try {
      // Calculate current streak based on the new start date
      const calculatedStreak = differenceInDays(today, newDate) + 1;
      const newStreak = calculatedStreak > 0 ? calculatedStreak : 0;
      
      // Update user data with new start date and current streak
      updateUserData({
        startDate: newDate,
        currentStreak: newStreak,
        longestStreak: Math.max(userData.longestStreak || 0, newStreak)
      });
      
      // Update local state
      setStartDate(newDate);
      setCurrentStreak(newStreak);
      setShowSetStartDate(false);
      
      toast.success('Start date set successfully!');
    } catch (error) {
      console.error("Error setting date:", error);
      toast.error('Error setting date. Please try again.');
    }
  };

  const handleDateCancel = () => {
    setShowSetStartDate(false);
  };
  
  // Update UI when userData changes
  useEffect(() => {
    if (userData.startDate) {
      const startDateObj = new Date(userData.startDate);
      setStartDate(startDateObj);
      
      // Calculate current streak based on start date
      if (!isNaN(startDateObj.getTime())) {
        const calculatedStreak = differenceInDays(today, startDateObj) + 1;
        setCurrentStreak(calculatedStreak > 0 ? calculatedStreak : 0);
      }
    }
    
    if (userData.currentStreak !== undefined) {
      setCurrentStreak(userData.currentStreak);
    }
  }, [userData, today]);

  // Calculate days since start
  const daysSinceStart = userData.startDate 
    ? differenceInDays(today, new Date(userData.startDate)) + 1 
    : 0;

  const handleRelapse = () => {
    // Confirm relapse
    if (window.confirm('Are you sure you want to log a relapse? This will reset your current streak.')) {
      const now = new Date();
      
      // Update streak history to mark current streak as ended
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
      
      // Add new streak starting today
      const newStreak = {
        id: (userData.streakHistory?.length || 0) + 1,
        start: now,
        end: null,
        days: 0,
        reason: null
      };
      
      updatedHistory.push(newStreak);
      
      // Update user data
      updateUserData({
        startDate: now,
        currentStreak: 0,
        relapseCount: (userData.relapseCount || 0) + 1,
        streakHistory: updatedHistory
      });
      
      // Update local state
      setCurrentStreak(0);
      setStartDate(now);
      
      toast.error('Streak reset. Keep going - every day is a new opportunity!');
    }
  };

  const handleWetDream = () => {
    if (window.confirm('Do you want to log a wet dream? This will not reset your streak.')) {
      updateUserData({
        wetDreamCount: (userData.wetDreamCount || 0) + 1
      });
      
      toast.success('Wet dream logged. Your streak continues!');
    }
  };

  // Handle urge redirection to urge tab
  const handleUrges = () => {
    navigate('/urge-toolkit');
  };

  // Handle benefit logging
  const handleBenefitChange = (type, value) => {
    setTodayBenefits(prev => ({
      ...prev,
      [type]: value
    }));
  };

  // Enable editing of benefits
  const enableBenefitEditing = () => {
    setBenefitsLogged(false);
  };

  const saveBenefits = () => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Remove existing entry for today if it exists
    const updatedBenefitTracking = (userData.benefitTracking || []).filter(
      benefit => format(new Date(benefit.date), 'yyyy-MM-dd') !== todayStr
    );
    
    // Add new entry
    updatedBenefitTracking.push({
      date: today,
      energy: todayBenefits.energy,
      focus: todayBenefits.focus,
      confidence: todayBenefits.confidence,
      aura: todayBenefits.aura,
      sleep: todayBenefits.sleep, // CHANGED: sleep replaces attraction
      workout: todayBenefits.workout
    });
    
    // Sort by date
    updatedBenefitTracking.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    updateUserData({ benefitTracking: updatedBenefitTracking });
    setBenefitsLogged(true);
    toast.success('Benefits logged for today!');
  };

  // Handle Discord link
  const handleDiscordJoin = () => {
    window.open('https://discord.gg/RDFC5eUtuA', '_blank', 'noopener,noreferrer');
  };

  // NEW: Handle YouTube link
  const handleYouTubeSubscribe = () => {
    window.open('https://www.youtube.com/@YourChannelName', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="tracker-container">
      {/* React DatePicker Modal with close button */}
      {showSetStartDate && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close-btn" onClick={handleDateCancel}>
              <FaTimes />
            </button>
            <h2>Set Your Start Date</h2>
            <p>When did you begin your current streak?</p>
            
            <DatePicker
              currentDate={startDate}
              onSubmit={handleDateSubmit}
              onCancel={handleDateCancel}
              hasExistingDate={!!userData.startDate}
            />
          </div>
        </div>
      )}
      
      {/* Simplified Header Section */}
      <div className="integrated-tracker-header">
        <div className="tracker-header-title-section">
          <h2>Daily Dashboard</h2>
          <p className="tracker-header-subtitle">Track your progress and log today's benefits</p>
        </div>
        
        <div className="tracker-header-actions-section">
          <div className="tracker-header-actions">
            {userData.startDate && (
              <button 
                className="action-btn"
                onClick={() => setShowSetStartDate(true)}
              >
                <FaEdit />
                <span>Edit Date</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* NEW: Main content container for desktop two-column layout */}
      <div className="tracker-main-content">
        {/* Current Streak Display - Left Column on Desktop */}
        <div className="current-streak-container">
          <div className="streak-card">
            <div className="streak-date">Today, {format(new Date(), 'MMMM d, yyyy')}</div>
            
            <div className="streak-content">
              <div className="streak-number">{currentStreak}</div>
              <div className="streak-label">Current Streak</div>
            </div>
            
            <div className="streak-divider"></div>
            
            <div className="streak-milestones">
              <div className="milestone-item">
                <FaCrown className="milestone-icon" />
                <div className="milestone-value">{userData.longestStreak || 0}</div>
                <div className="milestone-label">Longest</div>
              </div>
              
              <div className="milestone-item">
                <FaMoon className="milestone-icon" />
                <div className="milestone-value">{userData.wetDreamCount || 0}</div>
                <div className="milestone-label">Wet Dreams</div>
              </div>
              
              <div className="milestone-item">
                <FaExclamationTriangle className="milestone-icon" />
                <div className="milestone-value">{userData.relapseCount || 0}</div>
                <div className="milestone-label">Relapses</div>
              </div>
            </div>
            
            <div className="streak-actions-divider"></div>
            
            <div className="streak-actions">
              <button 
                className="streak-action-btn relapse-btn-grey"
                onClick={handleRelapse}
              >
                <FaExclamationTriangle />
                <span>Log Relapse</span>
              </button>
              
              <button 
                className="streak-action-btn wetdream-btn"
                onClick={handleWetDream}
              >
                <FaMoon />
                <span>Log Wet Dream</span>
              </button>
              
              <button 
                className="streak-action-btn urge-btn"
                onClick={handleUrges}
              >
                <FaShieldAlt />
                <span>Fighting Urges?</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* NEW: Discord and YouTube Column - Right Column on Desktop */}
        <div className="discord-youtube-column">
          {/* Discord Community Section */}
          <div className="discord-community-section">
            <div className="discord-community-header">
              <div className="discord-community-icon">
                <FaDiscord />
              </div>
              <div className="discord-community-content">
                <h3>Join Our Community</h3>
                <p>Connect with others on the same journey, share progress, and get support</p>
              </div>
            </div>
            
            <div className="discord-community-stats">
              <div className="community-stat-item">
                <FaUsers className="community-stat-icon" />
                <span>Active Community</span>
              </div>
              <div className="community-stat-item">
                <FaShieldAlt className="community-stat-icon" />
                <span>24/7 Support</span>
              </div>
            </div>
            
            <div className="discord-community-actions">
              {userData.showOnLeaderboard && userData.discordUsername && (
                <div className="leaderboard-status">
                  <FaCheckCircle className="check-icon" />
                  <span>You're on the leaderboard as <strong>{userData.discordUsername}</strong></span>
                </div>
              )}
              
              <button 
                className="discord-join-btn"
                onClick={handleDiscordJoin}
              >
                <FaDiscord />
                <span>Join Discord</span>
                <FaExternalLinkAlt className="external-icon" />
              </button>
            </div>
            
            {userData.showOnLeaderboard && !userData.discordUsername && (
              <div className="discord-setup-note">
                <FaInfoCircle className="info-icon" />
                <span>Set your Discord username in Profile settings to appear on the leaderboard</span>
              </div>
            )}
          </div>
          
          {/* NEW: YouTube Channel Section */}
          <div className="youtube-channel-section">
            <div className="youtube-channel-header">
              <div className="youtube-channel-icon">
                <FaYoutube />
              </div>
              <div className="youtube-channel-content">
                <h3>Watch on YouTube</h3>
                <p>Get exclusive tips, motivation, and insights to accelerate your transformation</p>
              </div>
            </div>
            
            <div className="youtube-channel-stats">
              <div className="youtube-stat-item">
                <FaUsers className="youtube-stat-icon" />
                <span>5.4k Subscribers</span>
              </div>
              <div className="youtube-stat-item">
                <FaCalendarAlt className="youtube-stat-icon" />
                <span>Weekly Content</span>
              </div>
            </div>
            
            <div className="youtube-channel-actions">
              <button 
                className="youtube-subscribe-btn"
                onClick={handleYouTubeSubscribe}
              >
                <FaYoutube />
                <span>Subscribe</span>
                <FaExternalLinkAlt className="external-icon" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Benefit Logging Section - Full Width Below on Desktop */}
      <div className="benefit-logging-container">
        <div className="benefit-logging-section">
          <h3 className="benefit-logging-section-header">Daily Benefits Check-In</h3>
          
          {/* Benefits logged status */}
          <div className="benefit-status-section">
            {benefitsLogged ? (
              <div className="benefits-logged">
                <FaCheckCircle className="check-icon" />
                <span>Benefits logged for today!</span>
                <button 
                  className="action-btn edit-benefits-btn"
                  onClick={enableBenefitEditing}
                >
                  <FaEdit />
                  <span>Edit</span>
                </button>
              </div>
            ) : (
              <div className="benefits-not-logged">
                <FaInfoCircle className="info-icon" />
                <span>Track your benefits for today - the more you log, the more powerful your analytics become</span>
              </div>
            )}
          </div>
          
          {/* ALL BENEFITS CONTAINER */}
          <div className="premium-benefits-container">
            {/* ALL 6 BENEFIT SLIDERS */}
            {[
              { key: 'energy', label: 'Energy', value: todayBenefits.energy, lowLabel: 'Low', highLabel: 'High' },
              { key: 'focus', label: 'Focus', value: todayBenefits.focus, lowLabel: 'Scattered', highLabel: 'Laser Focus' },
              { key: 'confidence', label: 'Confidence', value: todayBenefits.confidence, lowLabel: 'Insecure', highLabel: 'Very Confident' },
              { key: 'aura', label: 'Aura', value: todayBenefits.aura, lowLabel: 'Invisible', highLabel: 'Magnetic' },
              { key: 'sleep', label: 'Sleep Quality', value: todayBenefits.sleep, lowLabel: 'Poor', highLabel: 'Excellent' },
              { key: 'workout', label: 'Workout', value: todayBenefits.workout, lowLabel: 'Weak', highLabel: 'Strong' }
            ].map((slider) => (
              <div key={slider.key} className="benefit-slider-item">
                <div className="benefit-slider-header">
                  <span className="benefit-label">{slider.label}</span>
                  <span className="benefit-value">{slider.value}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={slider.value}
                  onChange={(e) => handleBenefitChange(slider.key, parseInt(e.target.value))}
                  className="benefit-range-slider"
                  disabled={benefitsLogged}
                />
                <div className="slider-labels">
                  <span>{slider.lowLabel}</span>
                  <span>{slider.highLabel}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Save button */}
          {!benefitsLogged && (
            <div className="benefit-actions">
              <button 
                className="action-btn save-benefits-btn"
                onClick={saveBenefits}
              >
                <FaCheckCircle />
                <span>Save Today's Benefits</span>
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Tracker;