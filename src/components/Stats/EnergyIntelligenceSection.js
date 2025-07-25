// components/Stats/EnergyIntelligenceSection.js - Enhanced Free User Energy Intelligence UI - CONGRUENT WITH PREMIUM DESIGN
import React, { useState, useMemo } from 'react';
import { FaFire, FaStar, FaLock, FaInfoCircle } from 'react-icons/fa';
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
      {/* UPDATED: Header with Data Quality Badge - Match Premium Style */}
      <div className="energy-intelligence-header">
        <div className="energy-header-main">
          <h3>Energy Intelligence</h3>
          <div className={`energy-data-quality ${energyAnalysis.dataQuality.level}`}>
            <FaFire className="quality-icon" />
            <span>{energyAnalysis.dataQuality.label}</span>
            <span className="quality-days">({energyAnalysis.dataQuality.days} days)</span>
          </div>
        </div>
      </div>

      {/* UPDATED: Info Banner - Match Stats Info Banner Style */}
      <div className="energy-info-banner">
        <FaInfoCircle className="info-icon" />
        <span><strong>Personalized insights from your energy tracking patterns.</strong> Your analysis becomes more detailed as you log daily benefits and track progress over time.</span>
      </div>

      {/* UPDATED: Current Energy Average Display - Match Premium Current Metric Average */}
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

      {/* UPDATED: Insight Selector Tabs - Match Benefit Tracker Pills */}
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

      {/* UPDATED: Selected Insight Display - Match Premium Insight Cards */}
      <div className="selected-insight-display">
        {selectedInsight === 'patterns' && (
          <PatternInsightCard 
            data={energyAnalysis.personalPatterns} 
            isLoading={loadingStates.patterns}
            dataQuality={energyAnalysis.dataQuality}
          />
        )}
        {selectedInsight === 'phase' && (
          <PhaseInsightCard 
            data={energyAnalysis.phaseIntelligence} 
            isLoading={loadingStates.phase}
            dataQuality={energyAnalysis.dataQuality}
          />
        )}
        {selectedInsight === 'risk' && (
          <RiskInsightCard 
            data={energyAnalysis.riskPrediction} 
            isLoading={loadingStates.risk}
            dataQuality={energyAnalysis.dataQuality}
          />
        )}
        {selectedInsight === 'optimization' && (
          <OptimizationInsightCard 
            data={energyAnalysis.optimizationInsights} 
            isLoading={loadingStates.optimization}
            dataQuality={energyAnalysis.dataQuality}
          />
        )}
      </div>

      {/* Premium Upgrade Preview */}
      <div className="premium-correlations-preview">
        <div className="correlations-header">
          <FaLock className="lock-icon" />
          <h4>Unlock Multi-Metric Correlations</h4>
        </div>
        
        <div className="correlations-grid">
          {energyAnalysis.upgradePreview.correlations.map((correlation, index) => (
            <div key={index} className="correlation-preview-card locked">
              <div className="correlation-title">{correlation.title}</div>
              <div className="correlation-description">{correlation.description}</div>
              <FaLock className="correlation-lock" />
            </div>
          ))}
        </div>

        <div className="upgrade-action-section">
          <div className="upgrade-helmet-container">
            <img 
              src={helmetImage} 
              alt="Premium Intelligence" 
              className="upgrade-helmet-small"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="upgrade-helmet-small-fallback" style={{display: 'none'}}>🧠</div>
          </div>
          
          <div className="upgrade-content">
            <div className="upgrade-title">Complete Energy Mastery</div>
            <div className="upgrade-description">
              Track 6 metrics, unlock correlations, get optimization timing, and receive phase-specific strategies
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

// UPDATED: Individual Insight Card Components - Match Premium Style (No Icons)
const PatternInsightCard = ({ data, isLoading, dataQuality }) => (
  <div className="insight-content-card patterns">
    <div className="insight-card-header">
      <span>Your Personal Energy Patterns</span>
    </div>
    <div className="insight-main-content">
      {isLoading ? (
        <LoadingState title="Analyzing patterns..." />
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
    {/* UPDATED: Data Quality Status - Match Premium Style */}
    {dataQuality?.level !== 'insufficient' && !isLoading && (
      <div className="energy-insight-data-status">
        <div className="energy-insight-data-status-indicator">
          <span className={`energy-insight-data-quality ${dataQuality?.level || 'minimal'}`}>
            <FaFire />
            {dataQuality?.label || 'Basic Analysis'}
          </span>
          <span className="energy-insight-data-days">
            Based on {dataQuality?.days || 0} days of tracking
          </span>
        </div>
      </div>
    )}
  </div>
);

const PhaseInsightCard = ({ data, isLoading, dataQuality }) => (
  <div className="insight-content-card phase">
    <div className="insight-card-header">
      <span>{data.phase} Phase Intelligence</span>
    </div>
    <div className="insight-main-content">
      {isLoading ? (
        <LoadingState title="Analyzing phase..." />
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
    {/* UPDATED: Data Quality Status */}
    {dataQuality?.level !== 'insufficient' && !isLoading && (
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

const RiskInsightCard = ({ data, isLoading, dataQuality }) => (
  <div className="insight-content-card risk">
    <div className="insight-card-header">
      <span>Smart Risk Prediction</span>
    </div>
    <div className="insight-main-content">
      {isLoading ? (
        <LoadingState title="Calculating risk..." />
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
    {/* UPDATED: Data Quality Status */}
    {dataQuality?.level !== 'insufficient' && !isLoading && (
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

const OptimizationInsightCard = ({ data, isLoading, dataQuality }) => (
  <div className="insight-content-card optimization">
    <div className="insight-card-header">
      <span>Energy Optimization</span>
    </div>
    <div className="insight-main-content">
      {isLoading ? (
        <LoadingState title="Optimizing strategy..." />
      ) : (
        <>
          {data.status === 'insufficient' ? (
            <div className="insufficient-data">
              <div className="insufficient-message">{data.message}</div>
            </div>
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
    {/* UPDATED: Data Quality Status */}
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

// UPDATED: Loading State Component - Match Premium Loading Animations
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