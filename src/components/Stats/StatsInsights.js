// StatsInsights.js - TITANTRACK
// Pure data analytics components - no static educational content
// REFACTORED: Sections are now data-driven, matching Landing page aesthetic

import React from 'react';
import { useNavigate } from 'react-router-dom';
import './StatsInsights.css';
import './StatsInsights.css';

// ============================================================
// SECTION 1: YOUR NUMBERS - Always visible, even Day 1
// 7-day averages with trend indicators
// ============================================================
export const YourNumbers = ({ 
  metricAverages, 
  metricTrends, 
  metricExtremes,
  daysTracked,
  isLoading 
}) => {
  const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
  
  // Render trend indicator
  const renderDelta = (metric) => {
    if (!metricTrends || !metricTrends[metric]) {
      return <span className="number-delta neutral">—</span>;
    }
    
    const { delta, direction } = metricTrends[metric];
    
    if (direction === 'up') {
      return <span className="number-delta positive">↑ {delta > 0 ? '+' : ''}{delta}</span>;
    } else if (direction === 'down') {
      return <span className="number-delta negative">↓ {delta}</span>;
    }
    return <span className="number-delta neutral">—</span>;
  };
  
  // Get value or placeholder
  const getValue = (metric) => {
    if (!metricAverages?.averages?.[metric]?.value) {
      return '—';
    }
    return metricAverages.averages[metric].value.toFixed(1);
  };
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Your Numbers</span>
        <span className="header-sub">7-day avg</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <div className="insight-loading">
            <div className="insight-loading-spinner"></div>
          </div>
        ) : !metricAverages ? (
          <div className="insight-empty">
            <p className="empty-message">Start tracking to see your averages</p>
            <p className="empty-context">Log your daily benefits in the Tracker tab</p>
          </div>
        ) : (
          <>
            <div className="numbers-grid">
              {metrics.map(metric => (
                <div key={metric} className="number-item">
                  <span className="number-label">{metric}</span>
                  <span className="number-value">{getValue(metric)}</span>
                  {daysTracked >= 14 && renderDelta(metric)}
                </div>
              ))}
            </div>
            
            {/* Strongest & Growth Area - only show if meaningful */}
            {metricExtremes?.strongest && metricExtremes?.growthArea && (
              <div className="extremes-row">
                <div className="extreme-item">
                  <span className="extreme-label">Strongest</span>
                  <span className="extreme-value">{metricExtremes.strongest.metric}</span>
                </div>
                <div className="extreme-divider" />
                <div className="extreme-item">
                  <span className="extreme-label">Growth area</span>
                  <span className="extreme-value">{metricExtremes.growthArea.metric}</span>
                </div>
              </div>
            )}
            
            {/* Show tracking prompt if not enough data for trends */}
            {daysTracked < 14 && (
              <p className="tracking-prompt">
                {14 - daysTracked} more days for trend analysis
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================
// SECTION 2: YOUR PATTERNS - Unlocks at 14+ days
// Real correlations from user data
// ============================================================
export const YourPatterns = ({ 
  dayOfWeekPatterns,
  metricCorrelations,
  growthRates,
  selectedMetric,
  daysTracked,
  isLoading 
}) => {
  const UNLOCK_THRESHOLD = 14;
  const needsMoreData = daysTracked < UNLOCK_THRESHOLD;
  
  // Format metric name for display
  const formatMetric = (metric) => {
    if (metric === 'sleep') return 'sleep quality';
    return metric;
  };
  
  // Capitalize first letter helper
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
  
  // Build pattern insights from data
  const buildPatternInsights = () => {
    const insights = [];
    
    // Day-of-week pattern for selected metric
    if (dayOfWeekPatterns?.peakDay && dayOfWeekPatterns?.lowDay) {
      // Only show if there's meaningful variation (peak vs low difference > 0.5)
      const variation = dayOfWeekPatterns.peakDay.average - dayOfWeekPatterns.lowDay.average;
      
      if (variation >= 0.5) {
        const peakDays = dayOfWeekPatterns.dayAverages
          .filter(d => d.average >= dayOfWeekPatterns.peakDay.average - 0.2)
          .map(d => d.day)
          .slice(0, 3);
        
        if (peakDays.length > 0 && peakDays.length < 5) { // Don't show if almost all days are "peak"
          insights.push({
            type: 'day_pattern',
            text: `${capitalize(formatMetric(selectedMetric))} peaks ${peakDays.join(', ')}`,
            detail: `${dayOfWeekPatterns.peakDay.average}/10 avg`
          });
        }
      }
    }
    
    // Weekday vs weekend pattern
    if (dayOfWeekPatterns?.weekdayAvg && dayOfWeekPatterns?.weekendAvg) {
      const diff = dayOfWeekPatterns.weekdayAvg - dayOfWeekPatterns.weekendAvg;
      if (Math.abs(diff) >= 0.5) {
        const better = diff > 0 ? 'weekdays' : 'weekends';
        insights.push({
          type: 'week_pattern',
          text: `Higher ${formatMetric(selectedMetric)} on ${better}`,
          detail: `${Math.abs(diff).toFixed(1)} point difference`
        });
      }
    }
    
    // Sleep correlations
    if (metricCorrelations) {
      const sleepCorr = metricCorrelations.find(c => c.source === 'sleep' && c.target === selectedMetric);
      if (sleepCorr && sleepCorr.difference >= 0.8) {
        insights.push({
          type: 'correlation',
          text: `Sleep quality affects next-day ${formatMetric(selectedMetric)}`,
          detail: `+${sleepCorr.difference} when sleep ≥7`
        });
      }
      
      // Workout-energy correlation (only show when energy is selected)
      if (selectedMetric === 'energy') {
        const workoutCorr = metricCorrelations.find(c => c.source === 'workout' && c.target === 'energy');
        if (workoutCorr && workoutCorr.difference >= 0.8) {
          insights.push({
            type: 'correlation',
            text: `Workout intensity boosts energy`,
            detail: `+${workoutCorr.difference} on active days`
          });
        }
      }
    }
    
    // Growth rates
    if (growthRates?.rates?.[selectedMetric]) {
      const rate = growthRates.rates[selectedMetric];
      if (rate.direction !== 'stable' && Math.abs(rate.percentChange) >= 5) {
        const direction = rate.direction === 'up' ? 'improved' : 'declined';
        insights.push({
          type: 'growth',
          text: `${capitalize(formatMetric(selectedMetric))} ${direction} ${Math.abs(rate.percentChange)}%`,
          detail: `Over ${growthRates.days} days`
        });
      }
    }
    
    return insights;
  };
  
  const patterns = needsMoreData ? [] : buildPatternInsights();
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Your Patterns</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <div className="insight-loading">
            <div className="insight-loading-spinner"></div>
          </div>
        ) : needsMoreData ? (
          <div className="insight-empty">
            <p className="empty-message">{daysTracked}/{UNLOCK_THRESHOLD} days tracked</p>
            <p className="empty-context">Pattern insights unlock at 14 days</p>
          </div>
        ) : patterns.length === 0 ? (
          <div className="insight-empty">
            <p className="empty-message">Keep tracking for patterns</p>
            <p className="empty-context">More data reveals your unique patterns</p>
          </div>
        ) : (
          <div className="patterns-list">
            {patterns.map((pattern, idx) => (
              <div key={idx} className="pattern-row">
                <span className="pattern-text">{pattern.text}</span>
                <span className="pattern-detail">{pattern.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// SECTION 3: AI INSIGHTS - Unlocks at 20+ days AND 2+ relapses
// ML-discovered patterns
// ============================================================
export const AIInsights = ({ 
  mlPatterns,
  mlOptimization,
  daysTracked,
  relapseCount,
  isLoading 
}) => {
  const AI_THRESHOLD = 20;
  const MIN_RELAPSES = 2;
  
  const hasAIData = mlPatterns?.hasMLPatterns && mlPatterns.patterns?.length > 0;
  const hasAISuggestions = mlOptimization?.hasMLSuggestions && mlOptimization.suggestions?.length > 0;
  
  // Determine empty state message
  const getEmptyState = () => {
    if (daysTracked < AI_THRESHOLD) {
      return {
        message: `${daysTracked}/${AI_THRESHOLD} days tracked`,
        context: 'AI patterns unlock at 20 days'
      };
    }
    if (relapseCount < MIN_RELAPSES) {
      return {
        message: 'Need relapse data for AI',
        context: 'AI learns from analyzing what preceded past relapses'
      };
    }
    if (mlPatterns?.reason === 'model_not_trained') {
      return {
        message: 'AI is learning your patterns',
        context: 'Predictions will appear once training completes'
      };
    }
    return {
      message: 'AI analysis processing',
      context: 'Keep tracking to improve predictions'
    };
  };
  
  const showEmpty = !hasAIData && !hasAISuggestions;
  const emptyState = showEmpty ? getEmptyState() : null;
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>AI Insights</span>
        {(hasAIData || hasAISuggestions) && <span className="header-badge">AI</span>}
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <div className="insight-loading">
            <div className="insight-loading-spinner"></div>
          </div>
        ) : showEmpty ? (
          <div className="insight-empty">
            <p className="empty-message">{emptyState.message}</p>
            <p className="empty-context">{emptyState.context}</p>
          </div>
        ) : (
          <div className="ai-insights-list">
            {/* AI-discovered patterns */}
            {hasAIData && mlPatterns.patterns.map((pattern, idx) => (
              <div key={`p-${idx}`} className="ai-insight-row">
                <span className="ai-condition">{pattern.condition}</span>
                <span className="ai-outcome">{pattern.outcome}</span>
              </div>
            ))}
            
            {/* AI optimization suggestions */}
            {hasAISuggestions && mlOptimization.suggestions.map((suggestion, idx) => (
              <div key={`s-${idx}`} className="ai-insight-row">
                <span className="ai-condition">{suggestion.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// SECTION 4: RELAPSE ANALYTICS - Only show if user has relapse data
// ============================================================
export const RelapseAnalytics = ({ 
  relapsePatterns,
  daysSinceLastRelapse,
  isLoading 
}) => {
  // Don't render if no relapse data
  if (!relapsePatterns?.hasData) {
    return null;
  }
  
  const isConquered = daysSinceLastRelapse >= 90;
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>{isConquered ? 'Conquered' : 'Relapse Data'}</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <div className="insight-loading">
            <div className="insight-loading-spinner"></div>
          </div>
        ) : isConquered ? (
          <div className="conquered-display">
            <span className="conquered-days">{daysSinceLastRelapse}</span>
            <span className="conquered-label">days since last relapse</span>
          </div>
        ) : (
          <div className="relapse-stats">
            <div className="relapse-stat-row">
              <span className="relapse-stat-label">Total relapses</span>
              <span className="relapse-stat-value">{relapsePatterns.totalRelapses}</span>
            </div>
            
            {relapsePatterns.avgStreakAtRelapse && (
              <div className="relapse-stat-row">
                <span className="relapse-stat-label">Avg streak at relapse</span>
                <span className="relapse-stat-value">{relapsePatterns.avgStreakAtRelapse} days</span>
              </div>
            )}
            
            {relapsePatterns.dangerZone && (
              <div className="relapse-stat-row">
                <span className="relapse-stat-label">Danger zone</span>
                <span className="relapse-stat-value">Days {relapsePatterns.dangerZone}</span>
              </div>
            )}
            
            {relapsePatterns.primaryTrigger && (
              <div className="relapse-stat-row">
                <span className="relapse-stat-label">Primary trigger</span>
                <span className="relapse-stat-value">{relapsePatterns.primaryTrigger}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// SECTION 5: PHASE CONTEXT - Styled like ET/Urge headers with number
// ============================================================
export const PhaseContext = ({ 
  currentStreak, 
  phaseInfo
}) => {
  const navigate = useNavigate();
  
  if (!phaseInfo) return null;
  
  // Map phase key to number (matches Emotional Timeline order)
  const getPhaseNumber = (key) => {
    const phaseNumbers = {
      'initial': '01',
      'emotional': '02',
      'mental': '03',
      'integration': '04',
      'mastery': '05'
    };
    return phaseNumbers[key] || '01';
  };
  
  const handleNavigateToTimeline = () => {
    navigate('/timeline');
  };
  
  return (
    <div className="phase-context-section">
      <div className="phase-context-header">
        <span>Current Phase</span>
      </div>
      <div className="phase-context-row" onClick={handleNavigateToTimeline}>
        <div className="phase-context-num">
          {getPhaseNumber(phaseInfo.key)}
        </div>
        <div className="phase-context-info">
          <h3 className="phase-context-name">{phaseInfo.name}</h3>
          <p className="phase-context-days">Day {currentStreak || 0} · Days {phaseInfo.range}</p>
        </div>
        <div className="phase-context-arrow">→</div>
      </div>
    </div>
  );
};

// ============================================================
// LOADING STATE - Reusable
// ============================================================
export const InsightLoadingState = ({ isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div className="insight-loading">
      <div className="insight-loading-spinner"></div>
    </div>
  );
};

export default {
  YourNumbers,
  YourPatterns,
  AIInsights,
  RelapseAnalytics,
  PhaseContext,
  InsightLoadingState
};