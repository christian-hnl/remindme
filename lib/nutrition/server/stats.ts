import { addDays, differenceInCalendarDays } from 'date-fns';
import { db } from '@/lib/db';
import { dayKey, parseDay, shiftWeek, weekStartOf } from '../dates';
import { costPer10gProtein, recipeNutrition, roundMacros } from '../macros';
import { buildShopping, entryNutrition } from '../plan';
import type { Macros } from '../types';
import { MEAL_SLOTS } from '../types';
import type { NutritionStats } from '../views';
import { type NutritionContext, toPlanEntries } from './week';

const round2 = (n: number) => Math.round(n * 100) / 100;
const WEEKS_BACK = 8;

export async function buildStats(ctx: NutritionContext, now = new Date()): Promise<NutritionStats> {
  const s = ctx.settings;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = dayKey(today);
  const from30 = dayKey(addDays(today, -29));
  const startedAt = new Date(s.startedAt);
  const currentWeek = weekStartOf(today);
  const firstWeek = shiftWeek(currentWeek, -(WEEKS_BACK - 1));

  const [logs, weeks, transactions, body, allTimeLogs, anyTx] = await Promise.all([
    db.mealLog.findMany({ where: { userId: ctx.userId, day: { gte: from30 } } }),
    db.mealWeek.findMany({ where: { userId: ctx.userId, weekStart: { gte: shiftWeek(firstWeek, -1) } }, include: { entries: true } }),
    db.transaction.findMany({
      where: {
        userId: ctx.userId,
        type: 'expense',
        category: { in: ['Lebensmittel', 'Essen gehen'] },
        transactionDate: { gte: addDays(parseDay(firstWeek), -7 * WEEKS_BACK), lt: addDays(today, 1) },
      },
      select: { amount: true, category: true, transactionDate: true },
    }),
    db.bodyMetric.findMany({ where: { userId: ctx.userId }, orderBy: { day: 'desc' }, take: 16 }),
    db.mealLog.groupBy({ by: ['recipeId'], where: { userId: ctx.userId, status: { in: ['eaten', 'swapped'] }, recipeId: { not: null } }, _count: true }),
    db.transaction.count({ where: { userId: ctx.userId } }),
  ]);

  // ---------------------------------------------------------------- per day
  const days = Array.from({ length: 30 }, (_, i) => dayKey(addDays(today, i - 29)));
  const perDay = days.map((date) => {
    const dayLogs = logs.filter((l) => l.day === date);
    const eaten = dayLogs.filter((l) => l.status !== 'skipped');
    const slots = new Set(dayLogs.filter((l) => l.slot !== 'extra').map((l) => l.slot));
    return {
      date,
      kcal: Math.round(eaten.reduce((a, l) => a + l.kcal, 0)),
      protein: Math.round(eaten.reduce((a, l) => a + l.protein, 0) * 10) / 10,
      carbs: eaten.reduce((a, l) => a + l.carbs, 0),
      fat: eaten.reduce((a, l) => a + l.fat, 0),
      logged: dayLogs.length > 0,
      complete: MEAL_SLOTS.every((slot) => slots.has(slot)),
      asPlanned: dayLogs.filter((l) => l.slot !== 'extra' && l.status === 'eaten').length,
    };
  });

  const average = (list: typeof perDay): Macros | null => {
    const tracked = list.filter((d) => d.logged);
    if (tracked.length === 0) return null;
    const sum = tracked.reduce((a, d) => ({ kcal: a.kcal + d.kcal, protein: a.protein + d.protein, carbs: a.carbs + d.carbs, fat: a.fat + d.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    return roundMacros({ kcal: sum.kcal / tracked.length, protein: sum.protein / tracked.length, carbs: sum.carbs / tracked.length, fat: sum.fat / tracked.length });
  };

  // Adherence: meals eaten as planned out of the meals planned on finished days (today once complete).
  const plannedPerDay = new Map<string, number>();
  for (const w of weeks) for (const e of w.entries) {
    const date = dayKey(addDays(parseDay(w.weekStart), e.day - 1));
    plannedPerDay.set(date, (plannedPerDay.get(date) ?? 0) + 1);
  }
  const adherence = (list: typeof perDay) => {
    const counted = list.filter((d) => parseDay(d.date) >= new Date(startedAt.getFullYear(), startedAt.getMonth(), startedAt.getDate()) && (d.date < todayKey || d.complete) && (plannedPerDay.get(d.date) ?? 0) > 0);
    const planned = counted.reduce((a, d) => a + (plannedPerDay.get(d.date) ?? 0), 0);
    return planned > 0 ? counted.reduce((a, d) => a + d.asPlanned, 0) / planned : null;
  };

  // Streak: days in a row with the protein goal, counting today once it's reached.
  let streak = 0;
  for (let i = perDay.length - 1; i >= 0; i--) {
    const d = perDay[i];
    if (d.protein >= s.proteinMin) streak++;
    else if (d.date === todayKey) continue;
    else break;
  }

  const weekDays = perDay.filter((d) => d.date >= currentWeek);

  // ---------------------------------------------------------------- money
  const spendOf = (from: Date, to: Date, category: string) =>
    transactions.filter((t) => t.category === category && t.transactionDate >= from && t.transactionDate < to).reduce((a, t) => a + Math.max(0, -t.amount), 0);

  const shoppedDays = [1, 2, 3, 4, 5, ...(s.shopWeekend ? [6, 7] : [])];
  const weekRows = Array.from({ length: WEEKS_BACK }, (_, i) => {
    const weekStart = shiftWeek(firstWeek, i);
    const from = parseDay(weekStart);
    const to = addDays(from, 7);
    const plan = weeks.find((w) => w.weekStart === weekStart);
    let planned: number | null = null;
    if (plan) {
      const entries = toPlanEntries(plan).filter((e) => shoppedDays.includes(e.day));
      planned = round2(buildShopping(entries, ctx.plan(weekStart)).usedCost);
    }
    return {
      weekStart,
      label: `${from.getDate()}.${from.getMonth() + 1}.`,
      planned,
      groceries: round2(spendOf(from, to, 'Lebensmittel')),
      eatingOut: round2(spendOf(from, to, 'Essen gehen')),
    };
  });

  const startDay = new Date(startedAt.getFullYear(), startedAt.getMonth(), startedAt.getDate());
  const weeksSince = Math.max(1, differenceInCalendarDays(today, startDay) / 7);
  const beforeFrom = addDays(startDay, -7 * WEEKS_BACK);
  const hadDataBefore = transactions.some((t) => t.transactionDate < startDay);
  const eatingOutBefore = hadDataBefore ? spendOf(beforeFrom, startDay, 'Essen gehen') / WEEKS_BACK : null;
  const eatingOutSince = spendOf(startDay, addDays(today, 1), 'Essen gehen') / weeksSince;

  // ---------------------------------------------------------------- recipes
  const plan = ctx.plan(currentWeek);
  const current = weeks.find((w) => w.weekStart === currentWeek);
  let weekCost = 0;
  let weekProtein = 0;
  for (const e of current ? toPlanEntries(current) : []) {
    const n = entryNutrition(e, plan);
    if (!n) continue;
    weekCost += n.cost;
    weekProtein += n.protein;
  }

  const cheapestProtein = ctx.recipes
    .filter((r) => r.mealType !== 'sauce')
    .map((r) => {
      const n = recipeNutrition(r, plan.lookup, plan.factor);
      return { recipeId: r.id, name: r.name, value: costPer10gProtein(n.cost, n.protein) ?? Infinity, protein: n.protein };
    })
    .filter((r) => r.protein >= 15 && Number.isFinite(r.value))
    .sort((a, b) => a.value - b.value)
    .slice(0, 5)
    .map(({ recipeId, name, value }) => ({ recipeId, name, value: round2(value) }));

  const names = new Map(ctx.recipes.map((r) => [r.id, r.name]));
  const topRecipes = allTimeLogs
    .filter((g) => g.recipeId && names.has(g.recipeId))
    .sort((a, b) => b._count - a._count)
    .slice(0, 5)
    .map((g) => ({ recipeId: g.recipeId!, name: names.get(g.recipeId!)!, count: g._count }));

  return {
    days: perDay.map(({ date, kcal, protein, complete }) => ({ date, kcal, protein, complete })),
    avg7: average(perDay.slice(-7)),
    avg30: average(perDay),
    adherence7: adherence(perDay.slice(-7)),
    adherence30: adherence(perDay),
    streak,
    week: { proteinDays: weekDays.filter((d) => d.protein >= s.proteinMin).length, target: 5 },
    spending: {
      weeks: weekRows,
      eatingOutBefore: eatingOutBefore === null ? null : round2(eatingOutBefore),
      eatingOutSince: round2(eatingOutSince),
      saved: eatingOutBefore === null ? null : round2(Math.max(0, (eatingOutBefore - eatingOutSince) * weeksSince)),
      weeksSince: Math.round(weeksSince * 10) / 10,
      hasBankData: anyTx > 0,
    },
    costPer10gProtein: weekProtein > 0 ? round2((weekCost / weekProtein) * 10) : null,
    cheapestProtein,
    topRecipes,
    body: body.reverse().map((b) => ({ day: b.day, weightKg: b.weightKg, waistCm: b.waistCm })),
    targets: { kcal: s.kcalTarget, proteinMin: s.proteinMin, proteinMax: s.proteinMax },
  };
}
