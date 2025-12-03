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
      
      // Only show if model is actually trained
      if (!modelInfo?.isReady || !modelInfo?.lastTrained) {
        return;
      }

      const prediction = await mlPredictionService.predict(userData);
      
      // Only show for ML predictions with elevated risk (50%+)
      if (!prediction?.usedML || prediction.riskScore < 50) {
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