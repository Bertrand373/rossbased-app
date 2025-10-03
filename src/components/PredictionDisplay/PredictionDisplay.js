// src/components/PredictionDisplay/PredictionDisplay.js
// UPDATED: Changed to "AI Relapse Prediction" with static green microchip icon

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaMicrochip, FaChartLine, FaBell, FaWind, FaTint, FaDumbbell, FaOm, FaThumbsUp, FaThumbsDown, FaExclamationTriangle, FaLightbulb } from 'react-icons/fa';
import './PredictionDisplay.css';
import { usePrediction } from '../../hooks/usePrediction';
import notificationService from '../../services/NotificationService';
import mlPredictionService from '../../services/MLPredictionService';
import { getRiskLevel, formatTime } from '../../utils/predictionUtils';

function PredictionDisplay({ 
  mode = 'compact',
  userData,
  onFeedback = null
}) {
  const navigate = useNavigate();
  const { prediction, nextCheckTime, isLoading } = usePrediction(userData);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  React.useEffect(() => {
    if (mode !== 'compact') return;
    
    const checkPermission = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    };

    const interval = setInterval(checkPermission, 5000);
    return () => clearInterval(interval);
  }, [mode]);

  const handleEnableNotifications = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      setNotificationPermission('granted');
    }
  };

  const handleViewDetails = () => {
    navigate('/urge-prediction');
  };

  const handleInterventionClick = (interventionType) => {
    const interventionLog = {
      timestamp: new Date().toISOString(),
      type: interventionType,
      riskScore: prediction.riskScore,
      reason: prediction.reason,
      usedML: prediction.usedML
    };

    const existingLogs = JSON.parse(localStorage.getItem('intervention_logs') || '[]');
    existingLogs.push(interventionLog);
    localStorage.setItem('intervention_logs', JSON.stringify(existingLogs));

    navigate('/urge-toolkit', { state: { selectedTool: interventionType } });
  };

  const handleFeedback = async (wasHelpful) => {
    try {
      const feedback = {
        timestamp: new Date().toISOString(),
        riskScore: prediction.riskScore,
        userFeedback: wasHelpful ? 'helpful' : 'false_alarm',
        factors: prediction.factors,
        reason: prediction.reason,
        usedML: prediction.usedML
      };

      // NEW: Send feedback to ML service for model improvement
      if (prediction.usedML) {
        mlPredictionService.processFeedback(feedback);
      }

      const existingFeedback = JSON.parse(localStorage.getItem('prediction_feedback') || '[]');
      existingFeedback.push(feedback);
      localStorage.setItem('prediction_feedback', JSON.stringify(existingFeedback));

      setFeedbackSubmitted(true);

      if (onFeedback) {
        onFeedback(feedback);
      }

      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Error processing feedback:', error);
      setFeedbackSubmitted(true);
      setTimeout(() => navigate('/'), 2000);
    }
  };

  // COMPACT MODE
  if (mode === 'compact') {
    if (!prediction) {
      return null;
    }

    const riskLevel = getRiskLevel(prediction.riskScore);

    return (
      <div className="prediction-widget">
        <div className="prediction-widget-header">
          <div className="widget-title">
            <FaMicrochip style={{ fontSize: '1rem', color: 'var(--success)' }} />
            <span>AI Relapse Prediction</span>
          </div>
          {notificationPermission === 'granted' && (
            <span className="notification-status active">
              <FaCheckCircle style={{ fontSize: '0.75rem' }} />
              Active
            </span>
          )}
        </div>

        <div className="prediction-widget-content">
          <div className="risk-display">
            <div className="risk-score" style={{ color: riskLevel.color }}>
              {prediction.riskScore}%
            </div>
            <div 
              className="risk-badge" 
              style={{ 
                backgroundColor: riskLevel.bgColor,
                color: riskLevel.color,
                border: `1px solid ${riskLevel.color}40`
              }}
            >
              {riskLevel.label} RISK
            </div>
          </div>

          <div className="prediction-info">
            <div className="info-row">
              <span className="info-label">Next Check:</span>
              <span className="info-value">{formatTime(nextCheckTime)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Confidence:</span>
              <span className="info-value">{prediction.confidence}%</span>
            </div>
            {prediction.usedML && (
              <div className="info-row">
                <span className="info-label">Model:</span>
                <span className="info-value" style={{ color: '#22c55e' }}>
                  Trained <FaCheckCircle style={{ fontSize: '0.875rem', marginLeft: '4px' }} />
                </span>
              </div>
            )}
          </div>

          {prediction.riskScore >= 50 && (
            <div className="quick-reason">
              <FaLightbulb style={{ fontSize: '1rem', color: 'var(--primary)' }} />
              <span className="reason-text">{prediction.reason}</span>
            </div>
          )}

          <div className="widget-actions">
            {notificationPermission === 'unsupported' ? (
              <button 
                className="widget-btn view-details"
                onClick={handleViewDetails}
              >
                <FaChartLine style={{ fontSize: '0.875rem' }} />
                <span>View Analysis</span>
              </button>
            ) : notificationPermission !== 'granted' ? (
              <button 
                className="widget-btn enable-notifications"
                onClick={handleEnableNotifications}
              >
                <FaBell style={{ fontSize: '0.875rem' }} />
                <span>Enable Alerts</span>
              </button>
            ) : (
              <button 
                className="widget-btn view-details"
                onClick={handleViewDetails}
              >
                <FaChartLine style={{ fontSize: '0.875rem' }} />
                <span>View Analysis</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // FULL MODE
  if (isLoading) {
    return (
      <div className="urge-prediction-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Analyzing risk factors...</p>
        </div>
      </div>
    );
  }

  if (!prediction || prediction.riskScore < 40) {
    return (
      <div className="urge-prediction-container">
        <div className="low-risk-message">
          <FaCheckCircle style={{ fontSize: '4rem', color: 'var(--success)', marginBottom: 'var(--spacing-lg)' }} />
          <h2>You're in the Clear</h2>
          <p>Current urge risk: <strong>{prediction ? prediction.riskScore : 0}%</strong></p>
          <p className="subtext">
            {prediction?.usedML 
              ? 'AI shows low risk' 
              : 'No interventions needed'}
          </p>
          <button onClick={() => navigate('/')} className="back-button">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const riskLevel = getRiskLevel(prediction.riskScore);

  return (
    <div className="urge-prediction-container">
      {feedbackSubmitted ? (
        <div className="feedback-success">
          <FaCheckCircle style={{ fontSize: '4rem', color: 'var(--success)', marginBottom: 'var(--spacing-lg)' }} />
          <h2>Thank You!</h2>
          <p>Your feedback helps improve the AI system.</p>
          <p className="subtext">Redirecting to dashboard...</p>
        </div>
      ) : (
        <div className="prediction-card">
          <div className="prediction-header">
            <FaExclamationTriangle style={{ fontSize: '3rem', color: riskLevel.color, marginBottom: 'var(--spacing-sm)' }} />
            <h1>{riskLevel.label} URGE RISK DETECTED</h1>
          </div>

          <div className="risk-meter-section">
            <div className="risk-percentage" style={{ color: riskLevel.color }}>
              {prediction.riskScore}%
            </div>
            <div className="risk-bar-container">
              <div 
                className="risk-bar-fill" 
                style={{ 
                  width: `${prediction.riskScore}%`,
                  backgroundColor: riskLevel.color
                }}
              ></div>
            </div>
            <div className="risk-label" style={{ color: riskLevel.color }}>
              {riskLevel.label} RISK
            </div>
          </div>

          <div className="reason-section">
            <h3>Why this alert?</h3>
            <p className="reason-text">{prediction.reason}</p>
            
            {prediction.factors?.similarPastRelapse && (
              <div className="past-relapse-warning">
                <FaExclamationTriangle style={{ fontSize: '1.25rem' }} />
                <div>
                  <strong>Pattern Match:</strong> Similar to past relapse on day {prediction.factors.similarPastRelapse.days}
                </div>
              </div>
            )}
          </div>

          <div className="interventions-section">
            <h3>Recommended Actions</h3>
            <div className="intervention-grid">
              <button 
                className="intervention-card"
                onClick={() => handleInterventionClick('breathing')}
              >
                <FaWind style={{ fontSize: '2rem', color: 'var(--primary)' }} />
                <div className="intervention-content">
                  <div className="intervention-title">Breathing Exercise</div>
                  <div className="intervention-description">Calm your nervous system</div>
                </div>
                <span className="arrow">→</span>
              </button>

              <button 
                className="intervention-card"
                onClick={() => handleInterventionClick('coldshower')}
              >
                <FaTint style={{ fontSize: '2rem', color: 'var(--primary)' }} />
                <div className="intervention-content">
                  <div className="intervention-title">Cold Shower</div>
                  <div className="intervention-description">Reset your system</div>
                </div>
                <span className="arrow">→</span>
              </button>

              <button 
                className="intervention-card"
                onClick={() => handleInterventionClick('exercise')}
              >
                <FaDumbbell style={{ fontSize: '2rem', color: 'var(--primary)' }} />
                <div className="intervention-content">
                  <div className="intervention-title">Physical Exercise</div>
                  <div className="intervention-description">Channel the energy</div>
                </div>
                <span className="arrow">→</span>
              </button>

              <button 
                className="intervention-card"
                onClick={() => handleInterventionClick('meditation')}
              >
                <FaOm style={{ fontSize: '2rem', color: 'var(--primary)' }} />
                <div className="intervention-content">
                  <div className="intervention-title">Meditation</div>
                  <div className="intervention-description">Find your center</div>
                </div>
                <span className="arrow">→</span>
              </button>
            </div>
          </div>

          <div className="feedback-section">
            <h4>Was this prediction accurate?</h4>
            <p className="feedback-subtext">
              {prediction.usedML 
                ? 'Your feedback helps train the AI' 
                : 'Your feedback improves future predictions'}
            </p>
            <div className="feedback-buttons">
              <button 
                className="feedback-button helpful"
                onClick={() => handleFeedback(true)}
              >
                <FaThumbsUp style={{ fontSize: '0.875rem' }} />
                Yes, helpful
              </button>
              <button 
                className="feedback-button false-alarm"
                onClick={() => handleFeedback(false)}
              >
                <FaThumbsDown style={{ fontSize: '0.875rem' }} />
                False alarm
              </button>
            </div>
          </div>

          <div className="confidence-footer">
            <span className="confidence-label">Confidence:</span>
            <span className="confidence-value">{prediction.confidence}%</span>
            {prediction.usedML ? (
              <span className="accuracy-note">
                AI Model ({prediction.modelInfo?.totalEpochs || 0} epochs)
              </span>
            ) : (
              <span className="accuracy-note">Pattern analysis</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PredictionDisplay;