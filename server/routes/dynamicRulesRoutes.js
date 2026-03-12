// server/routes/dynamicRulesRoutes.js
// API endpoints for Oracle dynamic rules management
// Active rules auto-load into Oracle's prompt — no redeployment needed

const express = require('express');
const router = express.Router();
const DynamicRule = require('../models/DynamicRule');
const { manualApproveRule, deactivateRule, invalidateCache } = require('../services/dynamicRules');

// Admin check
function isAdmin(req) {
  const username = req.user?.username?.toLowerCase();
  return username === 'rossbased' || username === 'ross';
}

// GET /api/admin/oracle/rules
// List all rules (active first, then inactive)
router.get('/', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const active = await DynamicRule.find({ active: true })
      .sort({ activatedAt: -1 })
      .lean();
    const inactive = await DynamicRule.find({ active: false })
      .sort({ deactivatedAt: -1 })
      .limit(20)
      .lean();

    res.json({ active, inactive, activeCount: active.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/oracle/rules
// Manually add a rule (Ross types it directly)
router.post('/', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  const { rule, category } = req.body;
  if (!rule || rule.length < 5) return res.status(400).json({ error: 'Rule text required (5+ chars)' });

  try {
    const created = await manualApproveRule(rule, category || 'voice');
    res.json({ success: true, rule: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/oracle/rules/:id
// Deactivate a rule
router.delete('/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const reason = req.body?.reason || 'Removed by admin';
    const rule = await deactivateRule(req.params.id, reason);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json({ success: true, rule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/oracle/rules/:id/reactivate
// Reactivate a previously deactivated rule
router.post('/:id/reactivate', async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin only' });
  try {
    const rule = await DynamicRule.findByIdAndUpdate(req.params.id, {
      $set: { active: true, activatedAt: new Date(), deactivatedAt: null, deactivatedReason: null }
    }, { new: true });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    invalidateCache();
    res.json({ success: true, rule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
