import { db } from '@/lib/db';
import type { MealType } from '../types';
import { EQUIPMENT } from '../types';

const MEAL_TYPES: MealType[] = ['breakfast', 'snack', 'main', 'preworkout', 'sauce'];

const int = (value: unknown, min: number, max: number, fallback: number) => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const list = (value: unknown, max: number, len: number) =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').map((v) => v.trim().slice(0, len)).filter(Boolean).slice(0, max) : [];

export class RecipeInputError extends Error {}

/** Validates the recipe editor's payload; ingredient grams are for the whole recipe. */
export async function parseRecipeInput(body: Record<string, unknown>) {
  const name = text(body.name, 80);
  if (!name) throw new RecipeInputError('Wie heißt das Rezept?');
  const mealType = MEAL_TYPES.find((t) => t === body.mealType);
  if (!mealType) throw new RecipeInputError('Für welche Mahlzeit ist das Rezept?');

  const rows = Array.isArray(body.ingredients) ? body.ingredients : [];
  const slugs = rows.map((r) => (r && typeof r === 'object' ? String((r as Record<string, unknown>).slug ?? '') : ''));
  const known = await db.ingredient.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
  const idOf = new Map(known.map((k) => [k.slug, k.id]));
  const ingredients = rows
    .map((r, position) => {
      const row = (r ?? {}) as Record<string, unknown>;
      const grams = typeof row.grams === 'number' ? row.grams : parseFloat(String(row.grams ?? '').replace(',', '.'));
      const ingredientId = idOf.get(String(row.slug ?? ''));
      return ingredientId && Number.isFinite(grams) && grams > 0 && grams <= 10000 ? { ingredientId, grams: Math.round(grams * 10) / 10, position } : null;
    })
    .filter((r): r is { ingredientId: string; grams: number; position: number } => !!r);
  if (ingredients.length === 0) throw new RecipeInputError('Mindestens eine Zutat mit Menge angeben');

  return {
    recipe: {
      name,
      mealType,
      description: text(body.description, 400),
      flavorHack: text(body.flavorHack, 400),
      servings: int(body.servings, 1, 12, 1),
      prepMinutes: int(body.prepMinutes, 0, 240, 10),
      cookMinutes: int(body.cookMinutes, 0, 480, 0),
      fridgeDays: int(body.fridgeDays, 0, 7, 3),
      freezerDays: int(body.freezerDays, 0, 180, 0),
      eatCold: body.eatCold === true,
      tags: JSON.stringify(list(body.tags, 12, 24).map((t) => t.toLowerCase())),
      equipment: JSON.stringify(list(body.equipment, 6, 20).filter((e) => (EQUIPMENT as readonly string[]).includes(e))),
      steps: JSON.stringify(list(body.steps, 20, 400)),
    },
    ingredients,
  };
}
