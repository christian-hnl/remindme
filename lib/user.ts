import { db } from '@/lib/db';

export const DEFAULT_USER_EMAIL = 'alexander@example.com';

/**
 * LifeTracker is a single-user dashboard: every request operates on this one user.
 * Upsert keeps the first request after a fresh database from failing.
 */
export async function getCurrentUser() {
  return db.user.upsert({
    where: { email: DEFAULT_USER_EMAIL },
    update: {},
    create: { email: DEFAULT_USER_EMAIL, displayName: '' },
  });
}

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

export function readPreferences(user: CurrentUser): Record<string, unknown> {
  try {
    const parsed = JSON.parse(user.preferences || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}
