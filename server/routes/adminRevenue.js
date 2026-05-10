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

// ============================================================
// GET /api/admin/revenue/conversion-churn
// Trial -> paid conversion rate (last 30d) + at-risk paying users
// (active subscribers not seen in 7+ days — outreach list)
// ============================================================
router.get('/revenue/conversion-churn', adminCheck, async (req, res) => {
  try {
    const User = require('../models/User');
    const now = Date.now();
    const SILENT_THRESHOLD_DAYS = 7;
    const CONVERSION_WINDOW_DAYS = 30;
    const windowStart = new Date(now - CONVERSION_WINDOW_DAYS * 86400000);
    const silentCutoff = new Date(now - SILENT_THRESHOLD_DAYS * 86400000);

    // Exclude admin accounts from cohort math (consistent with analyticsRoutes)
    const baseFilter = { username: { $not: /^(ross|rossbased)$/i } };

    // ── TRIAL CONVERSION (last 30 days) ──
    // A trial counts in the cohort if its trialStartDate is within the window.
    // It "converted" if the user now has subscription.status of active, OR
    // canceled with currentPeriodEnd still in the future (paid through cycle).
    const cohort = await User.find(
      {
        ...baseFilter,
        'subscription.trialStartDate': { $gte: windowStart },
      },
      'username subscription.status subscription.trialStartDate subscription.trialEndDate subscription.currentPeriodEnd subscription.tier'
    ).lean();

    const stillTrialing = cohort.filter(u => {
      const s = u.subscription;
      return s.status === 'trial' && s.trialEndDate && new Date(s.trialEndDate) > new Date();
    }).length;

    const converted = cohort.filter(u => {
      const s = u.subscription;
      if (s.status === 'active') return true;
      if (s.status === 'canceled' && s.currentPeriodEnd && new Date(s.currentPeriodEnd) > new Date()) return true;
      return false;
    }).length;

    const trialsCompleted = cohort.length - stillTrialing;
    const conversionRate = trialsCompleted > 0
      ? Math.round((converted / trialsCompleted) * 100)
      : null; // null = no completed trials in window yet

    // ── SILENT PAYING USERS (active sub, not seen in 7+ days) ──
    // Only flag 'active' status — canceled users are already lost, trial
    // abandonment is pre-conversion and surfaces in conversion rate above.
    const silent = await User.find(
      {
        ...baseFilter,
        'subscription.status': 'active',
        $or: [
          { lastSeen: { $lt: silentCutoff } },
          { lastSeen: { $exists: false }, updatedAt: { $lt: silentCutoff } },
        ],
      },
      'username email lastSeen updatedAt subscription.tier subscription.currentPeriodEnd subscription.cancelAtPeriodEnd'
    ).lean();

    const silentPayers = silent
      .map(u => {
        const lastActive = u.lastSeen || u.updatedAt;
        const daysSilent = lastActive
          ? Math.floor((now - new Date(lastActive).getTime()) / 86400000)
          : null;
        const tier = u.subscription?.tier || 'practitioner';
        const monthlyValue = tier === 'ascended' ? 1700 : 800; // cents
        return {
          username: u.username,
          email: u.email || '',
          lastSeen: lastActive,
          daysSilent,
          tier,
          monthlyValue,
          periodEnd: u.subscription?.currentPeriodEnd || null,
          canceling: !!u.subscription?.cancelAtPeriodEnd,
        };
      })
      .sort((a, b) => (b.daysSilent || 0) - (a.daysSilent || 0));

    const mrrAtRisk = silentPayers.reduce((sum, u) => sum + (u.monthlyValue || 0), 0);

    res.json({
      conversion: {
        windowDays: CONVERSION_WINDOW_DAYS,
        trialsStarted: cohort.length,
        stillTrialing,
        trialsCompleted,
        converted,
        conversionRate, // null if no completed trials yet
      },
      churnWatch: {
        silentThresholdDays: SILENT_THRESHOLD_DAYS,
        silentCount: silentPayers.length,
        mrrAtRisk,
        users: silentPayers,
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Conversion-churn endpoint error:', err.message);
    res.status(500).json({ error: 'Failed to fetch conversion and churn data' });
  }
});

module.exports = router;
