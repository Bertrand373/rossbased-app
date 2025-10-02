// src/services/MLPredictionService.js
// REAL TensorFlow.js Machine Learning Service for Urge Prediction
// This replaces rule-based predictions with actual neural network predictions

import * as tf from '@tensorflow/tfjs';

/**
 * MLPredictionService - Uses REAL machine learning to predict urge risk
 * 
 * HOW IT WORKS (Simple Explanation):
 * 1. Takes your data (energy, mood, time, etc.) and converts it to numbers
 * 2. Feeds those numbers into a "brain" (neural network)
 * 3. The brain learns patterns from your history
 * 4. It predicts your urge risk based on what it learned
 * 
 * KEY CONCEPTS:
 * - Neural Network: Like a brain made of connected nodes that learn patterns
 * - Training: Teaching the brain by showing it examples
 * - Prediction: The brain making a guess based on what it learned
 * - Features: The pieces of information we feed into the brain (energy, time, etc.)
 */
class MLPredictionService {
  constructor() {
    // The neural network model (our "brain")
    this.model = null;
    
    // Whether the model is ready to use
    this.isModelReady = false;
    
    // Whether we're currently training
    this.isTraining = false;
    
    // Minimum data points needed before we can train
    this.MIN_TRAINING_DATA = 20;
    
    // Database name for saving the model in browser storage
    this.MODEL_SAVE_PATH = 'indexeddb://titantrack-urge-model';
    
    // Training history for tracking improvement
    this.trainingHistory = {
      accuracy: [],
      loss: [],
      lastTrained: null,
      totalEpochs: 0
    };
    
    // Keep track of normalization values (for converting data to 0-1 range)
    this.normalizationStats = null;
    
    console.log('🧠 MLPredictionService initialized - Ready to build neural network');
  }

  /**
   * Initialize the service - loads existing model or creates new one
   * Call this when the app starts
   */
  async initialize() {
    try {
      console.log('🔄 Initializing ML Prediction Service...');
      
      // Try to load an existing trained model from browser storage
      const modelLoaded = await this.loadModel();
      
      if (modelLoaded) {
        console.log('✅ Loaded existing trained model');
        this.isModelReady = true;
      } else {
        console.log('📦 No existing model found, creating new neural network...');
        await this.createModel();
        console.log('✅ New neural network created (untrained)');
      }
      
      // Load training history
      this.loadTrainingHistory();
      
      return true;
    } catch (error) {
      console.error('❌ Error initializing ML service:', error);
      // Create a basic model as fallback
      await this.createModel();
      return false;
    }
  }

  /**
   * Create a brand new neural network
   * 
   * ARCHITECTURE (Simple Explanation):
   * - Input Layer: Takes 10 numbers (features like energy, time, mood)
   * - Hidden Layer 1: 16 neurons that find patterns
   * - Hidden Layer 2: 8 neurons that refine patterns
   * - Output Layer: 1 number (risk score from 0 to 100)
   */
  async createModel() {
    try {
      // Create a sequential model (layers stacked on top of each other)
      this.model = tf.sequential();
      
      // INPUT + FIRST HIDDEN LAYER
      // Takes 10 features and processes them with 16 neurons
      // 'relu' activation = only keeps positive values (like a filter)
      this.model.add(tf.layers.dense({
        units: 16,              // 16 neurons in this layer
        inputShape: [10],       // Expects 10 input features
        activation: 'relu',     // Activation function (keeps positive patterns)
        kernelInitializer: 'heNormal'  // Smart way to start the learning
      }));
      
      // Dropout layer - randomly ignores 20% of neurons during training
      // This prevents overfitting (memorizing instead of learning)
      this.model.add(tf.layers.dropout({ rate: 0.2 }));
      
      // SECOND HIDDEN LAYER
      // Takes the 16 outputs and processes them with 8 neurons
      this.model.add(tf.layers.dense({
        units: 8,
        activation: 'relu',
        kernelInitializer: 'heNormal'
      }));
      
      // Another dropout for better learning
      this.model.add(tf.layers.dropout({ rate: 0.2 }));
      
      // OUTPUT LAYER
      // Produces 1 number (the risk score)
      // 'sigmoid' activation = squashes output between 0 and 1
      this.model.add(tf.layers.dense({
        units: 1,
        activation: 'sigmoid'   // Squashes output to 0-1 range
      }));
      
      // COMPILE THE MODEL
      // This sets up HOW the model will learn
      this.model.compile({
        optimizer: tf.train.adam(0.001),  // Learning algorithm (Adam is popular)
        loss: 'binaryCrossentropy',       // How we measure prediction errors
        metrics: ['accuracy']              // Track how often we're correct
      });
      
      console.log('✅ Neural network architecture created:');
      console.log('   - Input: 10 features');
      console.log('   - Hidden Layer 1: 16 neurons');
      console.log('   - Hidden Layer 2: 8 neurons');
      console.log('   - Output: 1 risk score (0-100%)');
      
      return true;
    } catch (error) {
      console.error('❌ Error creating model:', error);
      throw error;
    }
  }

  /**
   * Train the model on user's historical data
   * This is where the "brain" actually learns!
   * 
   * @param {Object} userData - User's complete data history
   * @param {Function} onProgress - Callback for progress updates (optional)
   */
  async train(userData, onProgress = null) {
    try {
      // Prevent multiple simultaneous training sessions
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
      
      // Save normalization stats for future predictions
      this.normalizationStats = stats;
      this.saveNormalizationStats();
      
      console.log(`✅ Prepared ${features.length} training examples`);
      
      // STEP 2: Convert data to TensorFlow format
      console.log('🔧 Step 2/4: Converting to tensors...');
      const xs = tf.tensor2d(features);  // Input features
      const ys = tf.tensor2d(labels);    // Expected outputs (what we want to predict)
      
      // STEP 3: Train the model!
      console.log('🏋️ Step 3/4: Training neural network...');
      console.log('   This may take 30-60 seconds...');
      
      const history = await this.model.fit(xs, ys, {
        epochs: 50,              // Train for 50 rounds
        batchSize: 8,            // Process 8 examples at a time
        validationSplit: 0.2,    // Use 20% of data for validation
        shuffle: true,           // Randomize order each round
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            // Report progress every 10 epochs
            if (epoch % 10 === 0) {
              console.log(`   Epoch ${epoch + 1}/50 - Loss: ${logs.loss.toFixed(4)}, Accuracy: ${(logs.acc * 100).toFixed(1)}%`);
              
              if (onProgress) {
                onProgress({
                  epoch: epoch + 1,
                  totalEpochs: 50,
                  loss: logs.loss,
                  accuracy: logs.acc * 100,
                  valLoss: logs.val_loss,
                  valAccuracy: logs.val_acc * 100
                });
              }
            }
          }
        }
      });
      
      // Clean up tensors to free memory
      xs.dispose();
      ys.dispose();
      
      // STEP 4: Save the trained model
      console.log('💾 Step 4/4: Saving trained model...');
      await this.saveModel();
      
      // Update training history
      const finalLoss = history.history.loss[history.history.loss.length - 1];
      const finalAccuracy = history.history.acc[history.history.acc.length - 1];
      
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
      console.log(`   Final Loss: ${finalLoss.toFixed(4)}`);
      
      return {
        success: true,
        accuracy: finalAccuracy * 100,
        loss: finalLoss,
        trainingExamples: features.length,
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

  /**
   * Prepare training data from user history
   * Converts user data into features (inputs) and labels (outputs)
   * 
   * @param {Object} userData - User's historical data
   * @returns {Object} { features: [[...], [...]], labels: [[...], [...]]}
   */
  async prepareTrainingData(userData) {
    const features = [];
    const labels = [];
    const rawFeatures = [];
    
    // We need benefit tracking and streak history
    if (!userData.benefitTracking || userData.benefitTracking.length < 2) {
      return { features: null, labels: null, stats: null };
    }
    
    // Get relapse history (times when urges won)
    const relapses = (userData.streakHistory || [])
      .filter(s => s.reason === 'relapse' && s.end)
      .map(s => ({
        date: new Date(s.end),
        trigger: s.trigger,
        days: s.days
      }));
    
    // For each day of benefit tracking, create a training example
    for (let i = 1; i < userData.benefitTracking.length; i++) {
      const current = userData.benefitTracking[i];
      const previous = userData.benefitTracking[i - 1];
      
      const currentDate = new Date(current.date);
      
      // Check if there was a relapse on this day
      const hadRelapse = relapses.some(r => {
        const relapseDateStr = r.date.toISOString().split('T')[0];
        const currentDateStr = currentDate.toISOString().split('T')[0];
        return relapseDateStr === currentDateStr;
      });
      
      // Extract features for this day
      const dayFeatures = this.extractFeatures(current, previous, currentDate, userData);
      rawFeatures.push(dayFeatures);
      
      // Label: 1 if relapse happened, 0 if didn't
      labels.push([hadRelapse ? 1 : 0]);
    }
    
    // Calculate normalization stats
    const stats = this.calculateNormalizationStats(rawFeatures);
    
    // Normalize all features to 0-1 range
    for (const dayFeatures of rawFeatures) {
      const normalized = this.normalizeFeatures(dayFeatures, stats);
      features.push(normalized);
    }
    
    return { features, labels, stats };
  }

  /**
   * Extract 10 features from a day's data
   * These are the inputs our neural network will use
   * 
   * FEATURES EXTRACTED:
   * 1. Energy level (0-10)
   * 2. Focus level (0-10)
   * 3. Confidence level (0-10)
   * 4. Energy drop from yesterday (can be negative)
   * 5. Hour of day (0-23)
   * 6. Is weekend? (0 or 1)
   * 7. Current streak day number
   * 8. In purge phase? (days 15-45) (0 or 1)
   * 9. Anxiety level (0-10)
   * 10. Mood stability (0-10)
   */
  extractFeatures(current, previous, currentDate, userData) {
    // Basic benefit metrics
    const energy = current.energy || 5;
    const focus = current.focus || 5;
    const confidence = current.confidence || 5;
    
    // Calculate energy drop
    const previousEnergy = previous?.energy || 5;
    const energyDrop = previousEnergy - energy;
    
    // Time features
    const hour = currentDate.getHours();
    const isWeekend = (currentDate.getDay() === 0 || currentDate.getDay() === 6) ? 1 : 0;
    
    // Streak features
    const currentStreak = userData.currentStreak || 0;
    const inPurgePhase = (currentStreak >= 15 && currentStreak <= 45) ? 1 : 0;
    
    // Emotional features (if available)
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

  /**
   * Calculate min/max for each feature (for normalization)
   */
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

  /**
   * Normalize features to 0-1 range
   * This helps the neural network learn better
   */
  normalizeFeatures(features, stats) {
    return features.map((value, i) => {
      const { min, max } = stats[i];
      if (max === min) return 0.5; // If all values are same, use middle
      return (value - min) / (max - min);
    });
  }

  /**
   * Make a prediction for current state
   * THIS IS THE MAIN FUNCTION YOU'LL CALL TO GET PREDICTIONS
   * 
   * @param {Object} userData - Current user data
   * @returns {Object} Prediction result with riskScore, confidence, etc.
   */
  async predict(userData) {
    try {
      // Check if model is ready
      if (!this.isModelReady || !this.model) {
        console.log('⚠️  Model not ready, using fallback prediction');
        return this.fallbackPrediction(userData);
      }
      
      // Check if we have enough data
      if (!userData.benefitTracking || userData.benefitTracking.length < 2) {
        return {
          riskScore: 30,
          confidence: 20,
          reason: 'Insufficient data for ML prediction',
          usedML: false,
          factors: {}
        };
      }
      
      // Get current and previous day data
      const current = userData.benefitTracking[userData.benefitTracking.length - 1];
      const previous = userData.benefitTracking[userData.benefitTracking.length - 2];
      const currentDate = new Date();
      
      // Extract and normalize features
      const rawFeatures = this.extractFeatures(current, previous, currentDate, userData);
      
      // Load normalization stats
      if (!this.normalizationStats) {
        this.loadNormalizationStats();
      }
      
      const normalizedFeatures = this.normalizationStats
        ? this.normalizeFeatures(rawFeatures, this.normalizationStats)
        : rawFeatures.map(f => f / 10); // Fallback normalization
      
      // Convert to tensor and make prediction
      const inputTensor = tf.tensor2d([normalizedFeatures]);
      const prediction = this.model.predict(inputTensor);
      const predictionArray = await prediction.data();
      
      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();
      
      // Convert prediction (0-1) to risk score (0-100)
      const riskScore = Math.round(predictionArray[0] * 100);
      
      // Calculate confidence based on training history
      const confidence = this.calculateConfidence();
      
      // Generate explanation
      const reason = this.generateReason(rawFeatures, riskScore);
      
      console.log(`🤖 ML Prediction: ${riskScore}% risk (${confidence}% confidence)`);
      
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
          totalEpochs: this.trainingHistory.totalEpochs
        }
      };
      
    } catch (error) {
      console.error('❌ Prediction error:', error);
      return this.fallbackPrediction(userData);
    }
  }

  /**
   * Calculate confidence in prediction based on training history
   */
  calculateConfidence() {
    if (this.trainingHistory.accuracy.length === 0) {
      return 60; // Default confidence for untrained model
    }
    
    // Use latest accuracy as confidence
    const latestAccuracy = this.trainingHistory.accuracy[this.trainingHistory.accuracy.length - 1];
    return Math.round(latestAccuracy * 100);
  }

  /**
   * Generate human-readable explanation for the prediction
   */
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
        return 'Neural network detected elevated risk pattern';
      } else {
        return 'Overall conditions favorable';
      }
    }
    
    return reasons.slice(0, 2).join(' + ');
  }

  /**
   * Fallback prediction when ML isn't available
   * Uses simple rules as backup
   */
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

  /**
   * Save the trained model to browser storage
   */
  async saveModel() {
    try {
      if (!this.model) {
        console.log('⚠️  No model to save');
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

  /**
   * Load a previously trained model from browser storage
   */
  async loadModel() {
    try {
      this.model = await tf.loadLayersModel(this.MODEL_SAVE_PATH);
      console.log('✅ Model loaded from IndexedDB');
      return true;
    } catch (error) {
      // Model doesn't exist yet - this is normal for first run
      console.log('ℹ️  No saved model found (this is normal for first-time use)');
      return false;
    }
  }

  /**
   * Save normalization stats to localStorage
   */
  saveNormalizationStats() {
    try {
      localStorage.setItem('ml_normalization_stats', JSON.stringify(this.normalizationStats));
    } catch (error) {
      console.error('Error saving normalization stats:', error);
    }
  }

  /**
   * Load normalization stats from localStorage
   */
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

  /**
   * Save training history to localStorage
   */
  saveTrainingHistory() {
    try {
      localStorage.setItem('ml_training_history', JSON.stringify(this.trainingHistory));
    } catch (error) {
      console.error('Error saving training history:', error);
    }
  }

  /**
   * Load training history from localStorage
   */
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

  /**
   * Check if model needs retraining
   * Returns true if it's been more than 7 days since last training
   */
  needsRetraining() {
    if (!this.trainingHistory.lastTrained) {
      return true;
    }
    
    const lastTrained = new Date(this.trainingHistory.lastTrained);
    const daysSinceTraining = (Date.now() - lastTrained.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceTraining >= 7;
  }

  /**
   * Get model info for display to user
   */
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
}

// Create singleton instance
const mlPredictionService = new MLPredictionService();

export default mlPredictionService;