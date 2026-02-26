// server/routes/timelineRoutes.js
// Email capture endpoint for /timeline free SEO tool
// Adds subscriber to Mailchimp with tags for segmented nurture sequences

const express = require('express');
const router = express.Router();

/**
 * POST /api/timeline/subscribe
 * 
 * Captures email from the free timeline tool and adds to Mailchimp.
 * Tags subscriber with their inputs for personalized email sequences.
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

    const API_KEY = process.env.MAILCHIMP_API_KEY;
    const LIST_ID = process.env.MAILCHIMP_LIST_ID;
    const SERVER = process.env.MAILCHIMP_SERVER_PREFIX;

    if (!API_KEY || !LIST_ID || !SERVER) {
      console.error('Mailchimp env vars not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Build tags from user inputs for segmented sequences
    const tags = ['timeline-tool'];
    if (ageRange) tags.push(`age-${ageRange}`);
    if (exercise) tags.push(`exercise-${exercise}`);
    if (priority) tags.push(`priority-${priority}`);
    if (streakDay) {
      const day = parseInt(streakDay);
      if (day <= 7) tags.push('phase-initial');
      else if (day <= 45) tags.push('phase-emotional');
      else if (day <= 90) tags.push('phase-mental');
      else if (day <= 180) tags.push('phase-integration');
      else tags.push('phase-mastery');
    }

    // Add subscriber to Mailchimp
    const url = `https://${SERVER}.api.mailchimp.com/3.0/lists/${LIST_ID}/members`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `apikey ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email_address: email.toLowerCase().trim(),
        status: 'subscribed',
        tags: tags,
        merge_fields: {
          STREAK: String(streakDay || '0'),
          AGE: ageRange || '',
          PRIORITY: priority || ''
        }
      })
    });

    const data = await response.json();

    // Handle already subscribed (not an error — just update tags)
    if (response.status === 400 && data.title === 'Member Exists') {
      // Update tags for existing subscriber
      const subscriberHash = require('crypto')
        .createHash('md5')
        .update(email.toLowerCase().trim())
        .digest('hex');

      const tagUrl = `https://${SERVER}.api.mailchimp.com/3.0/lists/${LIST_ID}/members/${subscriberHash}/tags`;

      await fetch(tagUrl, {
        method: 'POST',
        headers: {
          'Authorization': `apikey ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tags: tags.map(tag => ({ name: tag, status: 'active' }))
        })
      });

      console.log(`📧 Timeline: existing subscriber updated tags — ${email}`);
      return res.json({ success: true, existing: true });
    }

    if (!response.ok) {
      console.error('Mailchimp error:', data);
      return res.status(500).json({ error: 'Failed to subscribe' });
    }

    console.log(`📧 Timeline: new subscriber captured — ${email} [${tags.join(', ')}]`);
    res.json({ success: true, existing: false });

  } catch (error) {
    console.error('Timeline subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

module.exports = router;
