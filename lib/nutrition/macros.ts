import type { IngredientData, Macros, RecipeData, RecipeIngredientData, StoreId } from './types';
import { PRODUCE_SLUGS, STORES } from './types';

/** Pure nutrition and cost maths – no database, safe for server and browser. */

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

const round1 = (n: number) => Math.round(n * 10) / 10;
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function addMacros(a: Macros, b: Macros): Macros {
  return { kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat };
}

export function scaleMacros(m: Macros, factor: number): Macros {
  return { kcal: m.kcal * factor, protein: m.protein * factor, carbs: m.carbs * factor, fat: m.fat * factor };
}

export const sumMacros = (list: Macros[]) => list.reduce(addMacros, ZERO);

export function roundMacros(m: Macros): Macros {
  return { kcal: Math.round(m.kcal), protein: round1(m.protein), carbs: round1(m.carbs), fat: round1(m.fat) };
}

export const storeFactor = (store: StoreId | string | undefined) => STORES[store as StoreId]?.factor ?? 1;

export type IngredientLookup = Map<string, IngredientData>;

export const lookupOf = (ingredients: IngredientData[]): IngredientLookup => new Map(ingredients.map((i) => [i.slug, i]));

/** Macros of `grams` of one ingredient. */
export function ingredientMacros(ing: IngredientData, grams: number): Macros {
  const f = grams / 100;
  return { kcal: ing.kcal * f, protein: ing.protein * f, carbs: ing.carbs * f, fat: ing.fat * f };
}

export const ingredientCost = (ing: IngredientData, grams: number, factor = 1) => (ing.pricePerKg * grams * factor) / 1000;

export interface RecipeNutrition extends Macros {
  /** € per portion at the chosen store. */
  cost: number;
}

/** Per-portion nutrition and cost of a recipe, derived from its ingredients. */
export function recipeNutrition(
  recipe: { servings: number; ingredients: RecipeIngredientData[] },
  lookup: IngredientLookup,
  factor = 1
): RecipeNutrition {
  let total = ZERO;
  let cost = 0;
  for (const item of recipe.ingredients) {
    const ing = lookup.get(item.slug);
    if (!ing) continue;
    total = addMacros(total, ingredientMacros(ing, item.grams));
    cost += ingredientCost(ing, item.grams, factor);
  }
  const servings = Math.max(1, recipe.servings);
  return { ...scaleMacros(total, 1 / servings), cost: cost / servings };
}

/** Macros + cost of one planned meal: a recipe portion, optionally with its sauce. */
export function mealNutrition(
  recipe: RecipeData,
  servings: number,
  sauce: RecipeData | null,
  lookup: IngredientLookup,
  factor = 1
): RecipeNutrition {
  const base = recipeNutrition(recipe, lookup, factor);
  const withServings = { ...scaleMacros(base, servings), cost: base.cost * servings };
  if (!sauce) return withServings;
  const s = recipeNutrition(sauce, lookup, factor);
  return { ...addMacros(withServings, s), cost: withServings.cost + s.cost };
}

/** Grams of fruit and vegetables in one portion. */
export function produceGrams(recipe: { servings: number; ingredients: RecipeIngredientData[] }) {
  const total = recipe.ingredients.reduce((sum, i) => sum + (PRODUCE_SLUGS.has(i.slug) ? i.grams : 0), 0);
  return total / Math.max(1, recipe.servings);
}

/** Share of kcal that comes from protein, carbs and fat (0–1 each). */
export function macroSplit(m: Macros) {
  const p = m.protein * 4;
  const c = m.carbs * 4;
  const f = m.fat * 9;
  const total = p + c + f || 1;
  return { protein: p / total, carbs: c / total, fat: f / total };
}

/** € per 10 g protein – the budget metric for recomposition. */
export const costPer10gProtein = (cost: number, protein: number) => (protein > 0 ? (cost / protein) * 10 : null);

/**
 * How close a candidate is to a reference meal, for the swap dialog.
 * 0 = identical; kcal and protein weigh most, then cost.
 */
export function similarity(ref: RecipeNutrition, cand: RecipeNutrition) {
  const kcal = Math.abs(cand.kcal - ref.kcal) / Math.max(150, ref.kcal);
  const protein = Math.abs(cand.protein - ref.protein) / Math.max(10, ref.protein);
  const fat = Math.abs(cand.fat - ref.fat) / Math.max(8, ref.fat);
  const cost = Math.abs(cand.cost - ref.cost) / Math.max(0.8, ref.cost);
  return kcal * 1.2 + protein * 1.2 + fat * 0.4 + cost * 0.6;
}

/** "Similar enough" for a swap: within ~20 % kcal, ~25 % protein and ~60 % cost. */
export function isSimilar(ref: RecipeNutrition, cand: RecipeNutrition) {
  return (
    Math.abs(cand.kcal - ref.kcal) <= Math.max(90, ref.kcal * 0.2) &&
    Math.abs(cand.protein - ref.protein) <= Math.max(6, ref.protein * 0.25) &&
    cand.cost <= Math.max(ref.cost * 1.6, ref.cost + 0.8)
  );
}
