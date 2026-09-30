import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError } from '@/lib/api';
import { isDayKey, parseDay, weekStartOf } from '@/lib/nutrition/dates';
import { applyTemplate, loadContext, loadSettings, setSimpleWeek } from '@/lib/nutrition/server/week';
import { resyncShoppingIfExported } from '@/lib/nutrition/server/shopping';
import { invalidateNutritionReminders } from '@/lib/nutrition/server/reminders';

type Params = { params: { weekStart: string } };

/** Picks the rotation week: `{ templateId }`. Swaps of that week start over. */
export async function PUT(req: Request, { params }: Params) {
  try {
    if (!isDayKey(params.weekStart)) return jsonError('Ungültige Woche');
    const templateId = cleanString((await readJson(req)).templateId, 60);
    if (!templateId) return jsonError('Welche Rotationswoche?');
    const user = await getCurrentUser();
    const { settings } = await loadSettings(user.id);
    const weekStart = weekStartOf(parseDay(params.weekStart));
    await applyTemplate(user.id, weekStart, templateId, settings);
    const shopping = await resyncShoppingIfExported(await loadContext(user.id), weekStart);
    await invalidateNutritionReminders(user.id);
    return NextResponse.json({ success: true, shopping });
  } catch (error) {
    return serverError('PUT /nutrition/weeks/[weekStart]', error, 'Rotationswoche konnte nicht gewählt werden');
  }
}

/** Week mode: `{ simple }` – "Einfach" swaps every lunch and dinner for plain dishes. */
export async function PATCH(req: Request, { params }: Params) {
  try {
    if (!isDayKey(params.weekStart)) return jsonError('Ungültige Woche');
    const body = await readJson(req);
    if (typeof body.simple !== 'boolean') return jsonError('Welcher Modus?');
    const user = await getCurrentUser();
    const { settings } = await loadSettings(user.id);
    const weekStart = weekStartOf(parseDay(params.weekStart));
    await setSimpleWeek(user.id, weekStart, body.simple, settings);
    // The shopping list is for the whole week – if it's already in the Einkaufsliste, it follows.
    const shopping = await resyncShoppingIfExported(await loadContext(user.id), weekStart);
    await invalidateNutritionReminders(user.id);
    return NextResponse.json({ success: true, simple: body.simple, shopping });
  } catch (error) {
    return serverError('PATCH /nutrition/weeks/[weekStart]', error, 'Modus konnte nicht gewechselt werden');
  }
}
