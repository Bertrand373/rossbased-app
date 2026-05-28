// server/routes/oracleTranscribeRoutes.js
// Voice → text for the Oracle chat composer.
// POST /api/oracle/transcribe   multipart/form-data with field "audio"
//
// Why this exists:
//   - Lets users dictate Oracle prompts instead of typing.
//   - Transcript is RETURNED to the client; the user must still hit Send.
//     This route does NOT consume the Oracle message quota — only the
//     subsequent /api/oracle/chat-history call does, exactly as if the
//     user had typed.
//   - Per-user daily limit guards against runaway upload abuse since
//     Groq billing is by audio-second, not per call.
//
// Provider: Groq, model `whisper-large-v3-turbo`.
//   Pricing ~$0.04/hour audio → ~0.067¢/minute. The 60s client-side cap
//   keeps a worst-case day (60 transcriptions × 60s) at ~4¢ per user.

const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// ---------- upload config -----------------------------------------------
// 10 MB is a hard server-side ceiling. The client caps recordings at 60s
// and uses a low-bitrate codec, so real uploads land around 0.5–1.5 MB.
// 10 MB leaves headroom for outliers (very high sample-rate iOS input)
// without giving an attacker a meaningful payload to flood with.
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    // Accept anything starting with audio/. iOS Safari sends audio/mp4,
    // Chrome/Firefox send audio/webm. Don't be stricter than that — the
    // exact subtype varies and Whisper accepts them all.
    if (file.mimetype && file.mimetype.startsWith('audio/')) {
      return cb(null, true);
    }
    cb(new Error('UNSUPPORTED_MEDIA'));
  },
});

// ---------- rate limit --------------------------------------------------
// Per-user, per-day. 60/day is generous for the intended use case (a few
// voice prompts spread through the day) but firmly caps abuse / runaway
// scripts. Keyed by username so an attacker can't bypass by rotating IPs.
const transcribeLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24h
  max: 60,
  message: { error: 'Daily voice transcription limit reached. Try again tomorrow or type your message.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // authenticate middleware has already run at the app.use level, so
    // req.user.username is guaranteed. Fall back to IP just in case.
    return req.user?.username || req.ip;
  },
});

// ---------- route -------------------------------------------------------
router.post('/', transcribeLimiter, (req, res) => {
  // Manually invoke multer so we can convert its errors into clean JSON
  // responses instead of HTML stack traces.
  upload.single('audio')(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'Audio file too large. Keep recordings under 60 seconds.',
          code: 'AUDIO_TOO_LARGE',
        });
      }
      if (uploadErr.message === 'UNSUPPORTED_MEDIA') {
        return res.status(415).json({
          error: 'Unsupported audio format.',
          code: 'UNSUPPORTED_MEDIA',
        });
      }
      console.error('[transcribe] upload error:', uploadErr);
      return res.status(400).json({ error: 'Audio upload failed.' });
    }

    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ error: 'No audio data received.', code: 'NO_AUDIO' });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      // Misconfigured server — surface a stable code so the client can
      // hide the mic button instead of looping retries.
      console.warn('[transcribe] GROQ_API_KEY not set; refusing.');
      return res.status(503).json({
        error: 'Voice transcription is not configured.',
        code: 'TRANSCRIBE_DISABLED',
      });
    }

    try {
      const form = new FormData();
      // Filename matters: Groq/Whisper uses the extension as a format hint.
      // We pick from the incoming mimetype; default to .webm which is the
      // most common (Chrome/Firefox/Android).
      const ext = mimeToExt(req.file.mimetype);
      form.append('file', req.file.buffer, {
        filename: `oracle-voice.${ext}`,
        contentType: req.file.mimetype || 'audio/webm',
      });
      form.append('model', 'whisper-large-v3-turbo');
      form.append('response_format', 'json');
      // No language hint — Whisper auto-detects, and users may speak any
      // language. Forcing English would mangle non-English prompts.
      form.append('temperature', '0');

      // Network call. Set a hard timeout — Groq is normally sub-second,
      // anything past 20s is a hang and the user is staring at a spinner.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      let groqRes;
      try {
        groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            ...form.getHeaders(),
          },
          body: form,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!groqRes.ok) {
        const bodyText = await groqRes.text().catch(() => '');
        console.error('[transcribe] Groq returned', groqRes.status, bodyText.slice(0, 500));
        // Distinguish auth from transient — 401/403 means our key is bad
        // and retry won't help, everything else can be retried.
        if (groqRes.status === 401 || groqRes.status === 403) {
          return res.status(503).json({
            error: 'Voice transcription is not available right now.',
            code: 'TRANSCRIBE_UNAVAILABLE',
          });
        }
        return res.status(502).json({
          error: 'Transcription failed. Please try again.',
          code: 'TRANSCRIBE_FAILED',
        });
      }

      const data = await groqRes.json();
      const text = typeof data.text === 'string' ? data.text.trim() : '';

      // Empty / silence / noise → return 200 with empty text. Client shows
      // a quiet "didn't catch that" rather than treating it as an error.
      return res.json({ text });
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error('[transcribe] Groq timeout');
        return res.status(504).json({
          error: 'Transcription timed out. Please try again.',
          code: 'TRANSCRIBE_TIMEOUT',
        });
      }
      console.error('[transcribe] unexpected error:', err);
      return res.status(500).json({ error: 'Transcription failed.' });
    }
  });
});

// Map common MediaRecorder mimetypes → file extensions Whisper recognizes.
// We strip codec params ("audio/webm;codecs=opus" → "audio/webm").
function mimeToExt(mime) {
  if (!mime) return 'webm';
  const base = mime.split(';')[0].trim().toLowerCase();
  switch (base) {
    case 'audio/mp4':
    case 'audio/m4a':
    case 'audio/x-m4a':
      return 'm4a';
    case 'audio/mpeg':
    case 'audio/mp3':
      return 'mp3';
    case 'audio/wav':
    case 'audio/x-wav':
      return 'wav';
    case 'audio/ogg':
      return 'ogg';
    case 'audio/webm':
    default:
      return 'webm';
  }
}

module.exports = router;
