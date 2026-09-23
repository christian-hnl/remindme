'use client';

import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { AlertTriangle, ChevronDown, Flag, Target, TrendingUp } from 'lucide-react';
import type { Exam, Subject } from '@/types';
import { buildExamPlan, groupByWeek, shareOfTime, type ExamPlanEntry, type PlannerGrade } from '@/lib/school/planner';
import { countdownLabel } from '@/lib/school';

interface StudyPlanCardProps {
  exams: Exam[];
  grades: PlannerGrade[];
  subjects: Subject[];
  /** Where the grades came from, e.g. "View My Marks". */
  gradeSource?: string | null;
  /** Rendered inside the exams card – no card frame and no heading of its own. */
  embedded?: boolean;
  onOpenExam: (exam: Exam) => void;
}

const RISK_STYLE = {
  hoch: { chip: 'bg-pen/15 text-pen', bar: 'bg-pen' },
  mittel: { chip: 'bg-warn/15 text-warn', bar: 'bg-warn' },
  niedrig: { chip: 'bg-leaf/15 text-leaf', bar: 'bg-leaf' },
} as const;

function PlanRow({ entry, rank, onOpen }: { entry: ExamPlanEntry; rank: number; onOpen: () => void }) {
  const [open, setOpen] = useState(rank === 1);
  const style = RISK_STYLE[entry.risk];

  return (
    <li className="py-2">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-start gap-3 text-left">
        <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-bold ${style.chip}`}>{rank}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="truncate text-[15px] font-bold text-ink">{entry.subjectName}</span>
            <span className="text-[13px] text-ink-2">{entry.exam.title}</span>
          </span>
          <span className="mt-0.5 block text-[13px] text-ink-3">
            {format(new Date(entry.exam.date), 'EEE, d. MMM', { locale: de })} · {countdownLabel(entry.days)}
            {entry.average !== null && ` · Schnitt ${entry.average.toFixed(2)}`}
            {entry.sameWeek > 0 && ` · ${entry.sameWeek + 1} in der Woche`}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[13px]">
            {entry.keepPositive === null ? (
              <span className="chip gap-1 bg-pen/10 text-pen">
                <AlertTriangle className="h-3 w-3" /> rechnerisch nicht mehr zu retten
              </span>
            ) : (
              <span className="chip gap-1">
                <Target className="h-3 w-3" /> positiv mit {entry.keepPositive} oder besser
              </span>
            )}
            {entry.improveTo && (
              <span className="chip gap-1 bg-accent/10 text-accent">
                <TrendingUp className="h-3 w-3" /> {entry.improveTo.needed} → Schnitt {entry.improveTo.target}
              </span>
            )}
            <span className="chip">
              Ziel {entry.aim} · ab {entry.aimPercent} %
            </span>
          </span>
        </span>
        <ChevronDown className={`mt-1 h-4 w-4 flex-shrink-0 text-ink-3 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>

      {open && (
        <div className="ml-10 mt-2 rounded-[10px] bg-inset p-3">
          <ul className="space-y-1 text-[13px] text-ink-2">
            {entry.reasons.map((reason, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-ink-3">·</span> {reason}
              </li>
            ))}
            {entry.reasons.length === 0 && <li>Alles im grünen Bereich – locker vorbereiten reicht.</li>}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={onOpen} className="btn-secondary h-8 px-3 text-[13px]">
              Stoff & Themen
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Answers the two questions before a test: what do I need, and what do I start with? */
export function StudyPlanCard({ exams, grades, subjects, gradeSource, embedded, onOpenExam }: StudyPlanCardProps) {
  const plan = useMemo(() => buildExamPlan(exams, grades, subjects), [exams, grades, subjects]);
  const weeks = useMemo(() => groupByWeek(plan), [plan]);
  const [view, setView] = useState<'priority' | 'weeks'>('priority');

  const emptyNote = (
    <p className="text-[14px] text-ink-2">
      Keine Prüfungen in den nächsten Wochen. Sobald welche aus WebUntis kommen oder du sie einträgst, rechne ich dir hier aus, was du brauchst.
    </p>
  );

  if (plan.length === 0) {
    if (embedded) return <div className="py-4">{emptyNote}</div>;
    return (
      <section className="card" aria-label="Lernplan">
        <div className="p-4 pb-2 sm:p-5 sm:pb-2">
          <p className="eyebrow">Schule</p>
          <h2 className="card-title mt-1">Lernplan</h2>
        </div>
        <div className="px-5 pb-5">{emptyNote}</div>
      </section>
    );
  }

  const crowded = weeks.filter((w) => w.entries.length > 1);

  const summary = (
    <>
      {plan.length} {plan.length === 1 ? 'Prüfung' : 'Prüfungen'} in den nächsten Wochen
      {crowded.length > 0 && ` · ${crowded.length} volle ${crowded.length === 1 ? 'Woche' : 'Wochen'}`}
      {gradeSource && ` · Noten aus ${gradeSource}`}
    </>
  );

  const switcher = (
    <div className="segmented grid-cols-2 sm:inline-grid" role="group" aria-label="Ansicht">
      <button type="button" aria-pressed={view === 'priority'} onClick={() => setView('priority')} className="segmented-item px-3">
        <Flag className="h-4 w-4" /> Reihenfolge
      </button>
      <button type="button" aria-pressed={view === 'weeks'} onClick={() => setView('weeks')} className="segmented-item px-3">
        Wochen
      </button>
    </div>
  );

  const Frame = embedded
    ? ({ children }: { children: React.ReactNode }) => (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <p className="text-[13px] text-ink-3">{summary}</p>
            {switcher}
          </div>
          {children}
        </div>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <section className="card" aria-label="Lernplan">
          <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
            <div className="min-w-0">
              <p className="eyebrow">Schule</p>
              <h2 className="card-title mt-1">Lernplan</h2>
              <p className="mt-1 text-[13px] text-ink-3">{summary}</p>
            </div>
            {switcher}
          </div>
          <div className="px-4 pb-4 sm:px-5">{children}</div>
        </section>
      );

  return (
    <Frame>
      <>
        {view === 'priority' ? (
          <ul className="divide-y divide-line/10">
            {plan.map((entry, i) => (
              <PlanRow key={entry.exam.id} entry={entry} rank={i + 1} onOpen={() => onOpenExam(entry.exam)} />
            ))}
          </ul>
        ) : (
          <div className="space-y-4">
            {weeks.map((week) => {
              const shares = shareOfTime(week.entries);
              return (
                <div key={week.weekKey}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="font-display text-[15px] font-semibold text-ink">
                      {week.label} · ab {format(week.start, 'd. MMM', { locale: de })}
                    </span>
                    <span className="text-[12px] text-ink-3">
                      {week.entries.length} {week.entries.length === 1 ? 'Prüfung' : 'Prüfungen'}
                    </span>
                  </div>

                  {week.entries.length > 1 && (
                    <>
                      <div className="flex h-2.5 overflow-hidden rounded-full bg-inset" role="img" aria-label="Aufteilung der Lernzeit">
                        {shares.map(({ entry, share }) => (
                          <span key={entry.exam.id} className={RISK_STYLE[entry.risk].bar} style={{ width: `${share}%` }} title={`${entry.subjectName}: ${share} %`} />
                        ))}
                      </div>
                      <p className="mb-2 mt-1.5 text-[13px] text-ink-2">
                        Vorschlag: {shares.map(({ entry, share }) => `${share} % ${entry.subjectName}`).join(' · ')} – zuerst {week.entries[0].subjectName}.
                      </p>
                    </>
                  )}

                  <ul className="divide-y divide-line/10">
                    {week.entries.map((entry, i) => (
                      <PlanRow key={entry.exam.id} entry={entry} rank={i + 1} onOpen={() => onOpenExam(entry.exam)} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </>
    </Frame>
  );
}
