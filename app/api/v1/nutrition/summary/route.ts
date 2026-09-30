import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { serverError } from '@/lib/api';
import { isDayKey, parseDay, weekStartOf } from '@/lib/nutrition/dates';
import { buildSummary } from '@/lib/nutrition/server/summary';
import { ensureNutritionReminders } from '@/lib/nutrition/server/reminders';

export const dynamic = 'force-dynamic';

/** Everything the Ernährung mode shows for one week: plan, prep, shopping list, recipes. */
export async function GET(req: Request) {
  try {
    const raw = new URL(req.url).searchParams.get('week');
    const weekStart = weekStartOf(isDayKey(raw) ? parseDay(raw) : new Date());
    const user = await getCurrentUser();
    const summary = await buildSummary(user.id, weekStart);
    await ensureNutritionReminders(user.id);
    return NextResponse.json(summary);
  } catch (error) {
    return serverError('GET /nutrition/summary', error, 'Ernährungsplan konnte nicht geladen werden');
  }
}
