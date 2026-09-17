// Shared by server and client code – keep free of server-only imports.
import type { ExamKind, GradeKind } from '@/types';

export const EXAM_KINDS: ExamKind[] = ['schularbeit', 'test', 'pruefung', 'referat', 'sonstiges'];

export const EXAM_KIND_LABELS: Record<ExamKind, string> = {
  schularbeit: 'Schularbeit',
  test: 'Test',
  pruefung: 'Prüfung',
  referat: 'Referat',
  sonstiges: 'Sonstiges',
};

/** Days before an exam to start studying. */
export const STUDY_LEAD_DAYS: Record<ExamKind, number> = {
  schularbeit: 7,
  pruefung: 7,
  test: 3,
  referat: 5,
  sonstiges: 2,
};

export const GRADE_KINDS: GradeKind[] = ['schularbeit', 'test', 'mitarbeit', 'sonstiges'];

export const GRADE_KIND_LABELS: Record<GradeKind, string> = {
  schularbeit: 'Schularbeit',
  test: 'Test',
  mitarbeit: 'Mitarbeit',
  sonstiges: 'Sonstiges',
};

export const DEFAULT_GRADE_WEIGHT: Record<GradeKind, number> = {
  schularbeit: 2,
  test: 1,
  mitarbeit: 0.5,
  sonstiges: 1,
};

export const GRADE_NAMES: Record<number, string> = {
  1: 'Sehr gut',
  2: 'Gut',
  3: 'Befriedigend',
  4: 'Genügend',
  5: 'Nicht genügend',
};

export function weightedAverage(grades: { value: number; weight: number }[]): number | null {
  const total = grades.reduce((sum, g) => sum + g.weight, 0);
  if (total <= 0) return null;
  return grades.reduce((sum, g) => sum + g.value * g.weight, 0) / total;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Whole calendar days from today until the date (negative when past). */
export function daysUntil(date: Date, now = new Date()) {
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000);
}

/** Guesses the exam kind from Untis lesson text ("2. Schularbeit" → schularbeit). */
export function guessExamKindFromText(text: string): ExamKind {
  const t = text.toLowerCase();
  if (/schularbeit|\bsa\b/.test(t)) return 'schularbeit';
  if (/test|\bko\b|kurztest/.test(t)) return 'test';
  if (/referat|pr[äa]sentation/.test(t)) return 'referat';
  if (/pr[üu]fung|klausur/.test(t)) return 'pruefung';
  return 'sonstiges';
}

/** A lesson counts as "current" up to this many minutes after it officially ends. */
export const LESSON_GRACE_MIN = 5;
/** A lesson counts as "coming up" starting this many minutes before it starts. */
export const LESSON_LEAD_MIN = 10;

/** 'current' from start to end+grace, 'upcoming' from start-lead to start, else null. */
export function lessonPhase(startMin: number, endMin: number, minutesNow: number): 'current' | 'upcoming' | null {
  if (minutesNow >= startMin && minutesNow < endMin + LESSON_GRACE_MIN) return 'current';
  if (minutesNow >= startMin - LESSON_LEAD_MIN && minutesNow < startMin) return 'upcoming';
  return null;
}

export function countdownLabel(days: number) {
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  if (days === -1) return 'gestern';
  return days > 0 ? `in ${days} Tagen` : `vor ${-days} Tagen`;
}

/** Next occurrence of a birthday (today counts). */
export function nextBirthday(month: number, day: number, now = new Date()) {
  const today = startOfDay(now);
  let next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day);
  return next;
}
