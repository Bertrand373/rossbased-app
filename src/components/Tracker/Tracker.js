// components/Tracker/Tracker.js - UPDATED: Added PredictionWidget
import React, { useState, useEffect } from 'react';
import { format, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// Import the 3 CSS files
import './Tracker.css';
import './TrackerSections.css';
import './TrackerButtons.css';

// Components
import DatePicker from '../Shared/DatePicker';
import PredictionWidget from '../PredictionWidget/PredictionWidget';

// Icons
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
  
  // Video modal state
  const [showVideo, setShowVideo] = useState(false);
  const [featuredVideoId] = useState('_1CcOqHD57E');
  
  // Benefits modal state
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [modalBenefits, setModalBenefits] = useState({ 
    energy: 5, 
    focus: 5, 
    confidence: 5, 
    aura: 5, 
    sleep: 5,
    workout: 5 
  });
  
  // Initialize with the current date if no start date exists
  const [startDate, setStartDate] = useState(
    userData.startDate ? new Date(userData.startDate) : new Date()
  );
  
  const [currentStreak, setCurrentStreak] = useState(userData.currentStreak || 0);
  
  // Track if benefits are logged for today
  const [benefitsLogged, setBenefitsLogged] = useState(false);
  
  const today = new Date();

  // Calculate next milestone
  const calculateNextMilestone = (streak) => {
    const milestones = [7, 30, 90, 180, 365, 730, 1095];
    
    for (let milestone of milestones) {
      if (streak < milestone) {
        return {
          target: milestone,
          daysRemaining: milestone - streak,
          progress: (streak / milestone) * 100
        };
      }
    }
    
    const nextYearMilestone = Math.ceil(streak / 365) * 365;
    return {
      target: nextYearMilestone,
      daysRemaining: nextYearMilestone - streak,
      progress: ((streak % 365) / 365) * 100
    };
  };

  // Calculate days this month with benefits logged
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

  // Check if benefits are already logged for today
  useEffect(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existingBenefits = userData.benefitTracking?.find(
      benefit => format(new Date(benefit.date), 'yyyy-MM-dd') === todayStr
    );
    
    if (existingBenefits) {
      const benefits = {
        energy: existingBenefits.energy || 5,
        focus: existingBenefits.focus || 5,
        confidence: existingBenefits.confidence || 5,
        aura: existingBenefits.aura || 5,
        sleep: existingBenefits.sleep || existingBenefits.attraction || 5,
        workout: existingBenefits.workout || existingBenefits.gymPerformance || 5
      };
      setModalBenefits(benefits);
      setBenefitsLogged(true);
    } else {
      setModalBenefits({ 
        energy: 5, 
        focus: 5, 
        confidence: 5, 
        aura: 5, 
        sleep: 5,
        workout: 5 
      });
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
      
      toast.success('Start date set successfully!');
    } catch (error) {
      console.error("Error setting date:", error);
      toast.error('Error setting date. Please try again.');
    }
  };

  const handleDateCancel = () => {
    setShowSetStartDate(false);
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
      
      const newStreak = {
        id: (userData.streakHistory?.length || 0) + 1,
        start: now,
        end: null,
        days: 0,
        reason: null
      };
      
      updatedHistory.push(newStreak);
      
      updateUserData({
        startDate: now,
        currentStreak: 0,
        relapseCount: (userData.relapseCount || 0) + 1,
        streakHistory: updatedHistory
      });
      
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

  const handleUrges = () => {
    navigate('/urge-toolkit');
  };

  const handleBenefitsLog = () => {
    setShowBenefitsModal(true);
  };

  const handleModalBenefitChange = (type, value) => {
    setModalBenefits(prev => ({
      ...prev,
      [type]: parseInt(value)
    }));
  };

  const saveBenefitsFromModal = () => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const updatedBenefitTracking = (userData.benefitTracking || []).filter(
      benefit => format(new Date(benefit.date), 'yyyy-MM-dd') !== todayStr
    );
    
    updatedBenefitTracking.push({
      date: today,
      energy: modalBenefits.energy,
      focus: modalBenefits.focus,
      confidence: modalBenefits.confidence,
      aura: modalBenefits.aura,
      sleep: modalBenefits.sleep,
      workout: modalBenefits.workout
    });
    
    updatedBenefitTracking.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    updateUserData({ benefitTracking: updatedBenefitTracking });
    
    setBenefitsLogged(true);
    setShowBenefitsModal(false);
    
    toast.success('Benefits logged for today!');
  };

  const cancelBenefitsModal = () => {
    setShowBenefitsModal(false);
    
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
    } else {
      setModalBenefits({ 
        energy: 5, 
        focus: 5, 
        confidence: 5, 
        aura: 5, 
        sleep: 5,
        workout: 5 
      });
    }
  };

  const handleDiscordJoin = () => {
    window.open('https://discord.gg/RDFC5eUtuA', '_blank', 'noopener,noreferrer');
  };

  const handleYouTubeSubscribe = () => {
    window.open('https://www.youtube.com/@RossBased', '_blank', 'noopener,noreferrer');
  };

  const handleWatchVideo = () => {
    setShowVideo(true);
  };

  const handleCloseVideo = () => {
    setShowVideo(false);
  };

  const renderSliderTickMarks = () => {
    const ticks = [];
    for (let i = 1; i <= 10; i++) {
      const isKeyTick = i === 1 || i === 5 || i === 10;
      ticks.push(
        <div 
          key={i} 
          className={`slider-tick ${isKeyTick ? 'key-tick' : ''}`}
          data-value={i}
        />
      );
    }
    return ticks;
  };

  return (
    <div className="tracker-container">
      {showSetStartDate && (
        <div className="modal-overlay">
          <div className="modal-content date-picker-modal">
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

      {showBenefitsModal && (
        <div className="modal-overlay">
          <div className="modal-content benefits-modal">
            <button className="modal-close-btn" onClick={cancelBenefitsModal}>
              <FaTimes />
            </button>
            <h3 className="benefits-modal-header">Daily Benefits Check-In</h3>
            <p className="benefits-modal-subtitle">
              {benefitsLogged ? "Update how you're feeling today" : "How are you feeling today?"}
            </p>
            
            {!benefitsLogged && (
              <div className="benefits-tracking-banner">
                <div className="benefits-tracking-helmet-container">
                  <img 
                    className="benefits-tracking-helmet" 
                    src="/helmet.png" 
                    alt="Benefits Tracking System" 
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'block';
                    }}
                  />
                  <div className="benefits-tracking-helmet-fallback" style={{ display: 'none' }}>
                    🛡️
                  </div>
                </div>
                
                <div className="benefits-tracking-content">
                  <h4 className="benefits-tracking-title">
                    Unlock Advanced Insights
                  </h4>
                  <p className="benefits-tracking-description">
                    Track daily benefits to unlock pattern recognition, challenge identification with targeted solutions, trend analysis across all metrics, and personalized strategies based on your unique journey data.
                  </p>
                </div>
              </div>
            )}
            
            <div className="benefits-modal-sliders">
              {[
                { key: 'energy', label: 'Energy', value: modalBenefits.energy, lowLabel: 'Low', highLabel: 'High' },
                { key: 'focus', label: 'Focus', value: modalBenefits.focus, lowLabel: 'Scattered', highLabel: 'Laser Focus' },
                { key: 'confidence', label: 'Confidence', value: modalBenefits.confidence, lowLabel: 'Insecure', highLabel: 'Very Confident' },
                { key: 'aura', label: 'Aura', value: modalBenefits.aura, lowLabel: 'Invisible', highLabel: 'Magnetic' },
                { key: 'sleep', label: 'Sleep Quality', value: modalBenefits.sleep, lowLabel: 'Poor', highLabel: 'Excellent' },
                { key: 'workout', label: 'Workout', value: modalBenefits.workout, lowLabel: 'Weak', highLabel: 'Strong' }
              ].map((slider) => (
                <div key={slider.key} className="benefit-slider-item modal-benefit-item">
                  <div className="benefit-slider-header">
                    <span className="benefit-label">{slider.label}</span>
                  </div>
                  <div className="benefit-slider-with-value">
                    <div className="benefit-slider-track-container">
                      <div className="slider-tick-marks">
                        {renderSliderTickMarks()}
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={slider.value}
                        onChange={(e) => handleModalBenefitChange(slider.key, parseInt(e.target.value))}
                        className="benefit-range-slider"
                        style={{ '--slider-value': ((slider.value - 1) / 9) * 100 }}
                      />
                    </div>
                    <span className="benefit-value-clean">{slider.value}</span>
                  </div>
                  <div className="slider-labels">
                    <span>{slider.lowLabel}</span>
                    <span>{slider.highLabel}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="benefits-modal-actions">
              <button 
                className="action-btn save-benefits-btn modal-save-btn"
                onClick={saveBenefitsFromModal}
              >
                <FaCheckCircle />
                <span>{benefitsLogged ? 'Update Benefits' : 'Save Benefits'}</span>
              </button>
              <button 
                className="action-btn cancel-benefits-btn"
                onClick={cancelBenefitsModal}
              >
                <FaTimes />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showVideo && (
        <div className="video-modal-overlay" onClick={handleCloseVideo}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="video-close-btn" onClick={handleCloseVideo}>
              <FaTimes />
            </button>
            <div className="video-container">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${featuredVideoId}?autoplay=1&rel=0&modestbranding=1`}
                title="Featured Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
      
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
                <span>Edit Start Date</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="tracker-main-content">
        <div className="current-streak-container">
          <div className="streak-card">
            <div className="streak-date">Today, {format(new Date(), 'MMMM d, yyyy')}</div>
            
            <div className="streak-content">
              <div className="streak-number">{currentStreak}</div>
              <div className="streak-label">Current Streak</div>
            </div>
            
            <div className="streak-divider"></div>
            
            <div className="streak-milestone-pills">
              <div className="milestone-pill">
                <FaFire className="milestone-pill-icon" />
                <span className="milestone-pill-text">
                  {nextMilestone.daysRemaining} days until {nextMilestone.target}-day milestone
                </span>
              </div>
              
              <div className="milestone-pill">
                <FaClipboardCheck className="milestone-pill-icon" />
                <span className="milestone-pill-text">
                  {monthProgress.logged} of {monthProgress.total} days tracked this month
                </span>
              </div>
            </div>
            
            <div className="streak-actions-divider"></div>
            
            <div className="benefits-status-indicator">
              {benefitsLogged ? (
                <div className="benefits-logged-status">
                  <FaCheckCircle className="check-icon" />
                  <span>Benefits logged for today!</span>
                </div>
              ) : (
                <div className="benefits-not-logged-status">
                  <FaInfoCircle className="info-icon" />
                  <span>Log your daily benefits</span>
                </div>
              )}
            </div>
            
            <div className="streak-actions">
              <button 
                className="streak-action-btn benefits-btn-primary"
                onClick={handleBenefitsLog}
              >
                <FaChartLine />
                <span>{benefitsLogged ? 'Update Benefits' : 'Log Benefits'}</span>
              </button>

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
        
        <div className="discord-youtube-column">
          <PredictionWidget userData={userData} />
          
          <div className="discord-community-section">
            <div className="discord-community-header">
              <div className="section-icon-header">
                <FaDiscord className="section-header-icon discord-icon" />
                <div className="discord-community-content">
                  <h3>Join Our Community</h3>
                  <p>Connect with others on the same journey, share progress, and get support</p>
                </div>
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
          
          <div className="youtube-channel-section">
            <div className="youtube-channel-header">
              <div className="section-icon-header">
                <FaYoutube className="section-header-icon youtube-icon" />
                <div className="youtube-channel-content">
                  <h3>Featured Content</h3>
                  <p>Essential knowledge and motivation for your transformation journey</p>
                </div>
              </div>
            </div>
            
            <div className="featured-video-preview">
              <div className="video-thumbnail-container" onClick={handleWatchVideo}>
                <img 
                  src={`https://img.youtube.com/vi/${featuredVideoId}/maxresdefault.jpg`}
                  alt="Featured Video Thumbnail"
                  className="video-thumbnail"
                />
                <div className="video-play-overlay">
                  <FaPlay className="play-icon" />
                </div>
              </div>
            </div>
            
            <div className="youtube-channel-stats">
              <div className="youtube-stat-item">
                <FaUsers className="youtube-stat-icon" />
                <span>10.0k Subscribers</span>
              </div>
              <div className="youtube-stat-item">
                <FaCalendarWeek className="youtube-stat-icon" />
                <span>Weekly Content</span>
              </div>
              <div className="youtube-stat-item">
                <FaPlay className="youtube-stat-icon" />
                <span>Featured Video</span>
              </div>
            </div>
            
            <div className="youtube-channel-actions">
              <button 
                className="youtube-subscribe-btn"
                onClick={handleYouTubeSubscribe}
              >
                <FaYoutube />
                <span>Subscribe for More</span>
                <FaExternalLinkAlt className="external-icon" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tracker;