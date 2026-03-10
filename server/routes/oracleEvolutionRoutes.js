// server/routes/oracleEvolutionRoutes.js
// Oracle Evolution — All 7 Layers: Admin endpoints + scheduled jobs
// Self-contained module — minimal wiring needed in app.js
//
// Layer 1: Response Scoring (which Oracle responses work best)
// Layer 2: Risk Profiles (longitudinal user models)
// Layer 3: Predictive Intervention (proactive push notifications)
// Layer 4: Self-Evolving Voice (Oracle reviews its own performance)
// Layer 5: Pattern Discovery (cross-dimensional correlation mining)
// Layer 6: Psychological Profiling (deep per-user understanding)
// Layer 7: Meta-Oracle (system prompt evolution proposals)

const express = require('express');
const router = express.Router();

// === SERVICE IMPORTS ===
const { classifyResponseStrategy, analyzeResponseEffectiveness } = require('../services/responseScoring');
const { buildRiskProfile, calculateRiskScore, dailyRiskScan, generateIntervention } = require('../services/riskEngine');
const { discoverPatterns } = require('../services/patternDiscovery');
const { voiceSelfAssessment, buildPsychProfile, generatePromptProposal, runEvolutionPipeline } = require('../services/oracleEvolution');

// === MODEL IMPORTS ===
const UserRiskProfile = require('../models/UserRiskProfile');
const OracleEvolution = require('../models/OracleEvolution');
const User = require('../models/User');

// === AUTH MIDDLEWARE (passed from app.js) ===
let authenticate;

function init(authMiddleware) {
  authenticate = authMiddleware;
}

// Admin check helper
function isAdmin(req) {
  const username = req.user?.username?.toLowerCase();
  return username === 'rossbased' || username === 'ross';
}

// ============================================================
// LAYER 1: Response Strategy Analysis
// ============================================================

// GET /api/admin/oracle/response-effectiveness
// View which Oracle response strategies produce the best outcomes
router.get('/response-effectiveness', authenticate, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const report = await analyzeResponseEffectiveness();
    if (!report) return res.json({ message: 'Insufficient scored outcomes (need 30+). Keep using Oracle.' });
    res.json(report);
  } catch (err) {
    console.error('Response effectiveness error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// LAYERS 2+3: Risk Profiles & Predictive Intervention
// ============================================================

// GET /api/admin/oracle/risk-scan
// Run daily risk scan across all active users
router.get('/risk-scan', authenticate, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const interventionQueue = await dailyRiskScan();
    res.json({ 
      usersScanned: 'complete',
      interventionsNeeded: interventionQueue.length,
      queue: interventionQueue
    });
  } catch (err) {
    console.error('Risk scan error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/oracle/risk-profile/:username
// View a specific user's risk profile
router.get('/risk-profile/:username', authenticate, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${req.params.username}$`, 'i') } 
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Build/refresh profile
    await buildRiskProfile(user._id);
    
    // Calculate current risk
    const risk = await calculateRiskScore(user._id);
    const profile = await UserRiskProfile.findOne({ userId: user._id }).lean();

    res.json({ risk, profile });
  } catch (err) {
    console.error('Risk profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/oracle/intervene/:username
// Generate and preview a predictive intervention message
router.post('/intervene/:username', authenticate, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${req.params.username}$`, 'i') } 
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const risk = await calculateRiskScore(user._id);
    const profile = await UserRiskProfile.findOne({ userId: user._id }).lean();
    const message = await generateIntervention(
      { ...risk, username: user.username },
      profile
    );

    res.json({ risk, message, note: 'Preview only — not sent to user yet' });
  } catch (err) {
    console.error('Intervention generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// LAYER 5: Pattern Discovery
// ============================================================

// GET /api/admin/oracle/discover-patterns
// Run cross-dimensional pattern discovery
router.get('/discover-patterns', authenticate, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const results = await discoverPatterns();
    if (!results) return res.json({ message: 'Insufficient data for pattern discovery (need 30+ measured outcomes)' });
    res.json(results);
  } catch (err) {
    console.error('Pattern discovery error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// LAYERS 4+6+7: Oracle Evolution Pipeline
// ============================================================

// POST /api/admin/oracle/evolve
// Run the full evolution pipeline (voice assessment + psych profiles)
router.post('/evolve', authenticate, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const results = await runEvolutionPipeline();
    res.json(results);
  } catch (err) {
    console.error('Evolution pipeline error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/oracle/prompt-proposal
// Generate a Meta-Oracle system prompt evolution proposal
router.post('/prompt-proposal', authenticate, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const proposal = await generatePromptProposal();
    if (!proposal) return res.json({ message: 'Not enough evolution data yet. Run /evolve first.' });
    res.json(proposal);
  } catch (err) {
    console.error('Prompt proposal error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/oracle/evolution-log
// View all evolution records (voice assessments, discoveries, proposals)
router.get('/evolution-log', authenticate, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const records = await OracleEvolution.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 20)
      .lean();

    const summary = {
      total: records.length,
      byType: {},
      pending: records.filter(r => r.status === 'pending').length
    };
    records.forEach(r => {
      summary.byType[r.type] = (summary.byType[r.type] || 0) + 1;
    });

    res.json({ summary, records });
  } catch (err) {
    console.error('Evolution log error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/oracle/evolution/:id
// Approve/reject an evolution proposal
router.patch('/evolution/:id', authenticate, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const { status, reviewNotes } = req.body;
    if (!['approved', 'rejected', 'partial'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved, rejected, or partial' });
    }

    const record = await OracleEvolution.findByIdAndUpdate(
      req.params.id,
      { status, reviewNotes, reviewedAt: new Date() },
      { new: true }
    );

    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  } catch (err) {
    console.error('Evolution review error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/oracle/psych-profile/:username
// View a user's psychological profile
router.get('/psych-profile/:username', authenticate, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${req.params.username}$`, 'i') } 
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Build/refresh psych profile
    const psych = await buildPsychProfile(user._id);
    if (!psych) return res.json({ message: 'Need 5+ Oracle notes for this user' });

    const profile = await UserRiskProfile.findOne({ userId: user._id })
      .select('psychProfile growthSignals behaviorProfile')
      .lean();

    res.json({ psych, profile });
  } catch (err) {
    console.error('Psych profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// COMPREHENSIVE DASHBOARD
// ============================================================

// GET /api/admin/oracle/intelligence
// Full intelligence dashboard — everything in one view
router.get('/intelligence', authenticate, async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const OracleOutcome = require('../models/OracleOutcome');
    const OracleInteraction = require('../models/OracleInteraction');

    const [
      totalOutcomes,
      measuredOutcomes,
      scoredOutcomes,
      totalInteractions,
      riskProfiles,
      evolutionRecords,
      pendingProposals,
      highRiskUsers
    ] = await Promise.all([
      OracleOutcome.countDocuments(),
      OracleOutcome.countDocuments({ 'outcome.measured': true }),
      OracleOutcome.countDocuments({ 'responseStrategy.strategies': { $exists: true, $ne: [] } }),
      OracleInteraction.countDocuments(),
      UserRiskProfile.countDocuments(),
      OracleEvolution.countDocuments(),
      OracleEvolution.countDocuments({ status: 'pending' }),
      UserRiskProfile.countDocuments({ 'currentRisk.score': { $gte: 50 } })
    ]);

    const maintainedOutcomes = await OracleOutcome.countDocuments({ 
      'outcome.measured': true, 'outcome.streakMaintained': true 
    });

    res.json({
      dataHealth: {
        totalOutcomes,
        measuredOutcomes,
        scoredOutcomes,
        totalInteractions,
        overallMaintenanceRate: measuredOutcomes > 0 
          ? `${Math.round((maintainedOutcomes / measuredOutcomes) * 100)}%` 
          : 'insufficient data'
      },
      layers: {
        'L1_ResponseScoring': scoredOutcomes >= 30 ? 'ACTIVE' : `COLLECTING (${scoredOutcomes}/30)`,
        'L2_RiskProfiles': `${riskProfiles} profiles built`,
        'L3_PredictiveIntervention': highRiskUsers > 0 ? `${highRiskUsers} users flagged` : 'No high-risk users',
        'L4_VoiceEvolution': evolutionRecords > 0 ? 'ACTIVE' : 'PENDING FIRST RUN',
        'L5_PatternDiscovery': measuredOutcomes >= 30 ? 'READY' : `COLLECTING (${measuredOutcomes}/30)`,
        'L6_PsychProfiles': `${riskProfiles} profiles with psych data`,
        'L7_MetaOracle': pendingProposals > 0 ? `${pendingProposals} proposals pending review` : 'No pending proposals'
      },
      actions: {
        runRiskScan: 'GET /api/admin/oracle/risk-scan',
        runEvolution: 'POST /api/admin/oracle/evolve',
        discoverPatterns: 'GET /api/admin/oracle/discover-patterns',
        generateProposal: 'POST /api/admin/oracle/prompt-proposal',
        viewEvolutionLog: 'GET /api/admin/oracle/evolution-log',
        viewResponseEffectiveness: 'GET /api/admin/oracle/response-effectiveness'
      }
    });
  } catch (err) {
    console.error('Intelligence dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// SCHEDULED JOBS (initialized when module loads)
// ============================================================

function startScheduledJobs() {
  // Daily risk scan — runs every 12 hours
  setInterval(async () => {
    try {
      console.log('[OracleEvolution] Running scheduled risk scan...');
      const queue = await dailyRiskScan();
      if (queue.length > 0) {
        console.log(`[OracleEvolution] ${queue.length} users flagged for intervention`);
        // TODO: Wire up Firebase push notifications here when ready
        // For now, log to console and DM Ross
        try {
          const discordBot = require('../discord-bot');
          if (discordBot.client && discordBot.client.isReady()) {
            const rossUser = await discordBot.client.users.fetch(process.env.ROSS_DISCORD_ID || '').catch(() => null);
            if (rossUser && queue.length > 0) {
              const topUsers = queue.slice(0, 5).map(u => 
                `• ${u.username} (Day ${u.currentDay}, Risk: ${u.riskScore}/100)`
              ).join('\n');
              await rossUser.send(`🔮 **Predictive Risk Alert**\n\n${queue.length} users flagged:\n${topUsers}\n\nView details: /api/admin/oracle/risk-scan`);
            }
          }
        } catch (dmErr) {
          console.error('[OracleEvolution] DM alert error:', dmErr.message);
        }
      }
    } catch (err) {
      console.error('[OracleEvolution] Scheduled risk scan error:', err.message);
    }
  }, 12 * 60 * 60 * 1000); // Every 12 hours

  // Weekly evolution pipeline — runs every 7 days
  setInterval(async () => {
    try {
      console.log('[OracleEvolution] Running scheduled evolution pipeline...');
      await runEvolutionPipeline();
      
      // Also run response effectiveness analysis
      await analyzeResponseEffectiveness();
      
      // Run pattern discovery if we have enough data
      await discoverPatterns();
      
      console.log('[OracleEvolution] Scheduled evolution complete');
    } catch (err) {
      console.error('[OracleEvolution] Scheduled evolution error:', err.message);
    }
  }, 7 * 24 * 60 * 60 * 1000); // Every 7 days

  // Run initial risk scan 5 minutes after boot (let everything else initialize first)
  setTimeout(async () => {
    try {
      const UserRiskProfile = require('../models/UserRiskProfile');
      const profileCount = await UserRiskProfile.countDocuments();
      if (profileCount === 0) {
        console.log('[OracleEvolution] No risk profiles exist — running initial build...');
        await dailyRiskScan();
      }
    } catch (err) {
      console.error('[OracleEvolution] Initial scan error:', err.message);
    }
  }, 5 * 60 * 1000);

  console.log('[OracleEvolution] Scheduled jobs initialized (risk scan: 12h, evolution: 7d)');
}

module.exports = router;
module.exports.init = init;
module.exports.startScheduledJobs = startScheduledJobs;
module.exports.classifyResponseStrategy = classifyResponseStrategy;
