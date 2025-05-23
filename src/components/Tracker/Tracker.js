// components/Tracker/Tracker.js
import React, { useState, useEffect, useRef } from 'react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import './Tracker.css';

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
  FaToggleOn,
  FaToggleOff
} from 'react-icons/fa';

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

      // Add input validation and auto-advance functionality
      const setupInputBehavior = () => {
        // Month input behavior
        if (monthInput) {
          monthInput.oninput = (e) => {
            let value = e.target.value;
            // Remove non-numeric characters
            value = value.replace(/[^0-9]/g, '');
            
            // Limit to 2 digits
            if (value.length > 2) {
              value = value.slice(0, 2);
            }
            
            // Auto-correct common mistakes
            if (value.length === 1 && parseInt(value) > 1) {
              value = '0' + value;
            }
            
            // Validate range
            if (parseInt(value) > 12) {
              value = '12';
            }
            
            e.target.value = value;
            
            // Auto-advance to day field
            if (value.length === 2 && parseInt(value) >= 1 && parseInt(value) <= 12) {
              dayInput.focus();
            }
          };
        }

        // Day input behavior
        if (dayInput) {
          dayInput.oninput = (e) => {
            let value = e.target.value;
            // Remove non-numeric characters
            value = value.replace(/[^0-9]/g, '');
            
            // Limit to 2 digits
            if (value.length > 2) {
              value = value.slice(0, 2);
            }
            
            // Auto-correct common mistakes
            if (value.length === 1 && parseInt(value) > 3) {
              value = '0' + value;
            }
            
            // Validate range
            if (parseInt(value) > 31) {
              value = '31';
            }
            
            e.target.value = value;
            
            // Auto-advance to year field
            if (value.length === 2 && parseInt(value) >= 1 && parseInt(value) <= 31) {
              yearInput.focus();
            }
          };
        }

        // Year input behavior
        if (yearInput) {
          yearInput.oninput = (e) => {
            let value = e.target.value;
            // Remove non-numeric characters
            value = value.replace(/[^0-9]/g, '');
            
            // Limit to 4 digits
            if (value.length > 4) {
              value = value.slice(0, 4);
            }
            
            e.target.value = value;
          };
        }
      };

      setupInputBehavior();
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
        toast.error('Please enter a valid date (e.g., February 30th does not exist)');
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

  // Create HTML content for iframe with fixed button styling
  const iframeHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #2c2c2c; 
          color: white;
          padding: 12px;
          margin: 0;
        }
        
        .form-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .current-date {
          background-color: #1a2332;
          padding: 8px 12px;
          border-radius: 6px;
          text-align: center;
          font-size: 13px;
          color: #ffffff;
          border: 1px solid #334155;
        }
        
        .current-date-label {
          color: #94a3b8;
          font-size: 11px;
          margin-bottom: 2px;
        }
        
        .date-picker-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          justify-content: center;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .input-group label {
          font-size: 11px;
          color: #cccccc;
          font-weight: 500;
          text-align: center;
        }
        
        input {
          padding: 8px 6px;
          background-color: #333333;
          border: 1px solid #444444;
          border-radius: 6px;
          color: white;
          font-size: 14px;
          text-align: center;
          font-weight: 500;
          transition: border-color 0.2s, background-color 0.2s;
        }
        
        input:focus {
          outline: none;
          border-color: #ffdd00;
          background-color: #3a3a3a;
        }
        
        .month-input { width: 40px; }
        .day-input { width: 40px; }
        .year-input { width: 60px; }
        
        .date-separator {
          font-size: 18px;
          color: #666;
          margin: 0 2px;
          align-self: flex-end;
          padding-bottom: 8px;
        }
        
        .helper-text {
          background-color: #1a1a1a;
          padding: 8px;
          border-radius: 4px;
          font-size: 11px;
          color: #aaaaaa;
          text-align: center;
          border-left: 2px solid #ffdd00;
        }
        
        .actions-row {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }
        
        button {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          padding: 8px 16px !important;
          background-color: rgba(128, 128, 128, 0.1) !important;
          border: 1px solid #444444 !important;
          border-radius: 9999px !important;
          color: #aaaaaa !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          flex: 1 !important;
          justify-content: center !important;
        }
        
        button:hover {
          background-color: rgba(128, 128, 128, 0.2) !important;
          border-color: #ffffff !important;
          color: #ffffff !important;
        }
        
        #submit-button {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          padding: 8px 16px !important;
          background-color: rgba(128, 128, 128, 0.1) !important;
          border: 1px solid #444444 !important;
          border-radius: 9999px !important;
          color: #aaaaaa !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          flex: 1 !important;
          justify-content: center !important;
        }
        
        #submit-button:hover {
          background-color: rgba(128, 128, 128, 0.2) !important;
          border-color: #ffffff !important;
          color: #ffffff !important;
        }
        
        #cancel-button {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          padding: 8px 16px !important;
          background-color: rgba(128, 128, 128, 0.1) !important;
          border: 1px solid #444444 !important;
          border-radius: 9999px !important;
          color: #aaaaaa !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          flex: 1 !important;
          justify-content: center !important;
        }
        
        #cancel-button:hover {
          background-color: rgba(128, 128, 128, 0.2) !important;
          border-color: #ffffff !important;
          color: #ffffff !important;
        }
      </style>
    </head>
    <body>
      <form id="date-form">
        <div class="form-container">
          <div class="current-date">
            <div class="current-date-label">Current:</div>
            <div id="current-display">${format(startDate, 'MMM d, yyyy')}</div>
          </div>
          
          <div class="date-picker-row">
            <div class="input-group">
              <label for="month-input">Month</label>
              <input type="text" id="month-input" class="month-input" placeholder="MM" maxlength="2">
            </div>
            
            <div class="date-separator">/</div>
            
            <div class="input-group">
              <label for="day-input">Day</label>
              <input type="text" id="day-input" class="day-input" placeholder="DD" maxlength="2">
            </div>
            
            <div class="date-separator">/</div>
            
            <div class="input-group">
              <label for="year-input">Year</label>
              <input type="text" id="year-input" class="year-input" placeholder="YYYY" maxlength="4">
            </div>
          </div>
          
          <div class="helper-text">
            Enter MM/DD/YYYY - cursor auto-advances
          </div>
          
          <div class="actions-row">
            <button type="submit" id="submit-button">Set Date</button>
            <button type="button" id="cancel-button">${userData.startDate ? "Cancel" : "Use Today"}</button>
          </div>
        </div>
      </form>
    </body>
    </html>
  `;

  return (
    <div className="tracker-container">
      {/* Compact Date Picker Modal using iframe */}
      {showSetStartDate && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Set Your Start Date</h2>
            <p>When did you begin your current streak?</p>
            
            <div style={{ height: '180px', marginBottom: '10px' }}>
              <iframe
                ref={iframeRef}
                onLoad={handleIframeLoad}
                srcDoc={iframeHtml}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  border: 'none', 
                  borderRadius: '8px',
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
              <button onClick={saveNote} className="action-btn">Save Entry</button>
              <button onClick={() => setShowNoteModal(false)} className="action-btn">Cancel</button>
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
      
      {/* Header Section */}
      <div className="tracker-header">
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
        <div className="streak-date">Today, {format(new Date(), 'MMMM d, yyyy')}</div>
        
        <div className="streak-card">
          <div className="streak-content">
            <div className="streak-number">{currentStreak}</div>
            <div className="streak-label">Current Streak</div>
          </div>
          
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
          
          <div className="streak-actions">
            <button 
              className="streak-action-btn relapse-btn"
              onClick={handleRelapse}
            >
              <FaTimes />
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
              onClick={() => setShowUrgeMini(true)}
            >
              <FaShieldAlt />
              <span>Fighting Urges?</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Journal Section */}
      <div className="journal-section">
        <div className="journal-header">
          <h3>Today's Journal</h3>
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
      
      {/* Discord Integration */}
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