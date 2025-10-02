// src/components/PredictionWidget/PredictionWidget.js
// UPDATED: Now uses MLPredictionService with TensorFlow.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PredictionWidget.css';
import mlPredictionService from '../../services/MLPredictionService';
import notificationService from '../../services/NotificationService';

function PredictionWidget({ userData }) {
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState(null);
  const [nextCheckTime, setNextCheckTime] = useState(null);
  const [isMLReady, setIsMLReady] = useState(false);
  
  // Check if Notification exists before accessing it
  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // Initialize ML service on mount
  useEffect(() => {
    const initializeML = async () => {
      try {
        await mlPredictionService.initialize();
        setIsMLReady(true);
        console.log('✅ ML Prediction Service ready in PredictionWidget');
      } catch (error) {
        console.error('❌ Error initializing ML service:', error);
        setIsMLReady(false);
      }
    };

    initializeML();
  }, []);

  // Run prediction check
  useEffect(() => {
    if (!userData || !userData.currentStreak) {
      return;
    }

    const runPrediction = async () => {
      try {
        // Use ML prediction service
        const result = await mlPredictionService.predict(userData);
        setPrediction(result);

        // Calculate next check time (1 hour from now)
        const nextCheck = new Date();
        nextCheck.setHours(nextCheck.getHours() + 1);
        setNextCheckTime(nextCheck);

        // If high risk, send notification
        if (result.riskScore >= 70) {
          notificationService.sendUrgePredictionNotification(
            result.riskScore,
            result.reason
          );
        }
      } catch (error) {
        console.error('❌ Prediction error:', error);
        // Set a safe default prediction
        setPrediction({
          riskScore: 30,
          confidence: 0,
          reason: 'Prediction unavailable',
          usedML: false
        });
      }
    };

    // Only run prediction if ML is ready or userData changes
    if (isMLReady) {
      runPrediction();
    }
  }, [userData, isMLReady]);

  // Update permission status
  useEffect(() => {
    const checkPermission = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    };

    // Check periodically
    const interval = setInterval(checkPermission, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      setNotificationPermission('granted');
    }
  };

  const handleViewDetails = () => {
    navigate('/urge-prediction');
  };

  if (!prediction) {
    return null;
  }

  const getRiskLevel = (score) => {
    if (score >= 80) return { label: 'CRITICAL', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' };
    if (score >= 70) return { label: 'HIGH', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' };
    if (score >= 50) return { label: 'MODERATE', color: '#eab308', bgColor: 'rgba(234, 179, 8, 0.1)' };
    return { label: 'LOW', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' };
  };

  const riskLevel = getRiskLevel(prediction.riskScore);

  const formatTime = (date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="prediction-widget">
      <div className="prediction-widget-header">
        <div className="widget-title">
          <span className="widget-icon">🧠</span>
          <span>{prediction.usedML ? 'ML' : 'AI'} Urge Prediction</span>
        </div>
        {notificationPermission === 'granted' && (
          <span className="notification-status active">🔔 Active</span>
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
              <span className="info-value" style={{ color: '#22c55e' }}>Neural Network ✓</span>
            </div>
          )}
        </div>

        {prediction.riskScore >= 50 && (
          <div className="quick-reason">
            <span className="reason-icon">💡</span>
            <span className="reason-text">{prediction.reason}</span>
          </div>
        )}

        <div className="widget-actions">
          {notificationPermission === 'unsupported' ? (
            <button 
              className="widget-btn view-details"
              onClick={handleViewDetails}
            >
              <span>📊</span>
              <span>View Full Analysis</span>
            </button>
          ) : notificationPermission !== 'granted' ? (
            <button 
              className="widget-btn enable-notifications"
              onClick={handleEnableNotifications}
            >
              <span>🔔</span>
              <span>Enable Alerts</span>
            </button>
          ) : (
            <button 
              className="widget-btn view-details"
              onClick={handleViewDetails}
            >
              <span>📊</span>
              <span>View Full Analysis</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PredictionWidget;