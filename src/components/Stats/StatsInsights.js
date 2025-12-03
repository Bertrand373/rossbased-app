// src/components/Stats/StatsInsights.js
// CONSOLIDATED: ML-enhanced insights, no fluff
// Removed: Wisdom Mode, Journey Guidance, Streak Comparison, Personalized Analysis cards

import React from 'react';

// ============================================================
// LOADING & EMPTY STATES
// ============================================================

export const InsightLoadingState = () => (
  <div className="insight-loading">
    <p>Analyzing...</p>
  </div>
);

export const InsightEmptyState = ({ daysTracked, daysRequired, message }) => (
  <div className="insight-empty">
    <p className="empty-message">{message}</p>
    <p className="empty-progress">{daysTracked} of {daysRequired} days tracked</p>
  </div>
);

// ============================================================
// YOUR NUMBERS - Weekly summary with deltas
// ============================================================

export const YourNumbers = ({ 
  weeklyAverages, 
  deltas, 
  isLoading 
}) => {
  if (isLoading) return <InsightLoadingState />;
  
  const metrics = [
    { key: 'energy', label: 'Energy' },
    { key: 'focus', label: 'Focus' },
    { key: 'confidence', label: 'Confidence' },
    { key: 'aura', label: 'Aura' },
    { key: 'sleep', label: 'Sleep' },
    { key: 'workout', label: 'Workout' }
  ];

  const getDeltaDisplay = (delta) => {
    if (delta === null || delta === undefined || isNaN(delta)) return '—';
    if (delta > 0) return `↑ ${delta.toFixed(1)}`;
    if (delta < 0) return `↓ ${Math.abs(delta).toFixed(1)}`;
    return '→';
  };

  const getDeltaClass = (delta) => {
    if (delta === null || delta === undefined || isNaN(delta)) return '';
    if (delta > 0.3) return 'positive';
    if (delta < -0.3) return 'negative';
    return 'neutral';
  };

  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Your Numbers</span>
        <span className="header-sub">This week vs last</span>
      </div>
      <div className="insight-card-content">
        <div className="numbers-grid">
          {metrics.map(({ key, label }) => (
            <div className="number-item" key={key}>
              <span className="number-label">{label}</span>
              <span className="number-value">
                {weeklyAverages[key]?.toFixed(1) || '—'}
              </span>
              <span className={`number-delta ${getDeltaClass(deltas[key])}`}>
                {getDeltaDisplay(deltas[key])}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// YOUR TRENDS - 14+ days required
// ============================================================

export const YourTrends = ({ 
  isLoading, 
  hasInsufficientData,
  daysTracked,
  trends,
  selectedMetric
}) => {
  const needsMoreData = hasInsufficientData || !trends;
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Your Trends</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState />
        ) : needsMoreData ? (
          <InsightEmptyState 
            daysTracked={daysTracked}
            daysRequired={14}
            message="Track 14 days to see your trends"
          />
        ) : (
          <div className="trends-display">
            {trends.relapseFrequency && (
              <div className="trend-item">
                <p className="trend-title">Relapse Frequency</p>
                <p className="trend-value">
                  {trends.relapseFrequency.recentRate} 
                  <span className={`trend-direction ${trends.relapseFrequency.trend}`}>
                    {trends.relapseFrequency.trend === 'improving' ? ' ↓' : 
                     trends.relapseFrequency.trend === 'worsening' ? ' ↑' : ''}
                  </span>
                </p>
                <p className="trend-context">vs {trends.relapseFrequency.overallRate} overall</p>
              </div>
            )}

            {trends.benefitPerformance && (
              <div className="trend-item">
                <p className="trend-title">
                  {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trend
                </p>
                <p className="trend-value">
                  {trends.benefitPerformance.recentAvg}/10
                  <span className={`trend-direction ${trends.benefitPerformance.trend}`}>
                    {trends.benefitPerformance.trend === 'improving' ? ' ↑' : 
                     trends.benefitPerformance.trend === 'declining' ? ' ↓' : ''}
                  </span>
                </p>
                <p className="trend-context">vs {trends.benefitPerformance.overallAvg}/10 overall</p>
              </div>
            )}

            {trends.weekdayPattern && (
              <div className="trend-item">
                <p className="trend-title">Weekly Pattern</p>
                <p className="trend-detail">{trends.weekdayPattern}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// RELAPSE PATTERNS - Concrete data
// ============================================================

export const RelapsePatterns = ({ 
  isLoading,
  relapsePatterns,
  daysSinceLastRelapse 
}) => {
  // Don't render if no relapse data
  if (!relapsePatterns?.hasData) return null;
  
  const isConquered = daysSinceLastRelapse >= 90;

  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>{isConquered ? 'Conquered Patterns' : 'Relapse Patterns'}</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState />
        ) : (
          <div className="relapse-display">
            {/* Average streak before relapse */}
            {relapsePatterns.averageStreakBeforeRelapse && (
              <div className="relapse-stat">
                <span className="relapse-stat-value">
                  {relapsePatterns.averageStreakBeforeRelapse}
                </span>
                <span className="relapse-stat-label">avg days before relapse</span>
              </div>
            )}

            {/* Day of week pattern */}
            {relapsePatterns.dayOfWeekPattern && (
              <div className="relapse-item">
                <p className="relapse-text">{relapsePatterns.dayOfWeekPattern}</p>
              </div>
            )}

            {/* Time of day pattern */}
            {relapsePatterns.timePattern && (
              <div className="relapse-item">
                <p className="relapse-text">{relapsePatterns.timePattern}</p>
              </div>
            )}

            {/* Top triggers */}
            {relapsePatterns.topTriggers && relapsePatterns.topTriggers.length > 0 && (
              <div className="triggers-section">
                <p className="triggers-label">Top triggers</p>
                <div className="triggers-list">
                  {relapsePatterns.topTriggers.map((trigger, idx) => (
                    <span key={idx} className="trigger-tag">
                      {trigger.name} ({trigger.count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Danger zone */}
            {relapsePatterns.dangerZone && (
              <div className="danger-zone">
                <p className="danger-text">{relapsePatterns.dangerZone}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// ML-DISCOVERED PATTERNS - 20+ days required
// ============================================================

export const DiscoveredPatterns = ({ 
  isLoading,
  hasInsufficientData,
  daysTracked,
  relapseCount,
  mlPatterns
}) => {
  const needsMoreData = hasInsufficientData || daysTracked < 20;
  const needsRelapseData = relapseCount < 2;
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Your Patterns</span>
        {!needsMoreData && !needsRelapseData && (
          <span className="header-badge">ML</span>
        )}
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState />
        ) : needsMoreData ? (
          <InsightEmptyState 
            daysTracked={daysTracked}
            daysRequired={20}
            message="Track 20 days to discover your patterns"
          />
        ) : needsRelapseData ? (
          <div className="insight-empty">
            <p className="empty-message">Need relapse data to find patterns</p>
            <p className="empty-context">Patterns emerge from analyzing what preceded past relapses</p>
          </div>
        ) : !mlPatterns || mlPatterns.length === 0 ? (
          <div className="insight-empty">
            <p className="empty-message">No strong patterns detected yet</p>
            <p className="empty-context">Keep tracking - patterns will emerge</p>
          </div>
        ) : (
          <div className="patterns-display">
            {mlPatterns.map((pattern, idx) => (
              <div key={idx} className="pattern-item">
                <p className="pattern-condition">{pattern.condition}</p>
                <p className="pattern-outcome">{pattern.outcome}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// PHASE EVOLUTION - Shows journey progression
// ============================================================

export const PhaseEvolution = ({ 
  isLoading, 
  hasInsufficientData,
  daysTracked,
  phaseData,
  selectedMetric,
  currentStreak
}) => {
  const needsMoreData = hasInsufficientData || !phaseData?.phaseAverages;
  
  const phases = ['foundation', 'purification', 'expansion', 'integration', 'mastery'];
  const phaseRanges = {
    foundation: '1-14',
    purification: '15-45',
    expansion: '46-90',
    integration: '91-180',
    mastery: '180+'
  };

  const getCurrentPhaseKey = () => {
    if (currentStreak <= 14) return 'foundation';
    if (currentStreak <= 45) return 'purification';
    if (currentStreak <= 90) return 'expansion';
    if (currentStreak <= 180) return 'integration';
    return 'mastery';
  };

  const currentPhase = getCurrentPhaseKey();

  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Phase Evolution</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState />
        ) : needsMoreData ? (
          <InsightEmptyState 
            daysTracked={daysTracked}
            daysRequired={14}
            message="Track 14 days to see phase evolution"
          />
        ) : (
          <div className="phase-display">
            <p className="phase-metric-label">
              {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} by phase
            </p>
            
            <div className="phase-bars">
              {phases.map(phase => {
                const data = phaseData.phaseAverages[phase];
                const isCurrent = phase === currentPhase;
                const hasData = data && data.dataPoints > 0;
                
                return (
                  <div 
                    key={phase} 
                    className={`phase-bar-item ${isCurrent ? 'current' : ''} ${hasData ? '' : 'no-data'}`}
                  >
                    <div className="phase-bar-header">
                      <span className="phase-name">
                        {phase.charAt(0).toUpperCase() + phase.slice(1)}
                      </span>
                      <span className="phase-days">Days {phaseRanges[phase]}</span>
                    </div>
                    
                    {hasData ? (
                      <>
                        <div className="phase-bar-track">
                          <div 
                            className="phase-bar-fill" 
                            style={{ width: `${(data.average / 10) * 100}%` }}
                          />
                        </div>
                        <span className="phase-avg">{data.average.toFixed(1)}/10</span>
                      </>
                    ) : (
                      <span className="phase-no-data">—</span>
                    )}
                  </div>
                );
              })}
            </div>

            {phaseData.insight && (
              <p className="phase-insight">{phaseData.insight}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default {
  YourNumbers,
  YourTrends,
  RelapsePatterns,
  DiscoveredPatterns,
  PhaseEvolution
};