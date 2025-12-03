// src/hooks/useInterventionOutcomes.js
// Hook to manage intervention outcomes - call on app load and relapse events

import { useEffect, useCallback } from 'react';
import interventionService from '../services/InterventionService';

/**
 * Hook to manage intervention outcomes
 * 
 * Usage in App.js or main component:
 * const { onRelapse, getStats, getToolEffectiveness } = useInterventionOutcomes();
 * 
 * Call onRelapse() whenever user logs a relapse
 * Call getStats() to display intervention statistics
 */
export const useInterventionOutcomes = () => {
  
  // Check for successful interventions on mount
  useEffect(() => {
    // Mark any interventions past 48 hours as successful
    const successCount = interventionService.checkSuccessfulInterventions();
    if (successCount > 0) {
      console.log(`Marked ${successCount} interventions as successful`);
    }
  }, []);

  /**
   * Call this when user logs a relapse
   * Marks any pending interventions within 48 hours as failed
   */
  const onRelapse = useCallback((relapseDate = new Date(), relapseId = null) => {
    const markedCount = interventionService.onRelapse(relapseDate, relapseId);
    if (markedCount > 0) {
      console.log(`Marked ${markedCount} interventions as relapse`);
    }
    return markedCount;
  }, []);

  /**
   * Get overall intervention statistics
   */
  const getStats = useCallback(() => {
    return interventionService.getInterventionStats();
  }, []);

  /**
   * Get effectiveness of each tool
   */
  const getToolEffectiveness = useCallback(() => {
    return interventionService.getToolEffectiveness();
  }, []);

  /**
   * Get most effective tool for this user
   */
  const getMostEffectiveTool = useCallback(() => {
    return interventionService.getMostEffectiveTool();
  }, []);

  /**
   * Get comparison: responding vs ignoring alerts
   */
  const getResponseEffectiveness = useCallback(() => {
    return interventionService.getResponseEffectiveness();
  }, []);

  /**
   * Get training data for ML model
   */
  const getTrainingData = useCallback(() => {
    return interventionService.getTrainingData();
  }, []);

  /**
   * Clear all intervention data (for reset)
   */
  const clearAll = useCallback(() => {
    interventionService.clearAll();
  }, []);

  return {
    onRelapse,
    getStats,
    getToolEffectiveness,
    getMostEffectiveTool,
    getResponseEffectiveness,
    getTrainingData,
    clearAll
  };
};

export default useInterventionOutcomes;