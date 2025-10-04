// src/components/MLWidget/MLWidget.js
// UPDATED: Clear "Relapse Risk Prediction" messaging throughout

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMicrochip, FaRocket, FaCheckCircle } from 'react-icons/fa';
import './MLWidget.css';
import mlPredictionService from '../../services/MLPredictionService';
import dataPreprocessor from '../../utils/DataPreprocessor';

function MLWidget({ userData }) {
  const navigate = useNavigate();
  const [modelInfo, setModelInfo] = useState(null);
  const [dataQuality, setDataQuality] = useState(null);
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
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading widget data:', error);
      setIsLoading(false);
    }
  };

  const handleNavigateToTraining = () => {
    navigate('/ml-training');
  };

  // Don't show widget if insufficient data
  if (isLoading || !dataQuality) {
    return null;
  }

  // Hide if user has perfect streak (no relapse history) or very little data
  if (dataQuality.benefitDays < 10 || !dataQuality.hasRelapseData) {
    return null;
  }

  // Hide when model is active (PredictionDisplay handles it)
  if (modelInfo?.isReady) {
    return null;
  }

  // STATE 1: Ready to Train (20+ days, has relapse data, model not trained)
  if (dataQuality.canTrain) {
    return (
      <div className="ml-widget ready-to-train">
        <div className="ml-widget-header">
          <div className="widget-title-section">
            <FaMicrochip className="widget-icon" />
            <div>
              <h3 className="widget-title">AI Relapse Risk Predictor Ready</h3>
              <p className="widget-subtitle">Learn your personal relapse patterns</p>
            </div>
          </div>
          <div className="ready-badge">
            <FaCheckCircle style={{ fontSize: '0.75rem' }} />
            <span>Ready</span>
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
            <span className="stat-label">Days Tracked</span>
            <span className="stat-value">{dataQuality.benefitDays}</span>
          </div>
        </div>

        <p className="widget-info-text">
          Train AI on your personal relapse patterns to get early warning alerts before high-risk moments. Your data stays private on your device.
        </p>

        <button className="ml-widget-btn primary" onClick={handleNavigateToTraining}>
          <FaRocket style={{ fontSize: '0.875rem' }} />
          Train Relapse Predictor
        </button>
      </div>
    );
  }

  // STATE 2: Building Data (10-19 days with relapse history)
  return (
    <div className="ml-widget building-data">
      <div className="ml-widget-header">
        <div className="widget-title-section">
          <FaMicrochip className="widget-icon" style={{ color: 'var(--primary)' }} />
          <div>
            <h3 className="widget-title">Building AI Training Data</h3>
            <p className="widget-subtitle">AI learns from your relapse patterns</p>
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
        {dataQuality.benefitDays} / 20 days tracked. At 20 days, train AI to predict your relapse risk and get early warnings.
      </p>
    </div>
  );
}

export default MLWidget;