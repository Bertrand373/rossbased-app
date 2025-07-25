// components/Stats/EnergyIntelligenceSection.js - Final Congruent Design with Premium Progress Indicator
import React, { useState, useMemo } from 'react';
import { FaFire, FaStar, FaLock, FaInfoCircle, FaChartLine, FaBrain, FaRocket, FaEye } from 'react-icons/fa';
import { generateFreeUserEnergyAnalysis } from './StatsEnergyIntelligence';
import { renderTextWithBold } from './StatsUtils';
import helmetImage from '../../assets/helmet.png';

const EnergyIntelligenceSection = ({ userData, onUpgradeClick }) => {
  const [selectedInsight, setSelectedInsight] = useState('patterns');
  const [loadingStates, setLoadingStates] = useState({
    patterns: false,
    phase: false,
    risk: false,
    optimization: false
  });
  
  // Generate comprehensive energy analysis
  const energyAnalysis = useMemo(() => 
    generateFreeUserEnergyAnalysis(userData, 'week'), 
    [userData]
  );

  // Calculate insight-specific progress indicators
  const getInsightProgress = (insightType) => {
    const requirements = {
      patterns: 7,
      phase: 3,
      risk: 3,
      optimization: 10
    };
    
    const required = requirements[insightType] || 7;
    const progressPercentage = Math.min((trackedDays / required) * 100, 100);
    const isReady = trackedDays >= required;
    
    return {
      required,
      current: trackedDays,
      percentage: progressPercentage,
      isReady,
      remaining: Math.max(0, required - trackedDays)
    };
  };

  // Simulate loading when switching tabs
  const handleTabSwitch = (insightId) => {
    if (insightId === selectedInsight) return;
    
    setLoadingStates(prev => ({ ...prev, [insightId]: true }));
    
    setTimeout(() => {
      setSelectedInsight(insightId);
      setLoadingStates(prev => ({ ...prev, [insightId]: false }));
    }, 800);
  };

  const insights = [
    {
      id: 'patterns',
      title: 'Personal Patterns',
      data: energyAnalysis.personalPatterns
    },
    {
      id: 'phase',
      title: 'Phase Intelligence',
      data: energyAnalysis.phaseIntelligence
    },
    {
      id: 'risk',  
      title: 'Risk Prediction',
      data: energyAnalysis.riskPrediction
    },
    {
      id: 'optimization',
      title: 'Optimization',
      data: energyAnalysis.optimizationInsights
    }
  ];

  return (
    <div className="energy-intelligence-section">
      {/* Header - Clean like Premium */}
      <div className="energy-intelligence-header">
        <h3>Energy Intelligence</h3>
      </div>

      {/* UPDATED: Overall Progress Indicator */}
      <div className="energy-data-progress-indicator">
        <div className="energy-data-progress-header">
          <div className="energy-data-progress-title">
            Energy Intelligence Progress
          </div>
          <div className="energy-data-progress-count">
            {trackedDays} days tracked
          </div>
        </div>
        <div className="energy-data-progress-bar">
          <div 
            className="energy-data-progress-fill"
            style={{ width: `${Math.min((trackedDays / 10) * 100, 100)}%` }}
          />
        </div>
        <div className="energy-data-progress-message">
          Track daily energy to unlock personalized insights and patterns
        </div>
      </div>

      {/* Info Banner - Match Stats Info Banner Style */}
      <div className="energy-info-banner">
        <FaInfoCircle className="info-icon" />
        <span><strong>Personalized insights from your energy tracking patterns.</strong> Your analysis becomes more detailed as you log daily benefits and track progress over time.</span>
      </div>

      {/* Current Energy Average Display - Match Premium Style */}
      <div className="current-energy-display">
        <div className="energy-average-card">
          <div className="energy-average-label">Your Energy Level (Last 7 Days)</div>
          <div className="energy-average-value">
            {energyAnalysis.phaseIntelligence.currentAverage !== 'N/A' ? 
              `${energyAnalysis.phaseIntelligence.currentAverage}/10` : 
              'Start Tracking'
            }
          </div>
          <div className="energy-phase-context">
            {energyAnalysis.phaseIntelligence.description} • Expected: {energyAnalysis.phaseIntelligence.expectedRange}/10
          </div>
        </div>
      </div>

      {/* Insight Selector Tabs - Match Benefit Tracker Pills */}
      <div className="insight-selector-tabs">
        <div className="insight-pill-container">
          {insights.map(insight => (
            <button
              key={insight.id}
              className={`insight-tab ${selectedInsight === insight.id ? 'active' : ''}`}
              onClick={() => handleTabSwitch(insight.id)}
              onKeyDown={(e) => e.key === 'Enter' && handleTabSwitch(insight.id)}
              tabIndex={0}
              aria-pressed={selectedInsight === insight.id}
            >
              {insight.title}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Insight Display - Match Premium Insight Cards */}
      <div className="selected-insight-display">
        {selectedInsight === 'patterns' && (
          <PatternInsightCard 
            data={energyAnalysis.personalPatterns} 
            isLoading={loadingStates.patterns}
            dataQuality={energyAnalysis.dataQuality}
            progress={getInsightProgress('patterns')}
          />
        )}
        {selectedInsight === 'phase' && (
          <PhaseInsightCard 
            data={energyAnalysis.phaseIntelligence} 
            isLoading={loadingStates.phase}
            dataQuality={energyAnalysis.dataQuality}
            progress={getInsightProgress('phase')}
          />
        )}
        {selectedInsight === 'risk' && (
          <RiskInsightCard 
            data={energyAnalysis.riskPrediction} 
            isLoading={loadingStates.risk}
            dataQuality={energyAnalysis.dataQuality}
            progress={getInsightProgress('risk')}
          />
        )}
        {selectedInsight === 'optimization' && (
          <OptimizationInsightCard 
            data={energyAnalysis.optimizationInsights} 
            isLoading={loadingStates.optimization}
            dataQuality={energyAnalysis.dataQuality}
            progress={getInsightProgress('optimization')}
          />
        )}
      </div>

      {/* UPDATED: Quick Risk Check - Match Premium Style (no icon) */}
      <div className="quick-risk-overview">
        <div className="quick-risk-card">
          <div className="quick-risk-header">
            <span>Quick Risk Check</span>
          </div>
          <div className="quick-risk-content">
            <div className="quick-risk-level">
              {energyAnalysis.riskPrediction?.score === 'N/A' ? 'N/A' : `${energyAnalysis.riskPrediction?.level || 'Low'} Risk`}
            </div>
            <div className="quick-risk-description">
              {energyAnalysis.riskPrediction?.score === 'N/A' ? 
                'Track energy for 3+ days to unlock personalized risk assessment with your relapse history.' :
                'Basic risk level calculated. Energy Intelligence above provides detailed analysis and personal vulnerability insights.'
              }
            </div>
          </div>
        </div>
      </div>

      {/* CONSOLIDATED: Single Premium Upgrade Section */}
      <div className="energy-premium-upgrade">
        <div className="energy-upgrade-header">
          <FaLock className="energy-upgrade-lock-icon" />
          <h4>Complete Energy Mastery</h4>
        </div>
        
        <div className="energy-upgrade-features">
          <div className="energy-upgrade-feature">
            <FaChartLine className="energy-upgrade-feature-icon" />
            <div className="energy-upgrade-feature-text">
              <div className="energy-upgrade-feature-title">Multi-Metric Charts</div>
              <div className="energy-upgrade-feature-desc">Energy, Focus, Confidence, Aura, Sleep & Workout tracking</div>
            </div>
          </div>
          
          <div className="energy-upgrade-feature">
            <FaBrain className="energy-upgrade-feature-icon" />
            <div className="energy-upgrade-feature-text">
              <div className="energy-upgrade-feature-title">Advanced AI Insights</div>
              <div className="energy-upgrade-feature-desc">Pattern recognition across all metrics with optimization timing</div>
            </div>
          </div>
          
          <div className="energy-upgrade-feature">
            <FaFire className="energy-upgrade-feature-icon" />
            <div className="energy-upgrade-feature-text">
              <div className="energy-upgrade-feature-title">Phase Evolution Analysis</div>
              <div className="energy-upgrade-feature-desc">Track how all benefits evolve through retention phases</div>
            </div>
          </div>
          
          <div className="energy-upgrade-feature">
            <FaRocket className="energy-upgrade-feature-icon" />
            <div className="energy-upgrade-feature-text">
              <div className="energy-upgrade-feature-title">Smart Correlations</div>
              <div className="energy-upgrade-feature-desc">Discover hidden connections between all your metrics</div>
            </div>
          </div>
        </div>

        <div className="energy-upgrade-cta">
          <div className="energy-upgrade-helmet-container">
            <img 
              src={helmetImage} 
              alt="Premium Intelligence" 
              className="energy-upgrade-helmet"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="energy-upgrade-helmet-fallback" style={{display: 'none'}}>🧠</div>
          </div>
          
          <div className="energy-upgrade-content">
            <div className="energy-upgrade-title">Unlock Premium Intelligence</div>
            <div className="energy-upgrade-description">
              Get complete multi-metric analysis, advanced correlations, and phase-specific optimization strategies for your retention journey.
            </div>
          </div>
          
          <button 
            className="energy-upgrade-btn" 
            onClick={onUpgradeClick}
            onKeyDown={(e) => e.key === 'Enter' && onUpgradeClick()}
            tabIndex={0}
          >
            <FaStar />
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
};

// Individual Insight Card Components - With Progress Indicators
const PatternInsightCard = ({ data, isLoading, dataQuality, progress }) => (
  <div className="insight-content-card patterns">
    <div className="insight-card-header">
      <span>Your Personal Energy Patterns</span>
    </div>
    <div className="insight-main-content">
      {isLoading ? (
        <LoadingState title="Analyzing patterns..." />
      ) : !progress.isReady ? (
        <div className="insufficient-data">
          <div className="insufficient-message">
            Track {progress.remaining} more days to unlock personal energy pattern analysis (requires {progress.required} days)
          </div>
          <div className="energy-data-progress-indicator">
            <div className="energy-data-progress-header">
              <div className="energy-data-progress-title">Pattern Analysis Progress</div>
              <div className="energy-data-progress-count">{progress.current}/{progress.required} days</div>
            </div>
            <div className="energy-data-progress-bar">
              <div 
                className="energy-data-progress-fill"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="pattern-status">
            <div className={`pattern-badge ${data.pattern}`}>
              {data.pattern === 'building' && 'Building Profile'}
              {data.pattern === 'weekly-cycle' && 'Weekly Cycle Detected'}
              {data.pattern === 'ascending' && 'Rising Trend'}
              {data.pattern === 'declining' && 'Needs Attention'}
              {data.pattern === 'stable' && 'Stable Baseline'}
            </div>
          </div>
          <div className="pattern-insight" dangerouslySetInnerHTML={renderTextWithBold(data.insight)} />
          
          {data.details && (
            <div className="pattern-details">
              {data.details.bestDay && (
                <div className="pattern-detail-item">
                  <div className="detail-label">Peak Day</div>
                  <div className="detail-value">{data.details.bestDay} ({data.details.bestAverage}/10)</div>
                </div>
              )}
              {data.details.worstDay && (
                <div className="pattern-detail-item">
                  <div className="detail-label">Low Day</div>
                  <div className="detail-value">{data.details.worstDay} ({data.details.worstAverage}/10)</div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
    {/* Data Quality Status */}
    {progress.isReady && !isLoading && (
      <div className="energy-insight-data-status">
        <div className="energy-insight-data-status-indicator">
          <span className={`energy-insight-data-quality ${dataQuality?.level || 'minimal'}`}>
            <FaFire />
            {dataQuality?.label || 'Pattern Analysis'}
          </span>
          <span className="energy-insight-data-days">
            Based on {progress.current} days of tracking
          </span>
        </div>
      </div>
    )}
  </div>
);

const PhaseInsightCard = ({ data, isLoading, dataQuality, progress }) => (
  <div className="insight-content-card phase">
    <div className="insight-card-header">
      <span>{data.phase} Phase Intelligence</span>
    </div>
    <div className="insight-main-content">
      {isLoading ? (
        <LoadingState title="Analyzing phase..." />
      ) : !progress.isReady ? (
        <div className="insufficient-data">
          <div className="insufficient-message">
            Track {progress.remaining} more days to unlock phase intelligence analysis (requires {progress.required} days)
          </div>
          <div className="energy-data-progress-indicator">
            <div className="energy-data-progress-header">
              <div className="energy-data-progress-title">Phase Analysis Progress</div>
              <div className="energy-data-progress-count">{progress.current}/{progress.required} days</div>
            </div>
            <div className="energy-data-progress-bar">
              <div 
                className="energy-data-progress-fill"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="phase-status-bar">
            <div className="phase-current">{data.phase}</div>
            <div className="phase-expected">Expected: {data.expectedRange}/10</div>
            <div className="phase-actual">Your Avg: {data.currentAverage}/10</div>
          </div>
          
          <div className="phase-guidance" dangerouslySetInnerHTML={renderTextWithBold(data.guidance)} />
          
          <div className="phase-optimization">
            <div className="optimization-title">Phase Optimization:</div>
            <div className="optimization-text">{data.optimization}</div>
          </div>
        </>
      )}
    </div>
    {/* Data Quality Status */}
    {progress.isReady && !isLoading && (
      <div className="energy-insight-data-status">
        <div className="energy-insight-data-status-indicator">
          <span className={`energy-insight-data-quality ${dataQuality?.level || 'minimal'}`}>
            <FaFire />
            Phase Intelligence
          </span>
          <span className="energy-insight-data-days">
            {data.phase} phase analysis
          </span>
        </div>
      </div>
    )}
  </div>
);

const RiskInsightCard = ({ data, isLoading, dataQuality, progress }) => (
  <div className="insight-content-card risk">
    <div className="insight-card-header">
      <span>Smart Risk Prediction</span>
    </div>
    <div className="insight-main-content">
      {isLoading ? (
        <LoadingState title="Calculating risk..." />
      ) : !progress.isReady ? (
        <div className="insufficient-data">
          <div className="insufficient-message">
            Track {progress.remaining} more days to unlock risk prediction analysis (requires {progress.required} days)
          </div>
          <div className="energy-data-progress-indicator">
            <div className="energy-data-progress-header">
              <div className="energy-data-progress-title">Risk Analysis Progress</div>
              <div className="energy-data-progress-count">{progress.current}/{progress.required} days</div>
            </div>
            <div className="energy-data-progress-bar">
              <div 
                className="energy-data-progress-fill"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="risk-level-display">
            <div className={`risk-indicator ${data.level.toLowerCase()}`}>
              <div className="risk-score">
                {data.score !== 'N/A' ? `${data.score}%` : 'N/A'}
              </div>
              <div className="risk-level">{data.level} Risk</div>
            </div>
          </div>
          
          <div className="risk-factors">
            <div className="factors-title">Current Analysis:</div>
            {data.factors.map((factor, index) => (
              <div key={index} className="risk-factor" dangerouslySetInnerHTML={renderTextWithBold(factor)} />
            ))}
          </div>
          
          {data.personalTriggers.length > 0 && (
            <div className="personal-triggers">
              <div className="triggers-title">Your Vulnerabilities:</div>
              {data.personalTriggers.map((trigger, index) => (
                <div key={index} className="trigger-item">{trigger}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
    {/* Data Quality Status */}
    {progress.isReady && !isLoading && (
      <div className="energy-insight-data-status">
        <div className="energy-insight-data-status-indicator">
          <span className={`energy-insight-data-quality ${dataQuality?.level || 'minimal'}`}>
            <FaFire />
            Risk Analysis
          </span>
          <span className="energy-insight-data-days">
            Predictive assessment
          </span>
        </div>
      </div>
    )}
  </div>
);

const OptimizationInsightCard = ({ data, isLoading, dataQuality, progress }) => (
  <div className="insight-content-card optimization">
    <div className="insight-card-header">
      <span>Energy Optimization</span>
    </div>
    <div className="insight-main-content">
      {isLoading ? (
        <LoadingState title="Optimizing strategy..." />
      ) : !progress.isReady ? (
        <div className="insufficient-data">
          <div className="insufficient-message">
            Track {progress.remaining} more days to unlock optimization insights (requires {progress.required} days)
          </div>
          <div className="energy-data-progress-indicator">
            <div className="energy-data-progress-header">
              <div className="energy-data-progress-title">Optimization Progress</div>
              <div className="energy-data-progress-count">{progress.current}/{progress.required} days</div>
            </div>
            <div className="energy-data-progress-bar">
              <div 
                className="energy-data-progress-fill"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          {data.status === 'insufficient' ? (
            <div className="insufficient-data">
              <div className="insufficient-message">{data.message}</div>
            </div>
          ) : (
          ) : (
            <>
              <div className="optimization-status">
                <div className="status-badge active">Active Analysis</div>
              </div>
              
              <div className="optimization-recommendations">
                {data.recommendations.map((rec, index) => (
                  <div key={index} className="optimization-rec" dangerouslySetInnerHTML={renderTextWithBold(rec)} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
    {/* Data Quality Status */}
    {progress.isReady && !isLoading && (
      <div className="energy-insight-data-status">
        <div className="energy-insight-data-status-indicator">
          <span className={`energy-insight-data-quality ${dataQuality?.level || 'minimal'}`}>
            <FaFire />
            Optimization Engine
          </span>
          <span className="energy-insight-data-days">
            Performance analysis
          </span>
        </div>
      </div>
    )}
  </div>
);
              <div className="optimization-status">
                <div className="status-badge active">Active Analysis</div>
              </div>
              
              <div className="optimization-recommendations">
                {data.recommendations.map((rec, index) => (
                  <div key={index} className="optimization-rec" dangerouslySetInnerHTML={renderTextWithBold(rec)} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
    {/* Data Quality Status */}
    {progress.isReady && !isLoading && (
      <div className="energy-insight-data-status">
        <div className="energy-insight-data-status-indicator">
          <span className={`energy-insight-data-quality ${dataQuality?.level || 'minimal'}`}>
            <FaFire />
            Optimization Engine
          </span>
          <span className="energy-insight-data-days">
            Performance analysis
          </span>
        </div>
      </div>
    )}
  </div>
);
              <div className="optimization-status">
                <div className="status-badge active">Active Analysis</div>
              </div>
              
              <div className="optimization-recommendations">
                {data.recommendations.map((rec, index) => (
                  <div key={index} className="optimization-rec" dangerouslySetInnerHTML={renderTextWithBold(rec)} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
    {/* Data Quality Status */}
    {dataQuality?.level !== 'insufficient' && !isLoading && (
      <div className="energy-insight-data-status">
        <div className="energy-insight-data-status-indicator">
          <span className={`energy-insight-data-quality ${dataQuality?.level || 'minimal'}`}>
            <FaFire />
            Optimization Engine
          </span>
          <span className="energy-insight-data-days">
            Performance analysis
          </span>
        </div>
      </div>
    )}
  </div>
);

// Loading State Component - Match Premium Loading Animations
const LoadingState = ({ title }) => (
  <div className="energy-insight-loading-state">
    <div className="energy-insight-loading-content">
      <img 
        src={helmetImage} 
        alt="Analyzing" 
        className="energy-insight-loading-helmet"
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'block';
        }}
      />
      <div className="energy-insight-loading-helmet-fallback" style={{display: 'none'}}>🧠</div>
      <div className="energy-insight-loading-text">
        <div className="energy-insight-loading-title">{title}</div>
        <div className="energy-insight-loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  </div>
);

export default EnergyIntelligenceSection;