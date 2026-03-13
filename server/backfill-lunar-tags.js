// backfill-lunar-tags.js
// ONE-TIME SCRIPT — Run in Render shell to retroactively tag all existing data
// cd ~/project/src/server && node backfill-lunar-tags.js
//
// Tags: benefitTracking entries, wetDreams entries, and streakHistory relapses
// with moonPhase + moonIllumination computed from their stored dates via suncalc

const mongoose = require('mongoose');
const SunCalc = require('suncalc');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }

// Phase classification — matches lunarData.js exactly
const PHASE_MAP = [
  { max: 0.0508, phase: 'new' },
  { max: 0.2498, phase: 'waxing-crescent' },
  { max: 0.3125, phase: 'first-quarter' },
  { max: 0.4404, phase: 'waxing-gibbous' },
  { max: 0.5589, phase: 'full' },
  { max: 0.7164, phase: 'waning-gibbous' },
  { max: 0.7790, phase: 'last-quarter' },
  { max: 0.9649, phase: 'waning-crescent' },
  { max: 1.0001, phase: 'new' }
];

function getMoonPhaseForDate(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return { phase: null, illumination: null };
  const illum = SunCalc.getMoonIllumination(d);
  const scPhase = illum.phase;
  let phaseName = 'new';
  for (const entry of PHASE_MAP) {
    if (scPhase < entry.max) { phaseName = entry.phase; break; }
  }
  return { phase: phaseName, illumination: Math.round(illum.fraction * 100) };
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
  const users = await User.find({}).lean();
  console.log(`Processing ${users.length} users...`);

  let benefitTagged = 0;
  let wetDreamTagged = 0;
  let relapseTagged = 0;
  let usersUpdated = 0;

  for (const user of users) {
    let changed = false;
    const updates = {};

    // 1. Tag benefit logs
    const benefits = user.benefitTracking || [];
    if (benefits.length > 0) {
      let modified = false;
      const updatedBenefits = benefits.map(b => {
        if (b.moonPhase) return b; // Already tagged
        if (!b.date) return b;
        const moon = getMoonPhaseForDate(b.date);
        if (!moon.phase) return b;
        modified = true;
        benefitTagged++;
        return { ...b, moonPhase: moon.phase, moonIllumination: moon.illumination };
      });
      if (modified) {
        updates.benefitTracking = updatedBenefits;
        changed = true;
      }
    }

    // 2. Tag wet dreams
    const wetDreams = user.wetDreams || [];
    if (wetDreams.length > 0) {
      let modified = false;
      const updatedWetDreams = wetDreams.map(w => {
        if (w.moonPhase) return w; // Already tagged
        if (!w.date) return w;
        const moon = getMoonPhaseForDate(w.date);
        if (!moon.phase) return w;
        modified = true;
        wetDreamTagged++;
        return { ...w, moonPhase: moon.phase, moonIllumination: moon.illumination };
      });
      if (modified) {
        updates.wetDreams = updatedWetDreams;
        changed = true;
      }
    }

    // 3. Tag relapses in streakHistory
    const streakHistory = user.streakHistory || [];
    if (streakHistory.length > 0) {
      let modified = false;
      const updatedHistory = streakHistory.map(s => {
        if (s.moonPhase) return s; // Already tagged
        if (s.reason !== 'relapse' || !s.end) return s;
        const moon = getMoonPhaseForDate(s.end);
        if (!moon.phase) return s;
        modified = true;
        relapseTagged++;
        return { ...s, moonPhase: moon.phase, moonIllumination: moon.illumination };
      });
      if (modified) {
        updates.streakHistory = updatedHistory;
        changed = true;
      }
    }

    if (changed) {
      await User.updateOne({ _id: user._id }, { $set: updates });
      usersUpdated++;
    }
  }

  console.log(`\n✅ Backfill complete:`);
  console.log(`   ${benefitTagged} benefit logs tagged`);
  console.log(`   ${wetDreamTagged} wet dreams tagged`);
  console.log(`   ${relapseTagged} relapses tagged`);
  console.log(`   ${usersUpdated} users updated`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
