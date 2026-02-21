// src/components/PatternInsight/PatternInsightCard.js
// Ambient AI pattern awareness - floating minimal design
// Integrated with InterventionService for outcome tracking
// UPDATED: Added onVisibilityChange callback for mutual exclusion with DailyTransmission
// UPDATED: sessionStorage caching to prevent almanac flash on tab switches

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
      const isShowing = insight && isVisible && !isDismissed;
      onVisibilityChange(isShowing);
    }
  }, [insight, isVisible, isDismissed, onVisibilityChange]);

  const checkForInsight = async () => {
    // Don't show if already dismissed this session
    const dismissedToday = sessionStorage.getItem('pattern_insight_dismissed');
    if (dismissedToday) {
      setIsDismissed(true);
      // Clear the active flag since it's dismissed
      sessionStorage.removeItem('pattern_alert_active');
      return;
    }

    // Ensure we have valid userData
    if (!userData?.benefitTracking?.length) {
      return;
    }

    try {
      await mlPredictionService.initialize();
      
      // Only show if model has been trained or has seeded data
      const modelInfo = mlPredictionService.getModelInfo();
      const trainingHistory = localStorage.getItem('ml_training_history');
      const hasSeededData = trainingHistory && JSON.parse(trainingHistory).lastTrained;
      if (!modelInfo?.isReady && !hasSeededData) {
        return;
      }

      const prediction = await mlPredictionService.predict(userData);
      
      try {
        localStorage.setItem('titantrack_ml_prediction', JSON.stringify({
          riskScore: prediction.riskScore / 100,
          riskLevel: prediction.riskScore >= 70 ? 'high' : prediction.riskScore >= 50 ? 'elevated' : prediction.riskScore >= 30 ? 'moderate' : 'low',
          topFactors: Object.keys(prediction.factors || {}).slice(0, 5),
          timestamp: Date.now()
        }));
      } catch (e) { /* silent */ }
      
      // Only show card for elevated risk (50%+)
      if (prediction.riskScore < 50) {
        sessionStorage.removeItem('pattern_alert_active');
        return;
      }

      setInsight(prediction);
      
      // Cache that the alert is active — prevents almanac flash on tab switches
      sessionStorage.setItem('pattern_alert_active', 'true');
      
      interventionIdRef.current = interventionService.createIntervention(prediction);

      // Show immediately — no delay
      setIsVisible(true);

    } catch (error) {
      console.error('Pattern insight check error:', error);
      sessionStorage.removeItem('pattern_alert_active');
    }
  };

  const handleDismiss = () => {
    if (interventionIdRef.current) {
      interventionService.recordResponse(interventionIdRef.current, 'dismissed');
    }
    
    setIsVisible(false);
    setIsDismissing(true);
    
    // Clear the active flag and set dismissed flag
    sessionStorage.removeItem('pattern_alert_active');
    
    setTimeout(() => {
      setIsDismissed(true);
      sessionStorage.setItem('pattern_insight_dismissed', 'true');
    }, 400);
  };

  const handleViewInsights = () => {
    navigate('/urge-prediction', { 
      state: { 
        prediction: insight,
        interventionId: interventionIdRef.current
      } 
    });
  };

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
