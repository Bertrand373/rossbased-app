// components/EmotionalTimeline/EmotionalTimeline.js - FIXED Analysis Logic + Mobile Trailing Balls
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

// Import CSS files
import './EmotionalTimeline.css';
import './EmotionalTimelineSections.css';
import './EmotionalTimelineModals.css';

// Icons
import { 
  FaCheckCircle, FaInfoCircle, FaTimes,
  FaMapSigns, FaHeart, FaBrain, FaEdit,
  FaExclamationTriangle, FaChartLine
} from 'react-icons/fa';

// Import utility functions and data
import {
  emotionalPhases,
  masteryLevels,
  getCurrentPhase,
  getCurrentMasteryLevel,
  getPhaseProgress,
  getPhaseProgressText,
  generateComprehensivePhaseAnalysis
} from './EmotionalTimelineUtils';

const EmotionalTimeline = ({ userData, updateUserData }) => {
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [showPhaseDetail, setShowPhaseDetail] = useState(false);
  
  // Navigation state
  const [activeSection, setActiveSection] = useState('journey-map');
  
  // Enhanced emotional tracking states - UPDATED: Changed to 1-10 scale with 5 as middle
  const [todayEmotions, setTodayEmotions] = useState({
    anxiety: 5,
    moodStability: 5,
    mentalClarity: 5,
    emotionalProcessing: 5
  });
  const [emotionsLogged, setEmotionsLogged] = useState(false);

  // Mobile-First sliding tab state management
  const tabsRef = useRef(null);
  const sliderRef = useRef(null);
  const [isSliderInitialized, setIsSliderInitialized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const resizeTimeoutRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  
  // NEW: Refs for trailing ball indicators on emotion sliders
  const emotionSliderRefs = useRef({
    anxiety: { input: null, ball: null },
    moodStability: { input: null, ball: null },
    mentalClarity: { input: null, ball: null },
    emotionalProcessing: { input: null, ball: null }
  });
  
  const currentDay = userData.currentStreak || 0;

  // Get current phase and mastery level
  const currentPhase = getCurrentPhase(currentDay, emotionalPhases);
  const currentMasteryLevel = getCurrentMasteryLevel(currentDay, masteryLevels);

  // Tab configuration
  const navigationTabs = [
    { id: 'journey-map', label: 'Journey Map', icon: FaMapSigns },
    { id: 'check-in', label: 'Check-in', icon: FaCheckCircle },
    { id: 'analysis', label: 'Analysis', icon: FaBrain }
  ];

  // FIXED: Enhanced data analysis logic
  const getDataAnalysisState = () => {
    const emotionalData = userData.emotionalTracking || [];
    const totalDataPoints = emotionalData.length;
    const recentData = emotionalData.filter(entry => 
      differenceInDays(new Date(), new Date(entry.date)) <= 14
    );
    const recentDataPoints = recentData.length;
    
    // Calculate overall tracking consistency
    const trackingSpan = totalDataPoints > 1 ? 
      differenceInDays(new Date(), new Date(emotionalData[0].date)) : 0;
    const consistencyRate = trackingSpan > 0 ? (totalDataPoints / trackingSpan) * 100 : 0;
    
    return {
      totalDataPoints,
      recentDataPoints,
      trackingSpan,
      consistencyRate,
      hasGoodData: totalDataPoints >= 7,
      hasExcellentData: totalDataPoints >= 21 && consistencyRate > 50,
      hasSufficientRecentData: recentDataPoints >= 3
    };
  };
  
  // NEW: Calculate data quality for display
  const getDataQuality = () => {
    const dataState = getDataAnalysisState();
    const { totalDataPoints } = dataState;
    
    if (totalDataPoints === 0) {
      return { level: 'insufficient', label: 'No Data', days: 0 };
    } else if (totalDataPoints < 7) {
      return { level: 'minimal', label: 'Basic Analysis', days: totalDataPoints };
    } else if (totalDataPoints < 21) {
      return { level: 'good', label: 'Good Analysis', days: totalDataPoints };
    } else {
      return { level: 'rich', label: 'Rich Analysis', days: totalDataPoints };
    }
  };

  // FIXED: Smart banner message generation
  const getBannerMessage = () => {
    const dataState = getDataAnalysisState();
    const { totalDataPoints, recentDataPoints, consistencyRate, hasExcellentData, hasGoodData, hasSufficientRecentData } = dataState;
    
    // Excellent data - show optimization message
    if (hasExcellentData) {
      return {
        title: "Advanced Analysis Active",
        description: `Excellent tracking history with ${totalDataPoints} total data points enables comprehensive pattern recognition, predictive guidance, and personalized strategies based on your unique journey data.`
      };
    }
    
    // Good data but could be better
    if (hasGoodData) {
      const recentMessage = recentDataPoints < 7 ? 
        ` Track more consistently in recent days (${recentDataPoints}/14 recent days logged) for enhanced real-time insights.` : '';
      
      return {
        title: "Analysis Improving with Data", 
        description: `Good foundation with ${totalDataPoints} data points unlocks pattern recognition and basic insights.${recentMessage} Continue tracking to unlock advanced predictive capabilities.`
      };
    }
    
    // Minimal data - encouraging but informative
    if (totalDataPoints > 0) {
      return {
        title: "Building Your Analysis Foundation",
        description: `Started with ${totalDataPoints} data point${totalDataPoints === 1 ? '' : 's'}! Track ${7 - totalDataPoints} more days to unlock pattern recognition, challenge identification, and personalized strategies for your ${currentPhase?.name || 'current'} phase.`
      };
    }
    
    // No data - comprehensive explanation
    return {
      title: "Unlock Comprehensive Analysis", 
      description: `You're on day ${currentDay} in the ${currentPhase?.name || 'current'} phase. Start daily emotional tracking to unlock scientific phase explanations, personalized challenge identification with solutions, predictive guidance for upcoming phases, pattern recognition across all metrics, and strategic recommendations tailored to your journey.`
    };
  };

  // Helper function to generate phase color variables
  const getPhaseColorVariables = (phase) => {
    if (!phase) return {};
    
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const rgb = hexToRgb(phase.color);
    const lighterColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)` : phase.color;
    
    return {
      '--phase-color': phase.color,
      '--phase-color-light': lighterColor
    };
  };
  
  // NEW: Update trailing ball position for emotion sliders
  const updateEmotionBallPosition = useCallback((emotionKey, value) => {
    const refs = emotionSliderRefs.current[emotionKey];
    if (!refs || !refs.input || !refs.ball) return;
    
    try {
      const input = refs.input;
      const ball = refs.ball;
      
      // Calculate position percentage (value 1-10 mapped to 0-100%)
      const percentage = ((value - 1) / 9) * 100;
      
      // Get thumb width (24px on desktop, 22px on mobile 768px, 20px on mobile 480px)
      const thumbWidth = window.innerWidth <= 480 ? 20 : window.innerWidth <= 768 ? 22 : 24;
      
      // Calculate position: ball center should align with thumb center
      // Thumb travels from thumbWidth/2 to (trackWidth - thumbWidth/2)
      const trackWidth = input.offsetWidth;
      const ballPosition = (thumbWidth / 2) + ((trackWidth - thumbWidth) * (percentage / 100));
      
      ball.style.left = `${ballPosition}px`;
    } catch (error) {
      console.error('Error updating emotion ball position:', error);
    }
  }, []);

  // Detect mobile
  const detectMobile = useCallback(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);

  // Detect mobile on mount and resize
  useEffect(() => {
    detectMobile();
    window.addEventListener('resize', detectMobile);
    return () => window.removeEventListener('resize', detectMobile);
  }, [detectMobile]);

  // Update slider position function
  const updateSlider = useCallback(() => {
    if (!tabsRef.current || !sliderRef.current) {
      return false;
    }
    
    try {
      const container = tabsRef.current;
      const slider = sliderRef.current;
      const activeButton = container.querySelector(`[data-tab="${activeSection}"]`);
      
      if (!activeButton) {
        return false;
      }

      requestAnimationFrame(() => {
        try {
          const containerRect = container.getBoundingClientRect();
          const buttonRect = activeButton.getBoundingClientRect();
          
          if (containerRect.width === 0 || buttonRect.width === 0) {
            return;
          }

          const containerStyle = window.getComputedStyle(container);
          const paddingLeft = parseFloat(containerStyle.paddingLeft) || 4;
          const scrollLeft = container.scrollLeft || 0;
          const leftOffset = buttonRect.left - containerRect.left - paddingLeft + scrollLeft;
          const buttonWidth = buttonRect.width;
          
          slider.style.width = `${Math.round(buttonWidth)}px`;
          
          requestAnimationFrame(() => {
            slider.style.transform = `translateX(${Math.round(leftOffset)}px)`;
            slider.style.opacity = '1';
            slider.style.visibility = 'visible';
          });
          
        } catch (innerError) {
          console.error('Inner slider positioning failed:', innerError);
        }
      });
      
      return true;
      
    } catch (error) {
      console.error('Slider update failed:', error);
      return false;
    }
  }, [activeSection]);

  // Scroll active button into view on mobile
  const scrollToActiveTab = useCallback(() => {
    if (!isMobile || !tabsRef.current) return;
    
    const container = tabsRef.current;
    const activeButton = container.querySelector(`[data-tab="${activeSection}"]`);
    
    if (activeButton) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      
      if (buttonRect.left < containerRect.left || buttonRect.right > containerRect.right) {
        activeButton.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest'
        });
      }
    }
  }, [activeSection, isMobile]);

  // Handle section change
  const handleSectionChange = useCallback((sectionId) => {
    if (sectionId === activeSection) return;
    setActiveSection(sectionId);
    
    if (isMobile) {
      setTimeout(() => {
        scrollToActiveTab();
        updateSlider();
      }, 10);
    }
  }, [activeSection, isMobile, updateSlider, scrollToActiveTab]);

  // Handle scroll events
  useEffect(() => {
    if (!isMobile || !tabsRef.current) return;
    
    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        updateSlider();
      }, 50);
    };
    
    const container = tabsRef.current;
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isMobile, updateSlider]);

  // Initialize slider
  useEffect(() => {
    const initializeSlider = () => {
      detectMobile();
      
      if (!tabsRef.current || !sliderRef.current) {
        return;
      }

      requestAnimationFrame(() => {
        const success = updateSlider();
        
        if (success) {
          setIsSliderInitialized(true);
          if (isMobile) {
            scrollToActiveTab();
          }
        } else {
          setTimeout(() => {
            if (updateSlider()) {
              setIsSliderInitialized(true);
              if (isMobile) {
                scrollToActiveTab();
              }
            }
          }, 100);
        }
      });
    };

    const timer = setTimeout(initializeSlider, 50);

    return () => {
      clearTimeout(timer);
      [resizeTimeoutRef, scrollTimeoutRef].forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
        }
      });
    };
  }, [detectMobile, updateSlider, scrollToActiveTab, isMobile]);

  // Update slider on window resize
  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        detectMobile();
        updateSlider();
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [detectMobile, updateSlider]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      [resizeTimeoutRef, scrollTimeoutRef].forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
        }
      });
    };
  }, []);

  // UPDATED: Check if emotions are already logged for today - handle both 0-10 and 1-10 scales
  useEffect(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existingEmotions = userData.emotionalTracking?.find(
      emotion => format(new Date(emotion.date), 'yyyy-MM-dd') === todayStr
    );
    
    if (existingEmotions) {
      // MIGRATION: Convert old 0-10 scale to 1-10 scale if needed
      const convertValue = (value) => {
        if (value === 0) return 1; // Convert 0 to 1
        if (value === undefined || value === null) return 5; // Default middle
        return Math.round(value); // Ensure whole numbers only
      };
      
      setTodayEmotions({
        anxiety: convertValue(existingEmotions.anxiety),
        moodStability: convertValue(existingEmotions.moodStability),
        mentalClarity: convertValue(existingEmotions.mentalClarity),
        emotionalProcessing: convertValue(existingEmotions.emotionalProcessing)
      });
      setEmotionsLogged(true);
    }
  }, [userData.emotionalTracking]);
  
  // NEW: Update all emotion ball positions when emotions change
  useEffect(() => {
    Object.keys(todayEmotions).forEach(key => {
      updateEmotionBallPosition(key, todayEmotions[key]);
    });
  }, [todayEmotions, updateEmotionBallPosition]);
  
  // NEW: Update ball positions on window resize
  useEffect(() => {
    const handleBallResize = () => {
      Object.keys(todayEmotions).forEach(key => {
        updateEmotionBallPosition(key, todayEmotions[key]);
      });
    };
    
    window.addEventListener('resize', handleBallResize);
    return () => window.removeEventListener('resize', handleBallResize);
  }, [todayEmotions, updateEmotionBallPosition]);

  // UPDATED: Handle emotional tracking with 1-10 scale (whole numbers only)
  const handleEmotionChange = (type, value) => {
    const newValue = parseInt(value);
    setTodayEmotions(prev => ({
      ...prev,
      [type]: newValue
    }));
    // Update ball position immediately
    updateEmotionBallPosition(type, newValue);
  };

  const saveEmotions = () => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const updatedEmotionalTracking = (userData.emotionalTracking || []).filter(
      emotion => format(new Date(emotion.date), 'yyyy-MM-dd') !== todayStr
    );
    
    updatedEmotionalTracking.push({
      date: today,
      day: currentDay,
      phase: currentPhase?.id || 1,
      ...todayEmotions
    });
    
    updatedEmotionalTracking.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    updateUserData({ emotionalTracking: updatedEmotionalTracking });
    setEmotionsLogged(true);
    toast.success('Emotional check-in saved!');
  };

  const enableEmotionEditing = () => {
    setEmotionsLogged(false);
  };

  // Handle phase detail modal
  const showPhaseDetails = (phase) => {
    setSelectedPhase(phase);
    setShowPhaseDetail(true);
  };

  // NEW: Render slider tick marks for values 1-10
  const renderSliderTickMarks = () => {
    const ticks = [];
    for (let i = 1; i <= 10; i++) {
      const isKeyTick = i === 1 || i === 5 || i === 10;
      ticks.push(
        <div 
          key={i} 
          className={`slider-tick ${isKeyTick ? 'key-tick' : ''}`} 
          data-value={i}
        />
      );
    }
    return ticks;
  };

  return (
    <div className="emotional-timeline-container">
      {/* UPDATED: Integrated Header Design matching Tracker/Calendar/Stats pattern */}
      <div className="integrated-timeline-header">
        <div className="header-title-section">
          <h2>Emotional Timeline</h2>
          <p className="header-subtitle">Track emotional patterns through retention phases</p>
        </div>

        {/* UPDATED: Navigation pills with sliding background */}
        <div className="header-navigation-section">
          <div className="navigation-pill-container" ref={tabsRef}>
            <div 
              className="navigation-slider" 
              ref={sliderRef}
              style={{
                opacity: isSliderInitialized ? '1' : '0',
                visibility: isSliderInitialized ? 'visible' : 'hidden'
              }}
            />
            {navigationTabs.map((tab) => (
              <button
                key={tab.id}
                data-tab={tab.id}
                className={`navigation-pill ${activeSection === tab.id ? 'active' : ''}`}
                onClick={() => handleSectionChange(tab.id)}
              >
                <tab.icon className="nav-icon" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="emotional-timeline-content">
        {/* Journey Map Section */}
        {activeSection === 'journey-map' && (
          <div className="journey-map-section">
            {/* Current Phase Card */}
            {currentPhase && (
              <div className="current-phase-card" style={getPhaseColorVariables(currentPhase)}>
                <div className="current-phase-header">
                  <div className="timeline-phase-icon" style={{ color: currentPhase.color }}>
                    <currentPhase.icon style={{ color: currentPhase.color }} />
                  </div>
                  <div className="current-phase-info">
                    <h3>{currentPhase.name}</h3>
                    <div className="current-phase-day">
                      Day {currentDay} • {getPhaseProgressText(currentDay, currentPhase)}
                    </div>
                  </div>
                </div>

                <div className="progress-container">
                  <div className="progress-bar progress-bar-shimmer">
                    <div 
                      className="progress-fill progress-fill-shimmer progress-fill-colored" 
                      style={{ 
                        width: `${getPhaseProgress(currentDay, currentPhase)}%`,
                        '--phase-color': currentPhase.color
                      }}
                    ></div>
                  </div>
                </div>

                <p className="current-phase-description">{currentPhase.description}</p>

                <button 
                  className="learn-more-btn"
                  onClick={() => showPhaseDetails(currentPhase)}
                >
                  <FaInfoCircle />
                  <span>View Full Phase Details</span>
                </button>
              </div>
            )}

            {/* Upcoming Phases */}
            <div className="phases-timeline">
              <h3>Your Emotional Journey Map</h3>
              <div className="phases-grid">
                {emotionalPhases.map((phase) => {
                  const isPast = currentDay > phase.endDay;
                  const isCurrent = currentDay >= phase.startDay && currentDay <= phase.endDay;
                  const isFuture = currentDay < phase.startDay;
                  
                  return (
                    <div 
                      key={phase.id}
                      className={`phase-card ${isPast ? 'past' : ''} ${isCurrent ? 'current' : ''} ${isFuture ? 'future' : ''}`}
                      style={isCurrent ? getPhaseColorVariables(phase) : {}}
                      onClick={() => showPhaseDetails(phase)}
                    >
                      <div className="phase-card-header">
                        <div className="timeline-phase-icon" style={{ color: phase.color }}>
                          <phase.icon style={{ color: phase.color }} />
                        </div>
                        <h4>{phase.name}</h4>
                      </div>
                      <div className="phase-day-range">Days {phase.dayRange}</div>
                      {isCurrent && (
                        <div className="phase-current-indicator">
                          <FaCheckCircle />
                          <span>You are here (Day {currentDay})</span>
                        </div>
                      )}
                      {isPast && (
                        <div className="phase-completed-indicator">
                          <FaCheckCircle />
                          <span>Completed</span>
                        </div>
                      )}
                      <p className="phase-card-description">{phase.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mastery Level Card */}
            {currentMasteryLevel && (
              <div className="mastery-level-card">
                <div className="mastery-header">
                  <div className="mastery-icon">
                    <currentMasteryLevel.icon />
                  </div>
                  <div className="mastery-info">
                    <h3>{currentMasteryLevel.name}</h3>
                    <div className="mastery-range">Days {currentMasteryLevel.dayRange}</div>
                  </div>
                </div>
                <p className="mastery-description">{currentMasteryLevel.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Check-in Section */}
        {activeSection === 'check-in' && (
          <div className="emotional-checkin-section">
            <h3>Today's Emotional Check-in</h3>
            
            {!emotionsLogged ? (
              <>
                <div className="checkin-benefits-banner">
                  <div className="checkin-benefits-helmet-container">
                    <img 
                      className="checkin-benefits-helmet" 
                      src="/helmet.png" 
                      alt="Track to Unlock" 
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'block';
                      }}
                    />
                    <div className="checkin-benefits-helmet-fallback" style={{ display: 'none' }}>
                      🛡️
                    </div>
                  </div>
                  
                  <div className="checkin-benefits-content">
                    <h4 className="checkin-benefits-title">
                      Track to Unlock Advanced Features
                    </h4>
                    <p className="checkin-benefits-description">
                      The more you track emotions, the more personalized and accurate analysis becomes. Daily tracking unlocks pattern recognition, challenge identification with solutions, predictive guidance for upcoming phases, and tailored strategies based on your unique journey data.
                    </p>
                  </div>
                </div>
                
                <div className="emotion-status-section">
                  {emotionsLogged ? (
                    <div className="emotions-logged">
                      <FaCheckCircle className="check-icon" />
                      <span>Emotions logged!</span>
                      <button 
                        className="edit-emotions-btn"
                        onClick={enableEmotionEditing}
                        title="Edit emotions"
                      >
                        <FaEdit />
                      </button>
                    </div>
                  ) : (
                    <div className="emotions-not-logged">
                      <FaInfoCircle className="info-icon" />
                      <span>Log emotions below</span>
                    </div>
                  )}
                </div>

                {/* UPDATED: Emotion sliders with 1-10 scale, tick marks, and real trailing balls */}
                <div className="emotion-sliders">
                  {[
                    { key: 'anxiety', label: 'Anxiety Level', value: todayEmotions.anxiety, lowLabel: 'Very Calm', highLabel: 'High Anxiety' },
                    { key: 'moodStability', label: 'Mood Stability', value: todayEmotions.moodStability, lowLabel: 'Mood Swings', highLabel: 'Very Stable' },
                    { key: 'mentalClarity', label: 'Mental Clarity', value: todayEmotions.mentalClarity, lowLabel: 'Quite Foggy', highLabel: 'Crystal Clear' },
                    { key: 'emotionalProcessing', label: 'Emotional Processing', value: todayEmotions.emotionalProcessing, lowLabel: 'Very Suppressed', highLabel: 'Flowing Freely' }
                  ].map((emotion) => (
                    <div key={emotion.key} className="emotion-slider-item">
                      <div className="emotion-slider-header">
                        <span className="emotion-label">{emotion.label}</span>
                      </div>
                      <div className="emotion-slider-with-value">
                        <div className="emotion-slider-track-container">
                          <div className="slider-tick-marks">
                            {renderSliderTickMarks()}
                          </div>
                          {/* NEW: Real trailing ball element */}
                          <div 
                            className="slider-trailing-ball"
                            ref={(el) => {
                              if (el) emotionSliderRefs.current[emotion.key].ball = el;
                            }}
                          />
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={emotion.value}
                            onChange={(e) => handleEmotionChange(emotion.key, parseInt(e.target.value))}
                            className="emotion-range-slider"
                            disabled={emotionsLogged}
                            ref={(el) => {
                              if (el) emotionSliderRefs.current[emotion.key].input = el;
                            }}
                          />
                        </div>
                        <span className="emotion-value-clean">{emotion.value}</span>
                      </div>
                      <div className="slider-labels">
                        <span>{emotion.lowLabel}</span>
                        <span>{emotion.highLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {!emotionsLogged && (
                  <div className="emotion-actions">
                    <button 
                      className="action-btn save-emotions-btn"
                      onClick={saveEmotions}
                    >
                      <FaCheckCircle />
                      <span>Save Emotional Check-in</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="emotions-logged-container">
                  <div className="emotions-logged">
                    <FaCheckCircle className="check-icon" />
                    <span>Today's emotions logged!</span>
                  </div>
                  <button 
                    className="edit-emotions-btn"
                    onClick={enableEmotionEditing}
                  >
                    <FaEdit />
                    <span>Edit</span>
                  </button>
                </div>
                
                <div className="logged-emotions-summary">
                  {[
                    { key: 'anxiety', label: 'Anxiety Level', value: todayEmotions.anxiety },
                    { key: 'moodStability', label: 'Mood Stability', value: todayEmotions.moodStability },
                    { key: 'mentalClarity', label: 'Mental Clarity', value: todayEmotions.mentalClarity },
                    { key: 'emotionalProcessing', label: 'Emotional Processing', value: todayEmotions.emotionalProcessing }
                  ].map((emotion) => (
                    <div key={emotion.key} className="logged-emotion-row">
                      <span className="logged-emotion-label">{emotion.label}</span>
                      <span className="logged-emotion-value">{emotion.value}/10</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* FIXED: Analysis Section with improved logic and data quality indicator */}
        {activeSection === 'analysis' && (
          <div className="phase-insight-section">
            <h3>Comprehensive Phase Analysis</h3>
            
            {/* Handle no current phase (reset scenario) - Single consolidated banner */}
            {!currentPhase || currentDay <= 0 ? (
              <div className="insight-data-banner">
                <div className="insight-data-helmet-container">
                  <img 
                    className="insight-data-helmet" 
                    src="/helmet.png" 
                    alt="Analysis Unavailable" 
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'block';
                    }}
                  />
                  <div className="insight-data-helmet-fallback" style={{ display: 'none' }}>
                    🛡️
                  </div>
                </div>
                
                <div className="insight-data-content">
                  <h4 className="insight-data-title">
                    Analysis Unavailable - Start Your Journey
                  </h4>
                  <p className="insight-data-description">
                    Phase analysis requires an active retention streak. Start your journey to unlock comprehensive insights including scientific explanations for each phase, personal data analysis with trend recognition, challenge identification with targeted solutions, predictive guidance for upcoming phases, and actionable strategies tailored to your current phase.
                  </p>
                </div>
              </div>
            ) : (
              (() => {
                const analysis = generateComprehensivePhaseAnalysis(currentPhase, currentDay, userData, false, true);
                const dataState = getDataAnalysisState();
                const bannerMessage = getBannerMessage();
                const dataQuality = getDataQuality();
                
                return (
                  <>
                    {/* FIXED: Single comprehensive banner based on data state */}
                    <div className="insight-data-banner">
                      <div className="insight-data-helmet-container">
                        <img 
                          className="insight-data-helmet" 
                          src="/helmet.png" 
                          alt="Analysis Status" 
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'block';
                          }}
                        />
                        <div className="insight-data-helmet-fallback" style={{ display: 'none' }}>
                          🛡️
                        </div>
                      </div>
                      
                      <div className="insight-data-content">
                        <h4 className="insight-data-title">
                          {bannerMessage.title}
                        </h4>
                        <p className="insight-data-description">
                          {bannerMessage.description}
                        </p>
                      </div>
                    </div>

                    {/* Analysis Cards Grid - ALWAYS SHOW if we have a valid phase */}
                    {analysis && currentPhase && currentDay > 0 && (
                      <>
                        <div className="insights-grid">
                          {/* Phase Education Card - ALWAYS SHOW */}
                          {analysis?.phaseEducation && (
                            <div className="insight-card">
                              <div className="insight-card-header">
                                <span className="insight-metric">Phase Education</span>
                              </div>
                              <div className="insight-text">
                                <div className="optimization-display">
                                  <div className="optimization-metric-card">
                                    <div className="optimization-metric-value">Day {analysis.phaseEducation.dayInPhase}</div>
                                    <div className="optimization-metric-label">Current Phase Progress</div>
                                  </div>
                                  <div className="optimization-criteria">
                                    <div className="optimization-criteria-title">Current Focus</div>
                                    <div className="optimization-criteria-text">{analysis.phaseEducation.phaseOverview}</div>
                                  </div>
                                  <div className="optimization-item">
                                    <strong>Key Learning:</strong> {analysis.phaseEducation.keyLearning}
                                  </div>
                                  <div className="optimization-item">
                                    <strong>What to Expect:</strong> {analysis.phaseEducation.expectation}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Scientific Explanation Card - ALWAYS SHOW */}
                          {analysis?.scientificExplanation && (
                            <div className="insight-card">
                              <div className="insight-card-header">
                                <span className="insight-metric">Scientific Explanation</span>
                              </div>
                              <div className="insight-text">
                                <div className="optimization-display">
                                  <div className="optimization-criteria">
                                    <div className="optimization-criteria-title">Neurological Mechanism</div>
                                    <div className="optimization-criteria-text">{analysis.scientificExplanation.mechanism}</div>
                                  </div>
                                  <div className="optimization-item">
                                    <strong>Timeline:</strong> {analysis.scientificExplanation.timeline}
                                  </div>
                                  <div className="optimization-item">
                                    <strong>Research Context:</strong> {analysis.scientificExplanation.research}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Actionable Strategies Card - ALWAYS SHOW */}
                          {analysis?.actionableStrategies && (
                            <div className="insight-card">
                              <div className="insight-card-header">
                                <span className="insight-metric">Actionable Strategies</span>
                              </div>
                              <div className="insight-text">
                                <div className="patterns-display">
                                  {analysis.actionableStrategies.urgent && analysis.actionableStrategies.urgent.length > 0 && (
                                    <div className="pattern-item">
                                      <strong>Urgent Actions:</strong> {analysis.actionableStrategies.urgent.join(' • ')}
                                    </div>
                                  )}
                                  <div className="pattern-item">
                                    <strong>Daily Practices:</strong> {analysis.actionableStrategies.daily.join(' • ')}
                                  </div>
                                  <div className="pattern-item">
                                    <strong>Weekly Focus:</strong> {analysis.actionableStrategies.weekly.join(' • ')}
                                  </div>
                                  <div className="pattern-item">
                                    <strong>Long-term Strategy:</strong> {analysis.actionableStrategies.longTerm.join(' • ')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Data Analysis Card - SHOW ONLY IF SUFFICIENT DATA */}
                          {dataState.hasSufficientRecentData && analysis?.dataAnalysis && analysis.dataAnalysis.type === 'comprehensive' && (
                            <div className="insight-card">
                              <div className="insight-card-header">
                                <span className="insight-metric">Personal Data Analysis</span>
                              </div>
                              <div className="insight-text">
                                <div className="optimization-display">
                                  <div className="optimization-metrics">
                                    <div className="optimization-metric-card">
                                      <div className="optimization-metric-value">{analysis.dataAnalysis.wellbeingScore.toFixed(1)}/10</div>
                                      <div className="optimization-metric-label">Overall Wellbeing Score</div>
                                    </div>
                                    <div className="optimization-metric-card">
                                      <div className="optimization-metric-value">{dataState.totalDataPoints}</div>
                                      <div className="optimization-metric-label">Total Data Points</div>
                                    </div>
                                    <div className="optimization-metric-card">
                                      <div className="optimization-metric-value">{dataState.recentDataPoints}/14</div>
                                      <div className="optimization-metric-label">Recent Days Tracked</div>
                                    </div>
                                  </div>
                                  
                                  {analysis.dataAnalysis.trends && (
                                    <div className="patterns-display">
                                      <div className="pattern-item">
                                        <strong>Anxiety Trend:</strong> 
                                        <span className={`trend ${analysis.dataAnalysis.trends.anxiety}`}>
                                          {analysis.dataAnalysis.trends.anxiety === 'improving' ? ' ↓ Improving' : 
                                           analysis.dataAnalysis.trends.anxiety === 'concerning' ? ' ↑ Concerning' : ' → Stable'}
                                        </span>
                                      </div>
                                      <div className="pattern-item">
                                        <strong>Mood Stability:</strong>
                                        <span className={`trend ${analysis.dataAnalysis.trends.mood}`}>
                                          {analysis.dataAnalysis.trends.mood === 'improving' ? ' ↑ Improving' : 
                                           analysis.dataAnalysis.trends.mood === 'concerning' ? ' ↓ Concerning' : ' → Stable'}
                                        </span>
                                      </div>
                                      <div className="pattern-item">
                                        <strong>Mental Clarity:</strong>
                                        <span className={`trend ${analysis.dataAnalysis.trends.clarity}`}>
                                          {analysis.dataAnalysis.trends.clarity === 'improving' ? ' ↑ Improving' : 
                                           analysis.dataAnalysis.trends.clarity === 'concerning' ? ' ↓ Concerning' : ' → Stable'}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Challenge Analysis Card - SHOW ONLY IF CHALLENGES IDENTIFIED */}
                          {dataState.hasSufficientRecentData && analysis?.challengeIdentification?.challenges && analysis.challengeIdentification.challenges.length > 0 && (
                            <div className="insight-card">
                              <div className="insight-card-header">
                                <span className="insight-metric">Challenge Analysis</span>
                              </div>
                              <div className="insight-text">
                                <div className="risk-level-indicator moderate">
                                  <div className="risk-score-container">
                                    <div className="risk-score moderate">{analysis.challengeIdentification.challenges.length}</div>
                                    <div className="risk-level-text">Active Challenge{analysis.challengeIdentification.challenges.length > 1 ? 's' : ''}</div>
                                  </div>
                                </div>
                                
                                <div className="patterns-display">
                                  {analysis.challengeIdentification.challenges.map((challenge, index) => (
                                    <div key={index} className="pattern-item">
                                      <strong>{challenge.challenge}:</strong> {challenge.explanation}
                                      <br />
                                      <em>Solution: {challenge.solution}</em>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* NEW: Data Quality Indicator - Match Stats tab structure */}
                        {dataQuality.level !== 'insufficient' && (
                          <div className="insight-data-status">
                            <div className="insight-data-status-indicator">
                              <span className={`insight-data-quality ${dataQuality.level}`}>
                                <FaChartLine />
                                {dataQuality.label}
                              </span>
                              <span className="insight-data-days">
                                Based on {dataQuality.days} day{dataQuality.days !== 1 ? 's' : ''} of tracking
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()
            )}
          </div>
        )}
      </div>

      {/* FIXED: Phase Detail Modal with combined scientific sections and proper layout */}
      {showPhaseDetail && selectedPhase && (
        <div className="modal-overlay" onClick={() => setShowPhaseDetail(false)}>
          <div className="modal-content phase-detail-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPhaseDetail(false)}>
              <FaTimes />
            </button>

            {/* FIXED: Modal header using EXACT working main phase card implementation */}
            <div className="phase-modal-header">
              {/* COPY EXACT working main phase card pattern: timeline-phase-icon class */}
              <div className="timeline-phase-icon" style={{ color: selectedPhase.color }}>
                <selectedPhase.icon style={{ color: selectedPhase.color }} />
              </div>
              <div className="phase-modal-info">
                <h3>{selectedPhase.name}</h3>
                <div className="phase-modal-range">Days {selectedPhase.dayRange}</div>
              </div>
            </div>

            <div className="phase-modal-description">
              <p>{selectedPhase.description}</p>
            </div>

            {/* COMBINED: Scientific Understanding - combining mechanism and insights.scientific */}
            <div className="phase-modal-insight">
              <h4>Scientific Understanding</h4>
              <p><strong>Mechanism:</strong> {selectedPhase.scientificMechanism}</p>
              <p><strong>Research Insight:</strong> {selectedPhase.insights.scientific}</p>
            </div>

            {/* Expected Symptoms */}
            <div className="phase-modal-section">
              <h4>Expected Symptoms</h4>
              <ul>
                {selectedPhase.expectedSymptoms.map((symptom, index) => (
                  <li key={index}>{symptom}</li>
                ))}
              </ul>
            </div>

            {/* Warning Signs */}
            <div className="phase-modal-section warning-section">
              <h4><FaExclamationTriangle /> Warning Signs (Seek Support)</h4>
              <ul>
                {selectedPhase.warningSigns.map((sign, index) => (
                  <li key={index} className="warning-item">{sign}</li>
                ))}
              </ul>
            </div>

            {/* Specific Techniques */}
            <div className="phase-modal-section">
              <h4>Specific Techniques</h4>
              <ul>
                {selectedPhase.specificTechniques.map((technique, index) => (
                  <li key={index}>{technique}</li>
                ))}
              </ul>
            </div>

            {/* Trauma Release Pattern (for Emotional Processing phase) */}
            {selectedPhase.traumaReleasePattern && (
              <div className="phase-modal-section">
                <h4>Emotional Release Timeline</h4>
                <div className="trauma-timeline">
                  <div className="trauma-stage">
                    <strong>Weeks 1-4:</strong> {selectedPhase.traumaReleasePattern.weeks1to4}
                  </div>
                  <div className="trauma-stage">
                    <strong>Months 2-3:</strong> {selectedPhase.traumaReleasePattern.months2to3}
                  </div>
                  <div className="trauma-stage">
                    <strong>Months 4-6:</strong> {selectedPhase.traumaReleasePattern.months4to6}
                  </div>
                  <div className="trauma-stage">
                    <strong>6+ Months:</strong> {selectedPhase.traumaReleasePattern.sixMonthsPlus}
                  </div>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button 
                className="modal-got-it-btn"
                onClick={() => setShowPhaseDetail(false)}
              >
                <FaCheckCircle />
                <span>Got It</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionalTimeline;