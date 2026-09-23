// Shared by server and client – keep free of server-only imports.
import type { Exam, Subject } from '@/types';
import { DEFAULT_GRADE_WEIGHT, daysUntil, weightedAverage } from '@/lib/school';

/** Anything that carries a grade for a subject – app grades as well as VMM marks. */
export interface PlannerGrade {
  subjectId?: string | null;
  value: number;
  weight: number;
}

/**
 * A final grade of 4 still counts as passed; from 4.5 upwards it tips into a 5. Everything
 * here works with that line, because "bleibe ich positiv?" is the question that matters.
 */
export const POSITIVE_LIMIT = 4.49;

/** The percentage key most Austrian schools use; per-subject keys can override it later. */
export const GRADE_SCALE: { grade: number; minPercent: number }[] = [
  { grade: 1, minPercent: 89 },
  { grade: 2, minPercent: 76 },
  { grade: 3, minPercent: 63 },
  { grade: 4, minPercent: 50 },
  { grade: 5, minPercent: 0 },
];

export const percentFor = (grade: number) => GRADE_SCALE.find((s) => s.grade === Math.ceil(grade))?.minPercent ?? 50;

/** Exam kinds weigh like the grade kinds they produce. */
const weightForExam = (kind: Exam['kind']) =>
  kind === 'schularbeit' ? DEFAULT_GRADE_WEIGHT.schularbeit : kind === 'referat' ? DEFAULT_GRADE_WEIGHT.sonstiges : DEFAULT_GRADE_WEIGHT.test;

/**
 * The worst grade on this exam that still keeps the average at or below `target`.
 * Returns null when even a 1 wouldn't be enough, or 1..5 otherwise.
 */
export function neededGrade(grades: { value: number; weight: number }[], examWeight: number, target: number): number | null {
  const sum = grades.reduce((s, g) => s + g.value * g.weight, 0);
  const totalWeight = grades.reduce((s, g) => s + g.weight, 0);
  const allowed = (target * (totalWeight + examWeight) - sum) / examWeight;
  if (allowed < 1) return null;
  // Grades are whole numbers, so round down to what actually gets you there.
  return Math.min(5, Math.floor(allowed + 1e-9));
}

export interface ExamPlanEntry {
  exam: Exam;
  subjectName: string;
  days: number;
  weekKey: string;
  /** Other exams in the same calendar week. */
  sameWeek: number;
  average: number | null;
  gradeCount: number;
  examWeight: number;
  /** Worst grade that still keeps the subject positive (null = not reachable). */
  keepPositive: number | null;
  /** What it takes to reach the next better whole grade, when that's in range. */
  improveTo: { target: number; needed: number } | null;
  /** Grade the plan suggests aiming for, with the percentage that usually means. */
  aim: number;
  aimPercent: number;
  risk: 'hoch' | 'mittel' | 'niedrig';
  priority: number;
  reasons: string[];
}

const isoWeekKey = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-KW${String(week).padStart(2, '0')}`;
};

/**
 * Turns exams, grades and subjects into a study plan: what each exam needs, how risky it is
 * and in which order to tackle a week that carries several of them.
 */
export function buildExamPlan(exams: Exam[], grades: PlannerGrade[], subjects: Subject[], now = new Date(), horizonDays = 45): ExamPlanEntry[] {
  const upcoming = exams
    .filter((e) => !e.isDone && daysUntil(new Date(e.date), now) >= 0 && daysUntil(new Date(e.date), now) <= horizonDays)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const weekCounts = new Map<string, number>();
  for (const exam of upcoming) {
    const key = isoWeekKey(new Date(exam.date));
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
  }

  const entries = upcoming.map((exam) => {
    const subjectGrades = grades.filter((g) => g.subjectId && g.subjectId === exam.subjectId).map((g) => ({ value: g.value, weight: g.weight }));
    const average = weightedAverage(subjectGrades);
    const examWeight = weightForExam(exam.kind);
    const days = daysUntil(new Date(exam.date), now);
    const weekKey = isoWeekKey(new Date(exam.date));
    const sameWeek = (weekCounts.get(weekKey) ?? 1) - 1;

    const keepPositive = neededGrade(subjectGrades, examWeight, POSITIVE_LIMIT);
    const rounded = average === null ? null : Math.round(average);
    const improveTarget = rounded !== null && rounded > 1 ? rounded - 1 : null;
    const improveNeeded = improveTarget === null ? null : neededGrade(subjectGrades, examWeight, improveTarget + 0.49);
    const improveTo = improveTarget !== null && improveNeeded !== null ? { target: improveTarget, needed: improveNeeded } : null;

    // Aim for the improvement when it's in reach, otherwise hold the current grade –
    // never suggest something worse than what the average already is.
    const hold = rounded ?? 3;
    const aim = improveTo ? improveTo.needed : Math.min(keepPositive ?? 1, hold);

    const risk: ExamPlanEntry['risk'] =
      keepPositive === null || (average !== null && average >= 3.5) ? 'hoch' : average !== null && average >= 2.5 ? 'mittel' : 'niedrig';

    const reasons: string[] = [];
    if (keepPositive === null) reasons.push('Selbst eine 1 reicht rechnerisch nicht mehr – sprich mit der Lehrkraft.');
    else if (keepPositive <= 4) reasons.push(`Du brauchst mindestens eine ${keepPositive}, um positiv zu bleiben.`);
    if (average !== null && average >= 3.5) reasons.push(`Schnitt steht bei ${average.toFixed(2)} – der Test entscheidet viel.`);
    if (exam.kind === 'schularbeit') reasons.push('Schularbeit zählt doppelt.');
    if (sameWeek > 0) reasons.push(`${sameWeek + 1} Prüfungen in derselben Woche.`);
    if (days <= 3) reasons.push(days === 0 ? 'Heute!' : `Nur noch ${days} ${days === 1 ? 'Tag' : 'Tage'}.`);
    if (average === null) reasons.push('Noch keine Note in dem Fach – Schnitt lässt sich nicht berechnen.');

    // Sooner, heavier and riskier exams come first; a crowded week pushes everything up.
    const urgency = Math.max(0, 30 - days) / 30;
    const riskScore = risk === 'hoch' ? 1 : risk === 'mittel' ? 0.55 : 0.2;
    const priority = Math.round((urgency * 45 + riskScore * 35 + (examWeight / 2) * 12 + Math.min(sameWeek, 2) * 4) * 10) / 10;

    return {
      exam,
      subjectName: exam.subject?.name ?? subjects.find((s) => s.id === exam.subjectId)?.name ?? 'Ohne Fach',
      days,
      weekKey,
      sameWeek,
      average,
      gradeCount: subjectGrades.length,
      examWeight,
      keepPositive,
      improveTo,
      aim,
      aimPercent: percentFor(aim),
      risk,
      priority,
      reasons,
    };
  });

  return entries.sort((a, b) => b.priority - a.priority || a.days - b.days);
}

export interface ExamWeek {
  weekKey: string;
  label: string;
  start: Date;
  entries: ExamPlanEntry[];
}

/** The plan grouped by calendar week, so a crowded week can be split up sensibly. */
export function groupByWeek(entries: ExamPlanEntry[]): ExamWeek[] {
  const weeks = new Map<string, ExamPlanEntry[]>();
  for (const entry of entries) weeks.set(entry.weekKey, [...(weeks.get(entry.weekKey) ?? []), entry]);

  return [...weeks.entries()]
    .map(([weekKey, list]) => {
      const dates = list.map((e) => new Date(e.exam.date).getTime());
      const first = new Date(Math.min(...dates));
      const start = new Date(first);
      start.setDate(first.getDate() - ((first.getDay() || 7) - 1));
      return {
        weekKey,
        label: weekKey.split('-')[1].replace('KW', 'KW '),
        start,
        entries: [...list].sort((a, b) => b.priority - a.priority),
      };
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Splits the available study time over a week's exams, weighted by their priority. */
export function shareOfTime(entries: ExamPlanEntry[]): { entry: ExamPlanEntry; share: number }[] {
  const total = entries.reduce((sum, e) => sum + e.priority, 0);
  if (total <= 0) return entries.map((entry) => ({ entry, share: Math.round(100 / entries.length) }));
  return entries.map((entry) => ({ entry, share: Math.round((entry.priority / total) * 100) }));
}
