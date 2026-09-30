import { addDays } from 'date-fns';
import { db } from '@/lib/db';
import { dayKey, isoWeekday, parseDay, shiftWeek, weekStartOf } from '../dates';
import { formatEuro } from '@/lib/format';
import type { WeekView } from '../views';
import { buildWeekView, loadContext, type NutritionContext } from './week';

/**
 * Nutrition reminders are ordinary reminders (category "Ernährung") that this module keeps
 * in sync for the next seven days: created, moved when the plan or the timetable changes,
 * and removed when switched off. Each carries a sourceKey, so a sync never duplicates.
 */

interface Wanted {
  sourceKey: string;
  title: string;
  date: string;
  time: string;
  link: string;
  priority: 'low' | 'medium' | 'high';
  /** true closes the reminder (the thing happened); only the check-in also reopens. */
  isDone?: boolean;
}

const HORIZON_DAYS = 7;
const SHOPPING_TIME = '10:00';

const listNames = (names: string[]) => [...new Set(names)].join(', ');

export async function syncNutritionReminders(ctx: NutritionContext, now = new Date()) {
  const s = ctx.settings;
  const views = new Map<string, WeekView>();
  const view = async (weekStart: string) => {
    if (!views.has(weekStart)) views.set(weekStart, await buildWeekView(ctx, weekStart, now));
    return views.get(weekStart)!;
  };

  const wanted: Wanted[] = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let offset = 0; offset < HORIZON_DAYS; offset++) {
    const date = addDays(today, offset);
    const key = dayKey(date);
    const weekday = isoWeekday(date);
    const weekStart = weekStartOf(date);
    const week = await view(weekStart);
    const day = week.days[weekday - 1];

    if (s.reminders.shopping && weekday === 6) {
      const next = await view(shiftWeek(weekStart, 1));
      wanted.push({
        sourceKey: `nutrition:shopping:${next.weekStart}`,
        title: `Einkaufen für Meal Prep${next.template ? ` – Woche ${next.template.number} ${next.template.name}` : ''} (ca. ${formatEuro(next.budget.used, 0)})`,
        date: key,
        time: SHOPPING_TIME,
        link: 'nutrition:shopping',
        priority: 'medium',
      });
    }

    if (s.reminders.prep && weekday === 7) {
      const next = await view(shiftWeek(weekStart, 1));
      const sunday = next.prep.sessions.find((p) => p.id === 'sunday');
      if (sunday) {
        wanted.push({
          sourceKey: `nutrition:prep:${next.weekStart}`,
          title: `Meal Prep starten – ${sunday.minutes} min, bis ca. ${sunday.end}`,
          date: key,
          time: sunday.start,
          link: 'nutrition:prep',
          priority: 'high',
          isDone: sunday.done,
        });
      }
    }

    if (s.reminders.midweek && weekday === 3) {
      const mini = week.prep.sessions.find((p) => p.id === 'wednesday');
      if (mini) {
        wanted.push({
          sourceKey: `nutrition:midweek:${key}`,
          title: `Mini-Prep: ${listNames(mini.cook.filter((c) => c.mealType !== 'sauce').map((c) => c.name))} (${mini.minutes} min)`,
          date: key,
          time: mini.start,
          link: 'nutrition:prep',
          priority: 'medium',
          isDone: mini.done,
        });
      }
    }

    if (s.reminders.eveningBefore) {
      const tomorrow = addDays(date, 1);
      const tWeekday = isoWeekday(tomorrow);
      const tWeek = await view(weekStartOf(tomorrow));
      const box = tWeek.prep.boxes.find((b) => b.day === tWeekday);
      const thaw = box?.items.filter((i) => i.thaw) ?? [];
      const tDay = tWeek.days[tWeekday - 1];
      const packed = tDay.timing.hasSchool
        ? tDay.meals.filter((m) => m.slot === 'snack' || (m.slot === 'lunch' && tDay.timing.lunchAtSchool))
        : [];
      if (thaw.length || packed.length) {
        const parts = [
          thaw.length ? `${listNames(thaw.map((i) => i.name))} aus dem TK in den Kühlschrank` : '',
          packed.length ? `Jause & Box einpacken: ${listNames(packed.map((m) => m.name))}` : '',
        ].filter(Boolean);
        wanted.push({
          sourceKey: `nutrition:evening:${key}`,
          title: `Für morgen: ${parts.join(' · ')}`,
          date: key,
          time: s.eveningTime,
          link: 'nutrition:prep',
          priority: thaw.length ? 'high' : 'medium',
        });
      }
    }

    if (s.reminders.preWorkout && day.timing.training) {
      const snack = day.meals.find((m) => m.slot === 'afternoon');
      wanted.push({
        sourceKey: `nutrition:preworkout:${key}`,
        title: `Pre-Workout: ${snack?.name ?? 'Snack'} – Training um ${day.timing.training.start}`,
        date: key,
        time: day.timing.times.afternoon,
        link: 'nutrition:today',
        priority: 'medium',
        isDone: !!snack?.log,
      });
    }

    if (s.reminders.checkIn && day.meals.length > 0) {
      wanted.push({
        sourceKey: `nutrition:checkin:${key}`,
        title: 'Mahlzeiten abhaken?',
        date: key,
        time: s.checkInTime,
        link: 'nutrition:today',
        priority: 'low',
        isDone: day.complete,
      });
    }
  }

  const existing = await db.reminder.findMany({ where: { userId: ctx.userId, sourceKey: { startsWith: 'nutrition:' } } });
  const byKey = new Map(existing.map((r) => [r.sourceKey!, r]));
  const wantedKeys = new Set(wanted.map((w) => w.sourceKey));
  const todayKey = dayKey(today);

  for (const w of wanted) {
    const dueDate = parseDay(w.date);
    const current = byKey.get(w.sourceKey);
    if (!current) {
      await db.reminder.create({
        data: {
          userId: ctx.userId,
          sourceKey: w.sourceKey,
          title: w.title,
          category: 'Ernährung',
          icon: 'utensils',
          reminderType: 'action',
          hasDueDate: true,
          dueDate,
          dueTime: w.time,
          link: w.link,
          priority: w.priority,
          isDone: w.isDone ?? false,
        },
      });
      continue;
    }
    const isDone = w.isDone === true ? true : w.isDone === false && w.sourceKey.startsWith('nutrition:checkin:') ? false : current.isDone;
    const changed =
      current.title !== w.title ||
      current.dueTime !== w.time ||
      current.link !== w.link ||
      !current.dueDate ||
      dayKey(current.dueDate) !== w.date ||
      current.isDone !== isDone;
    if (changed) {
      await db.reminder.update({ where: { id: current.id }, data: { title: w.title, dueDate, dueTime: w.time, link: w.link, isDone } });
    }
  }

  // From a day that's over, or open but no longer wanted (switched off, different plan).
  const remove = existing
    .filter((r) => (r.dueDate && dayKey(r.dueDate) < todayKey) || (!wantedKeys.has(r.sourceKey!) && !r.isDone))
    .map((r) => r.id);
  if (remove.length) await db.reminder.deleteMany({ where: { id: { in: remove } } });

  await db.nutritionSettings.update({ where: { userId: ctx.userId }, data: { remindersSyncedAt: now } });
  return { wanted: wanted.length, removed: remove.length };
}

const SYNC_EVERY_MS = 30 * 60 * 1000;

/**
 * Cheap check for the dashboard: re-syncs when the last sync is older than half an hour or
 * from another day. Does nothing until the Ernährung mode was opened once.
 */
export async function ensureNutritionReminders(userId: string, now = new Date()) {
  const settings = await db.nutritionSettings.findUnique({ where: { userId }, select: { remindersSyncedAt: true } });
  if (!settings) return;
  const last = settings.remindersSyncedAt;
  if (last && now.getTime() - last.getTime() < SYNC_EVERY_MS && dayKey(last) === dayKey(now)) return;
  await syncNutritionReminders(await loadContext(userId), now);
}

/** Forces the next dashboard load to re-sync (after settings, plan or timetable changes). */
export async function invalidateNutritionReminders(userId: string) {
  await db.nutritionSettings.updateMany({ where: { userId }, data: { remindersSyncedAt: null } });
}
