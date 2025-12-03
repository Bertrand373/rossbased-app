// src/services/MLPredictionService.js
// Machine Learning Prediction Service for Relapse Risk Assessment
// UPDATED: Now uses 12 features including Emotional Timeline data

import * as tf from '@tensorflow/tfjs';
import dataPreprocessor from '../utils/DataPreprocessor';

class MLPredictionService {
  constructor() {
    this.model = null;
    this.isModelReady = false;
    this.MODEL_SAVE_PATH = 'indexeddb://titantrack-relapse-model';
    this.NUM_FEATURES = 12; // UPDATED from 10
    
    // Training history for tracking model performance
    this.trainingHistory = {
      accuracy: [],
      loss: [],
      lastTrained: null,
      totalEpochs: 0
    };
    
    // Normalization stats for consistent scaling
    this.normalizationStats = null;
    
    console.log('🧠 MLPredictionService initialized (12-feature model)');
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async initialize() {
    try {
      // Try to load existing model
      const loaded = await this.loadModel();
      if (loaded) {
        this.loadTrainingHistory();
        this.loadNormalizationStats();
        this.isModelReady = true;
        console.log('✅ Loaded existing ML model');
        return true;
      }
      
      // Create new model if none exists
      this.model = this.createModel();
      console.log('🆕 Created new ML model (12 features)');
      return true;
    } catch (error) {
      console.error('❌ ML initialization error:', error);
      return false;
    }
  }

  // ============================================================
  // MODEL ARCHITECTURE - UPDATED FOR 12 FEATURES
  // ============================================================

  createModel() {
    const model = tf.sequential();
    
    // Input layer - NOW 12 FEATURES
    model.add(tf.layers.dense({
      inputShape: [this.NUM_FEATURES], // 12 features
      units: 24,
      activation: 'relu',
      kernelInitializer: 'glorotNormal'
    }));
    
    // Dropout for regularization
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    // Hidden layer
    model.add(tf.layers.dense({
      units: 12,
      activation: 'relu',
      kernelInitializer: 'glorotNormal'
    }));
    
    // Output layer - binary classification (relapse risk)
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));
    
    // Compile model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    
    console.log('📐 Model architecture: 12 → 24 → 12 → 1');
    return model;
  }

  // ============================================================
  // TRAINING
  // ============================================================

  async train(userData, options = {}) {
    try {
      if (!this.model) {
        await this.initialize();
      }
      
      console.log('🏋️ Starting model training...');
      
      // Generate training data using DataPreprocessor
      const { features, labels, count } = dataPreprocessor.generateTrainingData(userData);
      
      if (count < 14) {
        console.log(`⚠️ Insufficient data: ${count}/14 minimum`);
        return { success: false, reason: 'Insufficient training data' };
      }
      
      // Calculate and store normalization stats
      this.normalizationStats = dataPreprocessor.calculateNormalizationStats(features);
      this.saveNormalizationStats();
      
      // Normalize features
      const normalizedFeatures = features.map(f => 
        dataPreprocessor.normalizeFeatures(f, this.normalizationStats)
      );
      
      // Convert to tensors
      const xs = tf.tensor2d(normalizedFeatures);
      const ys = tf.tensor2d(labels);
      
      // Training configuration
      const epochs = options.epochs || 50;
      const batchSize = Math.min(8, Math.floor(count / 4));
      
      // Train
      const history = await this.model.fit(xs, ys, {
        epochs,
        batchSize,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(`   Epoch ${epoch}: loss=${logs.loss.toFixed(4)}, acc=${logs.acc.toFixed(4)}`);
            }
          }
        }
      });
      
      // Cleanup tensors
      xs.dispose();
      ys.dispose();
      
      // Update training history
      const finalAccuracy = history.history.acc[history.history.acc.length - 1];
      const finalLoss = history.history.loss[history.history.loss.length - 1];
      
      this.trainingHistory.accuracy.push(finalAccuracy);
      this.trainingHistory.loss.push(finalLoss);
      this.trainingHistory.lastTrained = new Date().toISOString();
      this.trainingHistory.totalEpochs += epochs;
      
      // Save model and history
      await this.saveModel();
      this.saveTrainingHistory();
      
      this.isModelReady = true;
      
      console.log(`✅ Training complete: accuracy=${(finalAccuracy * 100).toFixed(1)}%`);
      
      return {
        success: true,
        accuracy: finalAccuracy,
        loss: finalLoss,
        epochs,
        dataPoints: count
      };
      
    } catch (error) {
      console.error('❌ Training error:', error);
      return { success: false, reason: error.message };
    }
  }

  // ============================================================
  // PREDICTION
  // ============================================================

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
      
      // Analyze contributing factors
      const factors = this.analyzeFactors(rawFeatures, userData);
      
      // Get pattern insights
      const patterns = this.analyzeStreakPatterns(userData);
      
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
          emotionalDataPoints: userData.emotionalLog?.length || 0
        }
      };
      
    } catch (error) {
      console.error('❌ Prediction error:', error);
      return this.fallbackPrediction(userData);
    }
  }

  // ============================================================
  // FACTOR ANALYSIS - UPDATED FOR 12 FEATURES
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
    
    // Streak context
    if (inPurgePhase) factors.purgePhase = { value: streakDay, weight: 0.12 };
    
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
      if (factors.purgePhase) {
        return 'Emotional purging phase - intense but temporary';
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
  // FALLBACK PREDICTION (Rule-based when ML unavailable)
  // ============================================================

  fallbackPrediction(userData) {
    let riskScore = 30; // Base risk
    const factors = {};
    
    // Get latest emotional data
    const emotionalLog = userData.emotionalLog || [];
    if (emotionalLog.length > 0) {
      const latest = emotionalLog[emotionalLog.length - 1];
      
      // Anxiety is highest weight
      if (latest.anxiety > 7) {
        riskScore += 20;
        factors.highAnxiety = { value: latest.anxiety, weight: 0.20 };
      }
      
      // Mood stability
      if (latest.mood < 4) {
        riskScore += 15;
        factors.moodVolatility = { value: latest.mood, weight: 0.18 };
      }
      
      // Emotional processing
      if (latest.processing < 4) {
        riskScore += 10;
        factors.blockedEmotions = { value: latest.processing, weight: 0.15 };
      }
    }
    
    // Get latest benefit data
    const benefitTracking = userData.benefitTracking || [];
    if (benefitTracking.length > 0) {
      const latest = benefitTracking[benefitTracking.length - 1];
      if (latest.energy < 4) {
        riskScore += 10;
        factors.lowEnergy = { value: latest.energy, weight: 0.15 };
      }
    }
    
    // Streak phase
    const streak = userData.currentStreak || 0;
    if (streak >= 15 && streak <= 45) {
      riskScore += 15;
      factors.purgePhase = { value: streak, weight: 0.12 };
    }
    
    // Time factors
    const hour = new Date().getHours();
    if (hour >= 20 || hour <= 4) {
      riskScore += 10;
      factors.highRiskHour = { value: hour, weight: 0.10 };
    }
    
    const day = new Date().getDay();
    if (day === 0 || day === 6) {
      riskScore += 5;
      factors.weekend = { value: 1, weight: 0.08 };
    }
    
    return {
      riskScore: Math.min(85, Math.max(15, riskScore)),
      reliability: 40,
      reason: this.generateReason(riskScore / 100, factors),
      usedML: false,
      factors,
      patterns: null,
      dataContext: {
        trackingDays: benefitTracking.length,
        relapseCount: userData.streakHistory?.filter(s => s.reason === 'relapse').length || 0,
        emotionalDataPoints: emotionalLog.length
      }
    };
  }

  // ============================================================
  // RELIABILITY CALCULATION
  // ============================================================

  calculateReliability(userData) {
    let reliability = this.trainingHistory.accuracy.length > 0
      ? this.trainingHistory.accuracy[this.trainingHistory.accuracy.length - 1] * 100
      : 50;
    
    // Data quantity factors
    const benefitDays = userData.benefitTracking?.length || 0;
    const emotionalDays = userData.emotionalLog?.length || 0;
    
    if (benefitDays < 30) {
      reliability *= 0.7;
    } else if (benefitDays < 50) {
      reliability *= 0.85;
    }
    
    // Emotional data coverage bonus
    if (emotionalDays > 0) {
      const coverage = emotionalDays / benefitDays;
      if (coverage > 0.7) {
        reliability *= 1.1; // 10% boost for good emotional data
      } else if (coverage > 0.3) {
        reliability *= 1.05;
      }
    }
    
    // Relapse history factors
    const relapseCount = userData.streakHistory?.filter(s => s.reason === 'relapse').length || 0;
    if (relapseCount < 2) {
      reliability *= 0.75;
    } else if (relapseCount < 4) {
      reliability *= 0.9;
    }
    
    return Math.min(Math.round(reliability), 90);
  }

  // ============================================================
  // PATTERN ANALYSIS
  // ============================================================

  analyzeStreakPatterns(userData) {
    const relapses = (userData.streakHistory || [])
      .filter(s => s.reason === 'relapse' && s.days)
      .map(s => s.days);
    
    if (relapses.length < 2) {
      return null;
    }

    const currentDay = userData.currentStreak || 0;
    
    // Find relapses within similar day range
    const similarDayRelapses = relapses.filter(d => 
      Math.abs(d - currentDay) <= 5
    );
    
    // Analyze relapse distribution
    const ranges = {
      early: relapses.filter(d => d <= 14).length,
      mid: relapses.filter(d => d > 14 && d <= 30).length,
      late: relapses.filter(d => d > 30 && d <= 60).length,
      veteran: relapses.filter(d => d > 60).length
    };
    
    // Current range
    let currentRange = 'early';
    if (currentDay > 60) currentRange = 'veteran';
    else if (currentDay > 30) currentRange = 'late';
    else if (currentDay > 14) currentRange = 'mid';
    
    return {
      totalRelapses: relapses.length,
      averageStreakLength: Math.round(relapses.reduce((a, b) => a + b, 0) / relapses.length),
      similarDayRelapses: similarDayRelapses.length,
      currentRange,
      rangeDistribution: ranges,
      inHistoricalDangerZone: similarDayRelapses.length >= 2
    };
  }

  // ============================================================
  // TRAINING STATUS
  // ============================================================

  getTrainingStatus() {
    return {
      isTrained: this.isModelReady && this.trainingHistory.lastTrained !== null,
      lastTrained: this.trainingHistory.lastTrained,
      accuracy: this.trainingHistory.accuracy.length > 0
        ? this.trainingHistory.accuracy[this.trainingHistory.accuracy.length - 1]
        : null,
      epochs: this.trainingHistory.totalEpochs,
      dataPoints: 0, // Would need to track this separately
      numFeatures: this.NUM_FEATURES
    };
  }

  // ============================================================
  // PERSISTENCE
  // ============================================================

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
  // CLEANUP
  // ============================================================

  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isModelReady = false;
  }
}

// Export singleton instance
const mlPredictionService = new MLPredictionService();
export default mlPredictionService;