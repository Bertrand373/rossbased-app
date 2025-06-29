// components/Calendar/Calendar.js - UPDATED: Removed "Reset Calendar" functionality (moved to Stats)
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, 
  isSameDay, subMonths, addMonths, parseISO, differenceInDays, isAfter, isBefore, 
  startOfWeek as getWeekStart, addWeeks, subWeeks } from 'date-fns';
import toast from 'react-hot-toast';
import './Calendar.css';

// Icons - REMOVED: FaRedo since reset functionality is moved to Stats
import { FaCheckCircle, FaTimesCircle, FaMoon, 
  FaInfoCircle, FaEdit, FaExclamationTriangle, FaFrown, 
  FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaTheaterMasks, FaArrowLeft, FaEye, FaTimes } from 'react-icons/fa';

const Calendar = ({ userData, isPremium, updateUserData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayInfoModal, setDayInfoModal] = useState(false);
  const [editDayModal, setEditDayModal] = useState(false);
  const [editingDate, setEditingDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  // REMOVED: showResetConfirm state - reset functionality moved to Stats
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [showTriggerSelection, setShowTriggerSelection] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);

  // UPDATED: Enhanced trigger options with theater masks for explicit content and brain for lustful thoughts
  const triggerOptions = [
    { id: 'lustful_thoughts', label: 'Lustful Thoughts', icon: FaBrain },
    { id: 'stress', label: 'Stress', icon: FaExclamationTriangle },
    { id: 'boredom', label: 'Boredom', icon: FaClock },
    { id: 'social_media', label: 'Social Media', icon: FaLaptop },
    { id: 'loneliness', label: 'Loneliness', icon: FaFrown },
    { id: 'relationship', label: 'Relationship Issues', icon: FaHeart },
    { id: 'home_alone', label: 'Being Home Alone', icon: FaHome },
    { id: 'explicit_content', label: 'Explicit Content', icon: FaTheaterMasks }
  ];

  // Next and previous navigation (works for both month and week)
  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  // Get week range for week view
  const getWeekRange = (date) => {
    const weekStart = getWeekStart(date);
    const weekEnd = addDays(weekStart, 6);
    return { weekStart, weekEnd };
  };

  // REMOVED: handleResetCalendar and confirmResetCalendar functions
  // Reset functionality has been moved to Stats component

  // VERIFIED: Helper function to determine day status - CORRECT relapse logic
  const getDayStatus = (day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    day.setHours(0, 0, 0, 0);
    
    // If day is in the future, return null
    if (isAfter(day, today)) {
      return null;
    }
    
    // If before any tracking started, return null
    if (userData.startDate && isBefore(day, new Date(userData.startDate))) {
      return null;
    }
    
    // VERIFIED: Check for specific relapse dates from streak history
    // This correctly identifies relapse days and their triggers
    const relapseDay = userData.streakHistory?.find(streak => 
      streak.end && streak.reason === 'relapse' && isSameDay(new Date(streak.end), day)
    );
    
    if (relapseDay) {
      return { type: 'relapse', trigger: relapseDay.trigger };
    }
    
    // Check for wet dreams (this is mock logic - in real app you'd track these separately)
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
    
    // VERIFIED: Check if day is within current streak (GREEN)
    // Days from startDate up to today (but not including relapse days) = current streak
    if (userData.startDate) {
      const streakStart = new Date(userData.startDate);
      streakStart.setHours(0, 0, 0, 0);
      
      if (day >= streakStart && day <= today) {
        return { type: 'current-streak' };
      }
    }
    
    // VERIFIED: Check former streaks (BLUE) 
    // Days that were part of previous streaks (before relapse) = former streak
    const dayStreak = userData.streakHistory?.find(streak => {
      if (!streak.start || !streak.end) return false;
      const streakStart = new Date(streak.start);
      const streakEnd = new Date(streak.end);
      streakStart.setHours(0, 0, 0, 0);
      streakEnd.setHours(0, 0, 0, 0);
      
      // Day is within a completed streak period (but not the relapse day itself)
      // Example: If relapse on Day 5, then Days 1,2,3,4 = former streak (blue)
      return day >= streakStart && day < streakEnd;
    });
    
    if (dayStreak) {
      return { type: 'former-streak' };
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

  // Check if day is part of streak journey (only show counter for streak days)
  const isDayPartOfJourney = (day) => {
    const dayStatus = getDayStatus(day);
    
    // Only show journey counter for current streak and former streak days
    return dayStatus && (dayStatus.type === 'current-streak' || dayStatus.type === 'former-streak');
  };

  // Show day details with edit option
  const showDayDetails = (day) => {
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
        
        // 3. Start a new streak the day AFTER the relapse
        const newStreakStart = addDays(editingDate, 1);
        updatedStreakHistory.push({
          id: updatedStreakHistory.length + 1,
          start: newStreakStart,
          end: null,
          days: 0,
          reason: null,
          trigger: null
        });
        
        // 4. Calculate new current streak (days from new start to today)
        const newCurrentStreak = newStreakStart <= today ? 
          differenceInDays(today, newStreakStart) + 1 : 0;
        
        updatedUserData = {
          ...updatedUserData,
          streakHistory: updatedStreakHistory,
          relapseCount: (userData.relapseCount || 0) + 1,
          currentStreak: Math.max(0, newCurrentStreak),
          startDate: newStreakStart
        };
        
        const triggerText = selectedTrigger ? 
          ` (Trigger: ${triggerOptions.find(t => t.id === selectedTrigger)?.label})` : '';
        toast.success(`Marked ${format(editingDate, 'MMM d')} as relapse day${triggerText}`);
        break;
        
      case 'wet-dream':
        // Wet dreams don't break streaks, just increment counter
        updatedUserData = {
          ...updatedUserData,
          wetDreamCount: (userData.wetDreamCount || 0) + 1
        };
        toast.success(`Marked ${format(editingDate, 'MMM d')} as wet dream`);
        break;
        
      case 'current-streak':
        // Confirm/mark as streak day (informational only)
        if (userData.startDate) {
          const streakStart = new Date(userData.startDate);
          if (editingDate >= streakStart && editingDate <= today) {
            toast.success(`Confirmed ${format(editingDate, 'MMM d')} as streak day`);
          } else {
            toast.info(`${format(editingDate, 'MMM d')} is outside your current streak period`);
          }
        }
        break;
        
      // REMOVED: 'clear' case - no longer available as an option
        
      default:
        break;
    }
    
    if (updatedUserData !== userData) {
      updateUserData(updatedUserData);
    }
    
    // Close all modals and reset states
    setEditDayModal(false);
    setDayInfoModal(false);
    setEditingDate(null);
    setSelectedTrigger('');
    setShowTriggerSelection(false);
    setPendingStatusUpdate(null);
  };

  // UPDATED: Get day benefits data - handle sleep quality migration
  const getDayBenefits = (day) => {
    if (!userData.benefitTracking) return null;
    const benefits = userData.benefitTracking.find(benefit => 
      isSameDay(new Date(benefit.date), day)
    );
    
    // MIGRATION: Handle old attraction data -> sleep data
    if (benefits && !benefits.sleep && benefits.attraction) {
      return {
        ...benefits,
        sleep: benefits.attraction // Migrate attraction to sleep
      };
    }
    
    return benefits;
  };

  // Helper function to render trigger icon
  const renderTriggerIcon = (triggerId) => {
    const trigger = triggerOptions.find(t => t.id === triggerId);
    if (!trigger) return <FaExclamationTriangle className="trigger-icon" />;
    
    const IconComponent = trigger.icon;
    return <IconComponent className="trigger-icon" />;
  };

  // Render day cell WITHOUT trophy badges
  const renderDayCell = (day, dayIndex) => {
    const dayStatus = getDayStatus(day);
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    const isToday = isSameDay(day, new Date());
    const dayTracking = getDayTracking(day);
    const isCurrentMonth = isSameMonth(day, currentDate);
    
    const dayClasses = [
      'day-cell',
      !isCurrentMonth ? 'other-month' : '',
      isToday ? 'today' : '',
      isSelected ? 'selected' : '',
      dayStatus?.type === 'current-streak' ? 'current-streak-day' : '',
      dayStatus?.type === 'former-streak' ? 'former-streak-day' : '',
      dayStatus?.type === 'relapse' ? 'relapse-day' : '',
      dayStatus?.type === 'wet-dream' ? 'wet-dream-day' : ''
    ].filter(Boolean).join(' ');

    return (
      <div 
        key={dayIndex} 
        className={dayClasses}
        onClick={() => showDayDetails(day)}
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
          
          {dayTracking.hasBenefits && (
            <div className="day-tracking-indicator">
              <FaInfoCircle className="tracking-icon" />
            </div>
          )}
          
          {dayTracking.hasJournal && (
            <div className="day-tracking-indicator">
              <FaEdit className="tracking-icon" />
            </div>
          )}
          
          {/* REMOVED: Badge indicator - trophy icons no longer displayed */}
          
          {dayStatus && dayStatus.trigger && (
            <div className="day-trigger-indicator">
              {renderTriggerIcon(dayStatus.trigger)}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render month view calendar
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        days.push(renderDayCell(cloneDay, `${formattedDate}-${i}`));
        day = addDays(day, 1);
      }
      rows.push(
        <div className="calendar-row" key={day}>
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="calendar-display">
        <div className="calendar-grid">
          <div className="calendar-row header-row">
            <div className="day-header">Sun</div>
            <div className="day-header">Mon</div>
            <div className="day-header">Tue</div>
            <div className="day-header">Wed</div>
            <div className="day-header">Thu</div>
            <div className="day-header">Fri</div>
            <div className="day-header">Sat</div>
          </div>
          {rows}
        </div>
      </div>
    );
  };

  // Render week view calendar
  const renderWeekView = () => {
    const { weekStart, weekEnd } = getWeekRange(currentDate);
    const days = [];
    let day = weekStart;

    while (day <= weekEnd) {
      const dayStatus = getDayStatus(day);
      const dayTracking = getDayTracking(day);
      const isToday = isSameDay(day, new Date());
      const dayBenefits = getDayBenefits(day);

      days.push(
        <div key={format(day, 'yyyy-MM-dd')} className={`week-day-cell ${dayStatus?.type || ''}`} onClick={() => showDayDetails(day)}>
          <div className="week-day-header">
            <div className="week-day-name">{format(day, 'EEE')}</div>
            <div className={`week-day-number ${isToday ? 'today' : ''}`}>
              {format(day, 'd')}
            </div>
          </div>
          
          <div className="week-day-status">
            {dayStatus && (
              <div className={`week-status-badge ${dayStatus.type}`}>
                {dayStatus.type === 'current-streak' && <FaCheckCircle />}
                {dayStatus.type === 'former-streak' && <FaCheckCircle />}
                {dayStatus.type === 'relapse' && <FaTimesCircle />}
                {dayStatus.type === 'wet-dream' && <FaMoon />}
                <span>{dayStatus.type.replace('-', ' ')}</span>
              </div>
            )}
          </div>

          {dayBenefits && (
            <div className="week-benefits">
              <div className="week-benefit-item">
                <span className="benefit-mini-label">Enrg</span>
                <div className="benefit-mini-slider">
                  <div className="benefit-mini-fill" style={{width: `${(dayBenefits.energy || 0) * 10}%`}}></div>
                </div>
                <span className="benefit-mini-value">{dayBenefits.energy || 0}</span>
              </div>
              <div className="week-benefit-item">
                <span className="benefit-mini-label">Focus</span>
                <div className="benefit-mini-slider">
                  <div className="benefit-mini-fill" style={{width: `${(dayBenefits.focus || 0) * 10}%`}}></div>
                </div>
                <span className="benefit-mini-value">{dayBenefits.focus || 0}</span>
              </div>
              <div className="week-benefit-item">
                <span className="benefit-mini-label">Conf</span>
                <div className="benefit-mini-slider">
                  <div className="benefit-mini-fill" style={{width: `${(dayBenefits.confidence || 0) * 10}%`}}></div>
                </div>
                <span className="benefit-mini-value">{dayBenefits.confidence || 0}</span>
              </div>
            </div>
          )}

          <div className="week-tracking-indicators">
            {dayTracking.hasJournal && <FaEdit className="week-journal-icon" />}
            {dayStatus && dayStatus.trigger && renderTriggerIcon(dayStatus.trigger)}
          </div>
        </div>
      );
      
      day = addDays(day, 1);
    }

    return (
      <div className="calendar-display">
        <div className="week-view-grid">
          {days}
        </div>
      </div>
    );
  };

  // Get period title based on view mode
  const getPeriodTitle = () => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy');
    } else {
      const { weekStart, weekEnd } = getWeekRange(currentDate);
      if (isSameMonth(weekStart, weekEnd)) {
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`;
      } else {
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      }
    }
  };

  // Calculate journey day for streak days
  const getJourneyDay = (day) => {
    if (!isDayPartOfJourney(day)) return null;
    
    const dayStatus = getDayStatus(day);
    
    if (dayStatus.type === 'current-streak') {
      // Current streak: days from start date
      const streakStart = new Date(userData.startDate);
      streakStart.setHours(0, 0, 0, 0);
      return differenceInDays(day, streakStart) + 1;
    } else if (dayStatus.type === 'former-streak') {
      // Former streak: find which streak this day belongs to
      const dayStreak = userData.streakHistory?.find(streak => {
        if (!streak.start || !streak.end) return false;
        const streakStart = new Date(streak.start);
        const streakEnd = new Date(streak.end);
        streakStart.setHours(0, 0, 0, 0);
        streakEnd.setHours(0, 0, 0, 0);
        return day >= streakStart && day < streakEnd;
      });
      
      if (dayStreak) {
        const streakStart = new Date(dayStreak.start);
        streakStart.setHours(0, 0, 0, 0);
        return differenceInDays(day, streakStart) + 1;
      }
    }
    
    return null;
  };

  return (
    <div className="calendar-container">
      {/* Header exactly like Tracker and Calendar */}
      <div className="calendar-header">
        <div className="calendar-header-spacer"></div>
        <h2>Your Calendar</h2>
        <div className="calendar-header-actions">
          {/* REMOVED: Reset calendar button - functionality moved to Stats */}
        </div>
      </div>

      {/* Main calendar section */}
      <div className="calendar-main-section">
        {/* UPDATED: Calendar controls - moved toggle above navigation */}
        <div className="calendar-controls">
          {/* MOVED: View mode toggle now comes first */}
          <div className="view-mode-toggle">
            <button 
              className={`view-toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
          </div>

          {/* Period navigation now comes second */}
          <div className="period-navigation">
            <button className="period-nav-btn" onClick={prevPeriod}>
              ‹
            </button>
            <h3>{getPeriodTitle()}</h3>
            <button className="period-nav-btn" onClick={nextPeriod}>
              ›
            </button>
          </div>
        </div>

        {/* UPDATED: Calendar legend with BLUE former streak indicator */}
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
          <div className="legend-item">
            <FaInfoCircle className="legend-info-icon" />
            <span>Benefits Tracked</span>
          </div>
          <div className="legend-item">
            <FaEdit className="legend-info-icon" />
            <span>Journal Entry</span>
          </div>
        </div>

        <div className="calendar-instructions">
          Click on any day to view details or edit your journey
        </div>

        {/* Calendar display */}
        {viewMode === 'month' ? renderMonthView() : renderWeekView()}
      </div>

      {/* Day Info Modal */}
      {dayInfoModal && selectedDate && (
        <div className="modal-overlay">
          <div className="modal-content day-info-modal">
            <h3>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</h3>
            
            {/* Show journey day counter if this day is part of streak */}
            {isDayPartOfJourney(selectedDate) && (
              <div className="day-streak-info">
                <div className="streak-day-number">{getJourneyDay(selectedDate)}</div>
                <div className="streak-context">
                  Day {getJourneyDay(selectedDate)} of your journey
                </div>
              </div>
            )}
            
            <div className="day-status-info">
              {(() => {
                const dayStatus = getDayStatus(selectedDate);
                if (dayStatus) {
                  return (
                    <div className={`status-badge ${dayStatus.type}`}>
                      {dayStatus.type === 'current-streak' && <><FaCheckCircle /> Current Streak Day</>}
                      {dayStatus.type === 'former-streak' && <><FaCheckCircle /> Former Streak Day</>}
                      {dayStatus.type === 'relapse' && <><FaTimesCircle /> Relapse</>}
                      {dayStatus.type === 'wet-dream' && <><FaMoon /> Wet Dream</>}
                    </div>
                  );
                }
                return <span>No streak data for this day</span>;
              })()}
              
              {(() => {
                const dayStatus = getDayStatus(selectedDate);
                if (dayStatus && dayStatus.trigger) {
                  return (
                    <div className="trigger-info">
                      <div className="trigger-display">
                        {renderTriggerIcon(dayStatus.trigger)}
                        <span>Trigger: {triggerOptions.find(t => t.id === dayStatus.trigger)?.label}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {(() => {
              const dayTracking = getDayTracking(selectedDate);
              if (dayTracking.hasBenefits) {
                return (
                  <div className="day-tracking-info">
                    <h4>Benefits Tracked</h4>
                    <p>✓ You tracked benefits for this day</p>
                  </div>
                );
              }
              return null;
            })()}

            {(() => {
              const dayBenefits = getDayBenefits(selectedDate);
              if (dayBenefits) {
                return (
                  <div className="day-benefits">
                    <h4>Benefit Levels</h4>
                    <div className="benefits-details-enhanced">
                      <div className="benefit-slider-item">
                        <div className="benefit-slider-header">
                          <span className="benefit-label">Energy</span>
                          <span className="benefit-value">{dayBenefits.energy || 0}/10</span>
                        </div>
                        <div className="benefit-meter-enhanced">
                          <div className="benefit-level-enhanced" style={{width: `${(dayBenefits.focus || 0) * 10}%`}}></div>
                        </div>
                      </div>
                      
                      <div className="benefit-slider-item">
                        <div className="benefit-slider-header">
                          <span className="benefit-label">Confidence</span>
                          <span className="benefit-value">{dayBenefits.confidence || 0}/10</span>
                        </div>
                        <div className="benefit-meter-enhanced">
                          <div className="benefit-level-enhanced" style={{width: `${(dayBenefits.confidence || 0) * 10}%`}}></div>
                        </div>
                      </div>
                      
                      <div className="benefit-slider-item">
                        <div className="benefit-slider-header">
                          <span className="benefit-label">Aura</span>
                          <span className="benefit-value">{dayBenefits.aura || 0}/10</span>
                        </div>
                        <div className="benefit-meter-enhanced">
                          <div className="benefit-level-enhanced" style={{width: `${(dayBenefits.aura || 0) * 10}%`}}></div>
                        </div>
                      </div>
                      
                      <div className="benefit-slider-item">
                        <div className="benefit-slider-header">
                          <span className="benefit-label">Sleep Quality</span>
                          <span className="benefit-value">{dayBenefits.sleep || dayBenefits.attraction || 0}/10</span>
                        </div>
                        <div className="benefit-meter-enhanced">
                          <div className="benefit-level-enhanced" style={{width: `${(dayBenefits.sleep || dayBenefits.attraction || 0) * 10}%`}}></div>
                        </div>
                      </div>
                      
                      <div className="benefit-slider-item">
                        <div className="benefit-slider-header">
                          <span className="benefit-label">Workout</span>
                          <span className="benefit-value">{dayBenefits.workout || 0}/10</span>
                        </div>
                        <div className="benefit-meter-enhanced">
                          <div className="benefit-level-enhanced" style={{width: `${(dayBenefits.workout || 0) * 10}%`}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {(() => {
              const dayStr = format(selectedDate, 'yyyy-MM-dd');
              const journalEntry = userData.notes && userData.notes[dayStr];
              if (journalEntry) {
                return (
                  <div className="day-journal">
                    <h4>Journal Entry</h4>
                    <div className="journal-entry">{journalEntry}</div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="modal-actions">
              <button className="btn btn-primary edit-day-btn" onClick={showEditFromInfo}>
                <FaEdit />
                Edit Day
              </button>
              <button className="btn btn-outline" onClick={() => setDayInfoModal(false)}>
                <FaTimes />
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Day Modal */}
      {editDayModal && editingDate && (
        <div className="modal-overlay">
          <div className="modal-content edit-day-modal">
            <div className="modal-header-simple">
              <h3>Edit {format(editingDate, 'MMMM d, yyyy')}</h3>
            </div>
            <p>Choose the status for this day:</p>

            {!showTriggerSelection ? (
              <div className="edit-day-options">
                <button 
                  className="edit-option-btn current-streak-btn"
                  onClick={() => handleStatusClick('current-streak')}
                >
                  <FaCheckCircle />
                  <span>Mark as Streak Day</span>
                </button>
                
                <button 
                  className="edit-option-btn wet-dream-btn"
                  onClick={() => handleStatusClick('wet-dream')}
                >
                  <FaMoon />
                  <span>Mark as Wet Dream</span>
                </button>
                
                <button 
                  className="edit-option-btn relapse-btn"
                  onClick={() => handleStatusClick('relapse')}
                >
                  <FaTimesCircle />
                  <span>Mark as Relapse</span>
                </button>
                
                {/* REMOVED: Clear Status button */}
              </div>
            ) : (
              <div className="trigger-selection">
                <h4>What triggered this relapse?</h4>
                <div className="trigger-options">
                  {triggerOptions.map(trigger => (
                    <button
                      key={trigger.id}
                      className={`trigger-option-pill ${selectedTrigger === trigger.id ? 'selected' : ''}`}
                      onClick={() => setSelectedTrigger(trigger.id)}
                    >
                      <trigger.icon className="trigger-option-icon" />
                      <span>{trigger.label}</span>
                    </button>
                  ))}
                </div>
                
                <div className="trigger-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={handleTriggerSelection}
                    disabled={!selectedTrigger}
                  >
                    Confirm Relapse
                  </button>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="back-to-info-btn" onClick={backToDayInfo}>
                <FaArrowLeft />
                Back to Info
              </button>
              <button className="btn-outline" onClick={() => setEditDayModal(false)}>
                <FaTimes />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;<div className="benefit-level-enhanced" style={{width: `${(dayBenefits.energy || 0) * 10}%`}}></div>
                        </div>
                      </div>
                      
                      <div className="benefit-slider-item">
                        <div className="benefit-slider-header">
                          <span className="benefit-label">Focus</span>
                          <span className="benefit-value">{dayBenefits.focus || 0}/10</span>
                        </div>
                        <div className="benefit-meter-enhanced">