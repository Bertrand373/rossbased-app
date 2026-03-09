// server/routes/timelineRoutes.js
// Email capture endpoint for /timeline free SEO tool
// Adds subscriber to Kit with tags for segmented nurture sequences

const express = require('express');
const router = express.Router();

/**
 * POST /api/timeline/subscribe
 * 
 * Captures email from the free timeline tool and adds to Kit.
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

    const KIT_API_KEY = process.env.KIT_API_KEY;

    if (!KIT_API_KEY) {
      console.error('KIT_API_KEY env var not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

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
        // Create the tag in Kit
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

    // Add subscriber to Kit with tags
    const response = await fetch('https://api.kit.com/v4/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kit-Api-Key': KIT_API_KEY
      },
      body: JSON.stringify({
        email_address: email.toLowerCase().trim(),
        tags: tagIds
      })
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error('Kit API error:', response.status, errData);
      return res.status(500).json({ error: 'Failed to subscribe' });
    }

    console.log(`📧 Timeline: subscriber captured — ${email} [${tagNames.join(', ')}]`);
    res.json({ success: true });

  } catch (error) {
    console.error('Timeline subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

module.exports = router;
