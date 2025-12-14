// src/utils/MLEvaluationMetrics.js
// Evaluation metrics for ML model performance tracking
// Calculates precision, recall, F1, confusion matrix after training

/**
 * MLEvaluationMetrics - Calculate proper ML evaluation metrics
 * 
 * SIMPLE EXPLANATION:
 * After training, we need to know HOW the model is performing:
 * - Precision: When it predicts "high risk", how often is it right?
 * - Recall: Of all actual relapses, how many did the model catch?
 * - F1 Score: Balance between precision and recall
 * - Confusion Matrix: Detailed breakdown of TP, FP, TN, FN
 */
class MLEvaluationMetrics {
  
  /**
   * Calculate all metrics from predictions and actual labels
   * 
   * @param {Array} predictions - Model predictions (0-1 probabilities)
   * @param {Array} actuals - Actual labels (0 or 1)
   * @param {number} threshold - Classification threshold (default 0.5)
   * @returns {Object} All evaluation metrics
   */
  static calculate(predictions, actuals, threshold = 0.5) {
    if (!predictions || !actuals || predictions.length !== actuals.length) {
      console.warn('MLEvaluationMetrics: Invalid input');
      return null;
    }

    // Convert predictions to binary using threshold
    const binaryPredictions = predictions.map(p => p >= threshold ? 1 : 0);
    
    // Calculate confusion matrix values
    let TP = 0; // True Positives: predicted high risk, was relapse
    let FP = 0; // False Positives: predicted high risk, no relapse
    let TN = 0; // True Negatives: predicted low risk, no relapse
    let FN = 0; // False Negatives: predicted low risk, was relapse

    for (let i = 0; i < actuals.length; i++) {
      const predicted = binaryPredictions[i];
      const actual = actuals[i];

      if (predicted === 1 && actual === 1) TP++;
      else if (predicted === 1 && actual === 0) FP++;
      else if (predicted === 0 && actual === 0) TN++;
      else if (predicted === 0 && actual === 1) FN++;
    }

    // Calculate metrics
    const precision = TP + FP > 0 ? TP / (TP + FP) : 0;
    const recall = TP + FN > 0 ? TP / (TP + FN) : 0;
    const f1Score = precision + recall > 0 
      ? 2 * (precision * recall) / (precision + recall) 
      : 0;
    const accuracy = (TP + TN) / (TP + TN + FP + FN);

    return {
      // Core metrics
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      f1Score: Math.round(f1Score * 1000) / 1000,
      accuracy: Math.round(accuracy * 1000) / 1000,
      
      // Confusion matrix
      confusionMatrix: { TP, FP, TN, FN },
      
      // Totals
      totalSamples: actuals.length,
      totalPositives: TP + FN,  // Actual relapses
      totalNegatives: TN + FP,  // Actual non-relapses
      
      // Threshold used
      threshold
    };
  }

  /**
   * Calculate class weights for imbalanced dataset
   * Returns weights that make rare class (relapses) more important
   * 
   * @param {Array} labels - Array of 0s and 1s
   * @returns {Object} { classWeight0, classWeight1 }
   */
  static calculateClassWeights(labels) {
    const total = labels.length;
    const positives = labels.filter(l => l === 1 || l[0] === 1).length;
    const negatives = total - positives;

    if (positives === 0 || negatives === 0) {
      return { classWeight0: 1, classWeight1: 1 };
    }

    // Balanced weighting: inverse of frequency
    // This makes rare events (relapses) count more during training
    const weight0 = total / (2 * negatives);
    const weight1 = total / (2 * positives);

    // Cap weights to prevent extreme values
    const maxWeight = 10;
    
    return {
      classWeight0: Math.min(weight0, maxWeight),
      classWeight1: Math.min(weight1, maxWeight)
    };
  }

  /**
   * Generate sample weights array for training
   * TensorFlow.js fit() accepts sampleWeight parameter
   * 
   * @param {Array} labels - Training labels
   * @param {Object} classWeights - From calculateClassWeights()
   * @returns {Array} Sample weights matching labels length
   */
  static generateSampleWeights(labels, classWeights) {
    return labels.map(label => {
      const l = Array.isArray(label) ? label[0] : label;
      return l === 1 ? classWeights.classWeight1 : classWeights.classWeight0;
    });
  }

  /**
   * Apply intervention feedback weighting
   * Increases weight for samples that were false positives/negatives
   * 
   * @param {Array} sampleWeights - Existing sample weights
   * @param {Array} feedbackData - Intervention outcomes data
   * @param {Array} trainingDates - Dates corresponding to training samples
   * @returns {Array} Updated sample weights
   */
  static applyFeedbackWeights(sampleWeights, feedbackData, trainingDates) {
    if (!feedbackData || feedbackData.length === 0) {
      return sampleWeights;
    }

    const weights = [...sampleWeights];
    const feedbackMultiplier = 1.5; // 50% boost for feedback-informed samples

    feedbackData.forEach(feedback => {
      // Find matching training sample by date proximity
      const feedbackTime = new Date(feedback.createdAt).getTime();
      
      trainingDates.forEach((date, idx) => {
        const sampleTime = new Date(date).getTime();
        const hoursDiff = Math.abs(feedbackTime - sampleTime) / (1000 * 60 * 60);
        
        // Match samples within 24 hours of feedback
        if (hoursDiff <= 24) {
          // False positive: model said high risk, but user was fine
          // False negative: model said low risk, but relapse happened
          if (feedback.wasFalsePositive || feedback.wasFalseNegative) {
            weights[idx] *= feedbackMultiplier;
          }
        }
      });
    });

    return weights;
  }

  /**
   * Format metrics for display/logging
   * 
   * @param {Object} metrics - Output from calculate()
   * @returns {string} Formatted string
   */
  static format(metrics) {
    if (!metrics) return 'No metrics available';
    
    return [
      `Precision: ${(metrics.precision * 100).toFixed(1)}%`,
      `Recall: ${(metrics.recall * 100).toFixed(1)}%`,
      `F1 Score: ${(metrics.f1Score * 100).toFixed(1)}%`,
      `Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`,
      `Confusion Matrix: TP=${metrics.confusionMatrix.TP}, FP=${metrics.confusionMatrix.FP}, TN=${metrics.confusionMatrix.TN}, FN=${metrics.confusionMatrix.FN}`
    ].join('\n');
  }
}

export default MLEvaluationMetrics;
