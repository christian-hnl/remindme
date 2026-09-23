// Shared by server and client – keep free of server-only imports.
import type { GradeKind, Subject } from '@/types';
import { GRADE_KIND_LABELS } from '@/lib/school';
import { POSITIVE_LIMIT } from './planner';
import type { SubjectGrades, UnifiedGrade } from './grades';

const round2 = (n: number) => Math.round(n * 100) / 100;

const average = (grades: UnifiedGrade[]) => {
  const weight = grades.reduce((s, g) => s + g.weight, 0);
  return weight > 0 ? round2(grades.reduce((s, g) => s + g.value * g.weight, 0) / weight) : null;
};

export interface MonthPoint {
  key: string;
  label: string;
  average: number;
  count: number;
}

export interface SubjectStat {
  subject: Subject;
  average: number;
  count: number;
  /** Difference between the newer and the older half of the grades; negative = improving. */
  trend: number | null;
  atRisk: boolean;
}

export interface GradeStats {
  count: number;
  /** Over every single grade, weighted – what the year actually looks like. */
  overall: number | null;
  /** Average of the subject averages – every subject counts the same. */
  perSubject: number | null;
  distribution: { grade: number; count: number; share: number }[];
  subjects: SubjectStat[];
  best: SubjectStat | null;
  worst: SubjectStat | null;
  atRisk: SubjectStat[];
  months: MonthPoint[];
  /** Change from the first to the last month with grades; negative = improving. */
  trend: number | null;
  byKind: { kind: GradeKind; label: string; count: number; average: number }[];
  bySource: { app: number; vmm: number };
  positiveShare: number;
}

const monthKey = (iso: string) => iso.slice(0, 7);

/** Everything the statistics view shows, computed once from the merged grades. */
export function buildGradeStats(merged: UnifiedGrade[], rows: SubjectGrades[]): GradeStats {
  const withDate = merged.filter((g) => g.date);

  const distribution = [1, 2, 3, 4, 5].map((grade) => {
    const count = merged.filter((g) => Math.round(g.value) === grade).length;
    return { grade, count, share: merged.length ? Math.round((count / merged.length) * 100) : 0 };
  });

  const subjects: SubjectStat[] = rows
    .filter((row): row is SubjectGrades & { average: number } => row.average !== null)
    .map((row) => {
      // Newest half against the older half – enough for a direction, not a forecast.
      const dated = row.grades.filter((g) => g.date).sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
      const half = Math.floor(dated.length / 2);
      const older = average(dated.slice(0, half));
      const newer = average(dated.slice(half));
      return {
        subject: row.subject,
        average: row.average,
        count: row.grades.length,
        trend: dated.length >= 4 && older !== null && newer !== null ? round2(newer - older) : null,
        atRisk: row.average > POSITIVE_LIMIT,
      };
    })
    .sort((a, b) => a.average - b.average);

  const months: MonthPoint[] = [...new Set(withDate.map((g) => monthKey(g.date!)))]
    .sort()
    .map((key) => {
      const list = withDate.filter((g) => monthKey(g.date!) === key);
      const [year, month] = key.split('-');
      return {
        key,
        label: ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][Number(month) - 1] + ` ${year.slice(2)}`,
        average: average(list)!,
        count: list.length,
      };
    });

  const byKind = (['schularbeit', 'test', 'mitarbeit', 'sonstiges'] as GradeKind[])
    .map((kind) => {
      const list = merged.filter((g) => g.kind === kind);
      return { kind, label: GRADE_KIND_LABELS[kind], count: list.length, average: average(list) ?? 0 };
    })
    .filter((entry) => entry.count > 0);

  const perSubject = subjects.length ? round2(subjects.reduce((s, x) => s + x.average, 0) / subjects.length) : null;

  return {
    count: merged.length,
    overall: average(merged),
    perSubject,
    distribution,
    subjects,
    // Calling the only subject the strongest one says nothing – a comparison needs two.
    best: subjects.length > 1 ? subjects[0] : null,
    worst: subjects.length > 1 ? subjects[subjects.length - 1] : null,
    atRisk: subjects.filter((s) => s.atRisk),
    months,
    trend: months.length >= 2 ? round2(months[months.length - 1].average - months[0].average) : null,
    byKind,
    bySource: { app: merged.filter((g) => g.source === 'app').length, vmm: merged.filter((g) => g.source === 'vmm').length },
    positiveShare: merged.length ? Math.round((merged.filter((g) => g.value <= 4).length / merged.length) * 100) : 0,
  };
}
