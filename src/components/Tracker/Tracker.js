// components/Tracker/Tracker.js - UPDATED: Goal system moved to Calendar tab
import React, { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Tracker.css';

// Components
import DatePicker from '../Shared/DatePicker';

// Icons
import { 
  FaCrown, 
  FaCalendarCheck, 
  FaExclamationTriangle,
  FaInfoCircle, 
  FaEdit,
  FaTimes,
  FaMoon,
  FaShieldAlt,
  FaPen,
  FaDiscord,
  FaCheckCircle
} from 'react-icons/fa';

const Tracker = ({ userData, updateUserData, isPremium }) => {
  const navigate = useNavigate();
  const [showSetStartDate, setShowSetStartDate] = useState(!userData.startDate);
  
  // Initialize with the current date if no start date exists
  const [startDate, setStartDate] = useState(
    userData.startDate ? new Date(userData.startDate) : new Date()
  );
  
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [currentStreak, setCurrentStreak] = useState(userData.currentStreak || 0);
  
  // UPDATED: Benefit tracking states - Sleep Quality replaces Attraction
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

  // UPDATED: React DatePicker handlers (replacing iframe logic)
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

  // UPDATED: Handle urge redirection to urge tab instead of mini toolkit
  const handleUrges = () => {
    navigate('/urge-toolkit');
  };

  // Handle benefit logging - REMOVED: Premium restrictions
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

  const saveNote = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const updatedNotes = { ...userData.notes, [today]: currentNote };
    
    updateUserData({ notes: updatedNotes });
    setShowNoteModal(false);
    toast.success('Journal entry saved!');
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayNote = userData.notes && userData.notes[todayStr];

  return (
    <div className="tracker-container">
      {/* UPDATED: React DatePicker Modal with close button */}
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
      
      {/* UPDATED: Journal Note Modal with close button */}
      {showNoteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close-btn" onClick={() => setShowNoteModal(false)}>
              <FaTimes />
            </button>
            <h2>Journal Entry</h2>
            <p>Record your thoughts, feelings, and insights for today:</p>
            
            <div className="form-group">
              <textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                rows="6"
                placeholder="How are you feeling today? What benefits or challenges are you experiencing?"
              ></textarea>
            </div>
            
            {/* FIXED: Side-by-side button layout matching DatePicker exactly */}
            <div className="journal-modal-actions">
              <button onClick={saveNote} className="journal-primary-action">
                <FaCheckCircle />
                Save Entry
              </button>
              <button onClick={() => setShowNoteModal(false)} className="journal-cancel-action">
                <FaTimes />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* UPDATED: Simplified Header Section - REMOVED Goal Button */}
      <div className="integrated-tracker-header">
        <div className="tracker-header-title-section">
          <h2>Streak Tracker</h2>
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
            <button 
              className="action-btn"
              onClick={() => navigate('/calendar')}
            >
              <FaCalendarCheck />
              <span>View Calendar</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Current Streak Display */}
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
      
      {/* UPDATED: Benefit Logging Section with proper spacing */}
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
                  <FaPen />
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
          
          {/* ALL BENEFITS CONTAINER - Available to everyone now */}
          <div className="premium-benefits-container">
            {/* ALL 6 BENEFIT SLIDERS - Available to everyone */}
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
      
      {/* Today's Journal Section - SEPARATE SECTION */}
      <div className="journal-section">
        <div className="journal-header">
          <div className="journal-header-spacer"></div>
          <h3>Today's Journal</h3>
          <div className="journal-actions">
            <button 
              className="action-btn"
              onClick={() => {
                setCurrentNote(todayNote || '');
                setShowNoteModal(true);
              }}
            >
              <FaPen />
              <span>{todayNote ? 'Edit Entry' : 'Add Entry'}</span>
            </button>
          </div>
        </div>
        
        {todayNote ? (
          <div className="journal-preview">
            <p>"{todayNote.length > 150 ? `${todayNote.substring(0, 150)}...` : todayNote}"</p>
          </div>
        ) : (
          <div className="empty-journal">
            <FaInfoCircle className="info-icon" />
            <p>No journal entry for today. Recording your thoughts can help track benefits and stay motivated.</p>
          </div>
        )}
        
        <div className="journal-prompt">
          <p>How are you feeling today? What benefits or challenges are you experiencing?</p>
        </div>
      </div>
      
      {/* UPDATED: Discord Integration with proper spacing */}
      <div className="discord-section">
        <h3>Discord Integration</h3>
        
        <div className="discord-toggle-container">
          <div className="discord-toggle">
            <span>Show my streak on Discord leaderboard</span>
            <div 
              className={`toggle-container ${userData.showOnLeaderboard ? 'active' : ''}`}
              onClick={() => updateUserData({ showOnLeaderboard: !userData.showOnLeaderboard })}
            >
              <div className={`custom-toggle-switch ${userData.showOnLeaderboard ? 'active' : ''}`}></div>
              <span className="toggle-label">
                {userData.showOnLeaderboard ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
        
        {userData.showOnLeaderboard && (
          <div className="discord-details">
            <div className="discord-username-display">
              <FaDiscord className="discord-icon" />
              <span>Username: {userData.discordUsername || 'Not set'}</span>
            </div>
            
            {!userData.discordUsername && (
              <div className="discord-note">
                <p>Set your Discord username in settings to appear on the leaderboard</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tracker;