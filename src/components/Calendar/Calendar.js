// components/Calendar/Calendar.js - TITANTRACK ELITE
// Two CSS files: CalendarBase.css + CalendarModals.css
import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, 
  isSameDay, subMonths, addMonths, differenceInDays, isAfter,
  startOfWeek as getWeekStart, addWeeks, subWeeks } from 'date-fns';
import toast from 'react-hot-toast';
import './CalendarBase.css';
import './CalendarModals.css';

import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const Calendar = ({ userData, isPremium, updateUserData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayInfoModal, setDayInfoModal] = useState(false);
  const [editDayModal, setEditDayModal] = useState(false);
  const [viewMode, setViewMode] = useState('month');
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [showTriggerSelection, setShowTriggerSelection] = useState(false);
  const [editingExistingTrigger, setEditingExistingTrigger] = useState(false);

  // Journal states
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const triggerOptions = [
    { id: 'lustful_thoughts', label: 'Lustful Thoughts' },
    { id: 'stress', label: 'Stress' },
    { id: 'boredom', label: 'Boredom' },
    { id: 'social_media', label: 'Social Media' },
    { id: 'loneliness', label: 'Loneliness' },
    { id: 'relationship', label: 'Relationship' },
    { id: 'home_alone', label: 'Home Alone' },
    { id: 'explicit_content', label: 'Explicit Content' },
    { id: 'alcohol_substances', label: 'Substances' },
    { id: 'sleep_deprivation', label: 'Sleep Deprived' }
  ];

  // Helper to get trigger label from ID
  const getTriggerLabel = (triggerId) => {
    const trigger = triggerOptions.find(t => t.id === triggerId);
    return trigger ? trigger.label : triggerId;
  };

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

  // Check if day is in the future
  const isFutureDay = (day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDay = new Date(day);
    checkDay.setHours(0, 0, 0, 0);
    return isAfter(checkDay, today);
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
    if (relapseDay) return { type: 'relapse', trigger: relapseDay.trigger, streakId: relapseDay.id };
    
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
    // Don't allow editing future days
    if (isFutureDay(selectedDate)) {
      toast.error("Can't edit future days");
      return;
    }
    
    setDayInfoModal(false);
    setEditDayModal(true);
    setShowTriggerSelection(false);
    setEditingExistingTrigger(false);
    setSelectedTrigger('');
  };

  const closeEditModal = () => {
    setEditDayModal(false);
    setShowTriggerSelection(false);
    setEditingExistingTrigger(false);
    setSelectedTrigger('');
  };

  const backToDayInfo = () => {
    setEditDayModal(false);
    setShowTriggerSelection(false);
    setEditingExistingTrigger(false);
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

  // Render helper for status badge (used in both sticky and non-sticky layouts)
  const renderStatusBadge = () => {
    const dayStatus = getDayStatus(selectedDate);
    const dayCount = getDayCount(selectedDate);
    const wetDream = hasWetDream(selectedDate);
    
    if (dayStatus?.type === 'current-streak') {
      return (
        <div className="calendar-status-badge current-streak">
          <span className="status-dot"></span>
          <span>Current Streak</span>
          {dayCount && <span className="day-count">Day {dayCount.dayNumber}</span>}
        </div>
      );
    }
    if (dayStatus?.type === 'former-streak') {
      return (
        <div className="calendar-status-badge former-streak">
          <span className="status-dot"></span>
          <span>Former Streak</span>
          {dayCount && <span className="day-count">Day {dayCount.dayNumber}{dayCount.totalDays ? `/${dayCount.totalDays}` : ''}</span>}
        </div>
      );
    }
    if (dayStatus?.type === 'relapse') {
      return (
        <div className="calendar-relapse-info">
          <div className="calendar-status-badge relapse">
            <span className="status-dot"></span>
            <span>Relapse</span>
          </div>
          {dayStatus.trigger && (
            <div className="calendar-trigger-display">
              <span className="trigger-label">Trigger</span>
              <span className="trigger-value">{getTriggerLabel(dayStatus.trigger)}</span>
            </div>
          )}
        </div>
      );
    }
    if (wetDream) {
      return (
        <div className="calendar-status-badge wet-dream">
          <span className="status-dot"></span>
          <span>Wet Dream</span>
        </div>
      );
    }
    
    // Future day
    if (isFutureDay(selectedDate)) {
      return (
        <div className="calendar-status-badge future">
          <span>Future Day</span>
        </div>
      );
    }
    
    return (
      <div className="calendar-status-badge">
        <span>No status recorded</span>
      </div>
    );
  };

  // Render helper for journal section (used in both sticky and non-sticky layouts)
  const renderJournalSection = () => (
    <div className="calendar-journal">
      <div className="calendar-journal-header">
        <h4>Journal</h4>
        {!isEditingNote && noteText && (
          <button className="calendar-action-btn" onClick={startEditingNote}>
            Edit
          </button>
        )}
      </div>
      
      {isEditingNote ? (
        <div className="calendar-journal-editing">
          <textarea
            className="calendar-journal-textarea"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="What's on your mind?"
            rows="4"
          />
          <div className="calendar-journal-actions">
            <button className="calendar-cancel-btn" onClick={cancelEditingNote}>
              Cancel
            </button>
            <button className="calendar-save-btn" onClick={saveNote}>
              Save
            </button>
          </div>
        </div>
      ) : noteText ? (
        <div className="calendar-journal-entry">{noteText}</div>
      ) : (
        <>
          <div className="calendar-journal-empty">
            <h4>What's on your mind?</h4>
            <p>Journaling helps track patterns and maintain accountability on your journey.</p>
          </div>
          <div className="calendar-journal-start">
            <button className="calendar-action-btn" onClick={startEditingNote}>
              Add Entry
            </button>
          </div>
        </>
      )}
    </div>
  );

  // Status update handlers
  const handleStatusClick = (status) => {
    if (status === 'relapse') {
      setShowTriggerSelection(true);
      setEditingExistingTrigger(false);
    } else if (status === 'wet-dream') {
      updateUserData({ wetDreamCount: (userData.wetDreamCount || 0) + 1 });
      toast.success('Wet dream logged');
      closeEditModal();
    }
  };

  // Edit existing relapse trigger
  const handleEditTrigger = () => {
    const dayStatus = getDayStatus(selectedDate);
    if (dayStatus?.trigger) {
      setSelectedTrigger(dayStatus.trigger);
    }
    setShowTriggerSelection(true);
    setEditingExistingTrigger(true);
  };

  // Update existing trigger
  const handleUpdateTrigger = () => {
    if (!selectedDate || !updateUserData || !selectedTrigger) return;
    
    let updatedStreakHistory = [...(userData.streakHistory || [])];
    const relapseIndex = updatedStreakHistory.findIndex(streak => 
      streak.end && streak.reason === 'relapse' && isSameDay(new Date(streak.end), selectedDate)
    );
    
    if (relapseIndex !== -1) {
      updatedStreakHistory[relapseIndex] = {
        ...updatedStreakHistory[relapseIndex],
        trigger: selectedTrigger
      };
      
      updateUserData({ streakHistory: updatedStreakHistory });
      toast.success('Trigger updated');
    }
    
    closeEditModal();
  };

  // Remove relapse
  const handleRemoveRelapse = () => {
    if (!selectedDate || !updateUserData) return;
    
    // Find and remove the relapse entry, merge streaks back together
    let updatedStreakHistory = [...(userData.streakHistory || [])];
    const relapseIndex = updatedStreakHistory.findIndex(streak => 
      streak.end && streak.reason === 'relapse' && isSameDay(new Date(streak.end), selectedDate)
    );
    
    if (relapseIndex !== -1) {
      // This is complex - we'd need to merge the streak that ended with relapse
      // with the one that started after. For safety, just remove the relapse flag
      // and let the user re-log if needed. A full merge is error-prone.
      updatedStreakHistory[relapseIndex] = {
        ...updatedStreakHistory[relapseIndex],
        reason: null,
        trigger: null
      };
      
      updateUserData({ 
        streakHistory: updatedStreakHistory,
        relapseCount: Math.max(0, (userData.relapseCount || 0) - 1)
      });
      toast.success('Relapse removed');
    }
    
    closeEditModal();
  };

  const handleTriggerSelection = () => {
    // If editing existing trigger, use update function
    if (editingExistingTrigger) {
      handleUpdateTrigger();
      return;
    }
    
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

  // Determine what edit options to show based on day status
  const getEditOptions = () => {
    const dayStatus = getDayStatus(selectedDate);
    const isFuture = isFutureDay(selectedDate);
    
    // Future days - no editing allowed
    if (isFuture) {
      return { type: 'future' };
    }
    
    // Relapse day - show trigger info and allow edit/remove
    if (dayStatus?.type === 'relapse') {
      return { 
        type: 'relapse', 
        trigger: dayStatus.trigger,
        triggerLabel: dayStatus.trigger ? getTriggerLabel(dayStatus.trigger) : null
      };
    }
    
    // Former streak day - read only, it's history
    if (dayStatus?.type === 'former-streak') {
      return { type: 'former-streak' };
    }
    
    // Current streak day - only wet dream or relapse options
    if (dayStatus?.type === 'current-streak') {
      return { type: 'current-streak' };
    }
    
    // No status - could be before any streak started
    // Only show if user might want to backdate (we'll keep it simple and not allow)
    return { type: 'no-status' };
  };

  // Render the appropriate edit modal content
  const renderEditContent = () => {
    const editOptions = getEditOptions();
    
    // Trigger selection mode (for new relapse or editing existing)
    if (showTriggerSelection) {
      return (
        <div className="calendar-trigger-section">
          <div className="calendar-triggers-label">
            {editingExistingTrigger ? 'Update Trigger' : 'Select Trigger'}
          </div>
          <div className="calendar-triggers-list">
            {triggerOptions.map((trigger, index, arr) => (
              <React.Fragment key={trigger.id}>
                <button
                  className={`calendar-trigger ${selectedTrigger === trigger.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTrigger(trigger.id)}
                >
                  <span>{trigger.label}</span>
                  {selectedTrigger === trigger.id && <span className="calendar-trigger-check">✓</span>}
                </button>
                {index < arr.length - 1 && <div className="calendar-trigger-divider" />}
              </React.Fragment>
            ))}
          </div>
          <div className="calendar-trigger-actions">
            <button 
              className="calendar-trigger-confirm"
              onClick={handleTriggerSelection}
              disabled={!selectedTrigger}
            >
              {editingExistingTrigger ? 'Update Trigger' : 'Confirm Relapse'}
            </button>
          </div>
        </div>
      );
    }
    
    // Future day - blocked
    if (editOptions.type === 'future') {
      return (
        <div className="calendar-edit-message">
          <p>This day hasn't happened yet.</p>
          <p className="calendar-edit-hint">Come back when it arrives.</p>
        </div>
      );
    }
    
    // Relapse day - show trigger and options to edit/remove
    if (editOptions.type === 'relapse') {
      return (
        <div className="calendar-relapse-edit">
          <div className="calendar-relapse-current">
            <span className="calendar-relapse-label">Logged Trigger</span>
            <span className="calendar-relapse-value">
              {editOptions.triggerLabel || 'None recorded'}
            </span>
          </div>
          <div className="calendar-edit-options">
            <button 
              className="calendar-option-btn calendar-option-edit"
              onClick={handleEditTrigger}
            >
              Change Trigger
            </button>
            <button 
              className="calendar-option-btn calendar-option-remove"
              onClick={handleRemoveRelapse}
            >
              Remove Relapse
            </button>
          </div>
        </div>
      );
    }
    
    // Former streak day - read only
    if (editOptions.type === 'former-streak') {
      return (
        <div className="calendar-edit-message">
          <p>This day is part of a completed streak.</p>
          <p className="calendar-edit-hint">Historical records can't be modified.</p>
        </div>
      );
    }
    
    // Current streak day - only wet dream or relapse
    if (editOptions.type === 'current-streak') {
      return (
        <div className="calendar-edit-options">
          <button 
            className="calendar-option-btn calendar-option-wetdream"
            onClick={() => handleStatusClick('wet-dream')}
          >
            <span className="option-dot"></span>
            <span>Log Wet Dream</span>
          </button>
          <button 
            className="calendar-option-btn calendar-option-relapse"
            onClick={() => handleStatusClick('relapse')}
          >
            <span className="option-dot"></span>
            <span>Log Relapse</span>
          </button>
        </div>
      );
    }
    
    // No status day (before streak started)
    return (
      <div className="calendar-edit-message">
        <p>No streak data for this day.</p>
        <p className="calendar-edit-hint">This day is before your tracked history.</p>
      </div>
    );
  };

  // Get the appropriate subtitle for edit modal
  const getEditSubtitle = () => {
    const editOptions = getEditOptions();
    
    if (showTriggerSelection) {
      return editingExistingTrigger ? 'What caused the relapse?' : 'What triggered this?';
    }
    
    switch (editOptions.type) {
      case 'future':
        return '';
      case 'relapse':
        return 'Manage this relapse entry';
      case 'former-streak':
        return '';
      case 'current-streak':
        return 'What happened on this day?';
      default:
        return '';
    }
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
    rows.push(<div className="calendar-row header-row" key="header">{headerDays}</div>);
    
    // Day rows
    day = startDate;
    while (day <= endDate) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(day);
        const dayStatus = getDayStatus(currentDay);
        const isToday = isSameDay(currentDay, new Date());
        const dayTracking = getDayTracking(currentDay);
        const isCurrentMonth = isSameMonth(currentDay, currentDate);
        const wetDream = hasWetDream(currentDay);
        
        const cellClasses = [
          'day-cell',
          !isCurrentMonth && 'other-month',
          isToday && 'today',
          dayStatus?.type === 'current-streak' && 'current-streak',
          dayStatus?.type === 'former-streak' && 'former-streak',
          dayStatus?.type === 'relapse' && 'relapse',
          wetDream && 'wet-dream',
          dayTracking.hasBenefits && 'has-tracking'
        ].filter(Boolean).join(' ');
        
        week.push(
          <div 
            key={currentDay.toString()} 
            className={cellClasses}
            onClick={() => openDayInfo(currentDay)}
          >
            <span className="day-number">{format(currentDay, 'd')}</span>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="calendar-row" key={day.toString()}>{week}</div>);
    }
    
    return rows;
  };

  // Render week view
  const renderWeekView = () => {
    const { weekStart } = getWeekRange(currentDate);
    
    const days = [];
    let day = weekStart;
    
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(day);
      const dayStatus = getDayStatus(currentDay);
      const isToday = isSameDay(currentDay, new Date());
      const dayTracking = getDayTracking(currentDay);
      const wetDream = hasWetDream(currentDay);
      
      const cellClasses = [
        'week-day-cell',
        isToday && 'today',
        dayStatus?.type === 'current-streak' && 'current-streak',
        dayStatus?.type === 'former-streak' && 'former-streak',
        dayStatus?.type === 'relapse' && 'relapse',
        wetDream && 'wet-dream',
        dayTracking.hasBenefits && 'has-tracking'
      ].filter(Boolean).join(' ');
      
      days.push(
        <div 
          key={currentDay.toString()} 
          className={cellClasses}
          onClick={() => openDayInfo(currentDay)}
        >
          <span className="week-day-name">{format(currentDay, 'EEE')}</span>
          <span className="week-day-number">{format(currentDay, 'd')}</span>
        </div>
      );
      day = addDays(day, 1);
    }
    
    return <div className="week-view">{days}</div>;
  };

  // Month title format
  const getTitle = () => {
    if (viewMode === 'week') {
      const { weekStart, weekEnd } = getWeekRange(currentDate);
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return format(weekStart, 'MMMM yyyy');
      }
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'MMMM yyyy');
  };

  return (
    <div className="calendar-container">
      {/* Navigation Header */}
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="nav-btn" onClick={prevPeriod}>
            <FaChevronLeft />
          </button>
          <h2 className="calendar-title">{getTitle()}</h2>
          <button className="nav-btn" onClick={nextPeriod}>
            <FaChevronRight />
          </button>
        </div>
        
        {/* View Toggle */}
        <div className="view-toggle">
          <button 
            className={`toggle-option ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Month
          </button>
          <span className="toggle-divider" />
          <button 
            className={`toggle-option ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            Week
          </button>
        </div>
      </div>

      {/* Legend - Subtle single row */}
      <div className="calendar-legend-minimal">
        <div className="legend-item">
          <span className="legend-dot current-streak"></span>
          <span>Current</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot former-streak"></span>
          <span>Former</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot relapse"></span>
          <span>Relapse</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot wet-dream"></span>
          <span>Wet Dream</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot tracked"></span>
          <span>Tracked</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-main-section">
        {viewMode === 'month' ? renderMonthView() : renderWeekView()}
      </div>

      {/* ================================================================
          DAY INFO MODAL - Using SCOPED class names (calendar-*)
          ================================================================ */}
      {dayInfoModal && selectedDate && (
        <div className="calendar-overlay" onClick={closeDayInfo}>
          <div className={`calendar-modal calendar-day-info ${getDayBenefits(selectedDate) ? 'has-benefits' : ''}`} onClick={e => e.stopPropagation()}>
            
            {(() => {
              const dayBenefits = getDayBenefits(selectedDate);
              const hasBenefits = !!dayBenefits;
              const isFuture = isFutureDay(selectedDate);
              
              // If benefits exist, use sticky header/footer structure
              if (hasBenefits) {
                const benefitItems = [
                  { label: 'Energy', value: dayBenefits.energy },
                  { label: 'Focus', value: dayBenefits.focus },
                  { label: 'Confidence', value: dayBenefits.confidence },
                  { label: 'Aura', value: dayBenefits.aura || 5 },
                  { label: 'Sleep', value: dayBenefits.sleep || dayBenefits.attraction || 5 },
                  { label: 'Workout', value: dayBenefits.workout || dayBenefits.gymPerformance || 5 }
                ];
                
                return (
                  <>
                    {/* Sticky Header */}
                    <div className="calendar-modal-header">
                      <h3>{format(selectedDate, 'EEEE, MMMM d')}</h3>
                      
                      {/* Status Badge */}
                      <div className="calendar-status-info">
                        {renderStatusBadge()}
                      </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="calendar-modal-content">
                      {/* Benefits Section */}
                      <div className="calendar-benefits">
                        <h4>Benefits</h4>
                        <div className="calendar-benefits-list">
                          {benefitItems.map(item => (
                            <div key={item.label} className="calendar-benefit-row">
                              <span className="calendar-benefit-label">{item.label}</span>
                              <div className="calendar-benefit-bar">
                                <div className="calendar-benefit-fill" style={{ width: `${item.value * 10}%` }} />
                              </div>
                              <div className="calendar-benefit-value">{item.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Journal Section */}
                      {renderJournalSection()}
                    </div>

                    {/* Sticky Footer */}
                    <div className="calendar-modal-footer">
                      <button className="calendar-btn-ghost" onClick={closeDayInfo}>
                        Close
                      </button>
                      {!isFuture && (
                        <button className="calendar-btn-primary" onClick={showEditFromInfo}>
                          Edit Day
                        </button>
                      )}
                    </div>
                  </>
                );
              }
              
              // No benefits - simple flat structure (no scroll needed)
              return (
                <>
                  <h3>{format(selectedDate, 'EEEE, MMMM d')}</h3>
                  
                  {/* Status Badge */}
                  <div className="calendar-status-info">
                    {renderStatusBadge()}
                  </div>

                  {/* Journal Section - only for non-future days */}
                  {!isFuture && renderJournalSection()}

                  {/* Actions */}
                  <div className="calendar-actions">
                    <button className="calendar-btn-ghost" onClick={closeDayInfo}>
                      Close
                    </button>
                    {!isFuture && (
                      <button className="calendar-btn-primary" onClick={showEditFromInfo}>
                        Edit Day
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ================================================================
          EDIT DAY MODAL - Context-aware based on day status
          ================================================================ */}
      {editDayModal && selectedDate && (
        <div className="calendar-overlay" onClick={closeEditModal}>
          <div className="calendar-modal calendar-edit-day" onClick={e => e.stopPropagation()}>
            
            <h3>{format(selectedDate, 'EEEE, MMMM d')}</h3>
            {getEditSubtitle() && <p>{getEditSubtitle()}</p>}

            {renderEditContent()}

            <div className="calendar-actions">
              <button className="calendar-btn-ghost" onClick={closeEditModal}>
                Cancel
              </button>
              {!showTriggerSelection && getEditOptions().type !== 'future' && (
                <button className="calendar-btn-back" onClick={backToDayInfo}>
                  Back
                </button>
              )}
              {showTriggerSelection && (
                <button className="calendar-btn-back" onClick={() => {
                  setShowTriggerSelection(false);
                  setEditingExistingTrigger(false);
                  setSelectedTrigger('');
                }}>
                  Back
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;