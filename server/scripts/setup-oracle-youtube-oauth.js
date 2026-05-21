#!/usr/bin/env node
// server/scripts/setup-oracle-youtube-oauth.js
//
// One-time script to capture a refresh token for the Oracle YouTube account.
// Run this on your local machine while logged into the Oracle Google account
// in your browser. The refresh token printed at the end goes into the
// ORACLE_YT_REFRESH_TOKEN env var on Render.
//
// Prereqs:
//   1. Oracle YouTube channel exists (created via Chrome MCP, separate Google account)
//   2. OAuth client created in Google Cloud Console with redirect URI:
//      http://localhost:8765/oauth/callback
//   3. YouTube Data API v3 enabled in that GCP project
//   4. Env vars set: ORACLE_YT_CLIENT_ID, ORACLE_YT_CLIENT_SECRET
//
// Usage:
//   node server/scripts/setup-oracle-youtube-oauth.js

require('dotenv').config();
const http = require('http');
const { URL } = require('url');

const CLIENT_ID = process.env.ORACLE_YT_CLIENT_ID;
const CLIENT_SECRET = process.env.ORACLE_YT_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:8765/oauth/callback';
const SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing env vars. Set ORACLE_YT_CLIENT_ID and ORACLE_YT_CLIENT_SECRET first.');
  console.error('You can put them in a local .env file at the project root.');
  process.exit(1);
}

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: 'code',
  scope: SCOPE,
  access_type: 'offline',         // needed to get refresh_token
  prompt: 'consent',              // forces refresh_token issuance every time
  include_granted_scopes: 'true'
}).toString();

console.log('\n===== Oracle YouTube OAuth Setup =====\n');
console.log('1. Make sure you are signed in to the Oracle Google account in your browser.');
console.log('2. Open this URL in that browser:\n');
console.log(authUrl);
console.log('\n3. Approve access. Browser will redirect to localhost — keep this script running.\n');

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:8765`);
  if (reqUrl.pathname !== '/oauth/callback') {
    res.writeHead(404).end('Not found');
    return;
  }

  const code = reqUrl.searchParams.get('code');
  if (!code) {
    res.writeHead(400).end('No code in callback');
    return;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI
      })
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok || !data.refresh_token) {
      res.writeHead(500).end(`Token exchange failed: ${JSON.stringify(data, null, 2)}`);
      console.error('\nToken exchange failed:', data);
      console.error('\nIf no refresh_token: revoke this app in https://myaccount.google.com/permissions and run again.');
      process.exit(1);
    }

    res.writeHead(200, { 'Content-Type': 'text/html' }).end(
      `<html><body style="font-family:sans-serif;padding:40px;background:#000;color:#d4af37">
       <h1>Oracle YouTube linked</h1>
       <p>Check your terminal for the refresh token. You can close this tab.</p>
       </body></html>`
    );

    console.log('\n===== SUCCESS =====\n');
    console.log('Set this on Render:\n');
    console.log(`ORACLE_YT_REFRESH_TOKEN=${data.refresh_token}\n`);
    console.log('Access token (for verification, expires in 1h):');
    console.log(data.access_token.substring(0, 40) + '...\n');

    server.close(() => process.exit(0));
  } catch (err) {
    res.writeHead(500).end(`Error: ${err.message}`);
    console.error('\nError during token exchange:', err);
    process.exit(1);
  }
});

server.listen(8765, () => {
  console.log('Listening on http://localhost:8765 for OAuth callback...\n');
});
