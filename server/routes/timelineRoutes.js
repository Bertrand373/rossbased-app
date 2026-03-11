// server/routes/timelineRoutes.js
// Email capture endpoint for /timeline free SEO tool
// Adds subscriber to Kit with tags, sends personalized timeline via Resend

const express = require('express');
const router = express.Router();
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================
// PHASE DATA — Same as Timeline.js frontend
// ============================================================
const PHASES = [
  {
    key: 'initial',
    name: 'Initial Adaptation',
    range: [1, 14],
    summary: 'Your body begins recalibrating. Energy fluctuates as your nervous system adjusts to the absence of regular dopamine spikes from ejaculation.',
    expect: [
      'Strong urges, especially in the first 72 hours',
      'Sleep disruption or unusually vivid dreams',
      'Bursts of energy followed by fatigue',
      'Heightened irritability as dopamine receptors reset'
    ],
    risk: 'This is where over 60% of attempts end. The neurochemical withdrawal is real — not a willpower failure.',
    insight: 'Men who pair retention with physical exercise during this phase report significantly smoother transitions.'
  },
  {
    key: 'emotional',
    name: 'Emotional Processing',
    range: [15, 45],
    summary: 'Suppressed emotions surface. This phase feels like regression but is actually deep healing — your body is processing what it previously numbed with release.',
    expect: [
      'Mood swings that feel disproportionate to circumstances',
      'Old memories or emotions surfacing unexpectedly',
      'Periods of anxiety alternating with profound calm',
      'Social sensitivity — both positive and negative'
    ],
    risk: 'The most psychologically challenging phase. Many mistake emotional purging for the practice "not working" and quit.',
    insight: 'Practitioners who journal through this phase report the highest long-term success rates. The emotions need somewhere to go.'
  },
  {
    key: 'mental',
    name: 'Mental Expansion',
    range: [46, 90],
    summary: 'Cognitive clarity sharpens dramatically. Focus deepens, creative output increases, and confidence becomes internally sourced rather than externally validated.',
    expect: [
      'Sustained focus for longer periods',
      'Increased creative ideation and problem-solving',
      'Confidence that feels natural rather than forced',
      'Deeper vocal resonance and physical presence'
    ],
    risk: 'Complacency becomes the threat. The benefits feel normal, which can lead to testing boundaries.',
    insight: 'This is where most practitioners report others noticing changes before they do — social magnetism, eye contact, presence.'
  },
  {
    key: 'integration',
    name: 'Deep Integration',
    range: [91, 180],
    summary: 'Retention stops feeling like discipline and starts feeling like identity. The energy channels into sustained creative and professional output.',
    expect: [
      'Stable, elevated baseline energy',
      'Business or creative breakthroughs',
      'Deeper spiritual awareness or intuition',
      'Reduced urge frequency but occasional intense spikes'
    ],
    risk: 'Overconfidence. The practice feels automatic, which lowers vigilance around triggers.',
    insight: 'Men in this phase who track their patterns consistently are the ones who make it past a year.'
  },
  {
    key: 'mastery',
    name: 'Mastery',
    range: [181, 9999],
    summary: 'The practice becomes second nature. Energy management is intuitive. The focus shifts from "not releasing" to actively channeling accumulated life force.',
    expect: [
      'Deep intuitive decision-making',
      'Magnetic social presence without effort',
      'Sustained high performance across all domains',
      'Occasional intense urge cycles (lunar, seasonal) that pass quickly'
    ],
    risk: 'Isolation. The gap between your awareness and those around you can create distance if not managed consciously.',
    insight: 'Long-term practitioners who stay connected to a community maintain their practice far longer than those who go solo.'
  }
];

// ============================================================
// HELPER: Get phase for a given day
// ============================================================
function getPhaseForDay(day) {
  for (const phase of PHASES) {
    if (day >= phase.range[0] && day <= phase.range[1]) return phase;
  }
  return PHASES[PHASES.length - 1];
}

// ============================================================
// HELPER: Get next phase
// ============================================================
function getNextPhase(day) {
  const currentIndex = PHASES.findIndex(p => day >= p.range[0] && day <= p.range[1]);
  if (currentIndex < PHASES.length - 1) return PHASES[currentIndex + 1];
  return null;
}

// ============================================================
// HELPER: Build personalized timeline email HTML
// ============================================================
function buildTimelineEmail(streakDay, ageRange, exercise, priority) {
  const day = parseInt(streakDay) || 1;
  const phase = getPhaseForDay(day);
  const nextPhase = getNextPhase(day);
  const daysRemaining = phase.range[1] - day;

  const expectHtml = phase.expect.map(e =>
    `<tr><td style="padding: 6px 0; color: #888888; font-size: 0.875rem; line-height: 1.5;">— ${e}</td></tr>`
  ).join('');

  const nextPhaseBlock = nextPhase ? `
    <p style="font-size: 0.875rem; color: #777777; line-height: 1.6; margin: 24px 0 0 0;">
      <strong style="color: #aaaaaa;">Next up:</strong> ${nextPhase.name} (Day ${nextPhase.range[0]}–${nextPhase.range[1]}). ${daysRemaining > 0 ? `You're ${daysRemaining} days away.` : 'You\'re on the edge of transition.'}
    </p>
  ` : '';

  const exerciseNote = exercise === 'heavy' ?
    'Your heavy exercise routine will accelerate physical benefits and help channel excess energy during urge spikes.' :
    exercise === 'moderate' ?
    'Your moderate exercise level is solid for this phase. Consider adding morning movement if you haven\'t already.' :
    'Low physical activity can make urges harder to manage. Even 20 minutes of walking daily makes a measurable difference.';

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
    <body style="margin: 0; padding: 0; background-color: #000000;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#000000" style="background-color: #000000;">
    <tr><td align="center" style="padding: 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width: 520px; width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff;" bgcolor="#000000">

      <!-- TitanTrack header -->
      <tr><td style="padding: 32px 24px 24px 24px; border-bottom: 1px solid #1a1a1a;" bgcolor="#000000">
        <img src="https://titantrack.app/tt-icon-white.png" alt="TitanTrack" width="28" height="28" style="display: block; margin-bottom: 20px;" />
        <h2 style="font-size: 1.25rem; font-weight: 500; margin: 0 0 4px 0; color: #ffffff;">Your Retention Timeline</h2>
        <p style="font-size: 0.8125rem; color: #666666; margin: 0;">Day ${day} · ${ageRange || 'Age not specified'} · ${exercise || 'Exercise not specified'}</p>
      </td></tr>

      <!-- Timeline content -->
      <tr><td style="padding: 28px 24px;" bgcolor="#000000">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #222222; border-radius: 12px; margin-bottom: 24px;">
          <tr><td style="padding: 20px;" bgcolor="#000000">
            <p style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #555555; margin: 0 0 8px 0;">Current Phase</p>
            <h3 style="font-size: 1.125rem; font-weight: 500; color: #ffffff; margin: 0 0 12px 0;">${phase.name}</h3>
            <p style="font-size: 0.875rem; color: #888888; line-height: 1.6; margin: 0;">${phase.summary}</p>
          </td></tr>
        </table>

        <p style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #555555; margin: 0 0 12px 0;">What to expect right now</p>
        <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px;"><tbody>${expectHtml}</tbody></table>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
          <tr><td style="padding: 16px 20px; border-radius: 10px;" bgcolor="#0a0a0a">
            <p style="font-size: 0.8125rem; color: #999999; line-height: 1.6; margin: 0;">
              <strong style="color: #cccccc;">Risk:</strong> ${phase.risk}
            </p>
          </td></tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
          <tr><td style="padding: 16px 20px; border-radius: 10px;" bgcolor="#0a0a0a">
            <p style="font-size: 0.8125rem; color: #999999; line-height: 1.6; margin: 0;">
              <strong style="color: #cccccc;">Insight:</strong> ${phase.insight}
            </p>
          </td></tr>
        </table>

        <p style="font-size: 0.8125rem; color: #888888; line-height: 1.6; margin: 0 0 4px 0;">
          <strong style="color: #aaaaaa;">Your exercise level:</strong> ${exerciseNote}
        </p>

        ${nextPhaseBlock}
      </td></tr>

      <!-- CTA footer -->
      <tr><td style="padding: 28px 24px 36px 24px; border-top: 1px solid #1a1a1a;" bgcolor="#000000">
        <p style="font-size: 0.875rem; color: #888888; line-height: 1.6; margin: 0 0 20px 0;">
          This timeline is based on patterns from the TitanTrack practitioner community. Track how your reality compares to these projections in real time.
        </p>
        <a href="https://titantrack.app" style="display: inline-block; padding: 12px 24px; background-color: #ffffff; color: #000000; font-size: 0.875rem; font-weight: 600; text-decoration: none; border-radius: 10px;">
          Start Tracking Free
        </a>
        <p style="font-size: 0.6875rem; color: #444444; margin: 12px 0 0 0;">7-day free trial. $8/month after.</p>
      </td></tr>

    </table>
    </td></tr>
    </table>
    </body>
    </html>
  `;
}

/**
 * POST /api/timeline/subscribe
 * 
 * Captures email from the free timeline tool and adds to Kit.
 * Sends personalized timeline email via Resend.
 * Tags subscriber with their inputs for segmented sequences.
 * 
 * Body: { email, streakDay, ageRange, exercise, priority }
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { email, streakDay, ageRange, exercise, priority } = req.body;

    // Validate email
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const KIT_API_KEY = process.env.KIT_API_KEY;

    if (!KIT_API_KEY) {
      console.error('KIT_API_KEY env var not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const emailLower = email.toLowerCase().trim();

    // Build tag names from user inputs for segmented sequences
    const tagNames = ['timeline-tool'];
    if (ageRange) tagNames.push(`age-${ageRange}`);
    if (exercise) tagNames.push(`exercise-${exercise}`);
    if (priority) tagNames.push(`priority-${priority}`);
    if (streakDay) {
      const day = parseInt(streakDay);
      if (day <= 7) tagNames.push('phase-initial');
      else if (day <= 45) tagNames.push('phase-emotional');
      else if (day <= 90) tagNames.push('phase-mental');
      else if (day <= 180) tagNames.push('phase-integration');
      else tagNames.push('phase-mastery');
    }

    // Send personalized timeline email via Resend
    try {
      await resend.emails.send({
        from: 'TitanTrack <noreply@titantrack.app>',
        to: emailLower,
        subject: `Your retention timeline — Day ${streakDay || 1}`,
        html: buildTimelineEmail(streakDay, ageRange, exercise, priority)
      });
      console.log(`📧 Timeline email sent to ${emailLower}`);
    } catch (emailErr) {
      console.error('Timeline email send error:', emailErr);
      // Non-blocking — still add to Kit even if email fails
    }

    // Fetch all Kit tags to map names to IDs
    const tagsRes = await fetch('https://api.kit.com/v4/tags', {
      headers: { 'X-Kit-Api-Key': KIT_API_KEY }
    });
    const tagsData = await tagsRes.json();
    const existingTags = tagsData.tags || [];

    // Create any tags that don't exist yet, collect IDs
    const tagIds = [];
    for (const name of tagNames) {
      const existing = existingTags.find(t => t.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        tagIds.push(String(existing.id));
      } else {
        const createRes = await fetch('https://api.kit.com/v4/tags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Kit-Api-Key': KIT_API_KEY
          },
          body: JSON.stringify({ name })
        });
        if (createRes.ok) {
          const created = await createRes.json();
          if (created.tag) tagIds.push(String(created.tag.id));
        }
      }
    }

    // Step 1: Create subscriber in Kit (no tags yet)
    const subResponse = await fetch('https://api.kit.com/v4/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kit-Api-Key': KIT_API_KEY
      },
      body: JSON.stringify({
        email_address: emailLower
      })
    });

    if (!subResponse.ok) {
      const errData = await subResponse.text();
      console.error('Kit subscriber create error:', subResponse.status, errData);
      return res.status(500).json({ error: 'Failed to subscribe' });
    }

    // Step 2: Tag subscriber separately (ensures automations fire)
    for (const tagId of tagIds) {
      try {
        await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Kit-Api-Key': KIT_API_KEY
          },
          body: JSON.stringify({
            email_address: emailLower
          })
        });
      } catch (tagErr) {
        console.error(`Kit tag ${tagId} error:`, tagErr.message);
      }
    }

    console.log(`📧 Timeline: subscriber captured — ${emailLower} [${tagNames.join(', ')}]`);
    res.json({ success: true });

  } catch (error) {
    console.error('Timeline subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

module.exports = router;
