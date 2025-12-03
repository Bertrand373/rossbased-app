// src/services/MLPredictionService.js
// ENHANCED: Detailed pattern analysis for insights display

import * as tf from '@tensorflow/tfjs';
import notificationService from './NotificationService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

class MLPredictionService {
  constructor() {
    this.model = null;
    this.isModelReady = false;
    this.isTraining = false;
    this.MIN_TRAINING_DATA = 20;
    this.MODEL_SAVE_PATH = 'indexeddb://titantrack-urge-model';
    this.trainingHistory = {
      accuracy: [],
      loss: [],
      lastTrained: null,
      totalEpochs: 0
    };
    this.normalizationStats = null;
    
    console.log('🧠 MLPredictionService initialized');
  }

  async initialize() {
    try {
      console.log('🔄 Initializing AI Prediction Service...');
      
      this.loadTrainingHistory();
      this.loadNormalizationStats();
      
      const modelLoaded = await this.loadModel();
      
      if (modelLoaded && this.trainingHistory.lastTrained) {
        console.log('✅ Loaded existing trained model');
        this.isModelReady = true;
      } else if (modelLoaded && !this.trainingHistory.lastTrained) {
        console.log('⚠️ Model file exists but was never trained');
        this.isModelReady = false;
        await this.createModel();
      } else {
        console.log('📦 Creating new neural network...');
        await this.createModel();
        this.isModelReady = false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error initializing AI service:', error);
      await this.createModel();
      this.isModelReady = false;
      return false;
    }
  }

  async createModel() {
    try {
      this.model = tf.sequential();
      
      this.model.add(tf.layers.dense({
        units: 16,
        inputShape: [10],
        activation: 'relu',
        kernelInitializer: 'heNormal'
      }));
      
      this.model.add(tf.layers.dropout({ rate: 0.2 }));
      
      this.model.add(tf.layers.dense({
        units: 8,
        activation: 'relu',
        kernelInitializer: 'heNormal'
      }));
      
      this.model.add(tf.layers.dropout({ rate: 0.2 }));
      
      this.model.add(tf.layers.dense({
        units: 1,
        activation: 'sigmoid'
      }));
      
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error creating model:', error);
      throw error;
    }
  }

  async loadModel() {
    try {
      this.model = await tf.loadLayersModel(this.MODEL_SAVE_PATH);
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async saveModel() {
    if (this.model) {
      await this.model.save(this.MODEL_SAVE_PATH);
    }
  }

  saveTrainingHistory() {
    localStorage.setItem('ml_training_history', JSON.stringify(this.trainingHistory));
  }

  loadTrainingHistory() {
    const saved = localStorage.getItem('ml_training_history');
    if (saved) {
      this.trainingHistory = JSON.parse(saved);
    }
  }

  saveNormalizationStats() {
    if (this.normalizationStats) {
      localStorage.setItem('ml_normalization_stats', JSON.stringify(this.normalizationStats));
    }
  }

  loadNormalizationStats() {
    const saved = localStorage.getItem('ml_normalization_stats');
    if (saved) {
      this.normalizationStats = JSON.parse(saved);
    }
  }

  // ============================================================
  // PATTERN ANALYSIS METHODS
  // ============================================================

  /**
   * Analyze streak day patterns - when in their streak do they typically relapse?
   */
  analyzeStreakPatterns(userData) {
    const relapses = (userData.streakHistory || [])
      .filter(s => s.reason === 'relapse' && s.days)
      .map(s => s.days);
    
    if (relapses.length < 2) {
      return null;
    }

    const currentDay = userData.currentStreak || 0;
    
    // Find relapses within a similar day range (±5 days)
    const similarDayRelapses = relapses.filter(d => 
      Math.abs(d - currentDay) <= 5
    );
    
    // Find the most common relapse day range
    const ranges = {
      early: relapses.filter(d => d <= 14).length,
      mid: relapses.filter(d => d > 14 && d <= 30).length,
      late: relapses.filter(d => d > 30 && d <= 60).length,
      veteran: relapses.filter(d => d > 60).length
    };
    
    // Determine current range
    let currentRange = 'early';
    if (currentDay > 60) currentRange = 'veteran';
    else if (currentDay > 30) currentRange = 'late';
    else if (currentDay > 14) currentRange = 'mid';
    
    const relapsesInCurrentRange = ranges[currentRange];
    const totalRelapses = relapses.length;
    
    // Calculate percentage
    const rangePercentage = Math.round((relapsesInCurrentRange / totalRelapses) * 100);
    
    // Find the range boundaries for display
    const rangeBoundaries = {
      early: [1, 14],
      mid: [15, 30],
      late: [31, 60],
      veteran: [60, 90]
    };
    
    return {
      currentDay,
      similarDayRelapses: similarDayRelapses.length,
      totalRelapses,
      relapsesInRange: relapsesInCurrentRange,
      rangePercentage,
      rangeDays: rangeBoundaries[currentRange],
      isHighRiskDay: similarDayRelapses.length >= 2 || rangePercentage >= 40
    };
  }

  /**
   * Analyze time-of-day patterns
   */
  analyzeTimePatterns(userData) {
    const relapses = (userData.streakHistory || [])
      .filter(s => s.reason === 'relapse' && s.trigger);
    
    if (relapses.length < 2) {
      return null;
    }

    // Check if evening is a trigger (based on trigger data)
    const eveningRelapses = relapses.filter(s => 
      s.trigger === 'evening' || 
      s.trigger === 'night' ||
      s.trigger === 'late_night' ||
      s.trigger === 'boredom' // Often evening-related
    ).length;
    
    const currentHour = new Date().getHours();
    const isEvening = currentHour >= 20 || currentHour <= 2;
    const isLateAfternoon = currentHour >= 17 && currentHour < 20;
    
    const eveningPercentage = Math.round((eveningRelapses / relapses.length) * 100);
    
    return {
      currentHour,
      isEvening,
      isLateAfternoon,
      eveningRelapses,
      totalRelapses: relapses.length,
      eveningPercentage,
      isHighRiskTime: isEvening && eveningPercentage >= 40
    };
  }

  /**
   * Analyze benefit drops before relapses
   */
  analyzeBenefitDrops(userData) {
    if (!userData.benefitTracking || userData.benefitTracking.length < 3) {
      return null;
    }

    const recent = userData.benefitTracking.slice(-3);
    
    // Calculate drops over last 3 days
    const energyDrop = recent.length >= 2 
      ? (recent[0]?.energy || 5) - (recent[recent.length - 1]?.energy || 5)
      : 0;
    
    const focusDrop = recent.length >= 2
      ? (recent[0]?.focus || 5) - (recent[recent.length - 1]?.focus || 5)
      : 0;
    
    const confidenceDrop = recent.length >= 2
      ? (recent[0]?.confidence || 5) - (recent[recent.length - 1]?.confidence || 5)
      : 0;
    
    const drops = [];
    
    if (energyDrop >= 2) {
      drops.push({
        metric: 'Energy',
        from: recent[0]?.energy || 5,
        to: recent[recent.length - 1]?.energy || 5,
        change: energyDrop
      });
    }
    
    if (focusDrop >= 2) {
      drops.push({
        metric: 'Focus',
        from: recent[0]?.focus || 5,
        to: recent[recent.length - 1]?.focus || 5,
        change: focusDrop
      });
    }
    
    if (confidenceDrop >= 2) {
      drops.push({
        metric: 'Confidence',
        from: recent[0]?.confidence || 5,
        to: recent[recent.length - 1]?.confidence || 5,
        change: confidenceDrop
      });
    }
    
    return {
      drops,
      hasSignificantDrop: drops.length > 0,
      daysCovered: recent.length
    };
  }

  /**
   * Find historical match - when similar conditions led to relapse
   */
  findHistoricalMatch(userData, currentFactors) {
    const relapses = (userData.streakHistory || [])
      .filter(s => s.reason === 'relapse')
      .sort((a, b) => new Date(b.end) - new Date(a.end)); // Most recent first
    
    if (relapses.length === 0) {
      return null;
    }

    const currentDay = userData.currentStreak || 0;
    
    // Find a relapse that happened under similar conditions
    for (const relapse of relapses) {
      const dayMatch = Math.abs(relapse.days - currentDay) <= 7;
      
      if (dayMatch) {
        // Calculate how many days after that similar point the relapse occurred
        const daysUntilRelapse = relapse.days - currentDay;
        
        return {
          matchDay: relapse.days,
          trigger: relapse.trigger,
          daysUntilRelapse: daysUntilRelapse > 0 ? daysUntilRelapse : 0,
          matchType: 'day_in_streak'
        };
      }
    }
    
    return null;
  }

  /**
   * Generate smart suggestions based on detected factors
   */
  generateSuggestions(patterns, factors) {
    const suggestions = [];
    
    // Evening-specific suggestions
    if (patterns.time?.isHighRiskTime || patterns.time?.isEvening) {
      suggestions.push({
        focus: 'Evening routine',
        reason: 'Your high-risk window',
        tools: ['breathing', 'meditation']
      });
    }
    
    // Energy drop suggestions
    if (patterns.benefits?.hasSignificantDrop) {
      const energyDrop = patterns.benefits.drops.find(d => d.metric === 'Energy');
      if (energyDrop) {
        suggestions.push({
          focus: 'Physical activity',
          reason: 'Counters energy drops',
          tools: ['cold_shower', 'exercise']
        });
      }
    }
    
    // Streak day phase suggestions
    if (patterns.streak?.isHighRiskDay) {
      suggestions.push({
        focus: 'Extra vigilance',
        reason: `Day ${patterns.streak.currentDay} is in your danger zone`,
        tools: ['timer', 'affirmation']
      });
    }
    
    // Anxiety-based suggestions
    if (factors?.anxiety >= 7) {
      suggestions.push({
        focus: 'Stress management',
        reason: 'Elevated anxiety detected',
        tools: ['breathing', 'meditation']
      });
    }
    
    // If no specific suggestions, add general ones
    if (suggestions.length === 0) {
      suggestions.push({
        focus: 'Stay present',
        reason: 'General awareness',
        tools: ['breathing', 'timer']
      });
    }
    
    return suggestions.slice(0, 2); // Max 2 suggestions
  }

  /**
   * Get top triggers from history
   */
  getTopTriggers(userData) {
    const relapses = (userData.streakHistory || [])
      .filter(s => s.reason === 'relapse' && s.trigger);
    
    if (relapses.length === 0) {
      return [];
    }

    // Count triggers
    const triggerCounts = {};
    relapses.forEach(r => {
      triggerCounts[r.trigger] = (triggerCounts[r.trigger] || 0) + 1;
    });
    
    // Sort by count
    const sorted = Object.entries(triggerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([trigger, count]) => ({
        trigger: this.formatTriggerName(trigger),
        count,
        percentage: Math.round((count / relapses.length) * 100)
      }));
    
    return sorted;
  }

  formatTriggerName(trigger) {
    const names = {
      stress: 'Stress',
      boredom: 'Boredom',
      loneliness: 'Loneliness',
      social_media: 'Social Media',
      evening: 'Evening Hours',
      night: 'Night',
      late_night: 'Late Night',
      home_environment: 'Home Environment',
      relationship: 'Relationship',
      lustful_thoughts: 'Lustful Thoughts',
      anxiety: 'Anxiety'
    };
    return names[trigger] || trigger.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // ============================================================
  // CORE PREDICTION METHODS
  // ============================================================

  extractFeatures(current, previous, currentDate, userData) {
    const energy = current.energy || 5;
    const focus = current.focus || 5;
    const confidence = current.confidence || 5;
    const energyDrop = (previous?.energy || 5) - energy;
    const hour = currentDate.getHours();
    const dayOfWeek = currentDate.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6) ? 1 : 0;
    const currentStreak = userData.currentStreak || 0;
    const inPurgePhase = (currentStreak >= 15 && currentStreak <= 45) ? 1 : 0;
    
    const latestEmotional = userData.emotionalTracking && userData.emotionalTracking.length > 0
      ? userData.emotionalTracking[userData.emotionalTracking.length - 1]
      : null;
    
    const anxiety = latestEmotional?.anxiety || 5;
    const moodStability = latestEmotional?.moodStability || 5;
    
    return [energy, focus, confidence, energyDrop, hour, isWeekend, currentStreak, inPurgePhase, anxiety, moodStability];
  }

  calculateNormalizationStats(features) {
    const numFeatures = features[0].length;
    const means = new Array(numFeatures).fill(0);
    const stds = new Array(numFeatures).fill(1);
    
    for (let i = 0; i < numFeatures; i++) {
      const values = features.map(f => f[i]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      means[i] = mean;
      
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      stds[i] = Math.sqrt(variance) || 1;
    }
    
    return { means, stds };
  }

  normalizeFeatures(features, stats) {
    return features.map((f, i) => (f - stats.means[i]) / stats.stds[i]);
  }

  calculateReliability(userData) {
    let reliability = this.trainingHistory.accuracy.length > 0
      ? this.trainingHistory.accuracy[this.trainingHistory.accuracy.length - 1] * 100
      : 50;
    
    const dataPoints = userData.benefitTracking?.length || 0;
    if (dataPoints < 30) {
      reliability *= 0.7;
    } else if (dataPoints < 50) {
      reliability *= 0.85;
    }
    
    const relapseCount = userData.streakHistory?.filter(s => s.reason === 'relapse').length || 0;
    if (relapseCount < 2) {
      reliability *= 0.75;
    } else if (relapseCount < 4) {
      reliability *= 0.9;
    }
    
    return Math.min(Math.round(reliability), 85);
  }

  async predict(userData) {
    try {
      // Check if model is ready
      if (!this.isModelReady || !this.model || !this.trainingHistory.lastTrained) {
        console.log('⚠️ Model not ready, using fallback prediction');
        return this.fallbackPrediction(userData);
      }
      
      if (!userData.benefitTracking || userData.benefitTracking.length < 2) {
        return {
          riskScore: 30,
          reliability: 20,
          reason: 'Insufficient data for pattern analysis',
          usedML: false,
          factors: {},
          patterns: null,
          dataContext: { trackingDays: 0, relapseCount: 0 }
        };
      }
      
      const current = userData.benefitTracking[userData.benefitTracking.length - 1];
      const previous = userData.benefitTracking[userData.benefitTracking.length - 2];
      const currentDate = new Date();
      
      const rawFeatures = this.extractFeatures(current, previous, currentDate, userData);
      
      if (!this.normalizationStats) {
        this.loadNormalizationStats();
      }
      
      if (!this.normalizationStats) {
        console.log('⚠️ No normalization stats found');
        return this.fallbackPrediction(userData);
      }
      
      const normalizedFeatures = this.normalizeFeatures(rawFeatures, this.normalizationStats);
      
      const inputTensor = tf.tensor2d([normalizedFeatures]);
      const prediction = this.model.predict(inputTensor);
      const predictionArray = await prediction.data();
      
      inputTensor.dispose();
      prediction.dispose();
      
      const riskScore = Math.round(predictionArray[0] * 100);
      const reliability = this.calculateReliability(userData);
      
      // Build factors object
      const factors = {
        energy: rawFeatures[0],
        focus: rawFeatures[1],
        confidence: rawFeatures[2],
        energyDrop: rawFeatures[3],
        timeOfDay: rawFeatures[4],
        isWeekend: rawFeatures[5] === 1,
        streakDay: rawFeatures[6],
        inPurgePhase: rawFeatures[7] === 1,
        anxiety: rawFeatures[8],
        moodStability: rawFeatures[9]
      };
      
      // Run pattern analysis
      const patterns = {
        streak: this.analyzeStreakPatterns(userData),
        time: this.analyzeTimePatterns(userData),
        benefits: this.analyzeBenefitDrops(userData),
        historical: this.findHistoricalMatch(userData, factors),
        triggers: this.getTopTriggers(userData),
        suggestions: this.generateSuggestions({
          streak: this.analyzeStreakPatterns(userData),
          time: this.analyzeTimePatterns(userData),
          benefits: this.analyzeBenefitDrops(userData)
        }, factors)
      };
      
      const reason = this.generateDetailedReason(patterns, factors, riskScore);
      
      console.log(`🤖 Pattern Analysis: ${riskScore}% risk detected`);
      
      // Send notification for high risk
      if (riskScore >= 70) {
        const username = localStorage.getItem('username');
        if (username) {
          await this.sendPatternNotification(username, riskScore, reason);
        }
      }
      
      return {
        riskScore,
        reliability,
        reason,
        usedML: true,
        factors,
        patterns,
        dataContext: {
          trackingDays: userData.benefitTracking?.length || 0,
          relapseCount: userData.streakHistory?.filter(s => s.reason === 'relapse').length || 0,
          hasEmotionalData: userData.emotionalTracking && userData.emotionalTracking.length > 0
        }
      };
      
    } catch (error) {
      console.error('❌ Prediction error:', error);
      return this.fallbackPrediction(userData);
    }
  }

  generateDetailedReason(patterns, factors, riskScore) {
    const reasons = [];
    
    if (patterns.streak?.isHighRiskDay) {
      reasons.push(`Day ${patterns.streak.currentDay} in your danger zone`);
    }
    
    if (patterns.time?.isHighRiskTime) {
      reasons.push('Evening hours (your high-risk window)');
    }
    
    if (patterns.benefits?.hasSignificantDrop) {
      const drop = patterns.benefits.drops[0];
      if (drop) {
        reasons.push(`${drop.metric} dropped from ${drop.from} to ${drop.to}`);
      }
    }
    
    if (factors.inPurgePhase) {
      reasons.push('Currently in purge phase (days 15-45)');
    }
    
    if (factors.anxiety >= 7) {
      reasons.push('Elevated anxiety detected');
    }
    
    if (reasons.length === 0) {
      if (riskScore >= 50) {
        reasons.push('Multiple subtle factors combined');
      } else {
        reasons.push('Conditions appear stable');
      }
    }
    
    return reasons.slice(0, 2).join(' • ');
  }

  fallbackPrediction(userData) {
    let riskScore = 30;
    const factors = {};
    
    // Purge phase
    if (userData.currentStreak >= 15 && userData.currentStreak <= 45) {
      riskScore += 15;
      factors.inPurgePhase = true;
    }
    
    // Evening hours
    const hour = new Date().getHours();
    if (hour >= 20 || hour <= 2) {
      riskScore += 20;
      factors.isEvening = true;
    } else if (hour >= 17 && hour < 20) {
      riskScore += 10;
      factors.isLateAfternoon = true;
    }
    
    // Weekend
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      riskScore += 8;
      factors.isWeekend = true;
    }
    
    // Relapse history
    const relapseCount = userData.streakHistory?.filter(s => s.reason === 'relapse').length || 0;
    if (relapseCount >= 4) {
      riskScore += 10;
    }
    
    // Benefit drops
    if (userData.benefitTracking && userData.benefitTracking.length >= 2) {
      const recent = userData.benefitTracking[userData.benefitTracking.length - 1];
      const previous = userData.benefitTracking[userData.benefitTracking.length - 2];
      const energyDrop = (previous?.energy || 5) - (recent?.energy || 5);
      if (energyDrop >= 2) {
        riskScore += 10;
        factors.energyDrop = energyDrop;
      }
    }
    
    const reliability = this.calculateReliability(userData);
    
    // Run pattern analysis even for fallback
    const patterns = {
      streak: this.analyzeStreakPatterns(userData),
      time: this.analyzeTimePatterns(userData),
      benefits: this.analyzeBenefitDrops(userData),
      historical: this.findHistoricalMatch(userData, factors),
      triggers: this.getTopTriggers(userData),
      suggestions: this.generateSuggestions({
        streak: this.analyzeStreakPatterns(userData),
        time: this.analyzeTimePatterns(userData),
        benefits: this.analyzeBenefitDrops(userData)
      }, factors)
    };
    
    return {
      riskScore: Math.min(riskScore, 100),
      reliability,
      reason: this.generateDetailedReason(patterns, factors, riskScore),
      usedML: false,
      factors,
      patterns,
      dataContext: {
        trackingDays: userData.benefitTracking?.length || 0,
        relapseCount
      }
    };
  }

  async sendPatternNotification(username, riskScore, reason) {
    try {
      const fcmToken = localStorage.getItem('fcmToken');
      
      if (!fcmToken) {
        console.warn('⚠️ No FCM token available');
        return false;
      }

      const notificationType = riskScore >= 70 ? 'pattern_high' : 'pattern_elevated';
      
      await fetch(`${API_URL}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fcmToken,
          notification: {
            title: 'TitanTrack',
            body: 'Your patterns suggest today may require extra awareness. Tap for insights.'
          },
          data: {
            type: notificationType,
            riskScore: riskScore.toString(),
            reason,
            timestamp: new Date().toISOString(),
            url: '/urge-prediction'
          }
        })
      });
      
      this.showLocalPatternNotification(riskScore);
      
      return true;
    } catch (error) {
      console.error('Failed to send pattern notification:', error);
      return false;
    }
  }

  showLocalPatternNotification(riskScore) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('TitanTrack', {
        body: 'Your patterns suggest today may require extra awareness. Tap for insights.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'pattern-insight',
        requireInteraction: false,
        data: { riskScore, url: '/urge-prediction' }
      });
      
      notification.onclick = () => {
        window.focus();
        window.location.href = '/urge-prediction';
        notification.close();
      };
    }
  }

  // ============================================================
  // TRAINING METHODS
  // ============================================================

  async train(userData, onProgress = null) {
    if (this.isTraining) {
      return { success: false, message: 'Training already in progress' };
    }
    
    try {
      this.isTraining = true;
      const startTime = Date.now();
      
      console.log('🎯 Starting ML Training...');
      
      // Step 1: Prepare data
      const { features, labels, stats } = await this.prepareTrainingData(userData);
      
      if (!features || features.length < this.MIN_TRAINING_DATA) {
        this.isTraining = false;
        return {
          success: false,
          message: `Need at least ${this.MIN_TRAINING_DATA} days of data. Have ${features?.length || 0}.`
        };
      }
      
      // Step 2: Create model
      await this.createModel();
      
      // Step 3: Train
      this.normalizationStats = stats;
      this.saveNormalizationStats();
      
      const normalizedFeatures = features.map(f => this.normalizeFeatures(f, stats));
      
      const xs = tf.tensor2d(normalizedFeatures);
      const ys = tf.tensor2d(labels);
      
      const history = await this.model.fit(xs, ys, {
        epochs: 50,
        batchSize: 8,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0 && onProgress) {
              onProgress({
                epoch: epoch + 1,
                totalEpochs: 50,
                loss: logs.loss,
                accuracy: logs.acc * 100,
                message: `Training... Epoch ${epoch + 1}/50`
              });
            }
          }
        }
      });
      
      xs.dispose();
      ys.dispose();
      
      // Step 4: Save
      await this.saveModel();
      
      const finalAccuracy = history.history.acc[history.history.acc.length - 1];
      const finalLoss = history.history.loss[history.history.loss.length - 1];
      
      this.trainingHistory = {
        accuracy: [...this.trainingHistory.accuracy, finalAccuracy],
        loss: [...this.trainingHistory.loss, finalLoss],
        lastTrained: new Date().toISOString(),
        totalEpochs: this.trainingHistory.totalEpochs + 50
      };
      this.saveTrainingHistory();
      
      this.isModelReady = true;
      this.isTraining = false;
      
      const trainingTime = Math.round((Date.now() - startTime) / 1000);
      
      return {
        success: true,
        accuracy: finalAccuracy * 100,
        loss: finalLoss,
        trainingExamples: features.length,
        trainingTime,
        message: 'Model trained successfully!'
      };
      
    } catch (error) {
      console.error('❌ Training error:', error);
      this.isTraining = false;
      return { success: false, message: `Training failed: ${error.message}` };
    }
  }

  async prepareTrainingData(userData) {
    const features = [];
    const labels = [];
    
    if (!userData.benefitTracking || userData.benefitTracking.length < 2) {
      return { features: null, labels: null, stats: null };
    }
    
    const relapses = (userData.streakHistory || [])
      .filter(s => s.reason === 'relapse' && s.end)
      .map(s => ({
        date: new Date(s.end),
        trigger: s.trigger,
        days: s.days
      }));
    
    for (let i = 1; i < userData.benefitTracking.length; i++) {
      const current = userData.benefitTracking[i];
      const previous = userData.benefitTracking[i - 1];
      const currentDate = new Date(current.date);
      
      const hadRelapse = relapses.some(r => {
        const relapseDateStr = r.date.toISOString().split('T')[0];
        const currentDateStr = currentDate.toISOString().split('T')[0];
        return relapseDateStr === currentDateStr;
      });
      
      const dayFeatures = this.extractFeatures(current, previous, currentDate, userData);
      features.push(dayFeatures);
      labels.push([hadRelapse ? 1 : 0]);
    }
    
    if (features.length < this.MIN_TRAINING_DATA) {
      return { features: null, labels: null, stats: null };
    }
    
    const stats = this.calculateNormalizationStats(features);
    
    return { features, labels, stats };
  }

  getModelInfo() {
    return {
      isReady: this.isModelReady && this.trainingHistory.lastTrained !== null,
      isTraining: this.isTraining,
      lastTrained: this.trainingHistory.lastTrained,
      totalEpochs: this.trainingHistory.totalEpochs,
      accuracy: this.trainingHistory.accuracy.length > 0
        ? Math.round(this.trainingHistory.accuracy[this.trainingHistory.accuracy.length - 1] * 100)
        : null
    };
  }

  async clearModel() {
    try {
      await tf.io.removeModel(this.MODEL_SAVE_PATH);
      this.model = null;
      this.isModelReady = false;
      this.trainingHistory = { accuracy: [], loss: [], lastTrained: null, totalEpochs: 0 };
      this.normalizationStats = null;
      localStorage.removeItem('ml_training_history');
      localStorage.removeItem('ml_normalization_stats');
      await this.createModel();
      return true;
    } catch (error) {
      console.error('Error clearing model:', error);
      return false;
    }
  }
}

const mlPredictionService = new MLPredictionService();
export default mlPredictionService;