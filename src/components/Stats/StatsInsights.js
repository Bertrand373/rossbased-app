// StatsInsights.js - TITANTRACK MINIMAL
// Clean insight components without helmet decorations or colored status bars
import React from 'react';
import { InsightLoadingState, InsightEmptyState, MiniInfoBanner } from './StatsComponents';
import { renderTextWithBold } from './StatsUtils';

// Progress & Trends Analysis Component
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
            {/* Relapse Frequency Trend */}
            {progressTrends?.relapseFrequency && (
              <div className="trend-item">
                <div className="trend-content">
                  <div className="trend-label">Relapse Frequency</div>
                  <div className="trend-stats">
                    <span className="trend-stat">{progressTrends.relapseFrequency.recentRate} recent</span>
                    <span className="trend-divider">vs</span>
                    <span className="trend-stat">{progressTrends.relapseFrequency.overallRate} overall</span>
                  </div>
                  <p className="trend-text" dangerouslySetInnerHTML={renderTextWithBold(progressTrends.relapseFrequency.insight)}></p>
                </div>
              </div>
            )}

            {/* Benefit Performance Trend */}
            {progressTrends?.benefitPerformance && (
              <div className="trend-item">
                <div className="trend-content">
                  <div className="trend-label">
                    {selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Performance
                  </div>
                  <div className="trend-stats">
                    <span className="trend-stat">{progressTrends.benefitPerformance.recentAverage} recent</span>
                    <span className="trend-divider">vs</span>
                    <span className="trend-stat">{progressTrends.benefitPerformance.overallAverage} overall</span>
                  </div>
                  <p className="trend-text" dangerouslySetInnerHTML={renderTextWithBold(progressTrends.benefitPerformance.insight)}></p>
                </div>
              </div>
            )}

            {/* Overall Trajectory */}
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

// Relapse Pattern Analytics Component
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
        <span>{isConquered ? 'Conquered Patterns' : 'Relapse Pattern Analytics'}</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Pattern Analysis" isVisible={true} />
        ) : (
          <div className="relapse-patterns-display">
            {/* Stats Row */}
            <div className="relapse-stats-row">
              {relapsePatterns.relapseCount && (
                <div className="relapse-stat">
                  <span className="relapse-stat-value">{relapsePatterns.relapseCount}</span>
                  <span className="relapse-stat-label">Total Analyzed</span>
                </div>
              )}
              {relapsePatterns.primaryTrigger && (
                <div className="relapse-stat">
                  <span className="relapse-stat-value">{relapsePatterns.primaryTrigger}</span>
                  <span className="relapse-stat-label">Primary Trigger</span>
                </div>
              )}
              {isConquered && (
                <div className="relapse-stat">
                  <span className="relapse-stat-value">{daysSinceLastRelapse}</span>
                  <span className="relapse-stat-label">Days Clear</span>
                </div>
              )}
            </div>
            
            {/* Insights */}
            <div className="relapse-insights">
              {(relapsePatterns?.insights || []).map((insight, index) => (
                <p key={index} className="relapse-insight" dangerouslySetInnerHTML={renderTextWithBold(insight)}></p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Pattern Recognition Component
export const PatternRecognition = ({ 
  isLoading, 
  hasInsufficientData, 
  userData, 
  patternInsights, 
  dataQuality 
}) => {
  const needsMoreData = !patternInsights || patternInsights.length === 0 || 
    (patternInsights.length === 1 && patternInsights[0].includes('Need 14+'));
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Pattern Recognition</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Pattern Analysis" isVisible={true} />
        ) : (hasInsufficientData || needsMoreData) ? (
          <InsightEmptyState 
            insight="Pattern Recognition" 
            userData={userData}
            sectionTitle="Pattern Recognition"
            sectionDescription="Identifies correlations between your metrics and predicts trends based on your unique retention journey patterns."
          />
        ) : (
          <div className="patterns-display">
            {patternInsights.map((pattern, index) => (
              <p key={index} className="pattern-item" dangerouslySetInnerHTML={renderTextWithBold(pattern)}></p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Optimization Guidance Component
export const OptimizationGuidance = ({ 
  isLoading, 
  hasInsufficientData, 
  userData, 
  optimizationGuidance, 
  dataQuality 
}) => {
  const needsMoreData = !optimizationGuidance || 
    optimizationGuidance.optimalRate === 'N/A' || 
    (optimizationGuidance.recommendations?.length === 1 && 
     optimizationGuidance.recommendations[0].includes('Track 10+'));
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Performance Optimization</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Optimization Analysis" isVisible={true} />
        ) : (hasInsufficientData || needsMoreData) ? (
          <InsightEmptyState 
            insight="Performance Optimization" 
            userData={userData}
            sectionTitle="Optimization Profile"
            sectionDescription="Analyzes your personal performance patterns to identify your optimal windows and provides phase-aware optimization strategies."
          />
        ) : (
          <div className="optimization-display">
            {/* Criteria */}
            {optimizationGuidance?.criteria && (
              <div className="optimization-criteria">
                <div className="optimization-criteria-title">
                  {optimizationGuidance.phase ? `${optimizationGuidance.phase} Phase Criteria` : 'High Performance Criteria'}
                </div>
                <p className="optimization-criteria-text">{optimizationGuidance.criteria}</p>
              </div>
            )}
            
            {/* Rate */}
            {optimizationGuidance?.optimalRate && optimizationGuidance.optimalRate !== 'N/A' && (
              <div className="optimization-metric-card">
                <div className="optimization-metric-value">{optimizationGuidance.optimalRate}</div>
                <div className="optimization-metric-label">Meeting high performance criteria</div>
              </div>
            )}
            
            {/* Recommendations */}
            {optimizationGuidance?.recommendations && (
              <div className="optimization-recommendations">
                <div className="optimization-title">
                  {optimizationGuidance.phase ? `${optimizationGuidance.phase} Guidance` : 'Recommendations'}
                </div>
                {optimizationGuidance.recommendations.map((rec, index) => (
                  <p key={index} className="optimization-item" dangerouslySetInnerHTML={renderTextWithBold(rec)}></p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Phase Evolution Analysis Component
export const PhaseEvolutionAnalysis = ({ 
  isLoading, 
  hasInsufficientData,
  userData,
  phaseEvolution, 
  selectedMetric, 
  dataQuality,
  currentStreak
}) => {
  const needsMoreData = !phaseEvolution || !phaseEvolution.hasData;
  
  const getCurrentPhaseKey = (streak) => {
    if (streak <= 14) return 'foundation';
    if (streak <= 45) return 'purification';
    if (streak <= 90) return 'expansion';
    if (streak <= 180) return 'integration';
    return 'mastery';
  };

  const currentPhaseKey = getCurrentPhaseKey(currentStreak || 0);

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
            {/* Phase Grid */}
            <div className="phase-evolution-grid">
              {Object.entries(phaseEvolution.phaseAverages || {}).map(([phaseKey, phaseData]) => {
                const isCurrentPhase = phaseKey === currentPhaseKey;
                
                return (
                  <div 
                    key={phaseKey} 
                    className={`phase-evolution-card ${isCurrentPhase ? 'current' : ''}`}
                  >
                    <div className="phase-name">{phaseData.name || phaseKey}</div>
                    <div className="phase-value">
                      {phaseData.average ? `${phaseData.average}/10` : '—'}
                    </div>
                    <div className="phase-range">{phaseData.range || ''}</div>
                  </div>
                );
              })}
            </div>
            
            {/* Phase Insight */}
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