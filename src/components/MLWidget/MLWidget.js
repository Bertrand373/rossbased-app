// src/components/MLWidget/MLWidget.js
// OPTION 3: Shows training status ONLY - hides when model is active
// PredictionDisplay handles all prediction display when model is trained

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBrain, FaRocket, FaExclamationTriangle } from 'react-icons/fa';
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

  // OPTION 3: Hide when model is active (PredictionDisplay handles it)
  if (modelInfo?.isReady) {
    return null;
  }

  // STATE 1: Ready to Train (20+ days, has relapse data, model not trained)
  if (dataQuality.canTrain) {
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

  // STATE 2: Building Data (10-19 days with relapse history)
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

export default MLWidget;