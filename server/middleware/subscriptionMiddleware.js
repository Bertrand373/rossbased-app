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
  
  const result = await User.updateMany(
    {
      'subscription.status': 'trial',
      'subscription.trialEndDate': { $lt: now }
    },
    {
      $set: {
        'subscription.status': 'expired',
        'isPremium': false
      }
    }
  );
  
  if (result.modifiedCount > 0) {
    console.log(`⏰ Expired ${result.modifiedCount} stale trials`);
  }
  
  return result.modifiedCount;
};

// ============================================
// EXPIRE STALE CANCELED SUBSCRIPTIONS
// ============================================
const expireStaleCanceled = async () => {
  const now = new Date();
  
  const result = await User.updateMany(
    {
      'subscription.status': 'canceled',
      'subscription.currentPeriodEnd': { $lt: now }
    },
    {
      $set: {
        'subscription.status': 'expired',
        'isPremium': false
      }
    }
  );
  
  if (result.modifiedCount > 0) {
    console.log(`⏰ Expired ${result.modifiedCount} canceled subscriptions`);
  }
  
  return result.modifiedCount;
};

module.exports = {
  isPaywallEnabled,
  getTestUsers,
  checkPremiumAccess,
  startFreeTrial,
  grantGrandfatherAccess,
  checkAndApplyGrandfather,
  expireStaleTrials,
  expireStaleCanceled
};
