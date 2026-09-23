// Shared by server and client – keep free of server-only imports.
import type { Grade, GradeKind, Subject } from '@/types';
import { DEFAULT_GRADE_WEIGHT } from '@/lib/school';
import type { VmmSubjectLink } from './vmm-link';

/** A grade from either source, in one shape the whole school view can work with. */
export interface UnifiedGrade {
  id: string;
  source: 'app' | 'vmm';
  subjectId: string | null;
  value: number;
  weight: number;
  kind: GradeKind;
  /** ISO string; VMM marks occasionally arrive without one. */
  date: string | null;
  title: string | null;
  /** VMM's own label for the assessment type, e.g. "MIU". */
  category: string | null;
}

/**
 * VMM files assessments under the category the Leistungsbeurteilungsverordnung uses.
 * Only the ones that are unambiguous get mapped; the rest count as a normal test.
 */
export function kindFromCategory(category: string | null, title: string | null): GradeKind {
  const text = `${category ?? ''} ${title ?? ''}`.toLowerCase();
  if (/\bsa\b|schularbeit/.test(text)) return 'schularbeit';
  if (/\bmiu\b|mitarbeit/.test(text)) return 'mitarbeit';
  if (/\bwh\b|test|prüfung|pruefung/.test(text)) return 'test';
  return 'test';
}

const toUnifiedFromApp = (grade: Grade): UnifiedGrade => ({
  id: grade.id,
  source: 'app',
  subjectId: grade.subjectId ?? null,
  value: grade.value,
  weight: grade.weight,
  kind: grade.kind,
  date: grade.date,
  title: grade.title ?? null,
  category: null,
});

const DAY = 86_400_000;

/**
 * The same test can sit in both places: entered by hand and later published in VMM.
 * Same subject, same grade and at most a few days apart means it's one assessment –
 * and VMM is the official record, so that copy wins.
 */
const isSameAssessment = (a: UnifiedGrade, b: UnifiedGrade) => {
  if (a.subjectId !== b.subjectId || a.value !== b.value) return false;
  if (!a.date || !b.date) return true;
  return Math.abs(new Date(a.date).getTime() - new Date(b.date).getTime()) <= 4 * DAY;
};

/** Manual grades and VMM marks in one list, newest first, duplicates folded together. */
export function mergeGrades(grades: Grade[], links: VmmSubjectLink[]): UnifiedGrade[] {
  const fromVmm: UnifiedGrade[] = [];
  for (const link of links) {
    for (const entry of link.graded) {
      const kind = kindFromCategory(entry.mark.category, entry.mark.title);
      fromVmm.push({
        id: `vmm-${link.group.id}-${entry.mark.id ?? entry.mark.title}-${entry.mark.date ?? ''}`,
        source: 'vmm',
        subjectId: link.subject?.id ?? null,
        value: entry.value,
        // VMM sends no weighting, so the app's own rule applies – the same one manual grades use.
        weight: entry.mark.weight && entry.mark.weight > 0 ? entry.mark.weight : DEFAULT_GRADE_WEIGHT[kind],
        kind,
        date: entry.mark.date,
        title: entry.mark.title,
        category: entry.mark.category,
      });
    }
  }

  // A manual grade only survives when VMM doesn't already know that assessment.
  const kept = grades.map(toUnifiedFromApp).filter((own) => !own.subjectId || !fromVmm.some((mark) => isSameAssessment(own, mark)));

  return [...fromVmm, ...kept].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
}

export interface SubjectGrades {
  subject: Subject;
  grades: UnifiedGrade[];
  average: number | null;
  /** VMM group behind this subject, when there is one. */
  vmm: VmmSubjectLink | null;
}

/** The merged grades grouped per subject, including subjects VMM covers but the app doesn't. */
export function bySubject(merged: UnifiedGrade[], subjects: Subject[], links: VmmSubjectLink[]): SubjectGrades[] {
  return subjects
    .map((subject) => {
      const list = merged.filter((g) => g.subjectId === subject.id);
      const totalWeight = list.reduce((s, g) => s + g.weight, 0);
      return {
        subject,
        grades: list,
        average: totalWeight > 0 ? Math.round((list.reduce((s, g) => s + g.value * g.weight, 0) / totalWeight) * 100) / 100 : null,
        vmm: links.find((l) => l.subject?.id === subject.id) ?? null,
      };
    })
    .filter((row) => row.grades.length > 0 || row.vmm !== null)
    .sort((a, b) => a.subject.name.localeCompare(b.subject.name, 'de'));
}

/** Merged grades in the shape the study planner expects. */
export const toPlannerGrades = (merged: UnifiedGrade[]) =>
  merged.filter((g) => g.subjectId).map((g) => ({ subjectId: g.subjectId, value: g.value, weight: g.weight }));
