// src/components/UrgePrediction/UrgePrediction.js
// UPDATED: Now uses MLPredictionService with TensorFlow.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './UrgePrediction.css';
import mlPredictionService from '../../services/MLPredictionService';

function UrgePrediction() {
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);

  useEffect(() => {
    initializeAndPredict();
  }, []);

  const initializeAndPredict = async () => {
    try {
      // Initialize ML service
      await mlPredictionService.initialize();
      
      // Get model info
      const info = mlPredictionService.getModelInfo();
      setModelInfo(info);
      
      // Load current prediction
      await loadCurrentPrediction();
    } catch (error) {
      console.error('❌ Error initializing:', error);
      setLoading(false);
    }
  };

  const loadCurrentPrediction = async () => {
    try {
      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      if (!userData.currentStreak) {
        setLoading(false);
        return;
      }

      // Run ML prediction
      const result = await mlPredictionService.predict(userData);
      setPrediction(result);
      setLoading(false);
    } catch (error) {
      console.error('❌ Prediction error:', error);
      setLoading(false);
    }
  };

  const handleFeedback = async (wasHelpful) => {
    if (!prediction) return;

    try {
      // Record feedback for ML training
      const feedback = {
        timestamp: new Date().toISOString(),
        predictedRisk: prediction.riskScore,
        userFeedback: wasHelpful ? 'helpful' : 'false_alarm',
        factors: prediction.factors,
        reason: prediction.reason,
        usedML: prediction.usedML
      };

      // Save to localStorage for future ML retraining
      const existingFeedback = JSON.parse(localStorage.getItem('prediction_feedback') || '[]');
      existingFeedback.push(feedback);
      localStorage.setItem('prediction_feedback', JSON.stringify(existingFeedback));

      console.log('✅ Feedback recorded for ML improvement');

      setFeedbackSubmitted(true);

      // Show thank you message then redirect
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('❌ Error processing feedback:', error);
      setFeedbackSubmitted(true);
      setTimeout(() => navigate('/'), 2000);
    }
  };

  const handleInterventionClick = (interventionType) => {
    // Track that intervention was started
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

    // Navigate to UrgeToolkit with pre-selected tool
    navigate('/urge-toolkit', { state: { selectedTool: interventionType } });
  };

  const handleViewDetails = () => {
    // Create detailed analysis
    const details = {
      riskScore: prediction.riskScore,
      confidence: prediction.confidence,
      usedML: prediction.usedML,
      factors: prediction.factors,
      reason: prediction.reason,
      modelInfo: prediction.modelInfo
    };

    // Show detailed breakdown
    const detailsText = `
🧠 RISK ANALYSIS DETAILS
━━━━━━━━━━━━━━━━━━━━━━

Risk Score: ${prediction.riskScore}%
Confidence: ${prediction.confidence}%
Prediction Type: ${prediction.usedML ? 'Neural Network' : 'Rule-Based'}

📊 FACTORS ANALYZED:
${JSON.stringify(prediction.factors, null, 2)}

💡 REASON:
${prediction.reason}

${prediction.modelInfo ? `
🤖 MODEL INFO:
Last Trained: ${new Date(prediction.modelInfo.lastTrained).toLocaleString()}
Training Epochs: ${prediction.modelInfo.totalEpochs}
` : ''}
    `;

    alert(detailsText);
  };

  if (loading) {
    return (
      <div className="urge-prediction-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Analyzing risk factors with neural network...</p>
        </div>
      </div>
    );
  }

  if (!prediction || prediction.riskScore < 40) {
    return (
      <div className="urge-prediction-container">
        <div className="low-risk-message">
          <div className="success-icon">✓</div>
          <h2>You're in the Clear</h2>
          <p>Current urge risk: <strong>{prediction ? prediction.riskScore : 0}%</strong></p>
          <p className="subtext">
            {prediction?.usedML 
              ? 'Neural network analysis shows low risk' 
              : 'No interventions needed right now'}
          </p>
          <button onClick={() => navigate('/')} className="back-button">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getRiskLevel = (score) => {
    if (score >= 80) return { label: 'CRITICAL', color: '#ef4444' };
    if (score >= 70) return { label: 'HIGH', color: '#f97316' };
    if (score >= 50) return { label: 'MODERATE', color: '#eab308' };
    return { label: 'LOW', color: '#22c55e' };
  };

  const riskLevel = getRiskLevel(prediction.riskScore);

  return (
    <div className="urge-prediction-container">
      {feedbackSubmitted ? (
        <div className="feedback-success">
          <div className="success-icon">✓</div>
          <h2>Thank You!</h2>
          <p>Your feedback helps improve the neural network.</p>
          <p className="subtext">Redirecting to dashboard...</p>
        </div>
      ) : (
        <div className="prediction-card">
          <div className="prediction-header">
            <div className="warning-icon">⚠️</div>
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
            
            {prediction.similarPastRelapse && (
              <div className="past-relapse-warning">
                <span className="warning-badge">⚡</span>
                <span>Similar pattern to your Day {prediction.similarPastRelapse.day} relapse</span>
              </div>
            )}
          </div>

          <div className="interventions-section">
            <h3>Immediate Actions</h3>
            
            <button 
              className="intervention-button breathing"
              onClick={() => handleInterventionClick('breathing')}
            >
              <span className="intervention-icon">💨</span>
              <div className="intervention-text">
                <div className="intervention-title">Start Breathing Exercise</div>
                <div className="intervention-subtitle">2 minutes • Proven to reduce urges</div>
              </div>
              <span className="arrow">→</span>
            </button>

            <button 
              className="intervention-button physical"
              onClick={() => handleInterventionClick('physical')}
            >
              <span className="intervention-icon">🏃</span>
              <div className="intervention-text">
                <div className="intervention-title">Physical Reset Protocol</div>
                <div className="intervention-subtitle">5 minutes • Cold water + movement</div>
              </div>
              <span className="arrow">→</span>
            </button>

            <button 
              className="intervention-button mental"
              onClick={() => handleInterventionClick('mental')}
            >
              <span className="intervention-icon">🧠</span>
              <div className="intervention-text">
                <div className="intervention-title">Mental Reframe Exercise</div>
                <div className="intervention-subtitle">3 minutes • Redirect thoughts</div>
              </div>
              <span className="arrow">→</span>
            </button>

            <button 
              className="intervention-button details"
              onClick={handleViewDetails}
            >
              <span className="intervention-icon">📊</span>
              <div className="intervention-text">
                <div className="intervention-title">View Risk Details</div>
                <div className="intervention-subtitle">
                  {prediction.usedML ? 'Neural network analysis' : 'See what triggered this alert'}
                </div>
              </div>
              <span className="arrow">→</span>
            </button>
          </div>

          <div className="feedback-section">
            <h4>Was this prediction accurate?</h4>
            <p className="feedback-subtext">
              {prediction.usedML 
                ? 'Your feedback helps train the neural network' 
                : 'Your feedback helps improve future predictions'}
            </p>
            <div className="feedback-buttons">
              <button 
                className="feedback-button helpful"
                onClick={() => handleFeedback(true)}
              >
                <span>👍</span> Yes, this was helpful
              </button>
              <button 
                className="feedback-button false-alarm"
                onClick={() => handleFeedback(false)}
              >
                <span>👎</span> False alarm
              </button>
            </div>
          </div>

          <div className="confidence-footer">
            <span className="confidence-label">Confidence:</span>
            <span className="confidence-value">{prediction.confidence}%</span>
            {prediction.usedML ? (
              <span className="accuracy-note">
                Neural Network ({modelInfo?.totalEpochs || 0} epochs trained)
              </span>
            ) : (
              <span className="accuracy-note">
                Based on {prediction.dataPoints || 0} data points
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UrgePrediction;