import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { readJson, serverError } from '@/lib/api';
import { settingsUpdate } from '@/lib/nutrition/settings';
import { loadContext, loadSettings } from '@/lib/nutrition/server/week';
import { syncNutritionReminders } from '@/lib/nutrition/server/reminders';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json((await loadSettings(user.id)).settings);
  } catch (error) {
    return serverError('GET /nutrition/settings', error);
  }
}

/** Saves the Ernährung settings. The plan adapts on its next load, reminders right away. */
export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    await loadSettings(user.id);
    const data = settingsUpdate(await readJson(req));
    await db.nutritionSettings.update({ where: { userId: user.id }, data });
    const ctx = await loadContext(user.id);
    await syncNutritionReminders(ctx);
    return NextResponse.json(ctx.settings);
  } catch (error) {
    return serverError('PATCH /nutrition/settings', error, 'Einstellungen konnten nicht gespeichert werden');
  }
}
