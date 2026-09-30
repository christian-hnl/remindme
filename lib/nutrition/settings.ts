import type { NutritionSettingsData, ReminderKind, StoreId, TrainingType } from './types';
import { EQUIPMENT, STORES } from './types';

/**
 * Defaults for everything the user didn't tell us. They are assumptions, written down in
 * docs/meal-prep/README.md and all changeable in Einstellungen → Ernährung.
 */
export const DEFAULT_TRAINING: Record<string, TrainingType> = { '1': 'upper', '2': 'lower', '3': 'rest', '4': 'upper', '5': 'lower', '6': 'rest', '7': 'rest' };

export const DEFAULT_REMINDERS: Record<ReminderKind, boolean> = {
  shopping: true,
  prep: true,
  midweek: true,
  eveningBefore: true,
  preWorkout: true,
  checkIn: true,
};

export const DEFAULT_SETTINGS: Omit<NutritionSettingsData, 'startedAt'> = {
  kcalTarget: 2200,
  kcalTolerance: 100,
  proteinMin: 150,
  proteinMax: 165,
  fatMin: 60,
  fatMax: 75,
  weeklyBudget: 70,
  store: 'hofer-lidl',
  shopWeekend: true,
  hasMicrowave: false,
  equipment: ['Herd', 'Backofen'],
  dislikes: [],
  trainingDays: DEFAULT_TRAINING,
  trainingTime: '16:00',
  trainingMinutes: 75,
  commuteMinutes: 30,
  weekendBreakfast: '08:30',
  prepStartTime: '15:00',
  eveningTime: '20:00',
  checkInTime: '20:30',
  reminders: DEFAULT_REMINDERS,
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const TRAINING: TrainingType[] = ['upper', 'lower', 'rest'];

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try {
    const parsed = JSON.parse(value ?? '');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

const stringList = (value: unknown, max = 30) =>
  Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean))].slice(0, max) : null;

function trainingMap(value: unknown): Record<string, TrainingType> {
  const out: Record<string, TrainingType> = { ...DEFAULT_TRAINING };
  if (value && typeof value === 'object') {
    for (const day of Object.keys(DEFAULT_TRAINING)) {
      const v = (value as Record<string, unknown>)[day];
      if (typeof v === 'string' && (TRAINING as string[]).includes(v)) out[day] = v as TrainingType;
    }
  }
  return out;
}

function reminderMap(value: unknown): Record<ReminderKind, boolean> {
  const out = { ...DEFAULT_REMINDERS };
  if (value && typeof value === 'object') {
    for (const key of Object.keys(DEFAULT_REMINDERS) as ReminderKind[]) {
      const v = (value as Record<string, unknown>)[key];
      if (typeof v === 'boolean') out[key] = v;
    }
  }
  return out;
}

export interface SettingsRow {
  kcalTarget: number;
  kcalTolerance: number;
  proteinMin: number;
  proteinMax: number;
  fatMin: number;
  fatMax: number;
  weeklyBudget: number;
  store: string;
  shopWeekend: boolean;
  hasMicrowave: boolean;
  equipment: string;
  dislikes: string;
  trainingDays: string;
  trainingTime: string;
  trainingMinutes: number;
  commuteMinutes: number;
  weekendBreakfast: string;
  prepStartTime: string;
  eveningTime: string;
  checkInTime: string;
  reminders: string;
  startedAt: Date | string;
}

/** Database row → settings object, falling back to defaults for anything unreadable. */
export function readSettings(row: SettingsRow): NutritionSettingsData {
  const equipment = stringList(parseJson(row.equipment, null)) ?? DEFAULT_SETTINGS.equipment;
  return {
    kcalTarget: row.kcalTarget,
    kcalTolerance: row.kcalTolerance,
    proteinMin: row.proteinMin,
    proteinMax: row.proteinMax,
    fatMin: row.fatMin,
    fatMax: row.fatMax,
    weeklyBudget: row.weeklyBudget,
    store: (row.store in STORES ? row.store : 'hofer-lidl') as StoreId,
    shopWeekend: row.shopWeekend,
    hasMicrowave: row.hasMicrowave,
    equipment: equipment.length ? equipment : DEFAULT_SETTINGS.equipment,
    dislikes: stringList(parseJson(row.dislikes, [])) ?? [],
    trainingDays: trainingMap(parseJson(row.trainingDays, {})),
    trainingTime: TIME.test(row.trainingTime) ? row.trainingTime : DEFAULT_SETTINGS.trainingTime,
    trainingMinutes: row.trainingMinutes,
    commuteMinutes: row.commuteMinutes,
    weekendBreakfast: TIME.test(row.weekendBreakfast) ? row.weekendBreakfast : DEFAULT_SETTINGS.weekendBreakfast,
    prepStartTime: TIME.test(row.prepStartTime) ? row.prepStartTime : DEFAULT_SETTINGS.prepStartTime,
    eveningTime: TIME.test(row.eveningTime) ? row.eveningTime : DEFAULT_SETTINGS.eveningTime,
    checkInTime: TIME.test(row.checkInTime) ? row.checkInTime : DEFAULT_SETTINGS.checkInTime,
    reminders: reminderMap(parseJson(row.reminders, {})),
    startedAt: new Date(row.startedAt).toISOString(),
  };
}

const clampInt = (value: unknown, min: number, max: number) => {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value.replace(',', '.')) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : undefined;
};

/**
 * Validates a (partial) settings update from the client and returns the database columns
 * that change. Unknown or invalid values are dropped rather than rejected – the form only
 * sends what it shows.
 */
export function settingsUpdate(body: Record<string, unknown>): Record<string, string | number | boolean> {
  const data: Record<string, string | number | boolean> = {};
  const ints: [keyof NutritionSettingsData, number, number][] = [
    ['kcalTarget', 1200, 5000],
    ['kcalTolerance', 25, 400],
    ['proteinMin', 40, 300],
    ['proteinMax', 40, 320],
    ['fatMin', 20, 200],
    ['fatMax', 20, 220],
    ['trainingMinutes', 20, 240],
    ['commuteMinutes', 0, 120],
  ];
  for (const [key, min, max] of ints) {
    const v = clampInt(body[key], min, max);
    if (v !== undefined) data[key] = v;
  }
  const budget = typeof body.weeklyBudget === 'number' ? body.weeklyBudget : parseFloat(String(body.weeklyBudget ?? '').replace(',', '.'));
  if (Number.isFinite(budget)) data.weeklyBudget = Math.min(500, Math.max(0, Math.round(budget * 100) / 100));
  if (typeof body.store === 'string' && body.store in STORES) data.store = body.store;
  for (const key of ['shopWeekend', 'hasMicrowave'] as const) if (typeof body[key] === 'boolean') data[key] = body[key] as boolean;
  for (const key of ['trainingTime', 'weekendBreakfast', 'prepStartTime', 'eveningTime', 'checkInTime'] as const) {
    if (typeof body[key] === 'string' && TIME.test(body[key] as string)) data[key] = body[key] as string;
  }
  const equipment = stringList(body.equipment);
  if (equipment) data.equipment = JSON.stringify(equipment.filter((e) => (EQUIPMENT as readonly string[]).includes(e)));
  const dislikes = stringList(body.dislikes);
  if (dislikes) data.dislikes = JSON.stringify(dislikes.map((d) => d.slice(0, 40)));
  if (body.trainingDays && typeof body.trainingDays === 'object') data.trainingDays = JSON.stringify(trainingMap(body.trainingDays));
  if (body.reminders && typeof body.reminders === 'object') data.reminders = JSON.stringify(reminderMap(body.reminders));
  // Keep min ≤ max whatever order the fields arrive in.
  if (typeof data.proteinMin === 'number' && typeof data.proteinMax === 'number' && data.proteinMin > data.proteinMax) {
    [data.proteinMin, data.proteinMax] = [data.proteinMax, data.proteinMin];
  }
  if (typeof data.fatMin === 'number' && typeof data.fatMax === 'number' && data.fatMin > data.fatMax) {
    [data.fatMin, data.fatMax] = [data.fatMax, data.fatMin];
  }
  return data;
}

export const isTrainingDay = (settings: Pick<NutritionSettingsData, 'trainingDays'>, weekday: number) =>
  (settings.trainingDays[String(weekday)] ?? 'rest') !== 'rest';
