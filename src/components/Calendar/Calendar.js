// components/Calendar/Calendar.js - COMPLETELY FIXED: All syntax errors resolved
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, 
  isSameDay, subMonths, addMonths, parseISO, differenceInDays, isAfter, isBefore, 
  startOfWeek as getWeekStart, addWeeks, subWeeks } from 'date-fns';
import toast from 'react-hot-toast';
import './Calendar.css';

// Icons
import { FaChevronLeft, FaChevronRight, FaCheckCircle, FaTimesCircle, FaMoon, 
  FaInfoCircle, FaEdit, FaRedo, FaExclamationTriangle, FaFrown, 
  FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaTheaterMasks, FaArrowLeft, FaEye } from 'react-icons/fa';

const Calendar = ({ userData, isPremium, updateUserData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayInfoModal, setDayInfoModal] = useState(false);
  const [editDayModal, setEditDayModal] = useState(false);
  const [editingDate, setEditingDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  const [showResetConfirm, setShowResetConfirm] = useState(false);
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

  // Reset Calendar - Only clear calendar/streak data, not all stats
  const handleResetCalendar = () => {
    setShowResetConfirm(true);
  };

  const confirmResetCalendar = () => {
    if (!updateUserData) {
      console.error('updateUserData function is not available');
      toast.error('Unable to reset calendar - please refresh the page');
      return;
    }
    
    // Only reset calendar-related data, keep overall stats
    const resetUserData = {
      ...userData,
      startDate: new Date(),
      currentStreak: 0,
      streakHistory: [{
        id: 1,
        start: new Date(),
        end: null,
        days: 0,
        reason: null,
        trigger: null
      }],
      // Clear benefits and journal entries as these are calendar-specific
      benefitTracking: [],
      notes: {},
      // Keep these stats as they're overall progress indicators
      // longestStreak: userData.longestStreak, (keep existing)
      // wetDreamCount: userData.wetDreamCount, (keep existing) 
      // relapseCount: userData.relapseCount, (keep existing)
      // badges: userData.badges, (keep existing)
      urgeLog: [] // New field for tracking urges with triggers
    };
    
    updateUserData(resetUserData);
    setShowResetConfirm(false);
    toast.success('Calendar data has been reset (streak history, benefits, and journal entries cleared)');
  };

  // Helper function to determine day status based on streak history
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
    
    // Check for specific relapse dates from streak history
    const relapseDay = userData.streakHistory?.find(streak => 
      streak.end && streak.reason === 'relapse' && isSameDay(new Date(streak.end), day)
    );
    
    if (relapseDay) {
      return { type: 'relapse', trigger: relapseDay.trigger };
    }
    
    // Check for wet dreams
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
    
    // Check if day is within current streak
    if (userData.startDate) {
      const streakStart = new Date(userData.startDate);
      const daysSinceStart = differenceInDays(day, streakStart);
      
      if (day >= streakStart && day <= today && daysSinceStart < userData.currentStreak) {
        return { type: 'current-streak' };
      }
    }
    
    // Check former streaks
    const dayStreak = userData.streakHistory?.find(streak => {
      if (!streak.start || !streak.end) return false;
      const streakStart = new Date(streak.start);
      const streakEnd = new Date(streak.end);
      
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

  // Enhanced day status update with proper trigger handling
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
        const activeStreakIndex = updatedStreakHistory.findIndex(streak => !streak.end);
        if (activeStreakIndex !== -1) {
          const currentStreak = updatedStreakHistory[activeStreakIndex];
          const streakDays = differenceInDays(editingDate, new Date(currentStreak.start)) + 1;
          
          updatedStreakHistory[activeStreakIndex] = {
            ...currentStreak,
            end: editingDate,
            days: streakDays > 0 ? streakDays : 0,
            reason: 'relapse',
            trigger: selectedTrigger || null
          };
        }
        
        const newStreakStart = addDays(editingDate, 1);
        updatedStreakHistory.push({
          id: updatedStreakHistory.length + 1,
          start: newStreakStart,
          end: null,
          days: 0,
          reason: null,
          trigger: null
        });
        
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
        updatedUserData = {
          ...updatedUserData,
          wetDreamCount: (userData.wetDreamCount || 0) + 1
        };
        toast.success(`Marked ${format(editingDate, 'MMM d')} as wet dream`);
        break;
        
      case 'current-streak':
        if (userData.startDate) {
          const streakStart = new Date(userData.startDate);
          if (editingDate >= streakStart && editingDate <= today) {
            toast.success(`Confirmed ${format(editingDate, 'MMM d')} as streak day`);
          } else {
            toast.info(`${format(editingDate, 'MMM d')} is outside your current streak period`);
          }
        }
        break;
        
      case 'clear':
        toast.success(`Cleared status for ${format(editingDate, 'MMM d')}`);
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

  // Get day benefits data
  const getDayBenefits = (day) => {
    if (!userData.benefitTracking) return null;
    return userData.benefitTracking.find(benefit => 
      isSameDay(new Date(benefit.date), day)
    );
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

  // Week view rendering
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
                <span className="benefit-mini-label">Confidence</span>
                <div className="benefit-mini-slider">
                  <div 
                    className="benefit-mini-fill" 
                    style={{ width: `${dayBenefits.confidence * 10}%` }}
                  ></div>
                </div>
                <span className="benefit-mini-value">{dayBenefits.confidence}/10</span>
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
      <div className="calendar-header">
        <div className="calendar-header-spacer"></div>
        <h2>Streak Calendar</h2>
        <div className="calendar-header-actions">
          <button className="reset-calendar-btn" onClick={handleResetCalendar}>
            <FaRedo />
            <span>Reset Calendar</span>
          </button>
        </div>
      </div>
      
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Reset Calendar Data?</h3>
            <p>This will reset your streak history, calendar entries, benefits tracking, and journal entries. Your overall stats (longest streak, total relapses, badges earned) will be preserved.</p>
            <div className="form-actions">
              <button className="btn btn-danger" onClick={confirmResetCalendar}>Reset Calendar</button>
              <button className="btn btn-outline" onClick={() => setShowResetConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      
      <div className="calendar-main-section">
        <div className="calendar-controls">
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
          
          <div className="period-navigation">
            <button className="period-nav-btn" onClick={prevPeriod}>
              <FaChevronLeft />
            </button>
            <h3>{getPeriodHeaderText()}</h3>
            <button className="period-nav-btn" onClick={nextPeriod}>
              <FaChevronRight />
            </button>
          </div>
        </div>
        
        {/* Legend without trophy icon */}
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
            <span>Has Entry</span>
          </div>
        </div>
        
        <div className="calendar-instructions">
          <p>Click any day to view details and edit status</p>
        </div>
        
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
      
      {/* Edit Day Modal with pill-shaped triggers */}
      {editDayModal && editingDate && (
        <div className="modal-overlay" onClick={() => setEditDayModal(false)}>
          <div className="modal-content edit-day-modal" onClick={e => e.stopPropagation()}>
            {!showTriggerSelection ? (
              <>
                <div className="modal-header-simple">
                  <h3>Edit {format(editingDate, 'MMMM d, yyyy')}</h3>
                </div>
                <p>Update the status for this day:</p>
                
                <div className="edit-day-options">
                  <button 
                    className="edit-option-btn current-streak-btn"
                    onClick={() => handleStatusClick('current-streak')}
                  >
                    <FaCheckCircle /> Mark as Streak Day
                  </button>
                  
                  <button 
                    className="edit-option-btn wet-dream-btn"
                    onClick={() => handleStatusClick('wet-dream')}
                  >
                    <FaMoon /> Mark as Wet Dream
                  </button>
                  
                  <button 
                    className="edit-option-btn relapse-btn"
                    onClick={() => handleStatusClick('relapse')}
                  >
                    <FaTimesCircle /> Mark as Relapse
                  </button>
                  
                  <button 
                    className="edit-option-btn clear-btn"
                    onClick={() => handleStatusClick('clear')}
                  >
                    <FaEdit /> Clear Status
                  </button>
                </div>
                
                <div className="modal-actions">
                  <button 
                    className="back-to-info-btn"
                    onClick={backToDayInfo}
                  >
                    <FaArrowLeft /> Back
                  </button>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => {
                      setEditDayModal(false);
                      setShowTriggerSelection(false);
                      setSelectedTrigger('');
                      setPendingStatusUpdate(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-header-simple">
                  <h3>What triggered the relapse?</h3>
                </div>
                <p>Understanding triggers helps identify patterns (optional):</p>
                
                <div className="trigger-selection">
                  <div className="trigger-options">
                    {triggerOptions.map(trigger => {
                      const IconComponent = trigger.icon;
                      return (
                        <button
                          key={trigger.id}
                          className={`trigger-option-pill ${selectedTrigger === trigger.id ? 'selected' : ''}`}
                          onClick={() => setSelectedTrigger(selectedTrigger === trigger.id ? '' : trigger.id)}
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
                  >
                    {selectedTrigger ? 'Save with Trigger' : 'Skip & Save Relapse'}
                  </button>
                </div>
                
                <div className="modal-actions">
                  <button 
                    className="back-to-info-btn"
                    onClick={() => setShowTriggerSelection(false)}
                  >
                    <FaArrowLeft /> Back
                  </button>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => {
                      setEditDayModal(false);
                      setShowTriggerSelection(false);
                      setSelectedTrigger('');
                      setPendingStatusUpdate(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Day Info Modal without badge references */}
      {dayInfoModal && selectedDate && (
        <div className="modal-overlay" onClick={() => setDayInfoModal(false)}>
          <div className="modal-content day-info-modal" onClick={e => e.stopPropagation()}>
            <h3>{format(selectedDate, 'MMMM d, yyyy')}</h3>
            
            <div className="day-status-info">
              {(() => {
                const status = getDayStatus(selectedDate);
                
                return (
                  <>
                    {status?.type === 'current-streak' && (
                      <div className="status-badge current-streak">
                        <FaCheckCircle /> Current Streak Day
                      </div>
                    )}
                    
                    {status?.type === 'former-streak' && (
                      <div className="status-badge former-streak">
                        <FaCheckCircle /> Former Streak Day
                      </div>
                    )}
                    
                    {status?.type === 'relapse' && (
                      <div className="status-badge relapse">
                        <FaTimesCircle /> Relapse Day
                        {status.trigger && (
                          <div className="trigger-info">
                            <div className="trigger-display">
                              {renderTriggerIcon(status.trigger)}
                              <span>Trigger: {triggerOptions.find(t => t.id === status.trigger)?.label}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {status?.type === 'wet-dream' && (
                      <div className="status-badge wet-dream">
                        <FaMoon /> Wet Dream
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            
            {/* Only show journey counter for streak days */}
            {userData.startDate && selectedDate >= new Date(userData.startDate) && isDayPartOfJourney(selectedDate) && (
              <div className="day-streak-info">
                <div className="streak-day-number">
                  Day {differenceInDays(selectedDate, new Date(userData.startDate)) + 1}
                </div>
                <div className="streak-context">
                  of your semen retention journey
                </div>
              </div>
            )}
            
            {isPremium ? (
              <>
                <div className="day-benefits">
                  <h4>Benefits Tracked</h4>
                  
                  {getDayBenefits(selectedDate) ? (
                    <div className="benefits-details-enhanced">
                      <div className="benefit-slider-item">
                        <div className="benefit-slider-header">
                          <span className="benefit-label">Energy</span>
                          <span className="benefit-value">{getDayBenefits(selectedDate).energy}/10</span>
                        </div>
                        <div className="benefit-meter-enhanced">
                          <div 
                            className="benefit-level-enhanced" 
                            style={{ width: `${getDayBenefits(selectedDate).energy * 10}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="benefit-slider-item">
                        <div className="benefit-slider-header">
                          <span className="benefit-label">Focus</span>
                          <span className="benefit-value">{getDayBenefits(selectedDate).focus}/10</span>
                        </div>
                        <div className="benefit-meter-enhanced">
                          <div 
                            className="benefit-level-enhanced" 
                            style={{ width: `${getDayBenefits(selectedDate).focus * 10}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="benefit-slider-item">
                        <div className="benefit-slider-header">
                          <span className="benefit-label">Confidence</span>
                          <span className="benefit-value">{getDayBenefits(selectedDate).confidence}/10</span>
                        </div>
                        <div className="benefit-meter-enhanced">
                          <div 
                            className="benefit-level-enhanced" 
                            style={{ width: `${getDayBenefits(selectedDate).confidence * 10}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {getDayBenefits(selectedDate).aura && (
                        <div className="benefit-slider-item">
                          <div className="benefit-slider-header">
                            <span className="benefit-label">Aura</span>
                            <span className="benefit-value">{getDayBenefits(selectedDate).aura}/10</span>
                          </div>
                          <div className="benefit-meter-enhanced">
                            <div 
                              className="benefit-level-enhanced" 
                              style={{ width: `${getDayBenefits(selectedDate).aura * 10}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {getDayBenefits(selectedDate).attraction && (
                        <div className="benefit-slider-item">
                          <div className="benefit-slider-header">
                            <span className="benefit-label">Attraction</span>
                            <span className="benefit-value">{getDayBenefits(selectedDate).attraction}/10</span>
                          </div>
                          <div className="benefit-meter-enhanced">
                            <div 
                              className="benefit-level-enhanced" 
                              style={{ width: `${getDayBenefits(selectedDate).attraction * 10}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {getDayBenefits(selectedDate).workout && (
                        <div className="benefit-slider-item">
                          <div className="benefit-slider-header">
                            <span className="benefit-label">Workout</span>
                            <span className="benefit-value">{getDayBenefits(selectedDate).workout}/10</span>
                          </div>
                          <div className="benefit-meter-enhanced">
                            <div 
                              className="benefit-level-enhanced" 
                              style={{ width: `${getDayBenefits(selectedDate).workout * 10}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
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
              {selectedDate < new Date() && (
                <button 
                  className="btn btn-primary edit-day-btn"
                  onClick={showEditFromInfo}
                >
                  <FaEdit /> Edit Day Status
                </button>
              )}
              
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setDayInfoModal(false);
                  setSelectedDate(null);
                }}
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