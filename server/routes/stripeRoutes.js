// server/routes/stripeRoutes.js
// Handles all Stripe payment operations
// Uses Stripe Checkout (hosted payment page) for security and simplicity

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { 
  checkPremiumAccess, 
  expireStaleTrials,
  expireStaleCanceled
} = require('../middleware/subscriptionMiddleware');

// Protocol ebook delivery (one-time purchase handler)
const { handleProtocolPurchase } = require('./protocolRoutes');

// ============================================
// STRIPE INITIALIZATION
// ============================================
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Stripe Price IDs - set these in Render env vars after creating products in Stripe Dashboard
// STRIPE_PRICE_MONTHLY = price_xxxxx ($8/month)
// STRIPE_PRICE_YEARLY = price_xxxxx ($64/year)
const MONTHLY_PRICE_ID = process.env.STRIPE_PRICE_MONTHLY;
const YEARLY_PRICE_ID = process.env.STRIPE_PRICE_YEARLY;

// Ascended tier prices ($17/month, $170/year)
const ASCENDED_MONTHLY_PRICE_ID = process.env.STRIPE_PRICE_ASCENDED_MONTHLY;
const ASCENDED_YEARLY_PRICE_ID = process.env.STRIPE_PRICE_ASCENDED_YEARLY;

// Frontend URL for redirects
const CLIENT_URL = process.env.CLIENT_URL || 'https://titantrack.app';

// ============================================
// AUTH MIDDLEWARE (inline - same as app.js)
// ============================================
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// ============================================
// GET SUBSCRIPTION STATUS
// ============================================
// Frontend calls this on every app load to determine what to show
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const accessInfo = checkPremiumAccess(user);
    
    res.json({
      ...accessInfo,
      subscription: {
        status: user.subscription?.status || 'none',
        plan: user.subscription?.plan || 'none',
        tier: user.subscription?.tier || 'practitioner',
        trialEndDate: user.subscription?.trialEndDate || null,
        currentPeriodEnd: user.subscription?.currentPeriodEnd || null,
        cancelAtPeriodEnd: user.subscription?.cancelAtPeriodEnd || false,
        grandfatheredAt: user.subscription?.grandfatheredAt || null
      }
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// ============================================
// CREATE CHECKOUT SESSION
// ============================================
// Redirects user to Stripe's hosted payment page
router.post('/create-checkout', authenticate, async (req, res) => {
  try {
    const { plan, tier } = req.body; // plan: 'monthly' or 'yearly', tier: 'practitioner' or 'ascended'
    const subTier = tier === 'ascended' ? 'ascended' : 'practitioner';
    
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // No trial for grandfathered users or Ascended tier — they pay from day one
    const isGfUser = !!user.subscription?.grandfatheredAt;
    
    // Select price ID based on plan + tier
    let priceId;
    if (subTier === 'ascended') {
      priceId = plan === 'yearly' ? ASCENDED_YEARLY_PRICE_ID : ASCENDED_MONTHLY_PRICE_ID;
    } else {
      priceId = plan === 'yearly' ? YEARLY_PRICE_ID : MONTHLY_PRICE_ID;
    }
    
    if (!priceId) {
      console.error('Missing Stripe price ID for plan:', plan);
      return res.status(500).json({ error: 'Payment not configured' });
    }
    
    // Create or retrieve Stripe customer
    let customerId = user.subscription?.stripeCustomerId;

    // Self-heal: if the stored ID points to a customer that no longer exists
    // in Stripe (deleted, or test/live-mode mismatch from a key swap), drop it
    // and fall through to creating a fresh one.
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if (existing.deleted) customerId = null;
      } catch (err) {
        if (err.code === 'resource_missing') {
          console.warn(`Stale stripeCustomerId for ${user.username} (${customerId}) — recreating`);
          customerId = null;
        } else {
          throw err;
        }
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          titantrack_username: user.username,
          titantrack_user_id: user._id.toString()
        }
      });
      customerId = customer.id;
      
      // Save Stripe customer ID immediately
      await User.findByIdAndUpdate(user._id, {
        'subscription.stripeCustomerId': customerId
      });
    }
    
    // ══════════════════════════════════════════════
    // DUPLICATE & UPGRADE GUARD
    // If customer already has an active/trialing sub:
    //   - Same price → block (true duplicate, prevent double-charge)
    //   - Different price → update existing sub in-place (tier/plan change)
    // Stripe handles proration automatically on updates.
    // ══════════════════════════════════════════════
    if (customerId) {
      const existingActive = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
      });
      const existingTrialing = await stripe.subscriptions.list({
        customer: customerId,
        status: 'trialing',
        limit: 1
      });
      
      const existingSub = existingActive.data[0] || existingTrialing.data[0];
      
      if (existingSub) {
        const existingItem = existingSub.items.data[0];
        const existingPriceId = existingItem?.price?.id;
        
        // Same price = true duplicate — block it
        if (existingPriceId === priceId) {
          console.log(`⚠️ Blocked duplicate checkout for ${user.username} — already has sub ${existingSub.id} with same price`);
          return res.status(409).json({ 
            error: 'You already have this plan. Manage it from your Profile.' 
          });
        }
        
        // Different price = tier/plan change — update existing sub in-place
        try {
          const updatedSub = await stripe.subscriptions.update(existingSub.id, {
            items: [{
              id: existingItem.id,
              price: priceId
            }],
            proration_behavior: 'create_prorations',
            metadata: {
              titantrack_username: user.username,
              tier: subTier
            }
          });
          
          // Update MongoDB with new tier/plan immediately
          // (webhook will also fire, but this ensures instant UI update)
          const newPlan = plan === 'yearly' ? 'yearly' : 'monthly';
          await User.findByIdAndUpdate(user._id, {
            'subscription.tier': subTier,
            'subscription.plan': newPlan,
            'subscription.currentPeriodStart': new Date(updatedSub.current_period_start * 1000),
            'subscription.currentPeriodEnd': new Date(updatedSub.current_period_end * 1000)
          });
          
          console.log(`🔄 Plan changed for ${user.username}: ${existingPriceId} → ${priceId} (${subTier} ${plan})`);
          
          // Return success with redirect to profile (no Stripe checkout needed)
          return res.json({ 
            url: `${CLIENT_URL}/profile?checkout=success`,
            upgraded: true 
          });
        } catch (updateErr) {
          console.error(`❌ Subscription update failed for ${user.username}:`, updateErr.message);
          return res.status(500).json({ error: 'Failed to update your plan. Please try again.' });
        }
      }
    }

    // Build checkout session config
    const sessionConfig = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${CLIENT_URL}/profile?checkout=success`,
      cancel_url: `${CLIENT_URL}/profile?checkout=canceled`,
      metadata: {
        titantrack_username: user.username,
        plan: plan,
        tier: subTier
      },
      subscription_data: {
        metadata: {
          titantrack_username: user.username,
          tier: subTier
        }
      }
    };
    
    // If user has an active trial, don't add another trial period
    // If user has never had a trial, add 7-day trial to the subscription
    const hadTrial = user.subscription?.trialStartDate;
    if (!hadTrial && subTier !== 'ascended' && !isGfUser) {
      sessionConfig.subscription_data.trial_period_days = 7;
    }
    
    const session = await stripe.checkout.sessions.create(sessionConfig);
    
    console.log(`💳 Checkout session created for ${user.username} (${subTier} ${plan})`);
    res.json({ url: session.url });
    
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ============================================
// CREATE CUSTOMER PORTAL SESSION
// ============================================
// Lets users manage billing, update payment method, cancel
router.post('/portal', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      return res.status(400).json({ error: 'No billing account found' });
    }
    
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${CLIENT_URL}/profile`
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: 'Failed to open billing portal' });
  }
});

// ============================================
// STRIPE WEBHOOK HANDLER
// ============================================
// Uses rawBody captured by verify callback in express.json()
// Stripe sends events here when payment status changes
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  console.log(`📩 Stripe webhook received: ${event.type}`);
  
  try {
    switch (event.type) {
      // ---- Checkout completed (first payment or trial start) ----
      case 'checkout.session.completed': {
        const session = event.data.object;

        // --- PROTOCOL EBOOK (one-time purchase) ---
        if (session.mode === 'payment') {
          await handleProtocolPurchase(session);
          console.log(`📘 Protocol purchase handled for session ${session.id}`);
          break;
        }

        // --- TITANTRACK SUBSCRIPTION ---
        const username = session.metadata?.titantrack_username;
        const plan = session.metadata?.plan || 'monthly';
        const checkoutTier = session.metadata?.tier || 'practitioner';
        
        if (!username) {
          console.error('No username in checkout metadata');
          break;
        }
        
        const user = await User.findOne({ username });
        if (!user) {
          console.error('User not found for checkout:', username);
          break;
        }
        
        // Retrieve the subscription from Stripe for period details
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        
        user.subscription = {
          ...user.subscription,
          status: subscription.status === 'trialing' ? 'trial' : 'active',
          plan: plan,
          tier: checkoutTier,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          trialStartDate: subscription.trial_start ? new Date(subscription.trial_start * 1000) : user.subscription?.trialStartDate,
          trialEndDate: subscription.trial_end ? new Date(subscription.trial_end * 1000) : user.subscription?.trialEndDate,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: false,
          canceledAt: null
        };
        user.isPremium = true;
        
        await user.save({ validateModifiedOnly: true });
        console.log(`✅ Subscription activated for ${username} (${plan})`);
        break;
      }
      
      // ---- Subscription updated (renewal, plan change, etc.) ----
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const username = subscription.metadata?.titantrack_username;
        
        if (!username) break;
        
        const user = await User.findOne({ username });
        if (!user) break;
        
        // Map Stripe status to our status
        let status;
        switch (subscription.status) {
          case 'active':
            status = 'active';
            break;
          case 'trialing':
            status = 'trial';
            break;
          case 'past_due':
          case 'unpaid':
            status = 'expired'; // Payment failed — revoke access
            break;
          case 'canceled':
          case 'incomplete_expired':
            status = 'expired';
            break;
          default:
            status = user.subscription?.status || 'none';
        }
        
        user.subscription = {
          ...user.subscription,
          status: status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null
        };
        
        // GF fallback: if sub expired but user was originally grandfathered, restore GF status
        if (!['active', 'trial'].includes(status) && user.subscription?.grandfatheredAt) {
          user.subscription.status = 'grandfathered';
          user.subscription.plan = 'lifetime';
          user.isPremium = true;
          console.log(`🔄 Subscription ended for ${username}, restored to grandfathered`);
        } else {
          user.isPremium = ['active', 'trial'].includes(status);
        }
        
        await user.save({ validateModifiedOnly: true });
        console.log(`🔄 Subscription updated for ${username}: ${status}`);
        break;
      }
      
      // ---- Subscription deleted (final cancellation, end of period) ----
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const username = subscription.metadata?.titantrack_username;
        
        if (!username) break;
        
        const user = await User.findOne({ username });
        if (!user) break;
        
        // GF fallback: restore grandfathered status instead of expiring
        if (user.subscription?.grandfatheredAt) {
          user.subscription = {
            ...user.subscription,
            status: 'grandfathered',
            plan: 'lifetime',
            cancelAtPeriodEnd: false
          };
          user.isPremium = true;
          await user.save({ validateModifiedOnly: true });
          console.log(`🔄 Subscription ended for ${username}, restored to grandfathered`);
        } else {
          user.subscription = {
            ...user.subscription,
            status: 'expired',
            cancelAtPeriodEnd: false
          };
          user.isPremium = false;
          await user.save({ validateModifiedOnly: true });
          console.log(`❌ Subscription ended for ${username}`);
        }
        break;
      }
      
      // ---- Invoice paid (successful renewal) ----
      case 'invoice.paid': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
        if (!user) break;
        
        // Ensure premium is active after successful payment
        if (user.subscription?.status !== 'grandfathered') {
          user.subscription.status = 'active';
          user.isPremium = true;
          await user.save({ validateModifiedOnly: true });
          console.log(`💰 Invoice paid, premium confirmed for ${user.username}`);
        }
        break;
      }
      
      // ---- Invoice payment failed ----
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
        if (!user) break;
        
        // GF fallback: restore grandfathered instead of expiring
        if (user.subscription?.grandfatheredAt) {
          user.subscription.status = 'grandfathered';
          user.subscription.plan = 'lifetime';
          user.isPremium = true;
          await user.save({ validateModifiedOnly: true });
          console.log(`❌ Payment failed for ${user.username}, restored to grandfathered`);
        } else if (user.subscription?.status !== 'grandfathered') {
          user.subscription.status = 'expired';
          user.isPremium = false;
          await user.save({ validateModifiedOnly: true });
          console.log(`❌ Payment failed, access revoked for ${user.username}`);
        }
        break;
      }
      
      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 200 to acknowledge receipt (prevent Stripe retries)
  }
  
  // Always acknowledge receipt
  res.json({ received: true });
});

// ============================================
// ADMIN: CLEANUP EXPIRED SUBSCRIPTIONS
// ============================================
// Call periodically or via cron to expire stale trials/cancellations
router.post('/cleanup', async (req, res) => {
  try {
    const expiredTrials = await expireStaleTrials();
    const expiredCanceled = await expireStaleCanceled();
    
    res.json({
      success: true,
      expiredTrials,
      expiredCanceled
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

module.exports = router;
