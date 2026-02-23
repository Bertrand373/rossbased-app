// server/routes/adminRevenue.js
// Admin Revenue Dashboard — Stripe data for AdminCockpit
// Uses same admin check pattern as analyticsRoutes.js

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Admin check — same pattern as analyticsRoutes.js
const adminCheck = (req, res, next) => {
  const username = req.user?.username || '';
  const lower = username.toLowerCase();
  const envAdmins = process.env.ADMIN_USERNAMES;
  if (envAdmins) {
    const allowed = envAdmins.split(',').map(u => u.trim().toLowerCase());
    if (allowed.includes(lower)) return next();
  }
  if (lower.startsWith('ross')) return next();
  return res.status(403).json({ error: 'Admin access required' });
};

// ============================================================
// GET /api/admin/revenue
// Returns Stripe balance, MRR, subscribers, recent transactions
// ============================================================
router.get('/revenue', adminCheck, async (req, res) => {
  try {
    // 1. Stripe Balance
    const balance = await stripe.balance.retrieve();
    const available = balance.available.reduce((sum, b) => sum + b.amount, 0);
    const pending = balance.pending.reduce((sum, b) => sum + b.amount, 0);

    // 2. Active Subscriptions (for MRR calculation)
    const activeSubs = [];
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      const params = { status: 'active', limit: 100 };
      if (startingAfter) params.starting_after = startingAfter;
      
      const batch = await stripe.subscriptions.list(params);
      activeSubs.push(...batch.data);
      hasMore = batch.has_more;
      if (batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id;
      }
    }

    // Also get trialing subs
    const trialingSubs = await stripe.subscriptions.list({ status: 'trialing', limit: 100 });

    // Calculate MRR from active subs
    let mrr = 0;
    activeSubs.forEach(sub => {
      const item = sub.items.data[0];
      if (item?.price) {
        const amount = item.price.unit_amount || 0;
        const interval = item.price.recurring?.interval;
        if (interval === 'month') {
          mrr += amount;
        } else if (interval === 'year') {
          mrr += Math.round(amount / 12);
        }
      }
    });

    // 3. Recent Charges (last 20)
    const charges = await stripe.charges.list({ limit: 20 });
    const recentCharges = charges.data.map(c => ({
      id: c.id,
      amount: c.amount,
      currency: c.currency,
      status: c.status,
      description: c.description,
      customerEmail: c.billing_details?.email || null,
      created: new Date(c.created * 1000).toISOString(),
      paid: c.paid,
      refunded: c.refunded,
    }));

    // 4. Failed Payments (last 10)
    const failedCharges = await stripe.charges.list({ limit: 10 });
    const failed = failedCharges.data
      .filter(c => c.status === 'failed')
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        amount: c.amount,
        customerEmail: c.billing_details?.email || null,
        failureMessage: c.failure_message,
        created: new Date(c.created * 1000).toISOString(),
      }));

    // 5. Canceled in last 30 days
    const canceledRecent = await stripe.subscriptions.list({ 
      status: 'canceled', 
      limit: 100,
      created: { gte: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60 }
    });

    res.json({
      balance: {
        available: available,
        pending: pending,
        currency: balance.available[0]?.currency || 'usd',
      },
      mrr: mrr,
      subscribers: {
        active: activeSubs.length,
        trialing: trialingSubs.data.length,
        canceledLast30d: canceledRecent.data.length,
      },
      recentCharges,
      failedPayments: failed,
      fetchedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('Revenue endpoint error:', err.message);
    
    if (err.type === 'StripeAuthenticationError') {
      return res.status(500).json({ error: 'Stripe API key not configured' });
    }
    
    res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

module.exports = router;
