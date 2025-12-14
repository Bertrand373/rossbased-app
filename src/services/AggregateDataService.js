// src/services/AggregateDataService.js
// Handles extraction and submission of anonymized ML patterns
// PRIVACY: Never sends userId, email, dates, or journal content

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://app.rossbased.com';

class AggregateDataService {
  constructor() {
    this.lastSubmission = null;
    this.SUBMISSION_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours between submissions
    this.COOLDOWN_KEY = 'aggregate_last_submission';
  }

  /**
   * Check if user has opted in to anonymous data sharing
   * @param {Object} userData - User data object
   * @returns {boolean}
   */
  isOptedIn(userData) {
    return userData?.anonymousDataSharing === true;
  }

  /**
   * Check if enough time has passed since last submission
   * Prevents excessive API calls
   */
  canSubmit() {
    try {
      const lastSubmission = localStorage.getItem(this.COOLDOWN_KEY);
      if (!lastSubmission) return true;
      
      const elapsed = Date.now() - parseInt(lastSubmission, 10);
      return elapsed >= this.SUBMISSION_COOLDOWN;
    } catch {
      return true;
    }
  }

  /**
   * Extract anonymized patterns from user data
   * CRITICAL: This method NEVER includes identifying information
   * 
   * @param {Object} userData - Full user data
   * @param {Object} trainingMetrics - Metrics from model training
   * @returns {Object} Anonymized pattern object
   */
  extractPatterns(userData, trainingMetrics) {
    const benefitTracking = userData.benefitTracking || [];
    const streakHistory = userData.streakHistory || [];
    
    // Get relapses
    const relapses = streakHistory.filter(s => s.reason === 'relapse');
    
    // ANONYMIZED: Streak lengths at relapse (just numbers, no dates)
    const streakDaysAtRelapse = relapses
      .map(r => r.days || 0)
      .filter(d => d > 0);

    // ANONYMIZED: Average benefits before relapses
    const avgBenefitsBeforeRelapse = this.calculateAverageBenefitsBeforeRelapses(
      benefitTracking, 
      relapses
    );

    // ANONYMIZED: Risk factor correlations
    const riskFactorCorrelations = this.calculateRiskCorrelations(
      benefitTracking,
      relapses
    );

    return {
      streakDaysAtRelapse,
      avgBenefitsBeforeRelapse,
      riskFactorCorrelations,
      totalRelapses: relapses.length,
      totalDaysTracked: benefitTracking.length,
      modelMetrics: trainingMetrics ? {
        precision: trainingMetrics.precision,
        recall: trainingMetrics.recall,
        f1Score: trainingMetrics.f1Score,
        accuracy: trainingMetrics.accuracy
      } : null
    };
  }

  /**
   * Calculate average benefit levels in the days before relapses
   * Returns averages only - no dates or specific entries
   */
  calculateAverageBenefitsBeforeRelapses(benefitTracking, relapses) {
    if (benefitTracking.length < 3 || relapses.length === 0) {
      return null;
    }

    const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
    const totals = {};
    const counts = {};
    
    metrics.forEach(m => {
      totals[m] = 0;
      counts[m] = 0;
    });

    // For each relapse, look at the 3 days before
    relapses.forEach(relapse => {
      if (!relapse.end) return;
      
      const relapseDate = new Date(relapse.end);
      
      // Find benefit entries in the 3 days before
      benefitTracking.forEach(entry => {
        if (!entry.date) return;
        
        const entryDate = new Date(entry.date);
        const daysBefore = (relapseDate - entryDate) / (1000 * 60 * 60 * 24);
        
        // Within 3 days before relapse
        if (daysBefore >= 0 && daysBefore <= 3) {
          metrics.forEach(m => {
            if (typeof entry[m] === 'number') {
              totals[m] += entry[m];
              counts[m]++;
            }
          });
        }
      });
    });

    // Calculate averages
    const averages = {};
    metrics.forEach(m => {
      if (counts[m] > 0) {
        averages[m] = Math.round((totals[m] / counts[m]) * 100) / 100;
      }
    });

    return Object.keys(averages).length > 0 ? averages : null;
  }

  /**
   * Calculate correlations between risk factors and relapses
   * Returns correlation coefficients only - no specific data points
   */
  calculateRiskCorrelations(benefitTracking, relapses) {
    if (benefitTracking.length < 7 || relapses.length === 0) {
      return null;
    }

    let eveningRelapses = 0;
    let weekendRelapses = 0;
    let lowEnergyRelapses = 0;
    let lowFocusRelapses = 0;
    let totalRelapses = relapses.length;

    // Create a set of relapse dates for quick lookup
    const relapseDateStrings = new Set(
      relapses
        .filter(r => r.end)
        .map(r => new Date(r.end).toDateString())
    );

    // Check each relapse for risk factors
    relapses.forEach(relapse => {
      if (!relapse.end) return;
      
      const relapseDate = new Date(relapse.end);
      const dateStr = relapseDate.toDateString();
      
      // Evening (after 8 PM) - approximated from trigger data if available
      // For now, estimate based on common patterns
      eveningRelapses += 0.6; // Placeholder - would be calculated from actual time data
      
      // Weekend
      const day = relapseDate.getDay();
      if (day === 0 || day === 6) {
        weekendRelapses++;
      }
    });

    // Check benefit levels on relapse days
    benefitTracking.forEach(entry => {
      if (!entry.date) return;
      
      const entryDateStr = new Date(entry.date).toDateString();
      if (relapseDateStrings.has(entryDateStr)) {
        if (entry.energy && entry.energy < 4) lowEnergyRelapses++;
        if (entry.focus && entry.focus < 4) lowFocusRelapses++;
      }
    });

    return {
      evening: Math.min(eveningRelapses / totalRelapses, 1),
      weekend: weekendRelapses / totalRelapses,
      lowEnergy: lowEnergyRelapses / totalRelapses,
      lowFocus: lowFocusRelapses / totalRelapses,
      emotionalLoad: 0.5 // Placeholder - would be calculated from emotional timeline data
    };
  }

  /**
   * Submit anonymized patterns to backend
   * Called after successful training if user has opted in
   * 
   * @param {Object} userData - User data (for extraction)
   * @param {Object} trainingMetrics - Metrics from training
   * @returns {Promise<boolean>} Success status
   */
  async submitPatterns(userData, trainingMetrics) {
    // Check opt-in
    if (!this.isOptedIn(userData)) {
      console.log('📊 Aggregate sharing: User not opted in, skipping');
      return false;
    }

    // Check cooldown
    if (!this.canSubmit()) {
      console.log('📊 Aggregate sharing: Cooldown period, skipping');
      return false;
    }

    try {
      // Extract patterns (completely anonymized)
      const patterns = this.extractPatterns(userData, trainingMetrics);

      // Validate we have enough data to be useful
      if (patterns.totalRelapses < 2 || patterns.totalDaysTracked < 14) {
        console.log('📊 Aggregate sharing: Insufficient data for useful patterns');
        return false;
      }

      // PRIVACY CHECK: Ensure no identifying data
      if (patterns.userId || patterns.email || patterns.dates) {
        console.error('❌ PRIVACY VIOLATION: Pattern extraction included identifying data');
        return false;
      }

      // Submit to backend
      const response = await fetch(`${API_BASE_URL}/api/ml/aggregate-patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // NO auth header - this is anonymous
        body: JSON.stringify(patterns)
      });

      if (response.ok) {
        // Record submission time
        localStorage.setItem(this.COOLDOWN_KEY, Date.now().toString());
        console.log('✅ Aggregate patterns submitted successfully');
        return true;
      } else {
        const error = await response.json();
        console.warn('⚠️ Aggregate submission failed:', error);
        return false;
      }

    } catch (error) {
      console.error('❌ Aggregate submission error:', error);
      return false;
    }
  }
}

// Singleton instance
const aggregateDataService = new AggregateDataService();

export default aggregateDataService;
