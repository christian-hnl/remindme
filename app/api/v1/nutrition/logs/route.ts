import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { cleanString, jsonError, pickEnum, readJson, serverError, toNumber } from '@/lib/api';
import { isDayKey } from '@/lib/nutrition/dates';
import { MEAL_SLOTS } from '@/lib/nutrition/types';
import { LogError, logMeal } from '@/lib/nutrition/server/logs';
import { loadContext } from '@/lib/nutrition/server/week';
import { invalidateNutritionReminders } from '@/lib/nutrition/server/reminders';

const SLOTS = [...MEAL_SLOTS, 'extra'] as const;
const STATUSES = ['eaten', 'swapped', 'skipped'] as const;

/**
 * Ticks off a meal: `{ day, slot, status }`, optionally with `recipeId` (ate another dish) or
 * `label` + macros (something off-plan). `slot: "extra"` adds a snack on top.
 */
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const day = body.day;
    const slot = pickEnum(body.slot, SLOTS);
    const status = pickEnum(body.status, STATUSES) ?? 'eaten';
    if (!isDayKey(day)) return jsonError('Ungültiger Tag');
    if (!slot) return jsonError('Welche Mahlzeit?');

    const user = await getCurrentUser();
    const ctx = await loadContext(user.id);
    const result = await logMeal(ctx, {
      day,
      slot,
      status,
      recipeId: typeof body.recipeId === 'string' ? body.recipeId : null,
      label: cleanString(body.label, 80) ?? null,
      kcal: toNumber(body.kcal),
      protein: toNumber(body.protein),
      carbs: toNumber(body.carbs),
      fat: toNumber(body.fat),
      cost: toNumber(body.cost),
    });
    await invalidateNutritionReminders(user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof LogError) return jsonError(error.message);
    return serverError('POST /nutrition/logs', error, 'Mahlzeit konnte nicht abgehakt werden');
  }
}
