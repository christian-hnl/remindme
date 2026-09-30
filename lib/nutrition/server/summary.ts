import { db } from '@/lib/db';
import { isoWeekday, weekStartOf } from '../dates';
import { produceGrams, recipeNutrition } from '../macros';
import { dislikeHits } from '../plan';
import { trainingHint } from '../timing';
import type { NutritionSummary, NutritionToday, RecipeView } from '../views';
import { loadIngredients } from './catalog';
import { buildWeekView, listTemplates, loadContext, type NutritionContext, nutritionEnabled } from './week';

export async function recipeViews(ctx: NutritionContext): Promise<RecipeView[]> {
  const plan = ctx.plan(weekStartOf(new Date()));
  const counts = await db.mealLog.groupBy({
    by: ['recipeId'],
    where: { userId: ctx.userId, status: { in: ['eaten', 'swapped'] }, recipeId: { not: null } },
    _count: true,
  });
  const eaten = new Map(counts.map((c) => [c.recipeId, c._count]));
  return ctx.recipes.map((r) => {
    const n = recipeNutrition(r, plan.lookup, plan.factor);
    const disliked = dislikeHits(r, ctx.settings.dislikes, plan.lookup);
    const missing = r.equipment.filter((e) => !ctx.settings.equipment.includes(e));
    return {
      ...r,
      nutrition: {
        kcal: Math.round(n.kcal),
        protein: Math.round(n.protein * 10) / 10,
        carbs: Math.round(n.carbs * 10) / 10,
        fat: Math.round(n.fat * 10) / 10,
        cost: Math.round(n.cost * 100) / 100,
      },
      produce: Math.round(produceGrams(r)),
      issues: [...(disliked.length ? [`enthält ${disliked.join(', ')}`] : []), ...(missing.length ? [`braucht ${missing.join(', ')}`] : [])],
      eatenCount: eaten.get(r.id) ?? 0,
    };
  });
}

export async function buildSummary(userId: string, weekStart: string): Promise<NutritionSummary> {
  const ctx = await loadContext(userId);
  const [week, templates, recipes, ingredients] = await Promise.all([
    buildWeekView(ctx, weekStart),
    listTemplates(),
    recipeViews(ctx),
    loadIngredients(),
  ]);
  return { settings: ctx.settings, today: week.days.find((d) => d.isToday)?.date ?? new Date().toISOString().slice(0, 10), week, templates, recipes, ingredients };
}

/** Compact "Essen heute" for the Heute mode; null until the Ernährung mode was opened once. */
export async function getNutritionToday(userId: string, now = new Date()): Promise<NutritionToday | null> {
  if (!(await nutritionEnabled(userId))) return null;
  const ctx = await loadContext(userId);
  const week = await buildWeekView(ctx, weekStartOf(now), now);
  const day = week.days[isoWeekday(now) - 1];
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const open = day.meals.filter((m) => !m.log);
  // Next = the first open meal that isn't long past; otherwise the first open one at all.
  const next = open.find((m) => m.time >= nowTime) ?? open[0] ?? null;
  return {
    date: day.date,
    hint: trainingHint(day.timing),
    training: day.training,
    meals: day.meals.map((m) => ({ slot: m.slot, label: m.label, time: m.time, name: m.name, status: m.log?.status ?? null, entryId: m.entryId, recipeId: m.recipeId })),
    next: next ? { slot: next.slot, label: next.label, time: next.time, name: next.name, entryId: next.entryId } : null,
    eaten: day.eaten,
    planned: day.planned,
    targets: { kcal: ctx.settings.kcalTarget, proteinMin: ctx.settings.proteinMin, proteinMax: ctx.settings.proteinMax },
    notes: day.timing.notes.filter((n) => !n.includes('Training')),
  };
}
