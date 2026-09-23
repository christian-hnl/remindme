'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import type { ScheduleBlock, Task, WebUntisConfig } from '@/types';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  GraduationCap,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
  School,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CheckButton } from '@/components/ui/CheckButton';
import { minutesToTime, timeToMinutes, toDateInput } from '@/lib/format';
import { api, errorMessage } from '@/lib/client';
import { groupOverlapping } from '@/lib/lanes';
import { lessonPhase } from '@/lib/school';
import { DEMO_SCHOOL } from '@/lib/untis-defaults';

interface TimetableScheduleProps {
  schedule: ScheduleBlock[];
  untisConfig: WebUntisConfig | null;
  onToggleTaskStatus: (task: Task) => void;
  onOpenUntisModal: () => void;
  onCreateTask: (subjectId?: string | null) => void;
  onEditTask: (task: Task) => void;
}

const DAYS = [
  { num: 1, name: 'Montag', short: 'Mo' },
  { num: 2, name: 'Dienstag', short: 'Di' },
  { num: 3, name: 'Mittwoch', short: 'Mi' },
  { num: 4, name: 'Donnerstag', short: 'Do' },
  { num: 5, name: 'Freitag', short: 'Fr' },
];

interface Period {
  id: number;
  startMin: number;
  lastStartMin: number;
  endMin: number;
}

const blockCode = (b: ScheduleBlock) => (b.subjectCode || b.title.slice(0, 3)).toUpperCase();
const blockName = (b: ScheduleBlock) => b.subject?.name ?? b.title.split('(')[0].trim();

/** Up to three parallel lessons side by side; more wrap into further rows. */
const parallelGrid = (count: number) => (count >= 3 ? 'grid-cols-3' : count === 2 ? 'grid-cols-2' : 'grid-cols-1');

/**
 * Grid rows come from the real lesson start times: starts less than 30 minutes apart share
 * a row. Works for 90-minute blocks and 50-minute school periods alike.
 */
function buildPeriods(schedule: ScheduleBlock[]): Period[] {
  const starts = Array.from(new Set(schedule.map((b) => timeToMinutes(b.startTime)))).sort((a, b) => a - b);
  const clusters: number[][] = [];
  for (const start of starts) {
    const last = clusters[clusters.length - 1];
    if (last && start - last[last.length - 1] <= 30) last.push(start);
    else clusters.push([start]);
  }
  return clusters.map((cluster, i) => {
    const startMin = cluster[0];
    const lastStartMin = cluster[cluster.length - 1];
    const endMin = Math.max(
      ...schedule
        .filter((b) => {
          const s = timeToMinutes(b.startTime);
          return s >= startMin && s <= lastStartMin;
        })
        .map((b) => timeToMinutes(b.endTime))
    );
    return { id: i + 1, startMin, lastStartMin, endMin };
  });
}

function useClock() {
  const [now, setNow] = useState<{ weekday: number; minutes: number } | null>(null);
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setNow({ weekday: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() });
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export const TimetableSchedule: React.FC<TimetableScheduleProps> = ({
  schedule,
  untisConfig,
  onToggleTaskStatus,
  onOpenUntisModal,
  onCreateTask,
  onEditTask,
}) => {
  const clock = useClock();
  const todaysWeekday = clock && clock.weekday >= 1 && clock.weekday <= 5 ? clock.weekday : null;
  const minutesNow = clock?.minutes ?? -1;

  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState(1);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inspectId, setInspectId] = useState<string | null>(null);
  // 0 = the synced week in the database; other offsets are fetched live from WebUntis.
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekCache, setWeekCache] = useState<Record<number, ScheduleBlock[]>>({});
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekError, setWeekError] = useState<string | null>(null);

  // "Today" markers and the progress bar only make sense in the current week.
  const schoolDay = weekOffset === 0 ? todaysWeekday : null;

  const mondayOf = (offset: number) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() || 7) - 1) + offset * 7);
    return d;
  };

  useEffect(() => {
    if (weekOffset === 0 || weekCache[weekOffset]) return;
    let cancelled = false;
    setWeekLoading(true);
    setWeekError(null);
    api<{ lessons: ScheduleBlock[] }>(`/api/v1/webuntis/week?monday=${toDateInput(mondayOf(weekOffset))}`)
      .then((res) => !cancelled && setWeekCache((cache) => ({ ...cache, [weekOffset]: res.lessons })))
      .catch((error) => !cancelled && setWeekError(errorMessage(error)))
      .finally(() => !cancelled && setWeekLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => {
    const weekday = new Date().getDay();
    setSelectedDay(weekday >= 1 && weekday <= 5 ? weekday : 1);
    // The five-day grid is too wide for phones – start in the day view there.
    if (window.matchMedia('(max-width: 767px)').matches) setViewMode('day');
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) setIsFullscreen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  const displaySchedule = weekOffset === 0 ? schedule : weekCache[weekOffset] ?? [];

  const periods = useMemo(() => buildPeriods(displaySchedule), [displaySchedule]);
  const periodOf = (b: ScheduleBlock) => {
    const start = timeToMinutes(b.startTime);
    return periods.find((p) => start >= p.startMin && start <= p.lastStartMin)?.id ?? 0;
  };

  const subjects = useMemo(() => {
    const map = new Map<string, { code: string; name: string; colorHex: string; count: number }>();
    for (const b of displaySchedule) {
      const code = blockCode(b);
      const entry = map.get(code);
      if (entry) entry.count++;
      else map.set(code, { code, name: blockName(b), colorHex: b.colorHex, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [displaySchedule]);

  const filtered = subjectFilter ? displaySchedule.filter((b) => blockCode(b) === subjectFilter) : displaySchedule;

  const todayLessons = schoolDay
    ? displaySchedule
        .filter((b) => b.dayOfWeek === schoolDay && !b.isCancelled)
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    : [];
  // A lesson is highlighted from 10 min before it starts to 5 min after it ends, so the
  // transition between two lessons always shows both which just ended and what's next.
  const phaseOf = (b: ScheduleBlock) => lessonPhase(timeToMinutes(b.startTime), timeToMinutes(b.endTime), minutesNow);
  const isNow = (b: ScheduleBlock) => b.dayOfWeek === schoolDay && !b.isCancelled && phaseOf(b) !== null;
  const activeBlock = todayLessons.find((b) => phaseOf(b) === 'current' && minutesNow < timeToMinutes(b.endTime));
  const upcomingBlock = activeBlock ? undefined : todayLessons.find((b) => phaseOf(b) === 'upcoming');
  const nextBlock = activeBlock || upcomingBlock ? undefined : todayLessons.find((b) => timeToMinutes(b.startTime) > minutesNow);
  const spotlight = activeBlock ?? upcomingBlock ?? nextBlock;
  const inspectBlock = displaySchedule.find((b) => b.id === inspectId) ?? null;

  const weekMonday = mondayOf(weekOffset);
  const weekFriday = new Date(weekMonday);
  weekFriday.setDate(weekMonday.getDate() + 4);
  const dateOf = (day: number) => {
    const d = new Date(weekMonday);
    d.setDate(weekMonday.getDate() + day - 1);
    return d;
  };
  const weekLabel = weekOffset === 0 ? 'Diese Woche' : `${format(weekMonday, 'd.M.')}–${format(weekFriday, 'd.M.')}`;

  const isDemo = untisConfig?.school === DEMO_SCHOOL;
  const syncFailed = untisConfig?.isConnected === false;
  const lastSync =
    clock && untisConfig?.lastSyncAt ? formatDistanceToNow(new Date(untisConfig.lastSyncAt), { addSuffix: true, locale: de }) : null;

  const progress = activeBlock
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((minutesNow - timeToMinutes(activeBlock.startTime)) /
              Math.max(1, timeToMinutes(activeBlock.endTime) - timeToMinutes(activeBlock.startTime))) *
              100
          )
        )
      )
    : 0;

  /** One cell of the week grid – subject, teacher, room, the way WebUntis prints it. */
  const renderGridCard = (block: ScheduleBlock, compact: boolean) => {
    const pending = block.tasks?.filter((t) => t.status !== 'done').length ?? 0;
    return (
      <button
        key={block.id}
        type="button"
        onClick={() => setInspectId(block.id)}
        title={`${blockName(block)} · ${block.startTime}–${block.endTime}${block.room ? ` · ${block.room}` : ''}${
          block.teacher ? ` · ${block.teacher}` : ''
        }${block.isExam ? ' · Prüfung' : ''}`}
        className={`flex w-full min-w-0 flex-col justify-center rounded-[7px] border-l-[3px] px-1.5 py-1 text-left leading-tight transition-[filter] hover:brightness-95 ${
          block.isCancelled ? 'hatch opacity-70' : ''
        } ${isNow(block) ? 'ring-2 ring-marker ring-offset-1 ring-offset-sheet' : ''} ${block.isExam ? 'border-pen/70' : ''}`}
        style={{
          borderLeftColor: block.isExam ? undefined : block.colorHex,
          backgroundColor: block.isExam ? 'rgb(var(--pen) / 0.12)' : `${block.colorHex}1f`,
        }}
      >
        <span className="flex items-center justify-between gap-1">
          <span
            className={`flex min-w-0 items-center gap-1 truncate font-display font-bold text-ink ${compact ? 'text-[13px]' : 'text-[15px]'} ${
              block.isCancelled ? 'line-through decoration-pen decoration-2' : ''
            }`}
          >
            {block.isExam && <GraduationCap className="h-3.5 w-3.5 flex-shrink-0 text-pen" aria-label="Prüfung" />}
            {blockCode(block)}
          </span>
          {pending > 0 && (
            <span className="rounded bg-accent px-1 font-mono text-[10px] font-semibold leading-4 text-on-accent" title="Offene Hausübungen">
              {pending}
            </span>
          )}
        </span>
        {block.teacher && <span className="mt-0.5 block truncate font-mono text-[10.5px] text-ink-3">{block.teacher}</span>}
        {block.room && <span className="block truncate font-mono text-[10.5px] text-ink-2">{block.room}</span>}
        {block.substitutionNote && (
          <span className={`mt-0.5 block truncate text-[10.5px] font-bold ${block.isCancelled ? 'text-pen' : 'text-warn'}`}>
            {compact ? (block.isCancelled ? 'Entfällt' : 'Änderung') : block.substitutionNote}
          </span>
        )}
      </button>
    );
  };

  const renderHomework = (hw: Task) => {
    const isDone = hw.status === 'done';
    return (
      <div key={hw.id} className="flex items-center gap-3 py-1.5">
        <CheckButton checked={isDone} onChange={() => onToggleTaskStatus(hw)} label={isDone ? 'Wieder öffnen' : 'Erledigt'} />
        <button
          type="button"
          onClick={() => onEditTask(hw)}
          className={`min-w-0 flex-1 truncate text-left text-[14px] ${isDone ? 'text-ink-3 line-through' : 'font-bold text-ink'}`}
        >
          {hw.title}
        </button>
        <span className="flex-shrink-0 font-mono text-[12px] text-ink-3 tabular">{hw.estimatedMinutes} min</span>
      </div>
    );
  };

  const renderDayCard = (block: ScheduleBlock, compact: boolean) => {
    const current = isNow(block);
    const pending = block.tasks?.filter((t) => t.status !== 'done').length ?? 0;
    return (
      <div
        key={block.id}
        className={`min-w-0 rounded-[10px] border border-l-[3px] ${block.isExam ? 'border-pen/40' : 'border-line/10'} ${compact ? 'p-2.5' : 'p-3'} ${
          block.isCancelled ? 'hatch' : ''
        } ${current ? 'ring-2 ring-marker' : ''}`}
        style={{ borderLeftColor: block.isExam ? undefined : block.colorHex, backgroundColor: block.isExam ? 'rgb(var(--pen) / 0.06)' : undefined }}
      >
        <button type="button" onClick={() => setInspectId(block.id)} className="block w-full min-w-0 text-left">
          <span className="flex items-start justify-between gap-2">
            <span
              className={`flex min-w-0 items-center gap-1.5 font-display font-semibold leading-tight text-ink ${
                compact ? 'truncate text-[16px]' : 'text-[19px]'
              } ${block.isCancelled ? 'line-through decoration-pen decoration-2' : ''}`}
            >
              {block.isExam && <GraduationCap className="h-4 w-4 flex-shrink-0 text-pen" aria-label="Prüfung" />}
              {current ? <span className="marker">{blockName(block)}</span> : blockName(block)}
            </span>
            {!compact && <span className="chip mt-0.5 font-mono">{blockCode(block)}</span>}
          </span>
          {(block.room || block.teacher) && (
            <span className="mt-0.5 block truncate font-mono text-[12px] text-ink-3">
              {compact ? block.room ?? block.teacher : [block.room, block.teacher].filter(Boolean).join(' · ')}
            </span>
          )}
          {compact && pending > 0 && <span className="mt-1 block text-[12px] font-bold text-accent">{pending} HÜ offen</span>}
        </button>
        {block.substitutionNote && (
          <p className={`mt-1.5 text-[13px] font-bold ${block.isCancelled ? 'text-pen' : 'text-warn'} ${compact ? 'truncate' : ''}`}>
            {block.substitutionNote}
          </p>
        )}
        {!compact && (
          <>
            {block.tasks && block.tasks.length > 0 && <div className="mt-2 border-t border-line/10 pt-1">{block.tasks.map(renderHomework)}</div>}
            <button
              type="button"
              onClick={() => onCreateTask(block.subjectId)}
              className="mt-1 inline-flex items-center gap-1 rounded py-1 text-[13px] font-bold text-accent hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Hausübung
            </button>
          </>
        )}
      </div>
    );
  };

  const dayGroups = groupOverlapping(filtered.filter((b) => b.dayOfWeek === selectedDay));

  return (
    <section
      id="timetable-card"
      className={`card ${isFullscreen ? 'fixed inset-0 z-40 overflow-y-auto rounded-none sm:inset-4 sm:rounded-[16px]' : ''}`}
      aria-label="Stundenplan"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
        <div className="min-w-0">
          <p className="eyebrow">{untisConfig?.timetableScope === 'class' ? 'Klassenstundenplan' : 'Mein Stundenplan'}</p>
          <h2 className="card-title mt-1 truncate">{untisConfig?.schoolName ?? 'Stundenplan'}</h2>
          {syncFailed ? (
            <button type="button" onClick={onOpenUntisModal} className="mt-1 flex items-center gap-1.5 text-[13px] font-bold text-pen">
              <AlertTriangle className="h-3.5 w-3.5" /> Sync fehlgeschlagen – Zugangsdaten prüfen
            </button>
          ) : (
            <p className="mt-1 text-[13px] text-ink-3">
              {weekOffset === 0 ? (
                <>
                  {isDemo ? 'Beispiel-Stundenplan' : 'WebUntis'}
                  {lastSync && ` · aktualisiert ${lastSync}`}
                </>
              ) : (
                <>
                  {format(weekMonday, 'd. MMMM', { locale: de })} – {format(weekFriday, 'd. MMMM yyyy', { locale: de })}
                  {weekLoading && ' · lädt…'}
                </>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <div className="flex items-center rounded-[12px] border border-line/10 bg-inset p-0.5" role="group" aria-label="Woche wechseln">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w - 1)}
              className="icon-btn h-8 w-8 rounded-[9px]"
              aria-label="Woche zurück"
              title="Woche zurück"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
              className="min-w-[92px] px-1 text-center font-mono text-[12px] font-bold text-ink tabular disabled:text-ink-2"
              title="Zur aktuellen Woche"
            >
              {weekLabel}
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              className="icon-btn h-8 w-8 rounded-[9px]"
              aria-label="Woche vor"
              title="Woche vor"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="segmented w-[132px] grid-cols-2" role="group" aria-label="Ansicht">
            <button type="button" aria-pressed={viewMode === 'week'} onClick={() => setViewMode('week')} className="segmented-item min-h-[34px]">
              Woche
            </button>
            <button type="button" aria-pressed={viewMode === 'day'} onClick={() => setViewMode('day')} className="segmented-item min-h-[34px]">
              Tag
            </button>
          </div>
          {subjects.length > 1 && (
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              aria-pressed={filterOpen || subjectFilter !== null}
              className={`icon-btn ${subjectFilter ? 'text-accent' : ''}`}
              aria-label="Nach Fach filtern"
              title="Nach Fach filtern"
            >
              <Filter className="h-[18px] w-[18px]" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            className="icon-btn hidden md:inline-flex"
            aria-label={isFullscreen ? 'Vollbild verlassen' : 'Vollbild'}
            title={isFullscreen ? 'Vollbild verlassen (Esc)' : 'Vollbild'}
          >
            {isFullscreen ? <Minimize2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />}
          </button>
          <button type="button" onClick={onOpenUntisModal} className="icon-btn" aria-label="WebUntis-Einstellungen" title="WebUntis-Einstellungen & Sync">
            <RefreshCw className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {displaySchedule.length === 0 ? (
        <div className="px-4 pb-8 pt-4 text-center sm:px-5">
          {weekOffset !== 0 ? (
            <>
              <School className="mx-auto mb-3 h-8 w-8 text-ink-3" />
              <p className="font-bold text-ink">
                {weekLoading ? 'Lädt diese Woche…' : weekError ? 'Woche nicht geladen' : 'Kein Unterricht in dieser Woche'}
              </p>
              {weekError && <p className="mb-4 mt-1 text-[14px] text-pen">{weekError}</p>}
              {!weekLoading && (
                <button type="button" onClick={() => setWeekOffset(0)} className="btn-secondary mt-3">
                  Zurück zu dieser Woche
                </button>
              )}
            </>
          ) : (
            <>
              <School className="mx-auto mb-3 h-8 w-8 text-ink-3" />
              <p className="font-bold text-ink">Noch kein Stundenplan</p>
              <p className="mb-4 mt-1 text-[14px] text-ink-2">Verbinde WebUntis, dann erscheinen hier deine Stunden.</p>
              <button type="button" onClick={onOpenUntisModal} className="btn-primary">
                WebUntis verbinden
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {filterOpen && subjects.length > 1 && (
            <div className="scrollbar-none animate-in flex gap-1 overflow-x-auto px-4 pb-3 sm:px-5" role="group" aria-label="Nach Fach filtern">
              <button type="button" aria-pressed={subjectFilter === null} onClick={() => setSubjectFilter(null)} className="tab h-8 px-3 text-[13px]">
                Alle
              </button>
              {subjects.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  aria-pressed={subjectFilter === s.code}
                  onClick={() => setSubjectFilter(subjectFilter === s.code ? null : s.code)}
                  className="tab h-8 px-3 text-[13px]"
                >
                  <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: s.colorHex }} />
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {spotlight && (
            <button
              type="button"
              onClick={() => setInspectId(spotlight.id)}
              className="mx-4 mb-3 block w-[calc(100%-2rem)] rounded-[10px] border border-line/10 bg-inset px-3 py-2.5 text-left sm:mx-5 sm:w-[calc(100%-2.5rem)]"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="eyebrow">
                    {activeBlock
                      ? `Jetzt · noch ${Math.max(0, timeToMinutes(spotlight.endTime) - minutesNow)} min`
                      : upcomingBlock
                        ? `Gleich · in ${timeToMinutes(spotlight.startTime) - minutesNow} min`
                        : `Als Nächstes · in ${timeToMinutes(spotlight.startTime) - minutesNow} min`}
                  </span>
                  <span className="mt-0.5 block truncate font-display text-[20px] font-semibold leading-tight text-ink">
                    <span className="marker">{blockName(spotlight)}</span>
                  </span>
                </span>
                <span className="flex-shrink-0 text-right font-mono text-[12px] text-ink-2 tabular">
                  {spotlight.startTime}–{spotlight.endTime}
                  {spotlight.room && <span className="block text-ink">{spotlight.room}</span>}
                </span>
              </span>
              {activeBlock && (
                <span className="mt-2 block h-1 overflow-hidden rounded-full bg-line/20" aria-hidden>
                  <span className="block h-full rounded-full bg-marker" style={{ width: `${progress}%` }} />
                </span>
              )}
            </button>
          )}

          {viewMode === 'week' ? (
            <div className="overflow-x-auto px-4 pb-4 sm:px-5 sm:pb-5">
              <div className="min-w-[660px]">
                <div className="grid grid-cols-[46px_repeat(5,minmax(0,1fr))] gap-1 pb-1">
                  <span />
                  {DAYS.map((d) => (
                    <button
                      key={d.num}
                      type="button"
                      onClick={() => {
                        setSelectedDay(d.num);
                        setViewMode('day');
                      }}
                      className={`rounded-[8px] px-2 py-1.5 text-center transition-colors hover:bg-inset ${
                        d.num === schoolDay ? 'bg-marker/15' : ''
                      }`}
                      title={`${d.name} als Tagesansicht`}
                    >
                      <span className={`block font-display text-[14px] font-bold leading-none ${d.num === schoolDay ? 'text-ink' : 'text-ink-2'}`}>
                        {d.name}
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] text-ink-3 tabular">{format(dateOf(d.num), 'd.M.')}</span>
                    </button>
                  ))}
                </div>

                {periods.map((period) => {
                  const running = schoolDay !== null && minutesNow >= period.startMin && minutesNow < period.endMin;
                  return (
                    <div key={period.id} className="grid grid-cols-[46px_repeat(5,minmax(0,1fr))] gap-1 pb-1">
                      <div className="flex flex-col items-end justify-center pr-1 text-right">
                        <span className={`font-display text-[15px] font-bold leading-none ${running ? 'text-ink' : 'text-ink-3'}`}>{period.id}</span>
                        <span className="mt-1 font-mono text-[10px] leading-[1.35] text-ink-3 tabular">
                          {minutesToTime(period.startMin)}
                          <span className="block">{minutesToTime(period.endMin)}</span>
                        </span>
                      </div>
                      {DAYS.map((day) => {
                        const lessons = filtered.filter((b) => b.dayOfWeek === day.num && periodOf(b) === period.id);
                        return (
                          <div
                            key={day.num}
                            className={`grid min-h-[72px] gap-1 rounded-[8px] ${parallelGrid(lessons.length)} ${
                              day.num === schoolDay ? 'bg-marker/[0.07]' : ''
                            }`}
                          >
                            {lessons.map((b) => renderGridCard(b, lessons.length > 1))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="pb-4 sm:pb-5">
              <div className="scrollbar-none flex gap-1 overflow-x-auto px-4 pb-3 sm:px-5" role="group" aria-label="Tag wählen">
                {DAYS.map((d) => (
                  <button
                    key={d.num}
                    type="button"
                    aria-pressed={selectedDay === d.num}
                    onClick={() => setSelectedDay(d.num)}
                    className="tab flex-1 justify-center px-2"
                  >
                    <span className="sm:hidden">{d.short}</span>
                    <span className="hidden sm:inline">{d.name}</span>
                    {d.num === schoolDay && <span className="h-1.5 w-1.5 rounded-full bg-marker" aria-label="heute" />}
                  </button>
                ))}
              </div>

              {dayGroups.length === 0 ? (
                <p className="px-4 py-10 text-center text-[14px] text-ink-3 sm:px-5">Kein Unterricht an diesem Tag.</p>
              ) : (
                <ol className="space-y-2 px-4 sm:px-5">
                  {dayGroups.map((group, index) => {
                    const end = minutesToTime(Math.max(...group.map((b) => timeToMinutes(b.endTime))));
                    const passed = selectedDay === schoolDay && minutesNow >= timeToMinutes(end);
                    const previous = dayGroups[index - 1];
                    const gap = previous ? timeToMinutes(group[0].startTime) - Math.max(...previous.map((b) => timeToMinutes(b.endTime))) : 0;
                    return (
                      <React.Fragment key={group[0].id}>
                        {gap >= 15 && (
                          <li className="flex items-center gap-3 text-[12px] text-ink-3" aria-hidden>
                            <span className="w-11 flex-shrink-0" />
                            <span className="h-px flex-1 bg-line/15" />
                            <span className="font-mono tabular">{gap} min Pause</span>
                            <span className="h-px flex-1 bg-line/15" />
                          </li>
                        )}
                        <li className={`flex gap-3 ${passed ? 'opacity-55' : ''}`}>
                          <div className="w-11 flex-shrink-0 pt-2.5 text-right font-mono text-[13px] leading-tight text-ink-2 tabular">
                            {group[0].startTime}
                            <span className="block text-[11px] text-ink-3">{end}</span>
                          </div>
                          <div
                            className={`grid min-w-0 flex-1 gap-2 ${
                              group.length >= 3 ? 'grid-cols-2 sm:grid-cols-3' : group.length === 2 ? 'grid-cols-2' : ''
                            }`}
                          >
                            {group.map((block) => renderDayCard(block, group.length > 1))}
                          </div>
                        </li>
                      </React.Fragment>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={!!inspectBlock}
        onClose={() => setInspectId(null)}
        title={inspectBlock ? blockName(inspectBlock) : ''}
        subtitle={inspectBlock && `${DAYS.find((d) => d.num === inspectBlock.dayOfWeek)?.name ?? ''} · ${inspectBlock.startTime}–${inspectBlock.endTime}`}
        icon={<span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: inspectBlock?.colorHex }} />}
      >
        {inspectBlock && (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line/10 bg-line/10">
              <div className="bg-sheet p-3">
                <dt className="eyebrow">Raum</dt>
                <dd className="mt-1 font-mono text-[15px] font-medium text-ink">{inspectBlock.room || '—'}</dd>
              </div>
              <div className="bg-sheet p-3">
                <dt className="eyebrow">Lehrkraft</dt>
                <dd className="mt-1 text-[15px] font-bold text-ink">{inspectBlock.teacher || '—'}</dd>
              </div>
            </dl>

            {(inspectBlock.isExam || inspectBlock.studentGroup) && (
              <div className="flex flex-wrap gap-1.5">
                {inspectBlock.isExam && (
                  <span className="chip gap-1 border-pen/30 bg-pen/10 text-pen">
                    <GraduationCap className="h-3.5 w-3.5" /> Prüfung
                  </span>
                )}
                {inspectBlock.studentGroup && <span className="chip">Gruppe: {inspectBlock.studentGroup}</span>}
              </div>
            )}

            {inspectBlock.substitutionNote && (
              <p
                className={`flex items-start gap-2 rounded-[10px] border p-3 text-[14px] ${
                  inspectBlock.isCancelled ? 'border-pen/30 bg-pen/10 text-pen' : 'border-warn/30 bg-warn/10 text-warn'
                }`}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span className="font-bold">{inspectBlock.substitutionNote}</span>
              </p>
            )}


            <div>
              <div className="mb-1 flex items-center justify-between">
                <h4 className="eyebrow">Hausübungen</h4>
                <button
                  type="button"
                  onClick={() => {
                    const subjectId = inspectBlock.subjectId;
                    setInspectId(null);
                    onCreateTask(subjectId);
                  }}
                  className="btn-ghost h-8 px-2 text-accent"
                >
                  <Plus className="h-4 w-4" /> Hinzufügen
                </button>
              </div>
              {inspectBlock.tasks && inspectBlock.tasks.length > 0 ? (
                <div className="divide-y divide-line/10">{inspectBlock.tasks.map(renderHomework)}</div>
              ) : (
                <p className="rounded-[10px] bg-inset p-4 text-center text-[14px] text-ink-3">Keine Hausübungen für diese Stunde.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};
