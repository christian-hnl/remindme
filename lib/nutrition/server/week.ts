import { Prisma } from '@prisma/client';
import { addDays } from 'date-fns';
import { db } from '@/lib/db';
import { filterByGroups, getSchoolWeek, parseRotations, parseStringList } from '@/lib/webuntis';
import { computeDayTiming, type DayTiming, type SchoolLesson } from '../timing';
import { DEFAULT_REMINDERS, DEFAULT_SETTINGS, DEFAULT_TRAINING, isTrainingDay, readSettings } from '../settings';
import { lookupOf, produceGrams, recipeNutrition, roundMacros, scaleMacros, storeFactor, sumMacros, ZERO } from '../macros';
import {
  adaptEntries,
  simpleCounterpart,
  budgetSuggestions,
  buildPrep,
  buildShopping,
  entryNutrition,
  type PlanContext,
  type PlanEntry,
  SLOT_ORDER,
  violations,
} from '../plan';
import { dateInWeek, dayKey, parseDay, rotationFor, toMinutes, toTime, weekStartOf, WEEKDAY_LONG, WEEKDAY_SHORT } from '../dates';
import { TREAT_EXTRA_KCAL, isSimple, isTreat, slotLabel, type MealSlot, type NutritionSettingsData, type PrepStrategy, type RecipeData } from '../types';
import type { PrepStepSeed } from '../catalog/templates';
import type { DayView, MealLogView, MealView, NutritionFacts, PrepSessionView, TemplateSummary, WeekView } from '../views';
import { ensureNutritionCatalog, loadIngredients, loadRecipes } from './catalog';
import { ensureNutritionHabits } from './habits';

// ------------------------------------------------------------------ settings

const parseIds = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

/** The user's nutrition settings; created with the defaults on first use. */
export async function loadSettings(userId: string) {
  let row = await db.nutritionSettings.findUnique({ where: { userId } });
  if (!row) {
    row = await db.nutritionSettings.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        equipment: JSON.stringify(DEFAULT_SETTINGS.equipment),
        trainingDays: JSON.stringify(DEFAULT_TRAINING),
        reminders: JSON.stringify(DEFAULT_REMINDERS),
      },
    });
  }
  if (!row.habitsSetup) {
    // First visit: the two routines join Routinen once – deleting them later sticks.
    await ensureNutritionHabits(userId);
    row = await db.nutritionSettings.update({ where: { userId }, data: { habitsSetup: true } });
  }
  return { row, settings: readSettings(row), favorites: parseIds(row.favorites) };
}

/** Nutrition is "on" once the user opened the Ernährung mode (settings exist). */
export const nutritionEnabled = async (userId: string) => (await db.nutritionSettings.count({ where: { userId } })) > 0;

// ------------------------------------------------------------------ school

export interface SchoolWeek {
  byDay: Map<number, SchoolLesson[]>;
  /** Monday (yyyy-MM-dd) of the week the stored timetable belongs to – its cancellations only apply there. */
  monday: string | null;
}

/** The synced timetable, filtered to the user's groups exactly like the dashboard shows it. */
export async function loadSchool(userId: string): Promise<SchoolWeek> {
  const [blocks, config] = await Promise.all([
    db.scheduleBlock.findMany({
      where: { userId },
      select: { dayOfWeek: true, startTime: true, endTime: true, isCancelled: true, subjectCode: true, studentGroup: true },
    }),
    db.webUntisConfig.findUnique({ where: { userId } }),
  ]);
  const lessons = filterByGroups(
    blocks,
    parseStringList(config?.selectedGroups),
    parseStringList(config?.hiddenLessons),
    parseRotations(config?.rotatingLessons)
  );
  const byDay = new Map<number, SchoolLesson[]>();
  for (const l of lessons) byDay.set(l.dayOfWeek, [...(byDay.get(l.dayOfWeek) ?? []), l]);
  return { byDay, monday: config?.lastSyncAt ? dayKey(getSchoolWeek(config.lastSyncAt).monday) : null };
}

export function timingsFor(weekStart: string, school: SchoolWeek, settings: NutritionSettingsData): Record<number, DayTiming> {
  const out: Record<number, DayTiming> = {};
  for (let day = 1; day <= 7; day++) {
    const lessons = (school.byDay.get(day) ?? []).map((l) => (weekStart === school.monday ? l : { ...l, isCancelled: false }));
    out[day] = computeDayTiming(lessons, day, settings);
  }
  return out;
}

// ------------------------------------------------------------------ week

const weekInclude = { entries: true } as const;
type WeekRow = Prisma.MealWeekGetPayload<{ include: typeof weekInclude }>;
type TemplateRow = Prisma.MealPlanTemplateGetPayload<{ include: { entries: true } }>;

function templateEntry(template: TemplateRow, day: number, slot: MealSlot, training: boolean) {
  return template.entries.find(
    (e) => e.day === day && e.slot === slot && (slot !== 'afternoon' || e.variant === (training ? 'training' : 'rest'))
  );
}

function baseEntries(template: TemplateRow, settings: NutritionSettingsData) {
  const rows: { day: number; slot: MealSlot; recipeId: string; sauceId: string | null }[] = [];
  for (let day = 1; day <= 7; day++) {
    for (const slot of SLOT_ORDER) {
      const t = templateEntry(template, day, slot, isTrainingDay(settings, day));
      if (t) rows.push({ day, slot, recipeId: t.recipeId, sauceId: t.sauceId });
    }
  }
  return rows;
}

async function templateByNumber(number: number) {
  return db.mealPlanTemplate.findFirst({ where: { number }, include: { entries: true } });
}

/** The week's plan; created from the rotation week the calendar week falls on. */
export async function getOrCreateWeek(userId: string, weekStart: string, settings: NutritionSettingsData): Promise<WeekRow> {
  const existing = await db.mealWeek.findUnique({ where: { userId_weekStart: { userId, weekStart } }, include: weekInclude });
  if (existing) return existing;
  const template = await templateByNumber(rotationFor(weekStart));
  try {
    return await db.mealWeek.create({
      data: {
        userId,
        weekStart,
        templateId: template?.id ?? null,
        entries: { create: template ? baseEntries(template, settings) : [] },
      },
      include: weekInclude,
    });
  } catch (error) {
    // Two requests created the same week at once – use the other one.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return db.mealWeek.findUniqueOrThrow({ where: { userId_weekStart: { userId, weekStart } }, include: weekInclude });
    }
    throw error;
  }
}

/** Switches a week to another rotation week; the user's swaps in that week are reset. */
export async function applyTemplate(userId: string, weekStart: string, templateId: string, settings: NutritionSettingsData) {
  const template = await db.mealPlanTemplate.findUnique({ where: { id: templateId }, include: { entries: true } });
  if (!template) throw new Error('Rotationswoche nicht gefunden');
  const week = await getOrCreateWeek(userId, weekStart, settings);
  await db.$transaction([
    db.mealWeekEntry.deleteMany({ where: { weekId: week.id } }),
    db.mealWeek.update({
      where: { id: week.id },
      data: {
        templateId,
        prepChecks: week.templateId === templateId ? week.prepChecks : '[]',
        entries: { create: baseEntries(template, settings) },
      },
    }),
  ]);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Brings a week in line with the settings and the timetable: the afternoon slot follows the
 * training days, dishes that break a rule (dislike, equipment, warm lunch at school without
 * a microwave) are replaced, and lunch/dinner portions scale to the kcal target. Entries the
 * user swapped by hand keep their dish. Only writes what actually changed.
 */
export async function reconcileWeek(week: WeekRow, ctx: PlanContext): Promise<WeekRow> {
  const template = week.templateId ? await db.mealPlanTemplate.findUnique({ where: { id: week.templateId }, include: { entries: true } }) : null;

  const next: PlanEntry[] = week.entries.map((e) => {
    const entry: PlanEntry = {
      id: e.id,
      day: e.day,
      slot: e.slot as MealSlot,
      recipeId: e.recipeId,
      sauceId: e.sauceId,
      servings: e.servings,
      isSwapped: e.isSwapped,
      adaptedFrom: null,
    };
    if (e.isSwapped) return { ...entry, adaptedFrom: e.adaptedFrom };
    const base = template ? templateEntry(template, e.day, entry.slot, isTrainingDay(ctx.settings, e.day)) : null;
    if (base) {
      entry.recipeId = base.recipeId;
      entry.sauceId = base.sauceId;
    } else if (e.adaptedFrom) {
      entry.recipeId = e.adaptedFrom;
    }
    return entry;
  });

  for (const change of adaptEntries(next, ctx)) {
    const entry = next.find((e) => e.id === change.entryId)!;
    entry.recipeId = change.recipeId;
    entry.adaptedFrom = change.adaptedFrom;
    const recipe = ctx.recipes.get(change.recipeId);
    if (recipe?.mealType !== 'main') entry.sauceId = null;
  }

  // "Einfach"-Woche: every lunch and dinner becomes a plain dish, one batch keeps one dish and
  // the week spreads over several of them. The Gönn-Essen stays, and so does the day's sauce –
  // it's prepped anyway and makes simple taste like something.
  if (week.simple) {
    const groups = new Map<string, PlanEntry[]>();
    for (const e of [...next].sort((a, b) => a.day - b.day)) {
      if (e.isSwapped || (e.slot !== 'lunch' && e.slot !== 'dinner')) continue;
      const recipe = ctx.recipes.get(e.recipeId);
      if (!recipe || isSimple(recipe) || isTreat(recipe)) continue;
      groups.set(`${e.slot}|${e.recipeId}`, [...(groups.get(`${e.slot}|${e.recipeId}`) ?? []), e]);
    }
    const strategy = (template?.strategy ?? 'midweek') as PrepStrategy;
    const used = new Map<string, number>();
    for (const group of groups.values()) {
      const simple = simpleCounterpart(group, ctx, strategy, used);
      if (!simple) continue;
      used.set(simple.id, (used.get(simple.id) ?? 0) + 1);
      for (const e of group) e.recipeId = simple.id;
    }
  }

  // Scale lunch and dinner when a day falls outside the kcal target ± tolerance (e.g. after the
  // target was changed). The Gönn-Essen stays a whole portion – its day may go a little over.
  for (let day = 1; day <= 7; day++) {
    const dayEntries = next.filter((e) => e.day === day);
    const treat = dayEntries.some((e) => isTreat(ctx.recipes.get(e.recipeId)));
    const mains = dayEntries.filter((e) => (e.slot === 'lunch' || e.slot === 'dinner') && !isTreat(ctx.recipes.get(e.recipeId)));
    const kcal = (e: PlanEntry, servings: number) => entryNutrition({ ...e, servings }, ctx)?.kcal ?? 0;
    const total = dayEntries.reduce((s, e) => s + kcal(e, mains.includes(e) ? 1 : isTreat(ctx.recipes.get(e.recipeId)) ? 1 : e.servings), 0);
    const mainKcal = mains.reduce((s, e) => s + kcal(e, 1), 0);
    // The Gönn-Tag may go up to TREAT_EXTRA_KCAL over – a ceiling, not something to fill up.
    const target = ctx.settings.kcalTarget;
    const upper = target + (treat ? TREAT_EXTRA_KCAL : 0);
    const slack = ctx.settings.kcalTolerance;
    const goal = total > upper + slack ? upper : total < target - slack ? target : null;
    const factor = goal === null || mainKcal === 0 ? 1 : Math.min(1.8, Math.max(0.6, round1(1 + (goal - total) / mainKcal)));
    for (const e of mains) e.servings = factor;
    for (const e of dayEntries) if (isTreat(ctx.recipes.get(e.recipeId))) e.servings = 1;
  }

  const updates = next.filter((n) => {
    const old = week.entries.find((e) => e.id === n.id)!;
    return old.recipeId !== n.recipeId || old.sauceId !== n.sauceId || old.servings !== n.servings || (old.adaptedFrom ?? null) !== (n.adaptedFrom ?? null);
  });
  if (updates.length === 0) return week;
  await db.$transaction(
    updates.map((n) =>
      db.mealWeekEntry.update({ where: { id: n.id }, data: { recipeId: n.recipeId, sauceId: n.sauceId, servings: n.servings, adaptedFrom: n.adaptedFrom } })
    )
  );
  return db.mealWeek.findUniqueOrThrow({ where: { id: week.id }, include: weekInclude });
}

// ------------------------------------------------------------------ context

export interface NutritionContext {
  userId: string;
  settings: NutritionSettingsData;
  favorites: string[];
  settingsRow: Awaited<ReturnType<typeof loadSettings>>['row'];
  recipes: RecipeData[];
  school: SchoolWeek;
  plan: (weekStart: string) => PlanContext;
}

export async function loadContext(userId: string): Promise<NutritionContext> {
  await ensureNutritionCatalog();
  const [{ row, settings, favorites }, ingredients, school] = await Promise.all([loadSettings(userId), loadIngredients(), loadSchool(userId)]);
  const recipes = await loadRecipes(userId, favorites);
  const lookup = lookupOf(ingredients);
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const factor = storeFactor(settings.store);
  return {
    userId,
    settings,
    favorites,
    settingsRow: row,
    recipes,
    school,
    plan: (weekStart) => ({ settings, recipes: byId, lookup, factor, timings: timingsFor(weekStart, school, settings) }),
  };
}

/** The week's plan, created if needed and reconciled with the current settings. */
export async function loadWeek(ctx: NutritionContext, weekStart: string) {
  const plan = ctx.plan(weekStart);
  const week = await reconcileWeek(await getOrCreateWeek(ctx.userId, weekStart, ctx.settings), plan);
  return { week, plan };
}

// ------------------------------------------------------------------ view

const facts = (m: { kcal: number; protein: number; carbs: number; fat: number }, cost: number): NutritionFacts => ({ ...roundMacros(m), cost: Math.round(cost * 100) / 100 });

export function toLogView(l: { id: string; day: string; slot: string; status: string; recipeId: string | null; label: string; kcal: number; protein: number; carbs: number; fat: number; cost: number }): MealLogView {
  return {
    id: l.id,
    day: l.day,
    slot: l.slot as MealLogView['slot'],
    status: l.status as MealLogView['status'],
    recipeId: l.recipeId,
    label: l.label,
    kcal: Math.round(l.kcal),
    protein: round1(l.protein),
    carbs: round1(l.carbs),
    fat: round1(l.fat),
    cost: Math.round(l.cost * 100) / 100,
  };
}

const parseSteps = (value: string): PrepStepSeed[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const toPlanEntries = (week: WeekRow): PlanEntry[] =>
  week.entries.map((e) => ({
    id: e.id,
    day: e.day,
    slot: e.slot as MealSlot,
    recipeId: e.recipeId,
    sauceId: e.sauceId,
    servings: e.servings,
    isSwapped: e.isSwapped,
    adaptedFrom: e.adaptedFrom,
  }));

/** When the Wednesday mini prep fits in: after school, or after dinner on a training day. */
export function midweekStart(timing: DayTiming, settings: NutritionSettingsData) {
  if (timing.training) return toTime(toMinutes(timing.times.dinner) + 45);
  if (timing.schoolEnd) return toTime(Math.max(toMinutes('15:00'), Math.ceil((toMinutes(timing.schoolEnd) + settings.commuteMinutes + 20) / 5) * 5));
  return '16:00';
}

export async function buildWeekView(ctx: NutritionContext, weekStart: string, now = new Date()): Promise<WeekView> {
  const { week, plan } = await loadWeek(ctx, weekStart);
  const template = week.templateId ? await db.mealPlanTemplate.findUnique({ where: { id: week.templateId } }) : null;
  const days = Array.from({ length: 7 }, (_, i) => dayKey(dateInWeek(weekStart, i + 1)));
  const logs = await db.mealLog.findMany({ where: { userId: ctx.userId, day: { in: days } }, orderBy: { createdAt: 'asc' } });
  const today = dayKey(now);
  const entries = toPlanEntries(week);
  const settings = ctx.settings;
  const strategy = (template?.strategy ?? 'midweek') as PrepStrategy;

  const prep = buildPrep(entries, strategy, plan);
  const boxByEntry = new Map(prep.boxes.flatMap((b) => b.items.map((i) => [i.entryId, i] as const)));
  const shoppedDays = [1, 2, 3, 4, 5, ...(settings.shopWeekend ? [6, 7] : [])];

  const mealView = (e: PlanEntry): MealView | null => {
    const recipe = plan.recipes.get(e.recipeId);
    if (!recipe) return null;
    const sauce = e.sauceId ? plan.recipes.get(e.sauceId) ?? null : null;
    const n = entryNutrition(e, plan)!;
    const training = isTrainingDay(settings, e.day);
    const original = e.adaptedFrom ? plan.recipes.get(e.adaptedFrom) : null;
    const log = logs.find((l) => l.day === days[e.day - 1] && l.slot === e.slot);
    return {
      entryId: e.id,
      slot: e.slot,
      label: slotLabel(e.slot, training),
      time: plan.timings[e.day].times[e.slot],
      recipeId: recipe.id,
      name: recipe.name,
      mealType: recipe.mealType,
      eatCold: recipe.eatCold,
      sauceId: sauce?.id ?? null,
      sauceName: sauce?.name ?? null,
      servings: e.servings,
      isTreat: isTreat(recipe),
      nutrition: facts(n, n.cost),
      produce: Math.round(produceGrams(recipe) * e.servings + (sauce ? produceGrams(sauce) : 0)),
      isSwapped: e.isSwapped,
      adapted: original && original.id !== recipe.id ? { from: original.name, reason: violations(original, e.slot, e.day, plan).join(', ') || 'passt nicht mehr' } : null,
      issues: violations(recipe, e.slot, e.day, plan),
      storage: boxByEntry.get(e.id)?.storage ?? null,
      log: log ? toLogView(log) : null,
    };
  };

  const dayViews: DayView[] = days.map((date, i) => {
    const day = i + 1;
    const meals = entries
      .filter((e) => e.day === day)
      .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))
      .map(mealView)
      .filter((m): m is MealView => !!m);
    const dayLogs = logs.filter((l) => l.day === date);
    const eatenLogs = dayLogs.filter((l) => l.status !== 'skipped');
    // Produce eaten: the planned meal when it was eaten as planned, otherwise one portion of the dish.
    const producedEaten = eatenLogs.reduce((sum, l) => {
      const planned = meals.find((m) => m.slot === l.slot && m.recipeId === l.recipeId);
      if (planned && l.status === 'eaten') return sum + planned.produce;
      const recipe = l.recipeId ? plan.recipes.get(l.recipeId) : null;
      return sum + (recipe ? produceGrams(recipe) : 0);
    }, 0);
    return {
      date,
      day,
      short: WEEKDAY_SHORT[day],
      long: WEEKDAY_LONG[day],
      isToday: date === today,
      isPast: date < today,
      shopped: shoppedDays.includes(day),
      treat: meals.some((m) => m.isTreat),
      training: settings.trainingDays[String(day)] ?? 'rest',
      timing: plan.timings[day],
      meals,
      planned: facts(sumMacros(meals.map((m) => m.nutrition)), meals.reduce((s, m) => s + m.nutrition.cost, 0)),
      eaten: roundMacros(sumMacros(eatenLogs)),
      produce: { planned: meals.reduce((s, m) => s + m.produce, 0), eaten: Math.round(producedEaten) },
      extras: dayLogs.filter((l) => l.slot === 'extra').map(toLogView),
      complete: meals.length > 0 && meals.every((m) => m.log),
    };
  });

  // Prep sessions with wall-clock times.
  const steps = parseSteps(template?.prepSteps ?? '[]');
  const checks = new Set(parseIds(week.prepChecks));
  const sessions: PrepSessionView[] = [];
  const nameBySlug = new Map(Array.from(plan.recipes.values(), (r) => [r.slug, r.name] as const));
  for (const id of ['sunday', 'wednesday'] as const) {
    const cook = prep.cook[id];
    if (cook.length === 0) continue;
    // Steps for dishes that aren't cooked this time (simple days, swaps) drop out; a step shared
    // with a dish that is still cooked stays and says which part is left.
    const cooked = new Set(cook.map((c) => plan.recipes.get(c.recipeId)?.slug));
    let own = steps
      .filter((s) => s.session === id && (!s.recipes || s.recipes.some((slug) => cooked.has(slug))))
      .map((s) => {
        if (!s.recipes || s.recipes.every((slug) => cooked.has(slug))) return s;
        const left = s.recipes.filter((slug) => cooked.has(slug)).map((slug) => nameBySlug.get(slug) ?? slug);
        return { ...s, detail: `Diese Woche nur für ${left.join(' und ')}` };
      });
    // Dishes no step of the rotation week covers ("Einfach"-Woche, swaps, a salad made fresh on
    // Wednesday, snacks) are planned in: hands-on work one after the other at the counter,
    // cooking in parallel wherever a station is free. Filling boxes and cleaning up move behind
    // the last pot.
    const covered = new Set(steps.filter((s) => s.session === id).flatMap((s) => s.recipes ?? []));
    const extra = cook.filter((c) => !covered.has(plan.recipes.get(c.recipeId)?.slug ?? ''));
    if (extra.length) {
      const closing = new Set(own.filter((s) => !s.recipes && /boxen|kueche/.test(s.id)).map((s) => s.id));
      const busy = (lane: PrepStepSeed['lane']) => own.filter((s) => s.lane === lane && !closing.has(s.id)).map((s) => [s.start, s.start + s.duration] as const);
      /** Earliest start ≥ from at which the station is free for `duration` minutes. */
      const slot = (lane: PrepStepSeed['lane'], from: number, duration: number) => {
        let start = from;
        for (const [a, b] of busy(lane).sort((x, y) => x[0] - y[0])) {
          if (start + duration <= a) break;
          if (b > start) start = b;
        }
        return start;
      };
      let cookingEnd = 0;
      const byCookTime = [...extra].sort((a, b) => (plan.recipes.get(b.recipeId)?.cookMinutes ?? 0) - (plan.recipes.get(a.recipeId)?.cookMinutes ?? 0));
      for (const item of byCookTime) {
        const recipe = plan.recipes.get(item.recipeId)!;
        const boxes =
          `${item.boxes} ${item.boxes === 1 ? 'Box' : 'Boxen'}` +
          (item.freezer === 0 ? '' : item.freezer >= item.boxes ? ', direkt einfrieren' : `, ${item.freezer} davon einfrieren`);
        const sauce = recipe.mealType === 'sauce';
        const prepMin = Math.max(sauce ? 3 : 5, recipe.prepMinutes + (sauce ? recipe.cookMinutes : 0));
        const prepStart = slot('Arbeitsfläche', 0, prepMin);
        own = [...own, { id: `extra-${id}-${item.recipeId}-prep`, session: id, title: `${item.name}: ${sauce ? 'anrühren' : 'vorbereiten'}`, detail: `${boxes} – Mengen: Rezept unter „Das kochst du“ antippen`, start: prepStart, duration: prepMin, lane: 'Arbeitsfläche', active: true }];
        cookingEnd = Math.max(cookingEnd, prepStart + prepMin);
        // Salads, dips and snack boxes need no station – the counter step is all there is.
        const lanes: PrepStepSeed['lane'][] = recipe.equipment.includes('Herd') ? ['Herd', 'Herd 2'] : recipe.equipment.includes('Backofen') ? ['Ofen'] : [];
        if (sauce || recipe.cookMinutes === 0 || lanes.length === 0) continue;
        const cookMin = Math.max(5, recipe.cookMinutes);
        const [lane, cookStart] = lanes.map((l) => [l, slot(l, prepStart + prepMin, cookMin)] as const).sort((a, b) => a[1] - b[1])[0];
        own = [...own, { id: `extra-${id}-${item.recipeId}`, session: id, title: `${item.name}: ${lane === 'Ofen' ? 'backen' : 'kochen'}`, detail: boxes, start: cookStart, duration: cookMin, lane, active: false }];
        cookingEnd = Math.max(cookingEnd, cookStart + cookMin);
      }
      const closingSteps = own.filter((s) => closing.has(s.id));
      const firstClosing = Math.min(...closingSteps.map((s) => s.start));
      if (closingSteps.length && cookingEnd > firstClosing) {
        own = own.map((s) => (closing.has(s.id) ? { ...s, start: s.start + (cookingEnd - firstClosing) } : s));
      }
    }
    const date = id === 'sunday' ? dayKey(addDays(parseDay(weekStart), -1)) : days[2];
    const start = id === 'sunday' ? settings.prepStartTime : midweekStart(plan.timings[3], settings);
    const base = toMinutes(start);
    const minutes = own.reduce((m, s) => Math.max(m, s.start + s.duration), 0);
    const stepViews = own
      .map((s) => ({ ...s, at: toTime(base + s.start), until: toTime(base + s.start + s.duration), done: checks.has(s.id) }))
      .sort((a, b) => a.start - b.start || a.lane.localeCompare(b.lane));
    sessions.push({
      id,
      label: id === 'sunday' ? 'Sonntags-Prep' : 'Mini-Prep am Mittwoch',
      date,
      start,
      end: toTime(base + minutes),
      minutes,
      steps: stepViews,
      cook,
      done: stepViews.length > 0 && stepViews.every((s) => s.done),
    });
  }

  const mealById = new Map(dayViews.flatMap((d) => d.meals.map((m) => [m.entryId, m] as const)));
  const boxes = prep.boxes.map((b) => ({
    day: b.day,
    short: WEEKDAY_SHORT[b.day],
    items: b.items.map((i) => ({ ...mealById.get(i.entryId)!, thaw: i.thaw, age: i.age, problem: i.problem, session: i.session })).filter((i) => i.entryId),
  }));

  const shoppedEntries = entries.filter((e) => shoppedDays.includes(e.day));
  const shopping = buildShopping(shoppedEntries, plan);
  const over = shopping.usedCost - settings.weeklyBudget;
  const proteinDays = dayViews.filter((d) => d.eaten.protein >= settings.proteinMin).length;
  const plannedDays = dayViews.filter((d) => d.meals.length > 0);

  const warnings = [
    ...prep.warnings,
    ...dayViews.flatMap((d) => d.meals.filter((m) => m.issues.length).map((m) => `${d.short} ${m.label}: ${m.name} – ${m.issues.join(', ')}`)),
  ];

  const monday = parseDay(weekStart);
  const sunday = addDays(monday, 6);
  return {
    weekStart,
    label: `${monday.getDate()}.${monday.getMonth() + 1}. – ${sunday.getDate()}.${sunday.getMonth() + 1}.`,
    isCurrent: weekStart === weekStartOf(now),
    simple: week.simple,
    template: template ? toTemplateSummary(template) : null,
    exportedAt: week.exportedAt?.toISOString() ?? null,
    days: dayViews,
    average: facts(
      scaleMacros(plannedDays.length ? sumMacros(plannedDays.map((d) => d.planned)) : ZERO, 1 / Math.max(1, plannedDays.length)),
      plannedDays.reduce((s, d) => s + d.planned.cost, 0) / Math.max(1, plannedDays.length)
    ),
    prep: { sessions, boxes, warnings: prep.warnings },
    shopping: { ...shopping, days: shoppedDays },
    budget: {
      limit: settings.weeklyBudget,
      used: Math.round(shopping.usedCost * 100) / 100,
      over: Math.round(over * 100) / 100,
      suggestions: over > 0 ? budgetSuggestions(shoppedEntries.filter((e) => !e.isSwapped), plan) : [],
    },
    goal: { proteinDays, target: 5, reached: proteinDays >= 5 },
    warnings: [...new Set(warnings)],
  };
}

export function toTemplateSummary(t: { id: string; number: number; name: string; theme: string; sauceBase: string; strategy: string; description: string }): TemplateSummary {
  return { id: t.id, number: t.number, name: t.name, theme: t.theme, sauceBase: t.sauceBase, strategy: t.strategy as PrepStrategy, description: t.description };
}

export async function listTemplates() {
  const rows = await db.mealPlanTemplate.findMany({ orderBy: { number: 'asc' } });
  return rows.map(toTemplateSummary);
}

/** Switches a whole week between recipes and "Einfach" – the shopping list is for the week, too. */
export async function setSimpleWeek(userId: string, weekStart: string, simple: boolean, settings: NutritionSettingsData) {
  const week = await getOrCreateWeek(userId, weekStart, settings);
  // A dish swapped by hand in recipe mode doesn't carry over into the other mode.
  await db.$transaction([
    db.mealWeekEntry.updateMany({ where: { weekId: week.id, slot: { in: ['lunch', 'dinner'] } }, data: { isSwapped: false, adaptedFrom: null } }),
    db.mealWeek.update({ where: { id: week.id }, data: { simple } }),
  ]);
}

export { recipeNutrition, parseIds };
