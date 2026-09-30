import { createHash } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';
import { INGREDIENTS } from '../catalog/ingredients';
import { RECIPES } from '../catalog/recipes';
import { TEMPLATES } from '../catalog/templates';
import type { Department, IngredientData, MealType, RecipeData } from '../types';

/** Changes whenever an ingredient, recipe or rotation week in the code changes. */
export const CATALOG_VERSION = createHash('sha1').update(JSON.stringify([INGREDIENTS, RECIPES, TEMPLATES])).digest('hex').slice(0, 12);

/**
 * Writes the built-in ingredients, recipes and rotation weeks. Idempotent: everything is
 * upserted by slug, so ids stay stable and existing plans keep pointing at the same recipes.
 */
export async function seedNutritionCatalog(client: PrismaClient = db) {
  const ingredientIds = new Map<string, string>();
  for (const i of INGREDIENTS) {
    const data = {
      name: i.name,
      department: i.department,
      kcal: i.kcal,
      protein: i.protein,
      carbs: i.carbs,
      fat: i.fat,
      pricePerKg: i.pricePerKg,
      packGrams: i.packGrams,
      packLabel: i.packLabel,
      pieceGrams: i.pieceGrams ?? null,
      pieceLabel: i.pieceLabel ?? null,
      pantry: i.pantry,
    };
    const row = await client.ingredient.upsert({ where: { slug: i.slug }, update: data, create: { slug: i.slug, ...data } });
    ingredientIds.set(i.slug, row.id);
  }

  const recipeIds = new Map<string, string>();
  for (const r of RECIPES) {
    const data = {
      name: r.name,
      mealType: r.mealType,
      description: r.description,
      flavorHack: r.flavorHack,
      servings: r.servings,
      prepMinutes: r.prepMinutes,
      cookMinutes: r.cookMinutes,
      fridgeDays: r.fridgeDays,
      freezerDays: r.freezerDays,
      eatCold: r.eatCold,
      tags: JSON.stringify(r.tags),
      equipment: JSON.stringify(r.equipment),
      steps: JSON.stringify(r.steps),
    };
    const row = await client.recipe.upsert({ where: { slug: r.slug }, update: data, create: { slug: r.slug, ...data } });
    recipeIds.set(r.slug, row.id);
    await client.$transaction([
      client.recipeIngredient.deleteMany({ where: { recipeId: row.id } }),
      client.recipeIngredient.createMany({
        data: r.per.map(([slug, grams, note], position) => {
          const ingredientId = ingredientIds.get(slug);
          if (!ingredientId) throw new Error(`Zutat „${slug}“ fehlt für ${r.slug}`);
          return { recipeId: row.id, ingredientId, grams: Math.round(grams * r.servings * 10) / 10, note: note ?? null, position };
        }),
      }),
    ]);
  }

  const id = (slug: string) => {
    const value = recipeIds.get(slug);
    if (!value) throw new Error(`Rezept „${slug}“ fehlt im Katalog`);
    return value;
  };

  for (const t of TEMPLATES) {
    const data = {
      number: t.number,
      name: t.name,
      theme: t.theme,
      sauceBase: t.sauceBase,
      strategy: t.strategy,
      description: t.description,
      prepSteps: JSON.stringify(t.prep),
      catalogVersion: CATALOG_VERSION,
    };
    const row = await client.mealPlanTemplate.upsert({ where: { slug: t.slug }, update: data, create: { slug: t.slug, ...data } });
    const entries = t.days.flatMap((d, index) => {
      const day = index + 1;
      const meal = (ref: string | [string, string]) => (Array.isArray(ref) ? { recipeId: id(ref[0]), sauceId: id(ref[1]) } : { recipeId: id(ref), sauceId: null });
      return [
        { day, slot: 'breakfast', variant: null, ...meal(d.breakfast) },
        { day, slot: 'snack', variant: null, ...meal(d.snack) },
        { day, slot: 'lunch', variant: null, ...meal(d.lunch) },
        { day, slot: 'afternoon', variant: 'training', ...meal(d.training) },
        { day, slot: 'afternoon', variant: 'rest', ...meal(d.rest) },
        { day, slot: 'dinner', variant: null, ...meal(d.dinner) },
      ].map((e) => ({ ...e, templateId: row.id }));
    });
    await client.$transaction([
      client.mealPlanTemplateEntry.deleteMany({ where: { templateId: row.id } }),
      client.mealPlanTemplateEntry.createMany({ data: entries }),
    ]);
  }

  return { ingredients: INGREDIENTS.length, recipes: RECIPES.length, templates: TEMPLATES.length };
}

let ensured: Promise<unknown> | null = null;

/**
 * Seeds the catalog on first use, so a fresh deployment (Docker only runs `db push`) has
 * recipes without a manual seed – and again whenever the catalog in the code changed.
 */
export function ensureNutritionCatalog() {
  ensured ??= (async () => {
    const outdated = await db.mealPlanTemplate.count({ where: { catalogVersion: { not: CATALOG_VERSION } } });
    const templates = await db.mealPlanTemplate.count();
    if (outdated > 0 || templates < TEMPLATES.length) await seedNutritionCatalog();
  })().catch((error) => {
    ensured = null;
    throw error;
  });
  return ensured;
}

// ------------------------------------------------------------------ reading

const parseList = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

export async function loadIngredients(): Promise<IngredientData[]> {
  const rows = await db.ingredient.findMany({ orderBy: { name: 'asc' } });
  return rows.map((i) => ({
    slug: i.slug,
    name: i.name,
    department: i.department as Department,
    kcal: i.kcal,
    protein: i.protein,
    carbs: i.carbs,
    fat: i.fat,
    pricePerKg: i.pricePerKg,
    packGrams: i.packGrams,
    packLabel: i.packLabel,
    pieceGrams: i.pieceGrams,
    pieceLabel: i.pieceLabel,
    pantry: i.pantry,
  }));
}

/** Built-in recipes plus the user's own. */
export async function loadRecipes(userId: string, favorites: string[] = []): Promise<RecipeData[]> {
  const rows = await db.recipe.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    include: { ingredients: { include: { ingredient: { select: { slug: true } } }, orderBy: { position: 'asc' } } },
    orderBy: { name: 'asc' },
  });
  const fav = new Set(favorites);
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug ?? r.id,
    name: r.name,
    mealType: r.mealType as MealType,
    description: r.description,
    flavorHack: r.flavorHack,
    servings: r.servings,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    fridgeDays: r.fridgeDays,
    freezerDays: r.freezerDays,
    eatCold: r.eatCold,
    tags: parseList(r.tags),
    equipment: parseList(r.equipment),
    steps: parseList(r.steps),
    ingredients: r.ingredients.map((i) => ({ slug: i.ingredient.slug, grams: i.grams, note: i.note })),
    isCustom: !!r.userId,
    isFavorite: fav.has(r.id),
  }));
}
