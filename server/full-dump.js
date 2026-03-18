const mongoose = require('mongoose');
const User = require('./models/User');
const OracleChatHistory = require('./models/OracleChatHistory');
const OracleTransmission = require('./models/OracleTransmission');
const OraclePin = require('./models/OraclePin');
const OracleShare = require('./models/OracleShare');
const PageView = require('./models/PageView');
const ProtocolPurchase = require('./models/ProtocolPurchase');

async function dump() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected\n');

  // ============================================================
  // 1. ALL USERS — core fields (no passwords)
  // ============================================================
  const users = await User.find({}, {
    password: 0, resetPasswordToken: 0, resetPasswordExpires: 0,
    'aiUsage.lastIP': 0
  }).lean();

  console.log(`=== USERS: ${users.length} total ===\n`);
  
  for (const u of users) {
    const benefitCount = (u.benefitTracking || []).length;
    const urgeCount = (u.urgeLog || []).length;
    const journalCount = Object.keys(u.notes || {}).length;
    const oracleNoteCount = (u.oracleNotes || []).length;
    const workoutCount = (u.workoutLog || []).length;
    const streakHistCount = (u.streakHistory || []).length;
    const wetDreamArr = u.wetDreams || [];
    
    console.log(`--- ${u.username} ---`);
    console.log(`  Created: ${u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : 'unknown'}`);
    console.log(`  Start date: ${u.startDate ? new Date(u.startDate).toISOString().split('T')[0] : 'none'}`);
    console.log(`  Current streak: ${u.currentStreak || 0} | Longest: ${u.longestStreak || 0}`);
    console.log(`  Relapses: ${u.relapseCount || 0} | Wet dreams: ${u.wetDreamCount || 0}`);
    console.log(`  Benefit logs: ${benefitCount} | Urge logs: ${urgeCount} | Journal: ${journalCount} | Workouts: ${workoutCount}`);
    console.log(`  Oracle lifetime msgs: ${u.aiUsage?.lifetimeCount || 0} | Oracle notes: ${oracleNoteCount}`);
    console.log(`  Leaderboard: ${u.showOnLeaderboard} | Discord: ${u.discordId ? 'linked' : 'no'} | Gold: ${u.streakColorGold}`);
    console.log(`  Sub status: ${u.subscription?.status || 'none'} | Tier: ${u.subscription?.tier || 'none'} | Plan: ${u.subscription?.plan || 'none'}`);
    if (u.subscription?.grandfatheredAt) console.log(`  Grandfathered: ${new Date(u.subscription.grandfatheredAt).toISOString().split('T')[0]} (${u.subscription.grandfatheredReason})`);
    console.log(`  Streak history entries: ${streakHistCount}`);
    if (u.mindProgram?.nightsCompleted > 0) console.log(`  Mind Program: ${u.mindProgram.nightsCompleted} nights`);
    console.log('');
  }

  // ============================================================
  // 2. BENEFIT TRACKING — who logs, how often, what scores
  // ============================================================
  console.log('\n=== BENEFIT TRACKING ANALYSIS ===\n');
  
  const loggers = users.filter(u => (u.benefitTracking || []).length > 0);
  console.log(`Users who have logged benefits: ${loggers.length}/${users.length}`);
  
  let totalLogs = 0;
  let allScores = { energy: [], focus: [], confidence: [], aura: [], sleep: [], workout: [] };
  
  for (const u of loggers) {
    const logs = u.benefitTracking || [];
    totalLogs += logs.length;
    
    // Get date range
    const dates = logs.map(l => new Date(l.date)).sort((a,b) => a-b);
    const firstLog = dates[0];
    const lastLog = dates[dates.length - 1];
    const daySpan = Math.ceil((lastLog - firstLog) / (1000*60*60*24)) + 1;
    const consistency = ((logs.length / daySpan) * 100).toFixed(0);
    
    console.log(`  ${u.username}: ${logs.length} logs over ${daySpan} days (${consistency}% consistency) | ${firstLog.toISOString().split('T')[0]} to ${lastLog.toISOString().split('T')[0]}`);
    
    for (const log of logs) {
      for (const metric of Object.keys(allScores)) {
        if (log[metric] != null) allScores[metric].push(log[metric]);
      }
    }
  }
  
  console.log(`\nTotal benefit logs: ${totalLogs}`);
  console.log('Global averages:');
  for (const [metric, scores] of Object.entries(allScores)) {
    if (scores.length > 0) {
      const avg = (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(1);
      console.log(`  ${metric}: ${avg} (${scores.length} data points)`);
    }
  }

  // ============================================================
  // 3. STREAK HISTORY — relapse patterns
  // ============================================================
  console.log('\n=== RELAPSE/STREAK ANALYSIS ===\n');
  
  let allRelapses = [];
  for (const u of users) {
    const history = u.streakHistory || [];
    const ended = history.filter(s => s.end != null && s.reason);
    for (const s of ended) {
      allRelapses.push({
        user: u.username,
        days: s.days,
        reason: s.reason,
        trigger: s.trigger,
        date: s.end
      });
    }
  }
  
  console.log(`Total recorded relapses: ${allRelapses.length}`);
  
  // Trigger breakdown
  const triggerCounts = {};
  for (const r of allRelapses) {
    const t = r.trigger || r.reason || 'unknown';
    triggerCounts[t] = (triggerCounts[t] || 0) + 1;
  }
  const sortedTriggers = Object.entries(triggerCounts).sort((a,b) => b[1] - a[1]);
  console.log('\nRelapse triggers:');
  for (const [trigger, count] of sortedTriggers) {
    console.log(`  ${trigger}: ${count}`);
  }
  
  // Day of relapse distribution
  const relapseDays = allRelapses.filter(r => r.days > 0).map(r => r.days);
  if (relapseDays.length > 0) {
    const buckets = { '1-7': 0, '8-14': 0, '15-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    for (const d of relapseDays) {
      if (d <= 7) buckets['1-7']++;
      else if (d <= 14) buckets['8-14']++;
      else if (d <= 30) buckets['15-30']++;
      else if (d <= 60) buckets['31-60']++;
      else if (d <= 90) buckets['61-90']++;
      else buckets['90+']++;
    }
    console.log('\nRelapse day distribution:');
    for (const [bucket, count] of Object.entries(buckets)) {
      console.log(`  Day ${bucket}: ${count}`);
    }
  }

  // ============================================================
  // 4. URGE LOGS
  // ============================================================
  console.log('\n=== URGE LOG ANALYSIS ===\n');
  
  let allUrges = [];
  for (const u of users) {
    for (const urge of (u.urgeLog || [])) {
      allUrges.push({ user: u.username, ...urge });
    }
  }
  console.log(`Total urge logs: ${allUrges.length}`);
  
  const urgeTriggers = {};
  for (const urge of allUrges) {
    const t = urge.trigger || 'unknown';
    urgeTriggers[t] = (urgeTriggers[t] || 0) + 1;
  }
  console.log('Urge triggers:');
  Object.entries(urgeTriggers).sort((a,b) => b[1] - a[1]).forEach(([t,c]) => console.log(`  ${t}: ${c}`));
  
  const urgeIntensities = allUrges.filter(u => u.intensity).map(u => u.intensity);
  if (urgeIntensities.length > 0) {
    const avgIntensity = (urgeIntensities.reduce((a,b) => a+b,0) / urgeIntensities.length).toFixed(1);
    console.log(`Average urge intensity: ${avgIntensity}/10`);
  }

  // ============================================================
  // 5. JOURNAL ENTRIES
  // ============================================================
  console.log('\n=== JOURNAL ANALYSIS ===\n');
  
  let totalEntries = 0;
  let totalChars = 0;
  const journalers = [];
  
  for (const u of users) {
    const entries = Object.entries(u.notes || {});
    if (entries.length > 0) {
      const chars = entries.reduce((sum, [k, v]) => sum + (typeof v === 'string' ? v.length : JSON.stringify(v).length), 0);
      totalEntries += entries.length;
      totalChars += chars;
      journalers.push({ user: u.username, count: entries.length, avgLen: Math.round(chars / entries.length) });
    }
  }
  
  journalers.sort((a,b) => b.count - a.count);
  console.log(`Users with journal entries: ${journalers.length}`);
  console.log(`Total entries: ${totalEntries}`);
  if (totalEntries > 0) console.log(`Avg chars per entry: ${Math.round(totalChars / totalEntries)}`);
  journalers.forEach(j => console.log(`  ${j.user}: ${j.count} entries, avg ${j.avgLen} chars`));

  // ============================================================
  // 6. ORACLE NOTES (what Oracle remembers about users)
  // ============================================================
  console.log('\n=== ORACLE MEMORY NOTES ===\n');
  
  for (const u of users) {
    const notes = u.oracleNotes || [];
    if (notes.length > 0) {
      console.log(`--- ${u.username} (${notes.length} notes) ---`);
      for (const n of notes.slice(-5)) {
        console.log(`  [Day ${n.streakDay || '?'} | ${n.source || 'app'}]: ${(n.note || '').substring(0, 200)}`);
      }
      console.log('');
    }
  }

  // ============================================================
  // 7. SUBSCRIPTIONS & REVENUE
  // ============================================================
  console.log('\n=== SUBSCRIPTION BREAKDOWN ===\n');
  
  const subCounts = {};
  for (const u of users) {
    const status = u.subscription?.status || 'none';
    subCounts[status] = (subCounts[status] || 0) + 1;
  }
  for (const [status, count] of Object.entries(subCounts)) {
    console.log(`  ${status}: ${count}`);
  }
  
  const tierCounts = {};
  for (const u of users) {
    if (u.subscription?.status === 'active' || u.subscription?.status === 'grandfathered') {
      const tier = u.subscription?.tier || 'practitioner';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    }
  }
  console.log('\nActive/Grandfathered tier breakdown:');
  for (const [tier, count] of Object.entries(tierCounts)) {
    console.log(`  ${tier}: ${count}`);
  }
  
  // Protocol purchases
  try {
    const purchases = await ProtocolPurchase.find({}).lean();
    console.log(`\nProtocol ebook purchases: ${purchases.length}`);
  } catch(e) {
    console.log('\nProtocol purchases: could not query');
  }

  // ============================================================
  // 8. PAGE VIEWS — what screens do people visit
  // ============================================================
  console.log('\n=== PAGE VIEW ANALYSIS ===\n');
  
  try {
    const views = await PageView.find({}).lean();
    console.log(`Total page view records: ${views.length}`);
    
    const pageCounts = {};
    for (const v of views) {
      const page = v.page || v.path || 'unknown';
      pageCounts[page] = (pageCounts[page] || 0) + (v.count || 1);
    }
    Object.entries(pageCounts).sort((a,b) => b[1] - a[1]).forEach(([p,c]) => console.log(`  ${p}: ${c}`));
  } catch(e) {
    console.log('PageView query failed:', e.message);
  }

  // ============================================================
  // 9. ORACLE TRANSMISSIONS
  // ============================================================
  console.log('\n=== ORACLE TRANSMISSIONS ===\n');
  
  try {
    const transmissions = await OracleTransmission.find({}).lean();
    console.log(`Total transmissions: ${transmissions.length}`);
    const readCount = transmissions.filter(t => t.read).length;
    console.log(`Read: ${readCount} (${((readCount/transmissions.length)*100).toFixed(1)}%)`);
    const uniqueUsers = [...new Set(transmissions.map(t => t.username))];
    console.log(`Unique users who received: ${uniqueUsers.length}`);
  } catch(e) {
    console.log('Transmission query failed:', e.message);
  }

  // ============================================================
  // 10. ORACLE PINS
  // ============================================================
  console.log('\n=== ORACLE PINS ===\n');
  
  try {
    const pins = await OraclePin.find({}).lean();
    console.log(`Total pins: ${pins.length}`);
    const pinUsers = [...new Set(pins.map(p => p.username))];
    console.log(`Users who pinned: ${pinUsers.length}`);
    pinUsers.forEach(u => {
      const count = pins.filter(p => p.username === u).length;
      console.log(`  ${u}: ${count} pins`);
    });
  } catch(e) {
    console.log('Pin query failed:', e.message);
  }

  // ============================================================
  // 11. ORACLE SHARES
  // ============================================================
  console.log('\n=== ORACLE SHARES ===\n');
  
  try {
    const shares = await OracleShare.find({}).lean();
    console.log(`Total shares: ${shares.length}`);
    const shareUsers = [...new Set(shares.map(s => s.username))];
    console.log(`Users who shared: ${shareUsers.length}`);
  } catch(e) {
    console.log('Share query failed:', e.message);
  }

  // ============================================================
  // 12. WORKOUT LOGS
  // ============================================================
  console.log('\n=== WORKOUT LOGS ===\n');
  
  const workoutUsers = users.filter(u => (u.workoutLog || []).length > 0);
  console.log(`Users with workout logs: ${workoutUsers.length}`);
  let totalWorkouts = 0;
  for (const u of workoutUsers) {
    const count = u.workoutLog.length;
    totalWorkouts += count;
    console.log(`  ${u.username}: ${count} workouts`);
  }
  console.log(`Total workout entries: ${totalWorkouts}`);

  // ============================================================
  // 13. USER CREATION TIMELINE — signups over time
  // ============================================================
  console.log('\n=== SIGNUP TIMELINE ===\n');
  
  const signupsByWeek = {};
  for (const u of users) {
    if (u.createdAt) {
      const d = new Date(u.createdAt);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      signupsByWeek[key] = (signupsByWeek[key] || 0) + 1;
    }
  }
  Object.entries(signupsByWeek).sort((a,b) => a[0].localeCompare(b[0])).forEach(([week, count]) => {
    console.log(`  ${week}: ${count} signups`);
  });

  // ============================================================
  // 14. ENGAGEMENT COHORTS — last active
  // ============================================================
  console.log('\n=== ENGAGEMENT COHORTS ===\n');
  
  const now = new Date();
  let active24h = 0, active3d = 0, active7d = 0, active30d = 0, dormant = 0;
  
  for (const u of users) {
    const lastActivity = u.updatedAt || u.createdAt;
    if (!lastActivity) { dormant++; continue; }
    const daysSince = (now - new Date(lastActivity)) / (1000*60*60*24);
    if (daysSince <= 1) active24h++;
    else if (daysSince <= 3) active3d++;
    else if (daysSince <= 7) active7d++;
    else if (daysSince <= 30) active30d++;
    else dormant++;
  }
  
  console.log(`  Active last 24h: ${active24h}`);
  console.log(`  Active 1-3 days: ${active3d}`);
  console.log(`  Active 3-7 days: ${active7d}`);
  console.log(`  Active 7-30 days: ${active30d}`);
  console.log(`  Dormant (30+ days): ${dormant}`);

  // ============================================================
  // 15. LEADERBOARD PARTICIPANTS
  // ============================================================
  console.log('\n=== LEADERBOARD ===\n');
  
  const lbUsers = users.filter(u => u.showOnLeaderboard);
  console.log(`Opted in: ${lbUsers.length}`);
  lbUsers.sort((a,b) => (b.currentStreak||0) - (a.currentStreak||0));
  lbUsers.slice(0, 10).forEach((u, i) => {
    console.log(`  ${i+1}. ${u.username}: ${u.currentStreak || 0} days (longest: ${u.longestStreak || 0})`);
  });

  await mongoose.disconnect();
  console.log('\nDone.');
}

dump().catch(err => { console.error('Error:', err); process.exit(1); });
