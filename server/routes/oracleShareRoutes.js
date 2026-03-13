// server/routes/oracleShareRoutes.js
// POST /api/oracle/share — create a share link (authenticated)
// GET  /o/:id           — public immersive share page (no auth)

const express = require('express');
const apiRouter = express.Router();
const pageRouter = express.Router();
const OracleShare = require('../models/OracleShare');

const CLIENT_URL = process.env.CLIENT_URL || 'https://titantrack.app';

// ============================================================
// POST /api/oracle/share — Create a share link
// ============================================================
apiRouter.post('/', async (req, res) => {
  try {
    const { message, isTransmission } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const share = await OracleShare.create({
      message: message.trim(),
      username: req.user.username,
      isTransmission: !!isTransmission
    });

    const shareUrl = `${CLIENT_URL}/o/${share.shareId}`;
    res.json({ shareId: share.shareId, url: shareUrl });
  } catch (err) {
    console.error('Create share error:', err);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// ============================================================
// Helpers for the public share page
// ============================================================

// Escape HTML to prevent XSS
const escHtml = (str) => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// Convert markdown **bold** and *italic* to HTML, split paragraphs
const renderMessage = (text) => {
  const escaped = escHtml(text);
  const paras = escaped.split(/\n\n+/).filter(p => p.trim());
  return paras.map(p => {
    const html = p
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    return `<p>${html}</p>`;
  }).join('');
};

// Strip markdown for OG description
const stripMd = (text) => text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\n+/g, ' ').trim();

// ============================================================
// GET /o/:id — Public immersive share page
// ============================================================
pageRouter.get('/:id', async (req, res) => {
  try {
    const share = await OracleShare.findOne({ shareId: req.params.id }).lean();
    if (!share) {
      return res.redirect(CLIENT_URL);
    }

    const ogDesc = stripMd(share.message).slice(0, 155);
    const ogUrl = `${CLIENT_URL}/o/${share.shareId}`;
    const ogImage = `${CLIENT_URL}/The_Oracle.png`;
    const messageHtml = renderMessage(share.message);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Oracle · TitanTrack</title>

<!-- OG Meta — drives the iMessage / WhatsApp link preview -->
<meta property="og:type" content="article">
<meta property="og:title" content="Oracle">
<meta property="og:description" content="${escHtml(ogDesc)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:url" content="${ogUrl}">
<meta property="og:site_name" content="TitanTrack">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="Oracle · TitanTrack">
<meta name="twitter:description" content="${escHtml(ogDesc)}">
<meta name="twitter:image" content="${ogImage}">
<meta name="theme-color" content="#0a0a0c">

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

*{margin:0;padding:0;box-sizing:border-box}

html{
  background:#0a0a0c;
  color:rgba(255,255,255,0.85);
}

body{
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  min-height:100vh;
  min-height:100dvh;
  display:flex;
  flex-direction:column;
  align-items:center;
  background:#0a0a0c;
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
  padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}

/* ===== Glass card container ===== */
.card{
  width:100%;
  max-width:480px;
  min-height:100vh;
  min-height:100dvh;
  display:flex;
  flex-direction:column;
  position:relative;
  background:linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 40%);
}

/* Subtle side borders on larger screens */
@media(min-width:481px){
  .card{
    min-height:auto;
    margin:40px 0;
    border-radius:20px;
    border:1px solid rgba(255,255,255,0.06);
    box-shadow:0 40px 120px rgba(0,0,0,0.7);
    background:
      linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%),
      linear-gradient(168deg, #141416 0%, #0c0c0e 100%);
    overflow:hidden;
  }
}

/* ===== Header ===== */
.header{
  padding:36px 28px 0;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:24px;
  opacity:0;
  animation:fadeUp 800ms ease forwards;
}

.wordmark{
  height:20px;
  width:auto;
  object-fit:contain;
  opacity:0.7;
  filter:brightness(1.1);
}

.eye{
  width:48px;
  height:48px;
  object-fit:contain;
  opacity:0.35;
  animation:breathe 4s ease-in-out infinite;
}

@keyframes breathe{
  0%,100%{opacity:0.25;transform:scale(1)}
  50%{opacity:0.5;transform:scale(1.04)}
}

/* ===== Message ===== */
.message{
  flex:1;
  padding:32px 28px 40px;
  opacity:0;
  animation:fadeUp 800ms ease 200ms forwards;
}

.message-inner{
  padding-left:16px;
  border-left:1px solid rgba(255,255,255,0.08);
}

.message-inner p{
  font-size:0.9375rem;
  font-weight:300;
  line-height:1.9;
  letter-spacing:0.015em;
  color:rgba(255,255,255,0.82);
  margin:0 0 22px;
}

.message-inner p:last-child{
  margin-bottom:0;
}

.message-inner strong{
  font-weight:500;
  color:rgba(255,255,255,0.95);
}

.message-inner em{
  font-style:italic;
  color:rgba(255,255,255,0.6);
}

/* ===== Footer / CTA ===== */
.footer{
  padding:0 28px 36px;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:20px;
  opacity:0;
  animation:fadeUp 800ms ease 400ms forwards;
}

.sep{
  width:100%;
  height:1px;
  background:rgba(255,255,255,0.04);
}

.cta{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:12px 28px;
  border-radius:9999px;
  border:1px solid rgba(255,255,255,0.1);
  background:rgba(255,255,255,0.04);
  color:rgba(255,255,255,0.7);
  font-family:inherit;
  font-size:0.8125rem;
  font-weight:500;
  letter-spacing:0.03em;
  text-decoration:none;
  transition:border-color 200ms, background 200ms, color 200ms;
  -webkit-tap-highlight-color:transparent;
}

.cta:hover,.cta:active{
  border-color:rgba(255,255,255,0.2);
  background:rgba(255,255,255,0.07);
  color:rgba(255,255,255,0.9);
}

.cta svg{
  opacity:0.5;
}

.attr{
  font-size:0.6875rem;
  color:rgba(255,255,255,0.12);
  letter-spacing:0.04em;
}

/* ===== Animations ===== */
@keyframes fadeUp{
  from{opacity:0;transform:translateY(12px)}
  to{opacity:1;transform:translateY(0)}
}

@media(prefers-reduced-motion:reduce){
  .header,.message,.footer{animation:none;opacity:1}
  .eye{animation:none;opacity:0.35}
}
</style>
</head>
<body>

<div class="card">
  <div class="header">
    <img src="${CLIENT_URL}/oracle-wordmark.png" alt="Oracle" class="wordmark">
    <img src="${CLIENT_URL}/The_Oracle.png" alt="" class="eye">
  </div>

  <div class="message">
    <div class="message-inner">
      ${messageHtml}
    </div>
  </div>

  <div class="footer">
    <div class="sep"></div>
    <a href="${CLIENT_URL}" class="cta">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
      </svg>
      Experience Oracle
    </a>
    <span class="attr">titantrack.app</span>
  </div>
</div>

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(html);
  } catch (err) {
    console.error('Share page error:', err);
    res.redirect(CLIENT_URL);
  }
});

module.exports = { apiRouter, pageRouter };
