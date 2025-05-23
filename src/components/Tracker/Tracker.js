// components/Tracker/Tracker.js
import React, { useState, useEffect, useRef } from 'react';
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
  
  // Reference to the frame
  const iframeRef = useRef(null);

  // Initialize the iframe content when it loads
  const handleIframeLoad = () => {
    try {
      const iframe = iframeRef.current;
      if (!iframe) return;
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      // Initialize date picker with current values
      const monthInput = iframeDoc.getElementById('month-input');
      const dayInput = iframeDoc.getElementById('day-input');
      const yearInput = iframeDoc.getElementById('year-input');
      
      if (monthInput && dayInput && yearInput) {
        monthInput.value = startDate.getMonth() + 1;
        dayInput.value = startDate.getDate();
        yearInput.value = startDate.getFullYear();
      }
      
      // Setup the form submission
      const form = iframeDoc.getElementById('date-form');
      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          handleIframeSubmit();
        };
      }
      
      // Setup button handlers
      const submitButton = iframeDoc.getElementById('submit-button');
      const cancelButton = iframeDoc.getElementById('cancel-button');
      
      if (submitButton) {
        submitButton.onclick = () => handleIframeSubmit();
      }
      
      if (cancelButton) {
        cancelButton.onclick = () => {
          if (userData.startDate) {
            setShowSetStartDate(false);
          } else {
            // Use today's date
            const today = new Date();
            if (monthInput) monthInput.value = today.getMonth() + 1;
            if (dayInput) dayInput.value = today.getDate();
            if (yearInput) yearInput.value = today.getFullYear();
            setTimeout(() => handleIframeSubmit(), 0);
          }
        };
      }
    } catch (error) {
      console.error("Error setting up iframe:", error);
    }
  };
  
  // Handle form submission from iframe
  const handleIframeSubmit = () => {
    try {
      const iframe = iframeRef.current;
      if (!iframe) return;
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      // Get values from form
      const month = parseInt(iframeDoc.getElementById('month-input').value, 10);
      const day = parseInt(iframeDoc.getElementById('day-input').value, 10);
      const year = parseInt(iframeDoc.getElementById('year-input').value, 10);
      
      // Basic validation
      if (isNaN(month) || isNaN(day) || isNaN(year) ||
          month < 1 || month > 12 || 
          day < 1 || day > 31 || 
          year < 1900 || year > 2100) {
        toast.error('Please enter a valid date');
        return;
      }
      
      // Create date object (JS months are 0-based)
      const newDate = new Date(year, month - 1, day);
      
      // Validate date
      if (isNaN(newDate.getTime()) || 
          newDate.getFullYear() !== year || 
          newDate.getMonth() !== month - 1 || 
          newDate.getDate() !== day) {
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
    } catch (error) {
      console.error("Error submitting date:", error);
      toast.error('Error setting date. Please try again.');
    }
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

  const saveNote = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const updatedNotes = { ...userData.notes, [today]: currentNote };
    
    updateUserData({ notes: updatedNotes });
    setShowNoteModal(false);
    toast.success('Journal entry saved!');
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayNote = userData.notes && userData.notes[todayStr];

  // Create HTML content for iframe
  const iframeHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #2c2c2c; 
          color: white;
          padding: 0;
          margin: 0;
        }
        
        .form-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .inputs-row {
          display: flex;
          gap: 10px;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        
        .input-group label {
          font-size: 14px;
          color: #cccccc;
        }
        
        input {
          padding: 8px;
          background-color: #333333;
          border: 1px solid #444444;
          border-radius: 4px;
          color: white;
          width: 100%;
          box-sizing: border-box;
        }
        
        .actions-row {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }
        
        button {
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
        }
        
        .btn-primary {
          background-color: #ffdd00;
          color: black;
        }
        
        .btn-outline {
          background-color: transparent;
          border: 1px solid #ffdd00;
          color: #ffdd00;
        }
        
        .helper-text {
          font-size: 12px;
          color: #aaaaaa;
        }
      </style>
    </head>
    <body>
      <form id="date-form">
        <div class="form-container">
          <div class="inputs-row">
            <div class="input-group">
              <label for="month-input">Month:</label>
              <input type="number" id="month-input" min="1" max="12" required>
            </div>
            
            <div class="input-group">
              <label for="day-input">Day:</label>
              <input type="number" id="day-input" min="1" max="31" required>
            </div>
            
            <div class="input-group">
              <label for="year-input">Year:</label>
              <input type="number" id="year-input" min="1900" max="2100" required>
            </div>
          </div>
          
          <div class="helper-text">Enter date as MM/DD/YYYY</div>
          
          <div class="actions-row">
            <button type="submit" id="submit-button" class="btn-primary">Set Date</button>
            <button type="button" id="cancel-button" class="btn-outline">${userData.startDate ? "Cancel" : "Use Today"}</button>
          </div>
        </div>
      </form>
    </body>
    </html>
  `;

  return (
    <div className="tracker-container">
      {/* Date Picker Modal using iframe */}
      {showSetStartDate && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Set Your Start Date</h2>
            <p>When did you begin your current streak?</p>
            
            <div style={{ height: '210px', marginBottom: '10px' }}>
              <iframe
                ref={iframeRef}
                onLoad={handleIframeLoad}
                srcDoc={iframeHtml}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  border: 'none', 
                  overflow: 'hidden'
                }}
                title="Date Picker"
              />
            </div>
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