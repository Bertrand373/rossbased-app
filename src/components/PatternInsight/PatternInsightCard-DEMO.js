// src/components/PatternInsight/PatternInsightCard.js
// Headless AI pattern detector — no visible UI
// Runs ML prediction on mount, calls onAlert() when risk is elevated
// Sheet rendering handled by Tracker (bottom sheet)
//
// ⚠️  TEMP DEMO MODE ACTIVE — remove force-trigger block before production commit

import { useEffect, useRef } from 'react';
import mlPredictionService from '../../services/MLPredictionService';
import interventionService from '../../services/InterventionService';

const ALERT_THRESHOLD = 60; // Only force-open sheet for meaningful risk

const PatternInsightCard = ({ userData, onAlert }) => {
  const hasAlerted = useRef(false);

  useEffect(() => {
    checkForInsight();
  }, [userData]);

  const checkForInsight = async () => {
    // Only fire once per mount
    if (hasAlerted.current) return;

    // Don't alert if already dismissed this session
    if (sessionStorage.getItem('pattern_insight_dismissed')) {
      sessionStorage.removeItem('pattern_alert_active');
      return;
    }

    // ============================================================
    // ⚠️  TEMP: Force alert for demo recording — REMOVE BEFORE PRODUCTION COMMIT
    // ============================================================
    const username = userData?.username?.toLowerCase();
    if (username === 'aicard' || username === 'aitest4' || username === 'aitest3') {
      hasAlerted.current = true;
      sessionStorage.setItem('pattern_alert_active', 'true');
      // Small delay so the tracker fully renders first, then sheet slides up
      setTimeout(() => {
        if (onAlert) {
          onAlert({
            prediction: {
              riskScore: 68,
              patterns: {
                time: { isHighRiskTime: true, eveningPercentage: 73 },
                benefits: {
                  hasSignificantDrop: true,
                  daysCovered: 3,
                  drops: [{ metric: 'Energy', from: 8, to: 4 }]
                },
                streak: {
                  isHighRiskDay: true,
                  currentDay: 28,
                  relapsesInRange: 2,
                  totalRelapses: 5,
                  rangeDays: [25, 31]
                }
              },
              factors: { inPurgePhase: true },
              dataContext: { trackingDays: 34, relapseCount: 5 }
            },
            interventionId: 'demo'
          });
        }
      }, 800);
      return;
    }
    // ============================================================
    // END TEMP DEMO BLOCK
    // ============================================================

    // Need benefit data to analyze
    if (!userData?.benefitTracking?.length) return;

    try {
      await mlPredictionService.initialize();

      // Only run if model is trained or has seeded data
      const modelInfo = mlPredictionService.getModelInfo();
      const trainingHistory = localStorage.getItem('ml_training_history');
      const hasSeededData = trainingHistory && JSON.parse(trainingHistory).lastTrained;
      if (!modelInfo?.isReady && !hasSeededData) return;

      const prediction = await mlPredictionService.predict(userData);

      // Cache prediction for other components
      try {
        localStorage.setItem('titantrack_ml_prediction', JSON.stringify({
          riskScore: prediction.riskScore / 100,
          riskLevel: prediction.riskScore >= 70 ? 'high' : prediction.riskScore >= 50 ? 'elevated' : prediction.riskScore >= 30 ? 'moderate' : 'low',
          topFactors: Object.keys(prediction.factors || {}).slice(0, 5),
          timestamp: Date.now()
        }));
      } catch (e) { /* silent */ }

      // Below threshold — no alert
      if (prediction.riskScore < ALERT_THRESHOLD) {
        sessionStorage.removeItem('pattern_alert_active');
        return;
      }

      // Create intervention for ML feedback loop
      const interventionId = interventionService.createIntervention(prediction);

      sessionStorage.setItem('pattern_alert_active', 'true');
      hasAlerted.current = true;

      // Notify Tracker to open the pattern alert sheet
      if (onAlert) {
        onAlert({ prediction, interventionId });
      }
    } catch (error) {
      console.error('Pattern insight check error:', error);
      sessionStorage.removeItem('pattern_alert_active');
    }
  };

  // Headless — renders nothing
  return null;
};

export default PatternInsightCard;
