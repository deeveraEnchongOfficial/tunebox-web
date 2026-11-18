import { google, type drive_v3 } from 'googleapis';

import { requireEnv } from '@/lib/utils/env';

declare global {
  // eslint-disable-next-line no-var
  var __tuneboxDrive: drive_v3.Drive | undefined;
}

// Best-effort cache on globalThis — serverless instances may rebuild it,
// which is fine (OAuth client construction is cheap).
export function getDriveClient(): drive_v3.Drive {
  if (!globalThis.__tuneboxDrive) {
    const oauth2 = new google.auth.OAuth2(
      requireEnv('GOOGLE_DRIVE_CLIENT_ID'),
      requireEnv('GOOGLE_DRIVE_CLIENT_SECRET'),
    );
    oauth2.setCredentials({
      refresh_token: requireEnv('GOOGLE_DRIVE_REFRESH_TOKEN'),
    });
    globalThis.__tuneboxDrive = google.drive({ version: 'v3', auth: oauth2 });
  }
  return globalThis.__tuneboxDrive;
}
