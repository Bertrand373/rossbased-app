// components/Stats/StatsInsights.js - UPDATED: Removed redundant AI components, added Progress & Trends
import React from 'react';
import { FaChartLine, FaShieldAlt, FaTrophy, FaFire, FaArrowUp, FaArrowDown, FaEquals, FaBrain, FaInfoCircle, FaCheckCircle, FaChartBar } from 'react-icons/fa';
import { InsightLoadingState, InsightEmptyState, MiniInfoBanner } from './StatsComponents';
import { renderTextWithBold } from './StatsUtils';

// NEW: Progress & Trends Analysis Component - HISTORICAL TRAJECTORY, NOT REAL-TIME
export const ProgressTrendsAnalysis = ({ 
  isLoading, 
  hasInsufficientData, 
  userData, 
  progressTrends,
  dataQuality,
  selectedMetric
}) => {
  const sectionDescription = "Historical trajectory analysis showing how your performance and relapse patterns have evolved over time.";
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Progress & Trends</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Progress Analysis" isVisible={true} />
        ) : hasInsufficientData ? (
          <InsightEmptyState 
            insight="Progress & Trends" 
            userData={userData}
            sectionTitle="Progress Analysis"
            sectionDescription={sectionDescription}
          />
        ) : (
          <>
            {/* NEW: Mini info banner shown when data exists */}
            <MiniInfoBanner description={sectionDescription} />
            
            <div className="progress-trends-display">
            {/* Relapse Frequency Trend */}
            {progressTrends?.relapseFrequency && (
              <div className="trend-section">
                <div className="trend-header">
                  <span className="trend-title">Relapse Frequency Trend</span>
                  {progressTrends.relapseFrequency.trend === 'improving' && (
                    <span className="trend-badge improving">
                      <FaArrowDown style={{ fontSize: '0.75rem' }} />
                      Improving
                    </span>
                  )}
                  {progressTrends.relapseFrequency.trend === 'stable' && (
                    <span className="trend-badge stable">
                      <FaEquals style={{ fontSize: '0.75rem' }} />
                      Stable
                    </span>
                  )}
                  {progressTrends.relapseFrequency.trend === 'worsening' && (
                    <span className="trend-badge worsening">
                      <FaArrowUp style={{ fontSize: '0.75rem' }} />
                      Needs Attention
                    </span>
                  )}
                </div>
                <div className="trend-content">
                  <div className="trend-stats-grid">
                    <div className="trend-stat-card">
                      <div className="trend-stat-value">{progressTrends.relapseFrequency.recentRate}</div>
                      <div className="trend-stat-label">Recent Frequency</div>
                    </div>
                    <div className="trend-stat-card">
                      <div className="trend-stat-value">{progressTrends.relapseFrequency.overallRate}</div>
                      <div className="trend-stat-label">Overall Average</div>
                    </div>
                  </div>
                  <div className="trend-insight" dangerouslySetInnerHTML={renderTextWithBold(progressTrends.relapseFrequency.insight)}></div>
                </div>
              </div>
            )}

            {/* Benefit Performance Trend */}
            {progressTrends?.benefitPerformance && (
              <div className="trend-section">
                <div className="trend-header">
                  <span className="trend-title">{selectedMetric === 'sleep' ? 'Sleep Quality' : selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Performance Trend</span>
                  {progressTrends.benefitPerformance.trend === 'improving' && (
                    <span className="trend-badge improving">
                      <FaArrowUp style={{ fontSize: '0.75rem' }} />
                      Improving
                    </span>
                  )}
                  {progressTrends.benefitPerformance.trend === 'stable' && (
                    <span className="trend-badge stable">
                      <FaEquals style={{ fontSize: '0.75rem' }} />
                      Stable
                    </span>
                  )}
                  {progressTrends.benefitPerformance.trend === 'declining' && (
                    <span className="trend-badge worsening">
                      <FaArrowDown style={{ fontSize: '0.75rem' }} />
                      Declining
                    </span>
                  )}
                </div>
                <div className="trend-content">
                  <div className="trend-stats-grid">
                    <div className="trend-stat-card">
                      <div className="trend-stat-value">{progressTrends.benefitPerformance.recentAvg}/10</div>
                      <div className="trend-stat-label">Last 7 Days</div>
                    </div>
                    <div className="trend-stat-card">
                      <div className="trend-stat-value">{progressTrends.benefitPerformance.overallAvg}/10</div>
                      <div className="trend-stat-label">All-Time Average</div>
                    </div>
                  </div>
                  <div className="trend-insight" dangerouslySetInnerHTML={renderTextWithBold(progressTrends.benefitPerformance.insight)}></div>
                </div>
              </div>
            )}

            {/* Overall Trajectory */}
            {progressTrends?.overallTrajectory && (
              <div className="trend-section trajectory-section">
                <div className="trend-header">
                  <span className="trend-title">Overall Trajectory</span>
                  {progressTrends.overallTrajectory.direction === 'positive' && (
                    <span className="trend-badge improving">
                      <FaCheckCircle style={{ fontSize: '0.75rem' }} />
                      Positive Momentum
                    </span>
                  )}
                  {progressTrends.overallTrajectory.direction === 'neutral' && (
                    <span className="trend-badge stable">
                      <FaEquals style={{ fontSize: '0.75rem' }} />
                      Maintaining
                    </span>
                  )}
                  {progressTrends.overallTrajectory.direction === 'needs_focus' && (
                    <span className="trend-badge worsening">
                      <FaFire style={{ fontSize: '0.75rem' }} />
                      Needs Focus
                    </span>
                  )}
                </div>
                <div className="trend-content">
                  <div className="trajectory-summary" dangerouslySetInnerHTML={renderTextWithBold(progressTrends.overallTrajectory.summary)}></div>
                  {progressTrends.overallTrajectory.milestones && progressTrends.overallTrajectory.milestones.length > 0 && (
                    <div className="trajectory-milestones">
                      <div className="milestones-title">Recent Milestones:</div>
                      {progressTrends.overallTrajectory.milestones.map((milestone, index) => (
                        <div key={index} className="milestone-item">
                          <FaTrophy style={{ fontSize: '0.875rem', color: 'var(--primary)' }} />
                          <span>{milestone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          </>
        )}
        {dataQuality?.level !== 'insufficient' && !hasInsufficientData && (
          <div className="insight-data-status">
            <div className="insight-data-status-indicator">
              <span className={`insight-data-quality ${dataQuality?.level || 'minimal'}`}>
                <FaChartLine />
                Historical Analysis
              </span>
              <span className="insight-data-days">
                Based on {dataQuality?.days || 0} days of tracking
              </span>
            </div>
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

  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>
          {daysSinceLastRelapse >= 90 
            ? 'Conquered Patterns Analysis' 
            : 'Relapse Pattern Analytics'
          }
        </span>
      </div>
      <div className="insight-info-banner">
        <FaInfoCircle className="info-icon" />
        <span>
          {daysSinceLastRelapse >= 90
            ? `Review the patterns you've successfully overcome ${daysSinceLastRelapse} days ago. This wisdom helps maintain vigilance and can guide others on their journey.`
            : 'Analyzes your relapse history to identify trigger patterns, phase vulnerabilities, and provides brutally honest countermeasures based on retention wisdom.'
          }
        </span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Pattern Analysis" isVisible={true} />
        ) : (
          <div className="relapse-patterns-display">
            {relapsePatterns.relapseCount && (
              <div className="relapse-summary-stats">
                <div className="relapse-stat-card">
                  <div className="relapse-stat-value">{relapsePatterns.relapseCount}</div>
                  <div className="relapse-stat-label">
                    {daysSinceLastRelapse >= 90 
                      ? 'Patterns Conquered' 
                      : 'Total Relapses Analyzed'
                    }
                  </div>
                </div>
                {relapsePatterns.primaryTrigger && (
                  <div className={`relapse-stat-card ${daysSinceLastRelapse >= 90 ? 'conquered-trigger' : ''}`}>
                    <div className="relapse-stat-value">{relapsePatterns.primaryTrigger}</div>
                    <div className="relapse-stat-label">
                      {daysSinceLastRelapse >= 90 ? 'Conquered Trigger' : 'Primary Trigger'}
                    </div>
                  </div>
                )}
                {relapsePatterns.vulnerablePhase && (
                  <div className="relapse-stat-card">
                    <div className="relapse-stat-value">{relapsePatterns.vulnerablePhase}</div>
                    <div className="relapse-stat-label">
                      {daysSinceLastRelapse >= 90 ? 'Previously Vulnerable Phase' : 'Most Vulnerable Phase'}
                    </div>
                  </div>
                )}
                {daysSinceLastRelapse >= 90 && (
                  <div className="relapse-stat-card victory-days">
                    <div className="relapse-stat-value">{daysSinceLastRelapse}</div>
                    <div className="relapse-stat-label">Days Since Victory</div>
                  </div>
                )}
              </div>
            )}
            
            <div className="relapse-insights-list">
              <div className="relapse-insights-title">
                {daysSinceLastRelapse >= 90 
                  ? 'Wisdom From Your Journey:' 
                  : 'Pattern Analysis:'
                }
              </div>
              {(relapsePatterns?.insights || []).map((insight, index) => (
                <div key={index} className="relapse-insight-item" dangerouslySetInnerHTML={renderTextWithBold(insight)}></div>
              ))}
              {daysSinceLastRelapse >= 90 && (
                <div className="relapse-insight-item victory-reminder">
                  <strong>🏆 Victory Reminder:</strong> You've successfully overcome these patterns for {daysSinceLastRelapse} days. This analysis serves as both a testament to your growth and a reminder to stay vigilant. Your journey can inspire others facing similar challenges.
                </div>
              )}
            </div>
          </div>
        )}
        <div className="insight-data-status">
          <div className="insight-data-status-indicator">
            <span className={`insight-data-quality ${daysSinceLastRelapse >= 90 ? 'conquered' : 'rich'}`}>
              {daysSinceLastRelapse >= 90 ? <FaTrophy /> : <FaShieldAlt />}
              {daysSinceLastRelapse >= 90 
                ? 'Conquered Intelligence' 
                : 'Relapse Intelligence'
              }
            </span>
            <span className="insight-data-days">
              {daysSinceLastRelapse >= 90 
                ? `Victory maintained for ${daysSinceLastRelapse} days`
                : `Based on ${relapsePatterns.relapseCount || 0} relapse records`
              }
            </span>
          </div>
        </div>
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
  const sectionDescription = "Identifies correlations between your metrics and predicts trends based on your unique retention journey patterns.";
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Pattern Recognition</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Pattern Analysis" isVisible={true} />
        ) : hasInsufficientData ? (
          <InsightEmptyState 
            insight="Pattern Recognition" 
            userData={userData}
            sectionTitle="Pattern Recognition"
            sectionDescription={sectionDescription}
          />
        ) : (
          <>
            {/* NEW: Mini info banner shown when data exists */}
            <MiniInfoBanner description={sectionDescription} />
            
            {(!patternInsights || patternInsights.length === 0 || 
              (patternInsights.length === 1 && patternInsights[0].includes('Need 14+'))) ? (
              <div className="insufficient-data-message">
                <div className="insufficient-data-text">
                  Continue tracking daily benefits to unlock pattern analysis. The more data you provide, the more detailed your insights become.
                </div>
              </div>
            ) : (
              <div className="patterns-display">
                {patternInsights.map((pattern, index) => (
                  <div key={index} className="pattern-item" dangerouslySetInnerHTML={renderTextWithBold(pattern)}></div>
                ))}
              </div>
            )}
          </>
        )}
        {dataQuality?.level !== 'insufficient' && !hasInsufficientData && (
          <div className="insight-data-status">
            <div className="insight-data-status-indicator">
              <span className={`insight-data-quality ${dataQuality?.level || 'minimal'}`}>
                <FaChartLine />
                {dataQuality?.label || 'Basic Analysis'}
              </span>
              <span className="insight-data-days">
                Based on {dataQuality?.days || 0} days of tracking
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// UPDATED: Optimization Guidance Component with Enhanced Dynamic Analysis
export const OptimizationGuidance = ({ 
  isLoading, 
  hasInsufficientData, 
  userData, 
  optimizationGuidance, 
  dataQuality 
}) => {
  const sectionDescription = "Analyzes your personal performance patterns to identify your optimal windows and provides phase-aware optimization strategies.";
  
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Performance Optimization</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Optimization Analysis" isVisible={true} />
        ) : hasInsufficientData ? (
          <InsightEmptyState 
            insight="Performance Optimization" 
            userData={userData}
            sectionTitle="Optimization Profile"
            sectionDescription={sectionDescription}
          />
        ) : (
          <>
            {/* NEW: Mini info banner shown when data exists */}
            <MiniInfoBanner description={sectionDescription} />
            
            <div className="optimization-display">
            <div className="optimization-criteria">
              <div className="optimization-criteria-title">
                {optimizationGuidance?.phase ? `${optimizationGuidance.phase} Phase - High Performance Criteria:` : 'Your High Performance Criteria:'}
              </div>
              <div className="optimization-criteria-text">{optimizationGuidance?.criteria || 'Building personalized criteria...'}</div>
            </div>
            <div className="optimization-metrics">
              <div className="optimization-metric-card">
                <div className="optimization-metric-value">{optimizationGuidance?.optimalRate || 'N/A'}</div>
                <div className="optimization-metric-label">
                  {optimizationGuidance?.optimalRate && optimizationGuidance.optimalRate !== 'N/A' 
                    ? 'Meeting your high performance criteria'
                    : 'High performance tracking'
                  }
                </div>
              </div>
            </div>
            <div className="optimization-recommendations">
              <div className="optimization-title">
                {optimizationGuidance?.phase ? `${optimizationGuidance.phase} Phase Guidance:` : 'Current Recommendations:'}
              </div>
              {(optimizationGuidance?.recommendations || []).map((rec, index) => (
                <div key={index} className="optimization-item" dangerouslySetInnerHTML={renderTextWithBold(rec)}></div>
              ))}
            </div>
          </div>
          </>
        )}
        {dataQuality?.level !== 'insufficient' && !hasInsufficientData && (
          <div className="insight-data-status">
            <div className="insight-data-status-indicator">
              <span className={`insight-data-quality ${dataQuality?.level || 'minimal'}`}>
                <FaChartLine />
                {optimizationGuidance?.thresholds ? 'Dynamic Performance Analysis' : (dataQuality?.label || 'Basic Analysis')}
              </span>
              <span className="insight-data-days">
                {optimizationGuidance?.thresholds 
                  ? `Personalized thresholds based on your top 25% performance days`
                  : `Based on ${dataQuality?.days || 0} days of tracking`
                }
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// UPDATED: Phase Evolution Analysis Component - EXACT CONGRUENCE with other insight sections
export const PhaseEvolutionAnalysis = ({ 
  isLoading, 
  hasInsufficientData,
  userData,
  phaseEvolution, 
  selectedMetric, 
  dataQuality,
  currentStreak
}) => {
  const sectionDescription = `Tracks how your ${selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric} develops through the retention phases and identifies phase-specific patterns and challenges.`;
  
  // Function to determine current phase based on streak - MATCHING EXACT LOGIC
  const getCurrentPhaseKey = (streak) => {
    if (streak <= 14) return 'foundation';
    if (streak <= 45) return 'purification';
    if (streak <= 90) return 'expansion';
    if (streak <= 180) return 'integration';
    return 'mastery';
  };

  // Use the passed currentStreak prop
  const currentPhaseKey = getCurrentPhaseKey(currentStreak || 0);

  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Phase Evolution Analysis</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Phase Analysis" isVisible={true} />
        ) : hasInsufficientData ? (
          <InsightEmptyState 
            insight="Phase Evolution" 
            userData={userData}
            sectionTitle="Phase Evolution"
            sectionDescription={sectionDescription}
          />
        ) : !phaseEvolution?.hasData ? (
          <InsightEmptyState 
            insight="Phase Evolution" 
            userData={userData}
            sectionTitle="Phase Evolution"
            sectionDescription={sectionDescription}
          />
        ) : (
          <>
            {/* NEW: Mini info banner shown when data exists */}
            <MiniInfoBanner description={sectionDescription} />
            
            {/* FIXED: Phase Comparison Grid with CORRECT current phase detection */}
            <div className="phase-evolution-grid">
              {Object.entries(phaseEvolution.phaseAverages).map(([phaseKey, phaseData]) => {
                // FIXED: Now correctly comparing phase keys
                const isCurrentPhase = phaseKey === currentPhaseKey;
                
                return (
                  <div 
                    key={phaseKey} 
                    className={`phase-evolution-card ${isCurrentPhase ? 'current-phase' : ''}`}
                  >
                    <div className="phase-evolution-name">
                      {phaseData.displayName}
                      {isCurrentPhase && <span className="current-phase-indicator"> (Current)</span>}
                    </div>
                    <div className="phase-evolution-range">{phaseData.range}</div>
                    <div className="phase-evolution-average">{phaseData.average}/10</div>
                    <div className="phase-evolution-label">Phase Average</div>
                    <div className="phase-evolution-data-points">{phaseData.dataPoints} days tracked</div>
                  </div>
                );
              })}
            </div>

            {/* Evolution Insights */}
            <div className="phase-evolution-insights">
              <div className="phase-evolution-insights-title">Phase Evolution Insights:</div>
              {phaseEvolution.insights.map((insight, index) => (
                <div 
                  key={index} 
                  className="phase-evolution-insight-item" 
                  dangerouslySetInnerHTML={renderTextWithBold(insight)}
                />
              ))}
            </div>

            {/* FIXED: Updated summary labels to be clearer */}
            <div className="phase-evolution-summary">
              <div className="evolution-summary-stat">
                <div className="evolution-summary-value">{phaseEvolution.completedPhases}</div>
                <div className="evolution-summary-label">Phases with Analysis (met data minimum for insights)</div>
              </div>
              <div className="evolution-summary-stat">
                <div className="evolution-summary-value">{phaseEvolution.totalPhases}</div>
                <div className="evolution-summary-label">Total Phases Experienced (your complete journey)</div>
              </div>
            </div>
          </>
        )}
      </div>
      {dataQuality?.level !== 'insufficient' && !hasInsufficientData && (
        <div className="insight-data-status">
          <div className="insight-data-status-indicator">
            <span className={`insight-data-quality ${dataQuality?.level || 'minimal'}`}>
              <FaBrain />
              Phase Intelligence
            </span>
            <span className="insight-data-days">
              Tracking {selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric} evolution through retention phases
            </span>
          </div>
        </div>
      )}
    </div>
  );
};