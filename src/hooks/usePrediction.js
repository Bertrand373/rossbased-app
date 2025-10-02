// src/hooks/usePrediction.js
// Custom hook for prediction logic - shared across all components

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
      setIsLoading(false);
      return;
    }

    const runPrediction = async () => {
      try {
        setIsLoading(true);

        // Use ML prediction service
        const result = await mlPredictionService.predict(userData);
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

        setIsLoading(false);
      } catch (error) {
        console.error('❌ Prediction error:', error);
        // Set a safe default prediction
        setPrediction({
          riskScore: 30,
          confidence: 0,
          reason: 'Prediction unavailable',
          usedML: false,
          factors: {}
        });
        setIsLoading(false);
      }
    };

    // Only run prediction if ML is ready or if userData changes
    if (isMLReady) {
      runPrediction();
    }
  }, [userData, isMLReady]);

  return {
    prediction,
    nextCheckTime,
    isLoading,
    isMLReady
  };
}