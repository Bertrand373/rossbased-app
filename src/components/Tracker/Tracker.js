// components/Tracker/Tracker.js - Fixed Date Handling Section
import React, { useState, useEffect } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './Tracker.css';

// Icons
import { FaCrown, FaCalendarCheck, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';

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

  // Ensure date is properly formatted for the UI
  const formatDateForDisplay = (date) => {
    return format(date, 'MMMM d, yyyy');
  };

  const handleStartDateSubmit = (e) => {
    if (e) e.preventDefault();
    
    // Create a new date object to ensure it's properly handled
    const newStartDate = new Date(startDate);
    console.log("Submitting start date:", newStartDate);
    
    // Make sure newStartDate is a valid date
    if (isNaN(newStartDate.getTime())) {
      toast.error('Please enter a valid date');
      return;
    }
    
    // Check if newStartDate is in the future
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Reset time portion for proper comparison
    
    if (newStartDate > currentDate) {
      toast.error('Start date cannot be in the future');
      return;
    }
    
    // Calculate current streak based on the new start date
    const calculatedStreak = differenceInDays(today, newStartDate) + 1;
    const newStreak = calculatedStreak > 0 ? calculatedStreak : 0;
    
    // Update user data with new start date and current streak
    updateUserData({
      startDate: newStartDate,
      currentStreak: newStreak,
      longestStreak: Math.max(userData.longestStreak || 0, newStreak)
    });
    
    // Update local state
    setCurrentStreak(newStreak);
    // Important: Make sure we're setting the state with a new date object
    setStartDate(newStartDate);
    
    setShowSetStartDate(false);
    toast.success('Start date set successfully!');
  };

  const handleDateChange = (date) => {
    console.log("Date selected:", date);
    // Create a new Date object to ensure it's properly handled
    setStartDate(new Date(date));
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
      {/* Set Start Date Modal */}
      {showSetStartDate && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Set Your Start Date</h2>
            <p>When did you begin your current streak?</p>
            
            <form onSubmit={handleStartDateSubmit}>
              <div className="form-group">
                <label htmlFor="startDate">Start Date:</label>
                <div className="datepicker-container">
                  <DatePicker
                    selected={startDate}
                    onChange={handleDateChange}
                    maxDate={new Date()} // Prevents selecting future dates
                    dateFormat="MMMM d, yyyy"
                    className="modern-datepicker"
                    required
                    inline={false} // Force dropdown mode
                    shouldCloseOnSelect={true} // Close picker on date selection
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Set Start Date</button>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => {
                    if (userData.startDate) {
                      setShowSetStartDate(false);
                    } else {
                      // If no start date is set, use today's date
                      const today = new Date();
                      setStartDate(today);
                      // Submit the form with today's date
                      setTimeout(() => handleStartDateSubmit(), 0);
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