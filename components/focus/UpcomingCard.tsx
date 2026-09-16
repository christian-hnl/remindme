'use client';

import React from 'react';
import { Cake, GraduationCap } from 'lucide-react';
import type { Birthday, Exam } from '@/types';
import { EXAM_KIND_LABELS, countdownLabel, daysUntil, nextBirthday } from '@/lib/school';

interface UpcomingCardProps {
  exams: Exam[];
  birthdays: Birthday[];
  onOpenStudy: () => void;
  onOpenLife: () => void;
}

const HORIZON_DAYS = 14;

/** Exams and birthdays of the next two weeks, so nothing sneaks up. */
export const UpcomingCard: React.FC<UpcomingCardProps> = ({ exams, birthdays, onOpenStudy, onOpenLife }) => {
  const now = new Date();
  const items = [
    ...exams
      .filter((e) => !e.isDone)
      .map((e) => ({
        key: `e-${e.id}`,
        days: daysUntil(new Date(e.date), now),
        title: e.title,
        detail: `${EXAM_KIND_LABELS[e.kind]}${e.subject ? ` · ${e.subject.name}` : ''}`,
        kind: 'exam' as const,
      })),
    ...birthdays.map((b) => {
      const next = nextBirthday(b.month, b.day, now);
      return {
        key: `b-${b.id}`,
        days: daysUntil(next, now),
        title: `${b.name} hat Geburtstag`,
        detail: b.year ? `wird ${next.getFullYear() - b.year}` : 'Geburtstag',
        kind: 'birthday' as const,
      };
    }),
  ]
    .filter((item) => item.days >= 0 && item.days <= HORIZON_DAYS)
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  return (
    <section className="card card-pad" aria-label="Demnächst">
      <p className="eyebrow">Demnächst</p>
      <h2 className="card-title mt-1">Nächste zwei Wochen</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-3">Keine Prüfungen oder Geburtstage in Sicht.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line/10">
          {items.map((item) => (
            <li key={item.key}>
              <button type="button" onClick={item.kind === 'exam' ? onOpenStudy : onOpenLife} className="flex w-full items-center gap-3 py-2.5 text-left">
                <span
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                    item.days <= 2 ? (item.kind === 'exam' ? 'bg-pen/15 text-pen' : 'bg-marker/40 text-ink') : 'bg-inset text-ink-2'
                  }`}
                >
                  {item.kind === 'exam' ? <GraduationCap className="h-4 w-4" /> : <Cake className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-ink">{item.title}</span>
                  <span className="block text-[13px] text-ink-3">{item.detail}</span>
                </span>
                <span className={`flex-shrink-0 text-[13px] font-bold ${item.days <= 2 ? 'text-ink' : 'text-ink-3'}`}>{countdownLabel(item.days)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
