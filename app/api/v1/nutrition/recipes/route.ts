import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/user';
import { jsonError, readJson, serverError } from '@/lib/api';
import { RecipeInputError, parseRecipeInput } from '@/lib/nutrition/server/recipes';

/** Creates one of the user's own recipes. Nutrition and cost follow from the ingredients. */
export async function POST(req: Request) {
  try {
    const { recipe, ingredients } = await parseRecipeInput(await readJson(req));
    const user = await getCurrentUser();
    const created = await db.recipe.create({
      data: { ...recipe, userId: user.id, ingredients: { create: ingredients } },
    });
    return NextResponse.json({ id: created.id, name: created.name }, { status: 201 });
  } catch (error) {
    if (error instanceof RecipeInputError) return jsonError(error.message);
    return serverError('POST /nutrition/recipes', error, 'Rezept konnte nicht gespeichert werden');
  }
}
