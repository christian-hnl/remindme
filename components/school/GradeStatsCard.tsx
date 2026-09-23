'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3 } from 'lucide-react';
import type { Subject } from '@/types';
import type { SubjectGrades, UnifiedGrade } from '@/lib/school/grades';
import { buildGradeStats, type SubjectStat } from '@/lib/school/stats';
import { GRADE_NAMES } from '@/lib/school';

interface GradeStatsCardProps {
  grades: UnifiedGrade[];
  rows: SubjectGrades[];
  subjects: Subject[];
}

const num = (value: number, digits = 2) => value.toFixed(digits).replace('.', ',');

const tone = (average: number) => (average > 4.49 ? 'text-pen' : average >= 3.5 ? 'text-warn' : average <= 2 ? 'text-leaf' : 'text-ink');
const barTone = (average: number) => (average > 4.49 ? 'bg-pen' : average >= 3.5 ? 'bg-warn' : average <= 2 ? 'bg-leaf' : 'bg-accent');

/** A lower grade is better, so a negative delta is the good direction. */
function Trend({ value, className = '' }: { value: number | null; className?: string }) {
  if (value === null || Math.abs(value) < 0.05) {
    return (
      <span className={`inline-flex items-center gap-1 text-ink-3 ${className}`}>
        <ArrowRight className="h-3.5 w-3.5" /> stabil
      </span>
    );
  }
  const better = value < 0;
  return (
    <span className={`inline-flex items-center gap-1 ${better ? 'text-leaf' : 'text-pen'} ${className}`}>
      {better ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
      {better ? 'besser' : 'schlechter'} um {num(Math.abs(value))}
    </span>
  );
}

function StatTile({ label, value, hint, className = '' }: { label: string; value: string; hint?: React.ReactNode; className?: string }) {
  return (
    <div className="rounded-[10px] bg-inset p-3">
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className={`font-display text-[26px] font-bold leading-tight tabular ${className}`}>{value}</p>
      {hint && <p className="text-[12px] text-ink-3">{hint}</p>}
    </div>
  );
}

/** The grade average over time – one point per month that actually has grades. */
function TrendChart({ points }: { points: { label: string; average: number; count: number }[] }) {
  if (points.length < 2) return null;

  // Grades run 1 (top) to 5 (bottom), so the axis is inverted on purpose.
  const y = (average: number) => ((average - 1) / 4) * 100;
  const step = 100 / (points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(2)} ${y(p.average).toFixed(2)}`).join(' ');

  return (
    <div className="mt-1">
      <div className="relative h-28">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Notenschnitt im Zeitverlauf">
          {[2, 3, 4].map((grade) => (
            <line key={grade} x1="0" x2="100" y1={y(grade)} y2={y(grade)} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.4" />
          ))}
          {/* Everything below this line is a "Nicht genügend". */}
          <line x1="0" x2="100" y1={y(4.49)} y2={y(4.49)} stroke="var(--pen)" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" opacity="0.7" />
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {points.map((p, i) => (
          <span
            key={p.label}
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
            style={{ left: `${i * step}%`, top: `${y(p.average)}%` }}
            title={`${p.label}: ${num(p.average)} (${p.count})`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink-3">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}

function SubjectRow({ stat, max }: { stat: SubjectStat; max: number }) {
  return (
    <li className="flex items-center gap-3 py-1.5">
      <span className="w-28 flex-shrink-0 truncate text-[13px] text-ink-2 sm:w-36">{stat.subject.name}</span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-inset">
        <span className={`block h-full rounded-full ${barTone(stat.average)}`} style={{ width: `${Math.max(4, (stat.average / max) * 100)}%` }} />
      </span>
      <span className={`w-10 flex-shrink-0 text-right tabular text-[14px] font-bold ${tone(stat.average)}`}>{num(stat.average)}</span>
    </li>
  );
}

/** Statistics over every grade the app knows – manual ones and the ones from VMM. */
export function GradeStatsCard({ grades, rows }: GradeStatsCardProps) {
  const stats = useMemo(() => buildGradeStats(grades, rows), [grades, rows]);
  const [view, setView] = useState<'ueberblick' | 'faecher' | 'verlauf'>('ueberblick');

  if (stats.count === 0) {
    return (
      <section className="card" aria-label="Notenstatistik">
        <div className="p-4 pb-2 sm:p-5 sm:pb-2">
          <p className="eyebrow">Schule</p>
          <h2 className="card-title mt-1">Statistik</h2>
        </div>
        <p className="px-5 pb-5 text-[14px] text-ink-2">Sobald Noten da sind – eigene oder aus View My Marks – steht hier die Auswertung.</p>
      </section>
    );
  }

  const maxCount = Math.max(...stats.distribution.map((d) => d.count), 1);
  const worstAverage = Math.max(...stats.subjects.map((s) => s.average), 1);

  return (
    <section className="card" aria-label="Notenstatistik">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-3 sm:p-5 sm:pb-3">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Schule
          </p>
          <h2 className="card-title mt-1">Statistik</h2>
          <p className="mt-1 text-[13px] text-ink-3">
            {stats.count} {stats.count === 1 ? 'Note' : 'Noten'} in {stats.subjects.length} {stats.subjects.length === 1 ? 'Fach' : 'Fächern'}
            {stats.bySource.vmm > 0 && ` · ${stats.bySource.vmm} aus VMM, ${stats.bySource.app} eigene`}
          </p>
        </div>
        <div className="segmented grid-cols-3" role="group" aria-label="Ansicht">
          <button type="button" aria-pressed={view === 'ueberblick'} onClick={() => setView('ueberblick')} className="segmented-item px-3">
            Überblick
          </button>
          <button type="button" aria-pressed={view === 'faecher'} onClick={() => setView('faecher')} className="segmented-item px-3">
            Fächer
          </button>
          <button type="button" aria-pressed={view === 'verlauf'} onClick={() => setView('verlauf')} className="segmented-item px-3">
            Verlauf
          </button>
        </div>
      </div>

      <div className="px-4 pb-5 sm:px-5">
        {view === 'ueberblick' && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile
                label="Schnitt gesamt"
                value={stats.overall === null ? '–' : num(stats.overall)}
                hint="gewichtet über alle Noten"
                className={stats.overall === null ? '' : tone(stats.overall)}
              />
              <StatTile
                label="Schnitt der Fächer"
                value={stats.perSubject === null ? '–' : num(stats.perSubject)}
                hint="jedes Fach zählt gleich"
                className={stats.perSubject === null ? '' : tone(stats.perSubject)}
              />
              <StatTile label="Positiv" value={`${stats.positiveShare} %`} hint={stats.atRisk.length === 1 ? '1 Fach gefährdet' : `${stats.atRisk.length} Fächer gefährdet`} className={stats.atRisk.length ? 'text-warn' : 'text-leaf'} />
              <StatTile label="Tendenz" value={stats.trend === null ? '–' : `${stats.trend > 0 ? '+' : ''}${num(stats.trend)}`} hint={<Trend value={stats.trend} />} />
            </div>

            <p className="mb-2 mt-4 text-[13px] font-bold text-ink">Verteilung</p>
            <div className="flex items-end gap-2" role="img" aria-label="Verteilung der Noten">
              {stats.distribution.map((entry) => (
                <div key={entry.grade} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[12px] tabular text-ink-3">{entry.count || ''}</span>
                  <span
                    className={`w-full rounded-t-[4px] ${barTone(entry.grade)}`}
                    style={{ height: `${Math.max(entry.count ? 6 : 2, (entry.count / maxCount) * 72)}px` }}
                    title={`${entry.count}× ${GRADE_NAMES[entry.grade]} (${entry.share} %)`}
                  />
                  <span className="font-mono text-[13px] font-bold text-ink-2">{entry.grade}</span>
                </div>
              ))}
            </div>

            {stats.byKind.length > 1 && (
              <>
                <p className="mb-1 mt-4 text-[13px] font-bold text-ink">Nach Art</p>
                <ul className="text-[13px]">
                  {stats.byKind.map((entry) => (
                    <li key={entry.kind} className="flex items-baseline justify-between gap-3 py-0.5">
                      <span className="text-ink-2">
                        {entry.label} <span className="text-ink-3">({entry.count})</span>
                      </span>
                      <span className={`tabular font-bold ${tone(entry.average)}`}>{num(entry.average)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        {view === 'faecher' && (
          <>
            <ul>
              {stats.subjects.map((stat) => (
                <SubjectRow key={stat.subject.id} stat={stat} max={worstAverage} />
              ))}
            </ul>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {stats.best && (
                <div className="rounded-[10px] bg-leaf/10 p-3">
                  <p className="text-[12px] text-ink-3">Stärkstes Fach</p>
                  <p className="text-[15px] font-bold text-ink">{stats.best.subject.name}</p>
                  <p className="text-[13px] text-ink-2">
                    Schnitt {num(stats.best.average)} · <Trend value={stats.best.trend} />
                  </p>
                </div>
              )}
              {stats.worst && (
                <div className="rounded-[10px] bg-warn/10 p-3">
                  <p className="text-[12px] text-ink-3">Größter Hebel</p>
                  <p className="text-[15px] font-bold text-ink">{stats.worst.subject.name}</p>
                  <p className="text-[13px] text-ink-2">
                    Schnitt {num(stats.worst.average)} · <Trend value={stats.worst.trend} />
                  </p>
                </div>
              )}
            </div>
            {stats.atRisk.length > 0 && (
              <p className="mt-3 rounded-[10px] bg-pen/10 p-3 text-[13px] text-pen">
                Über der Positiv-Grenze: {stats.atRisk.map((s) => `${s.subject.name} (${num(s.average)})`).join(', ')}
              </p>
            )}
          </>
        )}

        {view === 'verlauf' && (
          <>
            {stats.months.length < 2 ? (
              <p className="py-4 text-[14px] text-ink-2">Noch zu wenig Zeitraum – ab dem zweiten Monat mit Noten zeichne ich hier die Kurve.</p>
            ) : (
              <>
                <TrendChart points={stats.months} />
                <ul className="mt-3 divide-y divide-line/10 text-[13px]">
                  {[...stats.months].reverse().map((month) => (
                    <li key={month.key} className="flex items-baseline justify-between gap-3 py-1.5">
                      <span className="text-ink-2">
                        {month.label} <span className="text-ink-3">({month.count})</span>
                      </span>
                      <span className={`tabular font-bold ${tone(month.average)}`}>{num(month.average)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[12px] text-ink-3">Die gestrichelte Linie ist die Grenze zum „Nicht genügend“ (4,49).</p>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
