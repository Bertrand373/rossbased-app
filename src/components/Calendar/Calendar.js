// components/Calendar/Calendar.js - UPDATED: Enhanced card-based monthly view
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, 
  isSameDay, subMonths, addMonths, parseISO, differenceInDays, isAfter, isBefore, 
  startOfWeek as getWeekStart, addWeeks, subWeeks } from 'date-fns';
import toast from 'react-hot-toast';
import './CalendarBase.css';
import './CalendarModalBase.css';
import './CalendarModalContent.css';

// Icons - Fixed imports
import { FaCheckCircle, FaTimesCircle, FaMoon, 
  FaInfoCircle, FaEdit, FaExclamationTriangle, FaFrown, 
  FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaTheaterMasks, FaArrowLeft, FaEye, FaTimes, 
  FaWineBottle, FaBed, FaRegMoon, FaAdjust, FaPen, FaBook, FaChevronLeft, FaChevronRight,
  FaCalendarAlt, FaCalendarWeek } from 'react-icons/fa';

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

  // Journal editing states
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  // FIXED: Profile-style navigation with mobile-first state management
  const navigationRef = useRef(null);
  const navigationSliderRef = useRef(null);
  const [isNavigationSliderInitialized, setIsNavigationSliderInitialized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigationResizeTimeoutRef = useRef(null);

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

  // Mobile detection for sliding animation
  const detectMobile = useCallback(() => {
    const isMobileDevice = window.innerWidth <= 768 || 'ontouchstart' in window;
    setIsMobile(isMobileDevice);
    return isMobileDevice;
  }, []);

  // FIXED: Enhanced navigation slider positioning matching Profile component
  const updateNavigationSlider = useCallback(() => {
    if (!navigationRef.current || !navigationSliderRef.current) {
      return false;
    }
    
    try {
      const navigationContainer = navigationRef.current;
      const slider = navigationSliderRef.current;
      const activeNavElement = navigationContainer.querySelector(`[data-view="${viewMode}"]`);
      
      if (!activeNavElement) {
        console.warn(`Navigation element not found: ${viewMode}`);
        return false;
      }

      requestAnimationFrame(() => {
        try {
          const containerRect = navigationContainer.getBoundingClientRect();
          const navRect = activeNavElement.getBoundingClientRect();
          
          if (containerRect.width === 0 || navRect.width === 0) {
            console.warn('Invalid measurements, navigation container or element not rendered');
            return;
          }

          // Match Profile component's exact calculation
          const containerStyle = window.getComputedStyle(navigationContainer);
          const paddingLeft = Math.round(parseFloat(containerStyle.paddingLeft) || 8);
          
          const leftOffset = Math.round(navRect.left - containerRect.left - paddingLeft);
          const navWidth = navRect.width;
          
          slider.style.transform = `translateX(${Math.round(leftOffset)}px)`;
          slider.style.width = `${Math.round(navWidth)}px`;
          slider.style.opacity = '1';
          slider.style.visibility = 'visible';
          
        } catch (innerError) {
          console.error('Inner navigation slider positioning failed:', innerError);
        }
      });
      
      return true;
      
    } catch (error) {
      console.error('Navigation slider update failed:', error);
      return false;
    }
  }, [viewMode]);

  // Clean navigation change handler
  const handleViewModeChange = useCallback((newViewMode) => {
    if (newViewMode === viewMode) return;
    
    setViewMode(newViewMode);
    
    if (isMobile) {
      setTimeout(() => updateNavigationSlider(), 10);
    }
  }, [viewMode, isMobile, updateNavigationSlider]);

  // Proper navigation slider initialization
  useEffect(() => {
    const initializeNavigationSlider = () => {
      detectMobile();
      
      if (!navigationRef.current || !navigationSliderRef.current) {
        return;
      }

      requestAnimationFrame(() => {
        const success = updateNavigationSlider();
        
        if (success) {
          setIsNavigationSliderInitialized(true);
        } else {
          setTimeout(() => {
            if (updateNavigationSlider()) {
              setIsNavigationSliderInitialized(true);
            } else {
              if (navigationSliderRef.current) {
                navigationSliderRef.current.style.opacity = '1';
                navigationSliderRef.current.style.visibility = 'visible';
                setIsNavigationSliderInitialized(true);
                setTimeout(updateNavigationSlider, 50);
              }
            }
          }, 100);
        }
      });
    };

    const timer = setTimeout(initializeNavigationSlider, 100);
    
    return () => clearTimeout(timer);
  }, [updateNavigationSlider, detectMobile]);

  // Basic resize handling for navigation slider
  useEffect(() => {
    const handleNavigationResize = () => {
      detectMobile();
      
      if (navigationResizeTimeoutRef.current) {
        clearTimeout(navigationResizeTimeoutRef.current);
      }
      
      navigationResizeTimeoutRef.current = setTimeout(() => {
        if (isNavigationSliderInitialized) {
          updateNavigationSlider();
        }
      }, 100);
    };

    window.addEventListener('resize', handleNavigationResize);
    
    return () => {
      window.removeEventListener('resize', handleNavigationResize);
      
      if (navigationResizeTimeoutRef.current) {
        clearTimeout(navigationResizeTimeoutRef.current);
      }
    };
  }, [isNavigationSliderInitialized, detectMobile, updateNavigationSlider]);

  // Update slider when view mode changes
  useEffect(() => {
    if (isNavigationSliderInitialized) {
      setTimeout(updateNavigationSlider, 10);
    }
  }, [viewMode, isNavigationSliderInitialized, updateNavigationSlider]);

  // Cleanup navigation timeouts on unmount
  useEffect(() => {
    return () => {
      if (navigationResizeTimeoutRef.current) {
        clearTimeout(navigationResizeTimeoutRef.current);
      }
    };
  }, []);

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

  // UPDATED: Helper function to determine day status (wet dreams no longer break streaks)
  const getDayStatus = (day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    day.setHours(0, 0, 0, 0);
    
    if (isAfter(day, today)) {
      return null;
    }
    
    // Check for relapse days (these still break streaks)
    const relapseDay = userData.streakHistory?.find(streak => 
      streak.end && streak.reason === 'relapse' && isSameDay(new Date(streak.end), day)
    );
    
    if (relapseDay) {
      return { type: 'relapse', trigger: relapseDay.trigger };
    }
    
    // Check for former streak days (completed streaks)
    const formerStreak = userData.streakHistory?.find(streak => {
      if (!streak.start || !streak.end) return false;
      const streakStart = new Date(streak.start);
      const streakEnd = new Date(streak.end);
      streakStart.setHours(0, 0, 0, 0);
      streakEnd.setHours(0, 0, 0, 0);
      
      return day >= streakStart && day < streakEnd;
    });
    
    if (formerStreak) {
      return { type: 'former-streak' };
    }
    
    // Check for current streak days
    const currentStreak = userData.streakHistory?.find(streak => 
      streak.start && !streak.end
    );
    
    if (currentStreak) {
      const streakStart = new Date(currentStreak.start);
      streakStart.setHours(0, 0, 0, 0);
      
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

  // UPDATED: Get day count with total streak context for former streaks
  const getDayCount = (day) => {
    const dayStatus = getDayStatus(day);
    
    if (!dayStatus || (dayStatus.type !== 'current-streak' && dayStatus.type !== 'former-streak')) {
      return null;
    }
    
    if (dayStatus.type === 'current-streak') {
      const currentStreak = userData.streakHistory?.find(streak => 
        streak.start && !streak.end
      );
      
      if (currentStreak) {
        const streakStart = new Date(currentStreak.start);
        const dayNumber = differenceInDays(day, streakStart) + 1;
        return { 
          dayNumber: dayNumber > 0 ? dayNumber : 0,
          totalDays: null // Current streak has no total yet
        };
      }
    }
    
    if (dayStatus.type === 'former-streak') {
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
        return { 
          dayNumber: dayNumber > 0 ? dayNumber : 0,
          totalDays: formerStreak.days
        };
      }
    }
    
    return null;
  };

  // NEW: Check if day has wet dream (separate from status to allow overlay)
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

  // Show day details with edit option
  const showDayDetails = (day) => {
    setSelectedDate(day);
    setEditingDate(day);
    
    const dayStr = format(day, 'yyyy-MM-dd');
    const existingNote = userData.notes && userData.notes[dayStr];
    setNoteText(existingNote || '');
    setIsEditingNote(false);
    
    setDayInfoModal(true);
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

  // Handle note editing functions
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
    if (!selectedDate || !updateUserData) {
      console.error('Missing selectedDate or updateUserData function');
      return;
    }

    const dayStr = format(selectedDate, 'yyyy-MM-dd');
    const updatedNotes = { ...userData.notes };
    
    if (noteText.trim()) {
      updatedNotes[dayStr] = noteText.trim();
      toast.success('Journal entry saved!');
    } else {
      delete updatedNotes[dayStr];
      toast.success('Journal entry removed!');
    }
    
    updateUserData({ notes: updatedNotes });
    setIsEditingNote(false);
  };

  // Handle status button click with proper trigger flow
  const handleStatusClick = (status) => {
    if (status === 'relapse') {
      setPendingStatusUpdate(status);
      setShowTriggerSelection(true);
    } else {
      updateDayStatus(status);
    }
  };

  // Handle trigger selection and final update
  const handleTriggerSelection = () => {
    if (pendingStatusUpdate === 'relapse') {
      updateDayStatus('relapse');
    }
  };

  // Enhanced day status update with CORRECT relapse logic
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
        
      default:
        break;
    }
    
    if (updatedUserData !== userData) {
      updateUserData(updatedUserData);
    }
    
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
    const benefits = userData.benefitTracking.find(benefit => 
      isSameDay(new Date(benefit.date), day)
    );
    
    if (benefits && !benefits.sleep && benefits.attraction) {
      return {
        ...benefits,
        sleep: benefits.attraction
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

  // ENHANCED: Card-based month view day cell with benefits preview
  const renderDayCell = (day, dayIndex) => {
    const dayStatus = getDayStatus(day);
    const dayBenefits = getDayBenefits(day);
    const dayTracking = getDayTracking(day);
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    const isToday = isSameDay(day, new Date());
    const isCurrentMonth = isSameMonth(day, currentDate);
    const wetDream = hasWetDream(day);
    const dayCount = getDayCount(day);
    
    const dayClasses = [
      'day-cell',
      !isCurrentMonth ? 'other-month' : '',
      isToday ? 'today' : '',
      isSelected ? 'selected' : '',
      dayStatus?.type === 'current-streak' ? 'current-streak-day' : '',
      dayStatus?.type === 'former-streak' ? 'former-streak-day' : '',
      dayStatus?.type === 'relapse' ? 'relapse-day' : '',
      wetDream ? 'wet-dream-day' : '',
      !dayStatus && !dayBenefits && !dayTracking.hasJournal ? 'empty-day' : ''
    ].filter(Boolean).join(' ');

    return (
      <div 
        key={dayIndex} 
        className={dayClasses}
        onClick={() => showDayDetails(day)}
      >
        {dayCount && (
          <div className="day-count-display">
            Day {dayCount.dayNumber}
          </div>
        )}
        
        <div className="day-content">
          <div className="day-number">{format(day, 'd')}</div>
          
          {dayTracking.hasJournal && (
            <div className="day-journal-indicator-top">
              <FaBook className="journal-icon-top" />
            </div>
          )}
        </div>
        
        {dayBenefits && isPremium ? (
          <div className="day-benefits-preview">
            <div className="monthly-benefit-mini">
              <div className="monthly-benefit-label">Energy</div>
              <div className="monthly-benefit-bar">
                <div 
                  className="monthly-benefit-fill" 
                  style={{ width: `${dayBenefits.energy * 10}%` }}
                ></div>
              </div>
              <div className="monthly-benefit-value">{dayBenefits.energy}</div>
            </div>
            
            <div className="monthly-benefit-mini">
              <div className="monthly-benefit-label">Focus</div>
              <div className="monthly-benefit-bar">
                <div 
                  className="monthly-benefit-fill" 
                  style={{ width: `${dayBenefits.focus * 10}%` }}
                ></div>
              </div>
              <div className="monthly-benefit-value">{dayBenefits.focus}</div>
            </div>
            
            <div className="monthly-benefit-mini">
              <div className="monthly-benefit-label">Confidence</div>
              <div className="monthly-benefit-bar">
                <div 
                  className="monthly-benefit-fill" 
                  style={{ width: `${dayBenefits.confidence * 10}%` }}
                ></div>
              </div>
              <div className="monthly-benefit-value">{dayBenefits.confidence}</div>
            </div>
          </div>
        ) : !dayStatus && !dayTracking.hasJournal ? (
          <div className="empty-day-content">
            No data
          </div>
        ) : null}
        
        <div className="day-card-footer">
          <div className="monthly-secondary-icons">
            {dayStatus?.trigger && (
              <div className="monthly-secondary-icon">
                {renderTriggerIcon(dayStatus.trigger)}
              </div>
            )}
          </div>
          
          <div className="day-indicators">
            {wetDream && (
              <div className="monthly-status-icon wet-dream">
                <FaMoon />
              </div>
            )}
            {dayStatus && (
              <div className={`monthly-status-icon ${
                dayStatus.type === 'current-streak' ? 'success' :
                dayStatus.type === 'former-streak' ? 'former-success' :
                dayStatus.type === 'relapse' ? 'relapse' : ''
              }`}>
                {(dayStatus.type === 'current-streak' || dayStatus.type === 'former-streak') && 
                  <FaCheckCircle />}
                {dayStatus.type === 'relapse' && <FaTimesCircle />}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // NEW: Option 1 - Card-Based Week View with Premium Benefits Display
  const renderWeekView = () => {
    const { weekStart } = getWeekRange(currentDate);
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayStatus = getDayStatus(day);
      const dayBenefits = getDayBenefits(day);
      const dayTracking = getDayTracking(day);
      const wetDream = hasWetDream(day);
      
      const dayClasses = [
        'week-day-cell',
        dayStatus?.type === 'current-streak' ? 'current-streak-day' : '',
        dayStatus?.type === 'former-streak' ? 'former-streak-day' : '',
        dayStatus?.type === 'relapse' ? 'relapse-day' : '',
        wetDream ? 'wet-dream-day' : ''
      ].filter(Boolean).join(' ');
      
      days.push(
        <div key={i} className={dayClasses} onClick={() => showDayDetails(day)}>
          <div className="week-day-header">
            <div className="week-day-name">{format(day, 'EEE')}</div>
            <div className={`week-day-number ${isSameDay(day, new Date()) ? 'today' : ''}`}>
              {format(day, 'd')}
            </div>
          </div>
          
          {/* Premium Benefits Section */}
          {dayBenefits && isPremium ? (
            <div className="week-benefits-prominent">
              <div className="week-benefit-row">
                <div className="week-benefit-content">
                  <div className="week-benefit-label">Energy</div>
                  <div className="week-benefit-bar">
                    <div 
                      className="week-benefit-fill" 
                      style={{ width: `${dayBenefits.energy * 10}%` }}
                    ></div>
                  </div>
                </div>
                <div className="week-benefit-value">{dayBenefits.energy}</div>
              </div>
              
              <div className="week-benefit-row">
                <div className="week-benefit-content">
                  <div className="week-benefit-label">Focus</div>
                  <div className="week-benefit-bar">
                    <div 
                      className="week-benefit-fill" 
                      style={{ width: `${dayBenefits.focus * 10}%` }}
                    ></div>
                  </div>
                </div>
                <div className="week-benefit-value">{dayBenefits.focus}</div>
              </div>
              
              <div className="week-benefit-row">
                <div className="week-benefit-content">
                  <div className="week-benefit-label">Confidence</div>
                  <div className="week-benefit-bar">
                    <div 
                      className="week-benefit-fill" 
                      style={{ width: `${dayBenefits.confidence * 10}%` }}
                    ></div>
                  </div>
                </div>
                <div className="week-benefit-value">{dayBenefits.confidence}</div>
              </div>
            </div>
          ) : (
            <div className="week-empty-benefits">
              No benefits logged
            </div>
          )}
          
          {/* Clean Footer */}
          <div className="week-day-footer">
            <div className="week-secondary-icons">
              {dayTracking.hasJournal && (
                <div className="week-secondary-icon has-journal">
                  <FaBook />
                </div>
              )}
              {dayStatus?.trigger && (
                <div className="week-secondary-icon has-trigger">
                  {renderTriggerIcon(dayStatus.trigger)}
                </div>
              )}
            </div>
            
            <div className="week-primary-status">
              {wetDream && (
                <div className="week-status-icon wet-dream">
                  <FaMoon />
                </div>
              )}
              {dayStatus && (
                <div className={`week-status-icon ${
                  dayStatus.type === 'current-streak' ? 'success' :
                  dayStatus.type === 'former-streak' ? 'former-success' :
                  dayStatus.type === 'relapse' ? 'relapse' : ''
                }`}>
                  {(dayStatus.type === 'current-streak' || dayStatus.type === 'former-streak') && 
                    <FaCheckCircle />}
                  {dayStatus.type === 'relapse' && <FaTimesCircle />}
                </div>
              )}
            </div>
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
      {/* FIXED: Integrated header design with Profile-style navigation pills */}
      <div className="integrated-calendar-header">
        <div className="header-title-section">
          <h2>Streak Calendar</h2>
          <p className="header-subtitle">Visualize your journey and track your progress</p>
        </div>
        
        <div className="header-navigation-section">
          {/* FIXED: Profile-style sliding navigation pills container */}
          <div 
            className="calendar-navigation-pills"
            ref={navigationRef}
          >
            {/* Enhanced sliding indicator with mobile optimizations */}
            <div 
              className="calendar-nav-slider" 
              ref={navigationSliderRef}
              style={{ 
                opacity: 0,
                visibility: 'hidden',
                transform: 'translateX(0px)',
                width: '0px'
              }}
            />
            
            {/* Navigation buttons with icons */}
            <button 
              className={`calendar-nav-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('month')}
              data-view="month"
            >
              <FaCalendarAlt />
              <span>Month</span>
            </button>
            <button 
              className={`calendar-nav-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('week')}
              data-view="week"
            >
              <FaCalendarWeek />
              <span>Week</span>
            </button>
          </div>
        </div>
      </div>

      <div className="calendar-main-section">
        {/* FIXED: Period Navigation with working Font Awesome icons */}
        <div className="calendar-period-navigation">
          <button className="period-nav-btn" onClick={prevPeriod}>
            <FaChevronLeft />
          </button>
          <h3>{getPeriodHeaderText()}</h3>
          <button className="period-nav-btn" onClick={nextPeriod}>
            <FaChevronRight />
          </button>
        </div>

        {/* UPDATED: Icon-based legend using actual calendar symbols with refined labels */}
        <div className="calendar-legend-compact">
          <div className="compact-legend-item">
            <FaCheckCircle className="compact-legend-icon current-streak" />
            <span>Current Streak</span>
          </div>
          <div className="compact-legend-item">
            <FaCheckCircle className="compact-legend-icon former-streak" />
            <span>Former Streak</span>
          </div>
          <div className="compact-legend-item">
            <FaTimesCircle className="compact-legend-icon relapse" />
            <span>Relapse Day</span>
          </div>
          <div className="compact-legend-item">
            <FaMoon className="compact-legend-icon wet-dream" />
            <span>Wet Dream</span>
          </div>
          <div className="compact-legend-item">
            <FaInfoCircle className="compact-legend-icon logged-benefits" />
            <span>Logged Benefits</span>
          </div>
          <div className="compact-legend-item">
            <FaBook className="compact-legend-icon journal" />
            <span>Journal Entry</span>
          </div>
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

      {/* Day Info Modal with journal editing functionality */}
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
            
            <h3>{format(selectedDate, 'EEE, MMM d, yyyy')}</h3>
            
            {/* UPDATED: Day Status with enhanced day count and wet dream overlay */}
            <div className="day-status-info">
              {(() => {
                const dayStatus = getDayStatus(selectedDate);
                const dayCount = getDayCount(selectedDate);
                const wetDream = hasWetDream(selectedDate);
                
                if (dayStatus) {
                  return (
                    <div className={`status-badge ${dayStatus.type}`}>
                      {dayStatus.type === 'current-streak' && (
                        <>
                          <FaCheckCircle />
                          <span>
                            Current Streak Day
                            {dayCount && <span className="day-count"> • Day {dayCount.dayNumber}</span>}
                            {wetDream && <span className="wet-dream-overlay"> + Wet Dream</span>}
                          </span>
                        </>
                      )}
                      {dayStatus.type === 'former-streak' && (
                        <>
                          <FaCheckCircle />
                          <span>
                            Former Streak Day
                            {dayCount && (
                              <span className="day-count">
                                {dayCount.totalDays ? 
                                  ` • Day ${dayCount.dayNumber} of ${dayCount.totalDays}` : 
                                  ` • Day ${dayCount.dayNumber}`
                                }
                              </span>
                            )}
                            {wetDream && <span className="wet-dream-overlay"> + Wet Dream</span>}
                          </span>
                        </>
                      )}
                      {dayStatus.type === 'relapse' && (
                        <>
                          <FaTimesCircle />
                          <span>Relapse Day</span>
                        </>
                      )}
                    </div>
                  );
                } else if (wetDream) {
                  return (
                    <div className="status-badge wet-dream">
                      <FaMoon />
                      <span>Wet Dream</span>
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

            {/* Journal Entry Section */}
            <div className="day-journal">
              <div className="journal-header-with-actions">
                <h4>Journal Entry</h4>
                {!isEditingNote && noteText && (
                  <button 
                    className="action-btn journal-edit-btn"
                    onClick={startEditingNote}
                  >
                    <FaPen />
                    <span>Edit</span>
                  </button>
                )}
              </div>
              
              {isEditingNote ? (
                <div className="journal-editing">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows="4"
                    className="journal-textarea"
                    placeholder="How were you feeling on this day? What benefits or challenges did you experience?"
                  />
                  <div className="journal-edit-actions">
                    <button 
                      className="action-btn journal-save-btn"
                      onClick={saveNote}
                    >
                      <FaCheckCircle />
                      <span>Save</span>
                    </button>
                    <button 
                      className="action-btn journal-cancel-btn"
                      onClick={cancelEditingNote}
                    >
                      <FaTimes />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ) : (
                noteText && (
                  <div className="journal-entry">
                    {noteText}
                  </div>
                )
              )}
            </div>

            {/* Banner for empty journal */}
            {!isEditingNote && !noteText && (
              <>
                <div className="journal-benefits-banner">
                  <div className="journal-benefits-helmet-container">
                    <img 
                      className="journal-benefits-helmet" 
                      src="/helmet.png" 
                      alt="Start Journaling" 
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'block';
                      }}
                    />
                    <div className="journal-benefits-helmet-fallback" style={{ display: 'none' }}>
                      🛡️
                    </div>
                  </div>
                  
                  <div className="journal-benefits-content">
                    <h4 className="journal-benefits-title">
                      What's on your mind?
                    </h4>
                    <p className="journal-benefits-description">
                      Regular journaling helps track emotional patterns, identify triggers, celebrate victories, and maintain accountability. Users who journal consistently report better streak maintenance and deeper self-understanding throughout their journey.
                    </p>
                  </div>
                </div>

                <div className="journal-start-section">
                  <button 
                    className="action-btn journal-edit-btn"
                    onClick={startEditingNote}
                  >
                    <FaPen />
                    <span>Add Journal Entry</span>
                  </button>
                </div>
              </>
            )}

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