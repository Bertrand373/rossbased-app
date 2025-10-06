// src/services/MLPredictionService.js
// FIXED: Added latestAccuracy to modelInfo in predict() method
import * as tf from '@tensorflow/tfjs';
import notificationService from './NotificationService';

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
    
    console.log('🧠 MLPredictionService initialized - Ready to build neural network');
  }

  async initialize() {
    try {
      console.log('🔄 Initializing AI Prediction Service...');
      
      const modelLoaded = await this.loadModel();
      
      if (modelLoaded) {
        console.log('✅ Loaded existing trained model');
        this.isModelReady = true;
      } else {
        console.log('📦 No existing model found, creating new neural network...');
        await this.createModel();
        console.log('✅ New neural network created (untrained)');
      }
      
      this.loadTrainingHistory();
      this.loadNormalizationStats();
      
      return true;
    } catch (error) {
      console.error('❌ Error initializing AI service:', error);
      await this.createModel();
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
      
      console.log('✅ Neural network architecture created');
      
      return true;
    } catch (error) {
      console.error('❌ Error creating model:', error);
      throw error;
    }
  }

  async train(userData, onProgress = null) {
    try {
      if (this.isTraining) {
        console.log('⏳ Training already in progress...');
        return { success: false, message: 'Training already in progress' };
      }
      
      this.isTraining = true;
      console.log('🎓 Starting model training...');
      
      // STEP 1: Prepare training data
      console.log('📊 Step 1/4: Preparing training data...');
      const { features, labels, stats } = await this.prepareTrainingData(userData);
      
      if (!features || features.length < this.MIN_TRAINING_DATA) {
        this.isTraining = false;
        return {
          success: false,
          message: `Need at least ${this.MIN_TRAINING_DATA} days of data. Currently have ${features ? features.length : 0} days.`
        };
      }
      
      this.normalizationStats = stats;
      this.saveNormalizationStats();
      
      console.log(`✅ Prepared ${features.length} training examples`);
      
      // STEP 2: Create fresh model for retraining (FIX for retraining bug)
      console.log('🔧 Step 2/4: Preparing model...');
      await this.createModel();
      
      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels);
      
      // STEP 3: Train!
      console.log('🏋️ Step 3/4: Training neural network...');
      console.log('   This may take 30-60 seconds...');
      
      const startTime = Date.now();
      
      const history = await this.model.fit(xs, ys, {
        epochs: 50,
        batchSize: 8,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(`   Epoch ${epoch + 1}/50 - Loss: ${logs.loss.toFixed(4)}, Accuracy: ${(logs.acc * 100).toFixed(1)}%`);
              
              if (onProgress) {
                onProgress({
                  epoch: epoch + 1,
                  totalEpochs: 50,
                  loss: logs.loss,
                  accuracy: logs.acc * 100,
                  valLoss: logs.val_loss,
                  valAccuracy: logs.val_acc ? logs.val_acc * 100 : null,
                  message: `Training... Epoch ${epoch + 1}/50`
                });
              }
            }
          }
        }
      });
      
      const trainingTime = Math.round((Date.now() - startTime) / 1000);
      
      xs.dispose();
      ys.dispose();
      
      // STEP 4: Save
      console.log('💾 Step 4/4: Saving trained model...');
      await this.saveModel();
      
      const finalLoss = history.history.loss[history.history.loss.length - 1];
      const finalAccuracy = history.history.acc[history.history.acc.length - 1];
      const finalValAccuracy = history.history.val_acc ? history.history.val_acc[history.history.val_acc.length - 1] : null;
      
      this.trainingHistory = {
        accuracy: [...this.trainingHistory.accuracy, finalAccuracy],
        loss: [...this.trainingHistory.loss, finalLoss],
        lastTrained: new Date().toISOString(),
        totalEpochs: this.trainingHistory.totalEpochs + 50
      };
      this.saveTrainingHistory();
      
      this.isModelReady = true;
      this.isTraining = false;
      
      console.log('🎉 Training complete!');
      console.log(`   Final Accuracy: ${(finalAccuracy * 100).toFixed(1)}%`);
      
      return {
        success: true,
        accuracy: finalAccuracy * 100,
        valAccuracy: finalValAccuracy ? finalValAccuracy * 100 : null,
        loss: finalLoss,
        trainingExamples: features.length,
        trainingTime: trainingTime,
        message: 'Model trained successfully!'
      };
      
    } catch (error) {
      console.error('❌ Training error:', error);
      this.isTraining = false;
      return {
        success: false,
        message: `Training failed: ${error.message}`
      };
    }
  }

  async prepareTrainingData(userData) {
    const features = [];
    const labels = [];
    const rawFeatures = [];
    
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
      rawFeatures.push(dayFeatures);
      labels.push([hadRelapse ? 1 : 0]);
    }
    
    const stats = this.calculateNormalizationStats(rawFeatures);
    
    for (const dayFeatures of rawFeatures) {
      const normalized = this.normalizeFeatures(dayFeatures, stats);
      features.push(normalized);
    }
    
    return { features, labels, stats };
  }

  extractFeatures(current, previous, currentDate, userData) {
    const energy = current.energy || 5;
    const focus = current.focus || 5;
    const confidence = current.confidence || 5;
    const previousEnergy = previous?.energy || 5;
    const energyDrop = previousEnergy - energy;
    const hour = currentDate.getHours();
    const isWeekend = (currentDate.getDay() === 0 || currentDate.getDay() === 6) ? 1 : 0;
    const currentStreak = userData.currentStreak || 0;
    const inPurgePhase = (currentStreak >= 15 && currentStreak <= 45) ? 1 : 0;
    
    let anxiety = 5;
    let moodStability = 5;
    
    if (userData.emotionalTracking && userData.emotionalTracking.length > 0) {
      const latestEmotion = userData.emotionalTracking[userData.emotionalTracking.length - 1];
      anxiety = latestEmotion.anxiety || 5;
      moodStability = latestEmotion.moodStability || 5;
    }
    
    return [
      energy,
      focus,
      confidence,
      energyDrop,
      hour,
      isWeekend,
      currentStreak,
      inPurgePhase,
      anxiety,
      moodStability
    ];
  }

  calculateNormalizationStats(rawFeatures) {
    if (rawFeatures.length === 0) return null;
    
    const numFeatures = rawFeatures[0].length;
    const stats = [];
    
    for (let i = 0; i < numFeatures; i++) {
      const values = rawFeatures.map(f => f[i]);
      stats.push({
        min: Math.min(...values),
        max: Math.max(...values)
      });
    }
    
    return stats;
  }

  normalizeFeatures(features, stats) {
    return features.map((value, i) => {
      const { min, max } = stats[i];
      if (max === min) return 0.5;
      return (value - min) / (max - min);
    });
  }

  async predict(userData) {
    try {
      if (!this.isModelReady || !this.model) {
        console.log('⚠️ Model not ready, using fallback prediction');
        return this.fallbackPrediction(userData);
      }
      
      if (!userData.benefitTracking || userData.benefitTracking.length < 2) {
        return {
          riskScore: 30,
          confidence: 20,
          reason: 'Insufficient data for AI prediction',
          usedML: false,
          factors: {}
        };
      }
      
      const current = userData.benefitTracking[userData.benefitTracking.length - 1];
      const previous = userData.benefitTracking[userData.benefitTracking.length - 2];
      const currentDate = new Date();
      
      const rawFeatures = this.extractFeatures(current, previous, currentDate, userData);
      
      if (!this.normalizationStats) {
        this.loadNormalizationStats();
      }
      
      const normalizedFeatures = this.normalizationStats
        ? this.normalizeFeatures(rawFeatures, this.normalizationStats)
        : rawFeatures.map(f => f / 10);
      
      const inputTensor = tf.tensor2d([normalizedFeatures]);
      const prediction = this.model.predict(inputTensor);
      const predictionArray = await prediction.data();
      
      inputTensor.dispose();
      prediction.dispose();
      
      const riskScore = Math.round(predictionArray[0] * 100);
      const confidence = this.calculateConfidence();
      const reason = this.generateReason(rawFeatures, riskScore);
      
      console.log(`🤖 AI Prediction: ${riskScore}% risk (${confidence}% confidence)`);
      
      // NEW: Auto-send notification if high risk
      if (riskScore >= 70) {
        await notificationService.sendUrgePredictionNotification(riskScore, reason);
      }
      
      // FIXED: Include latestAccuracy in modelInfo
      const latestAccuracy = this.trainingHistory.accuracy.length > 0
        ? Math.round(this.trainingHistory.accuracy[this.trainingHistory.accuracy.length - 1] * 100)
        : null;
      
      return {
        riskScore,
        confidence,
        reason,
        usedML: true,
        factors: {
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
        },
        modelInfo: {
          lastTrained: this.trainingHistory.lastTrained,
          totalEpochs: this.trainingHistory.totalEpochs,
          latestAccuracy: latestAccuracy  // FIXED: Added this
        }
      };
      
    } catch (error) {
      console.error('❌ Prediction error:', error);
      return this.fallbackPrediction(userData);
    }
  }

  calculateConfidence() {
    if (this.trainingHistory.accuracy.length === 0) {
      return 60;
    }
    
    const latestAccuracy = this.trainingHistory.accuracy[this.trainingHistory.accuracy.length - 1];
    return Math.round(latestAccuracy * 100);
  }

  generateReason(features, riskScore) {
    const reasons = [];
    
    const [energy, focus, confidence, energyDrop, hour, isWeekend, streak, inPurgePhase, anxiety, moodStability] = features;
    
    if (energyDrop > 2) {
      reasons.push(`Energy dropped ${energyDrop.toFixed(1)} points`);
    }
    
    if (hour >= 20 && hour <= 23) {
      reasons.push('Evening hours (high-risk time)');
    }
    
    if (isWeekend) {
      reasons.push('Weekend (less structure)');
    }
    
    if (inPurgePhase) {
      reasons.push('In emotional purging phase (days 15-45)');
    }
    
    if (anxiety > 7 && moodStability < 4) {
      reasons.push('High anxiety + low mood stability');
    }
    
    if (energy < 4 && focus < 4) {
      reasons.push('Low energy and focus');
    }
    
    if (reasons.length === 0) {
      if (riskScore > 60) {
        return 'AI detected elevated risk pattern';
      } else {
        return 'Overall conditions favorable';
      }
    }
    
    return reasons.slice(0, 2).join(' + ');
  }

  fallbackPrediction(userData) {
    let riskScore = 30;
    
    if (userData.currentStreak >= 15 && userData.currentStreak <= 45) {
      riskScore += 15;
    }
    
    const hour = new Date().getHours();
    if (hour >= 20 && hour <= 23) {
      riskScore += 20;
    }
    
    return {
      riskScore: Math.min(riskScore, 100),
      confidence: 40,
      reason: 'Using basic prediction (model not trained yet)',
      usedML: false,
      factors: {}
    };
  }

  async saveModel() {
    try {
      if (!this.model) {
        console.log('⚠️ No model to save');
        return false;
      }
      
      await this.model.save(this.MODEL_SAVE_PATH);
      console.log('✅ Model saved to IndexedDB');
      return true;
    } catch (error) {
      console.error('❌ Error saving model:', error);
      return false;
    }
  }

  async loadModel() {
    try {
      this.model = await tf.loadLayersModel(this.MODEL_SAVE_PATH);
      console.log('✅ Model loaded from IndexedDB');
      return true;
    } catch (error) {
      console.log('ℹ️ No saved model found (this is normal for first-time use)');
      return false;
    }
  }

  saveNormalizationStats() {
    try {
      localStorage.setItem('ml_normalization_stats', JSON.stringify(this.normalizationStats));
    } catch (error) {
      console.error('Error saving normalization stats:', error);
    }
  }

  loadNormalizationStats() {
    try {
      const saved = localStorage.getItem('ml_normalization_stats');
      if (saved) {
        this.normalizationStats = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading normalization stats:', error);
    }
  }

  saveTrainingHistory() {
    try {
      localStorage.setItem('ml_training_history', JSON.stringify(this.trainingHistory));
    } catch (error) {
      console.error('Error saving training history:', error);
    }
  }

  loadTrainingHistory() {
    try {
      const saved = localStorage.getItem('ml_training_history');
      if (saved) {
        this.trainingHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading training history:', error);
    }
  }

  needsRetraining() {
    if (!this.trainingHistory.lastTrained) {
      return true;
    }
    
    const lastTrained = new Date(this.trainingHistory.lastTrained);
    const daysSinceTraining = (Date.now() - lastTrained.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceTraining >= 7;
  }

  getModelInfo() {
    return {
      isReady: this.isModelReady,
      isTraining: this.isTraining,
      lastTrained: this.trainingHistory.lastTrained,
      totalEpochs: this.trainingHistory.totalEpochs,
      latestAccuracy: this.trainingHistory.accuracy.length > 0
        ? Math.round(this.trainingHistory.accuracy[this.trainingHistory.accuracy.length - 1] * 100)
        : null,
      needsRetraining: this.needsRetraining()
    };
  }

  // NEW: Process user feedback to improve future predictions
  processFeedback(feedback) {
    try {
      const allFeedback = JSON.parse(localStorage.getItem('prediction_feedback') || '[]');
      allFeedback.push({
        ...feedback,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('prediction_feedback', JSON.stringify(allFeedback));
      
      console.log('✅ Feedback recorded:', feedback.userFeedback);
      
      // Check if multiple false alarms suggest retraining needed
      const recentFeedback = allFeedback.filter(f => {
        const feedbackDate = new Date(f.timestamp);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        return feedbackDate >= cutoffDate;
      });
      
      const falseAlarms = recentFeedback.filter(f => f.userFeedback === 'false_alarm').length;
      
      if (falseAlarms >= 5) {
        console.log('⚠️ Multiple false alarms detected. Consider retraining.');
      }
      
      return true;
    } catch (error) {
      console.error('Error processing feedback:', error);
      return false;
    }
  }
}

const mlPredictionService = new MLPredictionService();

export default mlPredictionService;