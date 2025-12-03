// StatsInsights.js - TITANTRACK
// Premium analytics insight cards
// UPDATED: AI pattern discovery integration for PatternRecognition and OptimizationGuidance
import React from 'react';
import { InsightLoadingState, InsightEmptyState } from './StatsComponents';
import { renderTextWithBold } from './StatsUtils';

// Progress & Trends Analysis Component (unchanged)
export const ProgressTrendsAnalysis = ({ 
  isLoading, 
  hasInsufficientData, 
  userData, 
  progressTrends,
  dataQuality,
  selectedMetric
}) => {
  const needsMoreData = !progressTrends || progressTrends === null;
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Progress & Trends</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Progress Analysis" isVisible={true} />
        ) : (hasInsufficientData || needsMoreData) ? (
          <InsightEmptyState 
            insight="Progress & Trends" 
            userData={userData}
            sectionTitle="Progress Analysis"
            sectionDescription="Historical trajectory analysis showing how your performance and relapse patterns have evolved over time."
          />
        ) : (
          <div className="progress-trends-display">
            {progressTrends?.relapseFrequency && (
              <div className="trend-item">
                <div className="trend-content">
                  <div className="trend-label">Relapse Frequency</div>
                  <p className="trend-text" dangerouslySetInnerHTML={renderTextWithBold(progressTrends.relapseFrequency.insight)}></p>
                </div>
              </div>
            )}

            {progressTrends?.benefitPerformance && (
              <div className="trend-item">
                <div className="trend-content">
                  <div className="trend-label">
                    {selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Performance
                  </div>
                  <p className="trend-text" dangerouslySetInnerHTML={renderTextWithBold(progressTrends.benefitPerformance.insight)}></p>
                </div>
              </div>
            )}

            {progressTrends?.overallTrajectory && (
              <div className="trend-item">
                <div className="trend-content">
                  <div className="trend-label">Overall Trajectory</div>
                  <p className="trend-text" dangerouslySetInnerHTML={renderTextWithBold(progressTrends.overallTrajectory.summary)}></p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Relapse Pattern Analytics Component (unchanged)
export const RelapsePatternAnalytics = ({ 
  isLoading, 
  relapsePatterns, 
  daysSinceLastRelapse 
}) => {
  if (!relapsePatterns?.hasData) return null;
  
  const isConquered = daysSinceLastRelapse >= 90;

  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>{isConquered ? 'Conquered Patterns' : 'Relapse Patterns'}</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Relapse Analysis" isVisible={true} />
        ) : isConquered ? (
          <div className="victory-display">
            <div className="victory-days">{daysSinceLastRelapse}</div>
            <div className="victory-label">Days Victorious</div>
            <p className="victory-message">
              You've transcended past patterns. Your historical triggers have been conquered through consistent discipline.
            </p>
          </div>
        ) : (
          <div className="relapse-patterns-display">
            <div className="relapse-stat">
              <span className="relapse-stat-label">Total Analyzed</span>
              <span className="relapse-stat-value">{relapsePatterns.totalRelapses}</span>
            </div>
            
            {relapsePatterns.primaryTrigger && (
              <div className="relapse-stat">
                <span className="relapse-stat-label">Primary Trigger</span>
                <span className="relapse-stat-value">{relapsePatterns.primaryTrigger}</span>
              </div>
            )}
            
            {relapsePatterns.insights?.map((insight, idx) => (
              <p key={idx} className="relapse-insight" dangerouslySetInnerHTML={renderTextWithBold(insight)}></p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Pattern Recognition Component - UPDATED: AI-powered with tiered unlock
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
  
  // Determine what to show based on data availability
  const hasAIData = mlPatterns?.hasMLPatterns && mlPatterns.patterns?.length > 0;
  const hasRuleBasedData = patternInsights?.patterns?.length > 0;
  
  // Tiered thresholds
  const BASIC_PATTERNS_THRESHOLD = 14;
  const AI_PATTERNS_THRESHOLD = 20;
  const MIN_RELAPSES_FOR_PATTERNS = 2;
  
  // Show AI patterns if available (20+ days), otherwise fall back to rule-based (14+ days)
  const showAI = hasAIData;
  const showRuleBased = !showAI && hasRuleBasedData;
  const showEmpty = !showAI && !showRuleBased;
  
  // Determine empty state messaging
  const getEmptyStateContent = () => {
    if (daysTracked < BASIC_PATTERNS_THRESHOLD) {
      // User hasn't hit first unlock threshold
      return {
        message: `${daysTracked}/${BASIC_PATTERNS_THRESHOLD} days tracked`,
        context: 'Pattern insights unlock at 14 days'
      };
    } else if (daysTracked < AI_PATTERNS_THRESHOLD) {
      // User has basic data but AI not available yet
      if (relapseCount < MIN_RELAPSES_FOR_PATTERNS) {
        return {
          message: 'Need relapse data for patterns',
          context: 'Patterns emerge from analyzing what preceded past relapses'
        };
      }
      return {
        message: `${daysTracked}/${AI_PATTERNS_THRESHOLD} days tracked`,
        context: 'AI pattern discovery unlocks at 20 days'
      };
    } else {
      // User has 20+ days but no patterns showing
      if (relapseCount < MIN_RELAPSES_FOR_PATTERNS) {
        return {
          message: 'Need relapse data for patterns',
          context: 'Patterns emerge from analyzing what preceded past relapses'
        };
      }
      return {
        message: 'AI is learning your patterns',
        context: 'Keep tracking to improve predictions'
      };
    }
  };
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Your Patterns</span>
        {showAI && <span className="header-badge">AI</span>}
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Pattern Analysis" isVisible={true} />
        ) : showEmpty ? (
          // Empty state with tiered messaging
          <div className="insight-empty">
            <p className="empty-message">{getEmptyStateContent().message}</p>
            <p className="empty-context">{getEmptyStateContent().context}</p>
          </div>
        ) : showAI ? (
          // AI-discovered patterns
          <div className="patterns-display">
            {mlPatterns.patterns.map((pattern, idx) => (
              <div key={idx} className="pattern-item">
                <p className="pattern-condition">{pattern.condition}</p>
                <p className="pattern-outcome">{pattern.outcome}</p>
              </div>
            ))}
          </div>
        ) : showRuleBased ? (
          // Fallback to rule-based patterns (14-19 days)
          <div className="patterns-display">
            {patternInsights.patterns.map((pattern, idx) => (
              <p key={idx} className="pattern-item" dangerouslySetInnerHTML={renderTextWithBold(pattern)}></p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

// Optimization Guidance Component - UPDATED: AI-informed suggestions
export const OptimizationGuidance = ({ 
  isLoading, 
  hasInsufficientData, 
  userData,
  optimizationGuidance,
  mlOptimization,
  dataQuality 
}) => {
  // Determine what to show
  const hasAISuggestions = mlOptimization?.hasMLSuggestions && mlOptimization.suggestions?.length > 0;
  const hasRuleBasedGuidance = optimizationGuidance?.recommendations?.length > 0;
  
  // Combine AI suggestions with rule-based if both available
  const showAI = hasAISuggestions;
  const showRuleBased = hasRuleBasedGuidance;
  const showEmpty = !showAI && !showRuleBased;
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Optimization</span>
        {showAI && <span className="header-badge">AI</span>}
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Optimization Analysis" isVisible={true} />
        ) : showEmpty ? (
          <InsightEmptyState 
            insight="Performance Optimization" 
            userData={userData}
            sectionTitle="Performance Optimization"
            sectionDescription="Analyzes your personal performance patterns to identify your optimal windows and provides phase-aware optimization strategies."
          />
        ) : (
          <div className="optimization-display">
            {/* AI-informed suggestions first (if available) */}
            {showAI && (
              <div className="optimization-recommendations ai-section">
                {mlOptimization.suggestions.map((suggestion, idx) => (
                  <p key={`ai-${idx}`} className="optimization-item" dangerouslySetInnerHTML={renderTextWithBold(suggestion)}></p>
                ))}
              </div>
            )}
            
            {/* Rule-based optimization (show when no AI) */}
            {showRuleBased && !showAI && (
              <>
                {optimizationGuidance.criteria && (
                  <div className="optimization-criteria">
                    <div className="optimization-criteria-title">Your Optimization Criteria</div>
                    <div className="optimization-criteria-text">{optimizationGuidance.criteria}</div>
                  </div>
                )}
                
                <div className="optimization-recommendations">
                  {optimizationGuidance.recommendations.map((rec, idx) => (
                    <p key={idx} className="optimization-item" dangerouslySetInnerHTML={renderTextWithBold(rec)}></p>
                  ))}
                </div>
              </>
            )}
            
            {/* When AI is available, show condensed rule-based context */}
            {showAI && showRuleBased && optimizationGuidance.recommendations?.length > 0 && (
              <div className="optimization-recommendations">
                {/* Show just first 1-2 most relevant rule-based recommendations */}
                {optimizationGuidance.recommendations.slice(0, 2).map((rec, idx) => (
                  <p key={`rule-${idx}`} className="optimization-item" dangerouslySetInnerHTML={renderTextWithBold(rec)}></p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Phase Evolution Analysis Component (unchanged)
export const PhaseEvolutionAnalysis = ({ 
  isLoading, 
  hasInsufficientData, 
  userData,
  phaseEvolution, 
  selectedMetric,
  dataQuality,
  currentStreak
}) => {
  const needsMoreData = !phaseEvolution?.phaseAverages;
  
  // Align phase key detection with StatsAnalyticsUtils.js getRetentionPhase()
  // Must match: foundation (1-14), purification (15-45), expansion (46-90), integration (91-180), mastery (180+)
  const getCurrentPhaseKey = () => {
    const streak = currentStreak || 0;
    if (streak <= 14) return 'foundation';
    if (streak <= 45) return 'purification';
    if (streak <= 90) return 'expansion';
    if (streak <= 180) return 'integration';
    return 'mastery';
  };
  
  const currentPhaseKey = getCurrentPhaseKey();
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Phase Evolution</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Phase Analysis" isVisible={true} />
        ) : (hasInsufficientData || needsMoreData) ? (
          <InsightEmptyState 
            insight="Phase Evolution" 
            userData={userData}
            sectionTitle="Phase Evolution"
            sectionDescription={`Tracks how your ${selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric} develops through the retention phases.`}
          />
        ) : (
          <>
            <div className="phase-evolution-grid">
              {Object.entries(phaseEvolution.phaseAverages || {}).map(([phaseKey, phaseData]) => {
                const isCurrentPhase = phaseKey === currentPhaseKey;
                
                return (
                  <div 
                    key={phaseKey} 
                    className={`phase-evolution-card ${isCurrentPhase ? 'current' : ''}`}
                  >
                    <div className="phase-name">{phaseData.name || phaseData.displayName || phaseKey}</div>
                    <div className="phase-value">
                      {phaseData.average ? `${phaseData.average}/10` : '—'}
                    </div>
                    <div className="phase-range">{phaseData.range || ''}</div>
                  </div>
                );
              })}
            </div>
            
            {phaseEvolution?.insight && (
              <p className="phase-evolution-insight" dangerouslySetInnerHTML={renderTextWithBold(phaseEvolution.insight)}></p>
            )}
          </>
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