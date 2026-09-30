import { addDays, format, getISOWeek } from 'date-fns';

/** Calendar helpers on local days (yyyy-MM-dd), the same convention as HabitLog.day. */

export const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');

/** "yyyy-MM-dd" → local midnight. */
export function parseDay(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export const isDayKey = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** ISO weekday, 1 = Monday … 7 = Sunday. */
export const isoWeekday = (date: Date) => date.getDay() || 7;

export function mondayOf(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - (isoWeekday(d) - 1));
  return d;
}

export const weekStartOf = (date: Date) => dayKey(mondayOf(date));

/** Date of weekday `day` (1–7) in the week starting at `weekStart`. */
export const dateInWeek = (weekStart: string, day: number) => addDays(parseDay(weekStart), day - 1);

export const shiftWeek = (weekStart: string, weeks: number) => dayKey(addDays(parseDay(weekStart), weeks * 7));

/** Rotation week (1–4) a calendar week falls on when nothing was chosen – follows the ISO week. */
export const rotationFor = (weekStart: string) => ((getISOWeek(parseDay(weekStart)) - 1) % 4) + 1;

export const WEEKDAY_SHORT = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const WEEKDAY_LONG = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const toTime = (minutes: number) => {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
};

/** Rounds to the next 5 minutes – meal times like 12:13 look like a bug. */
export const roundUp5 = (minutes: number) => Math.ceil(minutes / 5) * 5;
export const round5 = (minutes: number) => Math.round(minutes / 5) * 5;
