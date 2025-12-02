// src/hooks/useAutoTrain.js
// Silent auto-training hook - trains AI model in background when conditions are met
// No UI feedback - completely invisible to user

import { useEffect, useRef, useCallback } from 'react';
import mlPredictionService from '../services/MLPredictionService';
import dataPreprocessor from '../utils/DataPreprocessor';

/**
 * useAutoTrain - Ambient Intelligence Auto-Training
 * 
 * This hook silently monitors user data and automatically trains the ML model
 * when sufficient data is available. The user never sees training UI or progress.
 * 
 * Training triggers when:
 * - 20+ days of benefit tracking data
 * - At least 1 historical relapse (to learn patterns from)
 * - Model not already trained OR needs retraining (7+ days since last train)
 * - Not currently training
 */
export function useAutoTrain(userData) {
  const hasAttemptedTraining = useRef(false);
  const isTrainingInProgress = useRef(false);

  const checkAndTrain = useCallback(async () => {
    // Prevent concurrent training attempts
    if (isTrainingInProgress.current) {
      return;
    }

    // Only attempt once per session unless data significantly changes
    if (hasAttemptedTraining.current) {
      return;
    }

    try {
      // Initialize ML service if needed
      await mlPredictionService.initialize();
      
      // Check data quality
      const dataQuality = dataPreprocessor.getDataQualityReport(userData);
      
      // Requirements for auto-training:
      // 1. Can train (20+ days of data)
      // 2. Has relapse history (something to learn from)
      if (!dataQuality.canTrain || !dataQuality.hasRelapseData) {
        console.log('🤖 Auto-train: Insufficient data, skipping');
        return;
      }

      // Check if model needs training
      const modelInfo = mlPredictionService.getModelInfo();
      
      // Skip if model is ready and doesn't need retraining
      if (modelInfo.isReady && !modelInfo.needsRetraining) {
        console.log('🤖 Auto-train: Model already trained and up-to-date');
        hasAttemptedTraining.current = true;
        return;
      }

      // All conditions met - train silently
      console.log('🤖 Auto-train: Starting silent background training...');
      isTrainingInProgress.current = true;
      hasAttemptedTraining.current = true;

      // Train without progress callback (silent)
      const result = await mlPredictionService.train(userData, null);

      if (result.success) {
        console.log(`🤖 Auto-train: Complete! Accuracy: ${result.accuracy?.toFixed(1)}%`);
      } else {
        console.log('🤖 Auto-train: Training failed -', result.message);
      }

    } catch (error) {
      console.error('🤖 Auto-train error:', error);
    } finally {
      isTrainingInProgress.current = false;
    }
  }, [userData]);

  // Run check when userData changes (specifically when tracking data grows)
  useEffect(() => {
    // Only check if we have userData
    if (!userData || !userData.benefitTracking) {
      return;
    }

    // Debounce - wait a moment after data changes before checking
    const timeoutId = setTimeout(() => {
      checkAndTrain();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [userData?.benefitTracking?.length, checkAndTrain]);

  // Also check on mount (for returning users)
  useEffect(() => {
    if (userData && userData.benefitTracking?.length >= 20) {
      const mountTimeout = setTimeout(() => {
        checkAndTrain();
      }, 3000); // Slight delay on mount to not block initial render

      return () => clearTimeout(mountTimeout);
    }
  }, []); // Only on mount

  // This hook returns nothing - it's purely side-effect based
  return null;
}

export default useAutoTrain;