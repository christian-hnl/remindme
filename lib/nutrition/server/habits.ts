import { db } from '@/lib/db';

/**
 * Two routines the nutrition module ticks off by itself. They are ordinary habits, so they
 * show up in Routinen and count towards the usual streaks.
 */
export const NUTRITION_HABITS = {
  prep: { key: 'nutrition:prep', name: 'Meal Prep erledigt', emoji: '🥡' },
  protein: { key: 'nutrition:protein', name: 'Proteinziel erreicht', emoji: '💪' },
} as const;

export type NutritionHabit = keyof typeof NUTRITION_HABITS;

/** Called once when the Ernährung mode is first opened. */
export async function ensureNutritionHabits(userId: string) {
  const existing = await db.habit.findMany({ where: { userId, key: { startsWith: 'nutrition:' } }, select: { key: true } });
  const have = new Set(existing.map((h) => h.key));
  for (const habit of Object.values(NUTRITION_HABITS)) {
    if (have.has(habit.key)) continue;
    await db.habit.create({ data: { userId, key: habit.key, name: habit.name, emoji: habit.emoji } });
  }
}

/** Ticks a day on or off; returns whether anything changed. */
export async function setHabitDay(userId: string, kind: NutritionHabit, day: string, done: boolean) {
  const habit = await db.habit.findUnique({ where: { userId_key: { userId, key: NUTRITION_HABITS[kind].key } } });
  // Deleted or archived in Routinen means switched off on purpose – leave it alone.
  if (!habit || habit.archived) return false;
  const log = await db.habitLog.findUnique({ where: { habitId_day: { habitId: habit.id, day } } });
  if (done && !log) {
    await db.habitLog.create({ data: { habitId: habit.id, day } });
    return true;
  }
  if (!done && log) {
    await db.habitLog.delete({ where: { id: log.id } });
    return true;
  }
  return false;
}
