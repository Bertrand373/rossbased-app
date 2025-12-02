// components/Calendar/Calendar.js - TITANTRACK
// Clean, restrained - month/year is the visual anchor
import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, 
  isSameDay, subMonths, addMonths, differenceInDays, isAfter,
  startOfWeek as getWeekStart, addWeeks, subWeeks } from 'date-fns';
import toast from 'react-hot-toast';
import './CalendarBase.css';
import './CalendarModals.css';

import { FaExclamationTriangle, FaFrown, 
  FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaTheaterMasks,
  FaWineBottle, FaBed, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const Calendar = ({ userData, isPremium, updateUserData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayInfoModal, setDayInfoModal] = useState(false);
  const [editDayModal, setEditDayModal] = useState(false);
  const [viewMode, setViewMode] = useState('month');
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [showTriggerSelection, setShowTriggerSelection] = useState(false);

  // Journal states
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const triggerOptions = [
    { id: 'lustful_thoughts', label: 'Lustful Thoughts', icon: FaBrain },
    { id: 'stress', label: 'Stress', icon: FaExclamationTriangle },
    { id: 'boredom', label: 'Boredom', icon: FaClock },
    { id: 'social_media', label: 'Social Media', icon: FaLaptop },
    { id: 'loneliness', label: 'Loneliness', icon: FaFrown },
    { id: 'relationship', label: 'Relationship', icon: FaHeart },
    { id: 'home_alone', label: 'Home Alone', icon: FaHome },
    { id: 'explicit_content', label: 'Explicit Content', icon: FaTheaterMasks },
    { id: 'alcohol_substances', label: 'Substances', icon: FaWineBottle },
    { id: 'sleep_deprivation', label: 'Sleep Deprived', icon: FaBed }
  ];

  // Navigation
  const prevPeriod = () => {
    setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
  };

  const nextPeriod = () => {
    setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
  };

  const getWeekRange = (date) => {
    const weekStart = getWeekStart(date);
    const weekEnd = addDays(weekStart, 6);
    return { weekStart, weekEnd };
  };

  // Status helpers
  const getDayStatus = (day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDay = new Date(day);
    checkDay.setHours(0, 0, 0, 0);
    
    if (isAfter(checkDay, today)) return null;
    
    const relapseDay = userData.streakHistory?.find(streak => 
      streak.end && streak.reason === 'relapse' && isSameDay(new Date(streak.end), checkDay)
    );
    if (relapseDay) return { type: 'relapse', trigger: relapseDay.trigger };
    
    const formerStreak = userData.streakHistory?.find(streak => {
      if (!streak.start || !streak.end) return false;
      const streakStart = new Date(streak.start);
      const streakEnd = new Date(streak.end);
      streakStart.setHours(0, 0, 0, 0);
      streakEnd.setHours(0, 0, 0, 0);
      return checkDay >= streakStart && checkDay < streakEnd;
    });
    if (formerStreak) return { type: 'former-streak' };
    
    const currentStreak = userData.streakHistory?.find(streak => streak.start && !streak.end);
    if (currentStreak) {
      const streakStart = new Date(currentStreak.start);
      streakStart.setHours(0, 0, 0, 0);
      if (checkDay >= streakStart && checkDay <= today) return { type: 'current-streak' };
    }
    
    return null;
  };

  const getDayTracking = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const hasBenefits = userData.benefitTracking?.some(benefit => 
      format(new Date(benefit.date), 'yyyy-MM-dd') === dayStr
    );
    const hasJournal = userData.notes && userData.notes[dayStr];
    return { hasBenefits, hasJournal };
  };

  const getDayCount = (day) => {
    const dayStatus = getDayStatus(day);
    if (!dayStatus || (dayStatus.type !== 'current-streak' && dayStatus.type !== 'former-streak')) {
      return null;
    }
    
    if (dayStatus.type === 'current-streak') {
      const currentStreak = userData.streakHistory?.find(streak => streak.start && !streak.end);
      if (currentStreak) {
        const streakStart = new Date(currentStreak.start);
        const dayNumber = differenceInDays(day, streakStart) + 1;
        return { dayNumber: dayNumber > 0 ? dayNumber : 0, totalDays: null };
      }
    }
    
    if (dayStatus.type === 'former-streak') {
      const formerStreak = userData.streakHistory?.find(streak => {
        if (!streak.start || !streak.end) return false;
        const streakStart = new Date(streak.start);
        const streakEnd = new Date(streak.end);
        return day >= streakStart && day < streakEnd;
      });
      if (formerStreak) {
        const streakStart = new Date(formerStreak.start);
        const dayNumber = differenceInDays(day, streakStart) + 1;
        return { dayNumber: dayNumber > 0 ? dayNumber : 0, totalDays: formerStreak.days };
      }
    }
    return null;
  };

  const hasWetDream = (day) => {
    const wetDreamDates = userData.streakHistory?.reduce((dates, streak) => {
      if (streak.start && streak.days > 7) {
        const wetDreamDay = new Date(streak.start);
        wetDreamDay.setDate(wetDreamDay.getDate() + 5);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (wetDreamDay <= today && isSameDay(wetDreamDay, day)) {
          dates.push(wetDreamDay);
        }
      }
      return dates;
    }, []) || [];
    return wetDreamDates.length > 0;
  };

  const getDayBenefits = (day) => {
    if (!userData.benefitTracking) return null;
    const benefits = userData.benefitTracking.find(benefit => 
      isSameDay(new Date(benefit.date), day)
    );
    if (benefits && !benefits.sleep && benefits.attraction) {
      return { ...benefits, sleep: benefits.attraction };
    }
    return benefits;
  };

  // Modal handlers
  const openDayInfo = (day) => {
    setSelectedDate(day);
    const dayStr = format(day, 'yyyy-MM-dd');
    const existingNote = userData.notes && userData.notes[dayStr];
    setNoteText(existingNote || '');
    setIsEditingNote(false);
    setDayInfoModal(true);
  };

  const closeDayInfo = () => {
    setDayInfoModal(false);
    setIsEditingNote(false);
  };

  const showEditFromInfo = () => {
    setDayInfoModal(false);
    setEditDayModal(true);
    setShowTriggerSelection(false);
    setSelectedTrigger('');
  };

  const closeEditModal = () => {
    setEditDayModal(false);
    setShowTriggerSelection(false);
    setSelectedTrigger('');
  };

  const backToDayInfo = () => {
    setEditDayModal(false);
    setDayInfoModal(true);
  };

  // Journal handlers
  const startEditingNote = () => setIsEditingNote(true);

  const saveNote = () => {
    if (!selectedDate || !updateUserData) return;
    const dayStr = format(selectedDate, 'yyyy-MM-dd');
    const updatedNotes = { ...userData.notes };
    if (noteText.trim()) {
      updatedNotes[dayStr] = noteText.trim();
    } else {
      delete updatedNotes[dayStr];
    }
    updateUserData({ notes: updatedNotes });
    setIsEditingNote(false);
  };

  const cancelEditingNote = () => {
    const dayStr = format(selectedDate, 'yyyy-MM-dd');
    const existingNote = userData.notes && userData.notes[dayStr];
    setNoteText(existingNote || '');
    setIsEditingNote(false);
  };

  // Status update handlers
  const handleStatusClick = (status) => {
    if (status === 'relapse') {
      setShowTriggerSelection(true);
    } else if (status === 'current-streak') {
      closeEditModal();
    } else if (status === 'wet-dream') {
      updateUserData({ wetDreamCount: (userData.wetDreamCount || 0) + 1 });
      closeEditModal();
    }
  };

  const handleTriggerSelection = () => {
    if (!selectedDate || !updateUserData) return;
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let updatedStreakHistory = [...(userData.streakHistory || [])];
    const activeStreakIndex = updatedStreakHistory.findIndex(streak => !streak.end);
    
    if (activeStreakIndex !== -1) {
      const currentStreak = updatedStreakHistory[activeStreakIndex];
      const streakDays = differenceInDays(selectedDate, new Date(currentStreak.start)) + 1;
      updatedStreakHistory[activeStreakIndex] = {
        ...currentStreak,
        end: selectedDate,
        days: streakDays > 0 ? streakDays : 0,
        reason: 'relapse',
        trigger: selectedTrigger || null
      };
    }
    
    const newStreakStart = addDays(selectedDate, 1);
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
    
    updateUserData({
      streakHistory: updatedStreakHistory,
      relapseCount: (userData.relapseCount || 0) + 1,
      currentStreak: Math.max(0, newCurrentStreak),
      startDate: newStreakStart
    });
    
    toast.success('Relapse logged');
    closeEditModal();
  };

  // Get period text
  const getPeriodText = () => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy');
    }
    const { weekStart, weekEnd } = getWeekRange(currentDate);
    if (isSameMonth(weekStart, weekEnd)) {
      return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'd, yyyy')}`;
    }
    return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
  };

  // Render month view
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const rows = [];
    
    // Header row
    let day = startDate;
    const headerDays = [];
    for (let i = 0; i < 7; i++) {
      headerDays.push(
        <div key={`header-${i}`} className="day-header">
          {format(day, 'EEE')}
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div key="header" className="calendar-row header-row">
        {headerDays}
      </div>
    );
    
    // Day cells
    day = startDate;
    while (day <= endDate) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const isToday = isSameDay(day, new Date());
        const isCurrentMonth = isSameMonth(day, monthStart);
        const dayStatus = getDayStatus(currentDay);
        const dayTracking = getDayTracking(currentDay);
        const wetDream = hasWetDream(currentDay);
        
        const cellClasses = [
          'day-cell',
          isToday ? 'today' : '',
          !isCurrentMonth ? 'other-month' : '',
          dayStatus?.type || '',
          wetDream ? 'wet-dream' : ''
        ].filter(Boolean).join(' ');
        
        days.push(
          <div key={day.toString()} className={cellClasses} onClick={() => openDayInfo(currentDay)}>
            <span className="day-number">{format(day, 'd')}</span>
            {(dayTracking.hasBenefits || dayTracking.hasJournal) && (
              <span className="day-has-data-dot"></span>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="calendar-row">
          {days}
        </div>
      );
    }
    
    return <div className="calendar-display">{rows}</div>;
  };

  // Render week view
  const renderWeekView = () => {
    const { weekStart } = getWeekRange(currentDate);
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const isToday = isSameDay(day, new Date());
      const dayStatus = getDayStatus(day);
      const dayBenefits = getDayBenefits(day);
      const dayTracking = getDayTracking(day);
      const wetDream = hasWetDream(day);
      
      const cellClasses = [
        'week-day-cell',
        isToday ? 'today-card' : '',
        dayStatus?.type || '',
        wetDream ? 'wet-dream' : ''
      ].filter(Boolean).join(' ');
      
      days.push(
        <div key={i} className={cellClasses} onClick={() => openDayInfo(day)}>
          <div className="week-day-header">
            <span className="week-day-name">{format(day, 'EEE')}</span>
            <span className={`week-day-number ${isToday ? 'today' : ''}`}>{format(day, 'd')}</span>
          </div>
          
          {dayBenefits && isPremium ? (
            <div className="week-benefits-prominent">
              <div className="week-benefit-item">
                <span className="week-benefit-label-top">Energy</span>
                <div className="week-benefit-bar">
                  <div className="week-benefit-fill" style={{ width: `${dayBenefits.energy * 10}%` }} />
                </div>
              </div>
              <div className="week-benefit-item">
                <span className="week-benefit-label-top">Focus</span>
                <div className="week-benefit-bar">
                  <div className="week-benefit-fill" style={{ width: `${dayBenefits.focus * 10}%` }} />
                </div>
              </div>
              <div className="week-benefit-item">
                <span className="week-benefit-label-top">Confidence</span>
                <div className="week-benefit-bar">
                  <div className="week-benefit-fill" style={{ width: `${dayBenefits.confidence * 10}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="week-benefits-prominent">
              <span className="week-no-data">No data</span>
            </div>
          )}
          
          <div className="week-day-indicators">
            {/* Single white dot if has data */}
            {(dayBenefits || dayTracking.hasJournal) && (
              <span className="week-has-data-dot"></span>
            )}
            {/* Status indicator on right */}
            <div className="week-status-indicator">
              {dayStatus?.type === 'current-streak' && <span className="week-status-dot current-streak"></span>}
              {dayStatus?.type === 'former-streak' && <span className="week-status-dot former-streak"></span>}
              {dayStatus?.type === 'relapse' && <span className="week-status-dot relapse"></span>}
              {wetDream && <span className="week-status-dot wet-dream"></span>}
            </div>
          </div>
        </div>
      );
    }
    
    return <div className="week-view-grid">{days}</div>;
  };

  return (
    <div className="calendar-container">
      {/* Header Section - Text toggle + Period navigation */}
      <div className="calendar-header-section">
        {/* Text-only toggle - maximum restraint */}
        <div className="calendar-view-toggle">
          <button 
            className={`calendar-toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Month
          </button>
          <button 
            className={`calendar-toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            Week
          </button>
        </div>
        
        {/* Period Navigation - This is the visual anchor */}
        <div className="calendar-period-navigation">
          <button className="period-nav-btn" onClick={prevPeriod}>
            <FaChevronLeft />
          </button>
          <h3>{getPeriodText()}</h3>
          <button className="period-nav-btn" onClick={nextPeriod}>
            <FaChevronRight />
          </button>
        </div>
      </div>

      {/* Legend - Dots */}
      <div className="calendar-legend-compact">
        <div className="compact-legend-item">
          <span className="legend-dot tracked"></span>
          <span>Tracked</span>
        </div>
        <div className="compact-legend-item">
          <span className="legend-dot current-streak"></span>
          <span>Current</span>
        </div>
        <div className="compact-legend-item">
          <span className="legend-dot former-streak"></span>
          <span>Former</span>
        </div>
        <div className="compact-legend-item">
          <span className="legend-dot relapse"></span>
          <span>Relapse</span>
        </div>
        <div className="compact-legend-item">
          <span className="legend-dot wet-dream"></span>
          <span>Wet Dream</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-main-section">
        {viewMode === 'month' ? renderMonthView() : renderWeekView()}
      </div>

      {/* ================================================================
          DAY INFO MODAL
          ================================================================ */}
      {dayInfoModal && selectedDate && (
        <div className="calendar-overlay" onClick={closeDayInfo}>
          <div className="calendar-modal calendar-day-info" onClick={e => e.stopPropagation()}>
            
            <h3>{format(selectedDate, 'EEEE, MMMM d')}</h3>
            
            {/* Status Badge */}
            <div className="calendar-status-info">
              {(() => {
                const dayStatus = getDayStatus(selectedDate);
                const dayCount = getDayCount(selectedDate);
                const wetDream = hasWetDream(selectedDate);
                
                if (dayStatus?.type === 'current-streak') {
                  return (
                    <div className="calendar-status-badge current-streak">
                      <span>Current Streak</span>
                      {dayCount && <span className="day-count">Day {dayCount.dayNumber}</span>}
                    </div>
                  );
                }
                if (dayStatus?.type === 'former-streak') {
                  return (
                    <div className="calendar-status-badge former-streak">
                      <span>Former Streak</span>
                      {dayCount && <span className="day-count">Day {dayCount.dayNumber}{dayCount.totalDays ? `/${dayCount.totalDays}` : ''}</span>}
                    </div>
                  );
                }
                if (dayStatus?.type === 'relapse') {
                  return (
                    <div className="calendar-status-badge relapse">
                      <span>Relapse</span>
                    </div>
                  );
                }
                if (wetDream) {
                  return (
                    <div className="calendar-status-badge wet-dream">
                      <span>Wet Dream</span>
                    </div>
                  );
                }
                return (
                  <div className="calendar-status-badge no-data">
                    <span>No status recorded</span>
                  </div>
                );
              })()}
            </div>

            {/* Benefits Section */}
            {(() => {
              const dayBenefits = getDayBenefits(selectedDate);
              if (!dayBenefits) return null;
              
              const benefitItems = [
                { label: 'Energy', value: dayBenefits.energy },
                { label: 'Focus', value: dayBenefits.focus },
                { label: 'Confidence', value: dayBenefits.confidence },
                { label: 'Aura', value: dayBenefits.aura || 5 },
                { label: 'Sleep', value: dayBenefits.sleep || dayBenefits.attraction || 5 },
                { label: 'Workout', value: dayBenefits.workout || dayBenefits.gymPerformance || 5 }
              ];
              
              return (
                <div className="calendar-benefits-section">
                  <h4>Benefits</h4>
                  <div className="calendar-benefits-grid">
                    {benefitItems.map(item => (
                      <div key={item.label} className="calendar-benefit-row">
                        <span className="calendar-benefit-label">{item.label}</span>
                        <div className="calendar-benefit-value">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Journal Section */}
            <div className="calendar-journal-section">
              <div className="calendar-journal-header">
                <h4>Journal</h4>
                {!isEditingNote && noteText && (
                  <button className="calendar-action-btn" onClick={startEditingNote}>
                    Edit
                  </button>
                )}
              </div>
              
              {isEditingNote ? (
                <>
                  <textarea
                    className="calendar-journal-textarea"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="What's on your mind?"
                    rows="4"
                  />
                  <div className="calendar-journal-actions">
                    <button className="calendar-btn-primary" onClick={saveNote}>
                      Save
                    </button>
                    <button className="calendar-btn-ghost" onClick={cancelEditingNote}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : noteText ? (
                <div className="calendar-journal-content">{noteText}</div>
              ) : (
                <div className="calendar-journal-empty">
                  <button className="calendar-action-btn" onClick={startEditingNote}>
                    Add journal entry
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="calendar-actions">
              <button className="calendar-btn-primary" onClick={showEditFromInfo}>
                Edit Day
              </button>
              <button className="calendar-btn-ghost" onClick={closeDayInfo}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          EDIT DAY MODAL
          ================================================================ */}
      {editDayModal && selectedDate && (
        <div className="calendar-overlay" onClick={closeEditModal}>
          <div className="calendar-modal calendar-edit-day" onClick={e => e.stopPropagation()}>
            
            <h3>Edit {format(selectedDate, 'MMM d, yyyy')}</h3>
            <p>What happened on this day?</p>

            {!showTriggerSelection ? (
              <div className="calendar-status-options">
                <button className="calendar-status-option" onClick={() => handleStatusClick('current-streak')}>
                  Mark as Streak Day
                </button>
                <button className="calendar-status-option" onClick={() => handleStatusClick('wet-dream')}>
                  Log Wet Dream
                </button>
                <button className="calendar-status-option" onClick={() => handleStatusClick('relapse')}>
                  Log Relapse
                </button>
              </div>
            ) : (
              <div className="calendar-triggers-section">
                <h4>What triggered this?</h4>
                <div className="calendar-triggers-grid">
                  {triggerOptions.map(trigger => (
                    <button
                      key={trigger.id}
                      className={`calendar-trigger-pill ${selectedTrigger === trigger.id ? 'selected' : ''}`}
                      onClick={() => setSelectedTrigger(trigger.id)}
                    >
                      <trigger.icon />
                      <span>{trigger.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="calendar-actions">
              {showTriggerSelection ? (
                <button 
                  className="calendar-btn-primary"
                  onClick={handleTriggerSelection}
                  disabled={!selectedTrigger}
                >
                  Confirm Relapse
                </button>
              ) : null}
              <button className="calendar-btn-ghost" onClick={backToDayInfo}>
                Back
              </button>
              <button className="calendar-btn-ghost" onClick={closeEditModal}>
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