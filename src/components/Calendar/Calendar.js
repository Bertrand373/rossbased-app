// components/Calendar/Calendar.js - UPDATED: Goal system completely removed, Moon cycles enhanced
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, 
  isSameDay, subMonths, addMonths, parseISO, differenceInDays, isAfter, isBefore, 
  startOfWeek as getWeekStart, addWeeks, subWeeks } from 'date-fns';
import toast from 'react-hot-toast';
import './CalendarBase.css';
import './CalendarModals.css';

// Icons - UPDATED: Removed goal-specific icons, added moon phase icons
import { FaCheckCircle, FaTimesCircle, FaMoon, 
  FaInfoCircle, FaEdit, FaExclamationTriangle, FaFrown, 
  FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaTheaterMasks, FaArrowLeft, FaEye, FaTimes, 
  FaWineBottle, FaBed, FaRegMoon, FaAdjust } from 'react-icons/fa';

// UPDATED: Removed moon phase integration - keeping calendar clean and focused
const Calendar = ({ userData, isPremium, updateUserData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayInfoModal, setDayInfoModal] = useState(false);
  const [editDayModal, setEditDayModal] = useState(false);
  const [editingDate, setEditingDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [showTriggerSelection, setShowTriggerSelection] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);

  // UPDATED: Enhanced trigger options with all unique icons - Added alcohol/substances and sleep deprivation
  const triggerOptions = [
    { id: 'lustful_thoughts', label: 'Lustful Thoughts', icon: FaBrain },
    { id: 'stress', label: 'Stress', icon: FaExclamationTriangle },
    { id: 'boredom', label: 'Boredom', icon: FaClock },
    { id: 'social_media', label: 'Social Media', icon: FaLaptop },
    { id: 'loneliness', label: 'Loneliness', icon: FaFrown },
    { id: 'relationship', label: 'Relationship Issues', icon: FaHeart },
    { id: 'home_alone', label: 'Being Home Alone', icon: FaHome },
    { id: 'explicit_content', label: 'Explicit Content', icon: FaTheaterMasks },
    { id: 'alcohol_substances', label: 'Alcohol/Substances', icon: FaWineBottle },
    { id: 'sleep_deprivation', label: 'Sleep Deprivation', icon: FaBed }
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

  // FIXED: Helper function to determine day status - CORRECT logic order and precise checks
  const getDayStatus = (day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    day.setHours(0, 0, 0, 0);
    
    // If day is in the future, return null
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
      // Example: If relapse on Day 5, then Days 1,2,3,4 = former streak (blue)
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

  // Render clean day cell without moon phases
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
        
        {/* Clean day indicators */}
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

  // UPDATED: Clean week view without moon phases
  const renderWeekView = () => {
    const { weekStart } = getWeekRange(currentDate);
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayStatus = getDayStatus(day);
      const dayBenefits = getDayBenefits(day);
      const dayTracking = getDayTracking(day);
      
      days.push(
        <div key={i} className="week-day-cell" onClick={() => showDayDetails(day)}>
          <div className="week-day-header">
            <div className="week-day-name">{format(day, 'EEE')}</div>
            <div className={`week-day-number ${isSameDay(day, new Date()) ? 'today' : ''}`}>
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
              </div>
            )}
          </div>
          
          {dayBenefits && isPremium && (
            <div className="week-benefits">
              <div className="week-benefit-item">
                <span className="benefit-mini-label">Energy</span>
                <div className="benefit-mini-slider">
                  <div 
                    className="benefit-mini-fill" 
                    style={{ width: `${dayBenefits.energy * 10}%` }}
                  ></div>
                </div>
                <span className="benefit-mini-value">{dayBenefits.energy}/10</span>
              </div>
              <div className="week-benefit-item">
                <span className="benefit-mini-label">Focus</span>
                <div className="benefit-mini-slider">
                  <div 
                    className="benefit-mini-fill" 
                    style={{ width: `${dayBenefits.focus * 10}%` }}
                  ></div>
                </div>
                <span className="benefit-mini-value">{dayBenefits.focus}/10</span>
              </div>
              <div className="week-benefit-item">
                <span className="benefit-mini-label">Sleep</span>
                <div className="benefit-mini-slider">
                  <div 
                    className="benefit-mini-fill" 
                    style={{ width: `${(dayBenefits.sleep || dayBenefits.confidence) * 10}%` }}
                  ></div>
                </div>
                <span className="benefit-mini-value">{dayBenefits.sleep || dayBenefits.confidence}/10</span>
              </div>
            </div>
          )}
          
          <div className="week-tracking-indicators">
            {dayTracking.hasJournal && <FaInfoCircle className="week-journal-icon" />}
            {dayStatus?.trigger && renderTriggerIcon(dayStatus.trigger)}
          </div>
        </div>
      );
    }
    
    return <div className="week-view-grid">{days}</div>;
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
    
    rows.push(<div className="calendar-row header-row" key="header">{daysHeader}</div>);
    
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

  // Format period header text
  const getPeriodHeaderText = () => {
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

  return (
    <div className="calendar-container">
      {/* UPDATED: Clean Header without moon phase features */}
      <div className="integrated-calendar-header">
        <div className="header-title-section">
          <h2>Streak Calendar</h2>
          <p className="header-subtitle">Visualize your journey and track your progress</p>
        </div>
        
        <div className="header-navigation-section">
          {/* View Mode Toggle Pills */}
          <div className="navigation-pill-container">
            <button 
              className={`navigation-section-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
            <button 
              className={`navigation-section-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      <div className="calendar-main-section">
        {/* Period Navigation */}
        <div className="calendar-period-navigation">
          <button className="period-nav-btn" onClick={prevPeriod}>
            ←
          </button>
          <h3>{getPeriodHeaderText()}</h3>
          <button className="period-nav-btn" onClick={nextPeriod}>
            →
          </button>
        </div>

        {/* UPDATED: Calendar legend without moon phases */}
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

        {/* Calendar Instructions */}
        <div className="calendar-instructions">
          Click on any day to view details and edit status. Different colors show your streak history and journey milestones.
        </div>

        {/* Calendar Display */}
        <div className="calendar-display">
          {viewMode === 'month' ? (
            <div className="calendar-grid">
              {renderCalendarDays()}
            </div>
          ) : (
            renderWeekView()
          )}
        </div>
      </div>

      {/* Day Info Modal with moon phase information */}
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
            
            {/* Clean Day Info Modal without moon phase information */}
            
            {/* Day Status */}
            <div className="day-status-info">
              {(() => {
                const dayStatus = getDayStatus(selectedDate);
                
                if (dayStatus) {
                  return (
                    <div className={`status-badge ${dayStatus.type}`}>
                      {dayStatus.type === 'current-streak' && (
                        <>
                          <FaCheckCircle />
                          <span>Current Streak Day</span>
                        </>
                      )}
                      {dayStatus.type === 'former-streak' && (
                        <>
                          <FaCheckCircle />
                          <span>Former Streak Day</span>
                        </>
                      )}
                      {dayStatus.type === 'relapse' && (
                        <>
                          <FaTimesCircle />
                          <span>Relapse Day</span>
                        </>
                      )}
                      {dayStatus.type === 'wet-dream' && (
                        <>
                          <FaMoon />
                          <span>Wet Dream</span>
                        </>
                      )}
                    </div>
                  );
                }
                
                return (
                  <div className="status-badge">
                    <span>No specific status</span>
                  </div>
                );
              })()}

              {/* Trigger Info */}
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

            {/* Journey Day Counter */}
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

      {/* Edit Day Modal */}
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

export default Calendar;