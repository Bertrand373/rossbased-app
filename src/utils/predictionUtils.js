// src/utils/predictionUtils.js
// Shared utility functions for prediction display

/**
 * Get risk level configuration based on score
 * @param {number} score - Risk score (0-100)
 * @returns {Object} Risk level config with label, color, and bgColor
 */
export function getRiskLevel(score) {
  if (score >= 80) {
    return { 
      label: 'CRITICAL', 
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)'
    };
  }
  if (score >= 70) {
    return { 
      label: 'HIGH', 
      color: '#f97316',
      bgColor: 'rgba(249, 115, 22, 0.1)'
    };
  }
  if (score >= 50) {
    return { 
      label: 'MODERATE', 
      color: '#eab308',
      bgColor: 'rgba(234, 179, 8, 0.1)'
    };
  }
  return { 
    label: 'LOW', 
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)'
  };
}

/**
 * Format a Date object to display time
 * @param {Date} date - Date to format
 * @returns {string} Formatted time string
 */
export function formatTime(date) {
  if (!date) return '--:--';
  
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

/**
 * Calculate prediction confidence based on data availability
 * @param {Object} userData - User data object
 * @returns {number} Confidence percentage (0-100)
 */
export function calculateConfidence(userData) {
  let dataPoints = 0;
  
  if (userData.benefitTracking) {
    dataPoints += userData.benefitTracking.length;
  }
  
  if (userData.emotionalTracking) {
    dataPoints += userData.emotionalTracking.length;
  }
  
  if (userData.streakHistory) {
    dataPoints += userData.streakHistory.length * 2;
  }
  
  // Convert data points to confidence percentage
  const confidence = Math.min(Math.round((dataPoints / 30) * 100), 95);
  return confidence;
}

/**
 * Check if prediction should trigger a notification
 * @param {number} riskScore - Current risk score
 * @param {number} threshold - Minimum score for notification (default 70)
 * @returns {boolean}
 */
export function shouldNotify(riskScore, threshold = 70) {
  return riskScore >= threshold;
}

/**
 * Get intervention recommendations based on risk score
 * @param {number} riskScore - Current risk score
 * @returns {Array} Array of recommended intervention types
 */
export function getRecommendedInterventions(riskScore) {
  const recommendations = [];
  
  if (riskScore >= 80) {
    // Critical - recommend all interventions
    recommendations.push('coldshower', 'exercise', 'breathing', 'meditation');
  } else if (riskScore >= 70) {
    // High - recommend immediate actions
    recommendations.push('coldshower', 'exercise', 'breathing');
  } else if (riskScore >= 50) {
    // Moderate - recommend calming actions
    recommendations.push('breathing', 'meditation');
  }
  
  return recommendations;
}

/**
 * Format prediction reason for display
 * @param {string} reason - Raw reason text
 * @param {number} maxLength - Maximum character length
 * @returns {string} Truncated reason if needed
 */
export function formatReason(reason, maxLength = 100) {
  if (!reason) return 'Risk factors detected';
  
  if (reason.length <= maxLength) {
    return reason;
  }
  
  return reason.substring(0, maxLength - 3) + '...';
}

/**
 * Check if user has sufficient data for ML predictions
 * @param {Object} userData - User data object
 * @returns {boolean}
 */
export function hasSufficientData(userData) {
  if (!userData) return false;
  
  const benefitCount = userData.benefitTracking?.length || 0;
  const emotionalCount = userData.emotionalTracking?.length || 0;
  
  // Need at least 5 days of benefit tracking
  return benefitCount >= 5;
}

/**
 * Get color for risk score (for gradients, charts, etc.)
 * @param {number} score - Risk score (0-100)
 * @returns {string} Hex color code
 */
export function getRiskColor(score) {
  if (score >= 80) return '#ef4444';
  if (score >= 70) return '#f97316';
  if (score >= 50) return '#eab308';
  return '#22c55e';
}