import type { ParsedMeal } from '@/lib/nlp-parser';
import { dayKey, isoWeekday, weekStartOf } from '../dates';
import { SLOT_LABELS } from '../types';
import { LogError, logMeal } from './logs';
import { buildWeekView, loadContext } from './week';

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\d]+/gu, ' ')
    .trim();

/** Best recipe for a free-text name: containment first, then shared words. */
export function matchRecipe<T extends { name: string }>(query: string, recipes: T[]): T | null {
  const q = normalize(query);
  if (!q) return null;
  const exact = recipes.find((r) => normalize(r.name) === q);
  if (exact) return exact;
  const contains = recipes.filter((r) => normalize(r.name).includes(q) || q.includes(normalize(r.name)));
  if (contains.length) return contains.sort((a, b) => a.name.length - b.name.length)[0];
  const words = q.split(' ').filter((w) => w.length > 2);
  let best: { recipe: T; score: number } | null = null;
  for (const recipe of recipes) {
    const name = normalize(recipe.name);
    const hits = words.filter((w) => name.includes(w)).length;
    const score = words.length ? hits / words.length : 0;
    if (score >= 0.5 && (!best || score > best.score)) best = { recipe, score };
  }
  return best?.recipe ?? null;
}

/** Handles "gegessen: …", "Frühstück gegessen" and "Snack 30g Protein" from the command palette. */
export async function quickLogMeal(userId: string, intent: ParsedMeal, now = new Date()) {
  const ctx = await loadContext(userId);
  const today = dayKey(now);
  const week = await buildWeekView(ctx, weekStartOf(now), now);
  const day = week.days[isoWeekday(now) - 1];

  if (intent.protein !== undefined || intent.kcal !== undefined) {
    const result = await logMeal(ctx, { day: today, slot: 'extra', status: 'eaten', label: intent.label, protein: intent.protein ?? 0, kcal: intent.kcal ?? null });
    return { ...result, message: `${intent.label} eingetragen (${result.log.protein.toLocaleString('de-DE')} g Protein, ${result.log.kcal} kcal) · heute ${result.day.protein.toLocaleString('de-DE')} g Protein` };
  }

  const recipe = intent.recipeQuery ? matchRecipe(intent.recipeQuery, ctx.recipes.filter((r) => r.mealType !== 'sauce')) : null;
  if (intent.recipeQuery && !recipe) {
    throw new LogError(`Kein Rezept „${intent.recipeQuery}“ gefunden – für Auswärts-Essen z. B. „Döner 35g Protein 650 kcal“.`);
  }

  const planned = recipe ? day.meals.find((m) => m.recipeId === recipe.id && !m.log) : null;
  const slotMeal = intent.slot ? day.meals.find((m) => m.slot === intent.slot) : null;

  if (planned) {
    const result = await logMeal(ctx, { day: today, slot: planned.slot, status: 'eaten' });
    return { ...result, message: `„${planned.name}“ als ${planned.label} abgehakt · heute ${result.day.protein.toLocaleString('de-DE')} g Protein` };
  }
  if (slotMeal) {
    const result = await logMeal(ctx, { day: today, slot: slotMeal.slot, status: 'eaten', recipeId: recipe && recipe.id !== slotMeal.recipeId ? recipe.id : null });
    return { ...result, message: `${SLOT_LABELS[slotMeal.slot]}: „${recipe?.name ?? slotMeal.name}“ abgehakt · heute ${result.day.protein.toLocaleString('de-DE')} g Protein` };
  }
  if (recipe) {
    const result = await logMeal(ctx, { day: today, slot: 'extra', status: 'eaten', recipeId: recipe.id });
    return { ...result, message: `„${recipe.name}“ zusätzlich eingetragen · heute ${result.day.protein.toLocaleString('de-DE')} g Protein` };
  }
  throw new LogError('Was hast du gegessen?');
}
