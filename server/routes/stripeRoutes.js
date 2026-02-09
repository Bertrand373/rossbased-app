// server/routes/stripeRoutes.js
// Handles all Stripe payment operations
// Uses Stripe Checkout (hosted payment page) for security and simplicity

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { 
  checkPremiumAccess, 
  startFreeTrial,
  expireStaleTrials,
  expireStaleCanceled
} = require('../middleware/subscriptionMiddleware');

// ============================================
// STRIPE INITIALIZATION
// ============================================
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Stripe Price IDs - set these in Render env vars after creating products in Stripe Dashboard
// STRIPE_PRICE_MONTHLY = price_xxxxx ($8/month)
// STRIPE_PRICE_YEARLY = price_xxxxx ($64/year)
const MONTHLY_PRICE_ID = process.env.STRIPE_PRICE_MONTHLY;
const YEARLY_PRICE_ID = process.env.STRIPE_PRICE_YEARLY;

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
    const jwtSecret = process.env.JWT_SECRET || 'rossbased_secret_key';
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
// START FREE TRIAL
// ============================================
router.post('/start-trial', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't allow trial if user already had one or is grandfathered
    const sub = user.subscription || {};
    if (sub.status === 'grandfathered') {
      return res.json({ success: true, message: 'Already have lifetime access' });
    }
    if (sub.trialStartDate) {
      return res.status(400).json({ error: 'Trial already used' });
    }
    
    await startFreeTrial(user);
    
    const accessInfo = checkPremiumAccess(user);
    res.json({ 
      success: true, 
      message: 'Free trial started',
      ...accessInfo
    });
  } catch (error) {
    console.error('Start trial error:', error);
    res.status(500).json({ error: 'Failed to start trial' });
  }
});

// ============================================
// CREATE CHECKOUT SESSION
// ============================================
// Redirects user to Stripe's hosted payment page
router.post('/create-checkout', authenticate, async (req, res) => {
  try {
    const { plan } = req.body; // 'monthly' or 'yearly'
    
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't allow checkout if already grandfathered
    if (user.subscription?.status === 'grandfathered') {
      return res.status(400).json({ error: 'You already have lifetime access' });
    }
    
    // Select price ID based on plan
    const priceId = plan === 'yearly' ? YEARLY_PRICE_ID : MONTHLY_PRICE_ID;
    
    if (!priceId) {
      console.error('Missing Stripe price ID for plan:', plan);
      return res.status(500).json({ error: 'Payment not configured' });
    }
    
    // Create or retrieve Stripe customer
    let customerId = user.subscription?.stripeCustomerId;
    
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
        plan: plan
      },
      subscription_data: {
        metadata: {
          titantrack_username: user.username
        }
      }
    };
    
    // If user has an active trial, don't add another trial period
    // If user has never had a trial, add 7-day trial to the subscription
    const hadTrial = user.subscription?.trialStartDate;
    if (!hadTrial) {
      sessionConfig.subscription_data.trial_period_days = 7;
    }
    
    const session = await stripe.checkout.sessions.create(sessionConfig);
    
    console.log(`💳 Checkout session created for ${user.username} (${plan})`);
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
// IMPORTANT: This route uses raw body parsing (configured in app.js)
// Stripe sends events here when payment status changes
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
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
        const username = session.metadata?.titantrack_username;
        const plan = session.metadata?.plan || 'monthly';
        
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
        
        await user.save();
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
            status = 'active'; // Give grace period
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
        user.isPremium = ['active', 'trial'].includes(status);
        
        await user.save();
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
        
        // Don't override grandfather status
        if (user.subscription?.status === 'grandfathered') break;
        
        user.subscription = {
          ...user.subscription,
          status: 'expired',
          cancelAtPeriodEnd: false
        };
        user.isPremium = false;
        
        await user.save();
        console.log(`❌ Subscription ended for ${username}`);
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
          await user.save();
          console.log(`💰 Invoice paid, premium confirmed for ${user.username}`);
        }
        break;
      }
      
      // ---- Invoice payment failed ----
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });
        if (user) {
          console.log(`⚠️ Payment failed for ${user.username}`);
          // Don't immediately revoke - Stripe will retry
          // After all retries fail, subscription.deleted will fire
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
