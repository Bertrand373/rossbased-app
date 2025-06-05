// components/Tracker/Tracker.js - UPDATED: Enhanced premium lock with upgrade button
import React, { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Tracker.css';

// Components
import DatePicker from '../Shared/DatePicker';

// Icons - UPDATED: Using FaCheckCircle and FaTimes to match Calendar modal buttons
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
  FaToggleOn,
  FaToggleOff,
  FaCheckCircle,
  FaLock,
  FaStar
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
        aura: existingBenefits.aura || 5,
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

  const saveNote = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const updatedNotes = { ...userData.notes, [today]: currentNote };
    
    updateUserData({ notes: updatedNotes });
    setShowNoteModal(false);
    toast.success('Journal entry saved!');
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayNote = userData.notes && userData.notes[todayStr];

  // ADDED: Premium upgrade handler
  const handleUpgradeClick = () => {
    toast.success('Premium upgrade coming soon! 🚀');
  };

  return (
    <div className="tracker-container">
      {/* UPDATED: React DatePicker Modal (replacing iframe) */}
      {showSetStartDate && (
        <div className="modal-overlay">
          <div className="modal-content">
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
      
      {/* FIXED: Journal Note Modal with side-by-side buttons matching DatePicker */}
      {showNoteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
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
      
      {/* Header Section */}
      <div className="tracker-header">
        <div className="tracker-header-spacer"></div>
        <h2>Streak Tracker</h2>
        <div className="tracker-actions">
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
              <div className="milestone-label">Relapses