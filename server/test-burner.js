require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./models/User');
  
  const logs = [];
  for (let i = 14; i >= 1; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    logs.push({
      date: d,
      energy: Math.floor(Math.random() * 4) + 5,
      focus: Math.floor(Math.random() * 4) + 5,
      confidence: Math.floor(Math.random() * 4) + 5,
      aura: Math.floor(Math.random() * 4) + 4,
      sleep: Math.floor(Math.random() * 4) + 5,
      workout: Math.floor(Math.random() * 4) + 5,
      streakDay: 15 - i
    });
  }

  const user = await User.findOneAndUpdate(
    { username: 'ross333333' },
    { 
      $set: {
        benefitTracking: logs,
        'subscription.status': 'expired',
        isPremium: false,
        currentStreak: 15,
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      }
    },
    { new: true }
  ).select('username currentStreak benefitTracking subscription.status isPremium');
  
  console.log('Username:', user.username);
  console.log('Streak:', user.currentStreak);
  console.log('Premium:', user.isPremium);
  console.log('Sub status:', user.subscription.status);
  console.log('Benefit logs:', user.benefitTracking.length);
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err.message);
  mongoose.disconnect();
});
