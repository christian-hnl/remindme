import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { jsonError, readJson, serverError, toNumber } from '@/lib/api';
import { isDayKey, parseDay, weekStartOf } from '@/lib/nutrition/dates';
import { isTrainingDay } from '@/lib/nutrition/settings';
import { mealTypesForSlot, type MealSlot, type MealType } from '@/lib/nutrition/types';
import { loadContext, loadWeek } from '@/lib/nutrition/server/week';
import { invalidateNutritionReminders } from '@/lib/nutrition/server/reminders';
import { resyncShoppingIfExported } from '@/lib/nutrition/server/shopping';

type Params = { params: { weekStart: string; id: string } };

/**
 * Swaps one meal of the plan: `{ recipeId, sauceId?, batch? }`. With `batch` every day that
 * had the same dish in this slot gets the new one too (one prep batch). `{ reset: true }`
 * brings back what the rotation week planned.
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    if (!isDayKey(params.weekStart)) return jsonError('Ungültige Woche');
    const body = await readJson(req);
    const user = await getCurrentUser();
    const ctx = await loadContext(user.id);
    const weekStart = weekStartOf(parseDay(params.weekStart));
    const { week, plan } = await loadWeek(ctx, weekStart);
    const entry = week.entries.find((e) => e.id === params.id);
    if (!entry) return jsonError('Mahlzeit nicht gefunden', 404);
    const targets = body.batch ? week.entries.filter((e) => e.slot === entry.slot && e.recipeId === entry.recipeId) : [entry];

    if (body.reset) {
      await db.mealWeekEntry.updateMany({ where: { id: { in: targets.map((t) => t.id) } }, data: { isSwapped: false, adaptedFrom: null } });
      const shopping = await resyncShoppingIfExported(ctx, weekStart);
      await invalidateNutritionReminders(user.id);
      return NextResponse.json({ success: true, count: targets.length, shopping });
    }

    const recipe = typeof body.recipeId === 'string' ? plan.recipes.get(body.recipeId) : undefined;
    if (!recipe) return jsonError('Rezept nicht gefunden', 404);
    const slot = entry.slot as MealSlot;
    const allowed: MealType[] = slot === 'afternoon' ? ['preworkout', 'snack'] : mealTypesForSlot(slot, isTrainingDay(ctx.settings, entry.day));
    if (!allowed.includes(recipe.mealType)) return jsonError('Dieses Rezept passt nicht zu dieser Mahlzeit');

    let sauceId: string | null = entry.sauceId;
    if (body.sauceId !== undefined) {
      const sauce = typeof body.sauceId === 'string' ? plan.recipes.get(body.sauceId) : null;
      if (body.sauceId !== null && sauce?.mealType !== 'sauce') return jsonError('Sauce nicht gefunden');
      sauceId = sauce?.id ?? null;
    }
    if (recipe.mealType !== 'main') sauceId = null;
    const servings = toNumber(body.servings);

    await db.mealWeekEntry.updateMany({
      where: { id: { in: targets.map((t) => t.id) } },
      data: { recipeId: recipe.id, sauceId, isSwapped: true, adaptedFrom: null, ...(servings && servings > 0 && servings <= 3 && { servings }) },
    });
    const shopping = await resyncShoppingIfExported(ctx, weekStart);
    await invalidateNutritionReminders(user.id);
    return NextResponse.json({ success: true, count: targets.length, shopping });
  } catch (error) {
    return serverError('PATCH /nutrition/weeks/[weekStart]/entries/[id]', error, 'Mahlzeit konnte nicht getauscht werden');
  }
}
