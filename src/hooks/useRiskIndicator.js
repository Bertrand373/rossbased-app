// src/hooks/useRiskIndicator.js
// Ambient risk indicator hook - provides risk state for navigation UI

import { useState, useEffect, useCallback } from 'react';
import mlPredictionService from '../services/MLPredictionService';

export function useRiskIndicator(userData) {
  const [riskLevel, setRiskLevel] = useState('none');
  const [riskScore, setRiskScore] = useState(null);
  const [isModelReady, setIsModelReady] = useState(false);

  const checkRisk = useCallback(async () => {
    // SAFETY: Exit if no userData
    if (!userData) {
      setRiskLevel('none');
      return;
    }

    try {
      await mlPredictionService.initialize();
      
      const modelInfo = mlPredictionService.getModelInfo();
      setIsModelReady(modelInfo?.isReady || false);

      // No indicator if model not trained
      if (!modelInfo?.isReady) {
        setRiskLevel('none');
        return;
      }

      const prediction = await mlPredictionService.predict(userData);

      // Only trust ML predictions
      if (!prediction?.usedML) {
        setRiskLevel('none');
        return;
      }

      setRiskScore(prediction.riskScore);

      // Set risk level
      if (prediction.riskScore >= 70) {
        setRiskLevel('high');
      } else if (prediction.riskScore >= 50) {
        setRiskLevel('elevated');
      } else {
        setRiskLevel('none');
      }
    } catch (error) {
      console.error('Risk indicator error:', error);
      setRiskLevel('none');
    }
  }, [userData]);

  useEffect(() => {
    // SAFETY: Only run with valid userData
    if (!userData?.benefitTracking) {
      setRiskLevel('none');
      return;
    }

    // Initial check with delay
    const initialTimeout = setTimeout(checkRisk, 2000);

    // Check every 30 minutes
    const intervalId = setInterval(checkRisk, 30 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [userData, checkRisk]);

  return { riskLevel, riskScore, isModelReady, refreshRisk: checkRisk };
}

export default useRiskIndicator;