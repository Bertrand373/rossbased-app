// src/hooks/useAutoTrain.js
// Silent auto-training hook - trains AI model in background when conditions are met

import { useEffect, useRef, useCallback } from 'react';
import mlPredictionService from '../services/MLPredictionService';
import dataPreprocessor from '../utils/DataPreprocessor';

export function useAutoTrain(userData) {
  const hasAttemptedTraining = useRef(false);
  const isTrainingInProgress = useRef(false);

  const checkAndTrain = useCallback(async () => {
    // SAFETY: Exit if no userData
    if (!userData) return;
    
    // Prevent concurrent training
    if (isTrainingInProgress.current) return;
    
    // Only attempt once per session
    if (hasAttemptedTraining.current) return;

    try {
      await mlPredictionService.initialize();
      
      const dataQuality = dataPreprocessor.getDataQualityReport(userData);
      
      // Need 20+ days and relapse history
      if (!dataQuality?.canTrain || !dataQuality?.hasRelapseData) {
        console.log('🤖 Auto-train: Insufficient data, skipping');
        return;
      }

      const modelInfo = mlPredictionService.getModelInfo();
      
      // Skip if model is ready and doesn't need retraining
      if (modelInfo?.isReady && !modelInfo?.needsRetraining) {
        console.log('🤖 Auto-train: Model already trained');
        hasAttemptedTraining.current = true;
        return;
      }

      console.log('🤖 Auto-train: Starting silent training...');
      isTrainingInProgress.current = true;
      hasAttemptedTraining.current = true;

      const result = await mlPredictionService.train(userData, null);

      if (result?.success) {
        console.log(`🤖 Auto-train: Complete! Accuracy: ${result.accuracy?.toFixed(1)}%`);
      }
    } catch (error) {
      console.error('🤖 Auto-train error:', error);
    } finally {
      isTrainingInProgress.current = false;
    }
  }, [userData]);

  useEffect(() => {
    // SAFETY: Only run with valid userData
    if (!userData?.benefitTracking?.length) return;
    if (userData.benefitTracking.length < 20) return;

    const timeoutId = setTimeout(checkAndTrain, 3000);
    return () => clearTimeout(timeoutId);
  }, [userData, checkAndTrain]);

  return null;
}

export default useAutoTrain;