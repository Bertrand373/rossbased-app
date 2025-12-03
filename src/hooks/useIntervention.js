// src/hooks/useIntervention.js
// Hook for tracking toolkit sessions with InterventionService

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import interventionService from '../services/InterventionService';

/**
 * Hook to track toolkit session for intervention feedback loop
 * 
 * Usage in UrgeToolkit:
 * const { trackToolStart, trackSessionComplete } = useIntervention();
 * 
 * When user starts a tool: trackToolStart('breathing')
 * When session completes: trackSessionComplete(durationInSeconds)
 */
export const useIntervention = () => {
  const location = useLocation();
  const interventionIdRef = useRef(null);
  const sessionStartTimeRef = useRef(null);
  const currentToolRef = useRef(null);

  // Check if we came from a prediction
  useEffect(() => {
    if (location.state?.interventionId) {
      interventionIdRef.current = location.state.interventionId;
    } else if (location.state?.fromPrediction) {
      // Create orphan intervention if we came from prediction without ID
      // This shouldn't happen normally, but handles edge cases
      console.log('UrgeToolkit: fromPrediction but no interventionId');
    }
  }, [location.state]);

  /**
   * Track when user starts a specific tool
   * Call this when breathing, cold shower, etc. begins
   */
  const trackToolStart = useCallback((toolName) => {
    currentToolRef.current = toolName;
    sessionStartTimeRef.current = Date.now();
    
    if (interventionIdRef.current) {
      // Update existing intervention with tool choice
      interventionService.startSession(interventionIdRef.current, toolName);
    } else {
      // Create orphan session (user came to toolkit directly)
      interventionIdRef.current = interventionService.createOrphanSession(toolName);
    }
    
    return interventionIdRef.current;
  }, []);

  /**
   * Track when session is completed
   * Call this when user finishes the protocol
   */
  const trackSessionComplete = useCallback((durationOverride = null) => {
    if (!interventionIdRef.current) {
      console.log('No intervention to complete');
      return;
    }
    
    // Calculate duration
    let duration = durationOverride;
    if (duration === null && sessionStartTimeRef.current) {
      duration = Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
    }
    
    interventionService.completeSession(interventionIdRef.current, duration);
    
    // Reset refs
    const completedId = interventionIdRef.current;
    interventionIdRef.current = null;
    sessionStartTimeRef.current = null;
    currentToolRef.current = null;
    
    return completedId;
  }, []);

  /**
   * Get the current intervention ID (for passing to other components)
   */
  const getInterventionId = useCallback(() => {
    return interventionIdRef.current;
  }, []);

  /**
   * Check if this session is from a prediction
   */
  const isFromPrediction = useCallback(() => {
    return !!location.state?.fromPrediction || !!location.state?.interventionId;
  }, [location.state]);

  /**
   * Get suggested tools from prediction (if any)
   */
  const getSuggestedTools = useCallback(() => {
    return location.state?.suggestedTools || null;
  }, [location.state]);

  /**
   * Get the risk score that triggered this session (if from prediction)
   */
  const getRiskScore = useCallback(() => {
    return location.state?.riskScore || null;
  }, [location.state]);

  return {
    trackToolStart,
    trackSessionComplete,
    getInterventionId,
    isFromPrediction,
    getSuggestedTools,
    getRiskScore
  };
};

export default useIntervention;