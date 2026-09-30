import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, readJson, serverError } from '@/lib/api';
import { isDayKey, parseDay, weekStartOf } from '@/lib/nutrition/dates';
import { buildWeekView, getOrCreateWeek, loadContext, parseIds } from '@/lib/nutrition/server/week';
import { setHabitDay } from '@/lib/nutrition/server/habits';
import { invalidateNutritionReminders } from '@/lib/nutrition/server/reminders';

type Params = { params: { weekStart: string } };

/** Ticks a prep step: `{ stepId, done }`. A finished session counts for "Meal Prep erledigt". */
export async function PATCH(req: Request, { params }: Params) {
  try {
    if (!isDayKey(params.weekStart)) return jsonError('Ungültige Woche');
    const body = await readJson(req);
    const stepId = cleanString(body.stepId, 80);
    if (!stepId) return jsonError('Welcher Schritt?');
    const user = await getCurrentUser();
    const ctx = await loadContext(user.id);
    const weekStart = weekStartOf(parseDay(params.weekStart));
    const week = await getOrCreateWeek(user.id, weekStart, ctx.settings);
    const wasDone = new Map((await buildWeekView(ctx, weekStart)).prep.sessions.map((s) => [s.id, s.done]));

    const checks = new Set(parseIds(week.prepChecks));
    if (body.done) checks.add(stepId);
    else checks.delete(stepId);
    await db.mealWeek.update({ where: { id: week.id }, data: { prepChecks: JSON.stringify([...checks]) } });

    const view = await buildWeekView(ctx, weekStart);
    let finished: string | null = null;
    for (const session of view.prep.sessions) {
      await setHabitDay(user.id, 'prep', session.date, session.done);
      if (session.done && !wasDone.get(session.id)) finished = session.label;
    }
    await invalidateNutritionReminders(user.id);
    return NextResponse.json({ sessions: view.prep.sessions.map((s) => ({ id: s.id, done: s.done })), finished });
  } catch (error) {
    return serverError('PATCH /nutrition/weeks/[weekStart]/prep', error, 'Schritt konnte nicht gespeichert werden');
  }
}
