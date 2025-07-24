// components/Stats/EnergyIntelligenceSection.js - Enhanced Free User Energy Intelligence UI
import React, { useState, useMemo } from 'react';
import { FaBrain, FaChartLine, FaExclamationTriangle, FaLightbulb, FaRocket, FaStar, FaLock, FaInfoCircle, FaFire, FaShieldAlt } from 'react-icons/fa';
import { generateFreeUserEnergyAnalysis } from './StatsEnergyIntelligence';
import { renderTextWithBold } from './StatsUtils';
import helmetImage from '../../assets/helmet.png';

const EnergyIntelligenceSection = ({ userData, onUpgradeClick }) => {
  const [selectedInsight, setSelectedInsight] = useState('patterns');
  
  // Generate comprehensive energy analysis
  const energyAnalysis = useMemo(() => 
    generateFreeUserEnergyAnalysis(userData, 'week'), 
    [userData]
  );

  const insights = [
    {
      id: 'patterns',
      title: 'Personal Patterns',
      icon: <FaChartLine />,
      data: energyAnalysis.personalPatterns
    },
    {
      id: 'phase',
      title: 'Phase Intelligence',
      icon: <FaBrain />,
      data: energyAnalysis.phaseIntelligence
    },
    {
      id: 'risk',  
      title: 'Risk Prediction',
      icon: <FaShieldAlt />,
      data: energyAnalysis.riskPrediction
    },
    {
      id: 'optimization',
      title: 'Optimization',
      icon: <FaRocket />,
      data: energyAnalysis.optimizationInsights
    }
  ];

  return (
    <div className="energy-intelligence-section">
      {/* Header with Energy Quality Badge */}
      <div className="energy-intelligence-header">
        <div className="energy-header-main">
          <h3>Energy Intelligence</h3>
          <div className={`energy-data-quality ${energyAnalysis.dataQuality.level}`}>
            <FaFire className="quality-icon" />
            <span>{energyAnalysis.dataQuality.label}</span>
            <span className="quality-days">({energyAnalysis.dataQuality.days} days)</span>
          </div>
        </div>
        <div className="energy-header-subtitle">
          Personalized insights from your energy tracking patterns
        </div>
      </div>

      {/* Current Energy Average Display */}
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

      {/* Insight Selector Tabs */}
      <div className="insight-selector-tabs">
        {insights.map(insight => (
          <button
            key={insight.id}
            className={`insight-tab ${selectedInsight === insight.id ? 'active' : ''}`}
            onClick={() => setSelectedInsight(insight.id)}
          >
            <span className="tab-icon">{insight.icon}</span>
            <span className="tab-title">{insight.title}</span>
          </button>
        ))}
      </div>

      {/* Selected Insight Display */}
      <div className="selected-insight-display">
        {selectedInsight === 'patterns' && (
          <PatternInsightCard data={energyAnalysis.personalPatterns} />
        )}
        {selectedInsight === 'phase' && (
          <PhaseInsightCard data={energyAnalysis.phaseIntelligence} />
        )}
        {selectedInsight === 'risk' && (
          <RiskInsightCard data={energyAnalysis.riskPrediction} />
        )}
        {selectedInsight === 'optimization' && (
          <OptimizationInsightCard data={energyAnalysis.optimizationInsights} />
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
          
          <button className="energy-upgrade-btn" onClick={onUpgradeClick}>
            <FaStar />
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
};

// Individual Insight Card Components
const PatternInsightCard = ({ data }) => (
  <div className="insight-content-card patterns">
    <div className="insight-card-header">
      <FaChartLine className="insight-icon" />
      <span>Your Personal Energy Patterns</span>
    </div>
    <div className="insight-main-content">
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
    </div>
  </div>
);

const PhaseInsightCard = ({ data }) => (
  <div className="insight-content-card phase">
    <div className="insight-card-header">
      <FaBrain className="insight-icon" />
      <span>{data.phase} Phase Intelligence</span>
    </div>
    <div className="insight-main-content">
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
    </div>
  </div>
);

const RiskInsightCard = ({ data }) => (
  <div className="insight-content-card risk">
    <div className="insight-card-header">
      <FaShieldAlt className="insight-icon" />
      <span>Smart Risk Prediction</span>
    </div>
    <div className="insight-main-content">
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
    </div>
  </div>
);

const OptimizationInsightCard = ({ data }) => (
  <div className="insight-content-card optimization">
    <div className="insight-card-header">
      <FaRocket className="insight-icon" />
      <span>Energy Optimization</span>
    </div>
    <div className="insight-main-content">
      {data.status === 'insufficient' ? (
        <div className="insufficient-data">
          <FaInfoCircle className="info-icon" />
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
    </div>
  </div>
);

export default EnergyIntelligenceSection;