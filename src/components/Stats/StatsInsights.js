// components/Stats/StatsInsights.js - Analytics and Insights Components - COMPLETE UPDATED FILE
import React from 'react';
import { FaChartLine, FaShieldAlt, FaTrophy, FaFire, FaArrowUp, FaArrowDown, FaEquals, FaBrain, FaInfoCircle } from 'react-icons/fa';
import { InsightLoadingState, InsightEmptyState } from './StatsComponents';
import { renderTextWithBold } from './StatsUtils';

// Smart Urge Management Component
export const SmartUrgeManagement = ({ 
  isLoading, 
  hasInsufficientData, 
  userData, 
  urgeManagement, 
  dataQuality 
}) => {
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Smart Urge Management</span>
      </div>
      <div className="insight-info-banner">
        <FaInfoCircle className="info-icon" />
        <span>Real-time vulnerability assessment based on your current streak phase, time of day, and recent benefit patterns.</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Smart Urge Management" isVisible={true} />
        ) : hasInsufficientData ? (
          <InsightEmptyState insight="Smart Urge Management" userData={userData} />
        ) : (
          <div className="urge-management-display">
            {urgeManagement?.riskLevel === 'N/A' ? (
              <div className="risk-level-indicator insufficient">
                <div>
                  <div className="risk-score insufficient">N/A</div>
                  <div className="risk-level-text">Insufficient Data</div>
                </div>
              </div>
            ) : (
              <div className={`risk-level-indicator ${urgeManagement?.riskLevel?.toLowerCase() || 'low'}`}>
                <div>
                  <div className={`risk-score ${urgeManagement?.riskLevel?.toLowerCase() || 'low'}`}>
                    {urgeManagement?.riskLevel || 'Low'}
                  </div>
                  <div className="risk-level-text">Current Risk Level</div>
                </div>
              </div>
            )}
            <div className="guidance-list">
              <div className="guidance-title">
                {urgeManagement?.riskLevel === 'N/A' ? 'Data Requirements:' : 'Current Guidance:'}
              </div>
              {(urgeManagement?.guidance || []).map((guide, index) => (
                <div key={index} className="guidance-item" dangerouslySetInnerHTML={renderTextWithBold(guide)}></div>
              ))}
            </div>
          </div>
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

// Relapse Risk Predictor Component
export const RelapseRiskPredictor = ({ 
  isLoading, 
  hasInsufficientData, 
  userData, 
  riskAnalysis, 
  dataQuality 
}) => {
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Relapse Risk Predictor</span>
      </div>
      <div className="insight-info-banner">
        <FaInfoCircle className="info-icon" />
        <span>Analyzes your recent benefit trends to predict vulnerability periods and provide specific mitigation strategies.</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Risk Analysis" isVisible={true} />
        ) : hasInsufficientData ? (
          <InsightEmptyState insight="Relapse Risk Predictor" userData={userData} />
        ) : (
          <div className="risk-predictor-display">
            {riskAnalysis?.score === 'N/A' ? (
              <div className="risk-level-indicator insufficient">
                <div>
                  <div className="risk-score insufficient">N/A</div>
                  <div className="risk-level-text">Insufficient Data</div>
                </div>
              </div>
            ) : (
              <div className={`risk-level-indicator ${riskAnalysis?.level?.toLowerCase() || 'low'}`}>
                <div>
                  <div className={`risk-score ${riskAnalysis?.level?.toLowerCase() || 'low'}`}>
                    {riskAnalysis?.score || 0}%
                  </div>
                  <div className="risk-level-text">{riskAnalysis?.level || 'Low'} Risk Level</div>
                </div>
              </div>
            )}
            <div className="risk-factors-list">
              <div className="risk-factors-title">
                {riskAnalysis?.score === 'N/A' ? 'Data Requirements:' : 'Risk Factors & Actions:'}
              </div>
              {(riskAnalysis?.factors || []).map((factor, index) => (
                <div key={index} className="risk-factor-item" dangerouslySetInnerHTML={renderTextWithBold(factor)}></div>
              ))}
            </div>
          </div>
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
                  <div className={`relapse-stat-card ${daysSinceLastRelapse >= 90 ? 'conquered-trigger' : 'primary-trigger'}`}>
                    <div className="relapse-stat-value">{relapsePatterns.primaryTrigger}</div>
                    <div className="relapse-stat-label">
                      {daysSinceLastRelapse >= 90 
                        ? 'Mastered Weakness' 
                        : 'Primary Vulnerability'
                      }
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
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Pattern Recognition</span>
      </div>
      <div className="insight-info-banner">
        <FaInfoCircle className="info-icon" />
        <span>Identifies correlations between your metrics and predicts trends based on your unique retention journey patterns.</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Pattern Analysis" isVisible={true} />
        ) : hasInsufficientData ? (
          <InsightEmptyState insight="Pattern Recognition" userData={userData} />
        ) : (
          <>
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

// Optimization Guidance Component
export const OptimizationGuidance = ({ 
  isLoading, 
  hasInsufficientData, 
  userData, 
  optimizationGuidance, 
  dataQuality 
}) => {
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <span>Optimization Guidance</span>
      </div>
      <div className="insight-info-banner">
        <FaInfoCircle className="info-icon" />
        <span>Shows your peak performance rate and provides timing-based recommendations for maximizing your retention benefits.</span>
      </div>
      <div className="insight-card-content">
        {isLoading ? (
          <InsightLoadingState insight="Optimization Analysis" isVisible={true} />
        ) : hasInsufficientData ? (
          <InsightEmptyState insight="Optimization Guidance" userData={userData} />
        ) : (
          <div className="optimization-display">
            <div className="optimization-criteria">
              <div className="optimization-criteria-title">Your Peak Performance Zone:</div>
              <div className="optimization-criteria-text">{optimizationGuidance?.criteria || 'Energy 7+, Confidence 5+'}</div>
            </div>
            <div className="optimization-metrics">
              <div className="optimization-metric-card">
                <div className="optimization-metric-value">{optimizationGuidance?.optimalRate || 'N/A'}</div>
                <div className="optimization-metric-label">Operating in optimal zone</div>
              </div>
            </div>
            <div className="optimization-recommendations">
              <div className="optimization-title">Current Recommendations:</div>
              {(optimizationGuidance?.recommendations || []).map((rec, index) => (
                <div key={index} className="optimization-item" dangerouslySetInnerHTML={renderTextWithBold(rec)}></div>
              ))}
            </div>
          </div>
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

// FIXED: Phase Evolution Analysis Component - Removed brain icon, added clear labels, consistent info icon
export const PhaseEvolutionAnalysis = ({ 
  isLoading, 
  phaseEvolution, 
  selectedMetric, 
  dataQuality,
  currentStreak // Add currentStreak prop to determine current phase
}) => {
  // Function to determine current phase based on streak
  const getCurrentPhaseKey = (streak) => {
    if (streak <= 14) return 'foundation';
    if (streak <= 45) return 'purification';
    if (streak <= 90) return 'expansion';
    if (streak <= 180) return 'integration';
    return 'mastery';
  };

  const currentPhaseKey = getCurrentPhaseKey(currentStreak || 0);

  return (
    <div className="phase-evolution-section">
      {/* REMOVED: Brain icon from header to match other sections */}
      <div className="phase-evolution-header">
        <span>Phase Evolution Analysis</span>
      </div>
      <div className="insight-info-banner">
        <FaInfoCircle className="info-icon" />
        <span>Tracks how your {selectedMetric === 'sleep' ? 'sleep quality' : selectedMetric} develops through the retention phases and identifies phase-specific patterns and challenges.</span>
      </div>
      
      {isLoading ? (
        <InsightLoadingState insight="Phase Analysis" isVisible={true} />
      ) : !phaseEvolution?.hasData ? (
        <div className="phase-evolution-empty">
          <div className="phase-evolution-empty-content">
            <div className="phase-evolution-empty-text">
              {phaseEvolution?.message || 'Building phase evolution data...'}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* FIXED: Phase Comparison Grid with clear labels and current phase detection */}
          <div className="phase-evolution-grid">
            {Object.entries(phaseEvolution.phaseAverages).map(([phaseKey, phaseData]) => {
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
                  {/* FIXED: Added clear label to show this is phase average */}
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

          {/* Progress Summary */}
          <div className="phase-evolution-summary">
            <div className="evolution-summary-stat">
              <div className="evolution-summary-value">{phaseEvolution.completedPhases}</div>
              <div className="evolution-summary-label">Phases with Analysis</div>
            </div>
            <div className="evolution-summary-stat">
              <div className="evolution-summary-value">{phaseEvolution.totalPhases}</div>
              <div className="evolution-summary-label">Total Phases Tracked</div>
            </div>
          </div>

          {dataQuality?.level !== 'insufficient' && (
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
        </>
      )}
    </div>
  );
};