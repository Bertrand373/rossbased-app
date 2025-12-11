// src/components/MLTraining/MLTraining.js
// UPDATED: Day 1 Value - Always shows useful insights, never "Not Enough Data"

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaBrain, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaChartLine, 
  FaRocket, 
  FaArrowLeft, 
  FaSyncAlt,
  FaTimes,
  FaCheck,
  FaShieldAlt,
  FaLightbulb,
  FaClock,
  FaCalendarAlt
} from 'react-icons/fa';
import './MLTraining.css';
import mlPredictionService from '../../services/MLPredictionService';
import dataPreprocessor from '../../utils/DataPreprocessor';

function MLTraining() {
  const navigate = useNavigate();
  
  const [userData, setUserData] = useState(null);
  const [dataQuality, setDataQuality] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(null);
  const [trainingComplete, setTrainingComplete] = useState(false);
  const [trainingResults, setTrainingResults] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserDataAndCheck();
  }, []);

  const loadUserDataAndCheck = async () => {
    try {
      const data = JSON.parse(localStorage.getItem('userData') || '{}');
      setUserData(data);

      await mlPredictionService.initialize();

      const info = mlPredictionService.getModelInfo();
      setModelInfo(info);

      const quality = dataPreprocessor.getDataQualityReport(data);
      setDataQuality(quality);

      console.log('Data Quality Report:', quality);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    }
  };

  const handleStartTraining = async () => {
    if (!userData || !dataQuality?.canTrain) {
      setError('Insufficient data for training');
      return;
    }

    setIsTraining(true);
    setError(null);
    setTrainingComplete(false);

    try {
      const result = await mlPredictionService.train(userData, (progress) => {
        setTrainingProgress(progress);
      });

      if (result.success) {
        setTrainingResults(result);
        setTrainingComplete(true);
        
        const info = mlPredictionService.getModelInfo();
        setModelInfo(info);

        console.log('Training completed successfully!');
      } else {
        setError(result.message || 'Training failed');
      }
    } catch (err) {
      console.error('Training error:', err);
      setError('Training failed: ' + err.message);
    } finally {
      setIsTraining(false);
    }
  };

  const handleRetrain = () => {
    setTrainingComplete(false);
    setTrainingResults(null);
    handleStartTraining();
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  // ============================================================
  // EARLY INSIGHTS - What we can tell users before full AI training
  // ============================================================
  
  const getEarlyInsights = () => {
    const daysTracked = dataQuality?.benefitDays || 1;
    const currentDay = dataQuality?.currentStreak || 1;
    
    // Phase-based insights from SR research
    const getPhaseInsight = () => {
      if (currentDay <= 7) {
        return {
          phase: 'Foundation Phase',
          insight: 'Days 1-7 are about breaking the cycle. Urges are frequent but short-lived.',
          riskWindow: 'Evenings and weekends typically show highest urge frequency.',
          tip: 'Keep busy during idle hours. Physical activity helps redirect energy.'
        };
      } else if (currentDay <= 14) {
        return {
          phase: 'Adaptation Phase', 
          insight: 'Days 8-14 often bring stronger urges as your brain recalibrates.',
          riskWindow: 'Many report peak urge intensity around days 10-14.',
          tip: 'This is the hardest stretch. Use the crisis toolkit when needed.'
        };
      } else if (currentDay <= 30) {
        return {
          phase: 'Stabilization Phase',
          insight: 'Days 15-30: Benefits start becoming noticeable. Urges typically decrease.',
          riskWindow: 'Overconfidence can be a trigger. Stay vigilant.',
          tip: 'Track your benefits daily—seeing progress reinforces commitment.'
        };
      } else if (currentDay <= 60) {
        return {
          phase: 'Emergence Phase',
          insight: 'Days 31-60: Significant changes often appear—energy, clarity, presence.',
          riskWindow: 'Success in other areas can paradoxically trigger complacency.',
          tip: 'Channel your energy into your goals. This is when compound growth begins.'
        };
      } else {
        return {
          phase: 'Power Phase',
          insight: 'Days 60+: You\'re operating at a different frequency now.',
          riskWindow: 'Long streaks can create a false sense of invincibility.',
          tip: 'Stay humble, stay disciplined. The practice becomes identity.'
        };
      }
    };
    
    // Time-based risk patterns (general SR research)
    const getTimePatterns = () => {
      return [
        { time: 'Late Night (10pm-2am)', risk: 'High', reason: 'Willpower depleted, isolation' },
        { time: 'Weekend Mornings', risk: 'Medium', reason: 'Unstructured time, relaxed state' },
        { time: 'After Stressful Events', risk: 'High', reason: 'Seeking dopamine relief' }
      ];
    };
    
    return {
      phase: getPhaseInsight(),
      timePatterns: getTimePatterns(),
      daysTracked,
      currentDay,
      daysUntilPersonalized: Math.max(0, 20 - daysTracked)
    };
  };

  // Loading state
  if (!userData || !dataQuality) {
    return (
      <div className="ml-training-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading training data...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // EARLY INSIGHTS STATE (Pre-20 days) - Always show something useful
  // ============================================================
  if (!dataQuality.canTrain) {
    const insights = getEarlyInsights();
    
    return (
      <div className="ml-training-container">
        <div className="training-card">
          <div className="standalone-header">
            <h1>AI Insights</h1>
          </div>

          {/* Current Phase Insight */}
          <div className="early-insight-card phase-card">
            <div className="insight-header">
              <FaLightbulb className="insight-icon" />
              <div className="insight-title-group">
                <h3>{insights.phase.phase}</h3>
                <span className="insight-day">Day {insights.currentDay}</span>
              </div>
            </div>
            <p className="insight-text">{insights.phase.insight}</p>
            <div className="insight-detail">
              <FaExclamationTriangle className="detail-icon warning" />
              <span>{insights.phase.riskWindow}</span>
            </div>
            <div className="insight-tip">
              <strong>Tip:</strong> {insights.phase.tip}
            </div>
          </div>

          {/* Time-Based Risk Patterns */}
          <div className="early-insight-card patterns-card">
            <div className="insight-header">
              <FaClock className="insight-icon" />
              <h3>Common Risk Windows</h3>
            </div>
            <p className="insight-subtext">Based on SR research and community patterns</p>
            
            <div className="time-patterns">
              {insights.timePatterns.map((pattern, index) => (
                <div key={index} className="time-pattern-item">
                  <div className="pattern-time">{pattern.time}</div>
                  <div className="pattern-info">
                    <span className={`pattern-risk ${pattern.risk.toLowerCase()}`}>
                      {pattern.risk} Risk
                    </span>
                    <span className="pattern-reason">{pattern.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Personalization Progress */}
          <div className="early-insight-card progress-card">
            <div className="insight-header">
              <FaBrain className="insight-icon gold" />
              <h3>Personalized AI Unlocking</h3>
            </div>
            <p className="insight-subtext">
              The AI is learning your unique patterns. In {insights.daysUntilPersonalized} more days of tracking, 
              it will predict <em>your specific</em> high-risk moments.
            </p>
            
            <div className="data-progress">
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${Math.min((insights.daysTracked / 20) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="progress-text">
                {insights.daysTracked} / 20 days tracked
              </p>
            </div>

            <div className="requirements-list">
              <h4>What the AI will learn:</h4>
              <div className="requirement-item">
                <span className={insights.daysTracked >= 20 ? 'check' : 'pending'}>
                  {insights.daysTracked >= 20 ? <FaCheck /> : <FaCalendarAlt />}
                </span>
                <span>Your personal high-risk days and times</span>
              </div>
              <div className="requirement-item">
                <span className={dataQuality?.hasRelapseData ? 'check' : 'pending'}>
                  {dataQuality?.hasRelapseData ? <FaCheck /> : <FaCalendarAlt />}
                </span>
                <span>Patterns that preceded past relapses</span>
              </div>
              <div className="requirement-item">
                <span className={dataQuality?.hasEmotionalData ? 'check' : 'pending'}>
                  {dataQuality?.hasEmotionalData ? <FaCheck /> : <FaCalendarAlt />}
                </span>
                <span>Emotional states that correlate with risk</span>
              </div>
            </div>
          </div>

          <div className="privacy-note">
            <FaShieldAlt style={{ fontSize: '1rem', color: 'var(--success)' }} />
            <span>All analysis happens on your device. Nothing is sent to any server.</span>
          </div>

          <div className="action-buttons">
            <button className="primary-button" onClick={handleBackToDashboard}>
              <FaArrowLeft style={{ fontSize: '0.875rem' }} />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Model already trained - show success state
  if (modelInfo?.isReady && !isTraining && !trainingComplete) {
    return (
      <div className="ml-training-container">
        <div className="training-card">
          <div className="standalone-header">
            <h1>AI Relapse Risk Predictor</h1>
          </div>

          <div className="training-complete-section">
            <FaCheckCircle className="section-icon success" />
            <h2>AI Model Active</h2>
            <p className="message">
              Your personalized AI is trained and actively monitoring your patterns. 
              When it detects patterns similar to those before past relapses, you'll get an early warning alert so you can take action before a high-risk moment.
            </p>

            <div className="model-stats">
              <div className="stat-item">
                <span className="stat-value">{modelInfo.samples || '—'}</span>
                <span className="stat-label">Data Points Analyzed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{modelInfo.accuracy ? `${(modelInfo.accuracy * 100).toFixed(0)}%` : '—'}</span>
                <span className="stat-label">Pattern Accuracy</span>
              </div>
            </div>

            <div className="privacy-note">
              <FaShieldAlt style={{ fontSize: '1rem', color: 'var(--success)' }} />
              <span>Your data stays private on your device. Nothing is sent to any server.</span>
            </div>

            <div className="action-buttons">
              <button className="primary-button" onClick={handleBackToDashboard}>
                <FaCheckCircle style={{ fontSize: '0.875rem' }} />
                Start Using Predictor
              </button>
              <button className="secondary-button" onClick={handleRetrain}>
                <FaSyncAlt style={{ fontSize: '0.875rem' }} />
                Retrain Model
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Training in progress state
  if (isTraining && trainingProgress) {
    const progressPercent = trainingProgress.epoch 
      ? Math.round((trainingProgress.epoch / trainingProgress.totalEpochs) * 100) 
      : 0;

    return (
      <div className="ml-training-container">
        <div className="training-card">
          <div className="training-in-progress">
            <FaBrain className="section-icon primary pulse" />
            <h1>Training Relapse Predictor...</h1>
            <p className="training-subtitle">
              {trainingProgress.message || 'Analyzing your relapse patterns...'}
            </p>

            <div className="progress-section">
              <div className="progress-bar-container large">
                <div 
                  className="progress-bar-fill animated"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <p className="progress-label">
                Training round {trainingProgress.epoch || 0} of {trainingProgress.totalEpochs || 50}
              </p>
            </div>

            {trainingProgress.accuracy && (
              <div className="metrics-grid">
                <div className="metric-item">
                  <span className="metric-label">Loss:</span>
                  <span className="metric-value">
                    {trainingProgress.loss?.toFixed(4) || 'N/A'}
                  </span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Accuracy:</span>
                  <span className="metric-value">
                    {trainingProgress.accuracy?.toFixed(1) || 'N/A'}%
                  </span>
                </div>
                {trainingProgress.valLoss && (
                  <div className="metric-item">
                    <span className="metric-label">Validation Loss:</span>
                    <span className="metric-value">
                      {trainingProgress.valLoss?.toFixed(4)}
                    </span>
                  </div>
                )}
                {trainingProgress.valAccuracy && (
                  <div className="metric-item">
                    <span className="metric-label">Validation Accuracy:</span>
                    <span className="metric-value">
                      {trainingProgress.valAccuracy?.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="info-box">
              <p>This usually takes 30-60 seconds. Please don't close this page.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Training complete state
  if (trainingComplete && trainingResults) {
    return (
      <div className="ml-training-container">
        <div className="training-card">
          <div className="training-complete-section">
            <FaCheckCircle className="section-icon success" />
            <h1>Relapse Predictor Active!</h1>
            <p className="success-message">
              Your AI model is now monitoring for relapse risk patterns
            </p>

            <div className="results-grid">
              <div className="result-card">
                <div className="result-label">Model Accuracy</div>
                <div className="result-value success">
                  {trainingResults.finalAccuracy ? (trainingResults.finalAccuracy * 100).toFixed(1) : trainingResults.accuracy?.toFixed(1)}%
                </div>
              </div>

              <div className="result-card">
                <div className="result-label">Data Points</div>
                <div className="result-value primary">
                  {trainingResults.samples || trainingResults.trainingExamples || '—'}
                </div>
              </div>
            </div>

            <div className="info-box">
              <p>
                <strong>What happens now:</strong> The AI continuously monitors your benefit tracking data. When it detects patterns similar to those before past relapses, you'll get an early warning alert so you can take action before a high-risk moment.
              </p>
            </div>

            <div className="privacy-note">
              <FaShieldAlt style={{ fontSize: '1rem', color: 'var(--success)' }} />
              <span>Your data stays private on your device. Nothing is sent to any server.</span>
            </div>

            <div className="action-buttons">
              <button className="primary-button" onClick={handleBackToDashboard}>
                <FaCheckCircle style={{ fontSize: '0.875rem' }} />
                Start Using Predictor
              </button>
              <button className="secondary-button" onClick={handleRetrain}>
                <FaSyncAlt style={{ fontSize: '0.875rem' }} />
                Retrain Model
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Ready to train state (has enough data, model not trained)
  return (
    <div className="ml-training-container">
      <div className="training-card">
        <div className="standalone-header">
          <h1>AI Relapse Risk Predictor</h1>
        </div>

        <div className="ml-training-banner">
          <div className="ml-training-helmet-container">
            <img 
              className="ml-training-helmet" 
              src="/helmet.png" 
              alt="AI Predictor" 
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'block';
              }}
            />
            <div className="ml-training-helmet-fallback" style={{ display: 'none' }}>
              🛡️
            </div>
          </div>
          
          <div className="ml-training-content">
            <h4 className="ml-training-title">Ready to Train</h4>
            <p className="ml-training-description">
              You have enough data for the AI to learn your personal patterns. Once trained, it will predict when you're at high risk and alert you before vulnerable moments.
            </p>
          </div>
        </div>

        <div className="compact-stats-grid">
          <div className="compact-stat-card">
            <div className="compact-stat-value" style={{ 
              color: dataQuality.qualityScore >= 80 ? 'var(--success)' : 
                     dataQuality.qualityScore >= 60 ? 'var(--warning)' : 
                     'var(--danger)'
            }}>
              {dataQuality.qualityScore}
            </div>
            <div className="compact-stat-label">Data Quality Score</div>
          </div>

          <div className="compact-stat-card">
            <div className="compact-stat-value">{dataQuality.benefitDays}</div>
            <div className="compact-stat-label">Benefit Days Tracked</div>
          </div>

          <div className="compact-stat-card">
            <div className="compact-stat-value">{dataQuality.relapseCount}</div>
            <div className="compact-stat-label">Past Relapses</div>
          </div>

          <div className="compact-stat-card">
            <div className="compact-stat-value">{dataQuality.currentStreak}</div>
            <div className="compact-stat-label">Current Streak</div>
          </div>
        </div>

        <p className="recommendation-text">{dataQuality.recommendation}</p>

        {modelInfo?.isReady && (
          <div className="existing-model-section">
            <h3>
              <FaCheckCircle style={{ fontSize: '0.875rem', marginRight: '8px', color: 'var(--success)' }} />
              Existing Model
            </h3>
            <div className="model-info-grid">
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className="info-value" style={{ color: 'var(--success)' }}>
                  Active
                </span>
              </div>
              {modelInfo.lastTrained && (
                <div className="info-item">
                  <span className="info-label">Last Trained:</span>
                  <span className="info-value">
                    {new Date(modelInfo.lastTrained).toLocaleDateString()}
                  </span>
                </div>
              )}
              {modelInfo.totalEpochs > 0 && (
                <div className="info-item">
                  <span className="info-label">Learning Cycles:</span>
                  <span className="info-value">{modelInfo.totalEpochs}</span>
                </div>
              )}
              {modelInfo.trainingAccuracy && (
                <div className="info-item">
                  <span className="info-label">Training Accuracy:</span>
                  <span className="info-value">{modelInfo.trainingAccuracy}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="error-box">
            <FaExclamationTriangle style={{ fontSize: '1.25rem' }} />
            <span>{error}</span>
          </div>
        )}

        <div className="action-buttons">
          <button 
            className="primary-button"
            onClick={handleStartTraining}
            disabled={isTraining}
          >
            {modelInfo?.isReady ? (
              <>
                <FaSyncAlt style={{ fontSize: '0.875rem' }} />
                Retrain Model
              </>
            ) : (
              <>
                <FaRocket style={{ fontSize: '0.875rem' }} />
                Train Relapse Predictor
              </>
            )}
          </button>
          <button className="secondary-button" onClick={handleBackToDashboard}>
            <FaArrowLeft style={{ fontSize: '0.875rem' }} />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default MLTraining;