// src/services/MLPredictionService.js
// TensorFlow.js-based ML prediction with 12-feature neural network
// UPDATED: Added evaluation metrics, class weighting, intervention feedback loop
// UPDATED: Added aggregate data submission for opted-in users

import * as tf from '@tensorflow/tfjs';
import dataPreprocessor from '../utils/DataPreprocessor';
import MLEvaluationMetrics from '../utils/MLEvaluationMetrics';
import interventionService from './InterventionService';
import aggregateDataService from './AggregateDataService';

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
  // TRAINING - 12-Feature Dataset with Class Weighting & Feedback
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

      // === TASK 1B: Calculate class weights for imbalanced data ===
      const classWeights = MLEvaluationMetrics.calculateClassWeights(trainingData.labels);
      const sampleWeights = MLEvaluationMetrics.generateSampleWeights(
        trainingData.labels, 
        classWeights
      );
      
      console.log('⚖️ Class weights applied:', classWeights);
      
      // === TASK 1C: Apply intervention feedback to weights ===
      const interventionData = this.getInterventionFeedback();
      const feedbackWeights = MLEvaluationMetrics.applyFeedbackWeights(
        sampleWeights,
        interventionData,
        trainingData.dates || []
      );
      
      if (interventionData.length > 0) {
        console.log(`🔄 Applied feedback from ${interventionData.length} interventions`);
      }
      
      const sampleWeightTensor = tf.tensor1d(feedbackWeights);

      // Train with class weighting
      const result = await this.model.fit(xs, ys, {
        epochs: 50,
        batchSize: Math.min(32, Math.floor(normalizedFeatures.length / 2)),
        validationSplit: 0.2,
        shuffle: true,
        sampleWeight: sampleWeightTensor,
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

      // === TASK 1A: Calculate evaluation metrics ===
      const predictions = this.model.predict(xs);
      const predictedValues = await predictions.data();
      const actualValues = trainingData.labels;
      
      const evaluationMetrics = MLEvaluationMetrics.calculate(
        Array.from(predictedValues),
        actualValues,
        0.5 // threshold
      );
      
      predictions.dispose();
      
      console.log('📊 Model Evaluation Metrics:');
      console.log(MLEvaluationMetrics.format(evaluationMetrics));

      // Cleanup tensors
      sampleWeightTensor.dispose();
      xs.dispose();
      ys.dispose();

      // Save model
      await this.saveModel();

      // Save training history with evaluation metrics
      const history = {
        lastTrained: new Date().toISOString(),
        samples: normalizedFeatures.length,
        finalLoss: result.history.loss[result.history.loss.length - 1],
        finalAccuracy: result.history.acc[result.history.acc.length - 1],
        relapseCount: relapses.length,
        // TASK 1A: Store evaluation metrics
        metrics: evaluationMetrics ? {
          precision: evaluationMetrics.precision,
          recall: evaluationMetrics.recall,
          f1Score: evaluationMetrics.f1Score,
          confusionMatrix: evaluationMetrics.confusionMatrix
        } : null,
        // TASK 1B: Store class weights used
        classWeights: classWeights,
        // TASK 1C: Store feedback info
        feedbackSamplesUsed: interventionData.length
      };
      
      localStorage.setItem('ml_training_history', JSON.stringify(history));
      this.trainingHistory = history;

      // === PHASE 2C: Submit anonymized patterns if opted in ===
      // This runs async and won't block the return
      if (userData.anonymousDataSharing) {
        aggregateDataService.submitPatterns(userData, evaluationMetrics)
          .then(submitted => {
            if (submitted) {
              console.log('📊 Anonymized patterns shared to help improve TitanTrack');
            }
          })
          .catch(err => {
            console.warn('Aggregate submission failed (non-blocking):', err);
          });
      }

      return {
        success: true,
        samples: normalizedFeatures.length,
        epochs: 50,
        finalLoss: history.finalLoss,
        finalAccuracy: history.finalAccuracy,
        // Include evaluation metrics in return
        metrics: evaluationMetrics
      };

    } catch (error) {
      console.error('❌ Training error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================
  // TASK 1C: INTERVENTION FEEDBACK FOR RETRAINING
  // ============================================================

  /**
   * Get intervention feedback data for training weight adjustments
   * Identifies false positives and false negatives from past predictions
   */
  getInterventionFeedback() {
    try {
      const trainingData = interventionService.getTrainingData();
      
      if (!trainingData || trainingData.length === 0) {
        return [];
      }

      return trainingData.map(intervention => {
        // False positive: high risk predicted, but no relapse (success)
        const wasFalsePositive = intervention.riskScore >= 50 && 
                                  intervention.outcome === 'success';
        
        // False negative: low risk predicted, but relapse happened
        const wasFalseNegative = intervention.riskScore < 50 && 
                                  intervention.outcome === 'relapse';

        return {
          createdAt: intervention.createdAt || new Date().toISOString(),
          riskScore: intervention.riskScore,
          outcome: intervention.outcome,
          wasFalsePositive,
          wasFalseNegative
        };
      });
    } catch (error) {
      console.warn('Could not load intervention feedback:', error);
      return [];
    }
  }

  // ============================================================
  // PREDICTION
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
        return this.fallbackPrediction(userData);
      }

      // Get current features
      const current = userData.benefitTracking[userData.benefitTracking.length - 1];
      const previous = userData.benefitTracking[userData.benefitTracking.length - 2];
      
      const features = dataPreprocessor.extractFeatures(
        current, 
        previous, 
        new Date(), 
        userData
      );

      if (!this.normalizationStats) {
        console.warn('No normalization stats available');
        return this.fallbackPrediction(userData);
      }

      // Normalize and predict
      const normalizedFeatures = dataPreprocessor.normalizeFeatures(
        features, 
        this.normalizationStats
      );

      const inputTensor = tf.tensor2d([normalizedFeatures]);
      const predictionTensor = this.model.predict(inputTensor);
      const predictionValue = (await predictionTensor.data())[0];

      // Cleanup
      inputTensor.dispose();
      predictionTensor.dispose();

      // Convert to percentage
      const riskScore = Math.round(predictionValue * 100);

      // Get interpretable factors
      const factors = this.interpretPrediction(features, normalizedFeatures, riskScore);

      const result = {
        riskScore,
        confidence: this.calculateConfidence(),
        factors,
        patterns: this.extractPatterns(userData),
        modelBased: true,
        usedML: true,
        timestamp: new Date().toISOString()
      };

      return this.enrichPredictionWithPatterns(result, userData);

    } catch (error) {
      console.error('Prediction error:', error);
      return this.fallbackPrediction(userData);
    }
  }

  // ============================================================
  // PREDICTION HELPERS
  // ============================================================

  interpretPrediction(features, normalizedFeatures, riskScore) {
    const factors = {};
    
    // Feature names matching DataPreprocessor
    const featureNames = [
      'energy', 'focus', 'confidence', 'energyDrop', 'hourOfDay', 
      'isWeekend', 'streakDay', 'inPurgePhase',
      'anxiety', 'moodStability', 'mentalClarity', 'emotionalProcessing'
    ];

    // Identify contributing factors based on raw feature values
    if (features[0] < 4) factors.lowEnergy = true;
    if (features[1] < 4) factors.lowFocus = true;
    if (features[3] > 2) factors.energyDecline = true;
    
    const hour = features[4];
    if (hour >= 21 || hour <= 5) factors.lateNight = true;
    
    if (features[5] === 1) factors.weekend = true;
    if (features[7] === 1) {
      factors.purgePhase = true;
      factors.inPurgePhase = true;
      factors.emotionalProcessingPhase = true;
    }
    if (features[8] > 7) factors.highAnxiety = true;
    if (features[9] < 4) factors.lowMood = true;

    return factors;
  }

  extractPatterns(userData) {
    const patterns = {};
    const streakHistory = userData.streakHistory || [];
    const relapses = streakHistory.filter(s => s.reason === 'relapse');

    if (relapses.length >= 2) {
      // Find common streak lengths at relapse
      const streakLengths = relapses.map(r => r.days || 0);
      const avgStreak = streakLengths.reduce((a, b) => a + b, 0) / streakLengths.length;
      
      if (avgStreak > 0) {
        patterns.typicalStreakLength = Math.round(avgStreak);
      }

      // Find day of week patterns
      const dayCount = [0, 0, 0, 0, 0, 0, 0];
      relapses.forEach(r => {
        if (r.end) {
          const day = new Date(r.end).getDay();
          dayCount[day]++;
        }
      });
      
      const maxDay = dayCount.indexOf(Math.max(...dayCount));
      if (dayCount[maxDay] > 1) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        patterns.riskDay = dayNames[maxDay];
      }
    }

    return patterns;
  }

  // ============================================================
  // PATTERN ENRICHMENT - Builds rich data for PredictionDisplay
  // ============================================================

  enrichPredictionWithPatterns(prediction, userData) {
    const patterns = prediction.patterns || {};
    const streakHistory = userData.streakHistory || [];
    const relapses = streakHistory.filter(s => s.reason === 'relapse');
    const currentStreak = userData.currentStreak || 0;
    const benefitTracking = userData.benefitTracking || [];

    // === STREAK PATTERN ===
    // Check if current streak day is near a past relapse day
    if (relapses.length >= 1 && currentStreak > 0) {
      const rangePadding = 3;
      const rangeStart = Math.max(1, currentStreak - rangePadding);
      const rangeEnd = currentStreak + rangePadding;

      const relapsesInRange = relapses.filter(r => {
        const days = r.days || 0;
        return days > 0 && days >= rangeStart && days <= rangeEnd;
      });

      if (relapsesInRange.length > 0) {
        patterns.streak = {
          isHighRiskDay: true,
          currentDay: currentStreak,
          relapsesInRange: relapsesInRange.length,
          totalRelapses: relapses.length,
          rangeDays: [rangeStart, rangeEnd]
        };
      }
    }

    // === TIME PATTERN ===
    // Calculate evening relapse percentage and check if it's evening now
    if (relapses.length >= 1) {
      const eveningRelapses = relapses.filter(r => {
        if (!r.end) return false;
        const hour = new Date(r.end).getHours();
        return hour >= 20 || hour <= 2;
      });

      const eveningPercentage = Math.round(
        (eveningRelapses.length / relapses.length) * 100
      );

      const currentHour = new Date().getHours();
      const isEveningNow = currentHour >= 20 || currentHour <= 2;

      if (isEveningNow && eveningPercentage > 30) {
        patterns.time = {
          isHighRiskTime: true,
          eveningPercentage
        };
      }
    }

    // === BENEFIT DROP PATTERN ===
    // Check last 3 days for significant drops in any metric
    if (benefitTracking.length >= 3) {
      const recent = benefitTracking.slice(-3);
      const metrics = ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'];
      const drops = [];

      metrics.forEach(metric => {
        const first = recent[0]?.[metric];
        const last = recent[recent.length - 1]?.[metric];
        if (first != null && last != null && (first - last) >= 3) {
          drops.push({
            metric: metric.charAt(0).toUpperCase() + metric.slice(1),
            from: first,
            to: last
          });
        }
      });

      if (drops.length > 0) {
        patterns.benefits = {
          hasSignificantDrop: true,
          drops,
          daysCovered: recent.length
        };
      }
    }

    // === HISTORICAL MATCH ===
    // Find a past relapse at a similar streak day
    if (relapses.length >= 1 && currentStreak > 0) {
      const match = relapses
        .filter(r => (r.days || 0) > 0)
        .find(r => Math.abs(r.days - currentStreak) <= 3);

      if (match) {
        patterns.historical = {
          matchDay: match.days,
          daysUntilRelapse: Math.max(0, match.days - currentStreak)
        };
      }
    }

    // === SUGGESTIONS ===
    // Contextual tool recommendations based on active risk factors
    if (prediction.riskScore >= 50) {
      const suggestions = [];

      if (patterns.time?.isHighRiskTime || prediction.factors?.lateNight) {
        suggestions.push({
          focus: 'Breathing Exercise',
          reason: 'Effective for evening vulnerability windows',
          tools: ['breathing']
        });
      }

      if (patterns.benefits?.hasSignificantDrop || prediction.factors?.lowEnergy) {
        suggestions.push({
          focus: 'Cold Exposure',
          reason: 'Resets nervous system during energy drops',
          tools: ['cold']
        });
      }

      if (prediction.factors?.weekend) {
        suggestions.push({
          focus: 'Physical Activity',
          reason: 'Adds structure during unstructured weekend hours',
          tools: ['exercise']
        });
      }

      if (prediction.factors?.highAnxiety || prediction.factors?.lowMood) {
        suggestions.push({
          focus: 'Journaling',
          reason: 'Process emotions before they become triggers',
          tools: ['journal']
        });
      }

      if (suggestions.length === 0) {
        suggestions.push({
          focus: 'Mindful Awareness',
          reason: 'Stay present and observe urges without acting',
          tools: ['breathing']
        });
      }

      patterns.suggestions = suggestions;
    }

    // === DATA CONTEXT ===
    prediction.dataContext = {
      trackingDays: benefitTracking.length,
      relapseCount: relapses.length
    };

    prediction.patterns = patterns;
    return prediction;
  }

  calculateConfidence() {
    // Base confidence on training history
    const history = this.trainingHistory || JSON.parse(localStorage.getItem('ml_training_history') || '{}');
    
    if (!history.samples) return 0.3;
    
    // More samples = higher confidence (max 0.9)
    const sampleFactor = Math.min(history.samples / 100, 1) * 0.3;
    
    // Better accuracy = higher confidence
    const accuracyFactor = (history.finalAccuracy || 0.5) * 0.3;
    
    // F1 score factor if available
    const f1Factor = (history.metrics?.f1Score || 0.5) * 0.3;
    
    return Math.min(0.3 + sampleFactor + accuracyFactor + f1Factor, 0.9);
  }

  fallbackPrediction(userData) {
    // Simple heuristic-based prediction when model isn't trained
    let riskScore = 30; // Base risk
    const factors = {};

    const current = userData.benefitTracking?.[userData.benefitTracking.length - 1];
    
    if (current) {
      // Low energy increases risk
      if (current.energy && current.energy < 4) {
        riskScore += 15;
        factors.lowEnergy = true;
      }
      
      // Low focus increases risk
      if (current.focus && current.focus < 4) {
        riskScore += 10;
        factors.lowFocus = true;
      }
    }

    // Time-based factors
    const hour = new Date().getHours();
    if (hour >= 21 || hour <= 5) {
      riskScore += 15;
      factors.lateNight = true;
    }

    const day = new Date().getDay();
    if (day === 0 || day === 6) {
      riskScore += 10;
      factors.weekend = true;
    }

    // Purge / Emotional Processing phase (days 15-45)
    const currentStreak = userData.currentStreak || 0;
    if (currentStreak >= 15 && currentStreak <= 45) {
      riskScore += 10;
      factors.purgePhase = true;
      factors.inPurgePhase = true;
      factors.emotionalProcessingPhase = true;
    }

    const result = {
      riskScore: Math.min(riskScore, 85),
      confidence: 0.3,
      factors,
      patterns: {},
      modelBased: false,
      usedML: false,
      timestamp: new Date().toISOString()
    };

    return this.enrichPredictionWithPatterns(result, userData);
  }

  // ============================================================
  // STATUS & INFO
  // ============================================================

  getTrainingStatus() {
    const history = this.trainingHistory || JSON.parse(localStorage.getItem('ml_training_history') || '{}');
    
    return {
      isTrained: !!history.lastTrained,
      lastTrained: history.lastTrained || null,
      accuracy: history.finalAccuracy || null,
      epochs: 50,
      dataPoints: history.samples || 0,
      // Include new metrics
      metrics: history.metrics || null
    };
  }

  getModelInfo() {
    const history = this.trainingHistory || JSON.parse(localStorage.getItem('ml_training_history') || '{}');
    
    return {
      isReady: this.isInitialized && !!history.lastTrained,
      architecture: '12 → 24 → 12 → 1',
      lastTrained: history.lastTrained,
      samples: history.samples,
      accuracy: history.finalAccuracy,
      // Include evaluation metrics
      precision: history.metrics?.precision,
      recall: history.metrics?.recall,
      f1Score: history.metrics?.f1Score,
      confusionMatrix: history.metrics?.confusionMatrix,
      // Retraining check
      needsRetraining: this.checkNeedsRetraining(history)
    };
  }

  checkNeedsRetraining(history) {
    if (!history.lastTrained) return true;
    
    const daysSinceTraining = (Date.now() - new Date(history.lastTrained).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceTraining > 7; // Retrain weekly
  }

  /**
   * Get detailed metrics for display
   */
  getEvaluationMetrics() {
    const history = this.trainingHistory || JSON.parse(localStorage.getItem('ml_training_history') || '{}');
    return history.metrics || null;
  }
}

// Singleton instance
const mlPredictionService = new MLPredictionService();

export default mlPredictionService;