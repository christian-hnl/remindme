import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { jsonError, readJson, serverError } from '@/lib/api';
import { RecipeInputError, parseRecipeInput } from '@/lib/nutrition/server/recipes';
import { loadSettings, parseIds } from '@/lib/nutrition/server/week';
import { invalidateNutritionReminders } from '@/lib/nutrition/server/reminders';

type Params = { params: { id: string } };

/** `{ favorite }` works for every recipe; the full editor payload only for your own. */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const recipe = await db.recipe.findFirst({ where: { id: params.id, OR: [{ userId: null }, { userId: user.id }] } });
    if (!recipe) return jsonError('Rezept nicht gefunden', 404);
    const body = await readJson(req);

    if (typeof body.favorite === 'boolean' && Object.keys(body).length === 1) {
      const { row } = await loadSettings(user.id);
      const favorites = new Set(parseIds(row.favorites));
      if (body.favorite) favorites.add(recipe.id);
      else favorites.delete(recipe.id);
      await db.nutritionSettings.update({ where: { userId: user.id }, data: { favorites: JSON.stringify([...favorites]) } });
      return NextResponse.json({ id: recipe.id, isFavorite: body.favorite });
    }

    if (!recipe.userId) return jsonError('Eingebaute Rezepte können nicht bearbeitet werden – lege eine Kopie an.', 403);
    const { recipe: data, ingredients } = await parseRecipeInput(body);
    await db.$transaction([
      db.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } }),
      db.recipe.update({ where: { id: recipe.id }, data: { ...data, ingredients: { create: ingredients } } }),
    ]);
    return NextResponse.json({ id: recipe.id, name: data.name });
  } catch (error) {
    if (error instanceof RecipeInputError) return jsonError(error.message);
    return serverError('PATCH /nutrition/recipes/[id]', error, 'Rezept konnte nicht gespeichert werden');
  }
}

/**
 * Deletes one of your own recipes. Plan entries that used it fall back to what the rotation
 * week planned, instead of leaving a gap.
 */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const recipe = await db.recipe.findFirst({ where: { id: params.id, userId: user.id } });
    if (!recipe) return jsonError('Nur eigene Rezepte können gelöscht werden', 404);

    const entries = await db.mealWeekEntry.findMany({
      where: { recipeId: recipe.id, week: { userId: user.id } },
      include: { week: { include: { template: { include: { entries: true } } } } },
    });
    for (const e of entries) {
      const fallback = e.week.template?.entries.find((t) => t.day === e.day && t.slot === e.slot);
      if (fallback) {
        await db.mealWeekEntry.update({ where: { id: e.id }, data: { recipeId: fallback.recipeId, sauceId: fallback.sauceId, isSwapped: false, adaptedFrom: null } });
      }
    }
    await db.recipe.delete({ where: { id: recipe.id } });
    await invalidateNutritionReminders(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError('DELETE /nutrition/recipes/[id]', error, 'Rezept konnte nicht gelöscht werden');
  }
}
