// components/Calendar/Calendar.js - TITANTRACK ELITE
// Two CSS files: CalendarBase.css + CalendarModals.css
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, 
  isSameDay, subMonths, addMonths, differenceInDays, isAfter,
  startOfWeek as getWeekStart, addWeeks, subWeeks } from 'date-fns';
import toast from 'react-hot-toast';
import './CalendarBase.css';
import './CalendarModals.css';

import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

// NEW: Import InterventionService for ML feedback loop
import interventionService from '../../services/InterventionService';

// Body scroll lock for modals
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

// UNIFIED TRIGGER SYSTEM
import { getAllTriggers, getTriggerLabel } from '../../constants/triggerConstants';

// =============================================================================
// LUNAR PHASE SYSTEM - Premium moon tracking with emoji icons
// Uses recent verified new moon reference for accuracy
// =============================================================================

const getLunarData = (date) => {
  const synodicMonth = 29.53058867;
  // Recent verified new moon - minimizes accumulated error
  // Jan 29, 2025 at 12:36 UTC (source: timeanddate.com, USNO)
  const knownNewMoon = new Date('2025-01-29T12:36:00Z');
  const daysSinceNew = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  const lunarAge = ((daysSinceNew % synodicMonth) + synodicMonth) % synodicMonth;
  const illumination = (1 - Math.cos((lunarAge / synodicMonth) * 2 * Math.PI)) / 2;
  
  // Phase thresholds adjusted:
  // - New/Full moon get ~1.5 day windows to catch the day even when checking at midnight
  // - This ensures the actual full moon day shows as "Full Moon" not the day after
  let phase, isSignificant, label, emoji;
  if (lunarAge < 1.5 || lunarAge >= 28.5) {
    // New Moon window: last 1 day of cycle + first 1.5 days
    phase = 'new'; isSignificant = true; label = 'New Moon'; emoji = '🌑';
  } else if (lunarAge < 7.38) {
    phase = 'waxing-crescent'; isSignificant = false; label = 'Waxing Crescent'; emoji = '🌒';
  } else if (lunarAge < 9.23) {
    phase = 'first-quarter'; isSignificant = false; label = 'First Quarter'; emoji = '🌓';
  } else if (lunarAge < 13.0) {
    // Waxing Gibbous ends earlier to give Full Moon more buffer
    phase = 'waxing-gibbous'; isSignificant = false; label = 'Waxing Gibbous'; emoji = '🌔';
  } else if (lunarAge < 16.5) {
    // Full Moon window: ~3.5 days centered around day 14.77
    phase = 'full'; isSignificant = true; label = 'Full Moon'; emoji = '🌕';
  } else if (lunarAge < 21.15) {
    phase = 'waning-gibbous'; isSignificant = false; label = 'Waning Gibbous'; emoji = '🌖';
  } else if (lunarAge < 23.0) {
    phase = 'last-quarter'; isSignificant = false; label = 'Last Quarter'; emoji = '🌗';
  } else {
    phase = 'waning-crescent'; isSignificant = false; label = 'Waning Crescent'; emoji = '🌘';
  }
  
  return {
    phase,
    isSignificant,
    label,
    emoji,
    illumination: Math.round(illumination * 100),
    lunarAge: Math.round(lunarAge * 10) / 10
  };
};

// Moon emoji renderer - consistent across app
const MoonIcon = ({ phase, size = 11, emoji }) => {
  const moonEmoji = emoji || {
    'new': '🌑',
    'waxing-crescent': '🌒',
    'first-quarter': '🌓',
    'waxing-gibbous': '🌔',
    'full': '🌕',
    'waning-gibbous': '🌖',
    'last-quarter': '🌗',
    'waning-crescent': '🌘'
  }[phase] || '🌕';
  
  return (
    <span 
      className="moon-emoji" 
      style={{ fontSize: `${size}px`, lineHeight: 1 }}
      role="img" 
      aria-label={phase}
    >
      {moonEmoji}
    </span>
  );
};

const Calendar = ({ userData, isPremium, updateUserData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayInfoModal, setDayInfoModal] = useState(false);
  const [editDayModal, setEditDayModal] = useState(false);
  const [viewMode, setViewMode] = useState('month');
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [showTriggerSelection, setShowTriggerSelection] = useState(false);
  const [editingExistingTrigger, setEditingExistingTrigger] = useState(false);

  // Moon detail modal state
  const [moonDetailModal, setMoonDetailModal] = useState(false);
  const [selectedMoonDate, setSelectedMoonDate] = useState(null);

  // Journal states
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  // Lock body scroll when any modal is open
  useBodyScrollLock(dayInfoModal || editDayModal || moonDetailModal);


  // Get trigger options from unified constants (Calendar shows ALL triggers)
  const triggerOptions = getAllTriggers().map(t => ({
    id: t.id,
    label: t.label
  }));

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
    // Check actual wetDreams array for this date
    if (!userData.wetDreams || userData.wetDreams.length === 0) return false;
    
    return userData.wetDreams.some(wetDream => {
      if (!wetDream.date) return false;
      return isSameDay(new Date(wetDream.date), day);
    });
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
    setSelectedDate(null);
    setIsEditingNote(false);
    setNoteText('');
  };

  const showEditFromInfo = () => {
    setEditDayModal(true);
    setDayInfoModal(false);
    setSelectedTrigger('');
    setShowTriggerSelection(false);
    setEditingExistingTrigger(false);
  };

  const closeEditModal = () => {
    setEditDayModal(false);
    setShowTriggerSelection(false);
    setEditingExistingTrigger(false);
    setSelectedTrigger('');
  };

  const backToDayInfo = () => {
    setDayInfoModal(true);
    setEditDayModal(false);
    setShowTriggerSelection(false);
    setEditingExistingTrigger(false);
    setSelectedTrigger('');
  };

  // Moon detail modal handlers
  const openMoonDetail = (day, e) => {
    e.stopPropagation();
    setSelectedMoonDate(day);
    setMoonDetailModal(true);
  };

  const closeMoonDetail = () => {
    setMoonDetailModal(false);
    setSelectedMoonDate(null);
  };

  // Journal handlers
  const startEditingNote = () => {
    setIsEditingNote(true);
  };

  const cancelEditingNote = () => {
    const dayStr = format(selectedDate, 'yyyy-MM-dd');
    const existingNote = userData.notes && userData.notes[dayStr];
    setNoteText(existingNote || '');
    setIsEditingNote(false);
  };

  const saveNote = () => {
    if (!selectedDate || !updateUserData) return;
    
    const dayStr = format(selectedDate, 'yyyy-MM-dd');
    const updatedNotes = { ...(userData.notes || {}), [dayStr]: noteText };
    updateUserData({ notes: updatedNotes });
    setIsEditingNote(false);
    toast.success('Note saved');
  };

  // Render status badge for day info modal
  const renderStatusBadge = () => {
    const dayStatus = getDayStatus(selectedDate);
    const dayCount = getDayCount(selectedDate);
    const wetDream = hasWetDream(selectedDate);
    
    // Check wet dream FIRST - wet dream days show amber badge (it's the notable event)
    if (wetDream) {
      return (
        <div className="calendar-status-badge wet-dream">
          <span className="status-dot"></span>
          <span>Wet Dream{dayCount ? ` · Day ${dayCount.dayNumber}` : ''}</span>
        </div>
      );
    }
    
    if (dayStatus?.type === 'current-streak') {
      return (
        <div className="calendar-status-badge current-streak">
          <span className="status-dot"></span>
          <span>Day {dayCount?.dayNumber || 0}</span>
        </div>
      );
    }
    if (dayStatus?.type === 'former-streak') {
      return (
        <div className="calendar-status-badge former-streak">
          <span className="status-dot"></span>
          {dayCount && <span>Day {dayCount.dayNumber}{dayCount.totalDays ? `/${dayCount.totalDays}` : ''}</span>}
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

  // Render moon phase info for day info modal
  const renderMoonPhaseInfo = () => {
    if (!selectedDate) return null;
    const lunar = getLunarData(selectedDate);
    
    return (
      <div className="calendar-moon-info">
        <div className="calendar-moon-row">
          <MoonIcon phase={lunar.phase} size={16} />
          <span className="calendar-moon-label">{lunar.label}</span>
          <span className="calendar-moon-illumination">{lunar.illumination}%</span>
        </div>
      </div>
    );
  };

  // Render helper for journal section (used in both sticky and non-sticky layouts)
  const renderJournalSection = () => (
    <div className="calendar-journal">
      <h4>Journal</h4>
      
      {isEditingNote ? (
        <div className="calendar-journal-editing">
          <textarea
            className="calendar-journal-textarea"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="What's on your mind?"
            rows="4"
            autoFocus
          />
          <div className="calendar-journal-actions">
            <button className="calendar-journal-save" onClick={saveNote}>
              Save
            </button>
            <button className="calendar-journal-cancel" onClick={cancelEditingNote}>
              Cancel
            </button>
          </div>
        </div>
      ) : noteText ? (
        <div className="calendar-journal-entry" onClick={startEditingNote}>
          {noteText}
        </div>
      ) : (
        <div className="calendar-journal-empty" onClick={startEditingNote}>
          <p>Tap to add a journal entry</p>
        </div>
      )}
    </div>
  );

  // Remove wet dream from a day
  const handleRemoveWetDream = () => {
    if (!selectedDate || !updateUserData) return;
    
    // Filter out the wet dream for this date
    const updatedWetDreams = (userData.wetDreams || []).filter(wetDream => {
      if (!wetDream.date) return true;
      return !isSameDay(new Date(wetDream.date), selectedDate);
    });
    
    updateUserData({ 
      wetDreams: updatedWetDreams,
      wetDreamCount: updatedWetDreams.length  // Recalculate from array - always accurate
    });
    
    toast.success('Wet dream removed');
    closeEditModal();
  };

  // Status update handlers
  const handleStatusClick = (status) => {
    if (status === 'relapse') {
      setShowTriggerSelection(true);
      setEditingExistingTrigger(false);
    } else if (status === 'wet-dream') {
      // Get current streak day for this date
      const dayCount = getDayCount(selectedDate);
      const streakDay = dayCount?.dayNumber || userData.currentStreak || 0;
      
      // Store wet dream with date (like Tracker.js does)
      const updatedWetDreams = [...(userData.wetDreams || []), { date: selectedDate, streakDay }];
      updateUserData({ 
        wetDreams: updatedWetDreams,
        wetDreamCount: updatedWetDreams.length,
        lastWetDream: selectedDate
      });
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
        days: streakDays,
        reason: 'relapse',
        trigger: selectedTrigger
      };
      
      // Create new streak starting tomorrow
      const tomorrow = addDays(selectedDate, 1);
      if (!isAfter(tomorrow, today)) {
        updatedStreakHistory.push({
          start: tomorrow,
          end: null,
          days: 0
        });
      }
      
      // NEW: Record relapse event for ML feedback loop
      try {
        interventionService.recordRelapseEvent(
          selectedTrigger,
          null, // No risk level from calendar
          streakDays,
          new Date(currentStreak.start)
        );
      } catch (err) {
        console.log('ML feedback recording skipped:', err.message);
      }
      
      const newCurrentStreak = !isAfter(tomorrow, today) 
        ? differenceInDays(new Date(), tomorrow) + 1 
        : 0;
      
      updateUserData({
        streakHistory: updatedStreakHistory,
        currentStreak: newCurrentStreak,
        relapseCount: (userData.relapseCount || 0) + 1,
        lastRelapse: selectedDate,
        lastTrigger: selectedTrigger
      });
      
      toast.success('Relapse logged');
    }
    
    closeEditModal();
  };

  // Delete a relapse from calendar
  const handleDeleteRelapse = () => {
    if (!selectedDate || !updateUserData) return;
    
    let updatedStreakHistory = [...(userData.streakHistory || [])];
    
    // Find the relapse entry for this date
    const relapseIndex = updatedStreakHistory.findIndex(streak => 
      streak.end && streak.reason === 'relapse' && isSameDay(new Date(streak.end), selectedDate)
    );
    
    if (relapseIndex === -1) {
      toast.error('Relapse not found');
      return;
    }
    
    const relapseEntry = updatedStreakHistory[relapseIndex];
    
    // Find the streak that started after this relapse (if any)
    const nextStreakIndex = updatedStreakHistory.findIndex(streak => {
      if (!streak.start) return false;
      const streakStart = new Date(streak.start);
      const dayAfterRelapse = addDays(selectedDate, 1);
      return isSameDay(streakStart, dayAfterRelapse);
    });
    
    // Merge: extend the relapse entry to continue (remove its end)
    // and remove the subsequent streak if it exists
    if (nextStreakIndex !== -1) {
      // There's a streak after this relapse - merge them
      const nextStreak = updatedStreakHistory[nextStreakIndex];
      
      // Update the original streak to continue (remove end, reason, trigger)
      updatedStreakHistory[relapseIndex] = {
        start: relapseEntry.start,
        end: nextStreak.end || null,
        days: nextStreak.end 
          ? differenceInDays(new Date(nextStreak.end), new Date(relapseEntry.start)) + 1
          : null
      };
      
      // Remove the subsequent streak
      updatedStreakHistory.splice(nextStreakIndex, 1);
    } else {
      // No streak after - just remove the end to make it active again
      updatedStreakHistory[relapseIndex] = {
        start: relapseEntry.start,
        end: null,
        days: null
      };
    }
    
    // Recalculate current streak
    const activeStreak = updatedStreakHistory.find(s => !s.end);
    const newCurrentStreak = activeStreak 
      ? differenceInDays(new Date(), new Date(activeStreak.start)) + 1
      : 0;
    
    // Recalculate longest streak
    const allStreakLengths = updatedStreakHistory.map(s => {
      if (s.end) return s.days || 0;
      return differenceInDays(new Date(), new Date(s.start)) + 1;
    });
    const newLongestStreak = Math.max(...allStreakLengths, 0);
    
    updateUserData({
      streakHistory: updatedStreakHistory,
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      relapseCount: Math.max((userData.relapseCount || 1) - 1, 0)
    });
    
    toast.success('Relapse removed');
    closeEditModal();
  };

  // Get edit options based on day status
  const getEditOptions = () => {
    const dayStatus = getDayStatus(selectedDate);
    const wetDream = hasWetDream(selectedDate);
    const isFuture = isFutureDay(selectedDate);
    
    if (isFuture) return { type: 'future' };
    
    if (dayStatus?.type === 'relapse') {
      return { 
        type: 'relapse', 
        trigger: dayStatus.trigger ? getTriggerLabel(dayStatus.trigger) : null
      };
    }
    if (dayStatus?.type === 'former-streak') return { type: 'former-streak' };
    if (dayStatus?.type === 'current-streak') return { type: 'current-streak' };
    return { type: 'no-status' };
  };

  // Render edit modal content based on context
  const renderEditContent = () => {
    const editOptions = getEditOptions();
    const wetDream = hasWetDream(selectedDate);
    
    // Trigger selection mode
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
              {editingExistingTrigger ? 'Update Trigger' : 'Log Relapse'}
            </button>
          </div>
        </div>
      );
    }
    
    // Future day - can't edit
    if (editOptions.type === 'future') {
      return (
        <div className="calendar-edit-message">
          <p>Future days cannot be edited.</p>
          <p className="calendar-edit-hint">Check back when this day arrives.</p>
        </div>
      );
    }
    
    // Relapse day - show current trigger and options
    if (editOptions.type === 'relapse') {
      return (
        <div className="calendar-relapse-edit">
          {editOptions.trigger && (
            <div className="calendar-relapse-current">
              <span className="calendar-relapse-label">Current Trigger</span>
              <span className="calendar-relapse-value">{editOptions.trigger}</span>
            </div>
          )}
          <div className="calendar-edit-options">
            <button className="calendar-option-btn calendar-option-edit" onClick={handleEditTrigger}>
              {editOptions.trigger ? 'Change Trigger' : 'Add Trigger'}
            </button>
            <button className="calendar-option-btn calendar-option-danger" onClick={handleDeleteRelapse}>
              Delete Relapse
            </button>
          </div>
          {wetDream && (
            <div className="calendar-edit-options" style={{ marginTop: '24px' }}>
              <button className="calendar-option-btn calendar-option-warning" onClick={handleRemoveWetDream}>
                Remove Wet Dream
              </button>
            </div>
          )}
        </div>
      );
    }
    
    // Former streak day - read only
    if (editOptions.type === 'former-streak') {
      return (
        <div className="calendar-edit-message">
          <p>This day is part of a past streak.</p>
          <p className="calendar-edit-hint">Historical streak days cannot be modified.</p>
          {wetDream && (
            <div className="calendar-edit-options" style={{ marginTop: '24px' }}>
              <button className="calendar-option-btn calendar-option-warning" onClick={handleRemoveWetDream}>
                Remove Wet Dream
              </button>
            </div>
          )}
        </div>
      );
    }
    
    // Current streak day - can log relapse or wet dream
    if (editOptions.type === 'current-streak') {
      return (
        <div className="calendar-edit-options">
          <button 
            className="calendar-option-btn calendar-option-danger"
            onClick={() => handleStatusClick('relapse')}
          >
            <span className="option-dot relapse"></span>
            Log Relapse
          </button>
          {!wetDream && (
            <button 
              className="calendar-option-btn calendar-option-warning"
              onClick={() => handleStatusClick('wet-dream')}
            >
              <span className="option-dot wet-dream"></span>
              Log Wet Dream
            </button>
          )}
          {wetDream && (
            <button 
              className="calendar-option-btn calendar-option-warning"
              onClick={handleRemoveWetDream}
            >
              Remove Wet Dream
            </button>
          )}
        </div>
      );
    }
    
    // No status - shouldn't happen often
    return (
      <div className="calendar-edit-message">
        <p>No actions available for this day.</p>
      </div>
    );
  };

  // Get subtitle for edit modal
  const getEditSubtitle = () => {
    const editOptions = getEditOptions();
    
    if (showTriggerSelection) {
      return editingExistingTrigger 
        ? 'What caused the relapse?' : 'What triggered this?';
    }
    
    switch (editOptions.type) {
      case 'future': return '';
      case 'relapse': return 'Manage this relapse entry';
      case 'former-streak': return '';
      case 'current-streak': return 'What happened on this day?';
      default: return '';
    }
  };

  // Render month view - ORIGINAL STRUCTURE with moon phase indicators
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
        const lunar = getLunarData(currentDay);
        const isMoonDay = lunar.isSignificant && isCurrentMonth;
        
        const cellClasses = [
          'day-cell',
          !isCurrentMonth ? 'other-month' : '',
          isToday ? 'today' : '',
          dayStatus?.type || '',
          wetDream ? 'wet-dream' : '',
          isMoonDay ? `moon-day moon-${lunar.phase}` : ''
        ].filter(Boolean).join(' ');

        week.push(
          <div key={i} className={cellClasses} onClick={() => openDayInfo(currentDay)}>
            <span className="day-number">{format(currentDay, 'd')}</span>
            {/* Data indicator - single dash if day has any tracked data */}
            {(dayTracking.hasBenefits || dayTracking.hasJournal) && (
              <span className="day-data-dash"></span>
            )}
            {/* Moon phase indicator - only on significant phases */}
            {isMoonDay && (
              <span 
                className="day-moon-indicator"
                onClick={(e) => openMoonDetail(currentDay, e)}
              >
                <MoonIcon phase={lunar.phase} emoji={lunar.emoji} size={11} />
              </span>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="calendar-row" key={format(day, 'yyyy-MM-dd')}>{week}</div>);
    }
    
    return <div className="calendar-display">{rows}</div>;
  };

  // Render week view - ORIGINAL STRUCTURE
  const renderWeekView = () => {
    const { weekStart } = getWeekRange(currentDate);
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayStatus = getDayStatus(day);
      const dayBenefits = getDayBenefits(day);
      const dayTracking = getDayTracking(day);
      const wetDream = hasWetDream(day);
      const isToday = isSameDay(day, new Date());
      const lunar = getLunarData(day);
      const isMoonDay = lunar.isSignificant;
      
      const cellClasses = [
        'week-day-cell',
        isToday ? 'today-card' : '',
        dayStatus?.type || '',
        wetDream ? 'wet-dream' : '',
        isMoonDay ? `moon-day moon-${lunar.phase}` : ''
      ].filter(Boolean).join(' ');

      days.push(
        <div key={i} className={cellClasses} onClick={() => openDayInfo(day)}>
          <div className="week-day-header">
            <span className="week-day-name">{format(day, 'EEE')}</span>
            <span className={`week-day-number ${isToday ? 'today' : ''} ${dayStatus?.type || ''} ${wetDream && !dayStatus ? 'wet-dream' : ''}`}>
              {format(day, 'd')}
            </span>
            {/* Moon indicator in week view header */}
            {isMoonDay && (
              <span 
                className="week-moon-indicator"
                onClick={(e) => openMoonDetail(day, e)}
              >
                <MoonIcon phase={lunar.phase} emoji={lunar.emoji} size={14} />
              </span>
            )}
          </div>
          
          {/* Benefit bars - white progress bars matching modal style */}
          <div className="week-benefits-prominent">
            {dayBenefits && ['energy', 'focus', 'confidence'].map(metric => (
              <div key={metric} className="week-benefit-item">
                <span className="week-benefit-label-top">{metric}</span>
                <div className="week-benefit-bar">
                  <div 
                    className="week-benefit-fill" 
                    style={{ width: `${(dayBenefits[metric] || 5) * 10}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
          
          {/* Bottom indicators - tracked data only */}
          <div className="week-day-indicators">
            <div className="week-data-indicators">
              {(dayTracking.hasBenefits || dayTracking.hasJournal) && (
                <span className="week-data-dash"></span>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    return <div className="week-view-grid">{days}</div>;
  };

  return (
    <div className="calendar-container">
      {/* Minimal Header - Landing page style - ORIGINAL STRUCTURE */}
      <div className="calendar-header-minimal">
        {/* Period Display - Typography focused */}
        <div className="calendar-period-display">
          <button className="period-arrow" onClick={prevPeriod} aria-label="Previous">
            <FaChevronLeft />
          </button>
          <div className="period-text">
            <span className="period-month">{viewMode === 'month' ? format(currentDate, 'MMMM') : format(getWeekRange(currentDate).weekStart, 'MMM d') + ' – ' + format(getWeekRange(currentDate).weekEnd, 'd')}</span>
            <span className="period-year">{format(currentDate, 'yyyy')}</span>
          </div>
          <button className="period-arrow" onClick={nextPeriod} aria-label="Next">
            <FaChevronRight />
          </button>
        </div>
        
        {/* View Toggle - Text only, like landing stats */}
        <div className="view-toggle-minimal">
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
          <span className="legend-indicator tracked"></span>
          <span>Tracked</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-main-section">
        {viewMode === 'month' ? renderMonthView() : renderWeekView()}
      </div>

      {/* Moon Phase - Month view only, tappable quick-reference */}
      {viewMode === 'month' && (() => {
        const lunar = getLunarData(new Date());
        const synodicMonth = 29.53058867;
        const cycleDayRaw = lunar.lunarAge;
        const cycleDay = Math.ceil(cycleDayRaw) || 1;
        const cycleTotal = Math.round(synodicMonth);
        return (
          <div 
            className="calendar-moon-phase"
            onClick={(e) => openMoonDetail(new Date(), e)}
          >
            <span className="calendar-moon-phase-emoji">
              <MoonIcon phase={lunar.phase} emoji={lunar.emoji} size={48} />
            </span>
            <span className="calendar-moon-phase-name">{lunar.label}</span>
            <span className="calendar-moon-phase-meta">
              Day {cycleDay}/{cycleTotal} · {lunar.illumination}% illumination
            </span>
          </div>
        );
      })()}

      {/* ================================================================
          DAY INFO + EDIT DAY - SHARED OVERLAY
          Single overlay stays mounted during transitions, no flash
          ================================================================ */}
      {(dayInfoModal || editDayModal) && selectedDate && (
        <div className="calendar-overlay">
          
          {/* DAY INFO MODAL */}
          {dayInfoModal && (
          <div className="calendar-modal calendar-day-info has-scrollable-content" onClick={e => e.stopPropagation()}>
            
            {(() => {
              const dayBenefits = getDayBenefits(selectedDate);
              const hasBenefits = !!dayBenefits;
              const isFuture = isFutureDay(selectedDate);
              
              const benefitItems = hasBenefits ? [
                { label: 'Energy', value: dayBenefits.energy },
                { label: 'Focus', value: dayBenefits.focus },
                { label: 'Confidence', value: dayBenefits.confidence },
                { label: 'Aura', value: dayBenefits.aura || 5 },
                { label: 'Sleep', value: dayBenefits.sleep || dayBenefits.attraction || 5 },
                { label: 'Workout', value: dayBenefits.workout || dayBenefits.gymPerformance || 5 }
              ] : [];
              
              return (
                <>
                  {/* STICKY HEADER */}
                  <div className="calendar-modal-header">
                    <h3>{format(selectedDate, 'EEEE, MMMM d')}</h3>
                    <div className="calendar-status-info">
                      {renderStatusBadge()}
                    </div>
                  </div>

                  {/* SCROLLABLE CONTENT */}
                  <div className="calendar-modal-content">
                    {/* Moon phase info - always shown */}
                    {renderMoonPhaseInfo()}
                    
                    {/* Benefits section (if any) */}
                    {hasBenefits && (
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
                    )}
                    
                    {/* Journal section (if not future) */}
                    {!isFuture && renderJournalSection()}
                  </div>

                  {/* STICKY FOOTER */}
                  <div className="calendar-modal-footer">
                    {!isFuture && (
                      <button className="calendar-btn-primary" onClick={showEditFromInfo}>
                        Edit Day
                      </button>
                    )}
                    <button className="calendar-btn-ghost" onClick={closeDayInfo}>
                      Close
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
          )}

          {/* EDIT DAY MODAL */}
          {editDayModal && (
          <div className={`calendar-modal calendar-edit-day ${showTriggerSelection ? 'has-trigger-selection' : ''}`} onClick={e => e.stopPropagation()}>
            
            <h3>{format(selectedDate, 'EEEE, MMMM d')}</h3>
            {getEditSubtitle() && <p>{getEditSubtitle()}</p>}

            {renderEditContent()}

            <div className="calendar-actions">
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
          )}

        </div>
      )}

      {/* ================================================================
          MOON DETAIL MODAL - Premium lunar information
          ================================================================ */}
      {moonDetailModal && selectedMoonDate && (
        <div className="calendar-overlay">
          <div className="calendar-modal moon-detail-modal" onClick={e => e.stopPropagation()}>
            {(() => {
              const lunar = getLunarData(selectedMoonDate);
              return (
                <>
                  <div className="moon-detail-visual">
                    <div className={`moon-detail-glow moon-${lunar.phase}`}>
                      <MoonIcon phase={lunar.phase} emoji={lunar.emoji} size={72} />
                    </div>
                  </div>
                  
                  <div className="moon-detail-date">
                    {format(selectedMoonDate, 'EEEE, MMMM d, yyyy')}
                  </div>
                  
                  <h3 className="moon-detail-title">{lunar.label}</h3>
                  
                  <div className="moon-detail-illumination">
                    {lunar.illumination}% illumination
                  </div>
                  
                  <div className="moon-detail-insight">
                    <p>
                      {lunar.phase === 'full' 
                        ? "The full moon often correlates with heightened energy and stronger urges. Many practitioners report peak vitality during this phase."
                        : "The new moon marks a time of renewal and introspection. Some find this a powerful period for setting intentions and deepening practice."
                      }
                    </p>
                  </div>
                  
                  <div className="moon-detail-footer">
                    <button className="calendar-btn-ghost" onClick={closeMoonDetail}>
                      Close
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
