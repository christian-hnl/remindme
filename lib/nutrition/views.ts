import type { BudgetSuggestion, CookItem, ShoppingPlan, Storage } from './plan';
import type { DayTiming } from './timing';
import type { IngredientData, LogStatus, Macros, MealSlot, NutritionSettingsData, PrepSession, PrepStrategy, RecipeData, TrainingType } from './types';
import type { PrepStepSeed } from './catalog/templates';

/** What the nutrition API sends to the browser. */

export interface NutritionFacts extends Macros {
  cost: number;
}

export interface RecipeView extends RecipeData {
  /** Per portion at the chosen store. */
  nutrition: NutritionFacts;
  /** Grams of fruit and vegetables per portion. */
  produce: number;
  /** Why it doesn't fit the settings (dislike, equipment) – shown as a hint. */
  issues: string[];
  /** Times eaten (logs). */
  eatenCount: number;
}

export interface MealLogView {
  id: string;
  day: string;
  slot: MealSlot | 'extra';
  status: LogStatus;
  recipeId: string | null;
  label: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  cost: number;
}

export interface MealView {
  entryId: string;
  slot: MealSlot;
  label: string;
  time: string;
  recipeId: string;
  name: string;
  mealType: RecipeData['mealType'];
  eatCold: boolean;
  sauceId: string | null;
  sauceName: string | null;
  servings: number;
  /** The week's Gönn-Essen. */
  isTreat: boolean;
  nutrition: NutritionFacts;
  /** Grams of fruit and vegetables in this meal. */
  produce: number;
  isSwapped: boolean;
  /** Name of the dish this replaced automatically, with the reason. */
  adapted: { from: string; reason: string } | null;
  issues: string[];
  storage: Storage | null;
  log: MealLogView | null;
}

export interface DayView {
  date: string;
  day: number;
  short: string;
  long: string;
  isToday: boolean;
  isPast: boolean;
  /** Counted for shopping and budget. */
  shopped: boolean;
  /** Has the week's Gönn-Essen – may go a little over the kcal target. */
  treat: boolean;
  training: TrainingType;
  timing: DayTiming;
  meals: MealView[];
  planned: NutritionFacts;
  eaten: Macros;
  /** Fruit and vegetables in grams – planned for the day and eaten so far. */
  produce: { planned: number; eaten: number };
  extras: MealLogView[];
  /** All planned meals have a log. */
  complete: boolean;
}

export interface PrepStepView extends PrepStepSeed {
  /** Wall-clock start and end. */
  at: string;
  until: string;
  done: boolean;
}

export interface PrepSessionView {
  id: PrepSession;
  label: string;
  date: string;
  start: string;
  end: string;
  minutes: number;
  steps: PrepStepView[];
  cook: CookItem[];
  done: boolean;
}

export interface WeekView {
  weekStart: string;
  label: string;
  isCurrent: boolean;
  /** "Einfach"-Woche: lunch and dinner are plain dishes instead of recipes. */
  simple: boolean;
  template: { id: string; number: number; name: string; theme: string; sauceBase: string; strategy: PrepStrategy; description: string } | null;
  exportedAt: string | null;
  days: DayView[];
  /** Average of the planned days. */
  average: NutritionFacts;
  prep: {
    sessions: PrepSessionView[];
    boxes: { day: number; short: string; items: (MealView & { thaw: boolean; age: number; problem: string | null; session: PrepSession | null })[] }[];
    warnings: string[];
  };
  shopping: ShoppingPlan & { days: number[] };
  budget: { limit: number; used: number; over: number; suggestions: BudgetSuggestion[] };
  goal: { proteinDays: number; target: number; reached: boolean };
  warnings: string[];
}

export interface TemplateSummary {
  id: string;
  number: number;
  name: string;
  theme: string;
  sauceBase: string;
  strategy: PrepStrategy;
  description: string;
}

export interface NutritionSummary {
  settings: NutritionSettingsData;
  today: string;
  week: WeekView;
  templates: TemplateSummary[];
  recipes: RecipeView[];
  ingredients: IngredientData[];
}

/** Compact card for the "Heute" mode. */
export interface NutritionToday {
  date: string;
  hint: string;
  training: TrainingType;
  meals: { slot: MealSlot; label: string; time: string; name: string; status: LogStatus | null; entryId: string; recipeId: string }[];
  next: { slot: MealSlot; label: string; time: string; name: string; entryId: string } | null;
  eaten: Macros;
  planned: Macros;
  targets: { kcal: number; proteinMin: number; proteinMax: number };
  notes: string[];
}

export interface NutritionStats {
  days: { date: string; kcal: number; protein: number; complete: boolean }[];
  avg7: Macros | null;
  avg30: Macros | null;
  adherence7: number | null;
  adherence30: number | null;
  streak: number;
  week: { proteinDays: number; target: number };
  spending: {
    weeks: { weekStart: string; label: string; planned: number | null; groceries: number; eatingOut: number }[];
    eatingOutBefore: number | null;
    eatingOutSince: number | null;
    saved: number | null;
    weeksSince: number;
    hasBankData: boolean;
  };
  costPer10gProtein: number | null;
  cheapestProtein: { recipeId: string; name: string; value: number }[];
  topRecipes: { recipeId: string; name: string; count: number }[];
  body: { day: string; weightKg: number | null; waistCm: number | null }[];
  targets: { kcal: number; proteinMin: number; proteinMax: number };
}
