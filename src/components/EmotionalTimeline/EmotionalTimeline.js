// components/EmotionalTimeline/EmotionalTimeline.js - Updated with banner-style progress info
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

// Import CSS files - UPDATED: Now imports both organized CSS files
import './EmotionalTimeline.css';
import './EmotionalTimelineSections.css';
import './EmotionalTimelineModals.css';

// Icons - FIXED: Added missing FaEdit import
import { 
  FaCheckCircle, FaInfoCircle, FaTimes,
  FaMapSigns, FaHeart, FaBrain, FaEdit
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
  
  // UPDATED: Add state for progress info banner visibility
  const [showProgressInfo, setShowProgressInfo] = useState(false);
  
  // UPDATED: Robust sliding pill navigation state - REMOVED JOURNAL TAB
  const [activeSection, setActiveSection] = useState('journey-map');
  
  // Enhanced emotional tracking states
  const [todayEmotions, setTodayEmotions] = useState({
    anxiety: 5,
    moodStability: 5,
    mentalClarity: 5,
    emotionalProcessing: 5
  });
  const [emotionsLogged, setEmotionsLogged] = useState(false);

  // BULLETPROOF: Mobile-First sliding tab state management matching Profile
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

  // Tab configuration matching design patterns - REMOVED JOURNAL TAB
  const navigationTabs = [
    { id: 'journey-map', label: 'Journey Map', icon: FaMapSigns },
    { id: 'check-in', label: 'Check-in', icon: FaCheckCircle },
    { id: 'analysis', label: 'Analysis', icon: FaBrain }
  ];

  // MOBILE DETECTION: Simplified mobile detection matching Profile
  const detectMobile = useCallback(() => {
    const isMobileDevice = window.innerWidth <= 768 || 'ontouchstart' in window;
    setIsMobile(isMobileDevice);
    return isMobileDevice;
  }, []);

  // BULLETPROOF: Enhanced slider positioning with perfect edge alignment
  const updateTabSlider = useCallback(() => {
    // Guard clauses for safety
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

      // Wait for next frame to ensure layout is complete
      requestAnimationFrame(() => {
        try {
          // Get measurements relative to container
          const containerRect = tabsContainer.getBoundingClientRect();
          const tabRect = activeTabElement.getBoundingClientRect();
          
          // Validate measurements
          if (containerRect.width === 0 || tabRect.width === 0) {
            console.warn('Invalid measurements, container or tab not rendered');
            return;
          }

          // Calculate position based on actual container content bounds
          const containerStyle = window.getComputedStyle(tabsContainer);
          const paddingLeft = parseFloat(containerStyle.paddingLeft) || 4;
          
          // Account for scroll position on mobile
          const scrollLeft = tabsContainer.scrollLeft || 0;
          
          // Calculate exact position relative to container's content area
          const leftOffset = tabRect.left - containerRect.left - paddingLeft + scrollLeft;
          const tabWidth = tabRect.width;
          
          // Apply positioning and make visible
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

  // ENHANCED: Scroll active tab into view on mobile
  const scrollToActiveTab = useCallback(() => {
    if (!isMobile || !tabsRef.current) return;
    
    const container = tabsRef.current;
    const activeTabElement = container.querySelector(`[data-tab="${activeSection}"]`);
    
    if (activeTabElement) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTabElement.getBoundingClientRect();
      
      // Check if tab is fully visible
      if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
        // Scroll the tab into view
        activeTabElement.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest'
        });
      }
    }
  }, [activeSection, isMobile]);

  // SIMPLIFIED: Clean tab change handler
  const handleSectionClick = useCallback((newSection) => {
    if (newSection === activeSection) return;
    
    setActiveSection(newSection);
    
    // On mobile, scroll to the active tab
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

  // ROBUST: Proper slider initialization
  useEffect(() => {
    const initializeSlider = () => {
      detectMobile();
      
      if (!tabsRef.current || !sliderRef.current) {
        return;
      }

      // Initialize slider immediately
      requestAnimationFrame(() => {
        const success = updateTabSlider();
        
        if (success) {
          setIsSliderInitialized(true);
          // Scroll to active tab on mobile
          if (isMobile) {
            scrollToActiveTab();
          }
        } else {
          // Retry after short delay to ensure DOM is ready
          setTimeout(() => {
            if (updateTabSlider()) {
              setIsSliderInitialized(true);
              if (isMobile) {
                scrollToActiveTab();
              }
            } else {
              // Final fallback - force slider to be visible
              if (sliderRef.current) {
                sliderRef.current.style.opacity = '1';
                sliderRef.current.style.visibility = 'visible';
                setIsSliderInitialized(true);
                // Try to update position one more time
                setTimeout(updateTabSlider, 50);
              }
            }
          }, 100);
        }
      });
    };

    // Initialize after DOM is ready
    const timer = setTimeout(initializeSlider, 100);
    
    return () => clearTimeout(timer);
  }, [updateTabSlider, detectMobile, isMobile, scrollToActiveTab]);

  // SIMPLIFIED: Basic resize handling
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
          // If switching to mobile, ensure active tab is visible
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
      // Small delay to ensure DOM is updated
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

  // UPDATED: Toggle progress info banner
  const toggleProgressInfo = () => {
    setShowProgressInfo(!showProgressInfo);
  };

  return (
    <div className="emotional-timeline-container">
      {/* UPDATED: Integrated Header Design matching Tracker/Calendar/Stats */}
      <div className="integrated-timeline-header">
        <div className="header-title-section">
          <h2>Emotional Timeline</h2>
          <p className="header-subtitle">Track your emotional journey through the phases of recovery</p>
        </div>
        
        <div className="header-navigation-section">
          {/* BULLETPROOF: Mobile-First Sliding Navigation Pills matching Profile */}
          <div 
            className="navigation-pill-container" 
            ref={tabsRef}
          >
            {/* ENHANCED: Bulletproof sliding indicator with mobile optimizations */}
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
              <div className="phase-icon" style={{ color: currentPhase.color }}>
                <currentPhase.icon />
              </div>
              <div className="phase-info">
                <div className="phase-name">{currentPhase.name}</div>
                <div className="phase-range">Days {currentPhase.dayRange}</div>
              </div>
            </div>
            
            <div className="phase-description">
              {currentPhase.description}
            </div>

            {/* Progress bar */}
            <div className="phase-progress">
              <div 
                className="progress-bar"
                style={{ '--phase-color': currentPhase.color }}
              >
                <div 
                  className="progress-fill progress-fill-colored"
                  style={{ width: `${getPhaseProgress(currentPhase, currentDay, currentMasteryLevel)}%` }}
                ></div>
              </div>
              <div className="progress-text-container">
                <div className="progress-text">
                  {getPhaseProgressText(currentPhase, currentDay, currentMasteryLevel)}
                </div>
                <div className="progress-explanation">
                  <FaInfoCircle 
                    className="progress-info-icon" 
                    onClick={toggleProgressInfo}
                  />
                  <div className={`progress-info-banner ${showProgressInfo ? 'visible' : ''}`}>
                    <div className="progress-info-banner-header">Progress Counter Explanation</div>
                    <div className="progress-info-banner-content">
                      • <strong>Current Day:</strong> Your total retention streak (Day {currentDay})
                      <br/>
                      • <strong>Phase Day:</strong> How many days you've been in the "{currentPhase.name}" phase
                      <br/>
                      • <strong>Phase Range:</strong> This phase spans days {currentPhase.dayRange}
                      <br/>
                      • <strong>Days Remaining:</strong> Days left until the next phase begins
                      <br/>
                      • <strong>Progress Bar:</strong> Shows completion % of current phase
                    </div>
                  </div>
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
                      {/* ADDED: Phase description matching mastery levels */}
                      <div className="timeline-phase-description">{phase.description}</div>
                    </div>
                    {/* UPDATED: All phases now show checkmarks with appropriate colors */}
                    <div className="timeline-phase-check">
                      <FaCheckCircle />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* UPDATED: Mastery Levels Display - Simple layout matching timeline phases */}
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
                        {/* UPDATED: Simple layout matching timeline phases */}
                        <div className="mastery-level-icon">
                          <level.icon />
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
            
            {/* FIXED: Benefits Banner with proper coming soon structure - matches analysis banner */}
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
                  ⚔️
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

            {/* Emotion sliders */}
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
                    <span className="emotion-value-clean">{emotion.value}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={emotion.value}
                    onChange={(e) => handleEmotionChange(emotion.key, parseInt(e.target.value))}
                    className="emotion-range-slider"
                    disabled={emotionsLogged}
                  />
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
          </div>
        )}

        {/* Analysis Section */}
        {activeSection === 'analysis' && (
          <div className="phase-insight-section">
            <h3>Comprehensive Phase Analysis</h3>
            
            {/* Handle no current phase (reset scenario) */}
            {!currentPhase || currentDay <= 0 ? (
              <div className="analysis-reset-state">
                <div className="optimization-criteria">
                  <div className="optimization-criteria-title">Analysis Unavailable</div>
                  <div className="optimization-criteria-text">
                    Phase analysis requires an active retention streak. Start your journey to unlock comprehensive insights about your emotional progression through the phases.
                  </div>
                </div>
                <div className="guidance-list">
                  <div className="guidance-title">What Analysis Provides</div>
                  <div className="guidance-item">Scientific explanations for each phase you experience</div>
                  <div className="guidance-item">Personal data analysis with trend recognition</div>
                  <div className="guidance-item">Challenge identification and solutions</div>
                  <div className="guidance-item">Predictive guidance for upcoming phases</div>
                  <div className="guidance-item">Actionable strategies based on your current phase</div>
                </div>
              </div>
            ) : (
              (() => {
                const analysis = generateComprehensivePhaseAnalysis(currentPhase, currentDay, userData, false, true);
                const emotionalData = userData.emotionalTracking || [];
                const recentData = emotionalData.filter(entry => 
                  differenceInDays(new Date(), new Date(entry.date)) <= 14
                );
                
                return (
                  <>
                    {/* FIXED: Data Analysis Banner with proper coming soon structure */}
                    {recentData.length < 7 && (
                      <div className="insight-data-banner">
                        <div className="insight-data-helmet-container">
                          <img 
                            className="insight-data-helmet" 
                            src="/helmet.png" 
                            alt="Analysis Improves" 
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'block';
                            }}
                          />
                          <div className="insight-data-helmet-fallback" style={{ display: 'none' }}>
                            ⚔️
                          </div>
                        </div>
                        
                        <div className="insight-data-content">
                          <h4 className="insight-data-title">
                            Analysis Improves with Data
                          </h4>
                          <p className="insight-data-description">
                            The more you track emotions, the more personalized and accurate this analysis becomes.
                            {recentData.length >= 3 && recentData.length < 7 && ` You've logged ${recentData.length} days - track 7+ days to unlock advanced pattern recognition.`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* UPDATED: Consolidated insufficient data section */}
                    {recentData.length < 3 && (
                      <div className="insufficient-data-section">
                        <div className="optimization-criteria">
                          <div className="optimization-criteria-title">Begin Your Analysis Journey</div>
                          <div className="optimization-criteria-text">
                            You're on day {currentDay - currentPhase.startDay + 1} of the {currentPhase.name} phase (total streak: day {currentDay}). 
                            Start tracking your emotions daily to unlock personalized insights including pattern recognition across emotional metrics, 
                            phase-specific challenge identification, predictive guidance for upcoming phases, personalized strategy recommendations, 
                            and scientific explanations for your experiences.
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Analysis Cards Grid */}
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

                        {/* Data Analysis Card - ONLY when sufficient data */}
                        {analysis?.dataAnalysis?.type === 'comprehensive' && (
                          <div className="insight-card">
                            <div className="insight-card-header">
                              <span className="insight-metric">Personal Data Analysis</span>
                            </div>
                            <div className="insight-text">
                              <div className="optimization-display">
                                <div className="optimization-metric-card">
                                  <div className="optimization-metric-value">{analysis.dataAnalysis.wellbeingScore.toFixed(1)}/10</div>
                                  <div className="optimization-metric-label">Overall Wellbeing Score</div>
                                </div>
                                <div className="relapse-summary-stats">
                                  <div className={`relapse-stat-card ${analysis.dataAnalysis.averages.avgAnxiety <= 4 ? 'conquered-trigger' : analysis.dataAnalysis.averages.avgAnxiety >= 7 ? 'primary-trigger' : ''}`}>
                                    <div className="relapse-stat-value">{analysis.dataAnalysis.averages.avgAnxiety.toFixed(1)}</div>
                                    <div className="relapse-stat-label">Anxiety Level
                                      {analysis.dataAnalysis.trends?.anxiety && (
                                        <span className={`trend ${analysis.dataAnalysis.trends.anxiety}`}>
                                          {analysis.dataAnalysis.trends.anxiety === 'improving' ? ' ↓' : 
                                           analysis.dataAnalysis.trends.anxiety === 'concerning' ? ' ↑' : ' →'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className={`relapse-stat-card ${analysis.dataAnalysis.averages.avgMoodStability >= 7 ? 'conquered-trigger' : analysis.dataAnalysis.averages.avgMoodStability <= 4 ? 'primary-trigger' : ''}`}>
                                    <div className="relapse-stat-value">{analysis.dataAnalysis.averages.avgMoodStability.toFixed(1)}</div>
                                    <div className="relapse-stat-label">Mood Stability
                                      {analysis.dataAnalysis.trends?.mood && (
                                        <span className={`trend ${analysis.dataAnalysis.trends.mood}`}>
                                          {analysis.dataAnalysis.trends.mood === 'improving' ? ' ↑' : 
                                           analysis.dataAnalysis.trends.mood === 'concerning' ? ' ↓' : ' →'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className={`relapse-stat-card ${analysis.dataAnalysis.averages.avgMentalClarity >= 7 ? 'conquered-trigger' : analysis.dataAnalysis.averages.avgMentalClarity <= 4 ? 'primary-trigger' : ''}`}>
                                    <div className="relapse-stat-value">{analysis.dataAnalysis.averages.avgMentalClarity.toFixed(1)}</div>
                                    <div className="relapse-stat-label">Mental Clarity
                                      {analysis.dataAnalysis.trends?.clarity && (
                                        <span className={`trend ${analysis.dataAnalysis.trends.clarity}`}>
                                          {analysis.dataAnalysis.trends.clarity === 'improving' ? ' ↑' : 
                                           analysis.dataAnalysis.trends.clarity === 'concerning' ? ' ↓' : ' →'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className={`relapse-stat-card ${analysis.dataAnalysis.averages.avgEmotionalProcessing >= 7 ? 'conquered-trigger' : analysis.dataAnalysis.averages.avgEmotionalProcessing <= 4 ? 'primary-trigger' : ''}`}>
                                    <div className="relapse-stat-value">{analysis.dataAnalysis.averages.avgEmotionalProcessing.toFixed(1)}</div>
                                    <div className="relapse-stat-label">Emotional Processing
                                      {analysis.dataAnalysis.trends?.processing && (
                                        <span className={`trend ${analysis.dataAnalysis.trends.processing}`}>
                                          {analysis.dataAnalysis.trends.processing === 'improving' ? ' ↑' : 
                                           analysis.dataAnalysis.trends.processing === 'concerning' ? ' ↓' : ' →'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {analysis.dataAnalysis.phaseAlignment && (
                                  <div className="optimization-criteria">
                                    <div className="optimization-criteria-title">Phase Alignment</div>
                                    <div className="optimization-criteria-text">
                                      {analysis.dataAnalysis.phaseAlignment.interpretation} ({Math.round(analysis.dataAnalysis.phaseAlignment.score * 100)}%)
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Challenge Identification Card */}
                        {analysis?.challengeIdentification?.challenges?.length > 0 && (
                          <div className="insight-card">
                            <div className="insight-card-header">
                              <span className="insight-metric">Challenge Analysis</span>
                            </div>
                            <div className="insight-text">
                              <div className={`risk-level-indicator ${analysis.challengeIdentification.riskLevel}`}>
                                <div className="risk-score-container">
                                  <div className={`risk-score ${analysis.challengeIdentification.riskLevel}`}>
                                    {analysis.challengeIdentification.riskLevel.toUpperCase()}
                                  </div>
                                  <div className="risk-level-text">Risk Level</div>
                                </div>
                              </div>
                              <div className="relapse-insights-list">
                                <div className="relapse-insights-title">Identified Challenges</div>
                                {analysis.challengeIdentification.challenges.map((challenge, index) => (
                                  <div key={index} className={`relapse-insight-item ${challenge.severity === 'high' ? 'primary-trigger' : ''}`}>
                                    <strong>{challenge.challenge}</strong> ({challenge.severity})
                                    <br/>
                                    {challenge.explanation}
                                    <br/>
                                    <strong>Solution:</strong> {challenge.solution}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Predictive Guidance Card */}
                        {analysis?.predictiveGuidance && (
                          <div className="insight-card">
                            <div className="insight-card-header">
                              <span className="insight-metric">Predictive Guidance</span>
                            </div>
                            <div className="insight-text">
                              <div className="patterns-display">
                                <div className="pattern-item">
                                  <strong>Current Focus:</strong> {analysis.predictiveGuidance.currentFocus}
                                </div>
                                <div className="pattern-item">
                                  <strong>Upcoming Challenge:</strong> {analysis.predictiveGuidance.upcomingChallenge}
                                </div>
                                <div className="pattern-item">
                                  <strong>Preparation:</strong> {analysis.predictiveGuidance.preparation}
                                </div>
                                <div className="optimization-criteria">
                                  <div className="optimization-criteria-title">Timeline</div>
                                  <div className="optimization-criteria-text">{analysis.predictiveGuidance.timeline}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actionable Strategies Card */}
                        {analysis?.actionableStrategies && (
                          <div className="insight-card">
                            <div className="insight-card-header">
                              <span className="insight-metric">Actionable Strategies</span>
                            </div>
                            <div className="insight-text">
                              <div className="optimization-display">
                                {analysis.actionableStrategies.urgent.length > 0 && (
                                  <div className="optimization-recommendations">
                                    <div className="optimization-title">Urgent Actions</div>
                                    {analysis.actionableStrategies.urgent.map((action, index) => (
                                      <div key={index} className="optimization-item" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                                        {action}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="optimization-recommendations">
                                  <div className="optimization-title">Daily Practices</div>
                                  {analysis.actionableStrategies.daily.map((action, index) => (
                                    <div key={index} className="optimization-item">
                                      {action}
                                    </div>
                                  ))}
                                </div>
                                <div className="optimization-recommendations">
                                  <div className="optimization-title">Weekly Focus</div>
                                  {analysis.actionableStrategies.weekly.map((action, index) => (
                                    <div key={index} className="optimization-item">
                                      {action}
                                    </div>
                                  ))}
                                </div>
                                <div className="optimization-recommendations">
                                  <div className="optimization-title">Long-term Development</div>
                                  {analysis.actionableStrategies.longTerm.map((action, index) => (
                                    <div key={index} className="optimization-item" style={{ backgroundColor: 'rgba(34, 197, 94, 0.05)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
                                      {action}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    )}

                    {/* Analysis Quality Footer */}
                    {analysis && (
                      <div className="analysis-footer">
                        <div className="energy-data-progress-indicator">
                          <div className="energy-data-progress-header">
                            <div className="energy-data-progress-title">Analysis Comprehensiveness</div>
                            <div className="energy-data-progress-count">{analysis.comprehensivenessScore}%</div>
                          </div>
                          <div className="energy-data-progress-bar">
                            <div 
                              className="energy-data-progress-fill"
                              style={{ width: `${analysis.comprehensivenessScore}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="data-quality-indicator">
                          <div className={`insight-data-quality ${analysis.dataQuality.level}`}>
                            {analysis.dataQuality.description}
                          </div>
                          <div className="insight-data-days">Based on {recentData.length} days of tracking</div>
                        </div>
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
                <selectedPhase.icon />
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