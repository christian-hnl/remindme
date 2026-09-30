/** Shared shapes of the nutrition module – used by the pure helpers, the API and the UI. */

export type MealSlot = 'breakfast' | 'snack' | 'lunch' | 'afternoon' | 'dinner';
export type MealType = 'breakfast' | 'snack' | 'main' | 'preworkout' | 'sauce';
export type TrainingType = 'upper' | 'lower' | 'rest';
export type PrepStrategy = 'midweek' | 'freeze';
export type LogStatus = 'eaten' | 'swapped' | 'skipped';
export type PrepSession = 'sunday' | 'wednesday';

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'snack', 'lunch', 'afternoon', 'dinner'];

/** Recipes tagged like this are the week's Gönn-Essen (5–10 € a portion, more kcal allowed). */
export const TREAT_TAG = 'goennung';
/** How far a Gönn-Tag may go over the kcal target – about 35 kcal a day over the week. */
export const TREAT_EXTRA_KCAL = 250;
export const isTreat = (recipe: { tags: string[] } | null | undefined) => !!recipe?.tags.includes(TREAT_TAG);

/** Plain one-pan dishes for the "Einfach" day mode (Huhn mit Reis & Co.). */
export const SIMPLE_TAG = 'einfach';
export const isSimple = (recipe: { tags: string[] } | null | undefined) => !!recipe?.tags.includes(SIMPLE_TAG);

/** WHO: at least 400 g fruit and vegetables a day (potatoes don't count). */
export const PRODUCE_TARGET = 400;

/**
 * Ingredients that count towards "Obst & Gemüse": fresh and frozen produce, canned tomatoes
 * and cooked legumes. Potatoes and sweet potatoes don't count (WHO), herbs are too little to matter.
 */
export const PRODUCE_SLUGS = new Set([
  'banane', 'apfel', 'zitrone', 'paprika', 'zwiebel', 'karotten', 'gurke', 'tomaten', 'eisberg', 'zucchini',
  'champignons', 'fruehlingszwiebel', 'tk-beeren', 'tk-brokkoli', 'tk-wokgemuese', 'tk-spinat', 'tk-erbsen',
  'tk-edamame', 'kichererbsen', 'kidneybohnen', 'mais', 'passata', 'tomaten-stueckig', 'avocado', 'krautsalat', 'apfelmus', 'rucola',
]);

export const DEPARTMENTS = [
  'Obst & Gemüse',
  'Fleisch & Fisch',
  'Kühlregal',
  'Brot & Gebäck',
  'Nudeln, Reis & Getreide',
  'Konserven',
  'Tiefkühl',
  'Vorrat & Gewürze',
] as const;
export type Department = (typeof DEPARTMENTS)[number];

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IngredientData extends Macros {
  slug: string;
  name: string;
  department: Department;
  /** Hofer/Lidl price, € per kg (2026 estimate). */
  pricePerKg: number;
  /** Grams in one pack at the store. */
  packGrams: number;
  packLabel: string;
  /** Weight of one piece (egg, banana, slice), for friendlier amounts. */
  pieceGrams?: number | null;
  pieceLabel?: string | null;
  /** Lasts for weeks (oil, spices, honey) – checked, not bought every week. */
  pantry: boolean;
}

export interface RecipeIngredientData {
  slug: string;
  /** Grams for the whole batch (all servings). */
  grams: number;
  note?: string | null;
}

export interface RecipeData {
  id: string;
  slug: string;
  name: string;
  mealType: MealType;
  description: string;
  flavorHack: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  fridgeDays: number;
  /** 0 = does not freeze well. */
  freezerDays: number;
  eatCold: boolean;
  tags: string[];
  equipment: string[];
  steps: string[];
  ingredients: RecipeIngredientData[];
  isCustom: boolean;
  isFavorite: boolean;
}

export interface NutritionSettingsData {
  kcalTarget: number;
  kcalTolerance: number;
  proteinMin: number;
  proteinMax: number;
  fatMin: number;
  fatMax: number;
  weeklyBudget: number;
  store: StoreId;
  /** Weekend meals on the shopping list and in the budget (off = eaten at home with the family). */
  shopWeekend: boolean;
  hasMicrowave: boolean;
  equipment: string[];
  dislikes: string[];
  /** ISO weekday (1 = Monday) → training type. */
  trainingDays: Record<string, TrainingType>;
  /** Preferred training start when school allows it. */
  trainingTime: string;
  trainingMinutes: number;
  /** School → home (or gym), in minutes. */
  commuteMinutes: number;
  /** Breakfast on days without school. */
  weekendBreakfast: string;
  prepStartTime: string;
  eveningTime: string;
  checkInTime: string;
  reminders: Record<ReminderKind, boolean>;
  /** When meal prep started – spending before it is the comparison baseline. */
  startedAt: string;
}

export type ReminderKind = 'shopping' | 'prep' | 'midweek' | 'eveningBefore' | 'preWorkout' | 'checkIn';

export const STORES = {
  'hofer-lidl': { label: 'Hofer / Lidl', factor: 1 },
  'billa-spar': { label: 'Billa / Spar', factor: 1.16 },
  'bio-markt': { label: 'Bio-Markt', factor: 1.45 },
} as const;
export type StoreId = keyof typeof STORES;

export const EQUIPMENT = ['Herd', 'Backofen', 'Mixer', 'Reiskocher', 'Airfryer', 'Mikrowelle'] as const;

export const TRAINING_LABELS: Record<TrainingType, string> = {
  upper: 'Oberkörper',
  lower: 'Unterkörper',
  rest: 'Ruhetag',
};

export const TRAINING_SHORT: Record<TrainingType, string> = { upper: 'OK', lower: 'UK', rest: 'Ruhe' };

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Frühstück',
  snack: 'Jause',
  lunch: 'Mittagessen',
  afternoon: 'Nachmittag',
  dinner: 'Abendessen',
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Frühstück',
  snack: 'Jause & Snack',
  main: 'Mittag & Abend',
  preworkout: 'Pre-Workout',
  sauce: 'Sauce & Marinade',
};

export const STRATEGY_LABELS: Record<PrepStrategy, string> = {
  midweek: 'Mini-Prep am Mittwoch',
  freeze: 'Do/Fr einfrieren',
};

export const REMINDER_LABELS: Record<ReminderKind, { label: string; hint: string }> = {
  shopping: { label: 'Einkaufen', hint: 'Samstag – mit der Liste für die Woche' },
  prep: { label: 'Meal Prep', hint: 'Sonntag zur Prep-Zeit' },
  midweek: { label: 'Mini-Prep', hint: 'Mittwoch, wenn der Plan einen vorsieht' },
  eveningBefore: { label: 'Am Vorabend', hint: 'Box aus dem TK nehmen, Jause einpacken' },
  preWorkout: { label: 'Pre-Workout', hint: 'Trainingstage, zur berechneten Uhrzeit' },
  checkIn: { label: 'Abhaken', hint: 'Abends, wenn noch etwas offen ist' },
};

/** Which recipe kinds fit a slot. The afternoon slot depends on the day. */
export function mealTypesForSlot(slot: MealSlot, training: boolean): MealType[] {
  switch (slot) {
    case 'breakfast':
      return ['breakfast'];
    case 'snack':
      return ['snack'];
    case 'lunch':
    case 'dinner':
      return ['main'];
    case 'afternoon':
      return training ? ['preworkout'] : ['snack'];
  }
}

export const slotLabel = (slot: MealSlot, training: boolean) =>
  slot === 'afternoon' ? (training ? 'Pre-Workout' : 'Nachmittag') : SLOT_LABELS[slot];
