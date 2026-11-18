// One-time Google Drive OAuth bootstrap.
// Prints a refresh token to paste into GOOGLE_DRIVE_REFRESH_TOKEN.
//
// Prereqs in Google Cloud Console (same project as your YouTube API key):
//   1. Enable the Google Drive API
//   2. Create an OAuth client (Desktop app) → copy ID + secret into .env
//
// Run: pnpm drive:auth
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';

// Load .env manually (dotenv isn't a dep).
for (const line of readFileSync(path.resolve('.env'), 'utf8').split('\n')) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET } = process.env;
if (!GOOGLE_DRIVE_CLIENT_ID || !GOOGLE_DRIVE_CLIENT_SECRET) {
  console.error('Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in .env first.');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3333/oauth2callback';
const oauth2 = new google.auth.OAuth2(
  GOOGLE_DRIVE_CLIENT_ID,
  GOOGLE_DRIVE_CLIENT_SECRET,
  REDIRECT_URI,
);

const url = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log('\nOpen this URL in your browser and approve access:\n');
console.log(url);
console.log('\nWaiting for the redirect on http://localhost:3333 ...\n');

const server = createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url ?? '/', 'http://localhost:3333');
    if (reqUrl.pathname !== '/oauth2callback') {
      res.writeHead(404).end('not found');
      return;
    }
    const code = reqUrl.searchParams.get('code');
    if (!code) {
      res.writeHead(400).end('missing code');
      return;
    }
    const { tokens } = await oauth2.getToken(code);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Done — check your terminal for the refresh token. You can close this tab.\n');
    console.log('─'.repeat(60));
    console.log('Add this to .env and your Vercel env vars:\n');
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN="${tokens.refresh_token ?? ''}"`);
    console.log('─'.repeat(60));
    if (!tokens.refresh_token) {
      console.log('\nNo refresh token returned — revoke app access in your Google');
      console.log('account settings and run this again (consent must re-appear).');
    }
    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500).end('token exchange failed');
    console.error(err);
    process.exit(1);
  }
});

server.listen(3333);
