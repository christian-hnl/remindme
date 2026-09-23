// Shared by server and client – keep free of server-only imports.
import type { Subject, VmmGroup, VmmMark } from '@/types';

const fold = (value: string) =>
  value
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c] ?? c);

const normalize = (value: string) => fold(value).replace(/[^a-z0-9]/g, '');

/** Words of a group name – "POS · Christoph Schreiber" → ["pos", "christoph", "schreiber"]. */
const words = (value: string) => fold(value).split(/[^a-z0-9]+/).filter(Boolean);

/**
 * Untis codes carry the group along ("POS1", "BWM_3", "SENCYB_1") while VMM only knows the
 * plain subject ("POS"). Comparing both the full code and that stem bridges the two.
 */
const codeForms = (code: string) => {
  const full = normalize(code);
  const stem = full.replace(/\d+$/, '');
  return stem && stem !== full ? [full, stem] : [full];
};

/**
 * VMM group names read like "POS · Christoph Schreiber", Untis knows "POS1", and the subject
 * carries both. The code has to match a whole word – otherwise "CH" finds "Christoph".
 */
export function matchSubject(group: VmmGroup, subjects: Subject[]): Subject | null {
  const text = [group.name, group.subjectName ?? ''].join(' ');
  const tokens = new Set(words(text));

  const scored = subjects
    .filter((s) => s.untisCode)
    .map((subject) => {
      const forms = codeForms(subject.untisCode!);
      // An exact code beats a stem match, and a longer code beats a shorter one.
      const rank = tokens.has(forms[0]) ? 2 : forms[1] && tokens.has(forms[1]) ? 1 : 0;
      return { subject, rank, length: subject.untisCode!.length };
    })
    .filter((entry) => entry.rank > 0)
    .sort((a, b) => b.rank - a.rank || b.length - a.length);
  if (scored.length > 0) return scored[0].subject;

  const haystack = normalize(text);
  const nameMatch = subjects.find((s) => {
    const name = normalize(s.name);
    return name.length >= 4 && haystack.includes(name);
  });
  return nameMatch ?? null;
}

/** Grade values VMM hands out are strings as often as numbers, and sometimes "-". */
export function markValue(mark: VmmMark): number | null {
  const raw = typeof mark.value === 'number' ? mark.value : parseFloat(String(mark.value ?? '').replace(',', '.'));
  return Number.isFinite(raw) && raw >= 1 && raw <= 5 ? raw : null;
}

export interface VmmSubjectLink {
  group: VmmGroup;
  subject: Subject | null;
  average: number | null;
  /** Marks that carry an actual 1–5 grade, newest first. */
  graded: { mark: VmmMark; value: number; weight: number }[];
}

/** VMM groups joined onto the app's subjects, ready for both display and the planner. */
export function linkVmmGroups(groups: VmmGroup[], subjects: Subject[]): VmmSubjectLink[] {
  return groups
    .map((group) => {
      const graded = group.marks
        .map((mark) => ({ mark, value: markValue(mark), weight: mark.weight && mark.weight > 0 ? mark.weight : 1 }))
        .filter((m): m is { mark: VmmMark; value: number; weight: number } => m.value !== null)
        .sort((a, b) => new Date(b.mark.date ?? 0).getTime() - new Date(a.mark.date ?? 0).getTime());

      const totalWeight = graded.reduce((s, m) => s + m.weight, 0);
      const average =
        group.average ?? (totalWeight > 0 ? Math.round((graded.reduce((s, m) => s + m.value * m.weight, 0) / totalWeight) * 100) / 100 : null);

      return { group, subject: matchSubject(group, subjects), average, graded };
    })
    .sort((a, b) => (a.subject?.name ?? a.group.name).localeCompare(b.subject?.name ?? b.group.name, 'de'));
}

/** VMM marks as planner input, so the study plan can run on the real grades. */
export function vmmGradesForPlanner(links: VmmSubjectLink[]) {
  const grades: { subjectId: string; value: number; weight: number }[] = [];
  for (const link of links) {
    if (!link.subject) continue;
    for (const mark of link.graded) grades.push({ subjectId: link.subject.id, value: mark.value, weight: mark.weight });
  }
  return grades;
}
