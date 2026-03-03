require('dotenv').config();
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./models/User');
  
  // Find anyone with premium access who isn't grandfathered
  const users = await User.find({
    'subscription.status': { $in: ['active', 'trial', 'canceled'] }
  }).select('username subscription isPremium');
  
  console.log(`Found ${users.length} non-expired subscription users:\n`);
  
  for (const user of users) {
    const sub = user.subscription;
    console.log(`--- ${user.username} ---`);
    console.log(`  DB status: ${sub.status} | isPremium: ${user.isPremium}`);
    console.log(`  Trial end: ${sub.trialEndDate || 'none'}`);
    console.log(`  Period end: ${sub.currentPeriodEnd || 'none'}`);
    console.log(`  Stripe sub ID: ${sub.stripeSubscriptionId || 'NONE'}`);
    
    if (sub.stripeSubscriptionId) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
        console.log(`  Stripe says: ${stripeSub.status}`);
        if (stripeSub.trial_end) {
          console.log(`  Stripe trial end: ${new Date(stripeSub.trial_end * 1000)}`);
        }
      } catch (err) {
        console.log(`  Stripe error: ${err.message}`);
      }
    }
    console.log('');
  }
  
  mongoose.disconnect();
}).catch(err => { console.error(err); process.exit(1); });
