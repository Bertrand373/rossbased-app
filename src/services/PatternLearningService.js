// src/services/PatternLearningService.js
// Bridges MLPredictionService to Stats tab insights
// Extracts human-readable patterns from neural network analysis

import mlPredictionService from './MLPredictionService';

// UNIFIED TRIGGER SYSTEM - for human-readable trigger labels
import { getTriggerLabel, normalizeTrigger } from '../constants/triggerConstants';

class PatternLearningService {
  constructor() {
    this.cachedInsights = null;
    this.lastAnalysisTime = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  // ============================================================
  // TRAINING STATUS
  // ============================================================

  /**
   * Get current training status from ML service
   */
  getTrainingStatus() {
    try {
      const status = mlPredictionService.getTrainingStatus();
      return {
        isTrained: status.isTrained || false,
        lastTrained: status.lastTrained || null,
        lastAccuracy: status.accuracy || null,
        totalEpochs: status.epochs || 0,
        totalDataPoints: status.dataPoints || 0
      };
    } catch (error) {
      console.warn('[PatternLearningService] Training status error:', error);
      return {
        isTrained: false,
        lastTrained: null,
        lastAccuracy: null,
        totalEpochs: 0,
        totalDataPoints: 0
      };
    }
  }

  // ============================================================
  // PATTERN ANALYSIS
  // ============================================================

  /**
   * Analyze user data and extract insights
   * Called by StatsAnalyticsUtils.discoverMLPatterns()
   */
  async analyzePatterns(userData) {
    try {
      // Check cache validity
      if (this.cachedInsights && this.lastAnalysisTime) {
        const cacheAge = Date.now() - this.lastAnalysisTime;
        if (cacheAge < this.CACHE_DURATION) {
          return this.cachedInsights;
        }
      }

      // Ensure ML service is initialized
      await mlPredictionService.initialize();

      const status = this.getTrainingStatus();
      if (!status.isTrained) {
        return null;
      }

      // Extract patterns from user's relapse history
      const insights = this.extractInsightsFromData(userData);
      
      // Cache the results
      this.cachedInsights = insights;
      this.lastAnalysisTime = Date.now();

      return insights;
    } catch (error) {
      console.error('[PatternLearningService] Analysis error:', error);
      return null;
    }
  }

  /**
   * Get cached insights (for sync calls)
   */
  getModelInsights() {
    return this.cachedInsights;
  }

  // ============================================================
  // INSIGHT EXTRACTION
  // ============================================================

  /**
   * Extract actionable insights from user data
   */
  extractInsightsFromData(userData) {
    if (!userData) return null;

    const relapses = (userData.streakHistory || []).filter(s => s.reason === 'relapse');
    const benefitTracking = userData.benefitTracking || [];

    if (relapses.length < 2 || benefitTracking.length < 14) {
      return null;
    }

    const insights = {
      topRiskFactors: this.calculateTopRiskFactors(userData, relapses),
      temporalPatterns: this.analyzeTemporalPatterns(relapses),
      streakVulnerability: this.analyzeStreakVulnerability(relapses),
      benefitCorrelations: this.analyzeBenefitCorrelations(userData, relapses),
      triggerAnalysis: this.analyzeTriggers(relapses)
    };

    return insights;
  }

  /**
   * Calculate which factors most strongly predict relapses
   */
  calculateTopRiskFactors(userData, relapses) {
    const factors = [];
    const benefitTracking = userData.benefitTracking || [];

    if (benefitTracking.length < 7) return factors;

    // Analyze benefit drops before relapses
    const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
    
    metrics.forEach(metric => {
      let dropsBeforeRelapse = 0;
      let totalRelapseChecks = 0;

      relapses.forEach(relapse => {
        if (!relapse.end) return;
        
        const relapseDate = new Date(relapse.end);
        
        // Find benefit data 1-3 days before relapse
        const daysBeforeRelapse = benefitTracking.filter(b => {
          const benefitDate = new Date(b.date);
          const daysDiff = (relapseDate - benefitDate) / (1000 * 60 * 60 * 24);
          return daysDiff >= 1 && daysDiff <= 3;
        });

        if (daysBeforeRelapse.length > 0) {
          totalRelapseChecks++;
          const avgValue = daysBeforeRelapse.reduce((sum, b) => sum + (b[metric] || 5), 0) / daysBeforeRelapse.length;
          if (avgValue < 5) {
            dropsBeforeRelapse++;
          }
        }
      });

      if (totalRelapseChecks > 0) {
        const correlation = dropsBeforeRelapse / totalRelapseChecks;
        if (correlation > 0.3) {
          factors.push({
            factor: metric,
            correlation: correlation,
            description: `Low ${metric} correlates with ${Math.round(correlation * 100)}% of relapses`
          });
        }
      }
    });

    // Check for evening pattern
    const eveningRelapses = relapses.filter(r => {
      if (!r.end) return false;
      const hour = new Date(r.end).getHours();
      return hour >= 20 || hour <= 2;
    });

    if (eveningRelapses.length / relapses.length > 0.4) {
      factors.push({
        factor: 'evening_hours',
        correlation: eveningRelapses.length / relapses.length,
        description: `${Math.round((eveningRelapses.length / relapses.length) * 100)}% of relapses occur in evening`
      });
    }

    // Sort by correlation strength
    return factors.sort((a, b) => b.correlation - a.correlation).slice(0, 3);
  }

  /**
   * Analyze time-based patterns
   */
  analyzeTemporalPatterns(relapses) {
    const hourCounts = {};
    const dayCounts = {};

    relapses.forEach(relapse => {
      if (!relapse.end) return;
      
      const date = new Date(relapse.end);
      const hour = date.getHours();
      const day = date.getDay();

      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    // Find risky hours (20:00 - 02:00 typically)
    const riskyHours = Object.entries(hourCounts)
      .filter(([hour, count]) => count >= 2)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Find risky days
    const riskyDays = Object.entries(dayCounts)
      .filter(([day, count]) => count >= 2)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([day]) => parseInt(day));

    // Evening percentage
    const eveningCount = relapses.filter(r => {
      if (!r.end) return false;
      const hour = new Date(r.end).getHours();
      return hour >= 20 || hour <= 2;
    }).length;

    return {
      riskyHours,
      riskyDays,
      eveningPercentage: relapses.length > 0 ? Math.round((eveningCount / relapses.length) * 100) : 0,
      peakHour: riskyHours[0] || null
    };
  }

  /**
   * Analyze which streak days are most vulnerable
   */
  analyzeStreakVulnerability(relapses) {
    if (relapses.length < 3) {
      return { dangerZone: null, ranges: {} };
    }

    const ranges = {
      early: { start: 1, end: 14, count: 0 },
      mid: { start: 15, end: 30, count: 0 },
      late: { start: 31, end: 60, count: 0 },
      veteran: { start: 61, end: 999, count: 0 }
    };

    relapses.forEach(relapse => {
      const days = relapse.days || 0;
      if (days <= 14) ranges.early.count++;
      else if (days <= 30) ranges.mid.count++;
      else if (days <= 60) ranges.late.count++;
      else ranges.veteran.count++;
    });

    // Find the danger zone (highest concentration)
    const sortedRanges = Object.entries(ranges)
      .sort(([,a], [,b]) => b.count - a.count);

    const topRange = sortedRanges[0];
    const dangerZone = topRange[1].count >= 2 ? {
      name: topRange[0],
      start: topRange[1].start,
      end: topRange[1].end,
      count: topRange[1].count,
      percentage: Math.round((topRange[1].count / relapses.length) * 100)
    } : null;

    return { dangerZone, ranges };
  }

  /**
   * Analyze benefit levels correlation with relapses
   */
  analyzeBenefitCorrelations(userData, relapses) {
    const benefitTracking = userData.benefitTracking || [];
    if (benefitTracking.length < 10) return null;

    const metrics = ['energy', 'focus', 'confidence'];
    const correlations = [];

    metrics.forEach(metric => {
      // Calculate average on relapse days vs normal days
      let relapseAvg = 0;
      let normalAvg = 0;
      let relapseCount = 0;
      let normalCount = 0;

      benefitTracking.forEach(entry => {
        const entryDate = new Date(entry.date).toDateString();
        const isRelapseDay = relapses.some(r => 
          r.end && new Date(r.end).toDateString() === entryDate
        );

        const value = entry[metric] || 5;
        
        if (isRelapseDay) {
          relapseAvg += value;
          relapseCount++;
        } else {
          normalAvg += value;
          normalCount++;
        }
      });

      if (relapseCount > 0 && normalCount > 0) {
        relapseAvg /= relapseCount;
        normalAvg /= normalCount;

        const diff = normalAvg - relapseAvg;
        if (diff > 0.5) {
          correlations.push({
            metric,
            normalAvg: normalAvg.toFixed(1),
            relapseAvg: relapseAvg.toFixed(1),
            difference: diff.toFixed(1)
          });
        }
      }
    });

    return correlations.sort((a, b) => parseFloat(b.difference) - parseFloat(a.difference));
  }

  /**
   * Analyze trigger patterns
   * UPDATED: Uses unified trigger system for human-readable labels
   */
  analyzeTriggers(relapses) {
    const triggerCounts = {};

    relapses.forEach(relapse => {
      // Normalize trigger ID for backward compatibility with old data
      const rawTrigger = relapse.trigger || 'unknown';
      const normalizedTrigger = normalizeTrigger(rawTrigger);
      triggerCounts[normalizedTrigger] = (triggerCounts[normalizedTrigger] || 0) + 1;
    });

    const sorted = Object.entries(triggerCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([triggerId, count]) => ({
        trigger: triggerId,
        // Use unified trigger system for human-readable label
        triggerLabel: getTriggerLabel(triggerId),
        count,
        percentage: Math.round((count / relapses.length) * 100)
      }));

    return {
      primary: sorted[0] || null,
      secondary: sorted[1] || null,
      all: sorted
    };
  }

  // ============================================================
  // CACHE MANAGEMENT
  // ============================================================

  /**
   * Clear cached insights (call when user data changes significantly)
   */
  clearCache() {
    this.cachedInsights = null;
    this.lastAnalysisTime = null;
  }
}

// Singleton instance
const patternLearningService = new PatternLearningService();

export default patternLearningService;