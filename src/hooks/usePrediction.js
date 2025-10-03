// src/hooks/usePrediction.js
// Custom hook for prediction logic - shared across all components
// FIXED: Only returns predictions when model is actually trained

import { useState, useEffect } from 'react';
import mlPredictionService from '../services/MLPredictionService';
import notificationService from '../services/NotificationService';

export function usePrediction(userData) {
  const [prediction, setPrediction] = useState(null);
  const [nextCheckTime, setNextCheckTime] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMLReady, setIsMLReady] = useState(false);

  // Initialize ML service on mount
  useEffect(() => {
    const initializeML = async () => {
      try {
        await mlPredictionService.initialize();
        setIsMLReady(true);
        console.log('✅ ML Prediction Service ready in usePrediction hook');
      } catch (error) {
        console.error('❌ Error initializing ML service:', error);
        setIsMLReady(false);
      }
    };

    initializeML();
  }, []);

  // Run prediction whenever userData changes or ML becomes ready
  useEffect(() => {
    if (!userData || !userData.currentStreak) {
      setPrediction(null);
      setIsLoading(false);
      return;
    }

    const runPrediction = async () => {
      try {
        setIsLoading(true);

        // Check if model is trained before making predictions
        const modelInfo = mlPredictionService.getModelInfo();
        
        // If model is NOT trained, return null - no predictions
        if (!modelInfo || !modelInfo.isReady) {
          console.log('⚠️ Model not trained - no predictions available');
          setPrediction(null);
          setIsLoading(false);
          return;
        }

        // Model is trained - get prediction
        const result = await mlPredictionService.predict(userData);
        
        // Only set prediction if it actually used ML
        if (result && result.usedML) {
          setPrediction(result);

          // Calculate next check time (1 hour from now)
          const nextCheck = new Date();
          nextCheck.setHours(nextCheck.getHours() + 1);
          setNextCheckTime(nextCheck);

          // If high risk, send notification
          if (result.riskScore >= 70) {
            await notificationService.sendUrgePredictionNotification(
              result.riskScore,
              result.reason
            );
          }
        } else {
          // Model returned fallback prediction - don't use it
          console.log('⚠️ Prediction did not use ML - not displaying');
          setPrediction(null);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('❌ Prediction error:', error);
        // Don't set fallback prediction - return null
        setPrediction(null);
        setIsLoading(false);
      }
    };

    // Only run prediction if ML is ready
    if (isMLReady) {
      runPrediction();
    } else {
      setPrediction(null);
      setIsLoading(false);
    }
  }, [userData, isMLReady]);

  return {
    prediction,
    nextCheckTime,
    isLoading,
    isMLReady
  };
}