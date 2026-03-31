// server/routes/adminRevenue.js
// Admin Revenue Dashboard — Stripe data for AdminCockpit
// Uses same admin check pattern as analyticsRoutes.js

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Admin check — FIXED: exact match only (was startsWith which is a security hole)
const adminCheck = (req, res, next) => {
  const username = req.user?.username || '';
  const lower = username.toLowerCase();
  const envAdmins = process.env.ADMIN_USERNAMES;
  if (envAdmins) {
    const allowed = envAdmins.split(',').map(u => u.trim().toLowerCase());
    if (allowed.includes(lower)) return next();
  }
  if (lower === 'rossbased' || lower === 'ross') return next();
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
    // FIXED: Filter by canceled_at timestamp, not created timestamp.
    // Stripe API doesn't support filtering by canceled_at directly,
    // so we fetch recent canceled subs and filter server-side.
    const thirtyDaysAgoTs = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const allCanceled = await stripe.subscriptions.list({ 
      status: 'canceled', 
      limit: 100
    });
    const canceledLast30d = allCanceled.data.filter(
      s => s.canceled_at && s.canceled_at >= thirtyDaysAgoTs
    );

    // 6. Duplicate subscription detection
    // Groups all active + trialing subs by Stripe customer ID.
    // If any customer has >1 subscription, flag it so admin can investigate.
    const allCurrentSubs = [...activeSubs, ...trialingSubs.data];
    const customerSubMap = {};
    allCurrentSubs.forEach(sub => {
      const custId = sub.customer;
      if (!customerSubMap[custId]) customerSubMap[custId] = [];
      customerSubMap[custId].push({
        subId: sub.id,
        status: sub.status,
        created: new Date(sub.created * 1000).toISOString(),
        amount: sub.items?.data?.[0]?.price?.unit_amount || 0,
        interval: sub.items?.data?.[0]?.price?.recurring?.interval || '—',
        username: sub.metadata?.titantrack_username || null,
        periodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null
      });
    });

    const duplicateAlerts = [];
    for (const [custId, subs] of Object.entries(customerSubMap)) {
      if (subs.length > 1) {
        let email = '?';
        try {
          const cust = await stripe.customers.retrieve(custId);
          email = cust.email || '?';
        } catch (e) { /* skip */ }
        duplicateAlerts.push({
          customerId: custId,
          email,
          username: subs[0].username || '—',
          count: subs.length,
          subscriptions: subs
        });
      }
    }

    // Count active subs that are set to cancel at period end
    const cancelingCount = activeSubs.filter(s => s.cancel_at_period_end).length;

    res.json({
      balance: {
        available: available,
        pending: pending,
        currency: balance.available[0]?.currency || 'usd',
      },
      mrr: mrr,
      subscribers: {
        active: activeSubs.length,
        canceling: cancelingCount,
        trialing: trialingSubs.data.length,
        canceledLast30d: canceledLast30d.length,
      },
      recentCharges,
      failedPayments: failed,
      duplicateAlerts,
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

// ============================================================
// GET /api/admin/revenue/subscribers/:status
// Drill-down: returns user details for active/trialing/canceled
// ============================================================
router.get('/revenue/subscribers/:status', adminCheck, async (req, res) => {
  try {
    const { status } = req.params;
    const User = require('../models/User');

    let stripeSubs = [];

    if (status === 'active') {
      let hasMore = true;
      let startingAfter = null;
      while (hasMore) {
        const params = { status: 'active', limit: 100 };
        if (startingAfter) params.starting_after = startingAfter;
        const batch = await stripe.subscriptions.list(params);
        stripeSubs.push(...batch.data);
        hasMore = batch.has_more;
        if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id;
      }
    } else if (status === 'trialing') {
      const batch = await stripe.subscriptions.list({ status: 'trialing', limit: 100 });
      stripeSubs = batch.data;
    } else if (status === 'canceled') {
      // FIXED: Filter by canceled_at, not created
      const batch = await stripe.subscriptions.list({
        status: 'canceled',
        limit: 100
      });
      const thirtyDaysAgoTs = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
      stripeSubs = batch.data.filter(s => s.canceled_at && s.canceled_at >= thirtyDaysAgoTs);
    } else {
      return res.status(400).json({ error: 'Invalid status. Use: active, trialing, canceled' });
    }

    const subscribers = [];

    for (const sub of stripeSubs) {
      const username = sub.metadata?.titantrack_username || null;
      const customerId = sub.customer;

      let email = '?';
      try {
        const customer = await stripe.customers.retrieve(customerId);
        email = customer.email || '?';
      } catch (e) { /* skip */ }

      let dbUser = null;
      if (username) {
        dbUser = await User.findOne({ username }).select('username email').lean();
      }
      if (!dbUser) {
        dbUser = await User.findOne({ 'subscription.stripeCustomerId': customerId }).select('username email').lean();
      }

      const priceItem = sub.items?.data?.[0]?.price;
      const priceInterval = priceItem?.recurring?.interval;
      const priceAmount = priceItem?.unit_amount || 0; // in cents

      subscribers.push({
        username: dbUser?.username || username || '—',
        email: dbUser?.email || email,
        plan: priceInterval === 'year' ? 'yearly' : priceInterval === 'month' ? 'monthly' : '—',
        amount: priceAmount, // NEW: price in cents ($800 = $8, $1700 = $17, etc.)
        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        periodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end || false,
        created: new Date(sub.created * 1000).toISOString(),
        subId: sub.id
      });
    }

    res.json({ status, count: subscribers.length, subscribers });

  } catch (err) {
    console.error('Subscriber detail error:', err.message);
    res.status(500).json({ error: 'Failed to fetch subscriber details' });
  }
});

module.exports = router;
