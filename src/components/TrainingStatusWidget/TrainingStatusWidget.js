// src/components/TrainingStatusWidget/TrainingStatusWidget.js
// Dashboard widget showing ML training status and quick access

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TrainingStatusWidget.css';
import mlPredictionService from '../../services/MLPredictionService';
import dataPreprocessor from '../../utils/DataPreprocessor';

function TrainingStatusWidget({ userData }) {
  const navigate = useNavigate();
  const [modelInfo, setModelInfo] = useState(null);
  const [dataQuality, setDataQuality] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, [userData]);

  const loadStatus = async () => {
    try {
      // Initialize ML service if needed
      await mlPredictionService.initialize();
      
      // Get model info
      const info = mlPredictionService.getModelInfo();
      setModelInfo(info);
      
      // Check data quality
      const quality = dataPreprocessor.getDataQualityReport(userData);
      setDataQuality(quality);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading training status:', error);
      setIsLoading(false);
    }
  };

  const handleTrainClick = () => {
    navigate('/ml-training');
  };

  if (isLoading || !dataQuality) {
    return null; // Don't show widget while loading
  }

  // Don't show if user has very little data
  if (dataQuality.benefitDays < 10) {
    return null;
  }

  // Model is trained and working
  if (modelInfo?.isReady) {
    return (
      <div className="training-status-widget trained">
        <div className="widget-header">
          <div className="widget-icon">🧠</div>
          <div className="widget-title">
            <h3>Neural Network Active</h3>
            <p className="widget-subtitle">Your ML model is trained and predicting</p>
          </div>
        </div>

        <div className="widget-stats">
          <div className="stat-item">
            <span className="stat-label">Accuracy</span>
            <span className="stat-value">{modelInfo.latestAccuracy || 'N/A'}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Last Trained</span>
            <span className="stat-value">
              {modelInfo.lastTrained 
                ? new Date(modelInfo.lastTrained).toLocaleDateString()
                : 'Unknown'}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Epochs</span>
            <span className="stat-value">{modelInfo.totalEpochs || 0}</span>
          </div>
        </div>

        <button className="widget-action-btn" onClick={handleTrainClick}>
          {modelInfo.needsRetraining ? '🔄 Retrain Model' : '⚙️ View Training'}
        </button>
      </div>
    );
  }

  // User has enough data but model not trained
  if (dataQuality.canTrain) {
    return (
      <div className="training-status-widget ready">
        <div className="widget-header">
          <div className="widget-icon">🚀</div>
          <div className="widget-title">
            <h3>Ready to Train ML Model</h3>
            <p className="widget-subtitle">
              You have {dataQuality.benefitDays} days of data - enough to train!
            </p>
          </div>
        </div>

        <div className="widget-info">
          <p>
            Train a neural network to predict urges based on your personal patterns. 
            Takes about 30-60 seconds.
          </p>
        </div>

        <button className="widget-action-btn primary" onClick={handleTrainClick}>
          🧠 Train Neural Network
        </button>
      </div>
    );
  }

  // User needs more data (10-19 days)
  return (
    <div className="training-status-widget progress">
      <div className="widget-header">
        <div className="widget-icon">📊</div>
        <div className="widget-title">
          <h3>Building Training Data</h3>
          <p className="widget-subtitle">
            {dataQuality.benefitDays} / 20 days tracked
          </p>
        </div>
      </div>

      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill"
          style={{ width: `${Math.min((dataQuality.benefitDays / 20) * 100, 100)}%` }}
        ></div>
      </div>

      <p className="progress-message">
        Keep tracking daily! You'll be able to train your ML model at 20 days.
      </p>
    </div>
  );
}

export default TrainingStatusWidget;