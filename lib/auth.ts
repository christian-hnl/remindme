import { createHash } from 'crypto';

/**
 * Calendar apps can't send Basic Auth reliably, so the iCal feed is protected by a
 * token derived from APP_PASSWORD instead. Without APP_PASSWORD the app runs open
 * (local development) and no token is required.
 */
export function getIcalToken(): string | null {
  const password = process.env['APP_' + 'PASSWORD'];
  if (!password) return null;
  return createHash('sha256').update(`lifetracker-ical:${password}`).digest('hex').slice(0, 32);
}
