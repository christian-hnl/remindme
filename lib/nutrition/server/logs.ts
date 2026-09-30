import { db } from '@/lib/db';
import { dayKey, isoWeekday, parseDay, weekStartOf } from '../dates';
import { recipeNutrition } from '../macros';
import { entryNutrition } from '../plan';
import type { LogStatus, MealSlot } from '../types';
import { MEAL_SLOTS } from '../types';
import { setHabitDay } from './habits';
import { type NutritionContext, loadWeek, toLogView, toPlanEntries } from './week';

export interface LogInput {
  day: string;
  slot: MealSlot | 'extra';
  status: LogStatus;
  /** Another dish instead of the planned one (status swapped, or an extra). */
  recipeId?: string | null;
  /** Free entry, e.g. "Döner" or "Proteinriegel". */
  label?: string | null;
  kcal?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  cost?: number | null;
}

export class LogError extends Error {}

const num = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0);

/**
 * Ticks off a meal. Planned slots hold one log each (a second tick replaces the first);
 * extras just add up. Returns the log plus what the tick changed for the day and week.
 */
export async function logMeal(ctx: NutritionContext, input: LogInput) {
  const weekStart = weekStartOf(parseDay(input.day));
  const { week, plan } = await loadWeek(ctx, weekStart);
  const weekday = isoWeekday(parseDay(input.day));
  const entry = input.slot === 'extra' ? null : toPlanEntries(week).find((e) => e.day === weekday && e.slot === input.slot) ?? null;
  const other = input.recipeId ? plan.recipes.get(input.recipeId) ?? null : null;
  if (input.recipeId && !other) throw new LogError('Rezept nicht gefunden');

  let data: { recipeId: string | null; label: string; kcal: number; protein: number; carbs: number; fat: number; cost: number };
  if (input.status === 'skipped') {
    const planned = entry ? plan.recipes.get(entry.recipeId) : null;
    data = { recipeId: planned?.id ?? null, label: planned?.name ?? 'Mahlzeit', kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0 };
  } else if (other) {
    const n = recipeNutrition(other, plan.lookup, plan.factor);
    data = { recipeId: other.id, label: other.name, kcal: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat, cost: n.cost };
  } else if (input.status === 'eaten' && entry) {
    const n = entryNutrition(entry, plan)!;
    data = { recipeId: entry.recipeId, label: plan.recipes.get(entry.recipeId)?.name ?? 'Mahlzeit', kcal: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat, cost: n.cost };
  } else {
    const label = input.label?.trim().slice(0, 80);
    if (!label) throw new LogError('Was hast du gegessen?');
    const protein = num(input.protein);
    // Without kcal a protein snack is estimated at ~7 kcal per gram of protein (shake, Skyr, Riegel).
    const kcal = input.kcal != null ? num(input.kcal) : Math.round(protein * 7);
    data = { recipeId: null, label, kcal, protein, carbs: num(input.carbs), fat: num(input.fat), cost: num(input.cost) };
  }

  const status: LogStatus = input.slot === 'extra' ? 'eaten' : input.status === 'eaten' && other ? 'swapped' : input.status;
  const log = await db.$transaction(async (tx) => {
    if (input.slot !== 'extra') await tx.mealLog.deleteMany({ where: { userId: ctx.userId, day: input.day, slot: input.slot } });
    return tx.mealLog.create({ data: { userId: ctx.userId, day: input.day, slot: input.slot, status, ...data } });
  });

  return { log: toLogView(log), ...(await afterChange(ctx, input.day)) };
}

export async function deleteLog(ctx: NutritionContext, id: string) {
  const log = await db.mealLog.findFirst({ where: { id, userId: ctx.userId } });
  if (!log) throw new LogError('Eintrag nicht gefunden');
  await db.mealLog.delete({ where: { id } });
  return afterChange(ctx, log.day);
}

/**
 * Keeps the routines and the week goal in step with the logs of a day: the protein habit,
 * the evening check-in reminder, and – once per week – the celebration.
 */
async function afterChange(ctx: NutritionContext, day: string) {
  const weekStart = weekStartOf(parseDay(day));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = parseDay(weekStart);
    d.setDate(d.getDate() + i);
    return dayKey(d);
  });
  const logs = await db.mealLog.findMany({ where: { userId: ctx.userId, day: { in: days } } });
  const proteinOf = (d: string) => logs.filter((l) => l.day === d && l.status !== 'skipped').reduce((s, l) => s + l.protein, 0);
  const protein = proteinOf(day);
  await setHabitDay(ctx.userId, 'protein', day, protein >= ctx.settings.proteinMin);

  // All planned meals of the day ticked → the evening "abhaken?" reminder is done.
  const planned = new Set(logs.filter((l) => l.day === day && l.slot !== 'extra').map((l) => l.slot));
  const complete = MEAL_SLOTS.every((s) => planned.has(s));
  await db.reminder.updateMany({ where: { userId: ctx.userId, sourceKey: `nutrition:checkin:${day}` }, data: { isDone: complete } });

  const proteinDays = days.filter((d) => proteinOf(d) >= ctx.settings.proteinMin).length;
  const reached = proteinDays >= 5;
  let celebrate = false;
  if (reached && ctx.settingsRow.celebratedWeek !== weekStart) {
    await db.nutritionSettings.update({ where: { userId: ctx.userId }, data: { celebratedWeek: weekStart } });
    celebrate = true;
  }
  return {
    day: { date: day, protein: Math.round(protein * 10) / 10, complete, proteinReached: protein >= ctx.settings.proteinMin },
    weekGoal: { proteinDays, target: 5, reached, celebrate },
  };
}
