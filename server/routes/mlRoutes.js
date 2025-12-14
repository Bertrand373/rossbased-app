// server/routes/mlRoutes.js
// Routes for ML-related endpoints
// Handles anonymous aggregate pattern submission

const express = require('express');
const router = express.Router();
const AggregatePattern = require('../models/AggregatePattern');

/**
 * POST /api/ml/aggregate-patterns
 * 
 * Accepts anonymized pattern data from users who have opted in.
 * NO authentication required - data is completely anonymous.
 * NO user IDs, emails, dates, or identifying info accepted.
 */
router.post('/aggregate-patterns', async (req, res) => {
  try {
    const {
      streakDaysAtRelapse,
      avgBenefitsBeforeRelapse,
      riskFactorCorrelations,
      totalRelapses,
      totalDaysTracked,
      modelMetrics
    } = req.body;

    // Validate required fields exist
    if (!totalRelapses || !totalDaysTracked) {
      return res.status(400).json({ 
        error: 'Missing required aggregate data' 
      });
    }

    // Validate no identifying data was sent
    const forbiddenFields = ['userId', 'email', 'username', 'discordUsername', 'dates', 'journalContent'];
    for (const field of forbiddenFields) {
      if (req.body[field]) {
        console.warn(`⚠️ Rejected submission with forbidden field: ${field}`);
        return res.status(400).json({ 
          error: 'Submission contains identifying data - rejected for privacy' 
        });
      }
    }

    // Sanitize and validate numeric arrays
    const sanitizedStreakDays = Array.isArray(streakDaysAtRelapse) 
      ? streakDaysAtRelapse.filter(n => typeof n === 'number' && n >= 0 && n < 1000)
      : [];

    // Sanitize benefit averages (0-10 scale)
    const sanitizedBenefits = {};
    if (avgBenefitsBeforeRelapse && typeof avgBenefitsBeforeRelapse === 'object') {
      ['energy', 'focus', 'confidence', 'aura', 'sleep', 'workout'].forEach(key => {
        const val = avgBenefitsBeforeRelapse[key];
        if (typeof val === 'number' && val >= 0 && val <= 10) {
          sanitizedBenefits[key] = Math.round(val * 100) / 100; // Round to 2 decimals
        }
      });
    }

    // Sanitize correlations (0-1 scale)
    const sanitizedCorrelations = {};
    if (riskFactorCorrelations && typeof riskFactorCorrelations === 'object') {
      ['evening', 'weekend', 'lowEnergy', 'lowFocus', 'emotionalLoad'].forEach(key => {
        const val = riskFactorCorrelations[key];
        if (typeof val === 'number' && val >= 0 && val <= 1) {
          sanitizedCorrelations[key] = Math.round(val * 1000) / 1000; // Round to 3 decimals
        }
      });
    }

    // Sanitize model metrics
    const sanitizedMetrics = {};
    if (modelMetrics && typeof modelMetrics === 'object') {
      ['precision', 'recall', 'f1Score', 'accuracy'].forEach(key => {
        const val = modelMetrics[key];
        if (typeof val === 'number' && val >= 0 && val <= 1) {
          sanitizedMetrics[key] = Math.round(val * 1000) / 1000;
        }
      });
    }

    // Create the aggregate pattern document
    const pattern = new AggregatePattern({
      streakDaysAtRelapse: sanitizedStreakDays,
      avgBenefitsBeforeRelapse: sanitizedBenefits,
      riskFactorCorrelations: sanitizedCorrelations,
      totalRelapses: Math.min(totalRelapses, 9999),
      totalDaysTracked: Math.min(totalDaysTracked, 99999),
      modelMetrics: sanitizedMetrics,
      schemaVersion: 1
    });

    await pattern.save();

    console.log(`✅ Aggregate pattern saved (${totalRelapses} relapses, ${totalDaysTracked} days)`);

    res.status(201).json({ 
      success: true, 
      message: 'Pattern data received - thank you for helping improve TitanTrack!' 
    });

  } catch (error) {
    console.error('Error saving aggregate pattern:', error);
    res.status(500).json({ error: 'Failed to save pattern data' });
  }
});

/**
 * GET /api/ml/aggregate-stats
 * 
 * Returns aggregate statistics from all submitted patterns.
 * Used for displaying community insights (future feature).
 */
router.get('/aggregate-stats', async (req, res) => {
  try {
    const stats = await AggregatePattern.aggregate([
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          avgRelapses: { $avg: '$totalRelapses' },
          avgDaysTracked: { $avg: '$totalDaysTracked' },
          avgPrecision: { $avg: '$modelMetrics.precision' },
          avgRecall: { $avg: '$modelMetrics.recall' },
          avgF1: { $avg: '$modelMetrics.f1Score' }
        }
      }
    ]);

    const result = stats[0] || {
      totalSubmissions: 0,
      avgRelapses: 0,
      avgDaysTracked: 0,
      avgPrecision: 0,
      avgRecall: 0,
      avgF1: 0
    };

    res.json({
      submissions: result.totalSubmissions,
      averages: {
        relapses: Math.round(result.avgRelapses * 10) / 10,
        daysTracked: Math.round(result.avgDaysTracked),
        modelPrecision: Math.round(result.avgPrecision * 100),
        modelRecall: Math.round(result.avgRecall * 100),
        modelF1: Math.round(result.avgF1 * 100)
      }
    });

  } catch (error) {
    console.error('Error fetching aggregate stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
