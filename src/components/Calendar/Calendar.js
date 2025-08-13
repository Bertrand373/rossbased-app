// components/Calendar/Calendar.js - UPDATED: Restrict future days and pre-journey days
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, 
  isSameMonth, addMonths, subMonths, differenceInDays, isAfter, isBefore } from 'date-fns';
import toast from 'react-hot-toast';
import './CalendarBase.css';
import './CalendarModals.css';

// Icons
import { FaEdit, FaTimes, FaCheckCircle, FaTimesCircle, FaMoon, FaInfoCircle,
  FaBrain, FaExclamationTriangle, FaClock, FaLaptop, FaFrown, FaHeart, FaHome, FaArrowLeft } from 'react-icons/fa';

const Calendar = ({ userData, updateUserData, isPremium }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayInfoModal, setDayInfoModal] = useState(false);
  const [editDayModal, setEditDayModal] = useState(false);
  const [editingDate, setEditingDate] = useState(null);
  const [showTriggerSelection, setShowTriggerSelection] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);
  const [calendarView, setCalendarView] = useState('month'); // 'month' or 'week'

  // Enhanced trigger options matching other components
  const triggerOptions = [
    { id: 'lustful_thoughts', label: 'Lustful Thoughts', icon: FaBrain },
    { id: 'stress', label: 'Stress', icon: FaExclamationTriangle },
    { id: 'boredom', label: 'Boredom', icon: FaClock },
    { id: 'social_media', label: 'Social Media', icon: FaLaptop },
    { id: 'loneliness', label: 'Loneliness', icon: FaFrown },
    { id: 'relationship', label: 'Relationship Issues', icon: FaHeart },
    { id: 'home_environment', label: 'Home Environment', icon: FaHome }
  ];

  // UPDATED: Check if day is editable - restrict future days and pre-journey days
  const isDayEditable = (day) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    day.setHours(0, 0, 0, 0);
    
    // Don't allow future days
    if (day > today) {
      return false;
    }
    
    // Don't allow days before the user's journey started
    if (userData.startDate) {
      const journeyStart = new Date(userData.startDate);
      journeyStart.setHours(0, 0, 0, 0);
      if (day < journeyStart) {
        return false;
      }
    }
    
    return true;
  };

  // UPDATED: Enhanced day status logic with FORMER streak support (BLUE)
  const getDayStatus = (day) => {
    if (!userData.streakHistory || userData.streakHistory.length === 0) {
      return null;
    }
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    day.setHours(0, 0, 0, 0);
    
    // Don't show status for future days
    if (isAfter(day, today)) {
      return null;
    }
    
    // STEP 1: Check for specific relapse dates from streak history (RED)
    const relapseDay = userData.streakHistory?.find(streak => 
      streak.end && streak.reason === 'relapse' && isSameDay(new Date(streak.end), day)
    );
    
    if (relapseDay) {
      return { type: 'relapse', trigger: relapseDay.trigger };
    }
    
    // STEP 2: Check for wet dreams (YELLOW/ORANGE)
    const wetDreamDates = userData.streakHistory?.reduce((dates, streak) => {
      if (streak.start && streak.days > 7) {
        const wetDreamDay = new Date(streak.start);
        wetDreamDay.setDate(wetDreamDay.getDate() + 5);
        if (wetDreamDay <= today && isSameDay(wetDreamDay, day)) {
          dates.push(wetDreamDay);
        }
      }
      return dates;
    }, []) || [];
    
    if (wetDreamDates.length > 0) {
      return { type: 'wet-dream' };
    }
    
    // STEP 3: Check former streaks FIRST (BLUE) - completed streaks
    const formerStreak = userData.streakHistory?.find(streak => {
      if (!streak.start || !streak.end) return false;
      const streakStart = new Date(streak.start);
      const streakEnd = new Date(streak.end);
      streakStart.setHours(0, 0, 0, 0);
      streakEnd.setHours(0, 0, 0, 0);
      
      // Day is within a completed streak period (but not the relapse day itself)
      return day >= streakStart && day < streakEnd;
    });
    
    if (formerStreak) {
      return { type: 'former-streak' };
    }
    
    // STEP 4: Check current streak LAST (GREEN) - only active streak with no end date
    const currentStreak = userData.streakHistory?.find(streak => 
      streak.start && !streak.end // Active streak has no end date
    );
    
    if (currentStreak) {
      const streakStart = new Date(currentStreak.start);
      streakStart.setHours(0, 0, 0, 0);
      
      // Day is within the current active streak period
      if (day >= streakStart && day <= today) {
        return { type: 'current-streak' };
      }
    }
    
    return null;
  };

  // Check if day has benefits or journal entries
  const getDayTracking = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const hasBenefits = userData.benefitTracking?.some(benefit => 
      format(new Date(benefit.date), 'yyyy-MM-dd') === dayStr
    );
    const hasJournal = userData.notes && userData.notes[dayStr];
    
    return { hasBenefits, hasJournal };
  };

  // Get day benefits data
  const getDayBenefits = (day) => {
    if (!userData.benefitTracking) return null;
    const dayStr = format(day, 'yyyy-MM-dd');
    return userData.benefitTracking.find(benefit => 
      format(new Date(benefit.date), 'yyyy-MM-dd') === dayStr
    );
  };

  // ENHANCED: Get streak journey info for any streak day (current or former)
  const getStreakJourneyInfo = (day) => {
    const dayStatus = getDayStatus(day);
    
    if (!dayStatus || (dayStatus.type !== 'current-streak' && dayStatus.type !== 'former-streak')) {
      return null;
    }
    
    if (dayStatus.type === 'current-streak') {
      // Current streak: show day number from current streak start
      const currentStreak = userData.streakHistory?.find(streak => 
        streak.start && !streak.end
      );
      
      if (currentStreak) {
        const streakStart = new Date(currentStreak.start);
        const dayNumber = differenceInDays(day, streakStart) + 1;
        return {
          dayNumber: dayNumber > 0 ? dayNumber : 0,
          text: "Day of your retention journey",
          type: 'current'
        };
      }
    }
    
    if (dayStatus.type === 'former-streak') {
      // Former streak: show day number within that specific streak + total length
      const formerStreak = userData.streakHistory?.find(streak => {
        if (!streak.start || !streak.end) return false;
        const streakStart = new Date(streak.start);
        const streakEnd = new Date(streak.end);
        streakStart.setHours(0, 0, 0, 0);
        streakEnd.setHours(0, 0, 0, 0);
        day.setHours(0, 0, 0, 0);
        
        return day >= streakStart && day < streakEnd;
      });
      
      if (formerStreak) {
        const streakStart = new Date(formerStreak.start);
        const dayNumber = differenceInDays(day, streakStart) + 1;
        const totalDays = formerStreak.days;
        
        return {
          dayNumber: dayNumber > 0 ? dayNumber : 0,
          text: `Day of your ${totalDays}-day streak`,
          type: 'former',
          totalDays
        };
      }
    }
    
    return null;
  };

  // Check if day is part of streak journey (only show counter for streak days)
  const isDayPartOfJourney = (day) => {
    return getStreakJourneyInfo(day) !== null;
  };

  // UPDATED: Show day details with restrictions
  const showDayDetails = (day) => {
    // EARLY RETURN: Check if day is editable
    if (!isDayEditable(day)) {
      // Show appropriate message for different restrictions
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      day.setHours(0, 0, 0, 0);
      
      if (day > today) {
        toast.error("Can't edit future days");
      } else if (userData.startDate && day < new Date(userData.startDate)) {
        toast.error("Can't edit days before your journey started");
      }
      return; // Exit function immediately
    }
    
    // Only editable days reach this point
    setSelectedDate(day);
    setEditingDate(day);
    setDayInfoModal(true);
    // Reset edit modal states
    setEditDayModal(false);
    setShowTriggerSelection(false);
    setSelectedTrigger('');
    setPendingStatusUpdate(null);
  };

  // Show edit day modal from info modal
  const showEditFromInfo = () => {
    setDayInfoModal(false);
    setEditDayModal(true);
    setShowTriggerSelection(false);
    setSelectedTrigger('');
    setPendingStatusUpdate(null);
  };

  // Go back to day info from edit modal
  const backToDayInfo = () => {
    setEditDayModal(false);
    setDayInfoModal(true);
    setShowTriggerSelection(false);
    setSelectedTrigger('');
    setPendingStatusUpdate(null);
  };

  // Handle status button click with proper trigger flow
  const handleStatusClick = (status) => {
    if (status === 'relapse') {
      // Show trigger selection for relapse
      setPendingStatusUpdate(status);
      setShowTriggerSelection(true);
    } else {
      // For other statuses, update immediately
      updateDayStatus(status);
    }
  };

  // Handle trigger selection and final update
  const handleTriggerSelection = () => {
    if (pendingStatusUpdate === 'relapse') {
      updateDayStatus('relapse');
    }
  };

  // VERIFIED: Enhanced day status update with CORRECT relapse logic
  const updateDayStatus = (newStatus) => {
    if (!editingDate || !updateUserData) {
      console.error('Missing editingDate or updateUserData function');
      return;
    }
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let updatedStreakHistory = [...(userData.streakHistory || [])];
    let updatedUserData = { ...userData };
    
    switch (newStatus) {
      case 'relapse':
        // VERIFIED: Correct relapse logic
        // 1. Find the active streak (no end date)
        const activeStreakIndex = updatedStreakHistory.findIndex(streak => !streak.end);
        if (activeStreakIndex !== -1) {
          const currentStreak = updatedStreakHistory[activeStreakIndex];
          const streakDays = differenceInDays(editingDate, new Date(currentStreak.start)) + 1;
          
          // 2. End the current streak on the relapse date
          updatedStreakHistory[activeStreakIndex] = {
            ...currentStreak,
            end: editingDate, // Relapse day becomes the end date
            days: streakDays > 0 ? streakDays : 0,
            reason: 'relapse',
            trigger: selectedTrigger || null
          };
        }
        
        // 3. Create a new streak starting the day after relapse
        const newStreakStart = addDays(editingDate, 1);
        if (newStreakStart <= today) {
          const newStreakDays = differenceInDays(today, newStreakStart) + 1;
          updatedStreakHistory.push({
            id: Date.now(),
            start: newStreakStart,
            end: null,
            days: newStreakDays > 0 ? newStreakDays : 0,
            reason: null
          });
          
          // Update current streak counter
          updatedUserData.currentStreak = newStreakDays > 0 ? newStreakDays : 0;
          updatedUserData.startDate = newStreakStart;
        } else {
          // If relapse is today, reset everything
          updatedUserData.currentStreak = 0;
          updatedUserData.startDate = today;
        }
        
        // Increment relapse count
        updatedUserData.relapseCount = (userData.relapseCount || 0) + 1;
        break;
        
      case 'current-streak':
        // Mark day as part of current streak
        // This might require adjusting streak start date
        const currentStreakData = updatedStreakHistory.find(streak => !streak.end);
        if (currentStreakData) {
          const currentStart = new Date(currentStreakData.start);
          if (editingDate < currentStart) {
            // Extend streak start to earlier date
            currentStreakData.start = editingDate;
            updatedUserData.startDate = editingDate;
            updatedUserData.currentStreak = differenceInDays(today, editingDate) + 1;
          }
        } else {
          // Create new current streak
          updatedStreakHistory.push({
            id: Date.now(),
            start: editingDate,
            end: null,
            days: differenceInDays(today, editingDate) + 1,
            reason: null
          });
          updatedUserData.startDate = editingDate;
          updatedUserData.currentStreak = differenceInDays(today, editingDate) + 1;
        }
        break;
        
      case 'wet-dream':
        // Mark as wet dream day - doesn't break streak
        // Implementation depends on how you want to track wet dreams
        updatedUserData.wetDreamCount = (userData.wetDreamCount || 0) + 1;
        break;
        
      default:
        break;
    }
    
    // Update user data
    updatedUserData.streakHistory = updatedStreakHistory;
    updateUserData(updatedUserData);
    
    // Close modals and reset states
    setEditDayModal(false);
    setDayInfoModal(false);
    setShowTriggerSelection(false);
    setSelectedTrigger('');
    setPendingStatusUpdate(null);
    
    toast.success('Day status updated successfully');
  };

  // Render trigger icon
  const renderTriggerIcon = (triggerId) => {
    const trigger = triggerOptions.find(t => t.id === triggerId);
    if (!trigger) return null;
    
    const IconComponent = trigger.icon;
    return <IconComponent className="trigger-icon" />;
  };

  // Navigation functions
  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  // UPDATED: Render month day with restrictions
  const renderMonthDay = (day, dayIndex) => {
    const dayStatus = getDayStatus(day);
    const dayTracking = getDayTracking(day);
    const isToday = isSameDay(day, new Date());
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    const isCurrentMonth = isSameMonth(day, currentDate);
    const isEditable = isDayEditable(day);
    
    // Build CSS classes
    const dayClasses = [
      'day-cell',
      !isCurrentMonth ? 'other-month' : '',
      isToday ? 'today' : '',
      isSelected ? 'selected' : '',
      !isEditable ? 'non-editable' : '', // Add non-editable class
      dayStatus?.type === 'current-streak' ? 'current-streak-day' : '',
      dayStatus?.type === 'former-streak' ? 'former-streak-day' : '',
      dayStatus?.type === 'relapse' ? 'relapse-day' : '',
      dayStatus?.type === 'wet-dream' ? 'wet-dream-day' : ''
    ].filter(Boolean).join(' ');

    return (
      <div 
        key={dayIndex} 
        className={dayClasses}
        onClick={() => isEditable ? showDayDetails(day) : null}
        style={{ cursor: isEditable ? 'pointer' : 'not-allowed' }}
      >
        <div className="day-content">
          <div className="day-number">{format(day, 'd')}</div>
        </div>
        
        {/* Day indicators WITHOUT trophy badge */}
        <div className="day-indicators">
          {dayStatus && (
            <div className="day-status-indicator">
              {(dayStatus.type === 'current-streak' || dayStatus.type === 'former-streak') && 
                <FaCheckCircle className="success-icon" />}
              {dayStatus.type === 'relapse' && <FaTimesCircle className="relapse-icon" />}
              {dayStatus.type === 'wet-dream' && <FaMoon className="wet-dream-icon" />}
            </div>
          )}
          
          {(dayTracking.hasBenefits || dayTracking.hasJournal) && (
            <div className="day-tracking-indicator">
              <FaInfoCircle className="tracking-icon" />
            </div>
          )}
          
          {dayStatus?.trigger && (
            <div className="day-trigger-indicator">
              {renderTriggerIcon(dayStatus.trigger)}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Build calendar days for month view
  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const dateFormat = "EEEE";
    const rows = [];
    
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
    
    rows.push(
      <div key="header-row" className="calendar-row header-row">
        {daysHeader}
      </div>
    );
    
    let days = [];
    day = startDate;
    let dayIndex = 0;
    
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        days.push(renderMonthDay(day, dayIndex));
        day = addDays(day, 1);
        dayIndex++;
      }
      
      rows.push(
        <div key={`week-${Math.floor(dayIndex / 7)}`} className="calendar-row">
          {days}
        </div>
      );
      days = [];
    }
    
    return <div className="calendar-grid">{rows}</div>;
  };

  return (
    <div className="calendar-container">
      {/* UPDATED: Integrated Header Design */}
      <div className="integrated-calendar-header">
        <div className="header-title-section">
          <h2>Calendar</h2>
        </div>
        
        <div className="header-navigation-section">
          <div className="navigation-pill-container">
            <button
              className={`navigation-section-btn ${calendarView === 'month' ? 'active' : ''}`}
              onClick={() => setCalendarView('month')}
            >
              Month
            </button>
            <button
              className={`navigation-section-btn ${calendarView === 'week' ? 'active' : ''}`}
              onClick={() => setCalendarView('week')}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Main Section */}
      <div className="calendar-main-section">
        {/* Period Navigation */}
        <div className="calendar-period-navigation">
          <button className="period-nav-btn" onClick={prevMonth}>
            ‹
          </button>
          <h3>{format(currentDate, 'MMMM yyyy')}</h3>
          <button className="period-nav-btn" onClick={nextMonth}>
            ›
          </button>
        </div>

        {/* Instructions */}
        <div className="calendar-instructions">
          Click on any day within your journey to view details or edit status
        </div>

        {/* Calendar Display */}
        <div className="calendar-display">
          {calendarView === 'month' ? renderCalendarDays() : null}
        </div>

        {/* Calendar Legend */}
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-indicator current-streak"></div>
            <span>Current Streak</span>
          </div>
          <div className="legend-item">
            <div className="legend-indicator former-streak"></div>
            <span>Former Streak</span>
          </div>
          <div className="legend-item">
            <div className="legend-indicator relapse"></div>
            <span>Relapse</span>
          </div>
          <div className="legend-item">
            <div className="legend-indicator wet-dream"></div>
            <span>Wet Dream</span>
          </div>
          <div className="legend-item legend-has-data">
            <FaInfoCircle className="legend-info-icon" />
            <span>Has Data</span>
          </div>
        </div>
      </div>

      {/* Day Info Modal */}
      {dayInfoModal && selectedDate && (
        <div className="modal-overlay" onClick={() => setDayInfoModal(false)}>
          <div className="modal-content day-info-modal" onClick={e => e.stopPropagation()}>
            <button 
              className="modal-close-x" 
              onClick={() => setDayInfoModal(false)}
              aria-label="Close"
            >
              <FaTimes />
            </button>
            
            <h3>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</h3>

            {/* Day Status Info */}
            <div className="day-status-info">
              {(() => {
                const dayStatus = getDayStatus(selectedDate);
                if (dayStatus) {
                  switch (dayStatus.type) {
                    case 'current-streak':
                      return <div className="status-badge current-streak">✓ Current Streak Day</div>;
                    case 'former-streak':
                      return <div className="status-badge former-streak">✓ Former Streak Day</div>;
                    case 'relapse':
                      return <div className="status-badge relapse">✗ Relapse Day</div>;
                    case 'wet-dream':
                      return <div className="status-badge wet-dream">~ Wet Dream</div>;
                    default:
                      return <div className="status-badge">No Status</div>;
                  }
                }
                return <div className="status-badge">No Status</div>;
              })()}

              {/* Trigger info */}
              {(() => {
                const dayStatus = getDayStatus(selectedDate);
                if (dayStatus?.trigger) {
                  const trigger = triggerOptions.find(t => t.id === dayStatus.trigger);
                  return (
                    <div className="trigger-info">
                      <div className="trigger-display">
                        <div className="trigger-display-icon">
                          {renderTriggerIcon(dayStatus.trigger)}
                        </div>
                        <span>Trigger: {trigger?.label || 'Unknown'}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* ENHANCED: Journey Day Counter with Former Streak Support */}
            {isDayPartOfJourney(selectedDate) && (
              <div className="day-streak-info">
                <div className="streak-day-number">
                  {(() => {
                    const journeyInfo = getStreakJourneyInfo(selectedDate);
                    return journeyInfo ? journeyInfo.dayNumber : 0;
                  })()}
                </div>
                <div className="streak-context">
                  {(() => {
                    const journeyInfo = getStreakJourneyInfo(selectedDate);
                    return journeyInfo ? journeyInfo.text : "Day of your retention journey";
                  })()}
                </div>
              </div>
            )}

            {/* Tracking Info */}
            {(() => {
              const dayTracking = getDayTracking(selectedDate);
              if (dayTracking.hasBenefits || dayTracking.hasJournal) {
                return (
                  <div className="day-tracking-info">
                    <h4>Logged Data</h4>
                    {dayTracking.hasBenefits && <p>✓ Benefits tracked for this day</p>}
                    {dayTracking.hasJournal && <p>✓ Journal entry recorded</p>}
                  </div>
                );
              }
              return null;
            })()}

            {/* Benefits Details */}
            {(() => {
              const dayBenefits = getDayBenefits(selectedDate);
              if (dayBenefits) {
                return (
                  <div className="day-benefits">
                    <h4>Benefits Tracked</h4>
                    <div className="benefits-details-enhanced">
                      <div className="benefit-slider-item">
                        <div className="benefit-slider-header">
                          <span className="benefit-label">Energy</span>
                          <span className="benefit-value">{dayBenefits.energy}/10</span>
                        </div>
                        <div className="benefit-meter-enhanced">
                          <div 
                            className="benefit-level-enhanced" 
                            style={{ width: `${dayBenefits.energy * 10}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="benefit-slider-item">
                        <div className="benefit-slider-header">
                          <span className="benefit-label">Focus</span>
                          <span className="benefit-value">{dayBenefits.focus}/10</span>
                        </div>
                        <div className="benefit-meter-enhanced">
                          <div 
                            className="benefit-level-enhanced" 
                            style={{ width: `${dayBenefits.focus * 10}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="benefit-slider-item">
                        <div className="benefit-slider-header">
                          <span className="benefit-label">Confidence</span>
                          <span className="benefit-value">{dayBenefits.confidence}/10</span>
                        </div>
                        <div className="benefit-meter-enhanced">
                          <div 
                            className="benefit-level-enhanced" 
                            style={{ width: `${dayBenefits.confidence * 10}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="benefit-slider-item">
                        <div className="benefit-slider-header">
                          <span className="benefit-label">Aura</span>
                          <span className="benefit-value">{dayBenefits.aura || 5}/10</span>
                        </div>
                        <div className="benefit-meter-enhanced">
                          <div 
                            className="benefit-level-enhanced" 
                            style={{ width: `${(dayBenefits.aura || 5) * 10}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="benefit-slider-item">
                        <div className="benefit-slider-header">
                          <span className="benefit-label">Sleep Quality</span>
                          <span className="benefit-value">{dayBenefits.sleep || dayBenefits.attraction || 5}/10</span>
                        </div>
                        <div className="benefit-meter-enhanced">
                          <div 
                            className="benefit-level-enhanced" 
                            style={{ width: `${(dayBenefits.sleep || dayBenefits.attraction || 5) * 10}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="benefit-slider-item">
                        <div className="benefit-slider-header">
                          <span className="benefit-label">Workout</span>
                          <span className="benefit-value">{dayBenefits.workout || dayBenefits.gymPerformance || 5}/10</span>
                        </div>
                        <div className="benefit-meter-enhanced">
                          <div 
                            className="benefit-level-enhanced" 
                            style={{ width: `${(dayBenefits.workout || dayBenefits.gymPerformance || 5) * 10}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Journal Entry */}
            {(() => {
              const dayStr = format(selectedDate, 'yyyy-MM-dd');
              const dayNote = userData.notes && userData.notes[dayStr];
              if (dayNote) {
                return (
                  <div className="day-journal">
                    <h4>Journal Entry</h4>
                    <div className="journal-entry">
                      {dayNote}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="modal-actions">
              <button className="btn-primary edit-day-btn" onClick={showEditFromInfo}>
                <FaEdit />
                Edit Day
              </button>
              <button className="btn-outline" onClick={() => setDayInfoModal(false)}>
                <FaTimes />
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATED: Edit Day Modal - REMOVED "Clear Status" option */}
      {editDayModal && editingDate && (
        <div className="modal-overlay" onClick={() => setEditDayModal(false)}>
          <div className="modal-content edit-day-modal" onClick={e => e.stopPropagation()}>
            <button 
              className="modal-close-x" 
              onClick={() => setEditDayModal(false)}
              aria-label="Close"
            >
              <FaTimes />
            </button>
            
            <div className="modal-header-simple">
              <h3>Edit {format(editingDate, 'MMM d, yyyy')}</h3>
            </div>
            
            <p>What happened on this day?</p>

            {!showTriggerSelection ? (
              <>
                <div className="edit-day-options">
                  <button 
                    className="edit-option-btn current-streak-btn"
                    onClick={() => handleStatusClick('current-streak')}
                  >
                    <FaCheckCircle />
                    <span>Successful Day (Current Streak)</span>
                  </button>
                  
                  <button 
                    className="edit-option-btn wet-dream-btn"
                    onClick={() => handleStatusClick('wet-dream')}
                  >
                    <FaMoon />
                    <span>Wet Dream (No Streak Break)</span>
                  </button>
                  
                  <button 
                    className="edit-option-btn relapse-btn"
                    onClick={() => handleStatusClick('relapse')}
                  >
                    <FaTimesCircle />
                    <span>Relapse (Reset Streak)</span>
                  </button>
                </div>

                <div className="modal-actions">
                  <button className="back-to-info-btn" onClick={backToDayInfo}>
                    <FaArrowLeft />
                    Back to Info
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="trigger-selection">
                  <h4>What triggered the relapse?</h4>
                  <div className="trigger-options">
                    {triggerOptions.map(trigger => {
                      const IconComponent = trigger.icon;
                      return (
                        <button
                          key={trigger.id}
                          className={`trigger-option-pill ${selectedTrigger === trigger.id ? 'selected' : ''}`}
                          onClick={() => setSelectedTrigger(trigger.id)}
                        >
                          <IconComponent className="trigger-option-icon" />
                          <span>{trigger.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="trigger-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={handleTriggerSelection}
                    disabled={!selectedTrigger}
                  >
                    <FaCheckCircle />
                    Confirm Relapse
                  </button>
                </div>

                <div className="modal-actions">
                  <button className="back-to-info-btn" onClick={() => setShowTriggerSelection(false)}>
                    <FaArrowLeft />
                    Back to Options
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;