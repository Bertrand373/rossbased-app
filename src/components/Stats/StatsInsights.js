// StatsInsights.js - TITANTRACK
// Data-driven analytics - Landing/Calendar/UrgeToolkit aesthetic
// Same component API as before - no changes needed to Stats.js
import React from 'react';
import { InsightLoadingState } from './StatsComponents';
import { renderTextWithBold } from './StatsUtils';

// ============================================================
// PROGRESS & TRENDS - Numerical trajectory display
// ============================================================
export const ProgressTrendsAnalysis = ({ 
  isLoading, 
  hasInsufficientData, 
  userData, 
  progressTrends,
  dataQuality,
  selectedMetric
}) => {
  const daysTracked = userData?.benefitTracking?.length || 0;
  const UNLOCK_THRESHOLD = 7;
  
  // Need 7+ days for trends
  if (daysTracked < UNLOCK_THRESHOLD) {
    return (
      <div className="insight-card">
        <div className="insight-card-header">
          <span>Your Trends</span>
        </div>
        <div className="insight-card-content">
          <div className="insight-empty">
            <p className="empty-message">{daysTracked}/{UNLOCK_THRESHOLD} days</p>
            <p className="empty-context">Trend analysis unlocks at 7 days</p>
          </div>
        </div>
      </div>
    );
  }
  
  const hasTrends = progressTrends && (
    progressTrends.benefitPerformance || 
    progressTrends.relapseFrequency || 
    progressTrends.overallTrajectory
  );
  
  // Format metric name for display
  const formatMetricName = (metric) => {
    if (metric === 'sleep') return 'Sleep';
    return metric.charAt(0).toUpperCase() + metric.slice(1);
  };

  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Your Trends</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Trends" isVisible={true} />
        ) : !hasTrends ? (
          <div className="insight-empty">
            <p className="empty-message">Analyzing patterns...</p>
            <p className="empty-context">Keep tracking for insights</p>
          </div>
        ) : (
          <div className="trends-list">
            {/* Benefit Performance - The core metric */}
            {progressTrends.benefitPerformance && (
              <div className="trend-row">
                <span className="trend-metric">{formatMetricName(selectedMetric)}</span>
                <div className="trend-comparison">
                  <span className="trend-recent">{progressTrends.benefitPerformance.recentAvg}</span>
                  <span className={`trend-delta ${progressTrends.benefitPerformance.trend}`}>
                    {progressTrends.benefitPerformance.trend === 'improving' ? '↑' : 
                     progressTrends.benefitPerformance.trend === 'declining' ? '↓' : '→'}
                  </span>
                  <span className="trend-baseline">vs {progressTrends.benefitPerformance.overallAvg}</span>
                </div>
              </div>
            )}
            
            {/* Relapse Frequency */}
            {progressTrends.relapseFrequency && (
              <div className="trend-row">
                <span className="trend-metric">Relapse rate</span>
                <div className="trend-comparison">
                  <span className="trend-recent">{progressTrends.relapseFrequency.recentRate}</span>
                  <span className={`trend-delta ${progressTrends.relapseFrequency.trend === 'improving' ? 'improving' : progressTrends.relapseFrequency.trend === 'worsening' ? 'declining' : 'stable'}`}>
                    {progressTrends.relapseFrequency.trend === 'improving' ? '↓' : 
                     progressTrends.relapseFrequency.trend === 'worsening' ? '↑' : '→'}
                  </span>
                  <span className="trend-baseline">vs {progressTrends.relapseFrequency.overallRate}</span>
                </div>
              </div>
            )}
            
            {/* Overall Trajectory Summary */}
            {progressTrends.overallTrajectory?.summary && (
              <p className="trend-summary" dangerouslySetInnerHTML={renderTextWithBold(progressTrends.overallTrajectory.summary)}></p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// RELAPSE PATTERN ANALYTICS - Victory or danger zone display
// ============================================================
export const RelapsePatternAnalytics = ({ 
  isLoading, 
  relapsePatterns, 
  daysSinceLastRelapse 
}) => {
  // Don't render if no relapse data
  if (!relapsePatterns?.hasData) return null;
  
  const isVictory = daysSinceLastRelapse >= 90;

  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>{isVictory ? 'Victory' : 'Relapse Analysis'}</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Analysis" isVisible={true} />
        ) : isVictory ? (
          <div className="victory-display">
            <span className="victory-number">{daysSinceLastRelapse}</span>
            <span className="victory-unit">days</span>
            <span className="victory-label">since last relapse</span>
          </div>
        ) : (
          <div className="relapse-analysis">
            {/* Primary stat */}
            <div className="analysis-stat-row">
              <span className="analysis-label">Analyzed</span>
              <span className="analysis-value">{relapsePatterns.totalRelapses} relapses</span>
            </div>
            
            {/* Danger zone - key insight */}
            {relapsePatterns.dangerZone && (
              <div className="danger-zone-display">
                <span className="danger-label">Danger zone</span>
                <span className="danger-days">Days {relapsePatterns.dangerZone.start}–{relapsePatterns.dangerZone.end}</span>
                <span className="danger-pct">{relapsePatterns.dangerZone.percentage}% of relapses</span>
              </div>
            )}
            
            {/* Primary trigger */}
            {relapsePatterns.primaryTrigger && (
              <div className="analysis-stat-row">
                <span className="analysis-label">Primary trigger</span>
                <span className="analysis-value trigger">{relapsePatterns.primaryTrigger}</span>
              </div>
            )}
            
            {/* Additional insights if available */}
            {relapsePatterns.insights?.slice(0, 1).map((insight, idx) => (
              <p key={idx} className="analysis-insight" dangerouslySetInnerHTML={renderTextWithBold(insight)}></p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// PATTERN RECOGNITION - AI + Rule-based patterns
// ============================================================
export const PatternRecognition = ({ 
  isLoading, 
  hasInsufficientData, 
  userData,
  patternInsights,
  mlPatterns,
  dataQuality 
}) => {
  const daysTracked = userData?.benefitTracking?.length || 0;
  const relapseCount = (userData?.streakHistory || []).filter(s => s.reason === 'relapse').length;
  
  // Thresholds
  const BASIC_THRESHOLD = 14;
  const AI_THRESHOLD = 20;
  const MIN_RELAPSES = 2;
  
  // Determine what to show
  const hasAIPatterns = mlPatterns?.hasMLPatterns && mlPatterns.patterns?.length > 0;
  const hasRulePatterns = patternInsights?.patterns?.length > 0;
  
  const showAI = hasAIPatterns;
  const showRules = !showAI && hasRulePatterns;
  const showEmpty = !showAI && !showRules;
  
  // Empty state messaging
  const getEmptyContent = () => {
    if (daysTracked < BASIC_THRESHOLD) {
      return {
        message: `${daysTracked}/${BASIC_THRESHOLD} days`,
        context: 'Patterns unlock at 14 days'
      };
    }
    if (daysTracked >= BASIC_THRESHOLD && daysTracked < AI_THRESHOLD) {
      if (relapseCount < MIN_RELAPSES) {
        return {
          message: 'No relapse data',
          context: 'Patterns emerge from relapse history'
        };
      }
      return {
        message: `${daysTracked}/${AI_THRESHOLD} days`,
        context: 'AI patterns unlock at 20 days'
      };
    }
    if (relapseCount < MIN_RELAPSES) {
      return {
        message: 'Insufficient data',
        context: 'Need relapse history for pattern analysis'
      };
    }
    return {
      message: 'Learning patterns',
      context: 'Keep tracking consistently'
    };
  };
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Your Patterns</span>
        {showAI && <span className="header-badge">AI</span>}
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Patterns" isVisible={true} />
        ) : showEmpty ? (
          <div className="insight-empty">
            <p className="empty-message">{getEmptyContent().message}</p>
            <p className="empty-context">{getEmptyContent().context}</p>
          </div>
        ) : showAI ? (
          <div className="patterns-list">
            {mlPatterns.patterns.map((pattern, idx) => (
              <div key={`ai-${idx}`} className="pattern-row">
                <span className="pattern-condition">{pattern.condition}</span>
                <span className="pattern-arrow">→</span>
                <span className="pattern-outcome">{pattern.outcome}</span>
              </div>
            ))}
          </div>
        ) : showRules ? (
          <div className="patterns-list">
            {patternInsights.patterns.slice(0, 3).map((pattern, idx) => (
              <p key={`rule-${idx}`} className="pattern-text" dangerouslySetInnerHTML={renderTextWithBold(typeof pattern === 'string' ? pattern : pattern.finding || '')}></p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ============================================================
// OPTIMIZATION GUIDANCE - AI or rule-based suggestions
// ============================================================
export const OptimizationGuidance = ({ 
  isLoading, 
  hasInsufficientData, 
  userData,
  optimizationGuidance,
  mlOptimization,
  dataQuality 
}) => {
  const hasAI = mlOptimization?.hasMLSuggestions && mlOptimization.suggestions?.length > 0;
  const hasRules = optimizationGuidance?.recommendations?.length > 0;
  
  // Only show if we have content
  if (!hasAI && !hasRules && !isLoading) {
    return null;
  }
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Optimization</span>
        {hasAI && <span className="header-badge">AI</span>}
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Optimization" isVisible={true} />
        ) : hasAI ? (
          <div className="optimization-list">
            {mlOptimization.suggestions.slice(0, 3).map((suggestion, idx) => (
              <p key={idx} className="optimization-item" dangerouslySetInnerHTML={renderTextWithBold(suggestion)}></p>
            ))}
          </div>
        ) : hasRules ? (
          <div className="optimization-list">
            {optimizationGuidance.recommendations.slice(0, 2).map((rec, idx) => (
              <p key={idx} className="optimization-item" dangerouslySetInnerHTML={renderTextWithBold(rec)}></p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ============================================================
// PHASE EVOLUTION - Current phase with link to Timeline
// ============================================================
export const PhaseEvolutionAnalysis = ({ 
  isLoading, 
  hasInsufficientData, 
  userData,
  phaseEvolution, 
  selectedMetric,
  dataQuality,
  currentStreak
}) => {
  // Phase info aligned with Emotional Timeline
  const getPhaseInfo = (streak) => {
    if (streak <= 14) return { name: 'Initial Adaptation', range: '1–14', num: 1 };
    if (streak <= 45) return { name: 'Emotional Processing', range: '15–45', num: 2 };
    if (streak <= 90) return { name: 'Mental Expansion', range: '46–90', num: 3 };
    if (streak <= 180) return { name: 'Integration & Growth', range: '91–180', num: 4 };
    return { name: 'Mastery & Purpose', range: '180+', num: 5 };
  };
  
  const phase = getPhaseInfo(currentStreak || 0);
  const hasPhaseData = phaseEvolution?.phaseAverages && Object.keys(phaseEvolution.phaseAverages).length > 0;
  
  // Format metric for display
  const formatMetric = (metric) => {
    if (metric === 'sleep') return 'Sleep';
    return metric.charAt(0).toUpperCase() + metric.slice(1);
  };
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Current Phase</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Phase" isVisible={true} />
        ) : (
          <div className="phase-context">
            {/* Current phase display */}
            <div className="phase-hero">
              <span className="phase-num">{phase.num}</span>
              <div className="phase-info">
                <span className="phase-name">{phase.name}</span>
                <span className="phase-range">Days {phase.range}</span>
              </div>
            </div>
            
            {/* Phase averages if we have data */}
            {hasPhaseData && (
              <div className="phase-averages">
                {Object.entries(phaseEvolution.phaseAverages)
                  .filter(([_, data]) => data.average)
                  .slice(0, 4)
                  .map(([key, data]) => (
                    <div key={key} className="phase-avg-item">
                      <span className="phase-avg-label">{data.displayName || data.name || key}</span>
                      <span className="phase-avg-value">{data.average}</span>
                    </div>
                  ))}
              </div>
            )}
            
            {/* Insight if available */}
            {phaseEvolution?.insight && (
              <p className="phase-insight" dangerouslySetInnerHTML={renderTextWithBold(phaseEvolution.insight)}></p>
            )}
            
            {/* Hint to Emotional Timeline */}
            <p className="phase-link-hint">See Emotional Timeline for phase guidance</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default {
  ProgressTrendsAnalysis,
  RelapsePatternAnalytics,
  PatternRecognition,
  OptimizationGuidance,
  PhaseEvolutionAnalysis
};