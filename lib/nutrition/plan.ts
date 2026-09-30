import type { DayTiming } from './timing';
import type { IngredientData, MealSlot, NutritionSettingsData, PrepSession, PrepStrategy, RecipeData } from './types';
import { DEPARTMENTS, MEAL_SLOTS, isSimple, isTreat, mealTypesForSlot } from './types';
import { type IngredientLookup, type RecipeNutrition, isSimilar, mealNutrition, recipeNutrition, similarity } from './macros';
import { isTrainingDay } from './settings';

/** Pure plan logic: constraints, swaps, prep sessions, boxes and the shopping list. */

export interface PlanEntry {
  id: string;
  day: number;
  slot: MealSlot;
  recipeId: string;
  sauceId: string | null;
  servings: number;
  isSwapped: boolean;
  adaptedFrom: string | null;
}

export interface PlanContext {
  settings: NutritionSettingsData;
  recipes: Map<string, RecipeData>;
  lookup: IngredientLookup;
  /** Store price factor. */
  factor: number;
  /** Timing per ISO weekday of the planned week. */
  timings: Record<number, DayTiming>;
}

// ------------------------------------------------------------------ constraints

/** Words that mean the same ingredient when someone says what they don't like. */
const SYNONYMS: Record<string, string[]> = {
  pilze: ['champignons'],
  fisch: ['thunfisch'],
  rind: ['rinderfaschiertes'],
  rindfleisch: ['rinderfaschiertes'],
  pute: ['putenfaschiertes', 'putenbrust'],
  huhn: ['hühner', 'huehner', 'hähnchen', 'hendl'],
  hähnchen: ['hühner', 'huehner', 'hendl'],
  käse: ['käse', 'kaese', 'mozzarella', 'gouda', 'hirtenkäse'],
  feta: ['hirtenkäse'],
  nüsse: ['erdnüsse', 'mandeln', 'erdnussbutter'],
  nuss: ['erdnüsse', 'mandeln', 'erdnussbutter'],
  milch: ['milch', 'topfen', 'skyr', 'käse', 'joghurt'],
  laktose: ['milch', 'topfen', 'skyr', 'käse', 'hüttenkäse', 'mozzarella'],
  gluten: ['wraps', 'brot', 'nudeln', 'couscous', 'mehl', 'brötchen'],
  scharf: ['sriracha', 'chili'],
  bohnen: ['kidneybohnen', 'edamame'],
  koriander: ['koriander'],
};

export function dislikeHits(recipe: RecipeData, dislikes: string[], lookup: IngredientLookup): string[] {
  if (dislikes.length === 0) return [];
  const haystack = [
    recipe.name,
    ...recipe.ingredients.map((i) => `${i.slug} ${lookup.get(i.slug)?.name ?? ''}`),
  ]
    .join(' | ')
    .toLowerCase();
  return dislikes.filter((raw) => {
    const word = raw.toLowerCase().trim();
    if (!word) return false;
    return [word, ...(SYNONYMS[word] ?? [])].some((w) => haystack.includes(w));
  });
}

/** Why a recipe does not fit a slot on a day – empty when it fits. */
export function violations(recipe: RecipeData, slot: MealSlot, day: number, ctx: PlanContext): string[] {
  const issues: string[] = [];
  const disliked = dislikeHits(recipe, ctx.settings.dislikes, ctx.lookup);
  if (disliked.length) issues.push(`enthält ${disliked.join(', ')}`);
  const missing = recipe.equipment.filter((e) => !ctx.settings.equipment.includes(e));
  if (missing.length) issues.push(`braucht ${missing.join(', ')}`);
  const timing = ctx.timings[day];
  if (slot === 'lunch' && timing?.lunchAtSchool && !ctx.settings.hasMicrowave && !recipe.eatCold) {
    issues.push('nicht kalt essbar – in der Schule gibt es keine Mikrowelle');
  }
  return issues;
}

export function slotAllows(recipe: RecipeData, slot: MealSlot, day: number, settings: NutritionSettingsData) {
  return mealTypesForSlot(slot, isTrainingDay(settings, day)).includes(recipe.mealType);
}

// ------------------------------------------------------------------ swaps

export interface SwapCandidate {
  recipe: RecipeData;
  nutrition: RecipeNutrition;
  score: number;
  similar: boolean;
  issues: string[];
}

/** Recipes that can replace an entry, best match first. */
export function swapCandidates(entry: Pick<PlanEntry, 'day' | 'slot' | 'recipeId'>, ctx: PlanContext): SwapCandidate[] {
  const current = ctx.recipes.get(entry.recipeId);
  const training = isTrainingDay(ctx.settings, entry.day);
  const types = mealTypesForSlot(entry.slot, training);
  const ref = current ? recipeNutrition(current, ctx.lookup, ctx.factor) : null;
  const out: SwapCandidate[] = [];
  for (const recipe of ctx.recipes.values()) {
    if (recipe.id === entry.recipeId || !types.includes(recipe.mealType)) continue;
    const nutrition = recipeNutrition(recipe, ctx.lookup, ctx.factor);
    const issues = violations(recipe, entry.slot, entry.day, ctx);
    const score = ref ? similarity(ref, nutrition) : 0;
    out.push({ recipe, nutrition, score, similar: ref ? isSimilar(ref, nutrition) : true, issues });
  }
  return out.sort((a, b) => a.issues.length - b.issues.length || a.score - b.score);
}

export interface AdaptChange {
  entryId: string;
  recipeId: string;
  /** Id of the dish that didn't fit. */
  adaptedFrom: string;
}

/**
 * Replaces entries that break a hard constraint (dislike, missing equipment, warm lunch at
 * school without a microwave). All uses of the same dish in the same slot get the same
 * replacement, so a prep batch stays one batch. The user's own swaps are left alone.
 */
export function adaptEntries(entries: PlanEntry[], ctx: PlanContext): AdaptChange[] {
  const groups = new Map<string, PlanEntry[]>();
  for (const e of entries) {
    if (e.isSwapped) continue;
    const recipe = ctx.recipes.get(e.recipeId);
    if (!recipe || violations(recipe, e.slot, e.day, ctx).length === 0) continue;
    const key = `${e.slot}|${e.recipeId}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const changes: AdaptChange[] = [];
  for (const group of groups.values()) {
    const original = ctx.recipes.get(group[0].recipeId)!;
    // A candidate must fit every day of the batch.
    const best = swapCandidates(group[0], ctx).find(
      (c) => group.every((e) => slotAllows(c.recipe, e.slot, e.day, ctx.settings) && violations(c.recipe, e.slot, e.day, ctx).length === 0)
    );
    if (!best) continue;
    for (const e of group) changes.push({ entryId: e.id, recipeId: best.recipe.id, adaptedFrom: e.adaptedFrom ?? original.id });
  }
  return changes;
}

/**
 * The "Einfach" dish that stands in for a main on simple days: closest in macros and cost,
 * fitting every day of the batch (cold at school, no dislikes), and freezable when those
 * portions end up in the freezer.
 */
export function simpleCounterpart(
  group: PlanEntry[],
  ctx: PlanContext,
  strategy: PrepStrategy,
  /** How often each simple dish is already used this week – spreads the week over several dishes. */
  used: Map<string, number> = new Map()
): RecipeData | null {
  const base = ctx.recipes.get(group[0].recipeId);
  if (!base) return null;
  const ref = recipeNutrition(base, ctx.lookup, ctx.factor);
  const needsFreezer = strategy === 'freeze' && group.some((e) => e.day >= 4 && e.day <= 5);
  const candidates = [...ctx.recipes.values()]
    .filter((r) => isSimple(r) && r.mealType === 'main' && group.every((e) => violations(r, e.slot, e.day, ctx).length === 0))
    .map((r) => {
      const n = recipeNutrition(r, ctx.lookup, ctx.factor);
      // Spread the week over several dishes, but never at the price of the protein target.
      const proteinGap = Math.max(0, ref.protein - n.protein - 5) * 0.08;
      return { recipe: r, score: similarity(ref, n) + proteinGap + (needsFreezer && r.freezerDays === 0 ? 5 : 0) + (used.get(r.id) ?? 0) * 0.9 };
    })
    .sort((a, b) => a.score - b.score);
  return candidates[0]?.recipe ?? null;
}

// ------------------------------------------------------------------ prep & boxes

export type Storage = 'fridge' | 'freezer' | 'fresh';

export interface CookItem {
  recipeId: string;
  name: string;
  mealType: RecipeData['mealType'];
  /** One box per meal. */
  boxes: number;
  /** Sum of the portions (a box can be ×0,9 when the day is scaled to the kcal target). */
  portions: number;
  fridge: number;
  freezer: number;
  days: number[];
}

export interface BoxItem {
  entryId: string;
  slot: MealSlot;
  recipeId: string;
  name: string;
  sauceName: string | null;
  storage: Storage;
  session: PrepSession | null;
  /** Take it out of the freezer the evening before. */
  thaw: boolean;
  /** Days between cooking and eating. */
  age: number;
  problem: string | null;
}

export interface PrepPlan {
  cook: Record<PrepSession, CookItem[]>;
  boxes: { day: number; items: BoxItem[] }[];
  warnings: string[];
}

/** Cooked in bulk at a prep session (single-portion recipes are made fresh). */
export const isBatch = (recipe: RecipeData) => recipe.servings > 1 && recipe.mealType !== 'sauce';

const BOX_SLOTS: MealSlot[] = ['breakfast', 'snack', 'lunch', 'afternoon', 'dinner'];

export function buildPrep(entries: PlanEntry[], strategy: PrepStrategy, ctx: PlanContext): PrepPlan {
  const weekday = entries.filter((e) => e.day <= 5);
  const cook: Record<PrepSession, Map<string, CookItem>> = { sunday: new Map(), wednesday: new Map() };
  const warnings: string[] = [];
  const boxes = new Map<number, BoxItem[]>();

  // First day each batch dish is eaten decides its session.
  const firstUse = new Map<string, number>();
  for (const e of weekday) {
    const r = ctx.recipes.get(e.recipeId);
    if (!r || !isBatch(r)) continue;
    firstUse.set(e.recipeId, Math.min(firstUse.get(e.recipeId) ?? 9, e.day));
  }

  const addCook = (session: PrepSession, recipe: RecipeData, portions: number, storage: Storage, day: number) => {
    const item = cook[session].get(recipe.id) ?? { recipeId: recipe.id, name: recipe.name, mealType: recipe.mealType, boxes: 0, portions: 0, fridge: 0, freezer: 0, days: [] };
    item.boxes += 1;
    item.portions = Math.round((item.portions + portions) * 10) / 10;
    if (storage === 'freezer') item.freezer += 1;
    else item.fridge += 1;
    if (!item.days.includes(day)) item.days.push(day);
    cook[session].set(recipe.id, item);
  };

  for (const e of [...weekday].sort((a, b) => a.day - b.day || BOX_SLOTS.indexOf(a.slot) - BOX_SLOTS.indexOf(b.slot))) {
    const recipe = ctx.recipes.get(e.recipeId);
    if (!recipe) continue;
    const sauce = e.sauceId ? ctx.recipes.get(e.sauceId) ?? null : null;
    let session: PrepSession | null = null;
    let storage: Storage = 'fresh';
    let age = 0;
    let problem: string | null = null;

    if (isBatch(recipe)) {
      session = strategy === 'midweek' && (firstUse.get(recipe.id) ?? 1) >= 4 ? 'wednesday' : 'sunday';
      age = session === 'sunday' ? e.day : e.day - 3;
      const freezeMain = strategy === 'freeze' && session === 'sunday' && e.day >= 4 && recipe.mealType === 'main' && recipe.freezerDays > 0;
      if (!freezeMain && age <= recipe.fridgeDays) storage = 'fridge';
      else if (recipe.freezerDays > 0) storage = 'freezer';
      else if (session === 'sunday' && e.day >= 4) {
        // Doesn't keep and can't be frozen – cook this portion on Wednesday instead.
        session = 'wednesday';
        age = e.day - 3;
        storage = 'fridge';
        if (strategy === 'freeze') warnings.push(`${recipe.name} hält nicht bis ${['', 'Mo', 'Di', 'Mi', 'Do', 'Fr'][e.day]} und lässt sich nicht einfrieren – Mittwoch frisch machen.`);
      } else {
        storage = 'fridge';
        problem = `hält nur ${recipe.fridgeDays} Tage`;
        warnings.push(`${recipe.name}: am ${['', 'Mo', 'Di', 'Mi', 'Do', 'Fr'][e.day]} schon ${age} Tage alt – lieber tauschen.`);
      }
      addCook(session, recipe, e.servings, storage, e.day);
      if (sauce) addCook(session, sauce, 1, 'fridge', e.day);
    } else if (sauce) {
      // Sauce for a fresh dish still gets made on Sunday.
      addCook('sunday', sauce, 1, 'fridge', e.day);
    }

    boxes.set(e.day, [
      ...(boxes.get(e.day) ?? []),
      { entryId: e.id, slot: e.slot, recipeId: recipe.id, name: recipe.name, sauceName: sauce?.name ?? null, storage, session, thaw: storage === 'freezer', age, problem },
    ]);
  }

  const sorted = (m: Map<string, CookItem>) => [...m.values()].sort((a, b) => (a.mealType === 'sauce' ? 1 : 0) - (b.mealType === 'sauce' ? 1 : 0) || b.portions - a.portions);
  return {
    cook: { sunday: sorted(cook.sunday), wednesday: sorted(cook.wednesday) },
    boxes: [...boxes.entries()].sort((a, b) => a[0] - b[0]).map(([day, items]) => ({ day, items })),
    warnings: [...new Set(warnings)],
  };
}

// ------------------------------------------------------------------ shopping list

export interface ShoppingLine {
  slug: string;
  name: string;
  department: IngredientData['department'];
  grams: number;
  packs: number;
  packLabel: string;
  pieces: number | null;
  pieceLabel: string | null;
  /** What goes into the Einkaufsliste as quantity. */
  quantity: string;
  usedCost: number;
  packCost: number;
  pantry: boolean;
}

export interface ShoppingPlan {
  lines: ShoppingLine[];
  departments: { name: string; lines: ShoppingLine[]; cost: number }[];
  /** What the planned meals consume (the budget figure). */
  usedCost: number;
  /** Whole packs at the till, without pantry items. */
  packCost: number;
  pantryCost: number;
}

export const formatGrams = (grams: number) =>
  grams >= 1000 ? `${(Math.round(grams / 100) / 10).toLocaleString('de-DE')} kg` : `${Math.round(grams)} g`;

/** Ingredient grams the given entries need (recipe share + one sauce portion each). */
export function ingredientNeeds(entries: PlanEntry[], ctx: PlanContext) {
  const needs = new Map<string, number>();
  const add = (recipe: RecipeData, portions: number) => {
    const share = portions / Math.max(1, recipe.servings);
    for (const i of recipe.ingredients) needs.set(i.slug, (needs.get(i.slug) ?? 0) + i.grams * share);
  };
  for (const e of entries) {
    const recipe = ctx.recipes.get(e.recipeId);
    if (recipe) add(recipe, e.servings);
    const sauce = e.sauceId ? ctx.recipes.get(e.sauceId) : null;
    if (sauce) add(sauce, 1);
  }
  return needs;
}

const FRESH_PIECES = new Set(['banane', 'apfel', 'zitrone', 'paprika', 'gurke', 'zwiebel', 'zucchini', 'tomaten']);

export function buildShopping(entries: PlanEntry[], ctx: PlanContext): ShoppingPlan {
  const lines: ShoppingLine[] = [];
  for (const [slug, grams] of ingredientNeeds(entries, ctx)) {
    const ing = ctx.lookup.get(slug);
    if (!ing || grams < 0.5) continue;
    // 5 % slack: 1030 g of a 1-kg pack is still one pack.
    const packs = Math.max(1, Math.ceil(grams / ing.packGrams - 0.05));
    const pieces = ing.pieceGrams ? Math.max(1, Math.ceil(grams / ing.pieceGrams - 0.1)) : null;
    const byPiece = pieces !== null && FRESH_PIECES.has(slug);
    lines.push({
      slug,
      name: ing.name,
      department: ing.department,
      grams,
      packs,
      packLabel: ing.packLabel,
      pieces,
      pieceLabel: ing.pieceLabel ?? null,
      quantity: byPiece ? `${pieces} ${ing.pieceLabel}` : `${packs}× ${ing.packLabel}`,
      usedCost: (ing.pricePerKg * grams * ctx.factor) / 1000,
      packCost: (ing.pricePerKg * (byPiece ? pieces! * ing.pieceGrams! : packs * ing.packGrams) * ctx.factor) / 1000,
      pantry: ing.pantry,
    });
  }
  lines.sort((a, b) => DEPARTMENTS.indexOf(a.department) - DEPARTMENTS.indexOf(b.department) || a.name.localeCompare(b.name, 'de'));
  const departments = DEPARTMENTS.map((name) => {
    const list = lines.filter((l) => l.department === name);
    return { name, lines: list, cost: list.reduce((s, l) => s + (l.pantry ? 0 : l.packCost), 0) };
  }).filter((d) => d.lines.length > 0);
  return {
    lines,
    departments,
    usedCost: lines.reduce((s, l) => s + l.usedCost, 0),
    packCost: lines.filter((l) => !l.pantry).reduce((s, l) => s + l.packCost, 0),
    pantryCost: lines.filter((l) => l.pantry).reduce((s, l) => s + l.usedCost, 0),
  };
}

// ------------------------------------------------------------------ budget

export interface BudgetSuggestion {
  slot: MealSlot;
  fromRecipeId: string;
  fromName: string;
  toRecipeId: string;
  toName: string;
  entryIds: string[];
  saving: number;
}

/** Cheaper dishes with similar macros for the most expensive batches of the week. */
export function budgetSuggestions(entries: PlanEntry[], ctx: PlanContext, limit = 3): BudgetSuggestion[] {
  const groups = new Map<string, PlanEntry[]>();
  for (const e of entries) groups.set(`${e.slot}|${e.recipeId}`, [...(groups.get(`${e.slot}|${e.recipeId}`) ?? []), e]);
  const out: BudgetSuggestion[] = [];
  for (const group of groups.values()) {
    const from = ctx.recipes.get(group[0].recipeId);
    // The Gönn-Essen is meant to cost more – never suggest saving on it.
    if (!from || isTreat(from)) continue;
    const ref = recipeNutrition(from, ctx.lookup, ctx.factor);
    const cand = swapCandidates(group[0], ctx).find(
      (c) => c.similar && !isTreat(c.recipe) && c.nutrition.cost < ref.cost - 0.15 && group.every((e) => violations(c.recipe, e.slot, e.day, ctx).length === 0)
    );
    if (!cand) continue;
    const portions = group.reduce((s, e) => s + e.servings, 0);
    out.push({
      slot: group[0].slot,
      fromRecipeId: from.id,
      fromName: from.name,
      toRecipeId: cand.recipe.id,
      toName: cand.recipe.name,
      entryIds: group.map((e) => e.id),
      saving: (ref.cost - cand.nutrition.cost) * portions,
    });
  }
  return out.sort((a, b) => b.saving - a.saving).slice(0, limit);
}

// ------------------------------------------------------------------ totals

export function entryNutrition(entry: PlanEntry, ctx: PlanContext): RecipeNutrition | null {
  const recipe = ctx.recipes.get(entry.recipeId);
  if (!recipe) return null;
  const sauce = entry.sauceId ? ctx.recipes.get(entry.sauceId) ?? null : null;
  return mealNutrition(recipe, entry.servings, sauce, ctx.lookup, ctx.factor);
}

export const SLOT_ORDER = MEAL_SLOTS;
