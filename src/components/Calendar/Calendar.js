// components/Calendar/Calendar.js - TITANTRACK MODERN MINIMAL
// Matches Tracker aesthetic: overlay, floating modals, sheet actions
import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, 
  isSameDay, subMonths, addMonths, differenceInDays, isAfter,
  startOfWeek as getWeekStart, addWeeks, subWeeks } from 'date-fns';
import toast from 'react-hot-toast';
import './CalendarBase.css';
import './CalendarModals.css';

import { FaCheckCircle, FaTimesCircle, FaMoon, 
  FaInfoCircle, FaExclamationTriangle, FaFrown, 
  FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaTheaterMasks,
  FaWineBottle, FaBed, FaPen, FaBook, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const Calendar = ({ userData, isPremium, updateUserData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewMode, setViewMode] = useState('month');
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [showTriggerSelect, setShowTriggerSelect] = useState(false);

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
  const openDayModal = (day) => {
    setSelectedDate(day);
    const dayStr = format(day, 'yyyy-MM-dd');
    const existingNote = userData.notes && userData.notes[dayStr];
    setNoteText(existingNote || '');
    setIsEditingNote(false);
    setShowDayModal(true);
  };

  const closeDayModal = () => {
    setShowDayModal(false);
    setIsEditingNote(false);
  };

  const openEditModal = () => {
    setShowDayModal(false);
    setShowEditModal(true);
    setShowTriggerSelect(false);
    setSelectedTrigger('');
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setShowTriggerSelect(false);
    setSelectedTrigger('');
  };

  const backToDay = () => {
    setShowEditModal(false);
    setShowDayModal(true);
  };

  // Journal handlers
  const saveNote = () => {
    if (!selectedDate || !updateUserData) return;
    const dayStr = format(selectedDate, 'yyyy-MM-dd');
    const updatedNotes = { ...userData.notes };
    if (noteText.trim()) {
      updatedNotes[dayStr] = noteText.trim();
      toast.success('Saved');
    } else {
      delete updatedNotes[dayStr];
      toast.success('Removed');
    }
    updateUserData({ notes: updatedNotes });
    setIsEditingNote(false);
  };

  const cancelNote = () => {
    const dayStr = format(selectedDate, 'yyyy-MM-dd');
    const existingNote = userData.notes && userData.notes[dayStr];
    setNoteText(existingNote || '');
    setIsEditingNote(false);
  };

  // Status update handlers
  const handleMarkStreak = () => {
    toast.success(`${format(selectedDate, 'MMM d')} confirmed`);
    closeEditModal();
  };

  const handleMarkWetDream = () => {
    updateUserData({ wetDreamCount: (userData.wetDreamCount || 0) + 1 });
    toast.success(`Wet dream logged`);
    closeEditModal();
  };

  const handleMarkRelapse = () => {
    setShowTriggerSelect(true);
  };

  const confirmRelapse = () => {
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
    
    toast.success(`Relapse logged`);
    closeEditModal();
  };

  // Render day cell
  const renderDayCell = (day, dayIndex) => {
    const dayStatus = getDayStatus(day);
    const isToday = isSameDay(day, new Date());
    const dayTracking = getDayTracking(day);
    const isCurrentMonth = isSameMonth(day, currentDate);
    const wetDream = hasWetDream(day);
    
    const dayClasses = [
      'cal-day',
      !isCurrentMonth ? 'other-month' : '',
      isToday ? 'today' : '',
      dayStatus?.type === 'current-streak' ? 'streak' : '',
      dayStatus?.type === 'former-streak' ? 'former' : '',
      dayStatus?.type === 'relapse' ? 'relapse' : '',
      wetDream ? 'wet-dream' : ''
    ].filter(Boolean).join(' ');

    return (
      <div key={dayIndex} className={dayClasses} onClick={() => openDayModal(day)}>
        <span className="cal-day-num">{format(day, 'd')}</span>
        <div className="cal-day-icons">
          {dayTracking.hasJournal && <FaBook className="icon-journal" />}
          {dayTracking.hasBenefits && <FaInfoCircle className="icon-benefits" />}
          {wetDream && <FaMoon className="icon-wet" />}
          {dayStatus?.type === 'current-streak' && <FaCheckCircle className="icon-streak" />}
          {dayStatus?.type === 'former-streak' && <FaCheckCircle className="icon-former" />}
          {dayStatus?.type === 'relapse' && <FaTimesCircle className="icon-relapse" />}
        </div>
      </div>
    );
  };

  // Render week view
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
      
      const dayClasses = [
        'week-card',
        dayStatus?.type === 'current-streak' ? 'streak' : '',
        dayStatus?.type === 'former-streak' ? 'former' : '',
        dayStatus?.type === 'relapse' ? 'relapse' : '',
        wetDream ? 'wet-dream' : ''
      ].filter(Boolean).join(' ');
      
      days.push(
        <div key={i} className={dayClasses} onClick={() => openDayModal(day)}>
          <div className="week-card-head">
            <span className="week-day-name">{format(day, 'EEE')}</span>
            <span className={`week-day-num ${isToday ? 'today' : ''}`}>{format(day, 'd')}</span>
          </div>
          
          {dayBenefits && isPremium ? (
            <div className="week-bars">
              <div className="week-bar-row">
                <span>Energy</span>
                <div className="week-bar"><div style={{ width: `${dayBenefits.energy * 10}%` }} /></div>
              </div>
              <div className="week-bar-row">
                <span>Focus</span>
                <div className="week-bar"><div style={{ width: `${dayBenefits.focus * 10}%` }} /></div>
              </div>
              <div className="week-bar-row">
                <span>Confidence</span>
                <div className="week-bar"><div style={{ width: `${dayBenefits.confidence * 10}%` }} /></div>
              </div>
            </div>
          ) : (
            <div className="week-empty">No data</div>
          )}
          
          <div className="week-card-foot">
            <div className="week-icons-left">
              {dayBenefits && <FaInfoCircle />}
              {dayTracking.hasJournal && <FaBook />}
            </div>
            <div className="week-icons-right">
              {wetDream && <FaMoon className="icon-wet" />}
              {dayStatus?.type === 'current-streak' && <FaCheckCircle className="icon-streak" />}
              {dayStatus?.type === 'former-streak' && <FaCheckCircle className="icon-former" />}
              {dayStatus?.type === 'relapse' && <FaTimesCircle className="icon-relapse" />}
            </div>
          </div>
        </div>
      );
    }
    
    return <div className="week-grid">{days}</div>;
  };

  // Render calendar grid
  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const rows = [];
    let daysHeader = [];
    let day = startDate;
    
    for (let i = 0; i < 7; i++) {
      daysHeader.push(
        <div key={`header-${i}`} className="cal-header-day">
          {format(day, 'EEE')}
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(<div className="cal-header" key="header">{daysHeader}</div>);
    
    day = startDate;
    while (day <= endDate) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(renderDayCell(new Date(day), i));
        day = addDays(day, 1);
      }
      rows.push(<div className="cal-row" key={format(day, 'yyyy-MM-dd')}>{week}</div>);
    }
    
    return rows;
  };

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

  return (
    <div className="calendar">
      {/* Header */}
      <div className="cal-top">
        <h1>Calendar</h1>
        <p>Track your journey day by day</p>
        
        <div className="cal-toggle">
          <button 
            className={viewMode === 'month' ? 'active' : ''} 
            onClick={() => setViewMode('month')}
          >
            Month
          </button>
          <button 
            className={viewMode === 'week' ? 'active' : ''} 
            onClick={() => setViewMode('week')}
          >
            Week
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="cal-nav">
        <button onClick={prevPeriod}><FaChevronLeft /></button>
        <span>{getPeriodText()}</span>
        <button onClick={nextPeriod}><FaChevronRight /></button>
      </div>

      {/* Legend */}
      <div className="cal-legend">
        <div><FaCheckCircle className="icon-streak" /> Current</div>
        <div><FaCheckCircle className="icon-former" /> Former</div>
        <div><FaTimesCircle className="icon-relapse" /> Relapse</div>
        <div><FaMoon className="icon-wet" /> Wet Dream</div>
      </div>

      {/* Calendar Grid */}
      <div className="cal-grid">
        {viewMode === 'month' ? renderCalendarDays() : renderWeekView()}
      </div>

      {/* Day Info Modal - Floating like Tracker benefits modal */}
      {showDayModal && selectedDate && (
        <div className="overlay" onClick={closeDayModal}>
          <div className="day-modal" onClick={e => e.stopPropagation()}>
            <h2>{format(selectedDate, 'EEEE, MMM d')}</h2>
            
            {/* Status */}
            {(() => {
              const dayStatus = getDayStatus(selectedDate);
              const dayCount = getDayCount(selectedDate);
              const wetDream = hasWetDream(selectedDate);
              
              if (dayStatus?.type === 'current-streak') {
                return (
                  <p className="status-current">
                    Current streak{dayCount && ` · Day ${dayCount.dayNumber}`}
                    {wetDream && ' + Wet dream'}
                  </p>
                );
              }
              if (dayStatus?.type === 'former-streak') {
                return (
                  <p className="status-former">
                    Former streak{dayCount && ` · Day ${dayCount.dayNumber}${dayCount.totalDays ? `/${dayCount.totalDays}` : ''}`}
                    {wetDream && ' + Wet dream'}
                  </p>
                );
              }
              if (dayStatus?.type === 'relapse') {
                const trigger = triggerOptions.find(t => t.id === dayStatus.trigger);
                return <p className="status-relapse">Relapse{trigger && ` · ${trigger.label}`}</p>;
              }
              if (wetDream) {
                return <p className="status-wet">Wet dream</p>;
              }
              return <p className="status-none">No status recorded</p>;
            })()}

            {/* Benefits */}
            {(() => {
              const benefits = getDayBenefits(selectedDate);
              if (!benefits) return null;
              
              const items = [
                { label: 'Energy', value: benefits.energy },
                { label: 'Focus', value: benefits.focus },
                { label: 'Confidence', value: benefits.confidence },
                { label: 'Aura', value: benefits.aura || 5 },
                { label: 'Sleep', value: benefits.sleep || benefits.attraction || 5 },
                { label: 'Workout', value: benefits.workout || benefits.gymPerformance || 5 }
              ];
              
              return (
                <div className="benefits-section">
                  <h3>Benefits</h3>
                  <div className="benefits-list">
                    {items.map(item => (
                      <div key={item.label} className="benefit-row">
                        <div className="benefit-info">
                          <span>{item.label}</span>
                          <span className="benefit-num">{item.value}</span>
                        </div>
                        <div className="benefit-bar">
                          <div className="benefit-fill" style={{ width: `${item.value * 10}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Journal */}
            <div className="journal-section">
              <h3>Journal</h3>
              
              {isEditingNote ? (
                <div className="journal-edit">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="What's on your mind?"
                    rows="4"
                  />
                  <div className="journal-actions">
                    <button className="btn-ghost" onClick={cancelNote}>Cancel</button>
                    <button className="btn-primary" onClick={saveNote}>Save</button>
                  </div>
                </div>
              ) : noteText ? (
                <div className="journal-view">
                  <p>{noteText}</p>
                  <button className="btn-ghost" onClick={() => setIsEditingNote(true)}>
                    <FaPen /> Edit
                  </button>
                </div>
              ) : (
                <div className="journal-empty">
                  <p>Journaling helps track patterns and maintain accountability.</p>
                  <button className="btn-ghost" onClick={() => setIsEditingNote(true)}>
                    <FaPen /> Add entry
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="modal-actions">
              <button className="btn-ghost" onClick={closeDayModal}>Close</button>
              <button className="btn-primary" onClick={openEditModal}>Edit Day</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Day Modal - Sheet style like Tracker */}
      {showEditModal && selectedDate && (
        <div className="overlay" onClick={closeEditModal}>
          {!showTriggerSelect ? (
            <div className="sheet" onClick={e => e.stopPropagation()}>
              <div className="sheet-content">
                <button onClick={handleMarkStreak}>
                  <FaCheckCircle /> Mark as streak day
                </button>
                <div className="sheet-divider" />
                <button onClick={handleMarkWetDream}>
                  <FaMoon /> Log wet dream
                </button>
                <div className="sheet-divider" />
                <button className="danger" onClick={handleMarkRelapse}>
                  <FaTimesCircle /> Log relapse
                </button>
              </div>
              <button className="cancel" onClick={backToDay}>Back</button>
              <button className="cancel" onClick={closeEditModal}>Cancel</button>
            </div>
          ) : (
            <div className="trigger-modal" onClick={e => e.stopPropagation()}>
              <h2>What triggered this?</h2>
              <p>Select what led to your relapse</p>
              
              <div className="trigger-grid">
                {triggerOptions.map(trigger => (
                  <button
                    key={trigger.id}
                    className={`trigger-btn ${selectedTrigger === trigger.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTrigger(trigger.id)}
                  >
                    <trigger.icon />
                    <span>{trigger.label}</span>
                  </button>
                ))}
              </div>
              
              <div className="modal-actions">
                <button className="btn-ghost" onClick={() => setShowTriggerSelect(false)}>Back</button>
                <button 
                  className="btn-primary" 
                  onClick={confirmRelapse}
                  disabled={!selectedTrigger}
                >
                  Confirm
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Calendar;