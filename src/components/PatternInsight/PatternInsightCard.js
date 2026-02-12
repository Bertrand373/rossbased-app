// src/components/PatternInsight/PatternInsightCard.js
// Ambient AI pattern awareness - floating minimal design
// Integrated with InterventionService for outcome tracking
// UPDATED: Added onVisibilityChange callback for mutual exclusion with DailyTransmission

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './PatternInsightCard.css';
import mlPredictionService from '../../services/MLPredictionService';
import interventionService from '../../services/InterventionService';

const PatternInsightCard = ({ userData, onVisibilityChange }) => {
  const navigate = useNavigate();
  const [insight, setInsight] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const interventionIdRef = useRef(null);

  useEffect(() => {
    checkForInsight();
  }, [userData]);

  // Notify parent of visibility changes
  useEffect(() => {
    if (onVisibilityChange) {
      // Card is "showing" if it has insight, is visible, and not dismissed
      const isShowing = insight && isVisible && !isDismissed;
      onVisibilityChange(isShowing);
    }
  }, [insight, isVisible, isDismissed, onVisibilityChange]);

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
      
      // Always save latest prediction to localStorage for Oracle context bridging (Layer 5)
      // AIChat.js reads this before each Oracle call and pushes to backend
      try {
        localStorage.setItem('titantrack_ml_prediction', JSON.stringify({
          riskScore: prediction.riskScore / 100, // Normalize to 0-1 for backend
          riskLevel: prediction.riskScore >= 70 ? 'high' : prediction.riskScore >= 50 ? 'elevated' : prediction.riskScore >= 30 ? 'moderate' : 'low',
          topFactors: Object.keys(prediction.factors || {}).slice(0, 5),
          timestamp: Date.now()
        }));
      } catch (e) { /* silent */ }
      
      // Show for elevated risk (50%+)
      if (prediction.riskScore < 50) {
        return;
      }

      setInsight(prediction);
      
      // Create intervention when alert is shown
      // This tracks that the user was shown an alert
      interventionIdRef.current = interventionService.createIntervention(prediction);

      // Animate in after a short delay
      setTimeout(() => setIsVisible(true), 500);

    } catch (error) {
      console.error('Pattern insight check error:', error);
    }
  };

  const handleDismiss = () => {
    // Record that user dismissed/ignored the alert
    if (interventionIdRef.current) {
      interventionService.recordResponse(interventionIdRef.current, 'dismissed');
    }
    
    // Phase 1: Start collapse animation
    setIsVisible(false);
    setIsDismissing(true);
    
    // Phase 2: Remove from DOM after animation completes
    setTimeout(() => {
      setIsDismissed(true);
      sessionStorage.setItem('pattern_insight_dismissed', 'true');
    }, 400);
  };

  const handleViewInsights = () => {
    // Pass the prediction data AND intervention ID
    navigate('/urge-prediction', { 
      state: { 
        prediction: insight,
        interventionId: interventionIdRef.current
      } 
    });
  };

  // Don't render if dismissed or no insight
  if (isDismissed || !insight) {
    return null;
  }

  return (
    <div className={`pattern-insight ${isVisible ? 'visible' : ''} ${isDismissing ? 'dismissing' : ''}`}>
      <p className="pattern-insight-label">Pattern Alert</p>
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
