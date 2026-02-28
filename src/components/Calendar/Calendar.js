// components/Calendar/Calendar.js - TITANTRACK ELITE
// Two CSS files: CalendarBase.css + CalendarModals.css
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, 
  isSameDay, subMonths, addMonths, differenceInDays, isAfter,
  startOfWeek as getWeekStart, addWeeks, subWeeks } from 'date-fns';
import toast from 'react-hot-toast';
import './CalendarBase.css';
import './CalendarModals.css';
import '../../styles/BottomSheet.css';

import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

// NEW: Import InterventionService for ML feedback loop
import interventionService from '../../services/InterventionService';

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

// Tiny dumbbell SVG for calendar day cells — two-plate clean
const DumbbellGlyph = ({ size = 10 }) => (
  <svg width={size} height={Math.round(size * 0.56)} viewBox="0 0 32 18" fill="currentColor" style={{ display: 'block' }}>
    <rect x="0" y="0" width="4" height="18" rx="2" />
    <rect x="5.5" y="3" width="3.5" height="12" rx="1.75" />
    <rect x="9" y="6.5" width="14" height="5" rx="2.5" />
    <rect x="23" y="3" width="3.5" height="12" rx="1.75" />
    <rect x="28" y="0" width="4" height="18" rx="2" />
  </svg>
);

// Dumbbell icon for day info sheet header — two-plate clean, outlined/filled
const DumbbellIcon = ({ size = 18, filled = false }) => (
  <svg width={size} height={Math.round(size * 0.56)} viewBox="0 0 32 18" style={{ display: 'block' }}>
    {filled ? (
      <g fill="currentColor">
        <rect x="0" y="0" width="4" height="18" rx="2" />
        <rect x="5.5" y="3" width="3.5" height="12" rx="1.75" />
        <rect x="9" y="6.5" width="14" height="5" rx="2.5" />
        <rect x="23" y="3" width="3.5" height="12" rx="1.75" />
        <rect x="28" y="0" width="4" height="18" rx="2" />
      </g>
    ) : (
      <g fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="0.65" y="0.65" width="2.7" height="16.7" rx="1.35" />
        <rect x="6.15" y="3.65" width="2.2" height="10.7" rx="1.1" />
        <rect x="9.65" y="7.15" width="12.7" height="3.7" rx="1.85" />
        <rect x="23.65" y="3.65" width="2.2" height="10.7" rx="1.1" />
        <rect x="28.65" y="0.65" width="2.7" height="16.7" rx="1.35" />
      </g>
    )}
  </svg>
);

const Calendar = ({ userData, isPremium, updateUserData, openPlanModal }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayInfoModal, setDayInfoModal] = useState(false);
  const [sheetView, setSheetView] = useState('info'); // 'info' | 'edit' | 'workout'
  const [viewMode, setViewMode] = useState('month');
  const [viewFading, setViewFading] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [showTriggerSelection, setShowTriggerSelection] = useState(false);
  const [editingExistingTrigger, setEditingExistingTrigger] = useState(false);

  // Moon detail modal state
  const [moonDetailModal, setMoonDetailModal] = useState(false);
  const [selectedMoonDate, setSelectedMoonDate] = useState(null);

  // Overlay animation state
  const [calSheetReady, setCalSheetReady] = useState(false);
  const calSheetPanelRef = useRef(null);
  const calSheetTouchStartY = useRef(0);
  const calSheetTouchDeltaY = useRef(0);
  const calSheetIsDragging = useRef(false);

  // Journal states
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  // Swipe navigation state
  const [swipeAnim, setSwipeAnim] = useState(null); // 'left' | 'right' | null
  const [initialAnimDone, setInitialAnimDone] = useState(false);
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const swipeLocked = useRef(false);

  // Workout log states
  const [workoutExercises, setWorkoutExercises] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(null); // index of active suggestion dropdown
  const [swipedExerciseId, setSwipedExerciseId] = useState(null); // exercise showing delete
  const exerciseTouchStartX = useRef(0);

  // Mark initial entrance animation as complete
  useEffect(() => {
    const timer = setTimeout(() => setInitialAnimDone(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // Smooth view toggle with fade transition
  const handleViewToggle = (newMode) => {
    if (newMode === viewMode || viewFading) return;
    setViewFading(true);
    setTimeout(() => {
      setViewMode(newMode);
      setViewFading(false);
    }, 180);
  };
  // Sheet animation: trigger .open class for Day Info + Moon Detail
  useEffect(() => {
    if (dayInfoModal || moonDetailModal) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCalSheetReady(true));
      });
    } else {
      setCalSheetReady(false);
    }
  }, [dayInfoModal, moonDetailModal]);

  // Animate sheet out then run callback
  const closeCalSheet = useCallback((callback) => {
    setCalSheetReady(false);
    setTimeout(() => {
      callback();
    }, 300);
  }, []);

  // Swipe-to-close for sheets (mobile)
  const handleCalSheetTouchStart = useCallback((e) => {
    calSheetTouchStartY.current = e.touches[0].clientY;
    calSheetTouchDeltaY.current = 0;
    calSheetIsDragging.current = false;
  }, []);

  const handleCalSheetTouchMove = useCallback((e) => {
    const delta = e.touches[0].clientY - calSheetTouchStartY.current;
    if (delta < 0) return;
    if (delta > 10) {
      calSheetIsDragging.current = true;
      calSheetTouchDeltaY.current = delta;
      if (calSheetPanelRef.current) {
        calSheetPanelRef.current.style.transition = 'none';
        calSheetPanelRef.current.style.transform = `translateY(${delta}px)`;
      }
    }
  }, []);

  const handleCalSheetTouchEnd = useCallback(() => {
    if (!calSheetIsDragging.current) return;
    if (calSheetTouchDeltaY.current > 100 && calSheetPanelRef.current) {
      calSheetPanelRef.current.style.transition = 'transform 250ms ease-out';
      calSheetPanelRef.current.style.transform = 'translateY(100%)';
      setCalSheetReady(false);
      setTimeout(() => {
        if (calSheetPanelRef.current) {
          calSheetPanelRef.current.style.transition = '';
          calSheetPanelRef.current.style.transform = '';
        }
        setDayInfoModal(false);
        setMoonDetailModal(false);
        setSelectedDate(null);
        setSelectedMoonDate(null);
        setIsEditingNote(false);
        setNoteText('');
        setSheetView('info');
        setShowTriggerSelection(false);
        setEditingExistingTrigger(false);
        setSelectedTrigger('');
        setWorkoutExercises([]);
        setShowSuggestions(null);
        setSwipedExerciseId(null);
      }, 250);
    } else if (calSheetPanelRef.current) {
      calSheetPanelRef.current.style.transition = 'transform 250ms ease-out';
      calSheetPanelRef.current.style.transform = '';
      setTimeout(() => {
        if (calSheetPanelRef.current) {
          calSheetPanelRef.current.style.transition = '';
        }
      }, 250);
    }
    calSheetIsDragging.current = false;
    calSheetTouchDeltaY.current = 0;
  }, []);


  // Get trigger options from unified constants (Calendar shows ALL triggers)
  const triggerOptions = getAllTriggers().map(t => ({
    id: t.id,
    label: t.label
  }));

  // Navigation with slide animation
  const prevPeriod = () => {
    setSwipeAnim('right');
    setTimeout(() => {
      setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
      setTimeout(() => setSwipeAnim(null), 300);
    }, 10);
  };

  const nextPeriod = () => {
    setSwipeAnim('left');
    setTimeout(() => {
      setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
      setTimeout(() => setSwipeAnim(null), 300);
    }, 10);
  };

  const getWeekRange = (date) => {
    const weekStart = getWeekStart(date);
    const weekEnd = addDays(weekStart, 6);
    return { weekStart, weekEnd };
  };

  // Swipe navigation on calendar grid
  const handleSwipeStart = useCallback((e) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    swipeLocked.current = false;
  }, []);

  const handleSwipeEnd = useCallback((e) => {
    if (swipeLocked.current) return;
    const deltaX = e.changedTouches[0].clientX - swipeStartX.current;
    const deltaY = e.changedTouches[0].clientY - swipeStartY.current;
    
    // Only trigger if horizontal swipe is dominant and exceeds threshold
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      swipeLocked.current = true;
      if (deltaX < 0) {
        // Swiped left → next period
        setSwipeAnim('left');
        setTimeout(() => {
          setCurrentDate(prev => viewMode === 'month' ? addMonths(prev, 1) : addWeeks(prev, 1));
          setTimeout(() => setSwipeAnim(null), 300);
        }, 10);
      } else {
        // Swiped right → previous period
        setSwipeAnim('right');
        setTimeout(() => {
          setCurrentDate(prev => viewMode === 'month' ? subMonths(prev, 1) : subWeeks(prev, 1));
          setTimeout(() => setSwipeAnim(null), 300);
        }, 10);
      }
    }
  }, [viewMode]);

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

  // Check if a day has workout data
  const getDayWorkout = (day) => {
    if (!userData.workoutLog || userData.workoutLog.length === 0) return null;
    const dayStr = format(day, 'yyyy-MM-dd');
    return userData.workoutLog.find(w => 
      format(new Date(w.date), 'yyyy-MM-dd') === dayStr
    ) || null;
  };

  // Get exercise name suggestions from history
  const getExerciseSuggestions = (input) => {
    if (!userData.workoutLog || !input || input.length < 2) return [];
    const allNames = userData.workoutLog.flatMap(w => 
      (w.exercises || []).map(e => e.name)
    ).filter(Boolean);
    
    // Count frequency
    const freq = {};
    allNames.forEach(name => {
      const lower = name.toLowerCase();
      if (!freq[lower]) freq[lower] = { count: 0, display: name };
      freq[lower].count++;
    });
    
    // Filter by input, sort by frequency, exclude exact matches
    const inputLower = input.toLowerCase();
    return Object.values(freq)
      .filter(f => f.display.toLowerCase().includes(inputLower) && f.display.toLowerCase() !== inputLower)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(f => f.display);
  };

  // Check if user has enough workout history for suggestions (3+ lifetime entries)
  const hasEnoughWorkoutHistory = (userData.workoutLog || [])
    .reduce((total, w) => total + (w.exercises || []).length, 0) >= 3;

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
    setSheetView('info');
    setShowTriggerSelection(false);
    setEditingExistingTrigger(false);
    setSelectedTrigger('');
    setDayInfoModal(true);
  };

  const closeDayInfo = () => {
    setDayInfoModal(false);
    setSelectedDate(null);
    setIsEditingNote(false);
    setNoteText('');
    setSheetView('info');
    setShowTriggerSelection(false);
    setEditingExistingTrigger(false);
    setSelectedTrigger('');
    setWorkoutExercises([]);
    setShowSuggestions(null);
    setSwipedExerciseId(null);
  };

  const showEditFromInfo = () => {
    // Slide info sheet down, then switch view and slide edit sheet up
    setCalSheetReady(false);
    setTimeout(() => {
      setSheetView('edit');
      setSelectedTrigger('');
      setShowTriggerSelection(false);
      setEditingExistingTrigger(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCalSheetReady(true));
      });
    }, 300);
  };

  // Open workout sheet from day info — staggered transition
  // Smart template — learns your routine
  // Priority: 1) same weekday match  2) most recent workout  3) empty
  const getTemplateForDay = (date) => {
    const workoutLog = userData.workoutLog || [];
    if (workoutLog.length === 0) return null;
    
    const dayOfWeek = new Date(date).getDay();
    const dateStr = format(new Date(date), 'yyyy-MM-dd');
    
    const toTemplate = (workout) => {
      if (!workout?.exercises?.length) return null;
      return workout.exercises.map((e, i) => ({
        id: `ex-${i}-${Date.now()}`,
        name: e.name || '',
        weight: e.weight || '',
        sets: e.sets || '',
        reps: e.reps || '',
        restMinutes: e.restMinutes || ''
      }));
    };
    
    // 1) Same day of week — best match for fixed-schedule users
    const sameDayWorkouts = workoutLog
      .filter(w => new Date(w.date).getDay() === dayOfWeek && format(new Date(w.date), 'yyyy-MM-dd') !== dateStr)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (sameDayWorkouts.length > 0) {
      const t = toTemplate(sameDayWorkouts[0]);
      if (t) return t;
    }
    
    // 2) Fallback — most recent workout regardless of day
    //    Covers 48hr rotators, feel-based, random schedule users
    const allSorted = workoutLog
      .filter(w => format(new Date(w.date), 'yyyy-MM-dd') !== dateStr)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (allSorted.length > 0) {
      return toTemplate(allSorted[0]);
    }
    
    return null;
  };

  const openWorkoutSheet = () => {
    const existing = getDayWorkout(selectedDate);
    if (existing && existing.exercises && existing.exercises.length > 0) {
      // Existing workout — load it
      setWorkoutExercises(existing.exercises.map((e, i) => ({ ...e, id: `ex-${i}-${Date.now()}` })));
    } else {
      // No existing workout — check for day-of-week template
      const template = getTemplateForDay(selectedDate);
      setWorkoutExercises(template || []);
    }
    setShowSuggestions(null);
    setSwipedExerciseId(null);
    
    setCalSheetReady(false);
    setTimeout(() => {
      setSheetView('workout');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCalSheetReady(true));
      });
    }, 300);
  };

  // Workout exercise CRUD
  const addExerciseRow = () => {
    setWorkoutExercises(prev => [...prev, {
      id: `ex-${Date.now()}`,
      name: '',
      weight: '',
      sets: '',
      reps: '',
      restMinutes: ''
    }]);
    setSwipedExerciseId(null);
  };

  const updateExercise = (id, field, value) => {
    setWorkoutExercises(prev => prev.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  const deleteExercise = (id) => {
    setWorkoutExercises(prev => prev.filter(e => e.id !== id));
    setSwipedExerciseId(null);
  };

  // Swipe-to-reveal delete on exercise rows
  const handleExerciseTouchStart = (e, id) => {
    exerciseTouchStartX.current = e.touches[0].clientX;
    setSwipedExerciseId(null); // Reset any previously swiped
  };

  const handleExerciseTouchEnd = (e, id) => {
    const deltaX = e.changedTouches[0].clientX - exerciseTouchStartX.current;
    if (deltaX < -60) {
      setSwipedExerciseId(id); // Reveal delete button
    }
  };

  // Save workout and transition back to day info
  const saveWorkout = () => {
    if (!selectedDate || !updateUserData) return;
    
    // Filter out empty rows
    const validExercises = workoutExercises
      .filter(e => e.name && e.name.trim())
      .map(e => ({
        name: e.name.trim(),
        weight: Number(e.weight) || 0,
        sets: Number(e.sets) || 0,
        reps: Number(e.reps) || 0,
        restMinutes: Number(e.restMinutes) || 0
      }));
    
    const dayStr = format(selectedDate, 'yyyy-MM-dd');
    
    if (validExercises.length === 0) {
      // Remove workout entry for this day
      const updatedLog = (userData.workoutLog || []).filter(w => 
        format(new Date(w.date), 'yyyy-MM-dd') !== dayStr
      );
      updateUserData({ workoutLog: updatedLog });
      toast.success('Workout cleared');
    } else {
      // Calculate spermatogenesis cycle data
      const dayCount = getDayCount(selectedDate);
      const streakDay = dayCount?.dayNumber || 0;
      const spermaDay = streakDay > 0 ? ((streakDay - 1) % 72) + 1 : 0;
      const spermaCycle = streakDay > 0 ? Math.floor((streakDay - 1) / 72) + 1 : 0;
      
      const workoutEntry = {
        date: selectedDate,
        streakDay,
        spermaDay,
        spermaCycle,
        exercises: validExercises
      };
      
      const existingLog = [...(userData.workoutLog || [])];
      const existingIdx = existingLog.findIndex(w => 
        format(new Date(w.date), 'yyyy-MM-dd') === dayStr
      );
      
      if (existingIdx !== -1) {
        existingLog[existingIdx] = workoutEntry;
      } else {
        existingLog.push(workoutEntry);
      }
      
      updateUserData({ workoutLog: existingLog });
      toast.success('Workout saved');
    }
    
    // Transition back to day info
    setCalSheetReady(false);
    setTimeout(() => {
      setShowSuggestions(null);
      setSwipedExerciseId(null);
      setSheetView('info');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCalSheetReady(true));
      });
    }, 300);
  };

  // Back from workout to day info (without saving)
  const backFromWorkout = () => {
    setCalSheetReady(false);
    setTimeout(() => {
      setShowSuggestions(null);
      setSwipedExerciseId(null);
      setWorkoutExercises([]);
      setSheetView('info');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCalSheetReady(true));
      });
    }, 300);
  };

  // Delete entire workout for selected day
  const deleteWorkout = () => {
    if (!selectedDate || !updateUserData) return;
    const dayStr = format(selectedDate, 'yyyy-MM-dd');
    const updatedLog = (userData.workoutLog || []).filter(w => 
      format(new Date(w.date), 'yyyy-MM-dd') !== dayStr
    );
    updateUserData({ workoutLog: updatedLog });
    toast.success('Workout deleted');
    backFromWorkout();
  };

  const closeEditModal = () => {
    closeCalSheet(() => {
      setDayInfoModal(false);
      setSelectedDate(null);
      setSheetView('info');
      setShowTriggerSelection(false);
      setEditingExistingTrigger(false);
      setSelectedTrigger('');
      setIsEditingNote(false);
      setNoteText('');
      setWorkoutExercises([]);
      setShowSuggestions(null);
      setSwipedExerciseId(null);
    });
  };

  const backToDayInfo = () => {
    // Slide edit sheet down, then switch view and slide info sheet up
    setCalSheetReady(false);
    setTimeout(() => {
      setShowTriggerSelection(false);
      setEditingExistingTrigger(false);
      setSelectedTrigger('');
      setSheetView('info');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCalSheetReady(true));
      });
    }, 300);
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
      
      {!isPremium ? (
        <div className="calendar-journal-locked" onClick={() => openPlanModal && openPlanModal()}>
          <p>Upgrade to Premium to journal</p>
        </div>
      ) : isEditingNote ? (
        <div className="calendar-journal-editing">
          <textarea
            className="calendar-journal-textarea"
            ref={(el) => {
              if (el) {
                el.focus();
                setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
              }
            }}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="What's on your mind?"
            rows="4"
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
            <button className="calendar-trigger-back" onClick={() => {
              setShowTriggerSelection(false);
              setEditingExistingTrigger(false);
              setSelectedTrigger('');
            }}>
              Back
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
        const hasWorkout = !!getDayWorkout(currentDay) && isCurrentMonth;
        const isFuture = isCurrentMonth && isFutureDay(currentDay);
        const hasData = isCurrentMonth && (dayTracking.hasBenefits || dayTracking.hasJournal);
        
        const cellClasses = [
          'day-cell',
          !isCurrentMonth ? 'other-month' : '',
          isToday ? 'today' : '',
          dayStatus?.type || '',
          wetDream ? 'wet-dream' : '',
          isMoonDay ? `moon-day moon-${lunar.phase}` : '',
          isFuture ? 'future' : ''
        ].filter(Boolean).join(' ');

        week.push(
          <div key={i} className={cellClasses} onClick={() => openDayInfo(currentDay)}>
            <span className="day-number">{format(currentDay, 'd')}</span>
            {/* Data dash - unified indicator for benefits or journal */}
            {hasData && !isFuture && (
              <span className="day-data-dash"></span>
            )}
            {/* Workout indicator - tiny dumbbell glyph */}
            {hasWorkout && (
              <span className="day-workout-glyph">
                <DumbbellGlyph size={9} />
              </span>
            )}
            {/* Moon phase indicator - only on significant phases */}
            {isMoonDay && (
              <span 
                className="day-moon-indicator"
                onClick={(e) => openMoonDetail(currentDay, e)}
              >
                <MoonIcon phase={lunar.phase} emoji={lunar.emoji} size={9} />
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
      const hasWorkout = !!getDayWorkout(day);
      
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
              {hasWorkout && (
                <span className="week-workout-glyph">
                  <DumbbellGlyph size={10} />
                </span>
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
            onClick={() => handleViewToggle('month')}
          >
            Month
          </button>
          <span className="toggle-divider" />
          <button 
            className={`toggle-option ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => handleViewToggle('week')}
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
      <div 
        className={`calendar-main-section${initialAnimDone ? ' anim-done' : ''}${swipeAnim ? ` swipe-${swipeAnim}` : ''}${viewFading ? ' view-fading' : ''}`}
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
      >
        {viewMode === 'month' ? renderMonthView() : renderWeekView()}
      </div>

      {/* Moon Phase - Sticky bar above nav, both views */}
      {(() => {
        const lunar = getLunarData(new Date());
        const synodicMonth = 29.53058867;
        const cycleDayRaw = lunar.lunarAge;
        const cycleDay = Math.ceil(cycleDayRaw) || 1;
        const cycleTotal = Math.round(synodicMonth);
        return (
          <div 
            className="calendar-moon-bar"
            onClick={(e) => openMoonDetail(new Date(), e)}
          >
            <span className="moon-bar-emoji">
              <MoonIcon phase={lunar.phase} emoji={lunar.emoji} size={24} />
            </span>
            <span className="moon-bar-label">{lunar.label}</span>
            <span className="moon-bar-separator">·</span>
            <span className="moon-bar-meta">Day {cycleDay}/{cycleTotal}</span>
            <span className="moon-bar-separator">·</span>
            <span className="moon-bar-meta">{lunar.illumination}%</span>
          </div>
        );
      })()}


      {/* ================================================================
          DAY INFO / EDIT — Smart Morphing Sheet
          ================================================================ */}
      {dayInfoModal && selectedDate && (
        <div className={`sheet-backdrop${calSheetReady ? ' open' : ''}`} onClick={() => closeCalSheet(closeDayInfo)}>
          <div ref={calSheetPanelRef} className={`sheet-panel cal-sheet${calSheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <div 
              className="sheet-header"
              onTouchStart={handleCalSheetTouchStart}
              onTouchMove={handleCalSheetTouchMove}
              onTouchEnd={handleCalSheetTouchEnd}
            />
            <div className="cal-sheet-body" style={{ transition: 'height 300ms cubic-bezier(0.16, 1, 0.3, 1)' }}>

              {/* ---- INFO VIEW ---- */}
              {sheetView === 'info' && (
                <div className="calendar-modal calendar-day-info has-scrollable-content cal-view-animate" key="info-view">
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
                        <div className="calendar-header-row">
                          <h3>{format(selectedDate, 'EEEE, MMMM d')}</h3>
                          {/* Workout dumbbell — right edge, inline with date, premium only */}
                          {!isFuture && (
                            <button 
                              className={`calendar-workout-icon${!!getDayWorkout(selectedDate) ? ' has-workout' : ''}`}
                              onClick={isPremium ? openWorkoutSheet : () => openPlanModal && openPlanModal()} 
                              aria-label={!isPremium ? 'Upgrade to log workouts' : getDayWorkout(selectedDate) ? 'View Workout' : 'Log Workout'}
                            >
                              <DumbbellIcon size={16} filled={!!getDayWorkout(selectedDate)} />
                            </button>
                          )}
                        </div>
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
                        <button className="calendar-btn-ghost" onClick={() => closeCalSheet(closeDayInfo)}>Close</button>
                      </div>
                    </>
                  );
                })()}
                </div>
              )}

              {/* ---- EDIT VIEW ---- */}
              {sheetView === 'edit' && (
                <div className={`calendar-modal calendar-edit-day cal-view-animate ${showTriggerSelection ? 'has-trigger-selection' : ''}`} key="edit-view">
                  <h3>{format(selectedDate, 'EEEE, MMMM d')}</h3>
                  {getEditSubtitle() && <p>{getEditSubtitle()}</p>}

                  {renderEditContent()}

                  <div className="calendar-actions">
                    {!showTriggerSelection && getEditOptions().type !== 'future' && (
                      <button className="calendar-btn-back" onClick={backToDayInfo}>
                        Back
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ---- WORKOUT VIEW ---- */}
              {sheetView === 'workout' && (
                <div className="calendar-modal workout-sheet cal-view-animate" key="workout-view">
                  <div className="workout-sheet-header">
                    <h3>{format(selectedDate, 'EEEE, MMMM d')}</h3>
                    <div className="workout-sheet-title">
                      <DumbbellIcon size={18} filled={true} />
                      <span>Workout Log</span>
                    </div>
                    {getDayWorkout(selectedDate) && (
                      <button className="workout-trash-icon" onClick={deleteWorkout} aria-label="Delete Workout">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="workout-sheet-content">
                    {workoutExercises.length === 0 ? (
                      /* Empty state */
                      <div className="workout-empty" onClick={addExerciseRow}>
                        <span className="workout-empty-plus">+</span>
                        <span>Add Exercise</span>
                      </div>
                    ) : (
                      /* Exercise rows */
                      <div className="workout-exercises">
                        {workoutExercises.map((exercise, index) => (
                          <div 
                            key={exercise.id} 
                            className={`workout-exercise-row${swipedExerciseId === exercise.id ? ' swiped' : ''}`}
                            onTouchStart={(e) => handleExerciseTouchStart(e, exercise.id)}
                            onTouchEnd={(e) => handleExerciseTouchEnd(e, exercise.id)}
                          >
                            <div className="workout-exercise-main">
                              <div className="workout-exercise-name-wrap">
                                <input
                                  type="text"
                                  className="workout-input workout-input-name"
                                  placeholder="Exercise name"
                                  value={exercise.name}
                                  onChange={(e) => {
                                    updateExercise(exercise.id, 'name', e.target.value);
                                    if (hasEnoughWorkoutHistory && e.target.value.length >= 2) {
                                      setShowSuggestions(index);
                                    } else {
                                      setShowSuggestions(null);
                                    }
                                  }}
                                  onFocus={() => {
                                    if (hasEnoughWorkoutHistory && exercise.name.length >= 2) {
                                      setShowSuggestions(index);
                                    }
                                  }}
                                  onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                                />
                                {/* Suggestions dropdown */}
                                {showSuggestions === index && (() => {
                                  const suggestions = getExerciseSuggestions(exercise.name);
                                  if (suggestions.length === 0) return null;
                                  return (
                                    <div className="workout-suggestions">
                                      {suggestions.map((s, si) => (
                                        <button 
                                          key={si} 
                                          className="workout-suggestion-item"
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            updateExercise(exercise.id, 'name', s);
                                            setShowSuggestions(null);
                                          }}
                                        >
                                          {s}
                                        </button>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="workout-exercise-fields">
                                <div className="workout-field">
                                  <label>Weight</label>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    className="workout-input workout-input-num"
                                    placeholder="0"
                                    value={exercise.weight}
                                    onChange={(e) => updateExercise(exercise.id, 'weight', e.target.value)}
                                  />
                                  <span className="workout-field-unit">lbs</span>
                                </div>
                                <div className="workout-field">
                                  <label>Sets</label>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    className="workout-input workout-input-num"
                                    placeholder="0"
                                    value={exercise.sets}
                                    onChange={(e) => updateExercise(exercise.id, 'sets', e.target.value)}
                                  />
                                </div>
                                <div className="workout-field">
                                  <label>Reps</label>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    className="workout-input workout-input-num"
                                    placeholder="0"
                                    value={exercise.reps}
                                    onChange={(e) => updateExercise(exercise.id, 'reps', e.target.value)}
                                  />
                                </div>
                                <div className="workout-field">
                                  <label>Rest</label>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    className="workout-input workout-input-num"
                                    placeholder="0"
                                    value={exercise.restMinutes}
                                    onChange={(e) => updateExercise(exercise.id, 'restMinutes', e.target.value)}
                                  />
                                  <span className="workout-field-unit">min</span>
                                </div>
                              </div>
                            </div>
                            {/* Delete button - revealed on swipe left */}
                            <button 
                              className="workout-exercise-delete"
                              onClick={() => deleteExercise(exercise.id)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {/* Add another exercise */}
                        <button className="workout-add-btn" onClick={addExerciseRow}>
                          <span>+</span> Add Exercise
                        </button>
                        <p className="workout-swipe-hint">Swipe left to remove</p>
                      </div>
                    )}
                  </div>

                  <div className="workout-sheet-footer">
                    {workoutExercises.length > 0 && (
                      <button className="calendar-btn-primary" onClick={saveWorkout}>
                        Done
                      </button>
                    )}
                    <button className="calendar-btn-ghost" onClick={backFromWorkout}>
                      {workoutExercises.length > 0 ? 'Cancel' : 'Back'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          MOON DETAIL - Bottom Sheet
          ================================================================ */}
      {moonDetailModal && selectedMoonDate && (
        <div className={`sheet-backdrop${calSheetReady ? ' open' : ''}`} onClick={() => closeCalSheet(closeMoonDetail)}>
          <div ref={calSheetPanelRef} className={`sheet-panel cal-sheet${calSheetReady ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
            <div 
              className="sheet-header"
              onTouchStart={handleCalSheetTouchStart}
              onTouchMove={handleCalSheetTouchMove}
              onTouchEnd={handleCalSheetTouchEnd}
            />
            <div className="calendar-modal moon-detail-modal">
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
                      {({
                        'new': "The new moon is a time of new beginnings. Set intentions, recommit to your practice, and plant the seeds for what you want to grow this cycle.",
                        'waxing-crescent': "The waxing crescent fuels motivation and desire. Your intentions are taking root — channel rising energy into disciplined action.",
                        'first-quarter': "The first quarter tests your resolve. Obstacles surface now to strengthen you. Push forward with discipline — don't waver.",
                        'waxing-gibbous': "Energy is accumulating rapidly. Refine your habits and stay locked in. Momentum is building toward a peak — maintain focus.",
                        'full': "The full moon amplifies everything — vitality, magnetism, and urges. Many practitioners report peak energy. Stay vigilant. This is where discipline matters most.",
                        'waning-gibbous': "Time to turn inward. Reflect on your progress, practice gratitude, and observe what this cycle has revealed about your patterns.",
                        'last-quarter': "Release what no longer serves you. Let go of habits, thoughts, and triggers that hold you back. This is a phase of conscious shedding.",
                        'waning-crescent': "Rest and surrender. Recuperate before the next cycle begins. It's okay to feel low energy — you're preparing for renewal."
                      })[lunar.phase] || "Track your journey through each lunar cycle. The moon's rhythm mirrors your own internal patterns."}
                    </p>
                  </div>
                  <div className="moon-detail-footer">
                    <button className="calendar-btn-ghost" onClick={() => closeCalSheet(closeMoonDetail)}>Close</button>
                  </div>
                </>
              );
            })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
