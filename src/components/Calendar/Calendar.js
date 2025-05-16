import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, 
  isSameDay, subMonths, addMonths, parseISO, differenceInDays } from 'date-fns';
import './Calendar.css';

// Icons
import { FaChevronLeft, FaChevronRight, FaCheckCircle, FaTimesCircle, FaMoon, FaInfoCircle } from 'react-icons/fa';

const Calendar = ({ userData, isPremium, updateUserData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayInfoModal, setDayInfoModal] = useState(false);

  // Next and previous month handlers
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Helper function to determine day status based on streak history
  const getDayStatus = (day) => {
    // If before start date, return null
    if (userData.startDate && day < userData.startDate) {
      return null;
    }
    
    // Initialize with success (streak maintained)
    let status = 'success';
    
    // Check for wet dreams
    const wetDreamDates = Array.isArray(userData.wetDreamDates) ? userData.wetDreamDates : [];
    try {
      if (wetDreamDates.some(date => {
        if (typeof date !== 'string') {
          console.warn(`Invalid wetDreamDate: ${date}`);
          return false;
        }
        try {
          const parsedDate = parseISO(date);
          return isSameDay(parsedDate, day);
        } catch (e) {
          console.warn(`Failed to parse wetDreamDate: ${date}`, e);
          return false;
        }
      })) {
        status = 'wet-dream';
      }
    } catch (e) {
      console.error('Error processing wetDreamDates:', e);
    }
    
    // Check for relapses
    const isRelapse = userData.streakHistory.some(streak => 
      streak.end && isSameDay(streak.end, day) && streak.reason === 'relapse'
    );
    
    if (isRelapse) {
      status = 'relapse';
    }
    
    return status;
  };

  // Handle status change
  const handleStatusChange = (newStatus) => {
    if (!selectedDate) return;

    let updatedStreakHistory = [...userData.streakHistory];
    let updatedWetDreamDates = Array.isArray(userData.wetDreamDates) ? [...userData.wetDreamDates] : [];
    let updatedWetDreamCount = userData.wetDreamCount || 0;
    let updatedRelapseCount = userData.relapseCount || 0;
    let currentStreak = userData.currentStreak || 0;

    const today = new Date();
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

    // Remove existing wet dream or relapse for this day
    updatedWetDreamDates = updatedWetDreamDates.filter(date => {
      try {
        return !isSameDay(parseISO(date), selectedDate);
      } catch (e) {
        console.warn(`Failed to parse wetDreamDate for filter: ${date}`, e);
        return false;
      }
    });
    const currentStreakIndex = updatedStreakHistory.findIndex(streak => streak.end === null);
    
    if (currentStreakIndex !== -1) {
      updatedStreakHistory[currentStreakIndex] = {
        ...updatedStreakHistory[currentStreakIndex],
        end: null,
        days: differenceInDays(today, userData.startDate) + 1,
        reason: null
      };
    }

    // Apply new status
    if (newStatus === 'wet-dream') {
      updatedWetDreamDates.push(selectedDateStr);
      updatedWetDreamCount += 1;
    } else if (newStatus === 'relapse') {
      if (currentStreakIndex !== -1) {
        updatedStreakHistory[currentStreakIndex] = {
          ...updatedStreakHistory[currentStreakIndex],
          end: selectedDate,
          days: differenceInDays(selectedDate, userData.startDate) + 1,
          reason: 'relapse'
        };
        // Start new streak
        updatedStreakHistory.push({
          id: updatedStreakHistory.length + 1,
          start: addDays(selectedDate, 1),
          end: null,
          days: 0,
          reason: null
        });
        currentStreak = 0;
        updatedRelapseCount += 1;
      }
    } else if (newStatus === 'success' || newStatus === 'none') {
      // No change to streak history, just ensure no wet dream or relapse
      currentStreak = differenceInDays(today, userData.startDate) + 1;
    }

    // Update user data
    updateUserData({
      streakHistory: updatedStreakHistory,
      wetDreamDates: updatedWetDreamDates,
      wetDreamCount: updatedWetDreamCount,
      relapseCount: updatedRelapseCount,
      currentStreak
    });
  };

  // Show day details
  const showDayDetails = (day) => {
    setSelectedDate(day);
    setDayInfoModal(true);
  };

  // Get day benefits data
  const getDayBenefits = (day) => {
    if (!userData.benefitTracking) return null;
    return userData.benefitTracking.find(benefit => {
      try {
        return isSameDay(parseISO(benefit.date), day);
      } catch (e) {
        console.warn(`Failed to parse benefitTracking date: ${benefit.date}`, e);
        return false;
      }
    });
  };

  // Render day cell with appropriate styling
  const renderDayCell = (day, dayIndex) => {
    const dayStatus = getDayStatus(day);
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    const isToday = isSameDay(day, new Date());
    const dayBenefits = getDayBenefits(day);
    
    // Classes for day cell
    const dayClasses = [
      'day-cell',
      !isSameMonth(day, currentDate) ? 'other-month' : '',
      isToday ? 'today' : '',
      isSelected ? 'selected' : '',
      dayStatus === 'success' ? 'success-day' : '',
      dayStatus === 'relapse' ? 'relapse-day' : '',
      dayStatus === 'wet-dream' ? 'wet-dream-day' : ''
    ].filter(Boolean).join(' ');

    return (
      <div 
        key={dayIndex} 
        className={dayClasses}
        onClick={() => showDayDetails(day)}
      >
        <div className="day-number">{format(day, 'd')}</div>
        
        {dayStatus && (
          <div className="day-indicator">
            {dayStatus === 'success' && <FaCheckCircle className="success-icon" />}
            {dayStatus === 'relapse' && <FaTimesCircle className="relapse-icon" />}
            {dayStatus === 'wet-dream' && <FaMoon className="wet-dream-icon" />}
          </div>
        )}
        
        {isPremium && dayBenefits && (
          <div className="day-benefits-indicator">
            <div className="benefit-dot" style={{ 
              background: `rgba(37, 99, 235, ${dayBenefits.energy / 10})` 
            }}></div>
          </div>
        )}
      </div>
    );
  };

  // Build calendar days
  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const dateFormat = "EEEE";
    const rows = [];
    
    // Create header row with day names
    let daysHeader = [];
    let day = startDate;
    
    for (let i = 0; i < 7; i++) {
      daysHeader.push(
        <div key={`header-${i}`} className="day-header">
          {format(day, dateFormat).substring(0, 3)}
        </div>
      );
      day = addDays(day, 1);
    }
    
    rows.push(<div className="calendar-row header-row" key="header">{daysHeader}</div>);
    
    // Create calendar rows
    day = startDate;
    while (day <= endDate) {
      const week = [];
      
      for (let i = 0; i < 7; i++) {
        week.push(renderDayCell(day, i));
        day = addDays(day, 1);
      }
      
      rows.push(
        <div className="calendar-row" key={`row-${format(day, 'yyyy-MM-dd')}`}>
          {week}
        </div>
      );
    }
    
    return rows;
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h2>Streak Calendar</h2>
        <div className="month-navigation">
          <button className="month-nav-btn" onClick={prevMonth}>
            <FaChevronLeft />
          </button>
          <h3>{format(currentDate, 'MMMM yyyy')}</h3>
          <button className="month-nav-btn" onClick={nextMonth}>
            <FaChevronRight />
          </button>
        </div>
      </div>
      
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-indicator success"></div>
          <span>Streak Day</span>
        </div>
        <div className="legend-item">
          <div className="legend-indicator relapse"></div>
          <span>Relapse</span>
        </div>
        <div className="legend-item">
          <div className="legend-indicator wet-dream"></div>
          <span>Wet Dream</span>
        </div>
        {isPremium && (
          <div className="legend-item">
            <div className="legend-indicator benefits" style={{ backgroundColor: '#2563eb' }}></div>
            <span>Tracked Benefits</span>
          </div>
        )}
      </div>
      
      <div className="calendar-grid">
        {renderCalendarDays()}
      </div>
      
      {dayInfoModal && selectedDate && (
        <div className="modal-overlay" onClick={() => setDayInfoModal(false)}>
          <div className="modal-content day-info-modal" onClick={e => e.stopPropagation()}>
            <h3>{format(selectedDate, 'MMMM d, yyyy')}</h3>
            
            <div className="day-status-info">
              {getDayStatus(selectedDate) === 'success' && (
                <div className="status-badge success">
                  <FaCheckCircle /> Streak Maintained
                </div>
              )}
              
              {getDayStatus(selectedDate) === 'relapse' && (
                <div className="status-badge relapse">
                  <FaTimesCircle /> Relapse Day
                </div>
              )}
              
              {getDayStatus(selectedDate) === 'wet-dream' && (
                <div className="status-badge wet-dream">
                  <FaMoon /> Wet Dream
                </div>
              )}
              
              <div className="status-change" style={{ marginTop: 'var(--spacing-md)' }}>
                <label htmlFor="status-select">Change Status:</label>
                <select
                  id="status-select"
                  value={getDayStatus(selectedDate) || 'none'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{ marginLeft: 'var(--spacing-sm)', padding: 'var(--spacing-xs)', borderRadius: 'var(--radius-md)' }}
                >
                  <option value="none">None</option>
                  <option value="success">Success</option>
                  <option value="relapse">Relapse</option>
                  <option value="wet-dream">Wet Dream</option>
                </select>
              </div>
            </div>
            
            {userData.startDate && selectedDate >= userData.startDate && (
              <div className="day-streak-info">
                Day {differenceInDays(selectedDate, userData.startDate) + 1} of current streak
              </div>
            )}
            
            {isPremium ? (
              <>
                <div className="day-benefits">
                  <h4>Tracked Benefits</h4>
                  
                  {getDayBenefits(selectedDate) ? (
                    <div className="benefits-details">
                      <div className="benefit-item">
                        <span>Energy:</span>
                        <div className="benefit-meter">
                          <div 
                            className="benefit-level" 
                            style={{ width: `${getDayBenefits(selectedDate).energy * 10}%` }}
                          ></div>
                        </div>
                        <span>{getDayBenefits(selectedDate).energy}/10</span>
                      </div>
                      
                      <div className="benefit-item">
                        <span>Focus:</span>
                        <div className="benefit-meter">
                          <div 
                            className="benefit-level" 
                            style={{ width: `${getDayBenefits(selectedDate).focus * 10}%` }}
                          ></div>
                        </div>
                        <span>{getDayBenefits(selectedDate).focus}/10</span>
                      </div>
                      
                      <div className="benefit-item">
                        <span>Confidence:</span>
                        <div className="benefit-meter">
                          <div 
                            className="benefit-level" 
                            style={{ width: `${getDayBenefits(selectedDate).confidence * 10}%` }}
                          ></div>
                        </div>
                        <span>{getDayBenefits(selectedDate).confidence}/10</span>
                      </div>
                    </div>
                  ) : (
                    <div className="no-benefits">
                      <FaInfoCircle />
                      <span>No benefits tracked for this day</span>
                    </div>
                  )}
                </div>
                
                {userData.notes && userData.notes[format(selectedDate, 'yyyy-MM-dd')] && (
                  <div className="day-journal">
                    <h4>Journal Entry</h4>
                    <div className="journal-entry">
                      {userData.notes[format(selectedDate, 'yyyy-MM-dd')]}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="premium-teaser">
                <h4>Premium Features</h4>
                <p>Upgrade to premium to see detailed benefit tracking and journal entries for each day.</p>
                <button className="btn btn-primary">Upgrade Now</button>
              </div>
            )}
            
            <div className="modal-actions">
              <button 
                className="btn btn-outline" 
                onClick={() => setDayInfoModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;