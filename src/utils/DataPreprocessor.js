// src/utils/DataPreprocessor.js
// Data Preprocessing Utilities for ML Pipeline
// Handles feature extraction, normalization, and data validation
// UPDATED: Now integrates Emotional Timeline check-in data (emotionalLog)
// UPDATED: Added dates tracking for feedback weighting

/**
 * DataPreprocessor - Prepares raw user data for machine learning
 * 
 * FEATURE SET (12 total):
 * 1-3: Benefit metrics (energy, focus, confidence)
 * 4: Energy drop from previous day
 * 5-6: Temporal (hour of day, weekend)
 * 7-8: Streak context (streak day, purge phase)
 * 9-12: Emotional state from ET check-in (anxiety, mood, clarity, processing)
 */
class DataPreprocessor {
  constructor() {
    // Feature names for reference - NOW 12 FEATURES
    this.featureNames = [
      'energy',           // 1: Benefit metric
      'focus',            // 2: Benefit metric
      'confidence',       // 3: Benefit metric
      'energyDrop',       // 4: Change from yesterday
      'hourOfDay',        // 5: Temporal - normalized 0-1
      'isWeekend',        // 6: Temporal - binary
      'streakDay',        // 7: Context
      'inPurgePhase',     // 8: Context - binary (days 15-45)
      'anxiety',          // 9: ET emotional - HIGH PREDICTIVE VALUE
      'moodStability',    // 10: ET emotional - HIGH PREDICTIVE VALUE
      'mentalClarity',    // 11: ET emotional - MEDIUM PREDICTIVE VALUE
      'emotionalProcessing' // 12: ET emotional - HIGH PREDICTIVE VALUE
    ];
    
    console.log('📊 DataPreprocessor initialized with 12 features (including ET emotional data)');
  }

  /**
   * Extract features from a single day's data
   * Now pulls from both benefitTracking AND emotionalLog
   * 
   * @param {Object} current - Today's benefit tracking
   * @param {Object} previous - Yesterday's benefit tracking
   * @param {Date} date - The date we're extracting features for
   * @param {Object} userData - Full user data for context
   * @returns {Array} Array of 12 feature values
   */
  extractFeatures(current, previous, date, userData) {
    try {
      // FEATURES 1-3: Core benefit metrics (0-10 scale)
      const energy = this.validateNumber(current.energy, 5, 0, 10);
      const focus = this.validateNumber(current.focus, 5, 0, 10);
      const confidence = this.validateNumber(current.confidence, 5, 0, 10);
      
      // FEATURE 4: Energy drop from previous day
      // Catches fatigue patterns that might lead to urges
      const previousEnergy = previous ? this.validateNumber(previous.energy, 5, 0, 10) : energy;
      const energyDrop = previousEnergy - energy;
      
      // FEATURE 5: Hour of day (0-23)
      // Evening hours (20-23) are typically high-risk
      const hourOfDay = date.getHours();
      
      // FEATURE 6: Is weekend? (0 or 1)
      // Weekends have less structure, often higher risk
      const isWeekend = (date.getDay() === 0 || date.getDay() === 6) ? 1 : 0;
      
      // FEATURE 7: Current streak day
      const streakDay = this.validateNumber(userData.currentStreak, 0, 0, 1000);
      
      // FEATURE 8: In purge phase? (days 15-45)
      // Known high-risk emotional phase
      const inPurgePhase = (streakDay >= 15 && streakDay <= 45) ? 1 : 0;
      
      // FEATURES 9-12: Emotional state from Emotional Timeline check-in
      // These are the MOST PREDICTIVE features for relapse risk
      const emotionalData = this.getLatestEmotionalData(userData, date);
      
      const anxiety = emotionalData.anxiety;           // High = high risk
      const moodStability = emotionalData.mood;        // Low = high risk
      const mentalClarity = emotionalData.clarity;     // Low = impaired judgment
      const emotionalProcessing = emotionalData.processing; // Low = blocked emotions
      
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
        moodStability,
        mentalClarity,
        emotionalProcessing
      ];
      
    } catch (error) {
      console.error('❌ Error extracting features:', error);
      // Return default safe values (12 features)
      return [5, 5, 5, 0, 12, 0, 0, 0, 5, 5, 5, 5];
    }
  }

  /**
   * Get the most recent emotional data from emotionalLog
   * Matches by date or uses most recent entry
   * 
   * @param {Object} userData - User data containing emotionalLog
   * @param {Date} targetDate - Date to find emotional data for
   * @returns {Object} { anxiety, mood, clarity, processing }
   */
  getLatestEmotionalData(userData, targetDate) {
    const defaults = { anxiety: 5, mood: 5, clarity: 5, processing: 5 };
    
    // Check emotionalLog (from Emotional Timeline check-in)
    if (!userData.emotionalLog || userData.emotionalLog.length === 0) {
      return defaults;
    }
    
    const targetDateStr = this.dateToString(targetDate);
    
    // Try to find an entry for the target date
    const matchingEntry = userData.emotionalLog.find(entry => {
      if (!entry.date) return false;
      return this.dateToString(new Date(entry.date)) === targetDateStr;
    });
    
    if (matchingEntry) {
      return {
        anxiety: this.validateNumber(matchingEntry.anxiety, 5, 1, 10),
        mood: this.validateNumber(matchingEntry.mood, 5, 1, 10),
        clarity: this.validateNumber(matchingEntry.clarity, 5, 1, 10),
        processing: this.validateNumber(matchingEntry.processing, 5, 1, 10)
      };
    }
    
    // No exact match - use most recent entry within 3 days
    const sorted = [...userData.emotionalLog]
      .filter(e => e.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (sorted.length > 0) {
      const mostRecent = sorted[0];
      const daysDiff = Math.abs(
        (targetDate - new Date(mostRecent.date)) / (1000 * 60 * 60 * 24)
      );
      
      // Only use if within 3 days (emotional state is relatively recent)
      if (daysDiff <= 3) {
        return {
          anxiety: this.validateNumber(mostRecent.anxiety, 5, 1, 10),
          mood: this.validateNumber(mostRecent.mood, 5, 1, 10),
          clarity: this.validateNumber(mostRecent.clarity, 5, 1, 10),
          processing: this.validateNumber(mostRecent.processing, 5, 1, 10)
        };
      }
    }
    
    return defaults;
  }

  /**
   * Generate training dataset from user's historical data
   * Creates input-output pairs for the neural network
   * UPDATED: Now includes dates for feedback weighting
   * 
   * @param {Object} userData - User's complete historical data
   * @returns {Object} { features: [[...]], labels: [[...]], dates: [...], count: number }
   */
  generateTrainingData(userData) {
    try {
      console.log('🔨 Generating training data from user history...');
      
      // Validate input data
      if (!userData.benefitTracking || userData.benefitTracking.length < 2) {
        console.log('⚠️  Insufficient benefit tracking data');
        return { features: [], labels: [], dates: [], count: 0 };
      }
      
      const features = [];
      const labels = [];
      const dates = [];  // NEW: Track dates for feedback weighting
      
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
        
        // Extract features for this day (now 12 features)
        const dayFeatures = this.extractFeatures(current, previous, currentDate, userData);
        
        features.push(dayFeatures);
        labels.push(hadRelapse ? 1 : 0);
        dates.push(current.date);  // NEW: Store date for this sample
      }
      
      console.log(`✅ Generated ${features.length} training examples (12 features each)`);
      console.log(`   Positive examples (relapses): ${labels.filter(l => l === 1).length}`);
      console.log(`   Negative examples (no relapse): ${labels.filter(l => l === 0).length}`);
      
      return {
        features,
        labels,
        dates,  // NEW: Include dates for feedback weighting
        count: features.length
      };
      
    } catch (error) {
      console.error('❌ Error generating training data:', error);
      return { features: [], labels: [], dates: [], count: 0 };
    }
  }

  /**
   * Get relapse history from streak history
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
   * Now handles 12 features
   * 
   * @param {Array} features - Array of feature arrays
   * @returns {Object} { means: [...], stds: [...] }
   */
  calculateNormalizationStats(features) {
    if (!features || features.length === 0) {
      return null;
    }
    
    const numFeatures = 12; // Updated from 10
    const means = new Array(numFeatures).fill(0);
    const stds = new Array(numFeatures).fill(0);
    
    // Calculate means
    for (const row of features) {
      for (let i = 0; i < numFeatures; i++) {
        means[i] += row[i] || 0;
      }
    }
    for (let i = 0; i < numFeatures; i++) {
      means[i] /= features.length;
    }
    
    // Calculate standard deviations
    for (const row of features) {
      for (let i = 0; i < numFeatures; i++) {
        stds[i] += Math.pow((row[i] || 0) - means[i], 2);
      }
    }
    for (let i = 0; i < numFeatures; i++) {
      stds[i] = Math.sqrt(stds[i] / features.length);
      // Prevent division by zero
      if (stds[i] < 0.001) stds[i] = 1;
    }
    
    console.log('📐 Normalization stats calculated for 12 features');
    
    return { means, stds };
  }

  /**
   * Normalize features using calculated stats
   * 
   * @param {Array} features - Raw feature array
   * @param {Object} stats - { means, stds }
   * @returns {Array} Normalized features
   */
  normalizeFeatures(features, stats) {
    if (!stats || !stats.means || !stats.stds) {
      return features;
    }
    
    return features.map((value, i) => {
      return (value - stats.means[i]) / stats.stds[i];
    });
  }

  /**
   * Validate training data quality
   * 
   * @param {Object} userData - User data
   * @returns {Object} { isValid, message, stats }
   */
  validateTrainingData(userData) {
    const benefitDays = userData.benefitTracking?.length || 0;
    const emotionalDays = userData.emotionalLog?.length || 0;
    const relapses = this.getRelapseHistory(userData).length;
    
    // Minimum requirements
    if (benefitDays < 14) {
      return {
        isValid: false,
        message: `Need ${14 - benefitDays} more days of benefit tracking`,
        stats: { benefitDays, emotionalDays, relapses }
      };
    }
    
    if (relapses < 1) {
      return {
        isValid: false,
        message: 'Need at least 1 relapse in history for pattern learning',
        stats: { benefitDays, emotionalDays, relapses }
      };
    }
    
    // Check for emotional data (not required but improves accuracy)
    const emotionalCoverage = emotionalDays / benefitDays;
    let dataQuality = 'good';
    if (emotionalCoverage < 0.3) {
      dataQuality = 'limited';
    } else if (emotionalCoverage > 0.7) {
      dataQuality = 'excellent';
    }
    
    return {
      isValid: true,
      message: `Ready for training (${dataQuality} emotional data coverage)`,
      stats: { benefitDays, emotionalDays, relapses, emotionalCoverage, dataQuality }
    };
  }

  /**
   * Get data quality report for ML readiness
   * 
   * @param {Object} userData - User data
   * @returns {Object} Quality report
   */
  getDataQualityReport(userData) {
    const benefitDays = userData.benefitTracking?.length || 0;
    const emotionalDays = userData.emotionalLog?.length || 0;
    const relapses = this.getRelapseHistory(userData).length;
    
    return {
      benefitDays,
      emotionalDays,
      relapseCount: relapses,
      hasRelapseData: relapses >= 1,
      canTrain: benefitDays >= 20 && relapses >= 2,
      emotionalCoverage: benefitDays > 0 ? emotionalDays / benefitDays : 0
    };
  }

  /**
   * Helper: Validate a number is within bounds
   */
  validateNumber(value, defaultVal, min, max) {
    const num = parseFloat(value);
    if (isNaN(num)) return defaultVal;
    return Math.max(min, Math.min(max, num));
  }

  /**
   * Helper: Convert date to YYYY-MM-DD string
   */
  dateToString(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

// Export singleton instance
const dataPreprocessor = new DataPreprocessor();
export default dataPreprocessor;