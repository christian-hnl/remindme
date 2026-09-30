import { dayKey, parseDay, shiftWeek, weekStartOf } from '../dates';
import { buildWeekView, loadContext, nutritionEnabled } from './week';

export interface PrepCalendarEvent {
  key: string;
  title: string;
  description: string;
  /** Noon of the day, so time-zone maths can't slip it to the day before. */
  date: Date;
  start: string;
  end: string;
}

/** Prep sessions of this and next week for the iCal feed. */
export async function nutritionCalendar(userId: string, now = new Date()): Promise<PrepCalendarEvent[]> {
  if (!(await nutritionEnabled(userId))) return [];
  const ctx = await loadContext(userId);
  const events: PrepCalendarEvent[] = [];
  const today = dayKey(now);
  for (const weekStart of [weekStartOf(now), shiftWeek(weekStartOf(now), 1)]) {
    const view = await buildWeekView(ctx, weekStart, now);
    for (const session of view.prep.sessions) {
      if (session.date < today) continue;
      const date = parseDay(session.date);
      date.setHours(12);
      const dishes = session.cook.map((c) => `${c.name} ×${c.boxes}${c.freezer ? ` (${c.freezer} ins TK)` : ''}`);
      events.push({
        key: `${weekStart}-${session.id}`,
        title: `${session.label}${view.template ? ` – Woche ${view.template.number} ${view.template.name}` : ''}`,
        description: [
          `${session.minutes} Minuten, ${session.start}–${session.end}`,
          '',
          'Kochen:',
          ...dishes.map((d) => `• ${d}`),
          '',
          'Ablauf:',
          ...session.steps.map((s) => `${s.at} ${s.title}`),
        ].join('\n'),
        date,
        start: session.start,
        end: session.end,
      });
    }
  }
  return events;
}
