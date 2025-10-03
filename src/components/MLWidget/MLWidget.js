// src/components/MLWidget/MLWidget.js
// Unified AI widget - combines training status and predictions
// UPDATED: Changed "ML" to "AI" terminology

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBrain, FaRocket, FaChartLine, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import './MLWidget.css';
import mlPredictionService from '../../services/MLPredictionService';
import dataPreprocessor from '../../utils/DataPreprocessor';

function MLWidget({ userData }) {
  const navigate = useNavigate();
  const [modelInfo, setModelInfo] = useState(null);
  const [dataQuality, setDataQuality] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWidgetData();
  }, [userData]);

  const loadWidgetData = async () => {
    try {
      await mlPredictionService.initialize();
      
      const info = mlPredictionService.getModelInfo();
      setModelInfo(info);
      
      const quality = dataPreprocessor.getDataQualityReport(userData);
      setDataQuality(quality);
      
      // If model is trained, get current prediction
      if (info?.isReady) {
        const pred = await mlPredictionService.predict(userData);
        setPrediction(pred);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading widget data:', error);
      setIsLoading(false);
    }
  };

  const handleNavigateToTraining = () => {
    navigate('/ml-training');
  };

  const handleNavigateToPrediction = () => {
    navigate('/urge-prediction');
  };

  // Don't show widget if insufficient data
  if (isLoading || !dataQuality) {
    return null;
  }

  // Hide if user has perfect streak (no relapse history) or very little data
  if (dataQuality.benefitDays < 10 || !dataQuality.hasRelapseData) {
    return null;
  }

  // STATE 1: Ready to Train (20+ days, has relapse data, model not trained)
  if (dataQuality.canTrain && !modelInfo?.isReady) {
    return (
      <div className="ml-widget ready-to-train">
        <div className="ml-widget-header">
          <div className="widget-title-section">
            <FaBrain className="widget-icon" />
            <div>
              <h3 className="widget-title">AI Model Ready</h3>
              <p className="widget-subtitle">Train your personalized AI</p>
            </div>
          </div>
        </div>

        <div className="widget-stats-grid">
          <div className="widget-stat-item">
            <span className="stat-label">Data Quality</span>
            <span className="stat-value" style={{ color: 'var(--success)' }}>
              {dataQuality.qualityScore}%
            </span>
          </div>
          <div className="widget-stat-item">
            <span className="stat-label">Training Days</span>
            <span className="stat-value">{dataQuality.benefitDays}</span>
          </div>
        </div>

        <p className="widget-info-text">
          You have enough data to train an AI that learns your personal patterns.
        </p>

        <button className="ml-widget-btn primary" onClick={handleNavigateToTraining}>
          <FaRocket style={{ fontSize: '0.875rem' }} />
          Train AI Model
        </button>
      </div>
    );
  }

  // STATE 2: Model Active (trained and making predictions)
  if (modelInfo?.isReady && prediction) {
    const getRiskLevel = (score) => {
      if (score >= 70) return 'high';
      if (score >= 40) return 'moderate';
      return 'low';
    };

    const riskLevel = getRiskLevel(prediction.riskScore);
    const riskColor = riskLevel === 'high' ? 'var(--danger)' : 
                      riskLevel === 'moderate' ? 'var(--warning)' : 
                      'var(--success)';

    return (
      <div className="ml-widget model-active">
        <div className="ml-widget-header">
          <div className="widget-title-section">
            <FaChartLine className="widget-icon" style={{ color: 'var(--success)' }} />
            <div>
              <h3 className="widget-title">AI Predictions Active</h3>
              <p className="widget-subtitle">Neural network trained</p>
            </div>
          </div>
        </div>

        <div className="risk-display-section">
          <div className="risk-score-container">
            <div className="risk-score-large" style={{ color: riskColor }}>
              {prediction.riskScore}%
            </div>
            <div className="risk-label">Current Risk</div>
          </div>
          <div className="risk-badge" style={{ 
            backgroundColor: `${riskColor}15`,
            color: riskColor,
            border: `1px solid ${riskColor}40`
          }}>
            {riskLevel.toUpperCase()}
          </div>
        </div>

        <div className="model-stats-grid">
          <div className="model-stat">
            <span className="stat-label">Accuracy</span>
            <span className="stat-value">{modelInfo.latestAccuracy}%</span>
          </div>
          <div className="model-stat">
            <span className="stat-label">Last Trained</span>
            <span className="stat-value">
              {new Date(modelInfo.lastTrained).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="widget-actions">
          <button className="ml-widget-btn secondary" onClick={handleNavigateToPrediction}>
            <FaChartLine style={{ fontSize: '0.875rem' }} />
            View Details
          </button>
          <button className="ml-widget-btn tertiary" onClick={handleNavigateToTraining}>
            Retrain
          </button>
        </div>
      </div>
    );
  }

  // STATE 3: Building Data (10-19 days with relapse history)
  if (dataQuality.benefitDays >= 10 && dataQuality.benefitDays < 20 && dataQuality.hasRelapseData) {
    return (
      <div className="ml-widget building-data">
        <div className="ml-widget-header">
          <div className="widget-title-section">
            <FaExclamationTriangle className="widget-icon" style={{ color: 'var(--primary)' }} />
            <div>
              <h3 className="widget-title">Building Training Data</h3>
              <p className="widget-subtitle">{dataQuality.benefitDays} / 20 days tracked</p>
            </div>
          </div>
        </div>

        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill"
            style={{ width: `${(dataQuality.benefitDays / 20) * 100}%` }}
          />
        </div>

        <p className="widget-info-text">
          Keep tracking daily to unlock AI predictions at 20 days.
        </p>
      </div>
    );
  }

  return null;
}

export default MLWidget;