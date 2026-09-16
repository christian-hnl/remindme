import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { de } from 'date-fns/locale';

export const formatEuro = (value: number, digits = 2) =>
  `${value.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })} €`;

/** Value for <input type="date"> in local time (toISOString would shift to UTC). */
export const toDateInput = (date: Date) => format(date, 'yyyy-MM-dd');

/** Value for <input type="datetime-local"> in local time. */
export const toDateTimeInput = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");

/** Parses "yyyy-MM-dd" as local midnight (new Date("yyyy-MM-dd") would be UTC midnight). */
export const fromDateInput = (value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function relativeDayLabel(date: Date) {
  if (isToday(date)) return 'Heute';
  if (isTomorrow(date)) return 'Morgen';
  if (isYesterday(date)) return 'Gestern';
  return format(date, 'EEE, dd. MMM', { locale: de });
}

export const timeToMinutes = (time?: string | null) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const minutesToTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export const parseAmount = (value: string) => {
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};
