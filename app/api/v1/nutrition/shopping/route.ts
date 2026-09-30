import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { jsonError, readJson, serverError } from '@/lib/api';
import { isDayKey, parseDay, weekStartOf } from '@/lib/nutrition/dates';
import { exportWeekShopping } from '@/lib/nutrition/server/shopping';
import { loadContext } from '@/lib/nutrition/server/week';

/**
 * Puts the week's shopping list into the regular Einkaufsliste – `{ weekStart, includePantry?, slugs? }`.
 * A second export updates quantities and drops what the plan no longer needs.
 */
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    if (!isDayKey(body.weekStart)) return jsonError('Ungültige Woche');
    const user = await getCurrentUser();
    const ctx = await loadContext(user.id);
    const slugs = Array.isArray(body.slugs) ? body.slugs.filter((s: unknown): s is string => typeof s === 'string') : null;
    const result = await exportWeekShopping(ctx, weekStartOf(parseDay(body.weekStart)), { includePantry: !!body.includePantry, slugs });
    if (!result) return jsonError('Nichts zum Übernehmen');
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return serverError('POST /nutrition/shopping', error, 'Einkaufsliste konnte nicht übernommen werden');
  }
}
