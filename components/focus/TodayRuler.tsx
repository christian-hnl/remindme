'use client';

import React, { useEffect, useRef, useState } from 'react';
import { format, getISOWeek, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Birthday, Exam, Reminder, ScheduleBlock, Task } from '@/types';
import { countdownLabel, daysUntil, lessonPhase } from '@/lib/school';
import { formatEuro, minutesToTime, timeToMinutes } from '@/lib/format';
import { assignLanes } from '@/lib/lanes';

interface TodayRulerProps {
  schedule: ScheduleBlock[];
  tasks: Task[];
  reminders: Reminder[];
  displayName: string;
  safeToSpendDaily: number;
  onEditTask: (task: Task) => void;
  exams?: Exam[];
  birthdays?: Birthday[];
}

interface Pin {
  key: string;
  minute: number;
  label: string;
  kind: 'task' | 'reminder';
  overdue: boolean;
  task?: Task;
  row: number;
}

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const lessonName = (b: ScheduleBlock) => b.subject?.name ?? b.title.split('(')[0].trim();
const lessonCode = (b: ScheduleBlock) => (b.subjectCode || b.title.slice(0, 3)).toUpperCase();
const greetingFor = (hour: number) =>
  hour < 5 ? 'Gute Nacht' : hour < 11 ? 'Guten Morgen' : hour < 17 ? 'Hallo' : hour < 22 ? 'Guten Abend' : 'Gute Nacht';
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The page's thesis: a drafting ruler across today with lessons as blocks,
 * deadlines and reminders as pins and a red-pen needle for "now".
 */
export const TodayRuler: React.FC<TodayRulerProps> = ({
  schedule,
  tasks,
  reminders,
  displayName,
  safeToSpendDaily,
  onEditTask,
  exams = [],
  birthdays = [],
}) => {
  const now = useNow();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolled = useRef(false);

  const day = now ?? new Date();
  const weekday = day.getDay() || 7;
  const lessons = schedule
    .filter((b) => b.dayOfWeek === weekday)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  const activeLessons = lessons.filter((b) => !b.isCancelled);
  const laneOf = assignLanes(lessons);
  const minutesNow = now ? now.getHours() * 60 + now.getMinutes() : null;

  // A lesson stays "current" a few minutes after it ends and becomes "upcoming" a bit before
  // it starts, so the transition between two lessons is never a blank headline.
  const phaseOf = (b: ScheduleBlock) =>
    minutesNow === null ? null : lessonPhase(timeToMinutes(b.startTime), timeToMinutes(b.endTime), minutesNow);
  const current = activeLessons.find((b) => phaseOf(b) === 'current');
  const upcoming = current ? undefined : activeLessons.find((b) => phaseOf(b) === 'upcoming');
  const next = minutesNow === null ? undefined : activeLessons.find((b) => timeToMinutes(b.startTime) > minutesNow);

  const dueTasks = tasks.filter((t) => t.status !== 'done' && isSameDay(new Date(t.dueDate), day));
  const todaysReminders = reminders.filter((r) => !r.isDone && r.dueDate && isSameDay(new Date(r.dueDate), day));

  // Ruler range: at least 07–18, stretched to fit lessons.
  const startHour = Math.min(7, ...lessons.map((b) => Math.floor(timeToMinutes(b.startTime) / 60)));
  const endHour = Math.min(24, Math.max(18, ...lessons.map((b) => Math.ceil(timeToMinutes(b.endTime) / 60))));
  const span = (endHour - startHour) * 60;
  const pct = (minute: number) => Math.min(100, Math.max(0, ((minute - startHour * 60) / span) * 100));
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  // Pins, placed on two rows so neighbours don't overlap.
  const rawPins: Omit<Pin, 'row'>[] = [
    ...dueTasks.map((t) => {
      const due = new Date(t.dueDate);
      return {
        key: `t-${t.id}`,
        minute: due.getHours() * 60 + due.getMinutes(),
        label: t.title,
        kind: 'task' as const,
        overdue: now ? due < now : false,
        task: t,
      };
    }),
    ...todaysReminders
      .filter((r) => r.dueTime)
      .map((r) => ({
        key: `r-${r.id}`,
        minute: timeToMinutes(r.dueTime),
        label: r.personName ? `${r.personName}: ${r.title}` : r.title,
        kind: 'reminder' as const,
        overdue: minutesNow !== null && timeToMinutes(r.dueTime) < minutesNow,
      })),
  ].sort((a, b) => a.minute - b.minute);
  const rowEnds = [-Infinity, -Infinity];
  const pins: Pin[] = rawPins.map((pin) => {
    const position = pct(pin.minute);
    const row = position >= rowEnds[0] ? 0 : position >= rowEnds[1] ? 1 : 0;
    rowEnds[row] = position + 17;
    return { ...pin, row };
  });

  // Headline: what matters next.
  let headline: React.ReactNode = format(day, 'EEEE', { locale: de });
  let detail = '';
  if (now) {
    if (weekday >= 6) {
      headline = <>Wochenende</>;
      detail = 'Kein Unterricht – Zeit für dich.';
    } else if (activeLessons.length === 0) {
      headline = <>Heute kein Unterricht</>;
      detail = lessons.length ? 'Alle Stunden entfallen.' : 'Für heute sind keine Stunden eingetragen.';
    } else if (current && minutesNow! < timeToMinutes(current.endTime)) {
      headline = (
        <>
          Jetzt <span className="marker">{lessonName(current)}</span>
        </>
      );
      detail = `bis ${current.endTime}${current.room ? ` · ${current.room}` : ''} · noch ${timeToMinutes(current.endTime) - minutesNow!} min`;
    } else if (current) {
      // Grace period: the lesson just ended, give a moment before switching to "next".
      headline = <>{lessonName(current)} ist aus</>;
      detail = next ? `gleich: ${lessonName(next)} um ${next.startTime}` : 'Pause';
    } else if (upcoming) {
      const inMinutes = timeToMinutes(upcoming.startTime) - minutesNow!;
      headline = (
        <>
          Gleich <span className="marker">{lessonName(upcoming)}</span>
        </>
      );
      detail = `in ${inMinutes} min · ${upcoming.startTime}${upcoming.room ? ` · ${upcoming.room}` : ''}${upcoming.teacher ? ` · ${upcoming.teacher}` : ''}`;
    } else if (next) {
      const inMinutes = timeToMinutes(next.startTime) - minutesNow!;
      headline = (
        <>
          <span className="marker">{lessonName(next)}</span> um {next.startTime}
        </>
      );
      detail = `in ${inMinutes >= 60 ? `${Math.floor(inMinutes / 60)} h ${inMinutes % 60} min` : `${inMinutes} min`}${next.room ? ` · ${next.room}` : ''}${next.teacher ? ` · ${next.teacher}` : ''}`;
    } else {
      headline = <>Schulschluss</>;
      detail = `Letzte Stunde endete um ${activeLessons[activeLessons.length - 1].endTime}.`;
    }
  }

  const nextExam = exams
    .filter((e) => !e.isDone && daysUntil(new Date(e.date), day) >= 0 && daysUntil(new Date(e.date), day) <= 7)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const birthdaysToday = birthdays.filter((b) => b.month === day.getMonth() + 1 && b.day === day.getDate());

  const summary = [
    dueTasks.length ? plural(dueTasks.length, 'Hausübung fällig', 'Hausübungen fällig') : 'keine Hausübung fällig',
    todaysReminders.length ? plural(todaysReminders.length, 'Erinnerung', 'Erinnerungen') : 'keine Erinnerungen',
    safeToSpendDaily > 0 ? `${formatEuro(safeToSpendDaily)} frei` : null,
    nextExam ? `${nextExam.title} ${countdownLabel(daysUntil(new Date(nextExam.date), day))}` : null,
    ...birthdaysToday.map((b) => `${b.name} hat Geburtstag 🎉`),
  ]
    .filter(Boolean)
    .join(', ');

  const studyMinutes = dueTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

  // On narrow screens the ruler scrolls – bring "now" into view once.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || minutesNow === null || scrolled.current) return;
    scrolled.current = true;
    if (el.scrollWidth > el.clientWidth) {
      el.scrollLeft = (pct(minutesNow) / 100) * el.scrollWidth - el.clientWidth * 0.35;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutesNow]);

  return (
    <section className="card overflow-hidden rise" aria-label="Dein Tag">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 p-4 sm:p-6">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">
            {format(day, 'EEEE, d. MMMM', { locale: de })}
            <span className="hidden sm:inline"> · KW {getISOWeek(day)}</span>
          </p>
          <h1 className="mt-2 font-display text-[38px] font-bold leading-[0.95] tracking-[-0.01em] text-ink sm:text-[52px]">
            {headline}
          </h1>
          {detail && <p className="mt-2 font-mono text-[13px] text-ink-2 sm:text-[14px]">{detail}</p>}
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-2">
            {now && `${greetingFor(now.getHours())}${displayName ? `, ${displayName}` : ''}. `}
            Heute: {summary}.
          </p>
        </div>

        {/* Title block ("Schriftfeld") as on a technical drawing */}
        <dl className="hidden grid-cols-2 overflow-hidden rounded-[10px] border border-line/15 text-[13px] md:grid md:min-w-[260px]">
          {[
            ['Datum', format(day, 'dd.MM.yyyy')],
            ['Kalenderwoche', String(getISOWeek(day))],
            ['Stunden', String(activeLessons.length)],
            ['Lernzeit', studyMinutes ? `${studyMinutes} min` : '—'],
          ].map(([label, value], i) => (
            <div key={label} className={`px-3 py-2 ${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b' : ''} border-line/15`}>
              <dt className="font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{label}</dt>
              <dd className="mt-0.5 font-mono font-medium text-ink tabular">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div ref={scrollRef} className="scrollbar-none overflow-x-auto border-t border-line/10">
        <div className="relative mx-4 h-[140px] min-w-[760px] sm:mx-6">
          {/* hour lines & labels */}
          {hours.map((h) => (
            <React.Fragment key={h}>
              <div className="absolute bottom-6 top-0 w-px bg-line/10" style={{ left: `${pct(h * 60)}%` }} />
              <span
                className="absolute bottom-1.5 -translate-x-1/2 font-mono text-[11px] text-ink-3 tabular"
                style={{ left: `${pct(h * 60)}%` }}
              >
                {String(h).padStart(2, '0')}
              </span>
            </React.Fragment>
          ))}
          {/* quarter-hour ticks */}
          <div
            className="absolute inset-x-0 bottom-6 h-2 border-b border-line/20"
            style={{
              backgroundImage: 'linear-gradient(90deg, rgb(var(--line) / 0.28) 1px, transparent 1px)',
              backgroundSize: `${100 / ((endHour - startHour) * 4)}% 100%`,
            }}
          />

          {lessons.length === 0 && (
            <div className="absolute inset-x-0 top-3 flex h-[56px] items-center justify-center rounded-[8px] border border-dashed border-line/20 text-[14px] text-ink-3">
              Keine Stunden heute
            </div>
          )}

          {lessons.map((b) => {
            const start = timeToMinutes(b.startTime);
            const end = timeToMinutes(b.endTime);
            const isCurrent = current?.id === b.id || upcoming?.id === b.id;
            const passed = minutesNow !== null && minutesNow >= end;
            // Parallel lessons (groups) share the 56px band as stacked lanes.
            const { lane, lanes } = laneOf.get(b.id) ?? { lane: 0, lanes: 1 };
            const laneHeight = (56 - (lanes - 1) * 2) / lanes;
            return (
              <div
                key={b.id}
                title={`${b.startTime}–${b.endTime} · ${b.title}${b.room ? ` · ${b.room}` : ''}${b.substitutionNote ? ` · ${b.substitutionNote}` : ''}`}
                className={`absolute overflow-hidden rounded-[6px] border-l-[3px] px-2 transition-opacity ${lanes > 1 ? 'flex items-center gap-1.5' : 'py-1.5'} ${
                  b.isCancelled ? 'hatch' : ''
                } ${isCurrent ? 'ring-2 ring-marker ring-offset-1 ring-offset-sheet' : ''} ${passed ? 'opacity-45' : ''}`}
                style={{
                  top: 12 + lane * (laneHeight + 2),
                  height: laneHeight,
                  left: `${pct(start)}%`,
                  width: `calc(${pct(end) - pct(start)}% - 3px)`,
                  borderLeftColor: b.colorHex,
                  backgroundColor: `${b.colorHex}26`,
                }}
              >
                <div
                  className={`truncate font-display font-bold leading-none text-ink ${lanes > 1 ? 'text-[12px]' : 'text-[16px]'} ${
                    b.isCancelled ? 'line-through decoration-pen decoration-2' : ''
                  }`}
                >
                  {lessonCode(b)}
                </div>
                <div className={`truncate font-mono text-ink-2 ${lanes > 1 ? 'text-[10px]' : 'mt-1.5 text-[11px]'}`}>{b.room ?? b.startTime}</div>
              </div>
            );
          })}

          {pins.map((pin) => {
            const content = (
              <>
                <span
                  className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ring-2 ring-sheet ${
                    pin.kind === 'reminder' ? 'bg-warn' : pin.overdue ? 'bg-pen' : 'bg-accent'
                  }`}
                />
                <span className={`truncate text-[12px] font-bold ${pin.overdue ? 'text-pen' : 'text-ink-2'}`}>{pin.label}</span>
              </>
            );
            const style = { left: `${pct(pin.minute)}%`, top: pin.row === 0 ? 78 : 98 };
            const className = 'absolute flex max-w-[170px] -translate-x-[5px] items-center gap-1.5';
            return pin.task ? (
              <button
                key={pin.key}
                type="button"
                onClick={() => onEditTask(pin.task!)}
                className={`${className} rounded hover:[&>span:last-child]:text-ink`}
                style={style}
                title={`${minutesToTime(pin.minute)} · ${pin.label}`}
              >
                {content}
              </button>
            ) : (
              <div key={pin.key} className={className} style={style} title={`${minutesToTime(pin.minute)} · ${pin.label}`}>
                {content}
              </div>
            );
          })}

          {minutesNow !== null && minutesNow >= startHour * 60 && minutesNow <= endHour * 60 && (
            <div className="pointer-events-none absolute bottom-0 top-0" style={{ left: `${pct(minutesNow)}%` }} aria-hidden>
              <div className="absolute bottom-6 top-0 w-[2px] -translate-x-1/2 bg-pen" />
              <span className="absolute bottom-1 -translate-x-1/2 rounded-[4px] bg-pen px-1.5 py-px font-mono text-[11px] font-semibold text-sheet tabular">
                {minutesToTime(minutesNow)}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
