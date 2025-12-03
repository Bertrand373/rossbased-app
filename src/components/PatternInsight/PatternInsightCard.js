// src/components/PatternInsight/PatternInsightCard.js
// Ambient AI pattern awareness - floating minimal design

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PatternInsightCard.css';
import mlPredictionService from '../../services/MLPredictionService';

const PatternInsightCard = ({ userData }) => {
  const navigate = useNavigate();
  const [insight, setInsight] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    checkForInsight();
  }, [userData]);

  const checkForInsight = async () => {
    // Don't show if already dismissed this session
    const dismissedToday = sessionStorage.getItem('pattern_insight_dismissed');
    if (dismissedToday) {
      setIsDismissed(true);
      return;
    }

    // Ensure we have valid userData
    if (!userData?.benefitTracking?.length) {
      return;
    }

    try {
      await mlPredictionService.initialize();
      
      const modelInfo = mlPredictionService.getModelInfo();
      
      // Check if model is trained OR if we have seeded training data (for testing)
      const trainingHistory = localStorage.getItem('ml_training_history');
      const hasSeededData = trainingHistory && JSON.parse(trainingHistory).lastTrained;
      
      // Only show if model is actually trained or we have test data
      if (!modelInfo?.isReady && !hasSeededData) {
        return;
      }

      const prediction = await mlPredictionService.predict(userData);
      
      // Show for elevated risk (50%+) - works with both ML and fallback predictions
      // For seeded test data, also show if fallback gives high enough score
      if (prediction.riskScore < 50) {
        return;
      }

      setInsight({
        riskScore: prediction.riskScore,
        reason: prediction.reason
      });

      // Animate in after a short delay
      setTimeout(() => setIsVisible(true), 500);

    } catch (error) {
      console.error('Pattern insight check error:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsDismissed(true);
      sessionStorage.setItem('pattern_insight_dismissed', 'true');
    }, 300);
  };

  const handleViewInsights = () => {
    navigate('/urge-prediction');
  };

  // Don't render if dismissed or no insight
  if (isDismissed || !insight) {
    return null;
  }

  return (
    <div className={`pattern-insight ${isVisible ? 'visible' : ''}`}>
      <p className="pattern-insight-label">Heads up</p>
      <p className="pattern-insight-message">
        Your patterns suggest today may require extra awareness.
      </p>
      <div className="pattern-insight-actions">
        <button 
          className="pattern-insight-view"
          onClick={handleViewInsights}
        >
          View Insights
        </button>
        <button 
          className="pattern-insight-dismiss"
          onClick={handleDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default PatternInsightCard;