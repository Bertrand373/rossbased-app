// components/EmotionalTimeline/EmotionalTimeline.js - FIXED Analysis Logic
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
  FaMapSigns, FaHeart, FaBrain, FaEdit, FaShieldAlt
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
  
  // Enhanced emotional tracking states
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

  // Mobile detection
  const detectMobile = useCallback(() => {
    const isMobileDevice = window.innerWidth <= 768 || 'ontouchstart' in window;
    setIsMobile(isMobileDevice);
    return isMobileDevice;
  }, []);

  // Enhanced slider positioning
  const updateTabSlider = useCallback(() => {
    if (!tabsRef.current || !sliderRef.current) {
      return false;
    }
    
    try {
      const tabsContainer = tabsRef.current;
      const slider = sliderRef.current;
      const activeTabElement = tabsContainer.querySelector(`[data-tab="${activeSection}"]`);
      
      if (!activeTabElement) {
        console.warn(`Tab element not found: ${activeSection}`);
        return false;
      }

      requestAnimationFrame(() => {
        try {
          const containerRect = tabsContainer.getBoundingClientRect();
          const tabRect = activeTabElement.getBoundingClientRect();
          
          if (containerRect.width === 0 || tabRect.width === 0) {
            console.warn('Invalid measurements, container or tab not rendered');
            return;
          }

          const containerStyle = window.getComputedStyle(tabsContainer);
          const paddingLeft = parseFloat(containerStyle.paddingLeft) || 4;
          const scrollLeft = tabsContainer.scrollLeft || 0;
          const leftOffset = tabRect.left - containerRect.left - paddingLeft + scrollLeft;
          const tabWidth = tabRect.width;
          
          slider.style.transform = `translateX(${Math.round(leftOffset)}px)`;
          slider.style.width = `${Math.round(tabWidth)}px`;
          slider.style.opacity = '1';
          slider.style.visibility = 'visible';
          
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

  // Scroll active tab into view on mobile
  const scrollToActiveTab = useCallback(() => {
    if (!isMobile || !tabsRef.current) return;
    
    const container = tabsRef.current;
    const activeTabElement = container.querySelector(`[data-tab="${activeSection}"]`);
    
    if (activeTabElement) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTabElement.getBoundingClientRect();
      
      if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
        activeTabElement.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest'
        });
      }
    }
  }, [activeSection, isMobile]);

  // Clean tab change handler
  const handleSectionClick = useCallback((newSection) => {
    if (newSection === activeSection) return;
    
    setActiveSection(newSection);
    
    if (isMobile) {
      setTimeout(() => {
        scrollToActiveTab();
        updateTabSlider();
      }, 10);
    }
  }, [activeSection, isMobile, updateTabSlider, scrollToActiveTab]);

  // Handle scroll events to update slider position
  useEffect(() => {
    if (!isMobile || !tabsRef.current) return;
    
    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        updateTabSlider();
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
  }, [isMobile, updateTabSlider]);

  // Slider initialization
  useEffect(() => {
    const initializeSlider = () => {
      detectMobile();
      
      if (!tabsRef.current || !sliderRef.current) {
        return;
      }

      requestAnimationFrame(() => {
        const success = updateTabSlider();
        
        if (success) {
          setIsSliderInitialized(true);
          if (isMobile) {
            scrollToActiveTab();
          }
        } else {
          setTimeout(() => {
            if (updateTabSlider()) {
              setIsSliderInitialized(true);
              if (isMobile) {
                scrollToActiveTab();
              }
            } else {
              if (sliderRef.current) {
                sliderRef.current.style.opacity = '1';
                sliderRef.current.style.visibility = 'visible';
                setIsSliderInitialized(true);
                setTimeout(updateTabSlider, 50);
              }
            }
          }, 100);
        }
      });
    };

    const timer = setTimeout(initializeSlider, 100);
    
    return () => clearTimeout(timer);
  }, [updateTabSlider, detectMobile, isMobile, scrollToActiveTab]);

  // Resize handling
  useEffect(() => {
    const handleResize = () => {
      const wasMobile = isMobile;
      detectMobile();
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        if (isSliderInitialized) {
          updateTabSlider();
          if (!wasMobile && isMobile) {
            scrollToActiveTab();
          }
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [isSliderInitialized, detectMobile, updateTabSlider, isMobile, scrollToActiveTab]);

  // Update slider when active tab changes
  useEffect(() => {
    if (isSliderInitialized) {
      setTimeout(updateTabSlider, 10);
    }
  }, [activeSection, isSliderInitialized, updateTabSlider]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      [resizeTimeoutRef, scrollTimeoutRef].forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
        }
      });
    };
  }, []);

  // Check if emotions are already logged for today
  useEffect(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const existingEmotions = userData.emotionalTracking?.find(
      emotion => format(new Date(emotion.date), 'yyyy-MM-dd') === todayStr
    );
    
    if (existingEmotions) {
      setTodayEmotions({
        anxiety: existingEmotions.anxiety || 5,
        moodStability: existingEmotions.moodStability || 5,
        mentalClarity: existingEmotions.mentalClarity || 5,
        emotionalProcessing: existingEmotions.emotionalProcessing || 5
      });
      setEmotionsLogged(true);
    }
  }, [userData.emotionalTracking]);

  // Handle emotional tracking
  const handleEmotionChange = (type, value) => {
    setTodayEmotions(prev => ({
      ...prev,
      [type]: value
    }));
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

  return (
    <div className="emotional-timeline-container">
      {/* Integrated Header Design */}
      <div className="integrated-timeline-header">
        <div className="header-title-section">
          <h2>Emotional Timeline</h2>
          <p className="header-subtitle">Track your emotional journey through the phases of recovery</p>
        </div>
        
        <div className="header-navigation-section">
          <div 
            className="navigation-pill-container" 
            ref={tabsRef}
          >
            <div 
              className="navigation-tab-slider" 
              ref={sliderRef}
              style={{ 
                opacity: 0,
                visibility: 'hidden',
                transform: 'translateX(0px)',
                width: '0px'
              }}
            />
            
            {navigationTabs.map(tab => (
              <button 
                key={tab.id}
                className={`navigation-section-btn ${activeSection === tab.id ? 'active' : ''}`}
                onClick={() => handleSectionClick(tab.id)}
                data-tab={tab.id}
              >
                <tab.icon />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Current Phase Display - ONLY VISIBLE ON JOURNEY MAP TAB */}
      {currentPhase && currentDay > 0 && activeSection === 'journey-map' && (
        <div className="current-phase-container">
          <div className="phase-card current">
            <div className="phase-date">Day {currentDay} of your journey</div>
            
            <div className="phase-icon-section">
              <div className="timeline-phase-icon" style={{ color: currentPhase.color }}>
                <currentPhase.icon style={{ color: currentPhase.color }} />
              </div>
              <div className="phase-info">
                <div className="phase-name">{currentPhase.name}</div>
                <div className="phase-range">Days {currentPhase.dayRange}</div>
              </div>
            </div>
            
            <div className="phase-description">
              {currentPhase.description}
            </div>

            <div className="phase-progress">
              <div 
                className="progress-bar progress-bar-shimmer"
                style={getPhaseColorVariables(currentPhase)}
              >
                <div 
                  className="progress-fill progress-fill-colored progress-fill-shimmer"
                  style={{ width: `${getPhaseProgress(currentPhase, currentDay, currentMasteryLevel)}%` }}
                ></div>
              </div>
              <div className="progress-text-container">
                <div className="progress-text">
                  {getPhaseProgressText(currentPhase, currentDay, currentMasteryLevel)}
                </div>
              </div>
            </div>

            <button 
              className="phase-detail-btn"
              onClick={() => showPhaseDetails(currentPhase)}
            >
              <FaInfoCircle />
              View Phase Details
            </button>
          </div>
        </div>
      )}

      {/* Section Content */}
      <div className="timeline-content-container">
        {/* Journey Map Section */}
        {activeSection === 'journey-map' && (
          <div className="timeline-overview">
            <h3>Complete Journey Map</h3>
            <div className="phases-timeline">
              {emotionalPhases.map((phase) => {
                const isCompleted = currentDay > phase.endDay && phase.endDay !== 999999;
                const isCurrent = currentPhase?.id === phase.id;
                const isUpcoming = currentDay < phase.startDay;
                
                return (
                  <div 
                    key={phase.id} 
                    className={`timeline-phase ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                    onClick={() => showPhaseDetails(phase)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="timeline-phase-icon">
                      <phase.icon style={{ color: phase.color }} />
                    </div>
                    <div className="timeline-phase-info">
                      <div className="timeline-phase-name">{phase.name}</div>
                      <div className="timeline-phase-range">Days {phase.dayRange}</div>
                      <div className="timeline-phase-description">{phase.description}</div>
                    </div>
                    <div className="timeline-phase-check">
                      <FaCheckCircle />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mastery Levels Display */}
            {currentDay >= 181 && (
              <div className="mastery-levels-section">
                <h3>Mastery Levels (Days 181+)</h3>
                <div className="mastery-levels-timeline">
                  {masteryLevels.map((level) => {
                    const isCompleted = currentDay > level.endDay && level.endDay !== 999999;
                    const isCurrent = currentMasteryLevel?.id === level.id;
                    const isUpcoming = currentDay < level.startDay;
                    
                    return (
                      <div 
                        key={level.id}
                        className={`mastery-level-card ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                      >
                        <div className="mastery-level-icon">
                          <level.icon style={{ color: 'var(--primary)' }} />
                        </div>
                        
                        <div className="mastery-level-info">
                          <div className="mastery-level-name">Level {level.level}: {level.name}</div>
                          <div className="mastery-level-subtitle">{level.subtitle}</div>
                          <div className="mastery-level-time-range">{level.timeRange}</div>
                        </div>
                        
                        <div className="mastery-level-status">
                          {isCompleted && (
                            <div className="mastery-level-check">
                              <FaCheckCircle />
                            </div>
                          )}
                          {isCurrent && (
                            <div className="mastery-level-current-badge">
                              Current
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Check-in Section */}
        {activeSection === 'check-in' && (
          <div className="emotional-checkin-section">
            <h3>Daily Emotional Check-in</h3>
            
            {/* Handle no active streak - show unavailable banner */}
            {!currentPhase || currentDay <= 0 ? (
              <div className="checkin-benefits-banner">
                <div className="checkin-benefits-helmet-container">
                  <div className="checkin-benefits-helmet-fallback">
                    <FaShieldAlt />
                  </div>
                </div>
                
                <div className="checkin-benefits-content">
                  <h4 className="checkin-benefits-title">
                    Check-in Unavailable - Start Your Journey
                  </h4>
                  <p className="checkin-benefits-description">
                    Emotional tracking requires an active retention streak to provide meaningful phase-based insights. Start your journey to begin daily emotional check-ins that unlock pattern recognition, challenge identification with solutions, and personalized strategies based on your progress through the retention phases.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="checkin-benefits-banner">
                  <div className="checkin-benefits-helmet-container">
                    <div className="checkin-benefits-helmet-fallback">
                      <FaShieldAlt />
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

                {/* UPDATED: Emotion sliders with new inline structure and value dots */}
                <div className="emotion-sliders">
                  {[
                    { key: 'anxiety', label: 'Anxiety Level', value: todayEmotions.anxiety, lowLabel: 'Calm', highLabel: 'High Anxiety' },
                    { key: 'moodStability', label: 'Mood Stability', value: todayEmotions.moodStability, lowLabel: 'Mood Swings', highLabel: 'Very Stable' },
                    { key: 'mentalClarity', label: 'Mental Clarity', value: todayEmotions.mentalClarity, lowLabel: 'Foggy', highLabel: 'Crystal Clear' },
                    { key: 'emotionalProcessing', label: 'Emotional Processing', value: todayEmotions.emotionalProcessing, lowLabel: 'Suppressed', highLabel: 'Flowing' }
                  ].map((emotion) => (
                    <div key={emotion.key} className="emotion-slider-item">
                      <div className="emotion-slider-header">
                        <span className="emotion-label">{emotion.label}</span>
                      </div>
                      <div className="emotion-slider-with-value">
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={emotion.value}
                          onChange={(e) => handleEmotionChange(emotion.key, parseInt(e.target.value))}
                          className="emotion-range-slider"
                          disabled={emotionsLogged}
                          style={{ '--slider-value': (emotion.value / 10) * 100 }}
                        />
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
            )}
          </div>
        )}

        {/* FIXED: Analysis Section with improved logic */}
        {activeSection === 'analysis' && (
          <div className="phase-insight-section">
            <h3>Comprehensive Phase Analysis</h3>
            
            {/* Handle no current phase (reset scenario) - Single consolidated banner */}
            {!currentPhase || currentDay <= 0 ? (
              <div className="insight-data-banner">
                <div className="insight-data-helmet-container">
                  <div className="insight-data-helmet-fallback">
                    <FaShieldAlt />
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
                
                return (
                  <>
                    {/* FIXED: Single comprehensive banner based on data state */}
                    <div className="insight-data-banner">
                      <div className="insight-data-helmet-container">
                        <div className="insight-data-helmet-fallback">
                          <FaShieldAlt />
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
                              <span className="insight-metric">Scientific Mechanisms</span>
                            </div>
                            <div className="insight-text">
                              <div className="patterns-display">
                                <div className="pattern-item">
                                  <strong>Neurochemical:</strong> {analysis.scientificExplanation.neurochemical}
                                </div>
                                <div className="pattern-item">
                                  <strong>Physiological:</strong> {analysis.scientificExplanation.physiological}
                                </div>
                                <div className="pattern-item">
                                  <strong>Behavioral:</strong> {analysis.scientificExplanation.behavioral}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Predictive Guidance Card - ALWAYS SHOW */}
                        {analysis?.predictiveGuidance && (
                          <div className="insight-card">
                            <div className="insight-card-header">
                              <span className="insight-metric">Predictive Guidance</span>
                            </div>
                            <div className="insight-text">
                              <div className="optimization-display">
                                <div className="optimization-criteria">
                                  <div className="optimization-criteria-title">Current Focus</div>
                                  <div className="optimization-criteria-text">{analysis.predictiveGuidance.currentFocus}</div>
                                </div>
                                <div className="optimization-item">
                                  <strong>Upcoming Challenge:</strong> {analysis.predictiveGuidance.upcomingChallenge}
                                </div>
                                <div className="optimization-item">
                                  <strong>Preparation:</strong> {analysis.predictiveGuidance.preparation}
                                </div>
                                <div className="optimization-item">
                                  <strong>Timeline:</strong> {analysis.predictiveGuidance.timeline}
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
                    )}
                  </>
                );
              })()
            )}
          </div>
        )}
      </div>

      {/* Phase Detail Modal */}
      {showPhaseDetail && selectedPhase && (
        <div className="modal-overlay" onClick={() => setShowPhaseDetail(false)}>
          <div className="modal-content phase-detail-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPhaseDetail(false)}>
              <FaTimes />
            </button>

            <div className="phase-modal-header">
              <div className="phase-modal-icon" style={{ color: selectedPhase.color }}>
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

            {/* Scientific Mechanism */}
            <div className="phase-modal-section">
              <h4>Scientific Mechanism</h4>
              <p>{selectedPhase.scientificMechanism}</p>
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
              <h4>⚠️ Warning Signs (Seek Support)</h4>
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

            <div className="phase-modal-insight">
              <h4>Scientific Understanding</h4>
              <p>{selectedPhase.insights.scientific}</p>
            </div>

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