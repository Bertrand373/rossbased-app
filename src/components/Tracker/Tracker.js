// components/Tracker/Tracker.js
import React, { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import './Tracker.css';

// Icons
import { FaCrown, FaCalendarCheck, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

// Urge Toolkit Mini-component
import UrgeMini from '../UrgeToolkit/UrgeMini';

const Tracker = ({ userData, updateUserData, isPremium }) => {
  const [showUrgeMini, setShowUrgeMini] = useState(false);
  const [showSetStartDate, setShowSetStartDate] = useState(!userData.startDate);
  
  // Initialize with the current date if no start date exists
  const [startDate, setStartDate] = useState(
    userData.startDate ? new Date(userData.startDate) : new Date()
  );
  
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [currentStreak, setCurrentStreak] = useState(userData.currentStreak || 0);
  const today = new Date();

  // Simplified approach with raw text strings
  const [monthInput, setMonthInput] = useState(startDate.getMonth() + 1 + '');
  const [dayInput, setDayInput] = useState(startDate.getDate() + '');
  const [yearInput, setYearInput] = useState(startDate.getFullYear() + '');
  
  // Debugging variables
  const [debugText, setDebugText] = useState('No input yet');
  
  // Update UI when userData changes
  useEffect(() => {
    if (userData.startDate) {
      const startDateObj = new Date(userData.startDate);
      setStartDate(startDateObj);
      
      // Update date inputs as strings
      setMonthInput((startDateObj.getMonth() + 1) + '');
      setDayInput(startDateObj.getDate() + '');
      setYearInput(startDateObj.getFullYear() + '');
      
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

  // Handle date input changes with direct setters
  const handleMonthChange = (e) => {
    setDebugText(`Month input changed to: ${e.target.value}`);
    setMonthInput(e.target.value);
  };
  
  const handleDayChange = (e) => {
    setDebugText(`Day input changed to: ${e.target.value}`);
    setDayInput(e.target.value);
  };
  
  const handleYearChange = (e) => {
    setDebugText(`Year input changed to: ${e.target.value}`);
    setYearInput(e.target.value);
  };

  // Create a valid date from inputs or return null if invalid
  const getDateFromInputs = () => {
    // Parse inputs as integers
    const month = parseInt(monthInput, 10);
    const day = parseInt(dayInput, 10);
    const year = parseInt(yearInput, 10);
    
    // Basic validation
    if (isNaN(month) || isNaN(day) || isNaN(year) ||
        month < 1 || month > 12 || 
        day < 1 || day > 31 || 
        year < 1900 || year > 2100) {
      return null;
    }
    
    // JavaScript months are 0-based
    const date = new Date(year, month - 1, day);
    
    // Check if the date is valid (e.g., not Feb 30)
    if (date.getFullYear() !== year || 
        date.getMonth() !== month - 1 || 
        date.getDate() !== day) {
      return null;
    }
    
    return date;
  };

  const handleStartDateSubmit = (e) => {
    if (e) e.preventDefault();
    
    const newDate = getDateFromInputs();
    
    if (!newDate) {
      toast.error('Please enter a valid date');
      return;
    }
    
    // Check if date is in the future
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    if (newDate > currentDate) {
      toast.error('Start date cannot be in the future');
      return;
    }
    
    // Set the new start date
    setStartDate(newDate);
    
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
    setCurrentStreak(newStreak);
    
    setShowSetStartDate(false);
    toast.success('Start date set successfully!');
  };

  const handleUseToday = () => {
    const today = new Date();
    setMonthInput((today.getMonth() + 1) + '');
    setDayInput(today.getDate() + '');
    setYearInput(today.getFullYear() + '');
    
    setStartDate(today);
    setTimeout(() => handleStartDateSubmit(), 0);
  };

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
      setMonthInput((now.getMonth() + 1) + '');
      setDayInput(now.getDate() + '');
      setYearInput(now.getFullYear() + '');
      
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
      {/* Set Start Date Modal - Extremely simplified */}
      {showSetStartDate && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Set Your Start Date</h2>
            <p>When did you begin your current streak?</p>
            
            <div className="debug-info" style={{marginBottom: '10px', color: 'yellow'}}>
              {debugText}
            </div>
            
            <form onSubmit={handleStartDateSubmit}>
              {/* Super simple form with minimum styling and complexity */}
              <div style={{marginBottom: '20px'}}>
                <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                  <div>
                    <label htmlFor="month-input" style={{display: 'block', marginBottom: '5px'}}>Month:</label>
                    <input
                      type="text"
                      id="month-input"
                      value={monthInput}
                      onChange={handleMonthChange}
                      style={{width: '60px', padding: '8px'}}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="day-input" style={{display: 'block', marginBottom: '5px'}}>Day:</label>
                    <input
                      type="text"
                      id="day-input"
                      value={dayInput}
                      onChange={handleDayChange}
                      style={{width: '60px', padding: '8px'}}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="year-input" style={{display: 'block', marginBottom: '5px'}}>Year:</label>
                    <input
                      type="text"
                      id="year-input"
                      value={yearInput}
                      onChange={handleYearChange}
                      style={{width: '80px', padding: '8px'}}
                    />
                  </div>
                </div>
              </div>
              
              <div style={{display: 'flex', gap: '10px'}}>
                <button type="submit" className="btn btn-primary">Set Date</button>
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={() => {
                    if (userData.startDate) {
                      setShowSetStartDate(false);
                    } else {
                      handleUseToday();
                    }
                  }}
                >
                  {userData.startDate ? "Cancel" : "Use Today"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Journal Note Modal */}
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
            
            <div className="form-actions">
              <button onClick={saveNote} className="btn btn-primary">Save Entry</button>
              <button onClick={() => setShowNoteModal(false)} className="btn btn-outline">Cancel</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Urge Mini Toolkit */}
      {showUrgeMini && (
        <UrgeMini 
          onClose={() => setShowUrgeMini(false)} 
          isPremium={isPremium}
          updateUserData={updateUserData}
          userData={userData}
        />
      )}
      
      {/* Main Tracker Content */}
      <div className="tracker-header">
        <h2>Your Streak Tracker</h2>
        {userData.startDate && (
          <button 
            className="btn btn-outline edit-date-btn"
            onClick={() => setShowSetStartDate(true)}
          >
            Edit Date
          </button>
        )}
      </div>
      
      <div className="streak-display">
        <div className="current-streak">
          <div className="streak-count">{currentStreak}</div>
          <div className="streak-label">Current Streak</div>
        </div>
        
        <div className="streak-milestones">
          <div className="streak-milestone">
            <FaCrown className="milestone-icon" />
            <div className="milestone-value">{userData.longestStreak || 0}</div>
            <div className="milestone-label">Longest</div>
          </div>
          
          <div className="streak-milestone">
            <FaCalendarCheck className="milestone-icon" />
            <div className="milestone-value">{userData.wetDreamCount || 0}</div>
            <div className="milestone-label">Wet Dreams</div>
          </div>
          
          <div className="streak-milestone">
            <FaExclamationTriangle className="milestone-icon" />
            <div className="milestone-value">{userData.relapseCount || 0}</div>
            <div className="milestone-label">Relapses</div>
          </div>
        </div>
      </div>
      
      <div className="tracker-actions">
        <button className="btn btn-danger" onClick={handleRelapse}>Log Relapse</button>
        <button className="btn btn-warning" onClick={handleWetDream}>Log Wet Dream</button>
        <button className="btn btn-primary" onClick={() => setShowUrgeMini(true)}>
          Fighting Urges?
        </button>
      </div>
      
      <div className="journal-section">
        <div className="journal-header">
          <h3>Daily Journal</h3>
          <button 
            className="btn btn-outline"
            onClick={() => {
              setCurrentNote(todayNote || '');
              setShowNoteModal(true);
            }}
          >
            {todayNote ? 'Edit Entry' : 'Add Entry'}
          </button>
        </div>
        
        {todayNote ? (
          <div className="journal-preview">
            <p>{todayNote.length > 150 ? `${todayNote.substring(0, 150)}...` : todayNote}</p>
          </div>
        ) : (
          <div className="empty-journal">
            <FaInfoCircle className="info-icon" />
            <p>No journal entry for today. Recording your thoughts can help track benefits and stay motivated.</p>
          </div>
        )}
      </div>
      
      <div className="discord-integration">
        <h3>Discord Integration</h3>
        <div className="discord-toggle">
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={userData.showOnLeaderboard || false}
              onChange={(e) => updateUserData({ showOnLeaderboard: e.target.checked })}
            />
            <span className="toggle-slider"></span>
          </label>
          <span>Show my streak on Discord leaderboard</span>
        </div>
        
        {userData.showOnLeaderboard && (
          <div className="discord-username">
            <p>Your Discord username: {userData.discordUsername || 'Not set'}</p>
            {!userData.discordUsername && <p className="discord-note">Set your Discord username in settings to appear on the leaderboard</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tracker;