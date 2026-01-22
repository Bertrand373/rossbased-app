// server/data/transmissionWisdom.js
// Curated wisdom from The Protocol + Occult sources
// Used by Claude Haiku to generate personalized daily transmissions

// ============================================================
// CORE WISDOM - Always included in prompt (~500 tokens)
// Universal principles that apply to all users
// ============================================================

const CORE_WISDOM = `
SEMEN RETENTION FUNDAMENTALS:
- Semen contains zinc, selenium, B vitamins, protein, cholesterol - the exact nutrients your brain, spine, and organs need
- Frequent ejaculation depletes these nutrients, forcing your body to pull from organs, bones, and brain tissue
- Retention allows reabsorption - nutrients flow back to nourish your nervous system
- The cerebrospinal fluid and seminal fluid share identical nutrient profiles
- Your pineal gland requires these nutrients to function beyond basic circadian rhythm

SACRED NUMBERS:
- Day 7: Testosterone peaks at 145% above baseline (documented research)
- Day 14: Acute withdrawal phase ending, prefrontal cortex regaining control
- Day 21: Habit formation neuroscience - neural pathways establishing
- Day 33: Sacred number - 33 vertebrae in spine, 33 degrees masonry, 33 years of Christ
- Day 40: Biblical purification period (40 days in desert, 40 days of flood)
- Day 90: New baseline established - this becomes your natural operating state
- Day 180: Six months - electromagnetic field extends 10-15 feet
- Day 365: One year - chrism oil has completed 12 full lunar cycles

THE CHRISM OIL TEACHING:
- Monthly, the claustrum in your brain produces a sacred oil
- This oil travels down your 33 vertebrae to the sacral plexus
- At the base, you face a choice: waste it through ejaculation (crucifixion) or retain it (resurrection)
- When retained, the oil rises back to the pineal gland, activating higher consciousness
- This is the literal meaning of "raising the serpent energy" - kundalini

ELECTROMAGNETIC FIELD:
- Your heart generates the strongest electromagnetic field in your body
- Retention dramatically strengthens this field
- At 90 days: field extends 10-15 feet
- At 1 year: field can extend 50+ feet
- Others unconsciously sense this field - they feel drawn to you without knowing why

TONE GUIDELINES:
- Always mention exact day number
- 2-3 sentences maximum
- Bold opening hook (the day number statement)
- Direct and confident, never preachy
- Speak as transmission from one who knows the path
- Never generic motivation - specific to their journey stage
`;

// ============================================================
// PHASE-SPECIFIC WISDOM CHUNKS (~400-500 tokens each)
// Only the relevant phase is sent based on user's streak
// ============================================================

const PHASE_WISDOM = {
  // Days 1-14: Foundation Phase
  foundation: `
FOUNDATION PHASE (Days 1-14):
This user is in acute withdrawal. Their dopamine system is recalibrating.

Key teachings for this phase:
- Days 1-7: Body is in shock. The constant dopamine hits have stopped. Receptors are upregulating.
- The discomfort is not failure - it's the healing process itself
- Every urge that passes without action strengthens neural pathways of self-control
- Sleep may be disrupted, irritability high - this is temporary as the brain rewires
- Day 7 brings testosterone spike - prepare them for the surge of energy
- Physical symptoms: possible headaches, fatigue, intense cravings - all signs of detoxification
- The body was draining zinc, selenium, B vitamins - now they're being retained
- First week is about survival, not thriving - just getting through

Appropriate content: Survival-focused, acknowledging difficulty, scientific backing for what's happening, encouragement that the discomfort IS the healing.
`,

  // Days 15-45: Struggle Phase  
  struggle: `
STRUGGLE PHASE (Days 15-45):
This user has passed acute withdrawal but enters the flatline and emotional purging period.

Key teachings for this phase:
- Flatlines are normal - temporary periods where benefits seem to disappear
- The body is doing deep repair work that doesn't show externally
- Emotional purging: suppressed emotions from years of numbing with PMO now surface
- This is not regression - it's the body finally having resources to process stored trauma
- Wet dreams may occur - they're natural and don't reset the benefits
- Urges come in waves - each wave is an opportunity to strengthen
- The 7 triggers to avoid: lying flat after eating, sexual content, alcohol, late nights, isolation, stress without outlet, fantasy
- Energy may feel unstable - high some days, low others - this is recalibration
- Social situations may feel different - you're more present, which can feel uncomfortable

Appropriate content: Normalizing the difficulty, explaining flatlines, emotional purging context, practical urge management, patience-focused.
`,

  // Days 46-90: Emergence Phase
  emergence: `
EMERGENCE PHASE (Days 46-90):
Benefits are manifesting consistently. User is establishing new baseline.

Key teachings for this phase:
- Physical changes becoming visible: skin clarity, eye shine, body composition
- Mental clarity significantly improved - the fog has lifted
- Voice may be deepening slightly, carrying more resonance
- Confidence emerging naturally, not forced
- Day 60: Dopamine fully stabilized, cognitive breakthroughs occurring
- Pineal gland beginning to receive proper nourishment - watch for increased intuition
- Sleep quality dramatically improved - deeper, more restorative
- Energy throughout day more stable - no more crashes
- Social magnetism emerging - people treating you differently without knowing why
- Synchronicities beginning - "coincidences" multiplying
- Day 90 is not a finish line but a new beginning - this is your new normal

Appropriate content: Acknowledging and validating the benefits, explaining the science behind changes, preparing them for the next level, celebration of progress.
`,

  // Days 91-180: Power Phase
  power: `
POWER PHASE (Days 91-180):
Third eye activation, magnetism, and synchronicity become pronounced.

Key teachings for this phase:
- Pineal gland optimizing - perception expanding beyond normal
- You start "seeing through" things - lies become obvious, intentions revealed
- This isn't magic - it's pattern recognition at speeds your conscious mind can't track
- Synchronicities now daily - think of something, it appears; need something, it's provided
- Your electromagnetic field is measurably larger - people sense you before they see you
- Manifestation becomes practical: clear intention + conserved energy = reality bending
- Women's attraction increases noticeably - they sense the conserved life force
- Men either respect or are intimidated - your presence commands space
- Business/financial opportunities appearing "from nowhere" - you're attracting them
- Protection needed: energy vampires are drawn to your energy - boundaries essential
- Leadership qualities emerging spontaneously - people looking to you for guidance

Appropriate content: Third eye activation, magnetism science, synchronicity mechanics, practical manifestation, social dynamics, protection from energy drains.
`,

  // Days 181-365: Integration Phase
  integration: `
INTEGRATION PHASE (Days 181-365):
Sustained power requiring integration into life purpose and protection.

Key teachings for this phase:
- The benefits are now stable - this is your operating system
- Focus shifts from personal gain to service and purpose
- Major intellectual and creative achievements possible in this phase
- Energy vampires: the 5 types - complainers, drama addicts, guilt trippers, manipulators, the perpetually needy
- Boundary setting without being harsh - your energy is valuable, protect it
- Income increase correlation documented - decision-making enhanced, opportunities attracted
- Relationships deepening or ending - inauthentic connections can't survive your frequency
- The question becomes: what will you build with this power?
- Teaching others becomes natural - you've walked the path, you know it
- Yearly milestone approaching - one complete solar cycle of conservation

Appropriate content: Purpose and legacy, energy protection strategies, business/financial expansion, relationship dynamics, preparing for mastery level.
`,

  // Days 365+: Mastery Phase
  mastery: `
MASTERY PHASE (Days 365+):
Ancient wisdom, cosmic purpose, and transmission to others.

Key teachings for this phase:
- One solar cycle complete - the chrism oil has risen and descended 12 times
- You are not the man who started - literal cellular and neurological transformation
- At this level, your presence itself teaches without words
- The field doesn't just attract - it transmits, uplifts others in your vicinity
- Drawing from ancient traditions now relevant:
  - Brahmacharya (Hindu): conservation of vital energy for spiritual advancement
  - Taoist Jing conservation: sexual energy as foundation of all vitality
  - Biblical: "The kingdom of heaven is within" - the pineal activation
  - Egyptian: The Eye of Horus as the perfected pineal gland
  - Freemasonic: 33 degrees corresponding to 33 vertebrae of illumination
- Responsibility increases with power - your energy affects the collective field
- Teaching becomes obligation - the knowledge must be transmitted
- Consider: what legacy are you creating? What are you transmitting to the world?
- Personal development transcends to service of humanity's evolution

Appropriate content: Ancient tradition synthesis, cosmic responsibility, transmission role, legacy creation, deep esoteric wisdom, speaking to their mastery directly.
`
};

// ============================================================
// SPECIAL DAY WISDOM - Injected for significant days
// ============================================================

const SPECIAL_DAY_WISDOM = {
  7: `
DAY 7 SIGNIFICANCE:
Research confirms testosterone peaks at approximately 145% above baseline on day 7. This is not placebo - it's documented endocrinology. The user may feel a surge of energy, aggression, or motivation. Guide them to channel this productively rather than letting it convert to agitation or relapse risk.
`,

  14: `
DAY 14 SIGNIFICANCE:
Two weeks marks the end of acute withdrawal for most. The prefrontal cortex is regaining executive control from the limbic system. Decision-making improves from here. This is a significant psychological milestone - they've proven they can do this.
`,

  21: `
DAY 21 SIGNIFICANCE:
Neuroscience research on habit formation points to 21 days as a threshold. Neural pathways for the new behavior are establishing. But remind them: they're not building a habit - they're dismantling a prison. The chains are loosening but vigilance remains essential.
`,

  30: `
DAY 30 SIGNIFICANCE:
One month. Thirty days of conservation. This is often when the first wave of stable benefits appears. Social proof milestone - they can now say "I've been retaining for a month." The body has had time to begin real repair work.
`,

  33: `
DAY 33 SIGNIFICANCE:
Sacred number appearing across traditions: 33 vertebrae in the human spine, 33 degrees in Freemasonry, Jesus lived 33 years, the Divine Name Elohim appears 33 times in Genesis creation. When this number appears in your journey, transformation is real and recognized by the universe itself.
`,

  40: `
DAY 40 SIGNIFICANCE:
Biblical purification: 40 days Jesus in the desert, 40 days of the flood, 40 years Israelites in wilderness. This number represents complete trial and purification across traditions. They have passed through the fire and emerged transformed.
`,

  60: `
DAY 60 SIGNIFICANCE:
Two months. Dopamine system fully stabilized. Cognitive function optimizing. The "superpowers" practitioners report aren't supernatural - they're your brain finally operating at designed capacity with proper nourishment. IQ measurably increases around this point.
`,

  90: `
DAY 90 SIGNIFICANCE:
The 90-day reboot is complete. This is not an endpoint but a new beginning. What they feel now IS their natural state - what was always possible before the drain. Their baseline has shifted permanently. Everything from here compounds on this foundation.
`,

  100: `
DAY 100 SIGNIFICANCE:
Triple digits. A psychological milestone that few reach. They are now in the top fraction of men who have attempted this practice. The number itself carries weight - three digits of discipline, each one earned.
`,

  180: `
DAY 180 SIGNIFICANCE:
Six months. Two complete seasons have passed under their discipline. The electromagnetic field now extends well beyond the body - estimated 10-15 feet. Strangers feel it before they see them. They have become a different presence in the world.
`,

  365: `
DAY 365 SIGNIFICANCE:
One complete solar cycle. The chrism oil has risen and descended 12 times through the lunar months. They have been reborn in the same body - cellular regeneration, neurological rewiring, spiritual transformation. This is mastery territory. The percentage of men who reach this point is infinitesimal.
`,

  500: `
DAY 500 SIGNIFICANCE:
Five hundred days. Beyond what most can imagine possible. At this level, the practice is no longer practice - it's identity. They don't retain because they're trying to; they retain because that's who they are. The benefits are simply their normal state.
`,

  1000: `
DAY 1000 SIGNIFICANCE:
One thousand days. Nearly three years. The nutrients that would have created thousands of potential lives now illuminate their mind, strengthen their body, and power their spirit. They carry an army's worth of life force within them. This is rare territory - honor it.
`
};

// ============================================================
// POST-RELAPSE WISDOM - For users who have relapsed
// ============================================================

const POST_RELAPSE_WISDOM = `
POST-RELAPSE CONTEXT:
This user has relapsed and is starting again. They have history - this is not their first attempt.

Key guidance:
- The phoenix doesn't apologize for burning - it rises
- Their previous streak is not erased - it built neural pathways that still exist
- They're not starting from zero - they're starting from experience
- Every practitioner who achieved mastery had relapses on the journey
- The relapse itself contains data: What triggered it? What was the pattern?
- Self-flagellation serves no one - redirect that energy into renewed commitment
- They know the path now - they've walked it before - they know what awaits

Tone: Encouraging without being soft, forward-focused, acknowledging their history without dwelling on failure. Speak to the warrior returning to battle, not the defeated.
`;

// ============================================================
// BENEFIT TREND CONTEXT - Added when user has data
// ============================================================

const BENEFIT_TREND_CONTEXT = `
BENEFIT TRENDS:
If the user has benefit tracking data, incorporate it naturally:
- Rising metrics: Acknowledge the improvement, connect it to retention science
- Falling metrics: Normalize fluctuation, explain it as recalibration or external factors
- Stable high: Praise the consistency, this is the goal
- Specific metric insights:
  - Energy: "Your energy climbing is reabsorption in action"
  - Focus: "Mental clarity is your brain receiving proper nourishment"
  - Confidence: "Natural confidence emerges when you're not depleting yourself"
  - Aura/Magnetism: "Others sense your conserved life force"
  - Sleep: "Deep sleep is when retention's repair work happens"
  - Workout: "Physical performance reflects your full nutritional availability"
`;

// ============================================================
// HELPER: Get phase from streak day
// ============================================================

const getPhaseFromStreak = (streak) => {
  if (streak <= 14) return 'foundation';
  if (streak <= 45) return 'struggle';
  if (streak <= 90) return 'emergence';
  if (streak <= 180) return 'power';
  if (streak <= 365) return 'integration';
  return 'mastery';
};

// ============================================================
// HELPER: Get phase display name
// ============================================================

const getPhaseDisplayName = (phase) => {
  const names = {
    foundation: 'Foundation',
    struggle: 'Struggle',
    emergence: 'Emergence',
    power: 'Power',
    integration: 'Integration',
    mastery: 'Mastery'
  };
  return names[phase] || 'Foundation';
};

// ============================================================
// HELPER: Check if day is special
// ============================================================

const getSpecialDayWisdom = (streak) => {
  return SPECIAL_DAY_WISDOM[streak] || null;
};

// ============================================================
// HELPER: Format streak breakdown for long streaks
// ============================================================

const getStreakBreakdown = (streak) => {
  if (streak < 365) return null;
  
  const years = Math.floor(streak / 365);
  const remainingDays = streak % 365;
  const months = Math.floor(remainingDays / 30);
  const days = remainingDays % 30;
  
  let parts = [];
  if (years > 0) parts.push(`Year ${years}`);
  if (months > 0) parts.push(`Month ${months}`);
  if (days > 0) parts.push(`Day ${days}`);
  
  return parts.join(' · ');
};

module.exports = {
  CORE_WISDOM,
  PHASE_WISDOM,
  SPECIAL_DAY_WISDOM,
  POST_RELAPSE_WISDOM,
  BENEFIT_TREND_CONTEXT,
  getPhaseFromStreak,
  getPhaseDisplayName,
  getSpecialDayWisdom,
  getStreakBreakdown
};
