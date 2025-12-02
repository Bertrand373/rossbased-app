// src/hooks/useRiskIndicator.js
// Ambient risk indicator hook - provides risk state for navigation UI
// Only shows indicator when AI model is trained and has something to say

import { useState, useEffect, useCallback } from 'react';
import mlPredictionService from '../services/MLPredictionService';

/**
 * Risk Levels:
 * - 'none': No indicator shown (model not ready OR risk below 50%)
 * - 'elevated': Amber indicator (risk 50-69%)
 * - 'high': Brighter amber/orange indicator (risk 70%+)
 */

export function useRiskIndicator(userData) {
  const [riskLevel, setRiskLevel] = useState('none');
  const [riskScore, setRiskScore] = useState(null);
  const [isModelReady, setIsModelReady] = useState(false);

  const checkRisk = useCallback(async () => {
    try {
      // Initialize service if needed
      await mlPredictionService.initialize();
      
      // Check if model is actually trained
      const modelInfo = mlPredictionService.getModelInfo();
      setIsModelReady(modelInfo.isReady);

      // If model not trained, no indicator
      if (!modelInfo.isReady) {
        setRiskLevel('none');
        setRiskScore(null);
        return;
      }

      // Get prediction
      const prediction = await mlPredictionService.predict(userData);

      // Only trust predictions that actually used ML
      if (!prediction || !prediction.usedML) {
        setRiskLevel('none');
        setRiskScore(null);
        return;
      }

      setRiskScore(prediction.riskScore);

      // Determine risk level for indicator
      if (prediction.riskScore >= 70) {
        setRiskLevel('high');
      } else if (prediction.riskScore >= 50) {
        setRiskLevel('elevated');
      } else {
        setRiskLevel('none'); // Low risk = no indicator (absence IS the signal)
      }

    } catch (error) {
      console.error('Risk indicator check error:', error);
      setRiskLevel('none');
      setRiskScore(null);
    }
  }, [userData]);

  // Check risk on mount and when userData changes
  useEffect(() => {
    if (!userData || !userData.benefitTracking) {
      setRiskLevel('none');
      return;
    }

    // Initial check
    checkRisk();

    // Set up periodic checks (every 30 minutes when app is open)
    const intervalId = setInterval(checkRisk, 30 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [userData, checkRisk]);

  // Also recheck when benefit tracking data changes
  useEffect(() => {
    if (userData?.benefitTracking?.length) {
      // Slight delay to let data settle
      const timeoutId = setTimeout(checkRisk, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [userData?.benefitTracking?.length, checkRisk]);

  return {
    riskLevel,      // 'none' | 'elevated' | 'high'
    riskScore,      // number or null
    isModelReady,   // boolean - whether AI is active
    refreshRisk: checkRisk  // manual refresh function
  };
}

export default useRiskIndicator;