// src/components/MLTraining/MLTraining.js
// REFINED: Font Awesome icons, elegant design, no emojis

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaBrain, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaChartLine, 
  FaDatabase, 
  FaRocket, 
  FaArrowLeft, 
  FaRedo,
  FaTimes,
  FaCheck
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

  // Insufficient data state
  if (!dataQuality.canTrain) {
    return (
      <div className="ml-training-container">
        <div className="training-card">
          <div className="header">
            <h1>ML Training Center</h1>
            <p className="subtitle">Train your personalized neural network</p>
          </div>

          <div className="insufficient-data-section">
            <FaExclamationTriangle className="section-icon warning" />
            <h2>Not Enough Data Yet</h2>
            <p className="message">
              The neural network needs at least 20 days of benefit tracking data to learn patterns.
            </p>

            <div className="data-progress">
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${(dataQuality.benefitDays / 20) * 100}%` }}
                ></div>
              </div>
              <p className="progress-text">
                {dataQuality.benefitDays} / 20 days tracked
              </p>
            </div>

            <div className="requirements-list">
              <h3>Training Requirements:</h3>
              <div className="requirement-item">
                <span className={dataQuality.benefitDays >= 20 ? 'check' : 'cross'}>
                  {dataQuality.benefitDays >= 20 ? <FaCheck /> : <FaTimes />}
                </span>
                <span>20+ days of benefit tracking</span>
              </div>
              <div className="requirement-item">
                <span className={dataQuality.hasRelapseData ? 'check' : 'cross'}>
                  {dataQuality.hasRelapseData ? <FaCheck /> : <FaTimes />}
                </span>
                <span>At least 1 relapse in history (for learning)</span>
              </div>
              <div className="requirement-item">
                <span className={dataQuality.hasEmotionalData ? 'check' : 'cross'}>
                  {dataQuality.hasEmotionalData ? <FaCheck /> : <FaTimes />}
                </span>
                <span>Emotional tracking data (optional)</span>
              </div>
            </div>

            <p className="recommendation">{dataQuality.recommendation}</p>

            <button className="back-button" onClick={handleBackToDashboard}>
              <FaArrowLeft style={{ fontSize: '0.875rem' }} />
              Back to Dashboard
            </button>
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
            <h1>Training Complete!</h1>
            <p className="success-message">
              Your neural network has been trained successfully
            </p>

            <div className="results-grid">
              <div className="result-card">
                <div className="result-label">Accuracy</div>
                <div className="result-value success">
                  {trainingResults.accuracy.toFixed(1)}%
                </div>
              </div>

              <div className="result-card">
                <div className="result-label">Validation Accuracy</div>
                <div className="result-value primary">
                  {trainingResults.valAccuracy?.toFixed(1) || 'N/A'}%
                </div>
              </div>

              <div className="result-card">
                <div className="result-label">Training Time</div>
                <div className="result-value">
                  {trainingResults.trainingTime}s
                </div>
              </div>

              <div className="result-card">
                <div className="result-label">Training Examples</div>
                <div className="result-value">
                  {trainingResults.trainingExamples}
                </div>
              </div>
            </div>

            <div className="info-box">
              <p>
                Your model is now active and will be used for all urge predictions. 
                The neural network will automatically improve as you provide feedback.
              </p>
            </div>

            <div className="action-buttons">
              <button className="primary-button" onClick={handleBackToDashboard}>
                <FaCheckCircle style={{ fontSize: '0.875rem' }} />
                Start Using Model
              </button>
              <button className="secondary-button" onClick={handleRetrain}>
                <FaRedo style={{ fontSize: '0.875rem' }} />
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
      ? (trainingProgress.epoch / trainingProgress.totalEpochs) * 100 
      : 0;

    return (
      <div className="ml-training-container">
        <div className="training-card">
          <div className="training-in-progress">
            <FaBrain className="section-icon primary pulse" />
            <h1>Training Neural Network...</h1>
            <p className="training-subtitle">
              {trainingProgress.message || 'Processing data...'}
            </p>

            <div className="progress-section">
              <div className="progress-bar-container large">
                <div 
                  className="progress-bar-fill animated"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <p className="progress-label">
                Epoch {trainingProgress.epoch || 0} / {trainingProgress.totalEpochs || 50}
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
                    <span className="metric-label">Val Loss:</span>
                    <span className="metric-value">
                      {trainingProgress.valLoss?.toFixed(4)}
                    </span>
                  </div>
                )}
                {trainingProgress.valAccuracy && (
                  <div className="metric-item">
                    <span className="metric-label">Val Accuracy:</span>
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

  // Ready to train state
  return (
    <div className="ml-training-container">
      <div className="training-card">
        <div className="header">
          <h1>ML Training Center</h1>
          <p className="subtitle">Train your personalized neural network</p>
        </div>

        {error && (
          <div className="error-box">
            <FaExclamationTriangle style={{ fontSize: '1.25rem' }} />
            <span>{error}</span>
          </div>
        )}

        <div className="data-quality-section">
          <h2>Your Data Quality</h2>
          <div className="quality-score-container">
            <div className={`quality-score ${
              dataQuality.qualityScore >= 80 ? 'success' : 
              dataQuality.qualityScore >= 60 ? 'warning' : 
              'danger'
            }`}>
              {dataQuality.qualityScore}
            </div>
            <div className="quality-label">Quality Score</div>
          </div>

          <div className="data-stats">
            <div className="stat-item">
              <span className="stat-value">{dataQuality.benefitDays}</span>
              <span className="stat-label">Benefit Days</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{dataQuality.relapseCount}</span>
              <span className="stat-label">Relapse History</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{dataQuality.emotionalDays}</span>
              <span className="stat-label">Emotional Days</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{dataQuality.currentStreak}</span>
              <span className="stat-label">Current Streak</span>
            </div>
          </div>

          <p className="recommendation">{dataQuality.recommendation}</p>
        </div>

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
                  Trained
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
                  <span className="info-label">Total Epochs:</span>
                  <span className="info-value">{modelInfo.totalEpochs}</span>
                </div>
              )}
              {modelInfo.latestAccuracy && (
                <div className="info-item">
                  <span className="info-label">Accuracy:</span>
                  <span className="info-value">{modelInfo.latestAccuracy}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="training-info-section">
          <h3>
            <FaDatabase style={{ fontSize: '0.875rem', marginRight: '8px' }} />
            What happens during training?
          </h3>
          <ul className="info-list">
            <li>Analyzes your benefit tracking and relapse history</li>
            <li>Trains a neural network to recognize risk patterns</li>
            <li>Validates model accuracy on test data</li>
            <li>Saves trained model to your browser</li>
            <li>Takes approximately 30-60 seconds</li>
          </ul>
        </div>

        <div className="action-buttons">
          <button 
            className="primary-button large"
            onClick={handleStartTraining}
            disabled={isTraining}
          >
            {modelInfo?.isReady ? (
              <>
                <FaRedo style={{ fontSize: '1rem' }} />
                Retrain Model
              </>
            ) : (
              <>
                <FaRocket style={{ fontSize: '1rem' }} />
                Start Training
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