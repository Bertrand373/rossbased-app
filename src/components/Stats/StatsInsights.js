// StatsInsights.js - TITANTRACK REFINED
// NO CSS import - all styles from Stats.css
import React from 'react';
import { InsightLoadingState, InsightEmptyState } from './StatsComponents';
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

// Pattern Recognition Component
export const PatternRecognition = ({ 
  isLoading, 
  hasInsufficientData, 
  userData,
  patternInsights, 
  dataQuality 
}) => {
  const needsMoreData = !patternInsights?.patterns || patternInsights.patterns.length === 0;
  
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
            {patternInsights.patterns.map((pattern, idx) => (
              <p key={idx} className="pattern-item" dangerouslySetInnerHTML={renderTextWithBold(pattern)}></p>
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
  const needsMoreData = !optimizationGuidance?.recommendations || optimizationGuidance.recommendations.length === 0;
  
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
            sectionTitle="Performance Optimization"
            sectionDescription="Analyzes your personal performance patterns to identify your optimal windows and provides phase-aware optimization strategies."
          />
        ) : (
          <div className="optimization-display">
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
  const needsMoreData = !phaseEvolution?.phaseAverages;
  
  // Determine current phase key
  const getCurrentPhaseKey = () => {
    const streak = currentStreak || 0;
    if (streak <= 7) return 'purification';
    if (streak <= 21) return 'foundation';
    if (streak <= 45) return 'transmutation';
    if (streak <= 90) return 'stabilization';
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
                    <div className="phase-name">{phaseData.name || phaseKey}</div>
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