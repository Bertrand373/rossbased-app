// src/utils/DataPreprocessor.js
// Data Preprocessing Utilities for ML Pipeline
// Handles feature extraction, normalization, and data validation

/**
 * DataPreprocessor - Prepares raw user data for machine learning
 * 
 * SIMPLE EXPLANATION:
 * Think of this as a "translator" that converts your app data into a format
 * the neural network can understand. It's like converting English to numbers.
 * 
 * KEY JOBS:
 * 1. Extract features (pull out the important numbers)
 * 2. Validate data (make sure it's good quality)
 * 3. Normalize (scale everything to 0-1 range for consistent learning)
 * 4. Generate training examples (create input-output pairs for learning)
 */
class DataPreprocessor {
  constructor() {
    // Feature names for reference
    this.featureNames = [
      'energy',
      'focus',
      'confidence',
      'energyDrop',
      'hourOfDay',
      'isWeekend',
      'streakDay',
      'inPurgePhase',
      'anxiety',
      'moodStability'
    ];
    
    console.log('📊 DataPreprocessor initialized');
  }

  /**
   * Extract features from a single day's data
   * This is the main function that pulls out the 10 numbers we need
   * 
   * @param {Object} current - Today's benefit tracking
   * @param {Object} previous - Yesterday's benefit tracking (for comparison)
   * @param {Date} date - The date we're extracting features for
   * @param {Object} userData - Full user data for context
   * @returns {Array} Array of 10 feature values
   */
  extractFeatures(current, previous, date, userData) {
    try {
      // FEATURE 1-3: Core benefit metrics (0-10 scale)
      const energy = this.validateNumber(current.energy, 5, 0, 10);
      const focus = this.validateNumber(current.focus, 5, 0, 10);
      const confidence = this.validateNumber(current.confidence, 5, 0, 10);
      
      // FEATURE 4: Energy drop from previous day
      // This catches fatigue patterns that might lead to urges
      const previousEnergy = previous ? this.validateNumber(previous.energy, 5, 0, 10) : energy;
      const energyDrop = previousEnergy - energy;
      
      // FEATURE 5: Hour of day (0-23)
      // Evening hours (20-23) are typically high-risk
      const hourOfDay = date.getHours();
      
      // FEATURE 6: Is weekend? (0 or 1)
      // Weekends have less structure, often higher risk
      const isWeekend = (date.getDay() === 0 || date.getDay() === 6) ? 1 : 0;
      
      // FEATURE 7: Current streak day
      // Pattern detection based on how far into the streak
      const streakDay = this.validateNumber(userData.currentStreak, 0, 0, 1000);
      
      // FEATURE 8: In purge phase? (days 15-45)
      // This is a known high-risk emotional phase
      const inPurgePhase = (streakDay >= 15 && streakDay <= 45) ? 1 : 0;
      
      // FEATURE 9-10: Emotional state
      // High anxiety + low mood stability = high risk
      let anxiety = 5;
      let moodStability = 5;
      
      if (userData.emotionalTracking && userData.emotionalTracking.length > 0) {
        const latestEmotion = userData.emotionalTracking[userData.emotionalTracking.length - 1];
        anxiety = this.validateNumber(latestEmotion.anxiety, 5, 0, 10);
        moodStability = this.validateNumber(latestEmotion.moodStability, 5, 0, 10);
      }
      
      return [
        energy,
        focus,
        confidence,
        energyDrop,
        hourOfDay,
        isWeekend,
        streakDay,
        inPurgePhase,
        anxiety,
        moodStability
      ];
      
    } catch (error) {
      console.error('❌ Error extracting features:', error);
      // Return default safe values
      return [5, 5, 5, 0, 12, 0, 0, 0, 5, 5];
    }
  }

  /**
   * Generate training dataset from user's historical data
   * Creates input-output pairs for the neural network to learn from
   * 
   * @param {Object} userData - User's complete historical data
   * @returns {Object} { features: [[...]], labels: [[...]], count: number }
   */
  generateTrainingData(userData) {
    try {
      console.log('🔨 Generating training data from user history...');
      
      // Validate input data
      if (!userData.benefitTracking || userData.benefitTracking.length < 2) {
        console.log('⚠️  Insufficient benefit tracking data');
        return { features: [], labels: [], count: 0 };
      }
      
      const features = [];
      const labels = [];
      
      // Get relapse history (these become our labels)
      const relapses = this.getRelapseHistory(userData);
      console.log(`   Found ${relapses.length} historical relapses`);
      
      // Create a training example for each day of benefit tracking
      for (let i = 1; i < userData.benefitTracking.length; i++) {
        const current = userData.benefitTracking[i];
        const previous = userData.benefitTracking[i - 1];
        
        // Validate dates
        if (!current.date || !previous.date) continue;
        
        const currentDate = new Date(current.date);
        
        // Check if there was a relapse on this day
        const hadRelapse = this.checkRelapseOnDate(currentDate, relapses);
        
        // Extract features for this day
        const dayFeatures = this.extractFeatures(current, previous, currentDate, userData);
        
        features.push(dayFeatures);
        labels.push([hadRelapse ? 1 : 0]); // 1 = relapse, 0 = no relapse
      }
      
      console.log(`✅ Generated ${features.length} training examples`);
      console.log(`   Positive examples (relapses): ${labels.filter(l => l[0] === 1).length}`);
      console.log(`   Negative examples (no relapse): ${labels.filter(l => l[0] === 0).length}`);
      
      return {
        features,
        labels,
        count: features.length
      };
      
    } catch (error) {
      console.error('❌ Error generating training data:', error);
      return { features: [], labels: [], count: 0 };
    }
  }

  /**
   * Get relapse history from streak history
   * Extracts all the times a relapse occurred
   * 
   * @param {Object} userData - User data
   * @returns {Array} Array of relapse objects with date and details
   */
  getRelapseHistory(userData) {
    if (!userData.streakHistory || !Array.isArray(userData.streakHistory)) {
      return [];
    }
    
    return userData.streakHistory
      .filter(streak => streak.reason === 'relapse' && streak.end)
      .map(streak => ({
        date: new Date(streak.end),
        trigger: streak.trigger || 'unknown',
        days: streak.days || 0
      }))
      .filter(relapse => !isNaN(relapse.date.getTime())); // Valid dates only
  }

  /**
   * Check if a relapse occurred on a specific date
   * 
   * @param {Date} date - Date to check
   * @param {Array} relapses - Array of relapse objects
   * @returns {Boolean} True if relapse occurred on this date
   */
  checkRelapseOnDate(date, relapses) {
    const dateStr = this.dateToString(date);
    
    return relapses.some(relapse => {
      const relapseStr = this.dateToString(relapse.date);
      return relapseStr === dateStr;
    });
  }

  /**
   * Calculate normalization statistics for features
   * Finds min/max for each feature so we can scale to 0-1
   * 
   * SIMPLE EXPLANATION:
   * Neural networks learn best when all inputs are in the same range (0-1).
   * This function finds the min and max of each feature so we can scale them.
   * 
   * @param {Array} featureArray - Array of feature arrays [[...], [...], ...]
   * @returns {Array} Array of {min, max} objects for each feature
   */
  calculateNormalizationStats(featureArray) {
    if (!featureArray || featureArray.length === 0) {
      return null;
    }
    
    const numFeatures = featureArray[0].length;
    const stats = [];
    
    for (let featureIndex = 0; featureIndex < numFeatures; featureIndex++) {
      // Get all values for this feature
      const values = featureArray.map(features => features[featureIndex]);
      
      // Calculate min and max
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      stats.push({
        name: this.featureNames[featureIndex] || `feature_${featureIndex}`,
        min,
        max,
        range: max - min
      });
    }
    
    console.log('📏 Normalization stats calculated:');
    stats.forEach((stat, i) => {
      console.log(`   ${stat.name}: [${stat.min.toFixed(2)} - ${stat.max.toFixed(2)}]`);
    });
    
    return stats;
  }

  /**
   * Normalize features to 0-1 range
   * 
   * FORMULA: normalized = (value - min) / (max - min)
   * 
   * @param {Array} features - Raw feature array
   * @param {Array} stats - Normalization stats from calculateNormalizationStats
   * @returns {Array} Normalized features (all values 0-1)
   */
  normalizeFeatures(features, stats) {
    if (!stats || stats.length !== features.length) {
      console.warn('⚠️  Stats mismatch, using default normalization');
      // Fallback: divide by 10 (assumes most features are 0-10)
      return features.map(f => Math.max(0, Math.min(1, f / 10)));
    }
    
    return features.map((value, index) => {
      const { min, max } = stats[index];
      
      // Handle edge case where min === max
      if (max === min) {
        return 0.5; // Return middle value
      }
      
      // Normalize to 0-1 range
      const normalized = (value - min) / (max - min);
      
      // Clamp to 0-1 (in case of outliers)
      return Math.max(0, Math.min(1, normalized));
    });
  }

  /**
   * Denormalize features back to original scale
   * Useful for displaying feature values to users
   * 
   * @param {Array} normalizedFeatures - Features in 0-1 range
   * @param {Array} stats - Normalization stats
   * @returns {Array} Features in original scale
   */
  denormalizeFeatures(normalizedFeatures, stats) {
    if (!stats || stats.length !== normalizedFeatures.length) {
      return normalizedFeatures.map(f => f * 10); // Fallback
    }
    
    return normalizedFeatures.map((normalized, index) => {
      const { min, max } = stats[index];
      return normalized * (max - min) + min;
    });
  }

  /**
   * Validate and sanitize a number value
   * Ensures it's within expected range and not NaN
   * 
   * @param {any} value - Value to validate
   * @param {number} defaultValue - Default if invalid
   * @param {number} min - Minimum allowed value
   * @param {number} max - Maximum allowed value
   * @returns {number} Valid number
   */
  validateNumber(value, defaultValue = 0, min = -Infinity, max = Infinity) {
    // Convert to number
    const num = Number(value);
    
    // Check if valid
    if (isNaN(num) || !isFinite(num)) {
      return defaultValue;
    }
    
    // Clamp to range
    return Math.max(min, Math.min(max, num));
  }

  /**
   * Validate user data quality
   * Checks if there's enough data for training
   * 
   * @param {Object} userData - User data to validate
   * @returns {Object} { isValid, message, dataPoints }
   */
  validateTrainingData(userData) {
    const issues = [];
    let dataPoints = 0;
    
    // Check benefit tracking
    if (!userData.benefitTracking || !Array.isArray(userData.benefitTracking)) {
      issues.push('No benefit tracking data found');
    } else {
      dataPoints = userData.benefitTracking.length;
      if (dataPoints < 20) {
        issues.push(`Need at least 20 days of data (have ${dataPoints})`);
      }
    }
    
    // Check streak history
    if (!userData.streakHistory || !Array.isArray(userData.streakHistory)) {
      issues.push('No streak history found');
    } else {
      const relapses = userData.streakHistory.filter(s => s.reason === 'relapse');
      if (relapses.length === 0) {
        issues.push('Need at least one historical relapse for learning');
      }
    }
    
    // Check current streak
    if (!userData.currentStreak || userData.currentStreak < 1) {
      issues.push('Invalid current streak value');
    }
    
    return {
      isValid: issues.length === 0,
      message: issues.length > 0 ? issues.join('; ') : 'Data is valid',
      issues,
      dataPoints,
      hasEnoughData: dataPoints >= 20
    };
  }

  /**
   * Get feature importance for explanation
   * Returns which features contributed most to a prediction
   * 
   * @param {Array} features - Feature values
   * @param {Array} weights - Feature weights (optional)
   * @returns {Array} Sorted array of {name, value, importance}
   */
  getFeatureImportance(features, weights = null) {
    const importance = features.map((value, index) => ({
      name: this.featureNames[index],
      value: value,
      weight: weights ? weights[index] : 1,
      importance: weights ? Math.abs(value * weights[index]) : Math.abs(value)
    }));
    
    // Sort by importance (highest first)
    return importance.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Split data into training and validation sets
   * 
   * @param {Array} features - Feature arrays
   * @param {Array} labels - Label arrays
   * @param {number} validationSplit - Fraction for validation (0-1)
   * @returns {Object} { trainFeatures, trainLabels, valFeatures, valLabels }
   */
  trainValidationSplit(features, labels, validationSplit = 0.2) {
    const totalSize = features.length;
    const valSize = Math.floor(totalSize * validationSplit);
    const trainSize = totalSize - valSize;
    
    // Shuffle indices
    const indices = Array.from({ length: totalSize }, (_, i) => i);
    this.shuffleArray(indices);
    
    // Split
    const trainIndices = indices.slice(0, trainSize);
    const valIndices = indices.slice(trainSize);
    
    return {
      trainFeatures: trainIndices.map(i => features[i]),
      trainLabels: trainIndices.map(i => labels[i]),
      valFeatures: valIndices.map(i => features[i]),
      valLabels: valIndices.map(i => labels[i])
    };
  }

  /**
   * Shuffle array in place (Fisher-Yates algorithm)
   * 
   * @param {Array} array - Array to shuffle
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Convert date to YYYY-MM-DD string for comparison
   * 
   * @param {Date} date - Date object
   * @returns {string} Date string
   */
  dateToString(date) {
    if (!date || isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  }

  /**
   * Get data quality report
   * Useful for showing users what data they have
   * 
   * @param {Object} userData - User data
   * @returns {Object} Quality report
   */
  getDataQualityReport(userData) {
    const benefitDays = userData.benefitTracking?.length || 0;
    const emotionalDays = userData.emotionalTracking?.length || 0;
    const relapseCount = userData.streakHistory?.filter(s => s.reason === 'relapse').length || 0;
    const currentStreak = userData.currentStreak || 0;
    
    // Calculate completeness
    const hasMinimumData = benefitDays >= 20;
    const hasRelapseData = relapseCount > 0;
    const hasEmotionalData = emotionalDays > 0;
    
    let qualityScore = 0;
    if (hasMinimumData) qualityScore += 40;
    if (hasRelapseData) qualityScore += 30;
    if (hasEmotionalData) qualityScore += 20;
    if (currentStreak > 0) qualityScore += 10;
    
    return {
      qualityScore, // 0-100
      benefitDays,
      emotionalDays,
      relapseCount,
      currentStreak,
      hasMinimumData,
      hasRelapseData,
      hasEmotionalData,
      canTrain: hasMinimumData && hasRelapseData,
      recommendation: this.getDataRecommendation(qualityScore, hasMinimumData, hasRelapseData)
    };
  }

  /**
   * Get recommendation based on data quality
   * 
   * @param {number} qualityScore - Quality score (0-100)
   * @param {boolean} hasMinimumData - Has enough data points
   * @param {boolean} hasRelapseData - Has relapse history
   * @returns {string} Recommendation message
   */
  getDataRecommendation(qualityScore, hasMinimumData, hasRelapseData) {
    if (qualityScore >= 80) {
      return 'Excellent data quality! Model will perform well.';
    } else if (qualityScore >= 60) {
      return 'Good data quality. Model can be trained.';
    } else if (!hasMinimumData) {
      return 'Keep tracking daily benefits. Need 20+ days for training.';
    } else if (!hasRelapseData) {
      return 'Need relapse history to learn risk patterns.';
    } else {
      return 'Add more emotional tracking for better predictions.';
    }
  }
}

// Export singleton instance
const dataPreprocessor = new DataPreprocessor();

export default dataPreprocessor;