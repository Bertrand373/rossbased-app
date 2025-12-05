// src/services/MLPredictionService.js
// TensorFlow.js-based ML prediction with 12-feature neural network
// FIXED: Factor naming consistency for PredictionDisplay compatibility

import * as tf from '@tensorflow/tfjs';
import dataPreprocessor from '../utils/DataPreprocessor';

class MLPredictionService {
  constructor() {
    this.model = null;
    this.isInitialized = false;
    this.normalizationStats = null;
    this.trainingHistory = null;
    this.MODEL_KEY = 'titantrack-ml-model';
    this.STATS_KEY = 'ml_normalization_stats';
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async initialize() {
    if (this.isInitialized) return true;

    try {
      const savedModel = await this.loadModel();
      if (savedModel) {
        this.model = savedModel;
        this.loadNormalizationStats();
        this.isInitialized = true;
        console.log('✅ ML model loaded from storage');
        return true;
      }

      this.model = this.createModel();
      this.isInitialized = true;
      console.log('✅ New ML model created (untrained)');
      return true;
    } catch (error) {
      console.error('❌ ML initialization error:', error);
      return false;
    }
  }

  // ============================================================
  // MODEL ARCHITECTURE - 12-Feature Neural Network
  // ============================================================

  createModel() {
    const model = tf.sequential();

    // Input layer - 12 features
    model.add(tf.layers.dense({
      inputShape: [12],
      units: 24,
      activation: 'relu',
      kernelInitializer: 'glorotNormal'
    }));

    // Hidden layer with dropout
    model.add(tf.layers.dropout({ rate: 0.3 }));
    model.add(tf.layers.dense({
      units: 12,
      activation: 'relu'
    }));

    // Output layer - single probability
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  // ============================================================
  // MODEL PERSISTENCE
  // ============================================================

  async saveModel() {
    if (!this.model) return false;
    try {
      await this.model.save(`localstorage://${this.MODEL_KEY}`);
      return true;
    } catch (error) {
      console.error('Error saving model:', error);
      return false;
    }
  }

  async loadModel() {
    try {
      const model = await tf.loadLayersModel(`localstorage://${this.MODEL_KEY}`);
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });
      return model;
    } catch {
      return null;
    }
  }

  saveNormalizationStats(stats) {
    this.normalizationStats = stats;
    localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
  }

  loadNormalizationStats() {
    try {
      const saved = localStorage.getItem(this.STATS_KEY);
      if (saved) {
        this.normalizationStats = JSON.parse(saved);
        return this.normalizationStats;
      }
    } catch (error) {
      console.error('Error loading normalization stats:', error);
    }
    return null;
  }

  // ============================================================
  // TRAINING - 12-Feature Dataset
  // ============================================================

  async train(userData, callbacks = {}) {
    if (!this.isInitialized) await this.initialize();

    const benefitTracking = userData.benefitTracking || [];
    const streakHistory = userData.streakHistory || [];

    if (benefitTracking.length < 14) {
      return { success: false, error: 'Need at least 14 days of benefit tracking data' };
    }

    const relapses = streakHistory.filter(s => s.reason === 'relapse');
    if (relapses.length < 2) {
      return { success: false, error: 'Need at least 2 relapses for pattern learning' };
    }

    try {
      // Generate training data using DataPreprocessor
      const trainingData = dataPreprocessor.generateTrainingData(userData);

      if (trainingData.features.length < 10) {
        return { success: false, error: 'Insufficient training samples' };
      }

      // Calculate and save normalization stats
      const stats = dataPreprocessor.calculateNormalizationStats(trainingData.features);
      this.saveNormalizationStats(stats);

      // Normalize features
      const normalizedFeatures = trainingData.features.map(f =>
        dataPreprocessor.normalizeFeatures(f, stats)
      );

      // Create tensors
      const xs = tf.tensor2d(normalizedFeatures);
      const ys = tf.tensor2d(trainingData.labels.map(l => [l]));

      // Train
      const result = await this.model.fit(xs, ys, {
        epochs: 50,
        batchSize: Math.min(32, Math.floor(normalizedFeatures.length / 2)),
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (callbacks.onProgress) {
              callbacks.onProgress({
                epoch: epoch + 1,
                totalEpochs: 50,
                loss: logs.loss,
                accuracy: logs.acc,
                valLoss: logs.val_loss,
                valAccuracy: logs.val_acc
              });
            }
          }
        }
      });

      // Cleanup
      xs.dispose();
      ys.dispose();

      // Save model
      await this.saveModel();

      // Save training history
      const history = {
        lastTrained: new Date().toISOString(),
        samples: normalizedFeatures.length,
        finalLoss: result.history.loss[result.history.loss.length - 1],
        finalAccuracy: result.history.acc[result.history.acc.length - 1],
        relapseCount: relapses.length
      };
      localStorage.setItem('ml_training_history', JSON.stringify(history));
      this.trainingHistory = history;

      return {
        success: true,
        samples: normalizedFeatures.length,
        epochs: 50,
        finalLoss: history.finalLoss,
        finalAccuracy: history.finalAccuracy
      };

    } catch (error) {
      console.error('❌ Training error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================
  // PREDICTION
  // FIXED: Now generates rich pattern data for PredictionDisplay
  // ============================================================

  async predict(userData) {
    if (!this.isInitialized) await this.initialize();

    try {
      // Check for real trained model with actual training history
      const trainingHistory = localStorage.getItem('ml_training_history');
      const hasRealTrainedModel = this.model && 
                                   trainingHistory && 
                                   JSON.parse(trainingHistory).samples > 0;
      
      if (!hasRealTrainedModel) {
        console.log('⚠️ No real trained model, using fallback prediction with rich patterns');
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
      
      // Extract features using DataPreprocessor (now 12 features)
      const rawFeatures = dataPreprocessor.extractFeatures(current, previous, currentDate, userData);
      
      // Load normalization stats if needed
      if (!this.normalizationStats) {
        this.loadNormalizationStats();
      }
      
      if (!this.normalizationStats) {
        console.log('⚠️ No normalization stats found');
        return this.fallbackPrediction(userData);
      }
      
      // Normalize features
      const normalizedFeatures = dataPreprocessor.normalizeFeatures(rawFeatures, this.normalizationStats);
      
      // Run prediction
      const inputTensor = tf.tensor2d([normalizedFeatures]);
      const prediction = this.model.predict(inputTensor);
      const riskScore = (await prediction.data())[0];
      
      // Cleanup
      inputTensor.dispose();
      prediction.dispose();
      
      // Calculate reliability based on data quality
      const reliability = this.calculateReliability(userData);
      
      // Analyze contributing factors - FIXED: Now uses correct naming
      const factors = this.analyzeFactors(rawFeatures, userData);
      
      // Get pattern insights - FIXED: Now generates rich patterns with suggestions
      const patterns = this.generateMLPatterns(userData, rawFeatures);
      
      // Get emotional data count (check both field names)
      const emotionalDataPoints = (userData.emotionalLog || userData.emotionalTracking || []).length;
      
      return {
        riskScore: Math.round(riskScore * 100),
        reliability,
        reason: this.generateReason(riskScore, factors),
        usedML: true,
        factors,
        patterns,
        dataContext: {
          trackingDays: userData.benefitTracking?.length || 0,
          relapseCount: userData.streakHistory?.filter(s => s.reason === 'relapse').length || 0,
          emotionalDataPoints
        }
      };
      
    } catch (error) {
      console.error('❌ Prediction error:', error);
      return this.fallbackPrediction(userData);
    }
  }

  // ============================================================
  // FACTOR ANALYSIS - FIXED FOR PREDICTIONDISPLAY COMPATIBILITY
  // ============================================================

  analyzeFactors(features, userData) {
    const [
      energy, focus, confidence, energyDrop, hourOfDay, isWeekend,
      streakDay, inPurgePhase, anxiety, moodStability, mentalClarity, emotionalProcessing
    ] = features;
    
    const factors = {};
    
    // Benefit metrics
    if (energy < 4) factors.lowEnergy = { value: energy, weight: 0.15 };
    if (focus < 4) factors.lowFocus = { value: focus, weight: 0.12 };
    if (confidence < 4) factors.lowConfidence = { value: confidence, weight: 0.10 };
    if (energyDrop > 2) factors.energyCrash = { value: energyDrop, weight: 0.15 };
    
    // Temporal factors
    if (hourOfDay >= 20 || hourOfDay <= 4) factors.highRiskHour = { value: hourOfDay, weight: 0.10 };
    if (isWeekend) factors.weekend = { value: 1, weight: 0.08 };
    
    // FIXED: Streak context - Use correct naming for PredictionDisplay
    if (inPurgePhase) {
      const currentPhase = this.getCurrentPhase(streakDay);
      factors.inPurgePhase = true; // PredictionDisplay checks for this
      factors.emotionalProcessingPhase = { value: streakDay, weight: 0.12, phaseName: currentPhase.name };
    }
    
    // EMOTIONAL FACTORS - HIGHEST PREDICTIVE VALUE
    if (anxiety > 7) factors.highAnxiety = { value: anxiety, weight: 0.20 };
    if (moodStability < 4) factors.moodVolatility = { value: moodStability, weight: 0.18 };
    if (mentalClarity < 4) factors.lowClarity = { value: mentalClarity, weight: 0.12 };
    if (emotionalProcessing < 4) factors.blockedEmotions = { value: emotionalProcessing, weight: 0.15 };
    
    return factors;
  }

  generateReason(riskScore, factors) {
    const factorKeys = Object.keys(factors);
    
    if (riskScore > 0.7) {
      // High risk - prioritize emotional factors
      if (factors.highAnxiety && factors.moodVolatility) {
        return 'High anxiety combined with mood instability - use urge toolkit';
      }
      if (factors.highAnxiety) {
        return 'Elevated anxiety detected - practice breathing exercises';
      }
      if (factors.moodVolatility) {
        return 'Emotional volatility pattern - journal and ground yourself';
      }
      if (factors.emotionalProcessingPhase || factors.inPurgePhase) {
        return 'Emotional Processing phase - intense but temporary';
      }
      if (factors.energyCrash) {
        return 'Energy crash pattern detected - rest and recover';
      }
      return 'Multiple risk factors present - stay vigilant';
    }
    
    if (riskScore > 0.4) {
      if (factors.highRiskHour) {
        return 'Evening hours are your historical vulnerability window';
      }
      if (factors.weekend) {
        return 'Weekends require extra vigilance based on your patterns';
      }
      if (factors.blockedEmotions) {
        return 'Blocked emotions may surface - stay present';
      }
      return 'Moderate risk - maintain your practices';
    }
    
    return 'Low risk - your patterns indicate stability';
  }

  // ============================================================
  // ML PATTERN GENERATION - NEW METHOD FOR RICH MODAL DATA
  // ============================================================

  generateMLPatterns(userData, features) {
    const [
      energy, focus, confidence, energyDrop, hourOfDay, isWeekend,
      streakDay, inPurgePhase, anxiety, moodStability, mentalClarity, emotionalProcessing
    ] = features;
    
    const relapses = (userData.streakHistory || []).filter(s => s.reason === 'relapse');
    const patterns = {};
    const currentPhase = this.getCurrentPhase(streakDay);
    
    // Streak pattern analysis
    if (relapses.length >= 2) {
      const relapseDays = relapses.map(r => r.days).filter(d => d);
      const similarDayRelapses = relapseDays.filter(d => Math.abs(d - streakDay) <= 5);
      
      if (similarDayRelapses.length >= 1) {
        const minDay = Math.max(1, streakDay - 5);
        const maxDay = streakDay + 5;
        patterns.streak = {
          isHighRiskDay: similarDayRelapses.length >= 2,
          currentDay: streakDay,
          relapsesInRange: similarDayRelapses.length,
          totalRelapses: relapses.length,
          rangeDays: [minDay, maxDay]
        };
      }
    }
    
    // Time pattern analysis
    const isHighRiskHour = hourOfDay >= 20 || hourOfDay <= 4;
    if (isHighRiskHour) {
      const eveningRelapses = relapses.filter(r => r.trigger === 'evening').length;
      const eveningPercentage = relapses.length > 0 ? Math.round((eveningRelapses / relapses.length) * 100) : 0;
      
      if (eveningPercentage >= 30) {
        patterns.time = {
          isHighRiskTime: true,
          currentHour: hourOfDay,
          eveningRelapses: eveningRelapses,
          eveningPercentage: eveningPercentage
        };
      }
    }
    
    // Benefit drop analysis
    if (energyDrop >= 2) {
      patterns.benefits = {
        hasSignificantDrop: true,
        drops: [{ metric: 'Energy', from: Math.round(energy + energyDrop), to: Math.round(energy) }],
        daysCovered: 1
      };
    }
    
    // Generate suggestions based on ML-detected factors
    patterns.suggestions = this.generateSuggestions(features, currentPhase, inPurgePhase);
    
    return patterns;
  }

  // ============================================================
  // SUGGESTION GENERATION
  // ============================================================

  generateSuggestions(features, currentPhase, inPurgePhase) {
    const [
      energy, focus, confidence, energyDrop, hourOfDay, isWeekend,
      streakDay, , anxiety, moodStability, mentalClarity, emotionalProcessing
    ] = features;
    
    const suggestions = [];
    
    // Phase-specific suggestion (always included for phases 1-2)
    if (inPurgePhase || streakDay <= 45) {
      suggestions.push({
        focus: currentPhase.name,
        reason: streakDay <= 14
          ? 'Focus on building unbreakable daily habits and channeling excess energy'
          : 'Emotional turbulence is normal - journal and accept feelings without resistance'
      });
    }
    
    // Anxiety-based suggestion
    if (anxiety > 6) {
      suggestions.push({
        focus: 'Anxiety management',
        reason: 'Elevated anxiety detected - breathing exercises and grounding techniques help'
      });
    }
    
    // Mood-based suggestion
    if (moodStability < 5) {
      suggestions.push({
        focus: 'Emotional stability',
        reason: 'Mood fluctuations are common - maintain consistent daily practices'
      });
    }
    
    // Time-based suggestion
    if (hourOfDay >= 20 || hourOfDay <= 4) {
      suggestions.push({
        focus: 'Evening protocol',
        reason: 'Evening hours require extra vigilance - avoid screens and practice wind-down routine'
      });
    }
    
    // Energy-based suggestion
    if (energy < 4 || energyDrop >= 2) {
      suggestions.push({
        focus: 'Energy restoration',
        reason: 'Low energy increases vulnerability - prioritize sleep and recovery'
      });
    }
    
    // Limit to top 3 suggestions
    return suggestions.slice(0, 3);
  }

  // ============================================================
  // FALLBACK PREDICTION (Rule-based when ML unavailable)
  // FIXED: Now checks both emotionalLog and emotionalTracking fields
  // ENHANCED: Generates rich pattern data for detailed modal display
  // ============================================================

  fallbackPrediction(userData) {
    let riskScore = 30; // Base risk
    const factors = {};
    
    // Get latest emotional data - check both emotionalLog and emotionalTracking
    const emotionalLog = userData.emotionalLog || userData.emotionalTracking || [];
    if (emotionalLog.length > 0) {
      const latest = emotionalLog[emotionalLog.length - 1];
      
      // Anxiety is highest weight
      if (latest.anxiety > 7) {
        riskScore += 20;
        factors.highAnxiety = { value: latest.anxiety, weight: 0.20 };
      }
      
      // Mood stability - check both 'mood' and 'moodStability' fields
      const moodValue = latest.mood ?? latest.moodStability ?? 5;
      if (moodValue < 4) {
        riskScore += 15;
        factors.moodVolatility = { value: moodValue, weight: 0.18 };
      }
      
      // Emotional processing - check both 'processing' and 'emotionalProcessing' fields
      const processingValue = latest.processing ?? latest.emotionalProcessing ?? 5;
      if (processingValue < 4) {
        riskScore += 10;
        factors.blockedEmotions = { value: processingValue, weight: 0.15 };
      }
    }
    
    // Get latest benefit data
    const benefitTracking = userData.benefitTracking || [];
    let hasEnergyDrop = false;
    if (benefitTracking.length > 0) {
      const latest = benefitTracking[benefitTracking.length - 1];
      if (latest.energy < 4) {
        riskScore += 10;
        factors.lowEnergy = { value: latest.energy, weight: 0.15 };
      }
      
      // Check for energy drop
      if (benefitTracking.length >= 2) {
        const previous = benefitTracking[benefitTracking.length - 2];
        if (previous.energy - latest.energy >= 2) {
          hasEnergyDrop = true;
          factors.energyCrash = { value: previous.energy - latest.energy, weight: 0.15 };
        }
      }
    }
    
    // Streak phase - check if in Emotional Processing phase (Days 15-45)
    const streak = userData.currentStreak || 0;
    const currentPhase = this.getCurrentPhase(streak);
    const inEmotionalProcessing = streak >= 15 && streak <= 45;
    if (inEmotionalProcessing) {
      riskScore += 15;
      factors.emotionalProcessingPhase = { value: streak, weight: 0.12, phaseName: currentPhase.name };
      factors.inPurgePhase = true; // For PredictionDisplay compatibility (legacy)
    }
    
    // Time factors
    const hour = new Date().getHours();
    const isHighRiskHour = hour >= 20 || hour <= 4;
    if (isHighRiskHour) {
      riskScore += 10;
      factors.highRiskHour = { value: hour, weight: 0.10 };
    }
    
    const day = new Date().getDay();
    const isWeekend = day === 0 || day === 6;
    if (isWeekend) {
      riskScore += 5;
      factors.weekend = { value: 1, weight: 0.08 };
    }
    
    // Generate pattern analysis for rich modal display
    const patterns = this.generateFallbackPatterns(userData, streak, isHighRiskHour, hasEnergyDrop, inEmotionalProcessing);
    
    const finalRiskScore = Math.min(85, Math.max(15, riskScore));
    
    return {
      riskScore: finalRiskScore,
      reliability: 40,
      reason: this.generateReason(finalRiskScore / 100, factors),
      usedML: false,
      factors,
      patterns,
      dataContext: {
        trackingDays: benefitTracking.length,
        relapseCount: userData.streakHistory?.filter(s => s.reason === 'relapse').length || 0,
        emotionalDataPoints: emotionalLog.length
      }
    };
  }

  // Get current phase based on streak day
  getCurrentPhase(streakDay) {
    if (streakDay <= 14) return { id: 1, name: 'Initial Adaptation', days: '1-14' };
    if (streakDay <= 45) return { id: 2, name: 'Emotional Processing', days: '15-45' };
    if (streakDay <= 90) return { id: 3, name: 'Mental Expansion', days: '46-90' };
    if (streakDay <= 180) return { id: 4, name: 'Spiritual Awakening', days: '91-180' };
    if (streakDay <= 365) return { id: 5, name: 'Stabilization', days: '181-365' };
    return { id: 6, name: 'Mastery', days: '366+' };
  }

  // Generate rich pattern data for fallback predictions
  generateFallbackPatterns(userData, currentStreak, isHighRiskHour, hasEnergyDrop, inEmotionalProcessing) {
    const relapses = (userData.streakHistory || []).filter(s => s.reason === 'relapse');
    const patterns = {};
    const currentPhase = this.getCurrentPhase(currentStreak);
    
    // Streak pattern analysis
    if (relapses.length >= 2) {
      const relapseDays = relapses.map(r => r.days).filter(d => d);
      const similarDayRelapses = relapseDays.filter(d => Math.abs(d - currentStreak) <= 5);
      
      if (similarDayRelapses.length >= 1) {
        const minDay = Math.max(1, currentStreak - 5);
        const maxDay = currentStreak + 5;
        patterns.streak = {
          isHighRiskDay: similarDayRelapses.length >= 2,
          currentDay: currentStreak,
          relapsesInRange: similarDayRelapses.length,
          totalRelapses: relapses.length,
          rangeDays: [minDay, maxDay]
        };
      }
    }
    
    // Time pattern analysis
    if (isHighRiskHour) {
      // Analyze relapse triggers for evening pattern
      const eveningRelapses = relapses.filter(r => r.trigger === 'evening').length;
      const eveningPercentage = relapses.length > 0 ? Math.round((eveningRelapses / relapses.length) * 100) : 0;
      
      if (eveningPercentage >= 30) {
        patterns.time = {
          isHighRiskTime: true,
          currentHour: new Date().getHours(),
          eveningRelapses: eveningRelapses,
          eveningPercentage: eveningPercentage
        };
      }
    }
    
    // Benefit drop analysis
    if (hasEnergyDrop) {
      const benefitTracking = userData.benefitTracking || [];
      if (benefitTracking.length >= 2) {
        const current = benefitTracking[benefitTracking.length - 1];
        const previous = benefitTracking[benefitTracking.length - 2];
        patterns.benefits = {
          hasSignificantDrop: true,
          drops: [{ metric: 'Energy', from: previous.energy, to: current.energy }],
          daysCovered: 1
        };
      }
    }
    
    // Generate suggestions based on current state
    patterns.suggestions = [];
    
    // Phase-specific suggestion
    if (inEmotionalProcessing) {
      patterns.suggestions.push({
        focus: currentPhase.name,
        reason: currentStreak <= 14 
          ? 'Focus on building unbreakable daily habits and channeling excess energy'
          : 'Emotional turbulence is normal - journal and accept feelings without resistance'
      });
    }
    
    // Time-based suggestion
    if (isHighRiskHour) {
      patterns.suggestions.push({
        focus: 'Evening protocol',
        reason: 'Evening hours require extra vigilance - avoid screens and practice wind-down routine'
      });
    }
    
    // Energy-based suggestion
    if (hasEnergyDrop) {
      patterns.suggestions.push({
        focus: 'Energy restoration',
        reason: 'Low energy increases vulnerability - prioritize sleep and recovery'
      });
    }
    
    return patterns;
  }

  // Legacy method for compatibility - calls generateFallbackPatterns internally
  analyzeStreakPatterns(userData) {
    const streak = userData.currentStreak || 0;
    const hour = new Date().getHours();
    const isHighRiskHour = hour >= 20 || hour <= 4;
    const inEmotionalProcessing = streak >= 15 && streak <= 45;
    
    // Check for energy drop
    let hasEnergyDrop = false;
    const benefitTracking = userData.benefitTracking || [];
    if (benefitTracking.length >= 2) {
      const current = benefitTracking[benefitTracking.length - 1];
      const previous = benefitTracking[benefitTracking.length - 2];
      if (previous.energy - current.energy >= 2) {
        hasEnergyDrop = true;
      }
    }
    
    return this.generateFallbackPatterns(userData, streak, isHighRiskHour, hasEnergyDrop, inEmotionalProcessing);
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  calculateReliability(userData) {
    let reliability = 40;
    
    const benefitDays = userData.benefitTracking?.length || 0;
    const relapseCount = userData.streakHistory?.filter(s => s.reason === 'relapse').length || 0;
    const emotionalPoints = (userData.emotionalLog || userData.emotionalTracking || []).length;
    
    if (benefitDays >= 30) reliability += 20;
    else if (benefitDays >= 14) reliability += 10;
    
    if (relapseCount >= 5) reliability += 20;
    else if (relapseCount >= 3) reliability += 10;
    
    if (emotionalPoints >= 10) reliability += 10;
    else if (emotionalPoints >= 5) reliability += 5;
    
    return Math.min(90, reliability);
  }

  getModelInfo() {
    const trainingHistory = localStorage.getItem('ml_training_history');
    const history = trainingHistory ? JSON.parse(trainingHistory) : null;
    
    return {
      isReady: this.model !== null && history?.samples > 0,
      lastTrained: history?.lastTrained,
      samples: history?.samples || 0,
      accuracy: history?.finalAccuracy,
      hasNormalizationStats: this.normalizationStats !== null
    };
  }

  resetModel() {
    localStorage.removeItem(this.MODEL_KEY);
    localStorage.removeItem(`${this.MODEL_KEY}_info`);
    localStorage.removeItem(this.STATS_KEY);
    localStorage.removeItem('ml_training_history');
    this.model = this.createModel();
    this.normalizationStats = null;
    this.trainingHistory = null;
    console.log('🔄 ML model reset');
  }
}

const mlPredictionService = new MLPredictionService();
export default mlPredictionService;