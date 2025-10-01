// AI-Powered Urge Prediction Service
// Analyzes user data to predict high-risk moments 15-30 minutes in advance

import * as tf from '@tensorflow/tfjs';
import { format, parseISO, differenceInDays, getHours, getDay } from 'date-fns';

class PredictionService {
  constructor() {
    this.model = null;
    this.isInitialized = false;
    this.predictionHistory = [];
    this.feedbackData = [];
    
    // Learning weights (these improve over time with user feedback)
    this.weights = {
      energyDrop: 0.25,        // 25% impact when energy drops
      timeOfDay: 0.20,         // 20% impact for evening hours
      weekendFactor: 0.10,     // 10% impact on weekends
      emotionalState: 0.15,    // 15% impact for anxiety/mood combo
      historicalPattern: 0.20, // 20% impact when pattern matches past relapse
      streakPhase: 0.10        // 10% impact during emotional purging phase (days 15-45)
    };
  }

  // Initialize the prediction service
  async initialize() {
    try {
      await tf.ready();
      this.isInitialized = true;
      this.loadFeedbackData();
      console.log('✅ Prediction Service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize prediction service:', error);
      return false;
    }
  }

  // Main prediction function - calculates risk score 0-100
  async predictUrgeRisk(userData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!userData || !userData.benefitTracking || userData.benefitTracking.length === 0) {
      return {
        riskScore: 0,
        confidence: 0,
        reason: 'Insufficient data',
        recommendations: []
      };
    }

    const now = new Date();
    let riskScore = 0;
    const reasons = [];
    const factors = {};

    // Factor 1: Energy Drop Detection
    const energyScore = this.analyzeEnergyTrend(userData.benefitTracking);
    if (energyScore.isDrop) {
      const points = energyScore.dropAmount * this.weights.energyDrop * 100;
      riskScore += points;
      factors.energyDrop = points;
      reasons.push(`Energy dropped ${energyScore.dropAmount} points in ${energyScore.days} days`);
    }

    // Factor 2: Time of Day (8 PM - 11 PM is highest risk)
    const timeScore = this.analyzeTimeOfDay(now);
    if (timeScore.isHighRisk) {
      const points = this.weights.timeOfDay * 100;
      riskScore += points;
      factors.timeOfDay = points;
      reasons.push(`Evening hours (${timeScore.hour}:00) - high risk period`);
    }

    // Factor 3: Weekend Effect
    const dayOfWeek = getDay(now);
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const points = this.weights.weekendFactor * 100;
      riskScore += points;
      factors.weekend = points;
      reasons.push('Weekend - less structure and routine');
    }

    // Factor 4: Emotional Vulnerability
    const emotionalScore = this.analyzeEmotionalState(userData.emotionalTracking);
    if (emotionalScore.isVulnerable) {
      const points = emotionalScore.severity * this.weights.emotionalState * 100;
      riskScore += points;
      factors.emotional = points;
      reasons.push(`High anxiety (${emotionalScore.anxiety}/10) + Low mood (${emotionalScore.mood}/10)`);
    }

    // Factor 5: Historical Pattern Matching
    const patternScore = this.matchHistoricalPatterns(userData, {
      energyDrop: energyScore.isDrop,
      timeOfDay: timeScore.isHighRisk,
      emotional: emotionalScore.isVulnerable
    });
    if (patternScore.matchesRelapse) {
      const points = this.weights.historicalPattern * 100;
      riskScore += points;
      factors.historical = points;
      reasons.push(`Similar to your Day ${patternScore.dayOfRelapse} relapse`);
    }

    // Factor 6: Streak Phase (Days 15-45 = emotional purging phase)
    const currentStreak = userData.currentStreak || 0;
    if (currentStreak >= 15 && currentStreak <= 45) {
      const points = this.weights.streakPhase * 100;
      riskScore += points;
      factors.streakPhase = points;
      reasons.push(`Day ${currentStreak} - emotional purging phase`);
    }

    // Cap at 100
    riskScore = Math.min(Math.round(riskScore), 100);

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(userData);

    // Get personalized recommendations
    const recommendations = this.getRecommendations(factors, riskScore);

    const prediction = {
      riskScore,
      confidence,
      reason: reasons.join(' + '),
      factors,
      recommendations,
      timestamp: now.toISOString()
    };

    // Store prediction for history
    this.predictionHistory.push(prediction);
    if (this.predictionHistory.length > 1000) {
      this.predictionHistory = this.predictionHistory.slice(-1000);
    }

    return prediction;
  }

  // Analyze energy trend over last 3-7 days
  analyzeEnergyTrend(benefitTracking) {
    if (benefitTracking.length < 2) {
      return { isDrop: false, dropAmount: 0, days: 0 };
    }

    // Sort by date, most recent first
    const sorted = [...benefitTracking].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    // Get last 3 days of energy data
    const recentEnergy = sorted.slice(0, 3).map(d => d.energy || 5);
    
    if (recentEnergy.length < 2) {
      return { isDrop: false, dropAmount: 0, days: 0 };
    }

    // Calculate drop from first to last
    const energyDrop = recentEnergy[0] - recentEnergy[recentEnergy.length - 1];
    
    // Drop of 3+ points is significant
    if (energyDrop >= 3) {
      return {
        isDrop: true,
        dropAmount: energyDrop,
        days: recentEnergy.length
      };
    }

    return { isDrop: false, dropAmount: energyDrop, days: recentEnergy.length };
  }

  // Analyze time of day risk
  analyzeTimeOfDay(date) {
    const hour = getHours(date);
    
    // 8 PM (20:00) to 11 PM (23:00) is highest risk
    if (hour >= 20 && hour <= 23) {
      return { isHighRisk: true, hour, riskLevel: 'high' };
    }
    
    // 11 PM to 2 AM is also risky (late night)
    if (hour >= 23 || hour <= 2) {
      return { isHighRisk: true, hour, riskLevel: 'medium' };
    }

    return { isHighRisk: false, hour, riskLevel: 'low' };
  }

  // Analyze emotional vulnerability
  analyzeEmotionalState(emotionalTracking) {
    if (!emotionalTracking || emotionalTracking.length === 0) {
      return { isVulnerable: false, anxiety: 5, mood: 5, severity: 0 };
    }

    // Get most recent emotional data
    const sorted = [...emotionalTracking].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    const latest = sorted[0];

    const anxiety = latest.anxiety || 5;
    const mood = latest.moodStability || 5;

    // High anxiety (>7) + Low mood (<4) = vulnerable
    if (anxiety >= 7 && mood <= 4) {
      const severity = (anxiety - 7 + (5 - mood)) / 6; // 0 to 1
      return {
        isVulnerable: true,
        anxiety,
        mood,
        severity
      };
    }

    return { isVulnerable: false, anxiety, mood, severity: 0 };
  }

  // Match current conditions against past relapses
  matchHistoricalPatterns(userData, currentConditions) {
    if (!userData.streakHistory || userData.streakHistory.length === 0) {
      return { matchesRelapse: false, dayOfRelapse: null };
    }

    // Find relapses (not just completed streaks)
    const relapses = userData.streakHistory.filter(s => s.reason === 'relapse');
    
    if (relapses.length === 0) {
      return { matchesRelapse: false, dayOfRelapse: null };
    }

    // Check if any relapse had similar conditions
    for (const relapse of relapses) {
      // If we stored trigger conditions, match them
      const triggerMatches = relapse.trigger && (
        (relapse.trigger === 'stress' && currentConditions.emotional) ||
        (relapse.trigger === 'evening' && currentConditions.timeOfDay) ||
        (relapse.trigger === 'low_energy' && currentConditions.energyDrop)
      );

      if (triggerMatches || currentConditions.energyDrop) {
        return {
          matchesRelapse: true,
          dayOfRelapse: relapse.days || relapse.end,
          trigger: relapse.trigger
        };
      }
    }

    return { matchesRelapse: false, dayOfRelapse: null };
  }

  // Calculate confidence based on data quality
  calculateConfidence(userData) {
    let confidence = 50; // Start at 50%

    // More benefit tracking data = higher confidence
    if (userData.benefitTracking && userData.benefitTracking.length > 7) {
      confidence += 15;
    }

    // Emotional tracking present = higher confidence
    if (userData.emotionalTracking && userData.emotionalTracking.length > 0) {
      confidence += 10;
    }

    // Has relapse history = higher confidence
    if (userData.streakHistory && userData.streakHistory.length > 0) {
      confidence += 15;
    }

    // Has user feedback = much higher confidence
    if (this.feedbackData.length > 5) {
      confidence += 10;
    }

    return Math.min(confidence, 95); // Cap at 95%
  }

  // Get personalized recommendations based on risk factors
  getRecommendations(factors, riskScore) {
    const recommendations = [];

    if (riskScore < 40) {
      recommendations.push({
        action: 'monitor',
        message: 'Risk is low. Keep doing what you\'re doing!',
        tool: null
      });
    } else if (riskScore >= 40 && riskScore < 70) {
      recommendations.push({
        action: 'preventive',
        message: 'Consider a quick cold shower or walk',
        tool: 'physical_reset'
      });
    } else {
      // High risk - immediate intervention
      if (factors.energyDrop || factors.emotional) {
        recommendations.push({
          action: 'breathing',
          message: 'Start breathing exercise NOW',
          tool: 'breathing_exercise',
          priority: 'high'
        });
      }
      
      recommendations.push({
        action: 'physical',
        message: 'Physical reset protocol - 20 pushups',
        tool: 'physical_reset',
        priority: 'high'
      });

      recommendations.push({
        action: 'emergency',
        message: 'This is a critical moment - use emergency toolkit',
        tool: 'emergency_toolkit',
        priority: 'critical'
      });
    }

    return recommendations;
  }

  // Record user feedback to improve predictions
  recordFeedback(prediction, feedback) {
    const feedbackEntry = {
      timestamp: new Date().toISOString(),
      predictedRisk: prediction.riskScore,
      confidence: prediction.confidence,
      factors: prediction.factors,
      userFeedback: feedback.helpful ? 'helpful' : 'false_alarm',
      outcome: feedback.outcome || 'unknown',
      notes: feedback.notes || ''
    };

    this.feedbackData.push(feedbackEntry);
    
    // Keep only last 100 feedback entries
    if (this.feedbackData.length > 100) {
      this.feedbackData = this.feedbackData.slice(-100);
    }

    // Save to localStorage
    this.saveFeedbackData();

    // Adjust weights based on feedback
    this.adjustWeights(feedbackEntry);

    return feedbackEntry;
  }

  // Adjust prediction weights based on user feedback
  adjustWeights(feedback) {
    const adjustmentRate = 0.05; // 5% adjustment per feedback

    if (feedback.userFeedback === 'helpful') {
      // Increase weights for factors that contributed to accurate prediction
      Object.keys(feedback.factors).forEach(factor => {
        const weightKey = this.getWeightKey(factor);
        if (weightKey && this.weights[weightKey]) {
          this.weights[weightKey] = Math.min(
            this.weights[weightKey] * (1 + adjustmentRate),
            0.35 // Cap at 35%
          );
        }
      });
    } else if (feedback.userFeedback === 'false_alarm') {
      // Decrease weights for factors that contributed to false alarm
      Object.keys(feedback.factors).forEach(factor => {
        const weightKey = this.getWeightKey(factor);
        if (weightKey && this.weights[weightKey]) {
          this.weights[weightKey] = Math.max(
            this.weights[weightKey] * (1 - adjustmentRate),
            0.05 // Don't go below 5%
          );
        }
      });
    }

    // Save updated weights
    this.saveWeights();
  }

  // Map factor names to weight keys
  getWeightKey(factor) {
    const mapping = {
      energyDrop: 'energyDrop',
      timeOfDay: 'timeOfDay',
      weekend: 'weekendFactor',
      emotional: 'emotionalState',
      historical: 'historicalPattern',
      streakPhase: 'streakPhase'
    };
    return mapping[factor];
  }

  // Get prediction accuracy over last N predictions
  getAccuracy(days = 30) {
    if (this.feedbackData.length === 0) {
      return { accuracy: 0, totalPredictions: 0 };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentFeedback = this.feedbackData.filter(f => 
      new Date(f.timestamp) >= cutoffDate
    );

    if (recentFeedback.length === 0) {
      return { accuracy: 0, totalPredictions: 0 };
    }

    const helpful = recentFeedback.filter(f => f.userFeedback === 'helpful').length;
    const accuracy = (helpful / recentFeedback.length) * 100;

    return {
      accuracy: Math.round(accuracy),
      totalPredictions: recentFeedback.length,
      helpful,
      falseAlarms: recentFeedback.length - helpful
    };
  }

  // Save feedback data to localStorage
  saveFeedbackData() {
    try {
      localStorage.setItem('titan_prediction_feedback', JSON.stringify(this.feedbackData));
      localStorage.setItem('titan_prediction_weights', JSON.stringify(this.weights));
    } catch (error) {
      console.error('Failed to save feedback data:', error);
    }
  }

  // Load feedback data from localStorage
  loadFeedbackData() {
    try {
      const savedFeedback = localStorage.getItem('titan_prediction_feedback');
      if (savedFeedback) {
        this.feedbackData = JSON.parse(savedFeedback);
      }

      const savedWeights = localStorage.getItem('titan_prediction_weights');
      if (savedWeights) {
        this.weights = { ...this.weights, ...JSON.parse(savedWeights) };
      }
    } catch (error) {
      console.error('Failed to load feedback data:', error);
    }
  }

  // Save weights to localStorage
  saveWeights() {
    try {
      localStorage.setItem('titan_prediction_weights', JSON.stringify(this.weights));
    } catch (error) {
      console.error('Failed to save weights:', error);
    }
  }

  // Get prediction history
  getHistory(limit = 50) {
    return this.predictionHistory.slice(-limit);
  }
}

// Export singleton instance
const predictionService = new PredictionService();
export default predictionService;