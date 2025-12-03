// src/components/PatternInsight/PatternInsightCard.js
// Ambient AI pattern awareness - non-intrusive card on Tracker

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
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
        reason: prediction.reason,
        level: prediction.riskScore >= 70 ? 'high' : 'elevated'
      });

      // Animate in after a short delay
      setTimeout(() => setIsVisible(true), 500);

    } catch (error) {
      console.error('Pattern insight check error:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Wait for animation to complete
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
    <div className={`pattern-insight-card ${insight.level} ${isVisible ? 'visible' : ''}`}>
      <button 
        className="pattern-insight-dismiss" 
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <FaTimes />
      </button>
      
      <div className="pattern-insight-content">
        <div className="pattern-insight-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        
        <div className="pattern-insight-text">
          <h4>Heads Up</h4>
          <p>Your patterns suggest today may require extra awareness.</p>
        </div>
      </div>
      
      <button 
        className="pattern-insight-action"
        onClick={handleViewInsights}
      >
        View Insights
      </button>
    </div>
  );
};

export default PatternInsightCard;