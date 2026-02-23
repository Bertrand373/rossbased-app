require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./models/User');
  
  // Create relapse history where relapses cluster around days 12-18
  // This makes day 15 a high-risk zone for the ML model
  const now = new Date();
  const streakHistory = [
    { start: new Date(now - 180 * 86400000), end: new Date(now - 165 * 86400000), days: 15, reason: 'relapse', trigger: 'boredom' },
    { start: new Date(now - 165 * 86400000), end: new Date(now - 152 * 86400000), days: 13, reason: 'relapse', trigger: 'stress' },
    { start: new Date(now - 152 * 86400000), end: new Date(now - 135 * 86400000), days: 17, reason: 'relapse', trigger: 'boredom' },
    { start: new Date(now - 135 * 86400000), end: new Date(now - 121 * 86400000), days: 14, reason: 'relapse', trigger: 'loneliness' },
    { start: new Date(now - 121 * 86400000), end: new Date(now - 105 * 86400000), days: 16, reason: 'relapse', trigger: 'stress' },
    { start: new Date(now - 105 * 86400000), end: new Date(now - 93 * 86400000), days: 12, reason: 'relapse', trigger: 'boredom' },
    { start: new Date(now - 93 * 86400000), end: new Date(now - 78 * 86400000), days: 15, reason: 'relapse', trigger: 'loneliness' },
    { start: new Date(now - 78 * 86400000), end: new Date(now - 64 * 86400000), days: 14, reason: 'relapse', trigger: 'stress' },
    // Current active streak - 15 days, no end date
    { start: new Date(now - 15 * 86400000), end: null, days: 15 }
  ];

  // Make the last 3 benefit logs show declining scores (triggers benefit drop pattern)
  const logs = [];
  for (let i = 14; i >= 1; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const isRecent = i <= 3;
    logs.push({
      date: d,
      energy: isRecent ? 3 : Math.floor(Math.random() * 3) + 6,
      focus: isRecent ? 3 : Math.floor(Math.random() * 3) + 6,
      confidence: isRecent ? 4 : Math.floor(Math.random() * 3) + 6,
      aura: isRecent ? 3 : Math.floor(Math.random() * 3) + 5,
      sleep: isRecent ? 4 : Math.floor(Math.random() * 3) + 6,
      workout: isRecent ? 3 : Math.floor(Math.random() * 3) + 6,
      streakDay: 15 - i
    });
  }

  const user = await User.findOneAndUpdate(
    { username: 'ross333333' },
    { 
      $set: {
        benefitTracking: logs,
        streakHistory: streakHistory,
        relapseCount: 8,
        currentStreak: 15,
        startDate: new Date(now - 15 * 86400000),
        'subscription.status': 'expired',
        isPremium: false
      }
    },
    { new: true }
  ).select('username currentStreak relapseCount streakHistory benefitTracking subscription.status');
  
  console.log('Username:', user.username);
  console.log('Streak:', user.currentStreak);
  console.log('Relapses:', user.relapseCount);
  console.log('Streak history entries:', user.streakHistory.length);
  console.log('Benefit logs:', user.benefitTracking.length);
  console.log('Sub status:', user.subscription.status);
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err.message);
  mongoose.disconnect();
});
