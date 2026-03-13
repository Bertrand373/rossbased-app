// server/middleware/subscriptionMiddleware.js
// Paywall enforcement and subscription helper functions

const User = require('../models/User');
const GrandfatheredMember = require('../models/GrandfatheredMember');

// ============================================
// ENVIRONMENT FLAGS
// ============================================

// Master paywall switch - when false, everyone gets premium (pre-launch)
// Set PAYWALL_ENABLED=true in Render env vars on launch day
const isPaywallEnabled = () => {
  return process.env.PAYWALL_ENABLED === 'true';
};

// Usernames that ALWAYS see the paywall (even when PAYWALL_ENABLED=false)
// For testing the payment flow before launch
// Set PAYWALL_TEST_USERS=ross,rossbased in Render env vars
const getTestUsers = () => {
  const testUsers = process.env.PAYWALL_TEST_USERS || '';
  return testUsers.split(',').map(u => u.trim().toLowerCase()).filter(Boolean);
};

// ============================================
// CHECK IF USER HAS PREMIUM ACCESS
// ============================================
// Returns { hasPremium, reason, subscription }
const checkPremiumAccess = (user) => {
  const sub = user.subscription || {};
  const now = new Date();
  
  // Check if paywall applies to this user
  const testUsers = getTestUsers();
  const isTestUser = testUsers.includes(user.username?.toLowerCase());
  const paywallActive = isPaywallEnabled() || isTestUser;
  
  // If paywall is OFF and user is NOT a test user, everyone gets premium
  if (!paywallActive) {
    return { 
      hasPremium: true, 
      reason: 'paywall_disabled',
      subscription: sub
    };
  }
  
  // Paywall is active - check actual subscription status
  switch (sub.status) {
    case 'grandfathered':
      return { hasPremium: true, reason: 'grandfathered', subscription: sub };
      
    case 'active':
      return { hasPremium: true, reason: 'active_subscription', subscription: sub };
      
    case 'trial': {
      // Legacy: no new trials are created (free tier replaced trials)
      // Honor any still-active trials, expired ones become free tier
      const trialValid = sub.trialEndDate && now < new Date(sub.trialEndDate);
      if (trialValid) {
        const daysLeft = Math.ceil((new Date(sub.trialEndDate) - now) / (1000 * 60 * 60 * 24));
        return { hasPremium: true, reason: 'trial_active', daysLeft, subscription: sub };
      }
      // Trial expired → free tier (no premium)
      return { hasPremium: false, reason: 'no_subscription', subscription: sub };
    }
    
    case 'canceled': {
      // Still has access until period end
      const periodValid = sub.currentPeriodEnd && now < new Date(sub.currentPeriodEnd);
      if (periodValid) {
        const daysLeft = Math.ceil((new Date(sub.currentPeriodEnd) - now) / (1000 * 60 * 60 * 24));
        return { hasPremium: true, reason: 'canceled_but_active', daysLeft, subscription: sub };
      }
      return { hasPremium: false, reason: 'subscription_ended', subscription: sub };
    }
    
    case 'expired':
      return { hasPremium: false, reason: 'expired', subscription: sub };
      
    case 'none':
    default:
      return { hasPremium: false, reason: 'no_subscription', subscription: sub };
  }
};

// ============================================
// START FREE TRIAL (DEPRECATED)
// ============================================
// No longer used — free tier replaced trials.
// Kept to avoid breaking any remaining callers.
const startFreeTrial = async (user) => {
  console.warn(`⚠️ startFreeTrial called for ${user.username} — trials are deprecated. User remains on free tier.`);
  return user;
};

// ============================================
// GRANT GRANDFATHER STATUS
// ============================================
const grantGrandfatherAccess = async (user, reason = 'discord_og') => {
  user.subscription = {
    ...user.subscription,
    status: 'grandfathered',
    plan: 'lifetime',
    grandfatheredAt: new Date(),
    grandfatheredReason: reason
  };
  user.isPremium = true;
  
  await user.save({ validateModifiedOnly: true });
  console.log(`✅ Grandfather access granted to ${user.username} (${reason})`);
  
  return user;
};

// ============================================
// CHECK AND APPLY GRANDFATHER STATUS
// ============================================
// Call this when a user signs up via Discord or links their Discord
const checkAndApplyGrandfather = async (user, discordId) => {
  try {
    // Look up this Discord ID in the grandfather list
    const gfMember = await GrandfatheredMember.findOne({ discordId });
    
    if (!gfMember) {
      return false; // Not in grandfather list
    }
    
    // Check if already claimed by a DIFFERENT user
    if (gfMember.claimed && gfMember.claimedBy !== user.username) {
      console.log(`⚠️ Grandfather already claimed by ${gfMember.claimedBy}, rejecting ${user.username}`);
      return false;
    }
    
    // Grant lifetime access
    await grantGrandfatherAccess(user, 'discord_og');
    
    // Mark as claimed in the grandfather list
    gfMember.claimed = true;
    gfMember.claimedBy = user.username;
    gfMember.claimedAt = new Date();
    await gfMember.save();
    
    console.log(`✅ Discord OG ${discordId} claimed grandfather access as ${user.username}`);
    return true;
  } catch (error) {
    console.error('Error checking grandfather status:', error);
    return false;
  }
};

// ============================================
// EXPIRE STALE TRIALS
// ============================================
// Run periodically to clean up expired trials
const expireStaleTrials = async () => {
  const now = new Date();
  
  // Non-GF users: expire as normal
  const result = await User.updateMany(
    {
      'subscription.status': 'trial',
      'subscription.trialEndDate': { $lt: now },
      'subscription.grandfatheredAt': null
    },
    {
      $set: {
        'subscription.status': 'expired',
        'isPremium': false
      }
    }
  );
  
  // GF users with expired trials: fall back to grandfathered, not expired
  const gfResult = await User.updateMany(
    {
      'subscription.status': 'trial',
      'subscription.trialEndDate': { $lt: now },
      'subscription.grandfatheredAt': { $ne: null }
    },
    {
      $set: {
        'subscription.status': 'grandfathered',
        'subscription.plan': 'lifetime',
        'isPremium': true
      }
    }
  );
  
  const total = result.modifiedCount + gfResult.modifiedCount;
  if (result.modifiedCount > 0) {
    console.log(`⏰ Expired ${result.modifiedCount} stale trials`);
  }
  if (gfResult.modifiedCount > 0) {
    console.log(`⏰ Restored ${gfResult.modifiedCount} grandfathered users from stale trials`);
  }
  
  return total;
};

// ============================================
// EXPIRE STALE CANCELED SUBSCRIPTIONS
// ============================================
const expireStaleCanceled = async () => {
  const now = new Date();
  
  // Non-GF users: expire as normal
  const result = await User.updateMany(
    {
      'subscription.status': 'canceled',
      'subscription.currentPeriodEnd': { $lt: now },
      'subscription.grandfatheredAt': null
    },
    {
      $set: {
        'subscription.status': 'expired',
        'isPremium': false
      }
    }
  );
  
  // GF users with expired cancellations: fall back to grandfathered
  const gfResult = await User.updateMany(
    {
      'subscription.status': 'canceled',
      'subscription.currentPeriodEnd': { $lt: now },
      'subscription.grandfatheredAt': { $ne: null }
    },
    {
      $set: {
        'subscription.status': 'grandfathered',
        'subscription.plan': 'lifetime',
        'isPremium': true
      }
    }
  );
  
  const total = result.modifiedCount + gfResult.modifiedCount;
  if (result.modifiedCount > 0) {
    console.log(`⏰ Expired ${result.modifiedCount} canceled subscriptions`);
  }
  if (gfResult.modifiedCount > 0) {
    console.log(`⏰ Restored ${gfResult.modifiedCount} grandfathered users from canceled subscriptions`);
  }
  
  return total;
};

// ============================================
// STRIPE SYNC — DAILY SAFETY NET (BIDIRECTIONAL)
// ============================================
// Catches drift between Stripe and MongoDB in BOTH directions:
//   Direction 1: DB→Stripe — users MongoDB thinks are active, verify with Stripe
//   Direction 2: Stripe→DB — all active/trialing Stripe subs, ensure MongoDB knows
// If a webhook fails or gets lost, this corrects it within 24 hours.
const syncStripeSubscriptions = async () => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  if (!stripe) {
    console.log('⚠️ Stripe not configured, skipping sync');
    return { checked: 0, fixed: 0 };
  }

  try {
    let checked = 0;
    let fixed = 0;

    // ═══════════════════════════════════════════
    // DIRECTION 1: DB → Stripe
    // Users MongoDB thinks are 'active' — verify with Stripe
    // ═══════════════════════════════════════════
    const activeUsers = await User.find({
      'subscription.status': 'active',
      'subscription.stripeSubscriptionId': { $exists: true, $ne: null, $ne: '' }
    }).select('username subscription isPremium');

    for (const user of activeUsers) {
      checked++;
      try {
        const stripeSub = await stripe.subscriptions.retrieve(
          user.subscription.stripeSubscriptionId
        );

        if (['canceled', 'incomplete_expired', 'unpaid', 'past_due'].includes(stripeSub.status)) {
          const isGf = !!user.subscription?.grandfatheredAt;
          await User.updateOne(
            { _id: user._id },
            { $set: isGf 
              ? { 'subscription.status': 'grandfathered', 'subscription.plan': 'lifetime', 'isPremium': true }
              : { 'subscription.status': 'expired', 'isPremium': false }
            }
          );
          fixed++;
          console.log(`🔄 Stripe sync: ${user.username} → ${isGf ? 'grandfathered' : 'expired'} (Stripe: ${stripeSub.status})`);
        }
        else if (stripeSub.status === 'trialing') {
          const trialEnd = new Date(stripeSub.trial_end * 1000);
          if (trialEnd < new Date()) {
            const isGf = !!user.subscription?.grandfatheredAt;
            await User.updateOne(
              { _id: user._id },
              { $set: isGf
                ? { 'subscription.status': 'grandfathered', 'subscription.plan': 'lifetime', 'isPremium': true }
                : { 'subscription.status': 'expired', 'isPremium': false }
              }
            );
            fixed++;
            console.log(`🔄 Stripe sync: ${user.username} → ${isGf ? 'grandfathered' : 'expired'} (trial ended)`);
          } else {
            await User.updateOne(
              { _id: user._id },
              { $set: { 'subscription.status': 'trial' } }
            );
            fixed++;
            console.log(`🔄 Stripe sync: ${user.username} → trial (still trialing)`);
          }
        }
      } catch (err) {
        if (err.code === 'resource_missing') {
          const isGf = !!user.subscription?.grandfatheredAt;
          await User.updateOne(
            { _id: user._id },
            { $set: isGf
              ? { 'subscription.status': 'grandfathered', 'subscription.plan': 'lifetime', 'isPremium': true }
              : { 'subscription.status': 'expired', 'isPremium': false }
            }
          );
          fixed++;
          console.log(`🔄 Stripe sync: ${user.username} → ${isGf ? 'grandfathered' : 'expired'} (sub not found in Stripe)`);
        } else {
          console.error(`⚠️ Stripe sync error for ${user.username}:`, err.message);
        }
      }
    }

    // ═══════════════════════════════════════════
    // DIRECTION 2: Stripe → DB
    // All active/trialing Stripe subs — ensure MongoDB knows
    // Catches missed webhooks (checkout.session.completed, etc.)
    // ═══════════════════════════════════════════
    const stripeStatuses = ['active', 'trialing'];

    for (const status of stripeStatuses) {
      let hasMore = true;
      let startingAfter = null;

      while (hasMore) {
        const params = { status, limit: 100 };
        if (startingAfter) params.starting_after = startingAfter;
        const batch = await stripe.subscriptions.list(params);

        for (const sub of batch.data) {
          checked++;
          const username = sub.metadata?.titantrack_username;
          const customerId = sub.customer;

          // Find user by metadata username first, then by stripeCustomerId
          let user = null;
          if (username) {
            user = await User.findOne({ username });
          }
          if (!user) {
            user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
          }

          if (!user) {
            console.log(`⚠️ Stripe sync: orphan sub ${sub.id} (${status}) — no user found (metadata: ${username || 'none'}, customer: ${customerId})`);
            continue;
          }

          const dbStatus = user.subscription?.status;
          const dbSubId = user.subscription?.stripeSubscriptionId;
          const expectedDbStatus = status === 'trialing' ? 'trial' : 'active';

          // Skip if already correct
          if (dbStatus === expectedDbStatus && dbSubId === sub.id) continue;
          // Don't override grandfathered users
          if (dbStatus === 'grandfathered') continue;

          // DB is out of sync — fix it
          const updateFields = {
            'subscription.status': expectedDbStatus,
            'subscription.stripeSubscriptionId': sub.id,
            'subscription.stripeCustomerId': customerId,
            'subscription.currentPeriodStart': new Date(sub.current_period_start * 1000),
            'subscription.currentPeriodEnd': new Date(sub.current_period_end * 1000),
            'isPremium': true
          };

          if (status === 'trialing' && sub.trial_end) {
            updateFields['subscription.trialEndDate'] = new Date(sub.trial_end * 1000);
          }

          const priceInterval = sub.items?.data?.[0]?.price?.recurring?.interval;
          if (priceInterval) {
            updateFields['subscription.plan'] = priceInterval === 'year' ? 'yearly' : 'monthly';
          }

          await User.updateOne({ _id: user._id }, { $set: updateFields });
          fixed++;
          console.log(`🔄 Stripe sync: ${user.username} → ${expectedDbStatus} (was: ${dbStatus || 'none'}, sub: ${sub.id})`);
        }

        hasMore = batch.has_more;
        if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id;
      }
    }

    if (fixed > 0) {
      console.log(`🔄 Stripe sync complete: checked ${checked}, fixed ${fixed}`);
    } else if (checked > 0) {
      console.log(`✅ Stripe sync: all ${checked} subscriptions verified`);
    }

    return { checked, fixed };
  } catch (error) {
    console.error('❌ Stripe sync failed:', error.message);
    return { checked: 0, fixed: 0 };
  }
};

module.exports = {
  isPaywallEnabled,
  getTestUsers,
  checkPremiumAccess,
  startFreeTrial,
  grantGrandfatherAccess,
  checkAndApplyGrandfather,
  expireStaleTrials,
  expireStaleCanceled,
  syncStripeSubscriptions
};
