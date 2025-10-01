// src/services/PredictionService.js
// AI Prediction Service for Urge Detection

class PredictionService {
  constructor() {
    this.weights = {
      energyDrop: 25,
      eveningHours: 20,
      weekend: 10,
      emotionalVulnerability: 15,
      historicalPattern: 20,
      purgePhase: 15
    };
    this.feedbackData = [];
    this.loadFeedbackData();
  }

  // Main prediction function (alias for compatibility)
  predict(userData) {
    if (!userData || !userData.currentStreak) {
      return {
        riskScore: 0,
        confidence: 0,
        reason: 'Insufficient data for prediction',
        factors: {},
        dataPoints: 0
      };
    }

    let riskScore = 0;
    const factors = {};
    const reasons = [];

    // Factor 1: Energy Drop Detection
    const energyFactor = this.checkEnergyDrop(userData);
    if (energyFactor.isRisk) {
      riskScore += this.weights.energyDrop;
      factors.energyDrop = energyFactor.score;
      reasons.push(energyFactor.reason);
    }

    // Factor 2: Time of Day
    const timeFactor = this.checkTimeOfDay();
    if (timeFactor.isRisk) {
      riskScore += this.weights.eveningHours;
      factors.timeOfDay = timeFactor.score;
      reasons.push(timeFactor.reason);
    }

    // Factor 3: Weekend Risk
    const weekendFactor = this.checkWeekend();
    if (weekendFactor.isRisk) {
      riskScore += this.weights.weekend;
      factors.weekend = weekendFactor.score;
      reasons.push('Weekend (less structure)');
    }

    // Factor 4: Emotional Vulnerability
    const emotionalFactor = this.checkEmotionalState(userData);
    if (emotionalFactor.isRisk) {
      riskScore += this.weights.emotionalVulnerability;
      factors.emotional = emotionalFactor.score;
      reasons.push(emotionalFactor.reason);
    }

    // Factor 5: Historical Pattern Match
    const historyFactor = this.checkHistoricalPattern(userData);
    if (historyFactor.isRisk) {
      riskScore += this.weights.historicalPattern;
      factors.historical = historyFactor.score;
      reasons.push(historyFactor.reason);
    }

    // Factor 6: Purge Phase (Days 15-45)
    const purgeFactor = this.checkPurgePhase(userData.currentStreak);
    if (purgeFactor.isRisk) {
      riskScore += this.weights.purgePhase;
      factors.purgePhase = purgeFactor.score;
      reasons.push('In emotional purging phase');
    }

    // Cap at 100
    riskScore = Math.min(Math.round(riskScore), 100);

    // Calculate confidence based on data availability
    const dataPoints = this.calculateDataPoints(userData);
    const confidence = Math.min(Math.round((dataPoints / 30) * 100), 95);

    return {
      riskScore,
      confidence,
      reason: reasons.length > 0 ? reasons.join(' + ') : 'No significant risk factors detected',
      factors,
      dataPoints,
      similarPastRelapse: historyFactor.matchedRelapse || null
    };
  }

  checkEnergyDrop(userData) {
    if (!userData.benefitTracking || userData.benefitTracking.length < 3) {
      return { isRisk: false, score: 0 };
    }

    // Get last 3 days of energy data
    const recentData = userData.benefitTracking.slice(-3);
    const energyLevels = recentData.map(d => d.energy || 5);

    // Check for drop
    const firstEnergy = energyLevels[0];
    const lastEnergy = energyLevels[energyLevels.length - 1];
    const drop = firstEnergy - lastEnergy;

    if (drop >= 3) {
      return {
        isRisk: true,
        score: 25,
        reason: `Energy dropped ${drop} points in last 3 days`
      };
    }

    return { isRisk: false, score: 0 };
  }

  checkTimeOfDay() {
    const hour = new Date().getHours();
    
    if (hour >= 20 && hour <= 23) {
      return {
        isRisk: true,
        score: 20,
        reason: 'Evening hours (high-risk time)'
      };
    }

    return { isRisk: false, score: 0 };
  }

  checkWeekend() {
    const day = new Date().getDay();
    const isWeekend = day === 0 || day === 6;

    return {
      isRisk: isWeekend,
      score: isWeekend ? 10 : 0
    };
  }

  checkEmotionalState(userData) {
    if (!userData.emotionalTracking || userData.emotionalTracking.length === 0) {
      return { isRisk: false, score: 0 };
    }

    const latest = userData.emotionalTracking[userData.emotionalTracking.length - 1];
    const anxiety = latest.anxiety || 5;
    const mood = latest.moodStability || 5;

    if (anxiety > 7 && mood < 4) {
      return {
        isRisk: true,
        score: 15,
        reason: 'High anxiety + low mood stability'
      };
    }

    return { isRisk: false, score: 0 };
  }

  checkHistoricalPattern(userData) {
    if (!userData.streakHistory || userData.streakHistory.length === 0) {
      return { isRisk: false, score: 0 };
    }

    const currentDay = userData.currentStreak;
    const relapses = userData.streakHistory.filter(s => s.reason === 'relapse');

    // Find relapse that happened on similar day
    const similarRelapse = relapses.find(r => {
      const dayDiff = Math.abs(r.days - currentDay);
      return dayDiff <= 3; // Within 3 days
    });

    if (similarRelapse) {
      return {
        isRisk: true,
        score: 20,
        reason: `Similar pattern to past relapse`,
        matchedRelapse: similarRelapse
      };
    }

    return { isRisk: false, score: 0 };
  }

  checkPurgePhase(currentStreak) {
    if (currentStreak >= 15 && currentStreak <= 45) {
      return {
        isRisk: true,
        score: 15
      };
    }

    return { isRisk: false, score: 0 };
  }

  calculateDataPoints(userData) {
    let points = 0;
    
    if (userData.benefitTracking) points += userData.benefitTracking.length;
    if (userData.emotionalTracking) points += userData.emotionalTracking.length;
    if (userData.streakHistory) points += userData.streakHistory.length * 2;
    
    return points;
  }

  // Update weights based on user feedback
  updateWeights(feedback) {
    const adjustmentRate = 0.05; // 5% adjustment per feedback

    this.feedbackData.push(feedback);

    if (feedback.userFeedback === 'helpful') {
      // Increase weights for factors that contributed to accurate prediction
      Object.keys(feedback.factors || {}).forEach(factor => {
        const weightKey = this.getWeightKey(factor);
        if (weightKey && this.weights[weightKey]) {
          this.weights[weightKey] = Math.min(
            this.weights[weightKey] * (1 + adjustmentRate),
            35 // Cap at 35
          );
        }
      });
    } else if (feedback.userFeedback === 'false_alarm') {
      // Decrease weights for factors that contributed to false alarm
      Object.keys(feedback.factors || {}).forEach(factor => {
        const weightKey = this.getWeightKey(factor);
        if (weightKey && this.weights[weightKey]) {
          this.weights[weightKey] = Math.max(
            this.weights[weightKey] * (1 - adjustmentRate),
            5 // Don't go below 5
          );
        }
      });
    }

    // Save updated weights and feedback
    this.saveFeedbackData();
  }

  // Map factor names to weight keys
  getWeightKey(factor) {
    const mapping = {
      energyDrop: 'energyDrop',
      timeOfDay: 'eveningHours',
      weekend: 'weekend',
      emotional: 'emotionalVulnerability',
      historical: 'historicalPattern',
      purgePhase: 'purgePhase'
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
      localStorage.setItem('prediction_feedback', JSON.stringify(this.feedbackData));
      localStorage.setItem('prediction_weights', JSON.stringify(this.weights));
    } catch (error) {
      console.error('Failed to save feedback data:', error);
    }
  }

  // Load feedback data from localStorage
  loadFeedbackData() {
    try {
      const savedFeedback = localStorage.getItem('prediction_feedback');
      if (savedFeedback) {
        this.feedbackData = JSON.parse(savedFeedback);
      }

      const savedWeights = localStorage.getItem('prediction_weights');
      if (savedWeights) {
        this.weights = { ...this.weights, ...JSON.parse(savedWeights) };
      }
    } catch (error) {
      console.error('Failed to load feedback data:', error);
    }
  }
}

// Create singleton instance
const predictionService = new PredictionService();

export default predictionService;