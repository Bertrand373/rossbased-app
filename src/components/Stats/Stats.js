// components/Stats/Stats.js - UPDATED: Yellow sliding pill menus matching Profile tab styling
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format, subDays, addDays, startOfDay, differenceInDays } from 'date-fns';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FaRegLightbulb, FaLock, FaMedal, FaTrophy, FaCheckCircle, FaRedo, FaInfoCircle, 
  FaExclamationTriangle, FaFrown, FaLaptop, FaHome, FaHeart, FaClock, FaBrain, FaEye, FaStar, FaChartLine, FaShieldAlt, FaFire, FaTimes, FaMoon, FaRocket } from 'react-icons/fa';
import './Stats.css';
import toast from 'react-hot-toast';
import helmetImage from '../../assets/helmet.png';
import SmartResetDialog from './SmartResetDialog';

// Import extracted components
import { StatCardModal } from './StatsComponents';
import { 
  ProgressTrendsAnalysis,
  RelapsePatternAnalytics, 
  PatternRecognition, 
  OptimizationGuidance,
  PhaseEvolutionAnalysis
} from './StatsInsights';

// Import utility functions
import {
  renderTextWithBold,
  getTimeRangeDisplayText,
  checkAndUpdateBadges,
  getCurrentPhase,
  getPhaseGuidance,
  getFilteredBenefitData,
  generateChartData,
  calculateAverage,
  shouldShowInfoBanner,
  calculateDataQuality,
  calculateDaysSinceLastRelapse,
  validateUserData
} from './StatsUtils';

// Import analytics functions
import {
  generatePatternRecognition,
  generateOptimizationGuidance,
  calculatePhaseEvolutionAnalysis,
  generateRelapsePatternAnalysis,
  calculateProgressTrends
} from './StatsAnalyticsUtils';

// NEW: Import Energy Intelligence System
import EnergyIntelligenceSection from './EnergyIntelligenceSection';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Stats = ({ userData, isPremium, updateUserData }) => {
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [timeRange, setTimeRange] = useState('week');
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showSmartResetDialog, setShowSmartResetDialog] = useState(false);
  
  // NEW: Stat card modal states
  const [showStatModal, setShowStatModal] = useState(false);
  const [selectedStatCard, setSelectedStatCard] = useState(null);
  
  // ENHANCED: Loading states for insights
  const [loadingStates, setLoadingStates] = useState({
    progressTrends: false,
    patternRecognition: false,
    optimization: false,
    relapsePatterns: false,
    phaseEvolution: false
  });
  
  const insightsStartRef = useRef(null);

  // NEW: Sliding pill refs and state for metric selector
  const metricContainerRef = useRef(null);
  const metricSliderRef = useRef(null);
  const [isMetricSliderInitialized, setIsMetricSliderInitialized] = useState(false);

  // NEW: Sliding pill refs and state for time range selector
  const timeRangeContainerRef = useRef(null);
  const timeRangeSliderRef = useRef(null);
  const [isTimeRangeSliderInitialized, setIsTimeRangeSliderInitialized] = useState(false);

  // Mobile state and resize timeout refs
  const [isMobile, setIsMobile] = useState(false);
  const resizeTimeoutRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // ENHANCED: Defensive programming - ensure userData structure
  const safeUserData = useMemo(() => validateUserData(userData), [userData]);

  // ENHANCED: Simulate loading for insights calculation
  const simulateInsightLoading = useCallback((insightType, duration = 800) => {
    setLoadingStates(prev => ({ ...prev, [insightType]: true }));
    setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, [insightType]: false }));
    }, duration);
  }, []);

  // Mobile detection
  const detectMobile = useCallback(() => {
    const isMobileDevice = window.innerWidth <= 768 || 'ontouchstart' in window;
    setIsMobile(isMobileDevice);
    return isMobileDevice;
  }, []);

  // ENHANCED: Trigger loading when time range or metric changes
  useEffect(() => {
    simulateInsightLoading('progressTrends', 600);
    setTimeout(() => simulateInsightLoading('patternRecognition', 800), 200);
    setTimeout(() => simulateInsightLoading('optimization', 600), 400);
    setTimeout(() => simulateInsightLoading('phaseEvolution', 900), 600);
    
    // Only load relapse patterns if user has actual relapse data
    const hasRelapseData = safeUserData.streakHistory?.some(streak => 
      streak && streak.reason === 'relapse' && streak.trigger
    );
    if (hasRelapseData) {
      setTimeout(() => simulateInsightLoading('relapsePatterns', 900), 800);
    }
  }, [timeRange, selectedMetric, simulateInsightLoading, safeUserData.streakHistory]);

  // NEW: Update metric slider position (EmotionalTimeline-exact implementation)
  const updateMetricSlider = useCallback(() => {
    if (!metricContainerRef.current || !metricSliderRef.current) {
      return false;
    }
    
    try {
      const container = metricContainerRef.current;
      const slider = metricSliderRef.current;
      const activeButton = container.querySelector(`[data-metric="${selectedMetric}"]`);
      
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
          console.error('Inner metric slider positioning failed:', innerError);
        }
      });
      
      return true;
      
    } catch (error) {
      console.error('Metric slider update failed:', error);
      return false;
    }
  }, [selectedMetric]);

  // NEW: Update time range slider position (EmotionalTimeline-exact implementation)
  const updateTimeRangeSlider = useCallback(() => {
    if (!timeRangeContainerRef.current || !timeRangeSliderRef.current) {
      return false;
    }
    
    try {
      const container = timeRangeContainerRef.current;
      const slider = timeRangeSliderRef.current;
      const activeButton = container.querySelector(`[data-timerange="${timeRange}"]`);
      
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
          console.error('Inner time range slider positioning failed:', innerError);
        }
      });
      
      return true;
      
    } catch (error) {
      console.error('Time range slider update failed:', error);
      return false;
    }
  }, [timeRange]);

  // Scroll active button into view on mobile (for metric selector)
  const scrollToActiveMetric = useCallback(() => {
    if (!isMobile || !metricContainerRef.current) return;
    
    const container = metricContainerRef.current;
    const activeButton = container.querySelector(`[data-metric="${selectedMetric}"]`);
    
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
  }, [selectedMetric, isMobile]);

  // Scroll active button into view on mobile (for time range selector)
  const scrollToActiveTimeRange = useCallback(() => {
    if (!isMobile || !timeRangeContainerRef.current) return;
    
    const container = timeRangeContainerRef.current;
    const activeButton = container.querySelector(`[data-timerange="${timeRange}"]`);
    
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
  }, [timeRange, isMobile]);

  // Handle metric selection with slider update and scroll
  const handleMetricClick = useCallback((metric) => {
    if (metric === selectedMetric) return;
    setSelectedMetric(metric);
    
    if (isMobile) {
      setTimeout(() => {
        scrollToActiveMetric();
        updateMetricSlider();
      }, 10);
    }
  }, [selectedMetric, isMobile, updateMetricSlider, scrollToActiveMetric]);

  // Handle time range selection with slider update and scroll
  const handleTimeRangeClick = useCallback((range) => {
    if (range === timeRange) return;
    setTimeRange(range);
    
    if (isMobile) {
      setTimeout(() => {
        scrollToActiveTimeRange();
        updateTimeRangeSlider();
      }, 10);
    }
  }, [timeRange, isMobile, updateTimeRangeSlider, scrollToActiveTimeRange]);

  // Handle scroll events to update metric slider position on mobile
  useEffect(() => {
    if (!isMobile || !metricContainerRef.current) return;
    
    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        updateMetricSlider();
      }, 50);
    };
    
    const container = metricContainerRef.current;
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isMobile, updateMetricSlider]);

  // NEW: Initialize metric slider
  useEffect(() => {
    const initializeMetricSlider = () => {
      detectMobile();
      
      if (!metricContainerRef.current || !metricSliderRef.current) {
        return;
      }

      requestAnimationFrame(() => {
        const success = updateMetricSlider();
        
        if (success) {
          setIsMetricSliderInitialized(true);
          if (isMobile) {
            scrollToActiveMetric();
          }
        } else {
          setTimeout(() => {
            if (updateMetricSlider()) {
              setIsMetricSliderInitialized(true);
              if (isMobile) {
                scrollToActiveMetric();
              }
            } else {
              if (metricSliderRef.current) {
                metricSliderRef.current.style.opacity = '1';
                metricSliderRef.current.style.visibility = 'visible';
                setIsMetricSliderInitialized(true);
                setTimeout(updateMetricSlider, 50);
              }
            }
          }, 100);
        }
      });
    };

    const timer = setTimeout(initializeMetricSlider, 100);
    return () => clearTimeout(timer);
  }, [updateMetricSlider, detectMobile, isMobile, scrollToActiveMetric]);

  // NEW: Initialize time range slider
  useEffect(() => {
    const initializeTimeRangeSlider = () => {
      detectMobile();
      
      if (!timeRangeContainerRef.current || !timeRangeSliderRef.current) {
        return;
      }

      requestAnimationFrame(() => {
        const success = updateTimeRangeSlider();
        
        if (success) {
          setIsTimeRangeSliderInitialized(true);
          if (isMobile) {
            scrollToActiveTimeRange();
          }
        } else {
          setTimeout(() => {
            if (updateTimeRangeSlider()) {
              setIsTimeRangeSliderInitialized(true);
              if (isMobile) {
                scrollToActiveTimeRange();
              }
            } else {
              if (timeRangeSliderRef.current) {
                timeRangeSliderRef.current.style.opacity = '1';
                timeRangeSliderRef.current.style.visibility = 'visible';
                setIsTimeRangeSliderInitialized(true);
                setTimeout(updateTimeRangeSlider, 50);
              }
            }
          }, 100);
        }
      });
    };

    const timer = setTimeout(initializeTimeRangeSlider, 100);
    return () => clearTimeout(timer);
  }, [updateTimeRangeSlider, detectMobile, isMobile, scrollToActiveTimeRange]);

  // Handle resize for both sliders
  useEffect(() => {
    const handleResize = () => {
      const wasMobile = isMobile;
      detectMobile();
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        if (isMetricSliderInitialized) {
          updateMetricSlider();
          if (!wasMobile && isMobile) {
            scrollToActiveMetric();
          }
        }
        if (isTimeRangeSliderInitialized) {
          updateTimeRangeSlider();
          if (!wasMobile && isMobile) {
            scrollToActiveTimeRange();
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
  }, [isMetricSliderInitialized, isTimeRangeSliderInitialized, detectMobile, updateMetricSlider, updateTimeRangeSlider, isMobile, scrollToActiveMetric, scrollToActiveTimeRange]);

  // Update sliders when selections change
  useEffect(() => {
    if (isMetricSliderInitialized) {
      setTimeout(updateMetricSlider, 10);
    }
  }, [selectedMetric, isMetricSliderInitialized, updateMetricSlider]);

  useEffect(() => {
    if (isTimeRangeSliderInitialized) {
      setTimeout(updateTimeRangeSlider, 10);
    }
  }, [timeRange, isTimeRangeSliderInitialized, updateTimeRangeSlider]);

  // NEW: Handle stat card click
  const handleStatCardClick = useCallback((statType) => {
    // Only show modals for the clickable cards (not current streak)
    if (statType === 'currentStreak') return;
    
    setSelectedStatCard(statType);
    setShowStatModal(true);
  }, []);

  // ENHANCED: Memoized calculations for performance
  const memoizedInsights = useMemo(() => {
    if (!safeUserData) return {};
    
    return {
      progressTrends: calculateProgressTrends(safeUserData, timeRange),
      patternInsights: generatePatternRecognition(safeUserData, selectedMetric, true),
      optimizationGuidance: generateOptimizationGuidance(safeUserData, selectedMetric, timeRange, true),
      dataQuality: calculateDataQuality(safeUserData),
      phaseEvolution: calculatePhaseEvolutionAnalysis(safeUserData, selectedMetric),
      relapsePatterns: generateRelapsePatternAnalysis(safeUserData),
      daysSinceLastRelapse: calculateDaysSinceLastRelapse(safeUserData)
    };
  }, [safeUserData, timeRange, selectedMetric]);

  // Auto-check badges when streak changes
  useEffect(() => {
    if (safeUserData && safeUserData.currentStreak !== undefined) {
      const updatedData = checkAndUpdateBadges(safeUserData);
      
      if (JSON.stringify(updatedData.badges) !== JSON.stringify(safeUserData.badges)) {
        updateUserData?.(updatedData);
      }
    }
  }, [safeUserData?.currentStreak, safeUserData?.longestStreak, updateUserData, safeUserData]);

  const formatDate = (date) => format(new Date(date), 'MMM d, yyyy');
  
  const handleBadgeClick = useCallback((badge) => {
    setSelectedBadge(badge);
    setShowBadgeModal(true);
  }, []);

  const handleResetStats = useCallback(() => {
    setShowSmartResetDialog(true);
  }, []);

  // Enhanced reset function with different levels
  const confirmResetStats = useCallback((resetLevel) => {
    if (!updateUserData) {
      console.error('updateUserData function is not available');
      toast.error('Unable to reset data - please refresh the page');
      return;
    }

    let resetUserData = { ...safeUserData };
    const today = new Date();

    switch (resetLevel) {
      case 'currentStreak':
        resetUserData = {
          ...safeUserData,
          currentStreak: 0,
          startDate: today,
          streakHistory: [
            ...(safeUserData.streakHistory || []),
            {
              id: (safeUserData.streakHistory?.length || 0) + 1,
              start: today,
              end: null,
              days: 0,
              reason: 'manual_reset'
            }
          ]
        };
        toast.success('Current streak reset to 0. All history and achievements preserved.');
        break;

      case 'allProgress':
        resetUserData = {
          ...safeUserData,
          startDate: today,
          currentStreak: 0,
          relapseCount: 0,
          wetDreamCount: 0,
          longestStreak: safeUserData.longestStreak || 0,
          streakHistory: [{
            id: 1,
            start: today,
            end: null,
            days: 0,
            reason: 'major_reset'
          }],
          benefitTracking: [],
          notes: {},
          badges: safeUserData.badges?.map(badge => ({
            ...badge,
            earned: (badge.name === '90-Day King' && (safeUserData.longestStreak || 0) >= 90) ||
                   (badge.name === '180-Day Emperor' && (safeUserData.longestStreak || 0) >= 180) ||
                   (badge.name === '365-Day Sage' && (safeUserData.longestStreak || 0) >= 365) ? badge.earned : false,
            date: ((badge.name === '90-Day King' && (safeUserData.longestStreak || 0) >= 90) ||
                  (badge.name === '180-Day Emperor' && (safeUserData.longestStreak || 0) >= 180) ||
                  (badge.name === '365-Day Sage' && (safeUserData.longestStreak || 0) >= 365)) ? badge.date : null
          })) || []
        };
        toast.success(`All progress reset. Longest streak record (${safeUserData.longestStreak || 0} days) preserved.`);
        break;

      case 'everything':
        resetUserData = {
          startDate: today,
          currentStreak: 0,
          longestStreak: 0,
          wetDreamCount: 0,
          relapseCount: 0,
          badges: [
            { id: 1, name: '7-Day Warrior', earned: false, date: null },
            { id: 2, name: '14-Day Monk', earned: false, date: null },
            { id: 3, name: '30-Day Master', earned: false, date: null },
            { id: 4, name: '90-Day King', earned: false, date: null },
            { id: 5, name: '180-Day Emperor', earned: false, date: null },
            { id: 6, name: '365-Day Sage', earned: false, date: null }
          ],
          benefitTracking: [],
          streakHistory: [{
            id: 1,
            start: today,
            end: null,
            days: 0,
            reason: 'complete_reset'
          }],
          notes: {}
        };
        toast.success('Complete reset successful. All data has been cleared.');
        break;

      default:
        toast.error('Invalid reset option selected');
        return;
    }
    
    updateUserData(resetUserData);
    setShowSmartResetDialog(false);
  }, [safeUserData, updateUserData]);

  const handleUpgradeClick = useCallback(() => {
    toast.success('All features are now free! 🎉');
  }, []);

  // ENHANCED: Memoized chart options
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 10,
        ticks: {
          stepSize: 2,
          color: '#aaaaaa',
          font: { size: 12 }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        }
      },
      x: {
        ticks: {
          color: '#aaaaaa',
          font: { size: 12 },
          maxTicksLimit: timeRange === 'quarter' ? 12 : timeRange === 'month' ? 15 : 7,
          maxRotation: timeRange === 'quarter' ? 45 : 0
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: (tooltipItem) => {
          return tooltipItem.parsed.y !== null;
        },
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            const chartData = generateChartData(safeUserData, selectedMetric, timeRange);
            if (!chartData.timeRangeArray[idx]) return '';
            return formatDate(chartData.timeRangeArray[idx].date);
          },
          label: (context) => {
            const value = context.parsed.y;
            if (value === null) return '';
            const metricName = selectedMetric === 'sleep' ? 'Sleep Quality' : 
                             selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1);
            return `${metricName}: ${value}/10`;
          }
        },
        backgroundColor: 'rgba(44, 44, 44, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#ffdd00',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    onHover: (event, activeElements) => {
      event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
    }
  }), [timeRange, safeUserData, selectedMetric]);

  // ENHANCED: Check if user has sufficient data for insights
  const hasInsufficientData = useMemo(() => {
    return (safeUserData.benefitTracking?.length || 0) < 3;
  }, [safeUserData.benefitTracking]);
  
  return (
    <div className="stats-container">
      {/* UPDATED: Header styling to match Tracker/Calendar tabs */}
      <div className="integrated-stats-header">
        <div className="stats-header-title-section">
          <h2>Your Stats</h2>
          <p className="stats-header-subtitle">Comprehensive analytics and insights from your retention journey</p>
        </div>
        <div className="stats-header-actions-section">
          <div className="stats-header-actions">
            <button 
              className="action-btn reset-stats-btn" 
              onClick={handleResetStats}
              onKeyDown={(e) => e.key === 'Enter' && handleResetStats()}
              tabIndex={0}
            >
              <FaRedo />
              <span>Reset Progress</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Smart Reset Dialog */}
      <SmartResetDialog
        isOpen={showSmartResetDialog}
        onClose={() => setShowSmartResetDialog(false)}
        onConfirm={confirmResetStats}
        userData={safeUserData}
      />
      
      {/* Streak Statistics */}
      <div className="streak-stats">
        <div className="stat-card current-streak">
          <div className="stat-value">{safeUserData.currentStreak || 0}</div>
          <div className="stat-label">Current Streak</div>
        </div>
        
        <div 
          className="stat-card longest-streak clickable-stat" 
          onClick={() => handleStatCardClick('longestStreak')}
          onKeyDown={(e) => e.key === 'Enter' && handleStatCardClick('longestStreak')}
          tabIndex={0}
          role="button"
          aria-label="View longest streak details"
        >
          <div className="stat-value">{safeUserData.longestStreak || 0}</div>
          <div className="stat-label">Longest Streak</div>
        </div>
        
        <div 
          className="stat-card total-wetdreams clickable-stat" 
          onClick={() => handleStatCardClick('wetDreams')}
          onKeyDown={(e) => e.key === 'Enter' && handleStatCardClick('wetDreams')}
          tabIndex={0}
          role="button"
          aria-label="View wet dreams analysis"
        >
          <div className="stat-value">{safeUserData.wetDreamCount || 0}</div>
          <div className="stat-label">Wet Dreams</div>
        </div>
        
        <div 
          className="stat-card total-relapses clickable-stat" 
          onClick={() => handleStatCardClick('relapses')}
          onKeyDown={(e) => e.key === 'Enter' && handleStatCardClick('relapses')}
          tabIndex={0}
          role="button"
          aria-label="View relapse analysis"
        >
          <div className="stat-value">{safeUserData.relapseCount || 0}</div>
          <div className="stat-label">Relapses</div>
        </div>
      </div>
      
      {/* Stat Card Details Modal */}
      <StatCardModal
        showModal={showStatModal}
        selectedStatCard={selectedStatCard}
        onClose={() => setShowStatModal(false)}
        userData={safeUserData}
      />
      
      {/* Milestone Badges */}
      <div className="milestone-section">
        <h3>Your Achievements</h3>
        
        <div className="badges-grid">
          {safeUserData.badges && safeUserData.badges.map(badge => (
            <div 
              key={badge.id} 
              className={`badge-card ${badge.earned ? 'earned' : 'locked'}`}
              onClick={() => badge.earned && handleBadgeClick(badge)}
              onKeyDown={(e) => e.key === 'Enter' && badge.earned && handleBadgeClick(badge)}
              tabIndex={badge.earned ? 0 : -1}
              role={badge.earned ? "button" : "presentation"}
              aria-label={badge.earned ? `View ${badge.name} achievement details` : `${badge.name} - Not earned yet`}
            >
              <div className="badge-icon">
                {badge.earned ? (
                  <FaTrophy className="badge-earned-icon" />
                ) : (
                  <FaLock className="badge-locked-icon" />
                )}
              </div>
              <div className="badge-name">{badge.name}</div>
              {badge.earned && badge.date && (
                <div className="badge-date">
                  Earned {format(new Date(badge.date), 'MMM d')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Benefit Tracker */}
      <div className="benefit-tracker-section">
        <h3>Benefit Tracker</h3>
        
        {/* NEW: Always-visible Building Your Profile banner */}
        {safeUserData && (
          <div className="benefit-tracker-profile-banner">
            <div className="benefit-tracker-helmet-container">
              <img 
                src={helmetImage} 
                alt="Building Profile" 
                className="benefit-tracker-helmet"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="benefit-tracker-helmet-fallback" style={{display: 'none'}}>🪖</div>
            </div>
            <div className="benefit-tracker-banner-content">
              <div className="benefit-tracker-banner-title">
                {(safeUserData.benefitTracking?.length || 0) >= 14 ? 'Your Analytics Profile' : 'Building Your Profile'}
              </div>
              <div className="benefit-tracker-banner-message">
                {(safeUserData.benefitTracking?.length || 0) >= 14 
                  ? 'Your personalized analytics are ready. Access detailed charts tracking each benefit across time periods, pattern recognition identifying your peak performance zones, phase evolution analysis showing how your benefits develop through retention stages, optimization guidance with targeted recommendations, and comprehensive progress trends revealing your journey trajectory.' 
                  : `Track ${14 - (safeUserData.benefitTracking?.length || 0)} more days to unlock personalized analytics including detailed benefit charts, pattern recognition across all metrics, phase-specific evolution analysis, optimization recommendations, and comprehensive progress trends tailored to your retention journey.`}
              </div>
            </div>
          </div>
        )}
        
        {/* Controls */}
        <div className="benefit-tracker-controls">
          <div className="metric-selector">
            {/* UPDATED: Metric pill container with sliding yellow pill */}
            <div className="metric-pill-container" ref={metricContainerRef}>
              {/* Yellow sliding pill background */}
              <div className="metric-pill-slider" ref={metricSliderRef}></div>
              
              <button 
                className={`metric-btn ${selectedMetric === 'energy' ? 'active' : ''}`}
                onClick={() => handleMetricClick('energy')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('energy')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'energy'}
                data-metric="energy"
              >
                Energy
              </button>
              <button 
                className={`metric-btn ${selectedMetric === 'focus' ? 'active' : ''}`}
                onClick={() => handleMetricClick('focus')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('focus')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'focus'}
                data-metric="focus"
              >
                Focus
              </button>
              <button 
                className={`metric-btn ${selectedMetric === 'confidence' ? 'active' : ''}`}
                onClick={() => handleMetricClick('confidence')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('confidence')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'confidence'}
                data-metric="confidence"
              >
                Confidence
              </button>
              <button 
                className={`metric-btn ${selectedMetric === 'aura' ? 'active' : ''}`}
                onClick={() => handleMetricClick('aura')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('aura')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'aura'}
                data-metric="aura"
              >
                Aura
              </button>
              <button 
                className={`metric-btn ${selectedMetric === 'sleep' ? 'active' : ''}`}
                onClick={() => handleMetricClick('sleep')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('sleep')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'sleep'}
                data-metric="sleep"
              >
                Sleep Quality
              </button>
              <button 
                className={`metric-btn ${selectedMetric === 'workout' ? 'active' : ''}`}
                onClick={() => handleMetricClick('workout')}
                onKeyDown={(e) => e.key === 'Enter' && handleMetricClick('workout')}
                tabIndex={0}
                aria-pressed={selectedMetric === 'workout'}
                data-metric="workout"
              >
                Workout
              </button>
            </div>
          </div>
          
          <div className="time-range-selector-container">
            {/* UPDATED: Time range selector with sliding yellow pill */}
            <div className="time-range-selector" ref={timeRangeContainerRef} role="radiogroup" aria-label="Time range selection">
              {/* Yellow sliding pill background */}
              <div className="time-range-pill-slider" ref={timeRangeSliderRef}></div>
              
              <button 
                className={`time-btn ${timeRange === 'week' ? 'active' : ''}`}
                onClick={() => handleTimeRangeClick('week')}
                onKeyDown={(e) => e.key === 'Enter' && handleTimeRangeClick('week')}
                tabIndex={0}
                role="radio"
                aria-checked={timeRange === 'week'}
                data-timerange="week"
              >
                Week
              </button>
              <button 
                className={`time-btn ${timeRange === 'month' ? 'active' : ''}`}
                onClick={() => handleTimeRangeClick('month')}
                onKeyDown={(e) => e.key === 'Enter' && handleTimeRangeClick('month')}
                tabIndex={0}
                role="radio"
                aria-checked={timeRange === 'month'}
                data-timerange="month"
              >
                Month
              </button>
              <button 
                className={`time-btn ${timeRange === 'quarter' ? 'active' : ''}`}
                onClick={() => handleTimeRangeClick('quarter')}
                onKeyDown={(e) => e.key === 'Enter' && handleTimeRangeClick('quarter')}
                tabIndex={0}
                role="radio"
                aria-checked={timeRange === 'quarter'}
                data-timerange="quarter"
              >
                3 Months
              </button>
            </div>
          </div>
        </div>
        
        <div className="chart-and-insight-container" ref={insightsStartRef}>
          <div className="chart-container">
            {(() => {
              const chartData = generateChartData(safeUserData, selectedMetric, timeRange);
              const hasAnyData = chartData.datasets[0].data.some(val => val !== null);
              
              if (!hasAnyData) {
                return (
                  <div className="no-chart-data">
                    <div className="no-data-icon">
                      <FaChartLine />
                    </div>
                    <div className="no-data-text">
                      <h4>No Chart Data Available</h4>
                      <p>Start logging your {selectedMetric} benefits to see your progress visualization.</p>
                    </div>
                  </div>
                );
              }
              
              return <Line data={chartData} options={chartOptions} height={300} />;
            })()}
          </div>
          
          <div className="current-insight-sidebar">
            <div className="current-metric-average">
              <div className="current-metric-label">
                Your {selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} {getTimeRangeDisplayText(timeRange)}
              </div>
              <div className="current-metric-value">
                {calculateAverage(safeUserData, selectedMetric, timeRange, true) === 'N/A' ? 'N/A' : `${calculateAverage(safeUserData, selectedMetric, timeRange, true)}/10`}
              </div>
            </div>
            
            <div className="current-insight-card">
              <div className="current-insight-header">
                <span>Current Status</span>
              </div>
              <div className="current-insight-text">
                {(() => {
                  const avg = calculateAverage(safeUserData, selectedMetric, timeRange, true);
                  const phase = getCurrentPhase(safeUserData);
                  
                  if (avg === 'N/A') {
                    return `No ${selectedMetric} data for the selected ${timeRange} period. Start logging benefits to see your progress.`;
                  }
                  
                  const avgValue = parseFloat(avg);
                  
                  if (avgValue >= 7) {
                    return `Your ${selectedMetric} is excellent at ${avg}/10. You're in the ${phase} phase - maintain current strategies and channel this energy into growth.`;
                  } else {
                    return `Your ${selectedMetric} averaged ${avg}/10 during ${phase} phase. Check personalized insights below for optimization strategies.`;
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Personalized Insights Section */}
        <div className="personalized-insights-section">
          <div className="personalized-insights-header">
            <h3>Personalized Insights</h3>
          </div>
          
          {/* Progress & Trends Analysis */}
          <ProgressTrendsAnalysis
            isLoading={loadingStates.progressTrends}
            hasInsufficientData={hasInsufficientData}
            userData={safeUserData}
            progressTrends={memoizedInsights.progressTrends}
            dataQuality={memoizedInsights.dataQuality}
            selectedMetric={selectedMetric}
          />
          
          {/* Relapse Pattern Analytics */}
          <RelapsePatternAnalytics
            isLoading={loadingStates.relapsePatterns}
            relapsePatterns={memoizedInsights.relapsePatterns}
            daysSinceLastRelapse={memoizedInsights.daysSinceLastRelapse}
          />
          
          {/* Pattern Recognition */}
          <PatternRecognition
            isLoading={loadingStates.patternRecognition}
            hasInsufficientData={hasInsufficientData}
            userData={safeUserData}
            patternInsights={memoizedInsights.patternInsights}
            dataQuality={memoizedInsights.dataQuality}
          />
          
          {/* Optimization Guidance */}
          <OptimizationGuidance
            isLoading={loadingStates.optimization}
            hasInsufficientData={hasInsufficientData}
            userData={safeUserData}
            optimizationGuidance={memoizedInsights.optimizationGuidance}
            dataQuality={memoizedInsights.dataQuality}
          />
          
          {/* Phase Evolution Analysis */}
          <PhaseEvolutionAnalysis
            isLoading={loadingStates.phaseEvolution}
            phaseEvolution={memoizedInsights.phaseEvolution}
            selectedMetric={selectedMetric}
            dataQuality={memoizedInsights.dataQuality}
            currentStreak={safeUserData.currentStreak}
          />
        </div>
      </div>
      
      {/* Badge Modal */}
      {showBadgeModal && selectedBadge && (
        <div className="modal-overlay" onClick={() => setShowBadgeModal(false)} role="dialog" aria-modal="true" aria-labelledby="badge-modal-title">
          <div className="modal-content badge-modal" onClick={e => e.stopPropagation()}>
            <button 
              className="badge-modal-close"
              onClick={() => setShowBadgeModal(false)}
              aria-label="Close modal"
            >
              <FaTimes />
            </button>
            
            <div className="badge-trophy">
              <FaMedal className="badge-trophy-icon" />
            </div>
            
            <h3 id="badge-modal-title">{selectedBadge.name}</h3>
            
            <div className="badge-earned-date">
              Earned on {selectedBadge.date ? format(new Date(selectedBadge.date), 'MMMM d, yyyy') : 'Unknown'}
            </div>
            
            <div className="badge-description">
              <p>
                {selectedBadge.name === '7-Day Warrior' ? 
                  'You\'ve shown tremendous discipline by maintaining a 7-day streak. Your foundation phase is complete - energy fluctuations are stabilizing and mental clarity is emerging!' :
                selectedBadge.name === '14-Day Monk' ? 
                  'Two weeks of dedication! You\'re in the adjustment phase with noticeable strength gains, improved posture, and enhanced focus. Your transformation is becoming visible!' :
                selectedBadge.name === '30-Day Master' ? 
                  'A full month of commitment! You\'ve entered the momentum phase with natural body composition changes, sustained energy, and mental clarity. True mastery developing!' :
                selectedBadge.name === '90-Day King' ? 
                  'Incredible achievement! 90 days represents complete physical and mental transformation. You\'ve reached royal status with emotional mastery and magnetic presence!' :
                selectedBadge.name === '180-Day Emperor' ? 
                  'Extraordinary dedication! Six months of practice has brought spiritual integration and identity transformation. You embody the divine masculine archetype!' :
                selectedBadge.name === '365-Day Sage' ? 
                  'Ultimate mastery achieved! One full year represents complete energy transmutation and service-oriented consciousness. You are now a teacher and healer for others!' :
                  'Congratulations on earning this achievement!'
                }
              </p>
            </div>
            
            <div className="badge-benefits">
              <h4>Benefits Unlocked:</h4>
              <ul>
                {selectedBadge.name === '7-Day Warrior' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Energy fluctuations stabilizing</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Brief periods of mental sharpness</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Growing sense of possibility</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Motivation to improve life areas</span></li>
                  </>
                )}
                {selectedBadge.name === '14-Day Monk' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Noticeable strength gains</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Improved posture and presence</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Enhanced memory and focus</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Mood stabilization beginning</span></li>
                  </>
                )}
                {selectedBadge.name === '30-Day Master' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Natural muscle gain and fat loss</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Sustained high energy levels</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Sleep optimization and better rest</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Mental clarity and pattern recognition</span></li>
                  </>
                )}
                {selectedBadge.name === '90-Day King' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Complete emotional regulation</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Natural magnetism and charisma</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Exceptional mental performance</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Physical transformation complete</span></li>
                  </>
                )}
                {selectedBadge.name === '180-Day Emperor' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Spiritual integration and wisdom</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Natural leadership presence</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Identity transformation complete</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Conscious energy mastery</span></li>
                  </>
                )}
                {selectedBadge.name === '365-Day Sage' && (
                  <>
                    <li><FaCheckCircle className="check-icon" /><span>Mastery of sexual energy transmutation</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Service-oriented consciousness</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Generational pattern breaking</span></li>
                    <li><FaCheckCircle className="check-icon" /><span>Teaching and healing abilities</span></li>
                  </>
                )}
              </ul>
            </div>
            
            <div className="modal-actions">
              <button 
                className="modal-got-it-btn" 
                onClick={() => setShowBadgeModal(false)}
                onKeyDown={(e) => e.key === 'Enter' && setShowBadgeModal(false)}
              >
                <FaCheckCircle />
                Continue Journey
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;